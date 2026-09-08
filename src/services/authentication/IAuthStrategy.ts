import type { ThinqAuthContext, ThinqUserData } from './AuthContext.js';

/** Strategy interface for different ThinQ authentication methods. */
export interface IAuthStrategy {
	/**
	 * Authenticate user with the provided context.
	 * @returns ThinqUserData if authentication succeeds, undefined if further action required.
	 */
	authenticate(context: ThinqAuthContext): Promise<ThinqUserData | undefined>;
}
