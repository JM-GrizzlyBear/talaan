import type { PublicUser } from "@talaan/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { ApiError } from "../api/ApiError";
import { createClient } from "../api/client";
import { endpoints, type Endpoints } from "../api/endpoints";
import { API_URL } from "../config";
import { offline } from "../storage/offline";
import { secure } from "../storage/secure";
import { confirmOwner, phoneLock, type PhoneLock } from "./biometrics";
import { shouldLockOnReturn } from "./lockRules";

const TOKEN = "talaan.session";
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
  api: Endpoints;
  signIn: (email: string, password: string) => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  unlockWithPhone: () => Promise<boolean>;
  unlockWithPassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Two-step: back to the email and password
  cancelSignIn: () => Promise<void>;
  setUser: (user: PublicUser) => void;
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
  const [status, setStatus] = useState<Status>("starting");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [lock, setLock] = useState<PhoneLock>("none");
  const token = useRef<string | null>(null);
  const leftAt = useRef<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const forget = useCallback(async () => {
    token.current = null;
    await secure.remove(TOKEN);
    await secure.remove(DEVICE_KEY);
    await offline.wipe();
    queryClient.clear();
    setUser(null);
    setCodeEmail(null);
    setOfflineOnly(false);
    setStatus("signedOut");
  }, [queryClient]);

  const api = useMemo(
    () =>
      endpoints(
        createClient({
          baseUrl: API_URL,
          getToken: () => token.current,
          setToken: (t) => {
            token.current = t;
            void secure.set(TOKEN, t);
          },
          onLocked: () => {
            if (statusRef.current === "ready") setStatus("locked");
          },
          onSignedOut: () => {
            if (statusRef.current !== "signedOut") void forget();
          },
        }),
      ),
    [forget],
  );

  // A key for Face ID / fingerprint unlocking, made right after signing in
  const makeDeviceKey = useCallback(async () => {
    try {
      const { deviceKey } = await api.makeDeviceKey();
      await secure.set(DEVICE_KEY, deviceKey);
    } catch {
      // Without it, unlocking asks for the password
    }
  }, [api]);

  const signedIn = useCallback(
    async (u: PublicUser, back = false) => {
      setUser(u);
      setWelcomeBack(back);
      setOfflineOnly(false);
      setCodeEmail(null);
      setStatus("ready");
      await makeDeviceKey();
    },
    [makeDeviceKey],
  );

  // Starting: a saved session opens locked (Face ID first) when the phone
  // has a lock; without internet, what was saved can still be opened
  useEffect(() => {
    void (async () => {
      setLock(await phoneLock());
      token.current = await secure.get(TOKEN);
      if (!token.current) {
        setStatus("signedOut");
        return;
      }
      try {
        const me = await api.me();
        setUser(me.user);
        setStatus("locked");
      } catch (error) {
        if (error instanceof ApiError && error.offline) {
          setOfflineOnly(true);
          setStatus("locked");
        } else if (error instanceof ApiError && error.status === 401) {
          await forget();
        } else {
          setStatus("locked");
        }
      }
    })();
  }, [api, forget]);

  // Away for longer than the "lock after" time: locked again
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        leftAt.current ??= Date.now();
        return;
      }
      if (
        state === "active" &&
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
    welcomeBack,
    offlineOnly,
    lock,
    api,
    async signIn(email, password) {
      const result = await api.logIn(email, password);
      if (result.twoStep) {
        setCodeEmail(result.email);
        setStatus("code");
        return;
      }
      await signedIn(result.user, result.welcomeBack);
    },
    async submitCode(code) {
      const result = await api.submitCode(code);
      await signedIn(result.user, result.welcomeBack);
    },
    async unlockWithPhone() {
      if (!(await confirmOwner("Unlock Talaan"))) return false;
      const key = await secure.get(DEVICE_KEY);
      try {
        if (!key) throw new ApiError(400, "No key");
        const { user: u } = await api.unlockWithDeviceKey(key);
        setUser(u);
        setOfflineOnly(false);
        setStatus("ready");
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
      const { user: u } = await api.unlockWithPassword(password);
      setUser(u);
      setOfflineOnly(false);
      setStatus("ready");
      await makeDeviceKey();
    },
    async signOut() {
      try {
        await api.logOut();
      } catch {
        // Offline: the phone forgets the session anyway
      }
      await forget();
    },
    cancelSignIn: forget,
    setUser,
    dismissWelcome: () => setWelcomeBack(false),
  };

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
