import { LocalRepository } from "./localRepository";

/**
 * The single place the app chooses its persistence implementation.
 * Swap `new LocalRepository()` for a backend-backed repository later.
 */
export const repository = new LocalRepository();
