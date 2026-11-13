import { fetchAlertSettings, saveAlertSettings } from "@talaan/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Mail, Smartphone } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { phoneNotifications } from "../../src/reminders/notifications";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Toggle } from "../../src/ui/form";
import {
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";

// /settings/alerts: your own reminder alerts (the website's My alerts), and
// notifications on this phone
export default function AlertSettings() {
  const t = useTheme();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["alert-settings"],
    queryFn: fetchAlertSettings,
  });
  const save = useMutation({
    mutationFn: saveAlertSettings,
    onSuccess: (data) => queryClient.setQueryData(["alert-settings"], data),
  });
  const [phone, setPhone] = useState<{
    wanted: boolean;
    allowed: boolean;
  } | null>(null);
  const [phoneProblem, setPhoneProblem] = useState(false);
  useEffect(() => {
    void (async () =>
      setPhone({
        wanted: await phoneNotifications.wanted(),
        allowed: await phoneNotifications.allowed(),
      }))().catch(() => setPhone({ wanted: false, allowed: false }));
  }, []);

  const setPhoneOn = (on: boolean) =>
    changePhone(on).catch(() => setPhoneProblem(true));
  const changePhone = async (on: boolean) => {
    setPhoneProblem(false);
    if (
      on &&
      !(await phoneNotifications.allowed()) &&
      !(await phoneNotifications.ask())
    ) {
      setPhoneProblem(true);
      return;
    }
    await phoneNotifications.setWanted(on);
    setPhone({ wanted: on, allowed: await phoneNotifications.allowed() });
    // Plan them again (or not)
    await queryClient.invalidateQueries({
      queryKey: ["reminders", "phone-alerts"],
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "My alerts" }} />
      <Txt muted>
        Only for you: the family keep their own. You can also turn alerts off
        for one reminder on its page.
      </Txt>
      {settings.isPending ? <Loading /> : null}
      <ErrorNotice error={settings.error ?? save.error} />
      <Card>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Smartphone size={20} color={t.brand} />
          <Txt tone="heading">This phone</Txt>
        </View>
        {phone ? (
          <Toggle
            label="Show reminder alerts as notifications on this phone"
            note="They're planned on the phone for the next 7 days, so they come on time even without internet."
            value={phone.wanted && phone.allowed}
            onChange={(on) => void setPhoneOn(on)}
          />
        ) : null}
        {phoneProblem ? (
          <Notice tone="warn">
            Notifications are turned off for Talaan (or Expo Go). Turn them on
            in the phone's Settings.
          </Notice>
        ) : null}
      </Card>
      {settings.data ? (
        <Card>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Mail size={20} color={t.brand} />
            <Txt tone="heading">Email</Txt>
          </View>
          <Toggle
            label="Send reminder alerts to my email"
            value={settings.data.email}
            disabled={save.isPending}
            onChange={(email) =>
              save.mutate({ email, push: settings.data.push })
            }
          />
          <Toggle
            label="Browser notifications on the website"
            note="For computers and browsers where you turned them on, on the website."
            value={settings.data.push}
            disabled={save.isPending}
            onChange={(push) =>
              save.mutate({ email: settings.data.email, push })
            }
          />
        </Card>
      ) : null}
    </Screen>
  );
}
