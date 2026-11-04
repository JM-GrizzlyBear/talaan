import type { LoginInput, PublicUser, RegisterInput } from "@pern/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  logIn,
  logOut,
  register,
} from "../../infrastructure/api/authApi";

export const CURRENT_USER_KEY = ["auth", "me"] as const;

// Who is logged in (null: nobody). Every page reads this one cached answer.
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: async () => await fetchCurrentUser(),
    staleTime: Infinity,
    retry: false,
  });
}

function useSetUser() {
  const queryClient = useQueryClient();
  return (user: PublicUser | null) => {
    // Forget the previous user's data (their notes), but keep the login answer the pages watch
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== CURRENT_USER_KEY[0],
    });
    queryClient.setQueryData(CURRENT_USER_KEY, user);
  };
}

export function useRegister() {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: async (input: RegisterInput) => await register(input),
    onSuccess: setUser,
  });
}

export function useLogIn() {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: async (input: LoginInput) => await logIn(input),
    onSuccess: setUser,
  });
}

export function useLogOut() {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: async () => await logOut(),
    onSuccess: () => setUser(null),
  });
}
