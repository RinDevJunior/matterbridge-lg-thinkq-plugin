import { AnsiLogger } from 'matterbridge/logger';

import { AuthenticationError } from '../../errors/index.js';
import { ThinqSession } from '../thinq/session.js';
import { ThinqApiClient } from '../thinq/thinqApiClient.js';
import type { ThinqAuthContext, ThinqUserData } from './AuthContext.js';
import type { IAuthStrategy } from './IAuthStrategy.js';

/**
 * Refresh-token authentication strategy. Skips the 5-call EMP login chain entirely and exchanges a
 * pre-obtained `refresh_token` directly for an access token (`Auth.refreshNewToken`, `Auth.ts:347-391`).
 */
export class TokenAuthStrategy implements IAuthStrategy {
	constructor(
		private readonly apiClient: ThinqApiClient,
		private readonly logger: AnsiLogger,
	) {}

	public async authenticate(context: ThinqAuthContext): Promise<ThinqUserData | undefined> {
		if (!context.refreshToken) {
			throw new AuthenticationError('A ThinQ refresh token is required for token-based authentication.');
		}

		this.logger.notice('Authenticating with LG ThinQ refresh token...');

		await this.apiClient.getGateway();

		const session = new ThinqSession('', context.refreshToken, 0);
		const refreshed = await this.apiClient.refreshToken(session);

		return {
			accessToken: refreshed.accessToken,
			refreshToken: refreshed.refreshToken,
			expiresAtEpochSeconds: refreshed.expiresAtEpochSeconds,
			country: context.country,
			language: context.language,
		};
	}
}
