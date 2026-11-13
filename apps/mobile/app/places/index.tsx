import { useBlankLabels, usePlaces, useRecordAccounts } from "@talaan/client";
import {
  ACCESS_LABELS,
  normalizeLabelCode,
  type RecordAccountInfo,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Printer, ScanLine, Search } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { PlaceList } from "../../src/places/PlaceParts";
import { Field, Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Screen,
  Txt,
} from "../../src/ui/kit";

const accountLabel = (a: RecordAccountInfo) =>
  a.role === "owner"
    ? "My places"
    : `${a.ownerName}'s places (${ACCESS_LABELS[a.role].name})`;

// Where the papers and films are kept at home
export default function Places() {
  const router = useRouter();
  const params = useLocalSearchParams<{ owner?: string }>();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.owner) ?? list[0] ?? null;
  const places = usePlaces(account?.ownerId);
  const canChange = account?.role === "owner" || account?.role === "manage";
  const blank = useBlankLabels(canChange ? account?.ownerId : undefined);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const owner = account ? { owner: account.ownerId } : {};
  const find = () => {
    const found = normalizeLabelCode(code);
    if (!found)
      return setCodeError(
        "A label code has 8 letters and numbers, like 7K4Q-M2XD",
      );
    router.push(`/l/${found}`);
  };
  return (
    <Screen
      onRefresh={() => void places.refetch()}
      refreshing={places.isRefetching}
    >
      <Stack.Screen options={{ title: "Places" }} />
      <Txt muted>
        Where the papers and films are kept. Each place has a QR label: scan it
        to see what should be inside.
      </Txt>
      <Buttons>
        {canChange ? (
          <Button
            small
            icon={Plus}
            onPress={() =>
              router.push({ pathname: "/places/new", params: owner })
            }
          >
            Add place
          </Button>
        ) : null}
        <Button
          kind="secondary"
          small
          icon={ScanLine}
          onPress={() => router.push("/scan")}
        >
          Scan a label
        </Button>
        {canChange ? (
          <Button
            kind="secondary"
            small
            icon={Printer}
            onPress={() =>
              router.push({ pathname: "/places/print", params: owner })
            }
          >
            Print labels
          </Button>
        ) : null}
      </Buttons>
      <ErrorNotice error={accounts.error ?? places.error} />
      {list.length > 1 && account ? (
        <Select
          label="Whose places"
          value={account.ownerId}
          onChange={(o) => router.setParams({ owner: o })}
          options={list.map((a) => ({
            value: a.ownerId,
            label: accountLabel(a),
          }))}
        />
      ) : null}
      {accounts.isPending || places.isPending ? <Loading /> : null}
      {places.data && places.data.places.length === 0 ? (
        <Empty
          title="No places yet."
          text="Start with where most of the papers are: a folder, a box, a drawer. You can put places inside places, like a folder in a box."
          action={
            canChange ? (
              <Button
                onPress={() =>
                  router.push({ pathname: "/places/new", params: owner })
                }
              >
                Add the first place
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {places.data && places.data.places.length > 0 ? (
        <PlaceList places={places.data.places} />
      ) : null}
      <Card>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Find a label"
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setCodeError(undefined);
              }}
              placeholder="7K4Q-M2XD"
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={find}
              error={codeError}
            />
          </View>
          <Button kind="secondary" small icon={Search} onPress={find}>
            Find
          </Button>
        </View>
      </Card>
      {canChange && blank.data && blank.data.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Txt tone="small" muted>
            {`${blank.data.length} blank ${blank.data.length === 1 ? "label is" : "labels are"} printed but not named yet. Scan one to name it.`}
          </Txt>
          <Button
            kind="link"
            small
            onPress={() =>
              router.push({
                pathname: "/places/print",
                params: { ...owner, blank: "unused" },
              })
            }
          >
            Print them again
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}
