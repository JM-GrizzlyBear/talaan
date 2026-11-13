import {
  shortDate,
  useMarkChecked,
  useMedicalId,
  useRecordAccounts,
} from "@talaan/client";
import {
  isEmptyMedicalId,
  type MedicalIdInfo,
  monthsSince,
} from "@talaan/shared";
import { Stack, useRouter } from "expo-router";
import {
  CreditCard,
  FileText,
  Link2,
  Pencil,
  Smartphone,
} from "lucide-react-native";
import { View } from "react-native";
import { EmergencyQrPanel } from "../../src/medical/EmergencyQrPanel";
import { LockScreenMaker } from "../../src/medical/LockScreenMaker";
import { MedicalIdView } from "../../src/medical/MedicalIdView";
import { usePersonParams } from "../../src/medical/usePersonParams";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AccountSelect, PersonSelect } from "../../src/ui/accounts";
import {
  Button,
  Buttons,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";

const CHECK_AFTER_MONTHS = 6;

// What someone helping in an emergency needs to know, and who to call
export default function MedicalId() {
  const accounts = useRecordAccounts();
  const { account, person, query, setPerson } = usePersonParams(accounts.data);
  const medicalId = useMedicalId(person);
  return (
    <Screen
      onRefresh={() => void medicalId.refetch()}
      refreshing={medicalId.isRefetching}
    >
      <Stack.Screen options={{ title: "Medical ID" }} />
      <Txt muted>
        What someone helping in an emergency needs to know, and who to call.
      </Txt>
      <ErrorNotice error={accounts.error} />
      {account && person ? (
        <View style={{ gap: 12 }}>
          <AccountSelect
            label="Whose Medical ID"
            accounts={accounts.data ?? []}
            value={account.ownerId}
            onChange={(owner) => setPerson(owner, "self")}
          />
          <PersonSelect
            label="Who"
            account={account}
            value={person.profileId}
            everyone={null}
            onChange={(p) => setPerson(account.ownerId, p)}
          />
        </View>
      ) : null}
      {accounts.isPending || medicalId.isPending ? <Loading /> : null}
      <ErrorNotice error={medicalId.error} />
      {medicalId.data ? (
        <Body medicalId={medicalId.data} query={query} />
      ) : null}
    </Screen>
  );
}

function Body({
  medicalId,
  query,
}: {
  medicalId: MedicalIdInfo;
  query: Record<string, string>;
}) {
  const t = useTheme();
  const router = useRouter();
  const canChange = medicalId.role === "owner" || medicalId.role === "manage";
  const check = useMarkChecked({
    ownerId: medicalId.ownerId,
    profileId: medicalId.profileId ?? "self",
  });
  const stale =
    medicalId.checkedAt !== null &&
    monthsSince(medicalId.checkedAt, new Date()) >= CHECK_AFTER_MONTHS;
  const edit = () =>
    router.push({ pathname: "/medical-id/edit", params: query });

  if (isEmptyMedicalId(medicalId.fields)) {
    return (
      <View style={{ gap: 16 }}>
        <Empty
          title={`${medicalId.personName}'s Medical ID is empty.`}
          text="Start with allergies and emergency contacts: they matter most. Everything else can come later."
          action={
            canChange ? <Button onPress={edit}>Fill it in</Button> : undefined
          }
        />
        {canChange ? <EmergencyQrPanel medicalId={medicalId} /> : null}
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      <Txt tone="title">{medicalId.personName}</Txt>
      <Buttons>
        {canChange ? (
          <Button kind="secondary" small icon={Pencil} onPress={edit}>
            Edit
          </Button>
        ) : null}
        <Button
          kind="secondary"
          small
          icon={CreditCard}
          onPress={() =>
            router.push({
              pathname: "/medical-id/print",
              params: { ...query, what: "card" },
            })
          }
        >
          Wallet card
        </Button>
        <Button
          kind="secondary"
          small
          icon={FileText}
          onPress={() =>
            router.push({
              pathname: "/medical-id/print",
              params: { ...query, what: "summary" },
            })
          }
        >
          One-page summary
        </Button>
        {canChange ? (
          <Button
            kind="secondary"
            small
            icon={Link2}
            onPress={() =>
              router.push({
                pathname: "/shares/new",
                params: { ...query, medical: "1" },
              })
            }
          >
            Share with a doctor
          </Button>
        ) : null}
      </Buttons>
      {stale && canChange ? (
        <Notice>
          <View style={{ gap: 8 }}>
            <Txt tone="small" color={t.deep} bold>
              Last checked {shortDate(medicalId.checkedAt as string)}. Is it
              still right?
            </Txt>
            <Buttons>
              <Button
                small
                busy={check.isPending}
                onPress={() => check.mutate()}
              >
                Yes, still right
              </Button>
              <Button kind="secondary" small onPress={edit}>
                Update it
              </Button>
            </Buttons>
          </View>
        </Notice>
      ) : null}
      <MedicalIdView fields={medicalId.fields} />
      {medicalId.updatedAt ? (
        <Txt tone="small" muted>
          Last changed
          {medicalId.updatedByName
            ? ` by ${medicalId.updatedByName}`
            : ""} on {shortDate(medicalId.updatedAt)}.
        </Txt>
      ) : null}
      {canChange ? <EmergencyQrPanel medicalId={medicalId} /> : null}
      <Card>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Smartphone size={20} color={t.brand} />
          <Txt tone="heading">Lock screen picture</Txt>
        </View>
        <LockScreenMaker medicalId={medicalId} />
      </Card>
    </View>
  );
}
