// Something the reader can't do, said in a way people can act on
export class ReaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReaderError";
  }
}
