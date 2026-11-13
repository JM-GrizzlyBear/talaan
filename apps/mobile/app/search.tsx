import { useSearch } from "@talaan/client";
import {
  highlightRanges,
  parseSearch,
  SEARCH_KIND_LABELS,
  SEARCH_KINDS,
  SEARCH_LIMITS,
  type SearchKind,
  type SearchQuery,
  type SearchResult,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  ChartLine,
  FileText,
  HeartPulse,
  type LucideIcon,
  Package,
  Search as SearchIcon,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTheme } from "../src/theme/ThemeProvider";
import { Chips, Select } from "../src/ui/form";
import { ErrorNotice, List, Screen, Section, Txt } from "../src/ui/kit";

const EXAMPLES = [
  "CBC",
  "hemoglobin",
  "dugo",
  "resibo",
  "x-ray 2025",
  "penicillin",
];
const KIND_ICONS: Record<SearchKind, LucideIcon> = {
  record: FileText,
  test: ChartLine,
  medical: HeartPulse,
  place: Package,
  reminder: Bell,
  person: User,
};
const personKey = (r: Pick<SearchResult, "ownerId" | "profileId">) =>
  `${r.ownerId}:${r.profileId ?? "self"}`;

// Everything you can see, in one box (English or Filipino), like the website
export default function Search() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string;
    kind?: string;
    who?: string;
  }>();
  const q = params.q ?? "";
  const kind = (params.kind ?? "") as SearchKind | "";
  const who = params.who ?? "";
  const [typed, setTyped] = useState(q);
  const search = useSearch(q);
  const query = useMemo(() => parseSearch(q), [q]);
  const set = (changes: Record<string, string>) =>
    router.setParams(
      Object.fromEntries(
        Object.entries(changes).map(([k, v]) => [k, v || undefined]),
      ),
    );

  useEffect(() => {
    if (typed.trim() === q) return;
    const timer = setTimeout(
      () => set({ q: typed.trim(), kind: "", who: "" }),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const all = search.data?.results ?? [];
  const people = [
    ...new Map(all.map((r) => [personKey(r), r.personName])).entries(),
  ];
  const forWho = who ? all.filter((r) => personKey(r) === who) : all;
  const shown = kind ? forWho.filter((r) => r.kind === kind) : forWho;
  const counts = new Map<SearchKind, number>();
  for (const r of forWho) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const showPerson = people.length > 1 && !who;
  const tooShort = q.length > 0 && q.length < SEARCH_LIMITS.minLength;
  const list = (items: SearchResult[]) => (
    <List>
      {items.map((r, i) => (
        <ResultRow
          key={`${r.kind}-${r.id}`}
          result={r}
          query={query}
          showPerson={showPerson}
          first={i === 0}
        />
      ))}
    </List>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Search", headerRight: () => null }} />
      <View
        accessibilityRole="search"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.brand,
          backgroundColor: t.card,
          paddingHorizontal: 14,
        }}
      >
        <SearchIcon size={20} color={t.muted} />
        <TextInput
          value={typed}
          onChangeText={setTyped}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          maxLength={SEARCH_LIMITS.maxLength}
          onSubmitEditing={() => set({ q: typed.trim(), kind: "", who: "" })}
          placeholder="CBC, hemoglobin, dugo, a QR code…"
          placeholderTextColor={t.muted}
          accessibilityLabel="Search records, lab tests, places, reminders and family"
          style={{
            flex: 1,
            minHeight: 48,
            color: t.ink,
            fontSize: 17 * t.scale,
          }}
        />
        {typed ? (
          <Pressable
            onPress={() => {
              setTyped("");
              set({ q: "", kind: "", who: "" });
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            hitSlop={8}
          >
            <X size={20} color={t.muted} />
          </Pressable>
        ) : null}
      </View>
      {!q ? (
        <View style={{ gap: 10 }}>
          <Txt muted>
            Search every record, lab test, Medical ID, place, reminder and
            person you can see, yours and your family's. English or Filipino
            both work.
          </Txt>
          <Chips
            value=""
            onChange={(example) => {
              setTyped(example);
              set({ q: example, kind: "", who: "" });
            }}
            options={EXAMPLES.map((e) => ({ value: e, label: e }))}
          />
        </View>
      ) : null}
      {tooShort ? <Txt muted>Type at least 2 letters or numbers.</Txt> : null}
      <ErrorNotice error={search.error} />
      {q && !tooShort && search.data ? (
        <>
          {all.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chips
                  value={kind}
                  onChange={(k) => set({ kind: kind === k ? "" : k })}
                  options={[
                    {
                      value: "" as SearchKind | "",
                      label: `All ${forWho.length}`,
                    },
                    ...SEARCH_KINDS.filter((k) => counts.has(k)).map((k) => ({
                      value: k as SearchKind | "",
                      label: `${SEARCH_KIND_LABELS[k]} ${counts.get(k)}`,
                    })),
                  ]}
                />
              </ScrollView>
              {people.length > 1 ? (
                <Select
                  label="Whose"
                  value={who}
                  onChange={(v) => set({ who: v })}
                  options={[
                    { value: "", label: "Everyone" },
                    ...people.map(([key, name]) => ({
                      value: key,
                      label: name,
                    })),
                  ]}
                />
              ) : null}
            </>
          ) : null}
          <Txt tone="small" muted>
            {search.isFetching
              ? "Searching…"
              : all.length === 0
                ? `Nothing found for “${q}”.`
                : search.data.total > all.length
                  ? `The best ${all.length} of ${search.data.total}. Add a word to narrow it.`
                  : `${search.data.total} found.`}
          </Txt>
          {all.length === 0 && !search.isFetching ? (
            <Txt tone="small" muted>
              Try fewer words, or another word for it (Filipino or English).
              Records in the Trash aren't searched.
            </Txt>
          ) : null}
          {kind || shown.length <= 8
            ? shown.length > 0
              ? list(shown)
              : null
            : SEARCH_KINDS.filter((k) => counts.has(k)).map((k) => (
                <Section key={k} title={SEARCH_KIND_LABELS[k]}>
                  {list(shown.filter((r) => r.kind === k))}
                </Section>
              ))}
        </>
      ) : null}
    </Screen>
  );
}

function Highlight({ text, query }: { text: string; query: SearchQuery }) {
  const t = useTheme();
  const ranges = highlightRanges(text, query);
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <Text key={start} style={{ backgroundColor: t.warnSoft, color: t.ink }}>
        {text.slice(start, end)}
      </Text>,
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

function ResultRow({
  result,
  query,
  showPerson,
  first,
}: {
  result: SearchResult;
  query: SearchQuery;
  showPerson: boolean;
  first: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const Icon = KIND_ICONS[result.kind];
  const sub = [
    showPerson &&
      result.kind !== "person" &&
      !result.title.startsWith(result.personName) &&
      result.personName,
    result.subtitle,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      onPress={() => router.push(result.path as never)}
      accessibilityRole="link"
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        padding: 12,
        borderTopWidth: first ? 0 : 1,
        borderColor: t.edge,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: t.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color={t.deep} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt bold>
          <Highlight text={result.title} query={query} />
        </Txt>
        {sub ? (
          <Txt tone="small" muted>
            {sub}
          </Txt>
        ) : null}
        {result.match ? (
          <Txt tone="small">
            <Txt tone="small" muted>{`${result.match.label}: `}</Txt>
            <Highlight text={result.match.text} query={query} />
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}
