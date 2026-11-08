import { Labels } from "../application/place/Labels.js";
import { randomLabelCode } from "../application/place/labelCodes.js";
import { PlacePhotos } from "../application/place/PlacePhotos.js";
import { Places } from "../application/place/Places.js";
import type { RecordAccess } from "../application/record/RecordAccess.js";
import { labelsRoutes } from "../presentation/http/routes/labelsRoutes.js";
import { placesRoutes } from "../presentation/http/routes/placesRoutes.js";
import type { AppContext } from "./context.js";

// Places where paper records are kept, their photos and QR labels. Who may do
// what is the same as for the account's records.
export function placesModule(
  { options, repos, limits, audit, requireAuth }: AppContext,
  access: RecordAccess,
) {
  const { clock, fileStorage } = options;
  const makeCode = options.makeLabelCode ?? randomLabelCode;
  const places = new Places(
    repos.places,
    repos.labels,
    access,
    audit,
    clock,
    makeCode,
    fileStorage,
  );
  const photos = new PlacePhotos(
    places,
    repos.places,
    access,
    fileStorage,
    audit,
    clock,
  );
  const labels = new Labels(
    repos.labels,
    places,
    access,
    audit,
    clock,
    makeCode,
  );
  const routers = [
    placesRoutes({ places, photos, requireAuth, limit: limits.records }),
    labelsRoutes({ labels, places, requireAuth, limit: limits.records }),
  ];
  return { routers };
}
