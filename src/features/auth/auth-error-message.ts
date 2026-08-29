import { isAuthError } from './auth.errors';

/** Turns any thrown value into a translation key.
 *
 *  Kept out of the components so every screen reports a failure the same way,
 *  and so an unrecognised throw degrades to "something went wrong" rather than
 *  leaking an English exception message into an Arabic interface. */
export function authErrorKey(error: unknown): string {
  return isAuthError(error) ? error.messageKey : 'auth.errors.unexpected';
}
