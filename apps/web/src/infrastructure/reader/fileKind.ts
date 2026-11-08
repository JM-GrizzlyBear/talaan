// The name helps: some phones send photos with no type
export const isPdf = (file: Blob, name: string) =>
  file.type === "application/pdf" || /\.pdf$/i.test(name);

export const isPhoto = (file: Blob, name: string) =>
  file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(name);
