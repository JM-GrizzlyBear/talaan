// Something the signed-in person asked for doesn't exist (or isn't theirs)
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
