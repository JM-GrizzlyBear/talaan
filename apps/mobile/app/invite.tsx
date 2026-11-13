import {
  ApiError,
  shortDate,
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitationPreview,
} from "@talaan/client";
import {
  ACCESS_FOR_INVITEE,
  ACCESS_LABELS,
  relationshipLabel,
} from "@talaan/shared";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MailOpen } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useSession } from "../src/auth/SessionProvider";
import { tokenFromLink } from "../src/family/inviteLink";
import { useTheme } from "../src/theme/ThemeProvider";
import { ConfirmBox, Field } from "../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../src/ui/kit";

// A family invitation, in the app: paste the link from the email, then
// Accept or Decline here (the website's invitation page)
export default function Invite() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [link, setLink] = useState("");
  const [token, setToken] = useState<string | null>(
    params.token ? tokenFromLink(params.token) : null,
  );
  const [problem, setProblem] = useState<string | null>(null);

  const use = (text: string) => {
    const found = tokenFromLink(text);
    if (!found) {
      setProblem(
        "That isn't an invitation link. Copy the whole link from the email.",
      );
      return;
    }
    setProblem(null);
    setToken(found);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Invitation" }} />
      {token ? (
        <Invitation token={token} onOther={() => setToken(null)} />
      ) : (
        <>
          <Txt muted>
            Got an email saying someone invited you to Talaan? Copy the link in
            it (press and hold the button or link, then Copy link) and paste it
            here.
          </Txt>
          <Field
            label="Invitation link"
            value={link}
            onChangeText={setLink}
            placeholder="https://…/invite/…"
            autoCapitalize="none"
            autoCorrect={false}
            error={problem ?? undefined}
          />
          <Buttons>
            <Button onPress={() => use(link)}>Open the invitation</Button>
            <Button
              kind="secondary"
              onPress={async () => {
                const copied = await Clipboard.getStringAsync();
                setLink(copied);
                use(copied);
              }}
            >
              Paste the copied link
            </Button>
          </Buttons>
        </>
      )}
    </Screen>
  );
}

function Invitation({
  token,
  onOther,
}: {
  token: string;
  onOther: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const { user } = useSession();
  const preview = useInvitationPreview(token, user?.id ?? null);
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const [confirmDecline, setConfirmDecline] = useState(false);

  if (preview.isPending) return <Loading />;
  if (preview.isError) {
    const unknown =
      preview.error instanceof ApiError &&
      (preview.error.status === 404 || preview.error.status === 400);
    return (
      <>
        {unknown ? (
          <Notice tone="error">
            That invitation link doesn&apos;t work. It may be incomplete, or a
            newer invitation replaced it. Ask the person who invited you to send
            it again.
          </Notice>
        ) : (
          <ErrorNotice error={preview.error} />
        )}
        <Button kind="secondary" onPress={onOther}>
          Try another link
        </Button>
      </>
    );
  }

  const invite = preview.data;
  const inviter = invite.inviterName;
  const toFamily = () => router.replace("/family");

  if (accept.isSuccess) {
    return (
      <>
        <Notice tone="success">
          You can now see {inviter}&apos;s records. Pick {inviter} at the top of
          Records.
        </Notice>
        <Button onPress={toFamily}>Go to Family</Button>
      </>
    );
  }
  if (decline.isSuccess) {
    return (
      <>
        <Notice>
          You declined {inviter}&apos;s invitation. They&apos;ll see it was
          declined.
        </Notice>
        <Button onPress={toFamily}>Go to Family</Button>
      </>
    );
  }
  if (invite.status !== "pending") {
    const why =
      invite.status === "accepted"
        ? "This invitation was already accepted."
        : invite.status === "declined"
          ? "This invitation was declined."
          : invite.status === "expired"
            ? `This invitation ended. Ask ${inviter} to send it again.`
            : `${inviter} cancelled this invitation.`;
    return (
      <>
        <Notice>{why}</Notice>
        <Button onPress={toFamily}>Go to Family</Button>
      </>
    );
  }

  const access = ACCESS_LABELS[invite.access];
  return (
    <>
      <Card>
        <View
          style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
        >
          <MailOpen size={28} color={t.brand} />
          <Txt style={{ flex: 1 }}>
            <Txt bold>{inviter}</Txt> wants to share their health records with
            you, as their{" "}
            <Txt bold>{relationshipLabel(invite.relationship)}</Txt>.
          </Txt>
        </View>
        <Txt>
          <Txt bold>{access.name}.</Txt> {ACCESS_FOR_INVITEE[invite.access]}
        </Txt>
        <Txt tone="small" muted>
          For {invite.email} · until {shortDate(invite.expiresAt)}
        </Txt>
      </Card>
      <ErrorNotice error={accept.error ?? decline.error} />
      {invite.forThisAccount === false ? (
        <Notice tone="error">
          {`You're signed in with a different email. This invitation is for ${invite.email}: sign out (Security), then sign in with that email.`}
        </Notice>
      ) : null}
      {confirmDecline ? (
        <ConfirmBox
          message={`Decline ${inviter}'s invitation?`}
          confirmLabel="Yes, decline"
          cancelLabel="Go back"
          busy={decline.isPending}
          onConfirm={() => decline.mutate(token)}
          onCancel={() => setConfirmDecline(false)}
        />
      ) : (
        <Buttons>
          {invite.forThisAccount !== false ? (
            <Button
              busy={accept.isPending}
              onPress={() => accept.mutate(token)}
            >
              Accept
            </Button>
          ) : null}
          <Button kind="secondary" onPress={() => setConfirmDecline(true)}>
            Decline
          </Button>
        </Buttons>
      )}
    </>
  );
}
