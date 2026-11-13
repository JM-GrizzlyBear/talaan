import { shortDate } from "@talaan/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, Screen, Txt } from "../src/ui/kit";
import { TalaanMark } from "../src/ui/TalaanMark";

// After suspending or deleting the account
export default function Goodbye() {
  const router = useRouter();
  const { deleted, until } = useLocalSearchParams<{
    deleted?: string;
    until?: string;
  }>();
  return (
    <Screen>
      <TalaanMark size={48} />
      <Txt tone="title">
        {deleted ? "Your account is deleted" : "Your account is suspended"}
      </Txt>
      <Card>
        <Txt>
          {deleted
            ? "Everything in it is gone for good: records, photos, places, reminders and doctor links. Thank you for using Talaan."
            : `Nobody can see your records now. Sign in before ${until ? shortDate(until) : "a year from now"} to bring everything back; after that, it's deleted for good.`}
        </Txt>
      </Card>
      <Button kind="secondary" onPress={() => router.replace("/sign-in")}>
        {deleted ? "Back to sign in" : "Sign in again"}
      </Button>
    </Screen>
  );
}
