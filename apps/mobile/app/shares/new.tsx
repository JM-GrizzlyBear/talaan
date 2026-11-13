import {
  DEFAULT_EXPIRY,
  type Expiry,
  expiryDate,
  shortDate,
  useCreateShare,
  useRecordAccounts,
  useRecordList,
} from "@talaan/client";
import {
  RECORD_TYPE_LABELS,
  type RecordSummary,
  SHARE_LIMITS,
} from "@talaan/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChartLine, HeartPulse, Link2, Search } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { TextInput, View } from "react-native";
import { fieldError } from "../../src/api/ApiError";
import { usePersonParams } from "../../src/medical/usePersonParams";
import {
  ExpiryPicker,
  MaxViewsField,
  PinChoice,
} from "../../src/shares/ShareParts";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AccountSelect, PersonSelect } from "../../src/ui/accounts";
import { CheckRow, Field } from "../../src/ui/form";
import {
  Button,
  Card,
  ErrorNotice,
  Loading,
  Screen,
  Txt,
} from "../../src/ui/kit";

interface ShareChoice {
  medicalId: boolean;
  labs: boolean;
  recordIds: string[];
}

// /shares/new?owner=…&person=…&record=…&labs=1&medical=1
export default function NewShare() {
  const params = useLocalSearchParams<{
    record?: string | string[];
    labs?: string;
    medical?: string;
  }>();
  const accounts = useRecordAccounts();
  const mine = (accounts.data ?? []).filter(
    (a) => a.role === "owner" || a.role === "manage",
  );
  const { account, person, setPerson } = usePersonParams(mine);
  const records = useRecordList({
    ownerId: person?.ownerId,
    profileId: person?.profileId,
  });
  const router = useRouter();
  const wanted = Array.isArray(params.record)
    ? params.record
    : params.record
      ? [params.record]
      : [];
  return (
    <Screen>
      <Stack.Screen options={{ title: "New link for a doctor" }} />
      <Txt muted>
        They open it without an account and see only what you choose here.
      </Txt>
      {accounts.isPending ? <Loading /> : null}
      <ErrorNotice error={accounts.error ?? records.error} />
      {account && person ? (
        <>
          <AccountSelect
            accounts={mine}
            value={account.ownerId}
            onChange={(o) => setPerson(o, "self")}
          />
          <PersonSelect
            account={account}
            value={person.profileId}
            everyone={null}
            onChange={(p) => setPerson(account.ownerId, p)}
          />
          {records.isPending ? <Loading /> : null}
          {records.data ? (
            <ShareForm
              key={`${person.ownerId}|${person.profileId}`}
              ownerId={person.ownerId}
              profileId={person.profileId}
              records={records.data.records}
              initial={{
                medicalId: params.medical === "1",
                labs: params.labs === "1",
                recordIds: wanted.filter((id) =>
                  records.data.records.some((r) => r.id === id),
                ),
              }}
              onCreated={(id, pin) =>
                router.replace({
                  pathname: "/shares/[id]",
                  params: { id, made: "1", ...(pin ? { pin } : {}) },
                })
              }
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Txt tone="heading">{title}</Txt>
      <View style={{ gap: 12 }}>{children}</View>
    </Card>
  );
}

function ShareForm({
  ownerId,
  profileId,
  records,
  initial,
  onCreated,
}: {
  ownerId: string;
  profileId: string;
  records: RecordSummary[];
  initial: ShareChoice;
  onCreated: (id: string, pin: string) => void;
}) {
  const t = useTheme();
  const create = useCreateShare();
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [what, setWhat] = useState(initial);
  const [expiry, setExpiry] = useState<Expiry>(DEFAULT_EXPIRY);
  const [limitViews, setLimitViews] = useState(false);
  const [maxViews, setMaxViews] = useState("1");
  const [pinOn, setPinOn] = useState(false);
  const [pin, setPin] = useState("");
  const [now] = useState(() => new Date());
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const error = (field: string) =>
    problems[field] ?? fieldError(create.error, field);

  const chosen = new Set(what.recordIds);
  const labCount = records.filter((r) => r.type === "lab").length;
  const words = search.trim().toLowerCase();
  const shown = words
    ? records.filter((r) =>
        [
          r.title,
          r.facility,
          r.doctor,
          RECORD_TYPE_LABELS[r.type],
          r.recordDate,
        ]
          .join(" ")
          .toLowerCase()
          .includes(words),
      )
    : records;
  const setRecords = (ids: Iterable<string>) => {
    setWhat({ ...what, recordIds: [...new Set(ids)] });
    setProblems(({ what: _, ...rest }) => rest);
  };

  const submit = () => {
    const found: Record<string, string> = {};
    if (!recipient.trim()) found.recipient = "Who is it for? Like “Dr. Reyes”";
    if (!what.medicalId && !what.labs && what.recordIds.length === 0)
      found.what = "Choose at least one thing to share";
    const end = expiryDate(expiry, new Date());
    if ("error" in end) found.expiresAt = end.error;
    const views = Number(maxViews);
    if (
      limitViews &&
      (!Number.isInteger(views) || views < 1 || views > SHARE_LIMITS.maxViews)
    ) {
      found.maxViews = `Enter 1 to ${SHARE_LIMITS.maxViews}`;
    }
    if (pinOn && !/^\d{6}$/.test(pin)) found.pin = "Use 6 digits";
    setProblems(found);
    if (Object.keys(found).length > 0 || "error" in end) return;
    const thePin = pinOn ? pin : "";
    create.mutate(
      {
        ownerId,
        profileId,
        recipient: recipient.trim(),
        note: note.trim(),
        ...what,
        expiresAt: end.at.toISOString(),
        maxViews: limitViews ? views : null,
        pin: thePin,
      },
      { onSuccess: (link) => onCreated(link.id, thePin) },
    );
  };

  return (
    <View style={{ gap: 16 }}>
      <Part title="Who it's for">
        <Field
          label="Doctor or clinic"
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Dr. Reyes, cardiologist"
          maxLength={SHARE_LIMITS.recipient}
          error={error("recipient")}
        />
        <Field
          label="A note for them (optional)"
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="For my check-up on Friday. The CBC from March is the one I asked about."
          maxLength={SHARE_LIMITS.note}
          error={error("note")}
        />
      </Part>
      <Part title="What to share">
        <CheckRow
          label="Medical ID"
          note="Allergies, blood type, conditions, medicines, contacts"
          value={what.medicalId}
          onChange={(medicalId) => {
            setWhat({ ...what, medicalId });
            setProblems(({ what: _, ...rest }) => rest);
          }}
        >
          <HeartPulse size={16} color={t.brand} />
        </CheckRow>
        <CheckRow
          label="Lab results to compare"
          note={`Every test over time (${labCount} ${labCount === 1 ? "lab record" : "lab records"}): the table, charts and what needs attention. New lab results show too while the link works.`}
          value={what.labs}
          onChange={(labs) => {
            setWhat({ ...what, labs });
            setProblems(({ what: _, ...rest }) => rest);
          }}
        >
          <ChartLine size={16} color={t.brand} />
        </CheckRow>
        <Txt tone="label">
          Records ({what.recordIds.length} of {records.length} chosen)
        </Txt>
        {records.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Button
              kind="link"
              small
              onPress={() =>
                setRecords([...what.recordIds, ...shown.map((r) => r.id)])
              }
            >
              {words ? "Choose these" : "Choose all"}
            </Button>
            <Button
              kind="link"
              small
              onPress={() =>
                setRecords(
                  words
                    ? what.recordIds.filter(
                        (id) => !shown.some((r) => r.id === id),
                      )
                    : [],
                )
              }
            >
              {words ? "Leave these out" : "Choose none"}
            </Button>
          </View>
        ) : (
          <Txt muted>No records for this person yet.</Txt>
        )}
        {records.length > 6 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: t.edge,
              borderRadius: 12,
              paddingHorizontal: 12,
              backgroundColor: t.card,
            }}
          >
            <Search size={18} color={t.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Find: CBC, X-ray, St. Luke's, 2025…"
              placeholderTextColor={t.muted}
              accessibilityLabel="Find records"
              style={{
                flex: 1,
                minHeight: 46,
                color: t.ink,
                fontSize: 16 * t.scale,
              }}
            />
          </View>
        ) : null}
        {shown.map((r) => (
          <CheckRow
            key={r.id}
            label={r.title}
            note={`${RECORD_TYPE_LABELS[r.type]} · ${shortDate(r.recordDate)}${r.facility ? ` · ${r.facility}` : ""}`}
            value={chosen.has(r.id)}
            onChange={(on) =>
              setRecords(
                on
                  ? [...what.recordIds, r.id]
                  : what.recordIds.filter((x) => x !== r.id),
              )
            }
          />
        ))}
        {records.length > 0 && shown.length === 0 ? (
          <Txt muted>No records match.</Txt>
        ) : null}
        {(error("what") ?? error("recordIds")) ? (
          <Txt tone="small" color={t.danger} bold>
            {error("what") ?? error("recordIds")}
          </Txt>
        ) : null}
      </Part>
      <Part title="How long, and who can open it">
        <ExpiryPicker value={expiry} onChange={setExpiry} now={now} />
        {error("expiresAt") ? (
          <Txt tone="small" color={t.danger}>
            {error("expiresAt")}
          </Txt>
        ) : null}
        <MaxViewsField
          on={limitViews}
          value={maxViews}
          onChange={(on, v) => {
            setLimitViews(on);
            setMaxViews(v);
          }}
          error={error("maxViews")}
        />
        <PinChoice
          on={pinOn}
          pin={pin}
          onChange={(on, v) => {
            setPinOn(on);
            setPin(v);
          }}
          error={error("pin")}
        />
        <CheckRow
          label="Tell me when it's opened"
          note="By email and notification, as set in your alert settings. Every opening is listed on the link's page."
          value
          onChange={() => {}}
        />
      </Part>
      {create.isError && !fieldError(create.error, "recipient") ? (
        <ErrorNotice error={create.error} />
      ) : null}
      <Button icon={Link2} busy={create.isPending} onPress={submit}>
        {create.isPending ? "Making the link…" : "Make the link"}
      </Button>
    </View>
  );
}
