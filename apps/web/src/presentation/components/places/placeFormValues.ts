import type { PlaceKind } from "@talaan/shared";

// The place form's boxes
export interface PlaceFormValues {
  kind: PlaceKind | "";
  name: string;
  note: string;
  // "" when not inside another place
  parentId: string;
}

export const emptyPlace = (parentId = ""): PlaceFormValues => ({
  kind: "",
  name: "",
  note: "",
  parentId,
});
