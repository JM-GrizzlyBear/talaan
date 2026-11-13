import type { SessionInfo } from "@talaan/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { configureApi, SESSION_KEY } from "@talaan/client";
import {
  createPasskeyOnDevice,
  signWithPasskeyOnDevice,
} from "./infrastructure/passkeys/devicePasskeys";
import "./index.css";

const queryClient = new QueryClient();

// The website reaches the API on its own address, with the browser's cookie.
// Any answer "423 Locked" shows the lock screen.
configureApi({
  baseUrl: "",
  passkeys: { create: createPasskeyOnDevice, sign: signWithPasskeyOnDevice },
  onLocked: () => {
    queryClient.setQueryData<SessionInfo | null>(SESSION_KEY, (session) =>
      session ? { ...session, locked: true } : session,
    );
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
