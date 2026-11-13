import { randomPin } from "@talaan/shared";
import { getRandomBytes } from "expo-crypto";

// A random 6-digit PIN from the phone's secure random numbers
export const newPin = () =>
  randomPin(() => {
    const b = getRandomBytes(4);
    return (((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0) / 2 ** 32;
  });
