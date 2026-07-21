import "server-only";

/** Base class for "the request itself was invalid" errors across AI services, so route handlers can catch them generically. */
export class InvalidAiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiRequestError";
  }
}
