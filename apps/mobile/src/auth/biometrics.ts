import * as LocalAuthentication from "expo-local-authentication";

// Face ID, fingerprint, or the phone's own PIN/pattern when there's no
// biometrics. "none": the phone has no lock at all (then the password).
export type PhoneLock =
  "faceId" | "fingerprint" | "biometrics" | "pin" | "none";

export async function phoneLock(): Promise<PhoneLock> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return "none";
    if (level === LocalAuthentication.SecurityLevel.SECRET) return "pin";
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return "faceId";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "fingerprint";
    }
    return "biometrics";
  } catch {
    return "none";
  }
}

export const PHONE_LOCK_NAMES: Record<PhoneLock, string> = {
  faceId: "Face ID",
  fingerprint: "fingerprint",
  biometrics: "your face or fingerprint",
  pin: "your phone's PIN",
  none: "your password",
};

// Asks the phone; true when it's the owner
export async function confirmOwner(reason: string) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Use password",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
