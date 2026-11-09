// What the emergency QR opens: no sign-in needed
export const emergencyUrl = (token: string) =>
  `${window.location.origin}/e/${token}`;
