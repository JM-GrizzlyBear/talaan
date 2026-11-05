import {
  ACCESS_LABELS,
  ACCESS_LEVELS,
  AUTH_LIMITS,
  FAMILY_RELATIONSHIPS,
  fullName,
  relationshipLabel,
  type AccessLevel,
  type FamilyMemberInfo,
  type FamilyProfileInfo,
  type FamilyRelationship,
  type SentInvitationInfo,
  type SharedWithMeInfo,
} from "@talaan/shared";
import { Baby, Eye, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
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
} from "../../application/family/useFamily";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { SelectField } from "../components/ui/SelectField";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { ageFrom } from "../format/age";
import { shortDate } from "../format/dates";
import { errorMessage, fieldError } from "../format/errorMessage";

const linkButton =
  "cursor-pointer text-sm font-semibold text-brand underline disabled:cursor-wait disabled:opacity-70";
const dangerLink =
  "cursor-pointer text-sm font-semibold text-danger underline disabled:cursor-wait disabled:opacity-70";
const card =
  "flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white";

const relationshipOptions = FAMILY_RELATIONSHIPS.map((r) => ({
  value: r,
  label: r === "Other" ? "Other family" : r,
}));

export function FamilyPage() {
  const family = useFamily();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Family</h1>
        <p className="text-muted">
          Share your records one way: the people you invite see yours, and you
          see theirs only if they invite you too.
        </p>
      </div>
      {family.isPending && (
        <p role="status" className="text-muted">
          Loading…
        </p>
      )}
      {family.isError && <ErrorAlert message={errorMessage(family.error)} />}
      {family.data && (
        <>
          <MembersSection
            members={family.data.members}
            invitations={family.data.invitations}
          />
          <ProfilesSection profiles={family.data.profiles} />
          <SharedWithMeSection shared={family.data.sharedWithMe} />
        </>
      )}
    </main>
  );
}

function SectionHeading({
  id,
  icon,
  children,
}: {
  id: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-bold">
      <span aria-hidden="true" className="text-brand">
        {icon}
      </span>
      {children}
    </h2>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-deep">
      {children}
    </span>
  );
}

// Who can see my records, and invitations still waiting

