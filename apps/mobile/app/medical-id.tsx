import {
  allergiesBySeverity,
  isEmptyMedicalId,
  SEVERITY_LABELS,
  telLink,
} from "@talaan/shared";
import * as Linking from "expo-linking";
import { View } from "react-native";
import { messageOf } from "../src/api/ApiError";
import { useSession } from "../src/auth/SessionProvider";
import { WEB_URL } from "../src/config";
import { useSavedQuery } from "../src/offline/useSavedQuery";
import { useTheme } from "../src/theme/ThemeProvider";
import {
  Button,
  Card,
  Facts,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../src/ui/kit";
import { OfflineNote } from "../src/ui/OfflineNote";
import { PersonPicker } from "../src/ui/PersonPicker";
import { QrCode } from "../src/ui/QrCode";
import { usePeople } from "../src/ui/usePeople";

// What someone helping in an emergency needs: allergies first, then who to call
export default function MedicalId() {
  const t = useTheme();
  const { api } = useSession();
  const { people, person, choose } = usePeople();
  const id = useSavedQuery(
    ["medical", person?.ownerId, person?.profileId],
    () => api.medicalId(person!.ownerId, person!.profileId),
    Boolean(person),
  );

  const f = id.data?.fields;
  return (
    <Screen onRefresh={() => void id.refetch()} refreshing={id.isRefetching}>
      <PersonPicker people={people} chosen={person} onChoose={choose} />
      <OfflineNote savedAt={id.savedAt} />
      {id.isPending && <Loading />}
      {id.isError && <Notice tone="error">{messageOf(id.error)}</Notice>}
      {f && isEmptyMedicalId(f) && (
        <Card>
          <Txt>Nothing filled in yet.</Txt>
          <Button
            kind="secondary"
            onPress={() => void Linking.openURL(`${WEB_URL}/medical-id`)}
          >
            Fill it in on the website
          </Button>
        </Card>
      )}
      {f && !isEmptyMedicalId(f) && (
        <>
          <Card style={{ borderColor: t.danger }}>
            <Txt tone="heading" color={t.danger}>
              Allergies
            </Txt>
            {f.noKnownAllergies ? (
              <Txt>No known allergies</Txt>
            ) : f.allergies.length === 0 ? (
              <Txt muted>Not filled in</Txt>
            ) : (
              allergiesBySeverity(f.allergies).map((a) => {
                const serious =
                  a.severity === "severe" || a.severity === "life-threatening";
                return (
                  <View key={a.name}>
                    <Txt
                      style={{ fontWeight: "700" }}
                      color={serious ? t.danger : t.warn}
                    >
                      {a.name} · {SEVERITY_LABELS[a.severity]}
                    </Txt>
                    {a.reaction ? (
                      <Txt tone="small" muted>
                        {a.reaction}
                      </Txt>
                    ) : null}
                  </View>
                );
              })
            )}
          </Card>
          <Card>
            <Facts
              rows={[
                [
                  "Blood type",
                  f.bloodType && f.bloodType !== "unknown" ? f.bloodType : null,
                ],
                ["Conditions", f.conditions.map((c) => c.name).join(", ")],
                [
                  "Medicines",
                  f.medicines
                    .map((m) => [m.name, m.dose].filter(Boolean).join(" "))
                    .join(", "),
                ],
                [
                  "Implants and devices",
                  f.devices.map((d) => d.name).join(", "),
                ],
                [
                  "Organ donor",
                  f.organDonor === "yes"
                    ? "Yes"
                    : f.organDonor === "no"
                      ? "No"
                      : null,
                ],
                ["Notes for doctors", f.notes],
              ]}
            />
          </Card>
          {f.contacts.length > 0 && (
            <Card>
              <Txt tone="heading">Call in an emergency</Txt>
              {f.contacts.map((c) => (
                <View
                  key={`${c.name}${c.phone}`}
                  style={{ gap: 6, paddingVertical: 4 }}
                >
                  <Txt style={{ fontWeight: "600" }}>
                    {c.name}
                    {c.relationship ? ` (${c.relationship})` : ""}
                  </Txt>
                  <Button
                    onPress={() => void Linking.openURL(telLink(c.phone))}
                  >{`Call ${c.phone}`}</Button>
                </View>
              ))}
            </Card>
          )}
          {id.data?.emergency.on && id.data.emergency.token && (
            <Card style={{ alignItems: "center" }}>
              <Txt tone="heading">Emergency QR</Txt>
              <Txt tone="small" muted style={{ textAlign: "center" }}>
                Anyone helping can scan this to see who to call, without signing
                in.
              </Txt>
              <QrCode
                text={`${WEB_URL}/e/${id.data.emergency.token}`}
                label={`Emergency QR code for ${id.data.personName}`}
              />
            </Card>
          )}
          <Button
            kind="secondary"
            onPress={() => void Linking.openURL(`${WEB_URL}/medical-id`)}
          >
            Edit on the website
          </Button>
        </>
      )}
    </Screen>
  );
}
