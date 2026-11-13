import * as Device from "expo-device";

// "Maria's iPhone" (or "iPhone 15"), for the list of remembered devices
export function deviceName() {
  return (Device.deviceName || Device.modelName || "phone").slice(0, 60);
}
