import {
  ApiError,
  fetchSession,
  lockSession,
  logIn,
  logOut,
  register,
  SESSION_KEY,
  submitSignInCode,
  unlockSession,
} from "@talaan/client";
import type { PublicUser, RegisterInput, SessionInfo } from "@talaan/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { makeDeviceKey, unlockWithDeviceKey } from "../api/appAuth";
import { connectApi, connection, wakeServer } from "../api/connection";
import { savedState } from "../offline/savedResponses";
import { phoneNotifications } from "../reminders/notifications";
import { offline } from "../storage/offline";
import { secure } from "../storage/secure";
import { confirmOwner, phoneLock, type PhoneLock } from "./biometrics";
import { shouldLockOnReturn } from "./lockRules";

const DEVICE_KEY = "talaan.deviceKey";

// starting: reading the saved session; code: waiting for the emailed code;
// locked: Face ID / fingerprint (or the password) first; ready: signed in
export type Status = "starting" | "signedOut" | "code" | "locked" | "ready";

interface Session {
  status: Status;
  user: PublicUser | null;
  // The email the code went to (two-step sign-in)
  codeEmail: string | null;
  // Shown once after signing in brought a suspended account back
  welcomeBack: boolean;
  // Unlocked without internet: showing what was saved on the phone
  offlineOnly: boolean;
  lock: PhoneLock;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  unlockWithPhone: () => Promise<boolean>;
  unlockWithPassword: (password: string) => Promise<void>;
  lockNow: () => void;
  signOut: () => Promise<void>;
  // Signed out by the API itself (a new password, deleting the account)
  signedOutElsewhere: () => Promise<void>;
  // Two-step: back to the email and password
  cancelSignIn: () => Promise<void>;
  dismissWelcome: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside SessionProvider");
  return session;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatusState] = useState<Status>("starting");
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [lock, setLock] = useState<PhoneLock>("none");
  const leftAt = useRef<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  // Nothing loads behind the lock screen (opened before the screens see
  // "ready"); unlocking loads the screen again
  const setStatus = useCallback((next: Status) => {
    connection.setOpen(next === "ready");
    statusRef.current = next;
    setStatusState(next);
  }, []);
  useEffect(() => {
    if (status === "ready") void queryClient.invalidateQueries();
  }, [status, queryClient]);

  // The signed-in person lives where the shared hooks look for it (the
  // website's SESSION_KEY), so a change on the Security page shows everywhere
  const { data: sessionInfo } = useQuery<SessionInfo | null>({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    enabled: false,
    staleTime: Infinity,
  });
  const user = sessionInfo?.user ?? null;

  const setInfo = useCallback(
    (info: SessionInfo | null) => {
      queryClient.setQueryData(SESSION_KEY, info);
    },
    [queryClient],
  );

  const forget = useCallback(async () => {
    await connection.forgetSession();
    await secure.remove(DEVICE_KEY);
    await offline.wipe();
    await phoneNotifications.clear().catch(() => {});
    savedState.reset();
    queryClient.clear();
    setCodeEmail(null);
    setOfflineOnly(false);
    setStatus("signedOut");
  }, [queryClient]);

  // Set up once: the token, and what the API's answers mean for the screen
  const forgetRef = useRef(forget);
  forgetRef.current = forget;
  const [connected] = useState(() => {
    connectApi({
      onLocked: () => {
        if (statusRef.current === "ready") setStatus("locked");
      },
      onSignedOut: () => {
        if (statusRef.current !== "signedOut") void forgetRef.current();
      },
    });
    return true;
  });

  // A key for Face ID / fingerprint unlocking, made right after signing in
  const keepDeviceKey = useCallback(async () => {
    try {
      const { deviceKey } = await makeDeviceKey();
      await secure.set(DEVICE_KEY, deviceKey);
    } catch {
      // Without it, unlocking asks for the password
    }
  }, []);

  const signedIn = useCallback(
    async (u: PublicUser, back = false) => {
      // Forget the previous person's data
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== SESSION_KEY[0],
      });
      setInfo({ user: u, locked: false, welcomeBack: back });
      setOfflineOnly(false);
      setCodeEmail(null);
      setStatus("ready");
      await keepDeviceKey();
    },
    [keepDeviceKey, queryClient, setInfo],
  );

  const unlocked = useCallback(
    (u: PublicUser) => {
      setInfo({ user: u, locked: false, welcomeBack: false });
      setOfflineOnly(false);
      setStatus("ready");
    },
    [setInfo],
  );

  // Starting: a saved session opens locked (Face ID first); without
  // internet, what was saved can still be opened
  useEffect(() => {
    if (!connected) return;
    wakeServer();
    void (async () => {
      setLock(await phoneLock());
      if (!(await connection.load())) {
        setStatus("signedOut");
        return;
      }
      try {
        const me = await fetchSession();
        if (!me) {
          await forget();
          return;
        }
        setInfo({ ...me, locked: true });
        setStatus("locked");
      } catch (error) {
        if (error instanceof ApiError && error.offline) setOfflineOnly(true);
        setStatus("locked");
      }
    })();
  }, [connected, forget, setInfo]);

  // Away for longer than the "lock after" time: locked again. Coming back
  // also wakes the server.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        leftAt.current ??= Date.now();
        return;
      }
      if (state !== "active") return;
      if (leftAt.current) wakeServer();
      if (
        statusRef.current === "ready" &&
        shouldLockOnReturn(
          leftAt.current,
          Date.now(),
          user?.lockAfterMinutes ?? 15,
        )
      ) {
        setStatus("locked");
      }
      leftAt.current = null;
    });
    return () => sub.remove();
  }, [user]);

  const session: Session = {
    status,
    user,
    codeEmail,
    welcomeBack: sessionInfo?.welcomeBack ?? false,
    offlineOnly,
    lock,
    async signIn(email, password) {
      const result = await logIn({ email, password });
      if (result.twoStep) {
        setCodeEmail(result.email);
        setStatus("code");
        return;
      }
      await signedIn(result.user, result.welcomeBack);
    },
    async signUp(input) {
      await signedIn(await register(input));
    },
    async submitCode(code) {
      // Remembered: this phone isn't asked for a code again (30 days)
      const result = await submitSignInCode({ code, rememberBrowser: true });
      await signedIn(result.user, result.welcomeBack);
    },
    async unlockWithPhone() {
      if (!(await confirmOwner("Unlock Talaan"))) return false;
      const key = await secure.get(DEVICE_KEY);
      try {
        if (!key) throw new ApiError(400, "No key");
        unlocked(await unlockWithDeviceKey(key));
        return true;
      } catch (error) {
        // No internet: what's saved on the phone can still be seen
        if (error instanceof ApiError && error.offline) {
          setOfflineOnly(true);
          setStatus("ready");
          return true;
        }
        return false;
      }
    },
    async unlockWithPassword(password) {
      unlocked(await unlockSession(password));
      await keepDeviceKey();
    },
    lockNow: () => {
      void lockSession().catch(() => {});
      setStatus("locked");
    },
    async signOut() {
      try {
        await logOut();
      } catch {
        // Offline: the phone forgets the session anyway
      }
      await forget();
    },
    signedOutElsewhere: forget,
    cancelSignIn: forget,
    dismissWelcome: () => {
      if (sessionInfo) setInfo({ ...sessionInfo, welcomeBack: false });
    },
  };

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
