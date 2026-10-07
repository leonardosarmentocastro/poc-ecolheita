/** Raised when a data lookup finds no matching record; the error handler maps it to 404. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
