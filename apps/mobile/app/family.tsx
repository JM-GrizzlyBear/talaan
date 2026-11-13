import {
  ageFrom,
  relationshipOptions,
  shortDate,
  useAddProfile,
  useCancelInvitation,
  useChangeMemberAccess,
  useFamily,
  useInviteFamily,
  useLeaveShared,
  useRemoveMember,
  useRemoveProfile,
  useResendInvitation,
  useUpdateProfile,
} from "@talaan/client";
import {
  ACCESS_LABELS,
  ACCESS_LEVELS,
  type AccessLevel,
  AUTH_LIMITS,
  type FamilyMemberInfo,
  type FamilyProfileInfo,
  type FamilyRelationship,
  fullName,
  relationshipLabel,
  type SentInvitationInfo,
  type SharedWithMeInfo,
} from "@talaan/shared";
import { Stack, useRouter } from "expo-router";
import { Baby, Eye, MailOpen, UserPlus, Users } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { fieldError } from "../src/api/ApiError";
import { useTheme } from "../src/theme/ThemeProvider";
import { DateField } from "../src/ui/DateField";
import { ConfirmBox, Field, Select } from "../src/ui/form";
import {
  Badge,
  Button,
  Buttons,
  Card,
  ErrorNotice,
  List,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../src/ui/kit";

// Share your records one way; profiles for family without email; records
// shared with you (the website's Family page)
export default function Family() {
  const family = useFamily();
  const router = useRouter();
  return (
    <Screen
      onRefresh={() => void family.refetch()}
      refreshing={family.isRefetching}
    >
      <Stack.Screen options={{ title: "Family" }} />
      <Txt muted>
        Share your records one way: the people you invite see yours, and you see
        theirs only if they invite you too.
      </Txt>
      <Button
        kind="secondary"
        small
        icon={MailOpen}
        onPress={() => router.push("/invite")}
      >
        Got an invitation by email? Open it here
      </Button>
      {family.isPending ? <Loading /> : null}
      <ErrorNotice error={family.error} />
      {family.data ? (
        <>
          <Members
            members={family.data.members}
            invitations={family.data.invitations}
          />
          <Profiles profiles={family.data.profiles} />
          <SharedWithMe shared={family.data.sharedWithMe} />
        </>
      ) : null}
    </Screen>
  );
}

function Heading({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon size={20} color={t.brand} />
      <Txt tone="heading">{children}</Txt>
    </View>
  );
}

function Rowish({ children, first }: { children: ReactNode; first: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: 12,
        gap: 8,
        borderTopWidth: first ? 0 : 1,
        borderColor: t.edge,
      }}
    >
      {children}
    </View>
  );
}

