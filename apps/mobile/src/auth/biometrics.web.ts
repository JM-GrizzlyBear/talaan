// Web preview only: there's no Face ID in a browser, so the password is used
export type PhoneLock =
  "faceId" | "fingerprint" | "biometrics" | "pin" | "none";
export const phoneLock = async (): Promise<PhoneLock> => "none";
export const PHONE_LOCK_NAMES: Record<PhoneLock, string> = {
  faceId: "Face ID",
  fingerprint: "fingerprint",
  biometrics: "your face or fingerprint",
  pin: "your phone's PIN",
  none: "your password",
};
export const confirmOwner = async (_reason: string) => false;
