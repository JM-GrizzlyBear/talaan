import type { SessionInfo } from "@talaan/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { SESSION_KEY } from "./application/auth/useAuth";
import { setLockedHandler } from "./infrastructure/api/http";
import "./index.css";

const queryClient = new QueryClient();

// Any API answer "423 Locked" shows the lock screen
setLockedHandler(() => {
  queryClient.setQueryData<SessionInfo | null>(SESSION_KEY, (session) =>
    session ? { ...session, locked: true } : session,
  );
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
