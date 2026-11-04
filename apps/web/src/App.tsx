import { Navigate, Route, Routes } from "react-router";
import { AppHeader } from "./presentation/components/layout/AppHeader";
import { GuestOnly } from "./presentation/components/routing/GuestOnly";
import { RequireAuth } from "./presentation/components/routing/RequireAuth";
import { LoginPage } from "./presentation/pages/LoginPage";
import { NotesPage } from "./presentation/pages/NotesPage";
import { RegisterPage } from "./presentation/pages/RegisterPage";

export function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/notes" element={<NotesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/notes" replace />} />
      </Routes>
    </>
  );
}