function Members({
  members,
  invitations,
}: {
  members: FamilyMemberInfo[];
  invitations: SentInvitationInfo[];
}) {
  const [inviting, setInviting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  return (
    <View style={{ gap: 10 }}>
      <Heading icon={Users}>Who can see my records</Heading>
      {members.length === 0 && invitations.length === 0 && !inviting ? (
        <Txt muted>
          Nobody yet. Invite a family member by email; they accept or decline.
        </Txt>
      ) : null}
      {members.length > 0 ? (
        <List>
          {members.map((m, i) => (
            <MemberRow key={m.userId} member={m} first={i === 0} />
          ))}
        </List>
      ) : null}
      {invitations.length > 0 ? (
        <>
          <Txt tone="label">Invitations</Txt>
          <List>
            {invitations.map((inv, i) => (
              <InvitationRow key={inv.id} invitation={inv} first={i === 0} />
            ))}
          </List>
        </>
      ) : null}
      {sentTo && !inviting ? (
        <Notice>{`Invitation sent to ${sentTo}. It works for 7 days.`}</Notice>
      ) : null}
      {inviting ? (
        <InviteForm
          onDone={(email) => {
            setInviting(false);
            setSentTo(email);
          }}
          onCancel={() => setInviting(false)}
        />
      ) : (
        <Button
          icon={UserPlus}
          onPress={() => {
            setSentTo(null);
            setInviting(true);
          }}
        >
          Invite someone
        </Button>
      )}
    </View>
  );
}

function MemberRow({
  member,
  first,
}: {
  member: FamilyMemberInfo;
  first: boolean;
}) {
  const change = useChangeMemberAccess();
  const remove = useRemoveMember();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(member);
  return (
    <Rowish first={first}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        <Txt bold>{name}</Txt>
        <Badge>{relationshipLabel(member.relationship)}</Badge>
      </View>
      <Txt tone="small" muted>
        {member.email}
      </Txt>
      <Select
        label={`What ${name} can do`}
        value={member.access}
        onChange={(access) =>
          change.mutate({
            userId: member.userId,
            access: access as AccessLevel,
          })
        }
        options={ACCESS_LEVELS.map((level) => ({
          value: level,
          label: ACCESS_LABELS[level].name,
        }))}
      />
      <ErrorNotice error={change.error ?? remove.error} />
      {confirming ? (
        <ConfirmBox
          message={`Stop sharing your records with ${member.firstName}?`}
          confirmLabel="Yes, stop sharing"
          busy={remove.isPending}
          onConfirm={() => remove.mutate(member.userId)}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <Button
          kind="link"
          small
          label={`Remove ${name}`}
          onPress={() => setConfirming(true)}
        >
          Remove
        </Button>
      )}
    </Rowish>
  );
}

function InvitationRow({
  invitation,
  first,
}: {
  invitation: SentInvitationInfo;
  first: boolean;
}) {
  const t = useTheme();
  const resend = useResendInvitation();
  const cancel = useCancelInvitation();
  const waiting = invitation.status === "pending";
  const status = waiting
    ? `Waiting · until ${shortDate(invitation.expiresAt)}`
    : invitation.status === "expired"
      ? "Expired"
      : "Declined";
  return (
    <Rowish first={first}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        <Txt bold>{invitation.email}</Txt>
        <Badge>{relationshipLabel(invitation.relationship)}</Badge>
      </View>
      <Txt tone="small" muted>
        {ACCESS_LABELS[invitation.access].name} ·{" "}
        <Txt tone="small" color={waiting ? t.muted : t.danger} bold={!waiting}>
          {status}
        </Txt>
      </Txt>
      <Buttons>
        <Button
          kind="link"
          small
          busy={resend.isPending}
          onPress={() => resend.mutate(invitation.id)}
        >
          {resend.isPending ? "Sending…" : "Send again"}
        </Button>
        <Button
          kind="link"
          small
          label={`${waiting ? "Cancel" : "Clear"} the invitation to ${invitation.email}`}
          busy={cancel.isPending}
          onPress={() => cancel.mutate(invitation.id)}
        >
          {waiting ? "Cancel" : "Clear"}
        </Button>
      </Buttons>
      {resend.isSuccess ? <Notice>Sent again with a new link.</Notice> : null}
      <ErrorNotice error={resend.error ?? cancel.error} />
    </Rowish>
  );
}

function InviteForm({
  onDone,
  onCancel,
}: {
  onDone: (email: string) => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [access, setAccess] = useState<AccessLevel>("view");
  const invite = useInviteFamily();
  const error = invite.error;
  const fieldErrors =
    fieldError(error, "email") ??
    fieldError(error, "relationship") ??
    fieldError(error, "access");
  return (
    <Card>
      <Txt tone="heading">Invite someone</Txt>
      {invite.isError && !fieldErrors ? <ErrorNotice error={error} /> : null}
      <Field
        label="Their email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        maxLength={AUTH_LIMITS.emailMax}
        error={fieldError(error, "email")}
      />
      <Select
        label="Who they are to you"
        value={relationship}
        onChange={setRelationship}
        options={relationshipOptions}
        error={fieldError(error, "relationship")}
      />
      <Txt tone="label">What they can do</Txt>
      {ACCESS_LEVELS.map((level) => (
        <Pressable
          key={level}
          onPress={() => setAccess(level)}
          accessibilityRole="radio"
          accessibilityState={{ checked: access === level }}
          style={{
            borderWidth: access === level ? 2 : 1,
            borderColor: access === level ? t.brand : t.edge,
            backgroundColor: access === level ? t.brandSoft : t.card,
            borderRadius: 12,
            padding: 12,
            gap: 2,
          }}
        >
          <Txt bold>{ACCESS_LABELS[level].name}</Txt>
          <Txt tone="small" muted>
            {ACCESS_LABELS[level].detail}
          </Txt>
        </Pressable>
      ))}
      <Txt tone="small" muted>
        They get an email with a link. To accept, they sign in (or sign up) with
        this same email.
      </Txt>
      <Buttons>
        <Button
          busy={invite.isPending}
          onPress={async () => {
            try {
              await invite.mutateAsync({
                email,
                relationship: relationship as FamilyRelationship,
                access,
              });
              onDone(email.trim());
            } catch {
              // Shown above
            }
          }}
        >
          {invite.isPending ? "Sending…" : "Send invitation"}
        </Button>
        <Button kind="secondary" onPress={onCancel}>
          Cancel
        </Button>
      </Buttons>
    </Card>
  );
}

function Profiles({ profiles }: { profiles: FamilyProfileInfo[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <Heading icon={Baby}>Family without email</Heading>
      <Txt tone="small" muted>
        For a child or a lolo without a phone or email. You keep their records
        in your account, and the people who can see your records see theirs too.
      </Txt>
      {profiles.length > 0 ? (
        <List>
          {profiles.map((p, i) => (
            <ProfileRow key={p.id} profile={p} first={i === 0} />
          ))}
        </List>
      ) : null}
      {adding ? (
        <ProfileForm
          title="Add a profile"
          submitLabel="Add profile"
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button kind="secondary" onPress={() => setAdding(true)}>
          Add a profile
        </Button>
      )}
    </View>
  );
}

function ProfileRow({
  profile,
  first,
}: {
  profile: FamilyProfileInfo;
  first: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveProfile();
  const name = fullName(profile);
  if (editing)
    return (
      <Rowish first={first}>
        <ProfileForm
          title={`Edit ${profile.firstName}`}
          submitLabel="Save"
          profile={profile}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Rowish>
    );
  return (
    <Rowish first={first}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        <Txt bold>{name}</Txt>
        <Badge>{relationshipLabel(profile.relationship)}</Badge>
      </View>
      <Txt tone="small" muted>
        {profile.birthDate
          ? `${ageFrom(profile.birthDate)} · born ${shortDate(profile.birthDate)}`
          : "Birthday not added"}
      </Txt>
      {confirming ? (
        <ConfirmBox
          message={`Remove ${profile.firstName}'s profile?`}
          confirmLabel="Yes, remove"
          busy={remove.isPending}
          onConfirm={() => remove.mutate(profile.id)}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <Buttons>
          <Button
            kind="link"
            small
            label={`Edit ${name}`}
            onPress={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            kind="link"
            small
            label={`Remove ${name}`}
            onPress={() => setConfirming(true)}
          >
            Remove
          </Button>
        </Buttons>
      )}
      <ErrorNotice error={remove.error} />
    </Rowish>
  );
}

function ProfileForm({
  title,
  submitLabel,
  profile,
  onDone,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  profile?: FamilyProfileInfo;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [middleName, setMiddleName] = useState(profile?.middleName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [relationship, setRelationship] = useState<string>(
    profile?.relationship ?? "",
  );
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? "");
  const add = useAddProfile();
  const update = useUpdateProfile();
  const save = profile ? update : add;
  const error = save.error;
  const hasFieldError = [
    "firstName",
    "middleName",
    "lastName",
    "relationship",
    "birthDate",
  ].some((f) => fieldError(error, f));
  return (
    <Card>
      <Txt tone="heading">{title}</Txt>
      {save.isError && !hasFieldError ? <ErrorNotice error={error} /> : null}
      <Field
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        maxLength={AUTH_LIMITS.nameMax}
        error={fieldError(error, "firstName")}
      />
      <Field
        label="Middle name (optional)"
        value={middleName}
        onChangeText={setMiddleName}
        maxLength={AUTH_LIMITS.nameMax}
        error={fieldError(error, "middleName")}
      />
      <Field
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        maxLength={AUTH_LIMITS.nameMax}
        error={fieldError(error, "lastName")}
      />
      <Select
        label="Who they are to you"
        value={relationship}
        onChange={setRelationship}
        options={relationshipOptions}
        error={fieldError(error, "relationship")}
      />
      <DateField
        label="Birthday (optional)"
        value={birthDate}
        onChange={setBirthDate}
        optional
        maximumToday
        error={fieldError(error, "birthDate")}
      />
      <Buttons>
        <Button
          busy={save.isPending}
          onPress={async () => {
            const fields = {
              firstName,
              middleName,
              lastName,
              relationship: relationship as FamilyRelationship,
              birthDate,
            };
            try {
              if (profile) await update.mutateAsync({ id: profile.id, fields });
              else await add.mutateAsync(fields);
              onDone();
            } catch {
              // Shown above
            }
          }}
        >
          {save.isPending ? "Saving…" : submitLabel}
        </Button>
        <Button kind="secondary" onPress={onCancel}>
          Cancel
        </Button>
      </Buttons>
    </Card>
  );
}

function SharedWithMe({ shared }: { shared: SharedWithMeInfo[] }) {
  return (
    <View style={{ gap: 10 }}>
      <Heading icon={Eye}>Records shared with me</Heading>
      {shared.length === 0 ? (
        <Txt muted>
          Nobody has shared their records with you yet. When someone invites
          you, the email has a link to accept.
        </Txt>
      ) : (
        <List>
          {shared.map((o, i) => (
            <SharedRow key={o.ownerId} owner={o} first={i === 0} />
          ))}
        </List>
      )}
    </View>
  );
}

function SharedRow({
  owner,
  first,
}: {
  owner: SharedWithMeInfo;
  first: boolean;
}) {
  const leave = useLeaveShared();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(owner);
  return (
    <Rowish first={first}>
      <Txt bold>{name}</Txt>
      <Txt tone="small" muted>
        {owner.email}
      </Txt>
      <Txt tone="small">
        You're their {relationshipLabel(owner.relationship)} ·{" "}
        <Txt tone="small" bold>
          {ACCESS_LABELS[owner.access].name}
        </Txt>
      </Txt>
      {owner.profiles.length > 0 ? (
        <Txt tone="small" muted>
          Also keeps:{" "}
          {owner.profiles
            .map((p) => `${p.firstName} (${relationshipLabel(p.relationship)})`)
            .join(", ")}
        </Txt>
      ) : null}
      <ErrorNotice error={leave.error} />
      {confirming ? (
        <ConfirmBox
          message={`Stop seeing ${owner.firstName}'s records?`}
          confirmLabel="Yes, stop"
          busy={leave.isPending}
          onConfirm={() => leave.mutate(owner.ownerId)}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <Button
          kind="link"
          small
          label={`Stop seeing ${name}'s records`}
          onPress={() => setConfirming(true)}
        >
          Stop seeing
        </Button>
      )}
    </Rowish>
  );
}
