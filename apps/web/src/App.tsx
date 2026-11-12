import { Navigate, Route, Routes } from "react-router";
import { AppHeader } from "./presentation/components/layout/AppHeader";
import { GuestOnly } from "./presentation/components/routing/GuestOnly";
import { RequireAuth } from "./presentation/components/routing/RequireAuth";
import { ActivityPage } from "./presentation/pages/records/ActivityPage";
import { FamilyPage } from "./presentation/pages/family/FamilyPage";
import { ForgotPasswordPage } from "./presentation/pages/auth/ForgotPasswordPage";
import { HomePage } from "./presentation/pages/HomePage";
import { InvitationPage } from "./presentation/pages/family/InvitationPage";
import { EmergencyPage } from "./presentation/pages/medical/EmergencyPage";
import { MedicalIdEditPage } from "./presentation/pages/medical/MedicalIdEditPage";
import { MedicalIdPage } from "./presentation/pages/medical/MedicalIdPage";
import { MedicalIdPrintPage } from "./presentation/pages/medical/MedicalIdPrintPage";
import { LabsPage } from "./presentation/pages/labs/LabsPage";
import { PrintLabsPage } from "./presentation/pages/labs/PrintLabsPage";
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
import { ReminderFormPage } from "./presentation/pages/reminders/ReminderFormPage";
import { ReminderPage } from "./presentation/pages/reminders/ReminderPage";
import { RemindersPage } from "./presentation/pages/reminders/RemindersPage";
import { AlertSettingsPage } from "./presentation/pages/settings/AlertSettingsPage";
import { useAppearanceSync } from "./application/appearance/useAppearance";
import { GoodbyePage } from "./presentation/pages/GoodbyePage";
import { AppearancePage } from "./presentation/pages/settings/AppearancePage";
import { YourDataPage } from "./presentation/pages/settings/YourDataPage";
import { SearchPage } from "./presentation/pages/search/SearchPage";
import { SharedPage } from "./presentation/pages/shares/SharedPage";
import { ShareNewPage } from "./presentation/pages/shares/ShareNewPage";
import { SharePage } from "./presentation/pages/shares/SharePage";
import { SharesPage } from "./presentation/pages/shares/SharesPage";
import { SecurityPage } from "./presentation/pages/settings/SecurityPage";
import { TrashPage } from "./presentation/pages/records/TrashPage";

export function App() {
  useAppearanceSync();
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
        {/* What the emergency QR opens: anyone, no sign-in */}
        <Route path="/e/:token" element={<EmergencyPage />} />
        {/* A doctor's link: no sign-in */}
        <Route path="/s/:token" element={<SharedPage />} />
        <Route path="/goodbye" element={<GoodbyePage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/new" element={<RecordFormPage />} />
          <Route path="/records/trash" element={<TrashPage />} />
          <Route path="/records/:id" element={<RecordPage />} />
          <Route path="/records/:id/edit" element={<RecordFormPage />} />
          <Route path="/medical-id" element={<MedicalIdPage />} />
          <Route path="/medical-id/edit" element={<MedicalIdEditPage />} />
          <Route path="/medical-id/print" element={<MedicalIdPrintPage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/shares" element={<SharesPage />} />
          <Route path="/shares/new" element={<ShareNewPage />} />
          <Route path="/shares/:id" element={<SharePage />} />
          <Route path="/labs/print" element={<PrintLabsPage />} />
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
          <Route path="/settings/alerts" element={<AlertSettingsPage />} />
          <Route path="/settings/data" element={<YourDataPage />} />
          <Route path="/settings/appearance" element={<AppearancePage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/reminders/new" element={<ReminderFormPage />} />
          <Route path="/reminders/:id" element={<ReminderPage />} />
          <Route path="/reminders/:id/edit" element={<ReminderFormPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
