import type {
  BlankLabelInfo,
  FileVariant,
  LabelInfo,
  PlaceFieldsInput,
  PlaceInfo,
  PlaceListInfo,
  UploadTarget,
} from "@talaan/shared";
import { request } from "./http";
import { sendToStorage, type UploadFile } from "./upload";

const at = (id: string) => `/api/places/${encodeURIComponent(id)}`;

export async function fetchPlaces(ownerId: string) {
  return await request<PlaceListInfo>(
    `/api/places?ownerId=${encodeURIComponent(ownerId)}`,
  );
}

export async function fetchPlace(id: string) {
  return (await request<{ place: PlaceInfo }>(at(id))).place;
}

export async function createPlace(ownerId: string, fields: PlaceFieldsInput) {
  const data = await request<{ place: PlaceInfo }>("/api/places", "POST", {
    ownerId,
    ...fields,
  });
  return data.place;
}

export async function updatePlace(id: string, fields: PlaceFieldsInput) {
  return (await request<{ place: PlaceInfo }>(at(id), "PUT", fields)).place;
}

export async function removePlace(id: string) {
  await request<void>(at(id), "DELETE");
}

// Where to send it, sending it, then the API checks it and keeps it
export async function uploadPlacePhoto(
  id: string,
  file: UploadFile,
  onProgress: (fraction: number) => void,
) {
  const { target } = await request<{ target: UploadTarget }>(
    `${at(id)}/photo/upload-target`,
    "POST",
  );
  const upload = await sendToStorage(target, file, onProgress);
  const data = await request<{ place: PlaceInfo }>(`${at(id)}/photo`, "POST", {
    upload,
  });
  return data.place;
}

export async function removePlacePhoto(id: string) {
  await request<void>(`${at(id)}/photo`, "DELETE");
}

// Always through the API, which checks who's asking. `version` (the place's
// updatedAt) makes the browser fetch a new photo after it changes.
export function placePhotoUrl(
  id: string,
  variant: FileVariant,
  version: string,
) {
  return `${at(id)}/photo?${new URLSearchParams({ variant, v: version })}`;
}

const label = (code: string) => `/api/labels/${encodeURIComponent(code)}`;

export async function fetchLabel(code: string) {
  return (await request<{ label: LabelInfo }>(label(code))).label;
}

// The first scan of a blank label: what it's stuck on
export async function nameLabel(code: string, fields: PlaceFieldsInput) {
  const data = await request<{ place: PlaceInfo }>(
    `${label(code)}/place`,
    "POST",
    fields,
  );
  return data.place;
}

export async function fetchBlankLabels(ownerId: string) {
  const data = await request<{ labels: BlankLabelInfo[] }>(
    `/api/labels/blank?ownerId=${encodeURIComponent(ownerId)}`,
  );
  return data.labels;
}

export async function createBlankLabels(ownerId: string, count: number) {
  const data = await request<{ codes: string[] }>("/api/labels/blank", "POST", {
    ownerId,
    count,
  });
  return data.codes;
}