function MembersSection({
  members,
  invitations,
}: {
  members: FamilyMemberInfo[];
  invitations: SentInvitationInfo[];
}) {
  const [inviting, setInviting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-3">
      <SectionHeading id="members-heading" icon={<Users className="size-5" />}>
        Who can see my records
      </SectionHeading>

      {members.length === 0 && invitations.length === 0 && !inviting && (
        <p className="text-sm text-muted">
          Nobody yet. Invite a family member by email; they accept or decline.
        </p>
      )}
      {members.length > 0 && (
        <ul className={card}>
          {members.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </ul>
      )}
      {invitations.length > 0 && (
        <>
          <h3 className="mt-2 text-sm font-bold">Invitations</h3>
          <ul className={card}>
            {invitations.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </ul>
        </>
      )}

      {sentTo && !inviting && (
        <Notice>Invitation sent to {sentTo}. It works for 7 days.</Notice>
      )}
      {inviting ? (
        <InviteForm
          onDone={(email) => {
            setInviting(false);
            setSentTo(email);
          }}
          onCancel={() => setInviting(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setInviting(true);
          }}
          className={`${buttonSecondary} self-start`}
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Invite someone
        </button>
      )}
    </section>
  );
}

function MemberRow({ member }: { member: FamilyMemberInfo }) {
  const change = useChangeMemberAccess();
  const remove = useRemoveMember();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(member);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong className="flex flex-wrap items-center gap-2">
            {name} <Badge>{relationshipLabel(member.relationship)}</Badge>
          </strong>
          <span className="truncate text-sm text-muted">{member.email}</span>
        </span>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">What {name} can do</span>
          <select
            value={member.access}
            disabled={change.isPending}
            onChange={(event) =>
              change.mutate({
                userId: member.userId,
                access: event.target.value as AccessLevel,
              })
            }
            className="h-10 cursor-pointer rounded-lg border border-edge bg-white px-2 font-semibold"
          >
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACCESS_LABELS[level].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(change.isError || remove.isError) && (
        <ErrorAlert message={errorMessage(change.error ?? remove.error)} />
      )}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Stop sharing your records with {member.firstName}?</span>
          <button
            type="button"
            onClick={() => remove.mutate(member.userId)}
            disabled={remove.isPending}
            className={dangerLink}
          >
            Yes, stop sharing
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={linkButton}
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Remove ${name}`}
          className={`${linkButton} self-start`}
        >
          Remove
        </button>
      )}
    </li>
  );
}

const STATUS_TEXT = {
  pending: (i: SentInvitationInfo) =>
    `Waiting · until ${shortDate(i.expiresAt)}`,
  expired: () => "Expired",
  declined: () => "Declined",
};

function InvitationRow({ invitation }: { invitation: SentInvitationInfo }) {
  const resend = useResendInvitation();
  const cancel = useCancelInvitation();
  const waiting = invitation.status === "pending";

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong className="flex flex-wrap items-center gap-2 break-all">
            {invitation.email}{" "}
            <Badge>{relationshipLabel(invitation.relationship)}</Badge>
          </strong>
          <span className="text-sm text-muted">
            {ACCESS_LABELS[invitation.access].name} ·{" "}
            <span className={waiting ? "" : "font-semibold text-danger"}>
              {STATUS_TEXT[invitation.status](invitation)}
            </span>
          </span>
        </span>
        <span className="flex gap-4">
          <button
            type="button"
            onClick={() => resend.mutate(invitation.id)}
            disabled={resend.isPending}
            className={linkButton}
          >
            {resend.isPending ? "Sending…" : "Send again"}
          </button>
          <button
            type="button"
            onClick={() => cancel.mutate(invitation.id)}
            disabled={cancel.isPending}
            aria-label={`${waiting ? "Cancel" : "Clear"} the invitation to ${invitation.email}`}
            className={linkButton}
          >
            {waiting ? "Cancel" : "Clear"}
          </button>
        </span>
      </div>
      {resend.isSuccess && <Notice>Sent again with a new link.</Notice>}
      {(resend.isError || cancel.isError) && (
        <ErrorAlert message={errorMessage(resend.error ?? cancel.error)} />
      )}
    </li>
  );
}

function InviteForm({
  onDone,
  onCancel,
}: {
  onDone: (email: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [access, setAccess] = useState<AccessLevel>("view");
  const invite = useInviteFamily();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await invite.mutateAsync({
        email,
        relationship: relationship as FamilyRelationship,
        access,
      });
      onDone(email.trim());
    } catch {
      // Shown below from invite.error
    }
  }

  const error = invite.error;
  const fieldErrors =
    fieldError(error, "email") ??
    fieldError(error, "relationship") ??
    fieldError(error, "access");
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4"
    >
      <h3 className="font-bold">Invite someone</h3>
      {invite.isError && !fieldErrors && (
        <ErrorAlert message={errorMessage(error)} />
      )}
      <TextField
        label="Their email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="off"
        maxLength={AUTH_LIMITS.emailMax}
        autoFocus
        error={fieldError(error, "email")}
      />
      <SelectField
        label="Who they are to you"
        value={relationship}
        onChange={setRelationship}
        options={relationshipOptions}
        placeholder="Choose…"
        error={fieldError(error, "relationship")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">
          What they can do
        </legend>
        {ACCESS_LEVELS.map((level) => (
          <label
            key={level}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
              access === level ? "border-brand bg-brand-soft" : "border-edge"
            }`}
          >
            <input
              type="radio"
              name="access"
              value={level}
              checked={access === level}
              onChange={() => setAccess(level)}
              className="mt-1 size-4 cursor-pointer accent-brand"
            />
            <span className="flex flex-col">
              <strong>{ACCESS_LABELS[level].name}</strong>
              <span className="text-sm text-muted">
                {ACCESS_LABELS[level].detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-muted">
        They get an email with a link. To accept, they sign in (or sign up) with
        this same email.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={invite.isPending}
          className={buttonPrimary}
        >
          {invite.isPending ? "Sending…" : "Send invitation"}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Profiles for family without email

function ProfilesSection({ profiles }: { profiles: FamilyProfileInfo[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section aria-labelledby="profiles-heading" className="flex flex-col gap-3">
      <SectionHeading id="profiles-heading" icon={<Baby className="size-5" />}>
        Family without email
      </SectionHeading>
      <p className="text-sm text-muted">
        For a child or a lolo without a phone or email. You keep their records
        in your account, and the people who can see your records see theirs too.
      </p>
      {profiles.length > 0 && (
        <ul className={card}>
          {profiles.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} />
          ))}
        </ul>
      )}
      {adding ? (
        <ProfileForm
          title="Add a profile"
          submitLabel="Add profile"
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${buttonSecondary} self-start`}
        >
          Add a profile
        </button>
      )}
    </section>
  );
}

function ProfileRow({ profile }: { profile: FamilyProfileInfo }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveProfile();
  const name = fullName(profile);

  if (editing) {
    return (
      <li className="p-3">
        <ProfileForm
          title={`Edit ${profile.firstName}`}
          submitLabel="Save"
          profile={profile}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong className="flex flex-wrap items-center gap-2">
            {name} <Badge>{relationshipLabel(profile.relationship)}</Badge>
          </strong>
          <span className="text-sm text-muted">
            {profile.birthDate
              ? `${ageFrom(profile.birthDate)} · born ${shortDate(profile.birthDate)}`
              : "Birthday not added"}
          </span>
        </span>
        {!confirming && (
          <span className="flex gap-4">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${name}`}
              className={linkButton}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${name}`}
              className={linkButton}
            >
              Remove
            </button>
          </span>
        )}
      </div>
      {confirming && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Remove {profile.firstName}'s profile?</span>
          <button
            type="button"
            onClick={() => remove.mutate(profile.id)}
            disabled={remove.isPending}
            className={dangerLink}
          >
            Yes, remove
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={linkButton}
          >
            Keep
          </button>
        </div>
      )}
      {remove.isError && <ErrorAlert message={errorMessage(remove.error)} />}
    </li>
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      // Shown below from save.error
    }
  }

  const error = save.error;
  const fields = [
    "firstName",
    "middleName",
    "lastName",
    "relationship",
    "birthDate",
  ];
  const hasFieldError = fields.some((f) => fieldError(error, f));
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4"
    >
      <h3 className="font-bold">{title}</h3>
      {save.isError && !hasFieldError && (
        <ErrorAlert message={errorMessage(error)} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          value={firstName}
          onChange={setFirstName}
          maxLength={AUTH_LIMITS.nameMax}
          autoFocus
          error={fieldError(error, "firstName")}
        />
        <TextField
          label="Middle name (optional)"
          value={middleName}
          onChange={setMiddleName}
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "middleName")}
        />
        <TextField
          label="Last name"
          value={lastName}
          onChange={setLastName}
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "lastName")}
        />
        <SelectField
          label="Who they are to you"
          value={relationship}
          onChange={setRelationship}
          options={relationshipOptions}
          placeholder="Choose…"
          error={fieldError(error, "relationship")}
        />
        <TextField
          label="Birthday (optional)"
          type="date"
          value={birthDate}
          onChange={setBirthDate}
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          error={fieldError(error, "birthDate")}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className={buttonPrimary}
        >
          {save.isPending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Records other people shared with me

function SharedWithMeSection({ shared }: { shared: SharedWithMeInfo[] }) {
  return (
    <section aria-labelledby="shared-heading" className="flex flex-col gap-3">
      <SectionHeading id="shared-heading" icon={<Eye className="size-5" />}>
        Records shared with me
      </SectionHeading>
      {shared.length === 0 ? (
        <p className="text-sm text-muted">
          Nobody has shared their records with you yet. When someone invites
          you, the email has a link to accept.
        </p>
      ) : (
        <ul className={card}>
          {shared.map((owner) => (
            <SharedRow key={owner.ownerId} owner={owner} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SharedRow({ owner }: { owner: SharedWithMeInfo }) {
  const leave = useLeaveShared();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(owner);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <span className="flex min-w-0 flex-col">
        <strong>{name}</strong>
        <span className="truncate text-sm text-muted">{owner.email}</span>
        <span className="text-sm">
          You're their {relationshipLabel(owner.relationship)} ·{" "}
          <strong>{ACCESS_LABELS[owner.access].name}</strong>
        </span>
        {owner.profiles.length > 0 && (
          <span className="text-sm text-muted">
            Also keeps:{" "}
            {owner.profiles
              .map(
                (p) => `${p.firstName} (${relationshipLabel(p.relationship)})`,
              )
              .join(", ")}
          </span>
        )}
      </span>
      {leave.isError && <ErrorAlert message={errorMessage(leave.error)} />}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Stop seeing {owner.firstName}'s records?</span>
          <button
            type="button"
            onClick={() => leave.mutate(owner.ownerId)}
            disabled={leave.isPending}
            className={dangerLink}
          >
            Yes, stop
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={linkButton}
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Stop seeing ${name}'s records`}
          className={`${linkButton} self-start`}
        >
          Stop seeing
        </button>
      )}
    </li>
  );
}
