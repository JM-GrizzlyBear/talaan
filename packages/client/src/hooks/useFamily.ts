import type {
  AccessLevel,
  FamilyProfileInput,
  InviteFamilyInput,
} from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitation,
  addProfile,
  cancelInvitation,
  changeMemberAccess,
  declineInvitation,
  fetchFamily,
  inviteFamily,
  leaveShared,
  lookUpInvitation,
  removeMember,
  removeProfile,
  resendInvitation,
  updateProfile,
} from "../api/familyApi";

const FAMILY_KEY = ["family"] as const;

export function useFamily() {
  return useQuery({
    queryKey: FAMILY_KEY,
    queryFn: async () => await fetchFamily(),
  });
}

// A change, then the Family page reloads its lists
function useFamilyChange<Input>(change: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => await change(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAMILY_KEY }),
  });
}

export const useInviteFamily = () =>
  useFamilyChange((input: InviteFamilyInput) => inviteFamily(input));
export const useResendInvitation = () =>
  useFamilyChange((id: string) => resendInvitation(id));
export const useCancelInvitation = () =>
  useFamilyChange((id: string) => cancelInvitation(id));
export const useChangeMemberAccess = () =>
  useFamilyChange((input: { userId: string; access: AccessLevel }) =>
    changeMemberAccess(input.userId, input.access),
  );
export const useRemoveMember = () =>
  useFamilyChange((userId: string) => removeMember(userId));
export const useLeaveShared = () =>
  useFamilyChange((ownerId: string) => leaveShared(ownerId));
export const useAddProfile = () =>
  useFamilyChange((input: FamilyProfileInput) => addProfile(input));
export const useUpdateProfile = () =>
  useFamilyChange((input: { id: string; fields: FamilyProfileInput }) =>
    updateProfile(input.id, input.fields),
  );
export const useRemoveProfile = () =>
  useFamilyChange((id: string) => removeProfile(id));

// The invitation link's page
export function useInvitationPreview(token: string, viewerId: string | null) {
  return useQuery({
    // The answer depends on who is signed in
    queryKey: ["invitation", token, viewerId],
    queryFn: async () => await lookUpInvitation(token),
    retry: false,
  });
}

export const useAcceptInvitation = () =>
  useFamilyChange((token: string) => acceptInvitation(token));

export function useDeclineInvitation() {
  return useMutation({
    mutationFn: async (token: string) => await declineInvitation(token),
  });
}
