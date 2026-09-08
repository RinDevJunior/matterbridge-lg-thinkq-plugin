import { BaseError } from './BaseError.js';

/** Base error for ThinQ authentication failures. */
export class AuthenticationError extends BaseError {
	constructor(message: string, metadata?: Record<string, unknown>) {
		super(message, 'THINQ_AUTH_ERROR', 401, metadata);
	}
}

/** Invalid ThinQ username or password. */
export class InvalidCredentialsError extends AuthenticationError {
	constructor(username?: string) {
		super('Invalid LG ThinQ username or password. Please check your credentials.', {
			reason: 'INVALID_CREDENTIALS',
			username,
		});
	}
}

/** ThinQ access token has expired and could not be refreshed. */
export class TokenExpiredError extends AuthenticationError {
	constructor() {
		super('LG ThinQ authentication token has expired. Please log in again.', {
			reason: 'TOKEN_EXPIRED',
		});
	}
}

/** LG requires a manual action (e.g. accepting new terms, or completing a third-party SSO login) before continuing. */
export class ManualProcessNeededError extends BaseError {
	constructor(
		message = 'LG ThinQ requires a manual process (e.g. accepting new terms in the native LG app) before continuing.',
		metadata?: Record<string, unknown>,
	) {
		super(message, 'MANUAL_PROCESS_NEEDED', 428, metadata);
	}
}
