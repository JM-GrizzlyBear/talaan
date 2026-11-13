import {
  columnsFor,
  filterSeries,
  NO_FILTERS,
  useLabs,
  useRecordAccounts,
} from "@talaan/client";
import { todayText } from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Link2, Printer } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  ChartsGrid,
  CompareDates,
  LabFiltersBar,
  LabTable,
  NeedsAttention,
  TestDetail,
} from "../../src/labs/LabViews";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AccountSelect, PersonSelect } from "../../src/ui/accounts";
import {
  Button,
  Buttons,
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";

const VIEWS = [
  ["table", "Table"],
  ["charts", "Charts"],
  ["attention", "Needs attention"],
  ["compare", "Compare two dates"],
] as const;
type View_ = (typeof VIEWS)[number][0] | "test";

// Every test across the lab records, lined up by date (like the website)
export default function Labs() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    owner?: string;
    person?: string;
    view?: string;
    test?: string;
    record?: string;
  }>();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.owner) ?? list[0] ?? null;
  const person = params.person ?? "self";
  const labs = useLabs(account?.ownerId, person);
  const view = (params.view ?? "table") as View_;
  const highlight = params.record;
  const [filters, setFilters] = useState(NO_FILTERS);
  const go = (changes: Record<string, string | undefined>) =>
    router.setParams(changes);

  const series = labs.data
    ? filterSeries(labs.data.series, filters, todayText(new Date()))
    : [];
  const columns = labs.data ? columnsFor(labs.data.records, series) : [];
  const chosen = labs.data?.series.find((s) => s.key === params.test);
  const openTest = (key: string) => go({ view: "test", test: key });
  const canShare =
    labs.data && (labs.data.role === "owner" || labs.data.role === "manage");

  return (
    <Screen
      onRefresh={() => void labs.refetch()}
      refreshing={labs.isRefetching}
    >
      <Stack.Screen
        options={{
          title: view === "test" && chosen ? chosen.name : "Lab results",
        }}
      />
      <Txt muted>
        Every test across the lab records, lined up by date. Units from
        different labs are converted (marked *).
      </Txt>
      <ErrorNotice error={accounts.error} />
      {account ? (
        <View style={{ gap: 12 }}>
          <AccountSelect
            accounts={list}
            value={account.ownerId}
            onChange={(owner) =>
              go({ owner, person: "self", test: undefined, record: undefined })
            }
          />
          <PersonSelect
            account={account}
            value={person}
            everyone={null}
            onChange={(p) =>
              go({
                person: p,
                test: undefined,
                record: undefined,
                view: view === "test" ? undefined : view,
              })
            }
          />
        </View>
      ) : null}
      {labs.data && labs.data.records.length > 0 && account ? (
        <Buttons>
          {canShare ? (
            <Button
              kind="secondary"
              small
              icon={Link2}
              onPress={() =>
                router.push({
                  pathname: "/shares/new",
                  params: { owner: account.ownerId, person, labs: "1" },
                })
              }
            >
              Share with a doctor
            </Button>
          ) : null}
          <Button
            kind="secondary"
            small
            icon={Printer}
            onPress={() =>
              router.push({
                pathname: "/labs/print",
                params: { owner: account.ownerId, person },
              })
            }
          >
            Print
          </Button>
        </Buttons>
      ) : null}

      {accounts.isPending || labs.isPending ? <Loading /> : null}
      <ErrorNotice error={labs.error} />
      {labs.data && labs.data.records.length === 0 ? (
        <Empty
          title={`No lab results for ${labs.data.personName} yet.`}
          text="Add a lab result record (you can read the values from a photo or PDF), and they'll show here."
          action={
            <Button
              onPress={() =>
                router.push({
                  pathname: "/records/new",
                  params: { owner: account?.ownerId ?? "" },
                })
              }
            >
              Add a lab result
            </Button>
          }
        />
      ) : null}

      {labs.data && labs.data.records.length > 0 ? (
        view === "test" ? (
          <>
            <Button
              kind="link"
              small
              onPress={() => go({ view: "charts", test: undefined })}
            >
              ‹ All tests
            </Button>
            {chosen ? (
              <>
                <Txt tone="heading">
                  {chosen.name}
                  {chosen.unit ? <Txt muted>{` · ${chosen.unit}`}</Txt> : null}
                </Txt>
                <TestDetail series={chosen} highlight={highlight} />
              </>
            ) : (
              <Notice tone="error">That test isn't in these results.</Notice>
            )}
          </>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityRole="tablist"
            >
              <View
                style={{
                  flexDirection: "row",
                  borderBottomWidth: 1,
                  borderColor: t.edge,
                }}
              >
                {VIEWS.map(([value, label]) => {
                  const on = view === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => go({ view: value })}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 2,
                        borderColor: on ? t.brand : "transparent",
                      }}
                    >
                      <Txt tone="label" color={on ? t.brand : t.muted}>
                        {label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            {view !== "compare" && view !== "attention" ? (
              <LabFiltersBar filters={filters} onChange={setFilters} />
            ) : null}
            {series.length === 0 && view !== "attention" ? (
              <Txt muted>No tests match.</Txt>
            ) : view === "charts" ? (
              <ChartsGrid
                series={series}
                onTest={openTest}
                highlight={highlight}
              />
            ) : view === "attention" ? (
              <NeedsAttention series={labs.data.series} onTest={openTest} />
            ) : view === "compare" ? (
              <CompareDates
                series={labs.data.series}
                columns={columnsFor(labs.data.records, labs.data.series)}
              />
            ) : (
              <LabTable
                series={series}
                columns={columns}
                highlight={highlight}
                onTest={openTest}
              />
            )}
          </>
        )
      ) : null}
      {labs.data && labs.data.records.length > 0 ? (
        <Txt tone="tiny" muted>
          * Converted from the unit on the record (a test's own page shows the
          original). Low and High follow the normal range printed on each
          result; only a doctor can say what they mean for you.
        </Txt>
      ) : null}
    </Screen>
  );
}
