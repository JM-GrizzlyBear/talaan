import { shortDate } from "@talaan/client";
import {
  ageOn,
  allergiesBySeverity,
  type MedicalIdFields,
  SEVERITY_LABELS,
  telLink,
  todayText,
} from "@talaan/shared";
import * as Linking from "expo-linking";
import { Phone, TriangleAlert } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, Facts, Txt } from "../ui/kit";

const SEX = { female: "Female", male: "Male", "": "" };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Txt
        tone="small"
        bold
        muted
        style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {title}
      </Txt>
      {children}
    </Card>
  );
}

const Missing = ({ children }: { children: string }) => (
  <Txt muted style={{ fontStyle: "italic" }}>
    {children}
  </Txt>
);

export function CallButton({ phone, label }: { phone: string; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => void Linking.openURL(telLink(phone))}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${phone}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: t.brand,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Phone size={18} color={t.onBrand} />
      <Txt tone="label" color={t.onBrand}>
        {phone}
      </Txt>
    </Pressable>
  );
}

// Allergies first, then blood type, conditions, medicines, then who to call
export function MedicalIdView({ fields }: { fields: MedicalIdFields }) {
  const t = useTheme();
  const age = ageOn(fields.birthDate, todayText(new Date()));
  const allergies = allergiesBySeverity(fields.allergies);
  const facts: [string, string][] = [
    [
      "Blood type",
      fields.bloodType
        ? fields.bloodType === "unknown"
          ? "Don't know"
          : fields.bloodType
        : "",
    ],
    [
      "Born",
      fields.birthDate
        ? `${shortDate(fields.birthDate)}${age !== null ? ` (${age} years old)` : ""}`
        : "",
    ],
    ["Sex", SEX[fields.sex]],
    ["Height", fields.heightCm !== null ? `${fields.heightCm} cm` : ""],
    ["Weight", fields.weightKg !== null ? `${fields.weightKg} kg` : ""],
    [
      "Organ donor",
      fields.organDonor ? (fields.organDonor === "yes" ? "Yes" : "No") : "",
    ],
    ["PhilHealth ID", fields.philhealth],
    ["Address", fields.address],
  ];
  return (
    <View style={{ gap: 12 }}>
      <Block title="Allergies">
        {allergies.length > 0 ? (
          allergies.map((a, i) => {
            const bad =
              a.severity === "life-threatening" || a.severity === "severe";
            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: bad ? t.dangerSoft : t.warnSoft,
                }}
              >
                {bad ? <TriangleAlert size={18} color={t.danger} /> : null}
                <Txt bold color={bad ? t.danger : t.warn}>
                  {a.name}
                </Txt>
                <Txt tone="small" bold color={bad ? t.danger : t.warn}>
                  {SEVERITY_LABELS[a.severity]}
                </Txt>
                {a.reaction ? (
                  <Txt tone="small" color={bad ? t.danger : t.warn}>
                    · {a.reaction}
                  </Txt>
                ) : null}
              </View>
            );
          })
        ) : fields.noKnownAllergies ? (
          <Txt bold>No known allergies</Txt>
        ) : (
          <Missing>Not filled in. That doesn't mean there are none.</Missing>
        )}
      </Block>
      {facts.some(([, v]) => v) ? (
        <Block title="About">
          <Facts rows={facts} />
        </Block>
      ) : null}
      <Block title="Conditions">
        {fields.conditions.length > 0 ? (
          fields.conditions.map((c, i) => (
            <Txt key={i}>
              <Txt bold>{c.name}</Txt>
              {c.since ? <Txt muted>{` · since ${c.since}`}</Txt> : null}
            </Txt>
          ))
        ) : (
          <Missing>None listed.</Missing>
        )}
      </Block>
      <Block title="Medicines taken regularly">
        {fields.medicines.length > 0 ? (
          fields.medicines.map((m, i) => (
            <Txt key={i}>
              <Txt bold>{m.name}</Txt>
              {m.dose ? <Txt muted>{` · ${m.dose}`}</Txt> : null}
            </Txt>
          ))
        ) : (
          <Missing>None listed.</Missing>
        )}
      </Block>
      {fields.devices.length > 0 ? (
        <Block title="Implants and devices">
          {fields.devices.map((d, i) => (
            <Txt key={i}>
              <Txt bold>{d.name}</Txt>
              {d.note ? <Txt muted>{` · ${d.note}`}</Txt> : null}
            </Txt>
          ))}
        </Block>
      ) : null}
      <Block title="Emergency contacts">
        {fields.contacts.length > 0 ? (
          fields.contacts.map((c, i) => (
            <View key={i} style={{ gap: 6, paddingVertical: 4 }}>
              <Txt>
                <Txt bold>{`${i + 1}. ${c.name}`}</Txt>
                {c.relationship ? (
                  <Txt muted>{` · ${c.relationship}`}</Txt>
                ) : null}
              </Txt>
              <CallButton phone={c.phone} label={`Call ${c.name}`} />
            </View>
          ))
        ) : (
          <Missing>None yet. Add at least one.</Missing>
        )}
      </Block>
      {fields.doctor.name || fields.doctor.phone ? (
        <Block title="Doctor">
          <Txt>
            <Txt bold>{fields.doctor.name}</Txt>
            {fields.doctor.specialty ? (
              <Txt muted>{` · ${fields.doctor.specialty}`}</Txt>
            ) : null}
          </Txt>
          {fields.doctor.clinic ? <Txt>{fields.doctor.clinic}</Txt> : null}
          {fields.doctor.phone ? (
            <CallButton
              phone={fields.doctor.phone}
              label={`Call ${fields.doctor.name || "the doctor"}`}
            />
          ) : null}
        </Block>
      ) : null}
      {fields.notes ? (
        <Block title="Notes for doctors">
          <Txt selectable>{fields.notes}</Txt>
        </Block>
      ) : null}
    </View>
  );
}
