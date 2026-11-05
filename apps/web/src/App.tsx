import { Navigate, Route, Routes } from "react-router";
import { AppHeader } from "./presentation/components/layout/AppHeader";
import { GuestOnly } from "./presentation/components/routing/GuestOnly";
import { RequireAuth } from "./presentation/components/routing/RequireAuth";
import { FamilyPage } from "./presentation/pages/FamilyPage";
import { ForgotPasswordPage } from "./presentation/pages/ForgotPasswordPage";
import { HomePage } from "./presentation/pages/HomePage";
import { InvitationPage } from "./presentation/pages/InvitationPage";
import { LoginPage } from "./presentation/pages/LoginPage";
import { RegisterPage } from "./presentation/pages/RegisterPage";
import { SecurityPage } from "./presentation/pages/SecurityPage";

export function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        {/* Open to everyone: a locked or signed-out person may need it */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* The link in a family invitation email: open before signing in */}
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/settings/security" element={<SecurityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
