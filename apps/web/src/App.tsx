import { Navigate, Route, Routes } from "react-router";
import { AppHeader } from "./presentation/components/layout/AppHeader";
import { GuestOnly } from "./presentation/components/routing/GuestOnly";
import { RequireAuth } from "./presentation/components/routing/RequireAuth";
import { ActivityPage } from "./presentation/pages/records/ActivityPage";
import { FamilyPage } from "./presentation/pages/family/FamilyPage";
import { ForgotPasswordPage } from "./presentation/pages/auth/ForgotPasswordPage";
import { HomePage } from "./presentation/pages/HomePage";
import { InvitationPage } from "./presentation/pages/family/InvitationPage";
import { LabelPage } from "./presentation/pages/places/LabelPage";
import { LoginPage } from "./presentation/pages/auth/LoginPage";
import { RegisterPage } from "./presentation/pages/auth/RegisterPage";
import { PlaceFormPage } from "./presentation/pages/places/PlaceFormPage";
import { PlacePage } from "./presentation/pages/places/PlacePage";
import { PlacesPage } from "./presentation/pages/places/PlacesPage";
import { PrintLabelsPage } from "./presentation/pages/places/PrintLabelsPage";
import { RecordFormPage } from "./presentation/pages/records/RecordFormPage";
import { RecordPage } from "./presentation/pages/records/RecordPage";
import { RecordsPage } from "./presentation/pages/records/RecordsPage";
import { SecurityPage } from "./presentation/pages/settings/SecurityPage";
import { TrashPage } from "./presentation/pages/records/TrashPage";

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
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/new" element={<RecordFormPage />} />
          <Route path="/records/trash" element={<TrashPage />} />
          <Route path="/records/:id" element={<RecordPage />} />
          <Route path="/records/:id/edit" element={<RecordFormPage />} />
          <Route path="/places" element={<PlacesPage />} />
          <Route path="/places/new" element={<PlaceFormPage />} />
          <Route path="/places/print" element={<PrintLabelsPage />} />
          <Route path="/places/:id" element={<PlacePage />} />
          <Route path="/places/:id/edit" element={<PlaceFormPage />} />
          {/* What a QR label opens (signing in first if needed) */}
          <Route path="/l/:code" element={<LabelPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/settings/security" element={<SecurityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
