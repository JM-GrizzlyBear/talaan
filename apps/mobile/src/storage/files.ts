import { Directory, File, Paths } from "expo-file-system";

// The offline copies (already encrypted) as files in the app's own folder
const folder = () => new Directory(Paths.document, "offline");
const fileFor = (name: string) =>
  new File(folder(), `${name.replace(/[^\w-]/g, "_")}.sealed`);

export const files = {
  async read(name: string) {
    const file = fileFor(name);
    return file.exists ? await file.text() : null;
  },
  async write(name: string, text: string) {
    const dir = folder();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    fileFor(name).write(text);
  },
  async clear() {
    const dir = folder();
    if (dir.exists) dir.delete();
  },
};
