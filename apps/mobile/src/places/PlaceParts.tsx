import { labelUrl, placePhotoUrl, placeTree, shownCode } from "@talaan/client";
import { apiAddress } from "@talaan/client";
import {
  PLACE_KIND_LABELS,
  PLACE_KINDS,
  type PlaceInfo,
  type PlaceKind,
  type PlaceSummary,
} from "@talaan/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Archive,
  Briefcase,
  ChevronRight,
  FileText,
  Folder,
  Library,
  type LucideIcon,
  Mail,
  MapPin,
  Package,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, List, Txt } from "../ui/kit";
import { QrCode } from "../ui/QrCode";

export const PLACE_ICONS: Record<PlaceKind, LucideIcon> = {
  folder: Folder,
  envelope: Mail,
  box: Package,
  drawer: Archive,
  cabinet: Library,
  bag: Briefcase,
  other: MapPin,
};

export const placePhoto = (
  place: Pick<PlaceSummary, "id" | "updatedAt">,
  variant: "thumb" | "preview" | "original",
) => apiAddress(placePhotoUrl(place.id, variant, place.updatedAt));

function contentsText(place: PlaceSummary) {
  const parts = [];
  if (place.recordCount > 0)
    parts.push(
      `${place.recordCount} ${place.recordCount === 1 ? "record" : "records"}`,
    );
  if (place.placeCount > 0)
    parts.push(
      `${place.placeCount} ${place.placeCount === 1 ? "place" : "places"} inside`,
    );
  return parts.join(", ") || "Empty";
}

// Every place, each followed by what's inside it (indented)
export function PlaceList({
  places,
  flat = false,
}: {
  places: PlaceSummary[];
  flat?: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const rows = flat
    ? places.map((place) => ({ place, depth: 0 }))
    : placeTree(places);
  return (
    <List>
      {rows.map(({ place, depth }, i) => {
        const Icon = PLACE_ICONS[place.kind];
        return (
          <Pressable
            key={place.id}
            onPress={() => router.push(`/places/${place.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${place.name}, ${PLACE_KIND_LABELS[place.kind]}`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 10,
              paddingRight: 12,
              paddingLeft: 12 + depth * 22,
              borderTopWidth: i === 0 ? 0 : 1,
              borderColor: t.edge,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {place.hasPhoto ? (
              <Image
                source={placePhoto(place, "thumb")}
                style={{ width: 44, height: 44, borderRadius: 8 }}
                cachePolicy="disk"
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: t.brandSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={22} color={t.deep} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold>{place.name}</Txt>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  flexWrap: "wrap",
                }}
              >
                <Txt tone="small" muted>
                  {PLACE_KIND_LABELS[place.kind]} ·
                </Txt>
                <FileText size={12} color={t.muted} />
                <Txt tone="small" muted>
                  {contentsText(place)} · {shownCode(place.code)}
                </Txt>
              </View>
            </View>
            <ChevronRight size={18} color={t.muted} />
          </Pressable>
        );
      })}
    </List>
  );
}

// The place's QR label, as it prints
export function LabelPreview({ place }: { place: PlaceInfo }) {
  return (
    <Card>
      <Txt tone="heading">QR label</Txt>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <QrCode
          text={labelUrl(place.code)}
          size={110}
          label={`QR label for ${place.name}`}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt bold style={{ letterSpacing: 2, fontSize: 18 }}>
            {shownCode(place.code)}
          </Txt>
          <Txt tone="small" muted>
            Stick it on {place.name}. Scanning it with Talaan (Home › Scan a QR
            label) or a phone camera opens this place.
          </Txt>
        </View>
      </View>
    </Card>
  );
}

export function KindPicker({
  value,
  onChange,
  error,
}: {
  value: PlaceKind | "";
  onChange: (kind: PlaceKind) => void;
  error?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      <Txt tone="label">What is it?</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PLACE_KINDS.map((kind) => {
          const Icon = PLACE_ICONS[kind];
          const on = value === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => onChange(kind)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{
                width: "48%",
                flexGrow: 1,
                minHeight: 54,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: on ? 2 : 1,
                borderColor: on ? t.brand : t.edge,
                backgroundColor: on ? t.brandSoft : t.card,
              }}
            >
              <Icon size={20} color={t.brand} />
              <Txt tone="label" color={on ? t.deep : t.ink}>
                {PLACE_KIND_LABELS[kind]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Txt tone="small" color={t.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}
