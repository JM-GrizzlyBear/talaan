import { getRandomBytes } from "expo-crypto";

export const randomBytes = (n: number) => getRandomBytes(n);
