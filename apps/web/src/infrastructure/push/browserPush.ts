// Browser notifications (Web Push): the service worker (public/sw.js) shows
// them, even with Talaan closed. iPhone and iPad: only after "Add to Home
// Screen" (iOS 16.4 and later).

export type PushSupport =
  | "yes"
  // iPhone or iPad in Safari: needs Add to Home Screen first
  | "home-screen"
  | "no";

export function pushSupport(): PushSupport {
  const hasApis =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  if (hasApis) return "yes";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios ? "home-screen" : "no";
}

// "Chrome on Android", to tell browsers apart on the settings page
export function browserLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "A browser";
  const system = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iPhone or iPad"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return system ? `${browser} on ${system}` : browser;
}

// The API's public key, as the browser wants it
function keyBytes(base64Url: string) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function registration() {
  return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

// Asks to show notifications, then signs this browser up. null: not allowed.
export async function subscribe(publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  };
}

// Is this browser signed up already? (its endpoint, or null)
export async function currentEndpoint() {
  if (pushSupport() !== "yes") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const subscription = await reg?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export async function unsubscribe() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const subscription = await reg?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}
