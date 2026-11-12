import type {
  LoginInput,
  PublicUser,
  RegisterInput,
  SessionInfo,
  SignInCodeInput,
} from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSession,
  lockSession,
  logIn,
  logOut,
  register,
  resendSignInCode,
  signInWithPasskey,
  submitSignInCode,
  unlockSession,
  unlockWithPasskey,
} from "../../infrastructure/api/authApi";

export const SESSION_KEY = ["auth", "me"] as const;

// Who is signed in and whether the website is locked (null: nobody).
// Every page reads this one cached answer.
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => await fetchSession(),
    staleTime: Infinity,
    retry: false,
  });
}

// Just the signed-in person (null: nobody)
export function useCurrentUser() {
  const session = useSession();
  return { ...session, data: session.data?.user ?? null };
}

function useSetSession() {
  const queryClient = useQueryClient();
  return (session: SessionInfo | null) => {
    // Forget the previous person's data, but keep the sign-in answer the pages watch
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== SESSION_KEY[0],
    });
    queryClient.setQueryData(SESSION_KEY, session);
  };
}

// Updates the cached session without forgetting anything else
export function useUpdateSession() {
  const queryClient = useQueryClient();
  return (update: (session: SessionInfo) => SessionInfo) => {
    queryClient.setQueryData<SessionInfo | null>(SESSION_KEY, (session) =>
      session ? update(session) : session,
    );
  };
}

const signedIn = (user: PublicUser, welcomeBack = false): SessionInfo => ({
  user,
  locked: false,
  welcomeBack,
});

export function useRegister() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: async (input: RegisterInput) => await register(input),
    onSuccess: (user) => setSession(signedIn(user)),
  });
}

// Signed in, or { twoStep: true }: the page then asks for the emailed code
export function useLogIn() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: async (input: LoginInput) => await logIn(input),
    onSuccess: (result) => {
      if (!result.twoStep) {
        setSession(signedIn(result.user, result.welcomeBack));
      }
    },
  });
}

export function useSignInCode() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: async (input: SignInCodeInput) => await submitSignInCode(input),
    onSuccess: (result) =>
      setSession(signedIn(result.user, result.welcomeBack)),
  });
}

export function useResendSignInCode() {
  return useMutation({ mutationFn: async () => await resendSignInCode() });
}

export function usePasskeySignIn() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: async () => await signInWithPasskey(),
    onSuccess: (result) =>
      setSession(signedIn(result.user, result.welcomeBack)),
  });
}

// Signed out by the API itself (deleting the account)
export function useSignedOut() {
  const setSession = useSetSession();
  return () => setSession(null);
}

export function useLogOut() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: async () => await logOut(),
    onSuccess: () => setSession(null),
  });
}

export function useLock() {
  const update = useUpdateSession();
  return useMutation({
    mutationFn: async () => await lockSession(),
    // Lock the screen even if the request failed: the API locks on its own too
    onSettled: () => update((session) => ({ ...session, locked: true })),
  });
}

export function useUnlock() {
  const update = useUpdateSession();
  return useMutation({
    mutationFn: async (password: string) => await unlockSession(password),
    onSuccess: (user) => update(() => signedIn(user)),
  });
}

export function usePasskeyUnlock() {
  const update = useUpdateSession();
  return useMutation({
    mutationFn: async () => await unlockWithPasskey(),
    onSuccess: (user) => update(() => signedIn(user)),
  });
}
