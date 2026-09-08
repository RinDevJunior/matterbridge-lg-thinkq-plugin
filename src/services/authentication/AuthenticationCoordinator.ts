import { AnsiLogger } from 'matterbridge/logger';

import type { ThinqApiClient } from '../thinq/thinqApiClient.js';
import { AccountAuthStrategy } from './AccountAuthStrategy.js';
import type { ThinqAuthContext, ThinqUserData } from './AuthContext.js';
import type { IAuthStrategy } from './IAuthStrategy.js';
import { TokenAuthStrategy } from './TokenAuthStrategy.js';

export type ThinqAuthMethod = 'account' | 'token';

/**
 * Coordinates ThinQ authentication strategies based on the selected method. Also owns the mandatory
 * post-login bootstrap step (`API.ready()`, `API.ts:392-399`): fetching the account's numeric profile ID
 * (`userNumber`) and activating it on the shared `ThinqApiClient` so subsequent ThinQ2 calls (`service/homes`,
 * etc.) send `x-user-no` and a per-session `x-client-id`. Centralized here so neither `AccountAuthStrategy`
 * nor `TokenAuthStrategy` needs to duplicate the fetch-and-compute logic.
 */
export class AuthenticationCoordinator {
	private readonly strategies: Map<string, IAuthStrategy>;

	constructor(
		accountStrategy: AccountAuthStrategy,
		tokenStrategy: TokenAuthStrategy,
		private readonly apiClient: ThinqApiClient,
		private readonly logger: AnsiLogger,
	) {
		this.strategies = new Map<string, IAuthStrategy>([
			['account', accountStrategy],
			['token', tokenStrategy],
		]);
	}

	/**
	 * Authenticate user using the specified method.
	 * @param method Authentication method ('account' or 'token')
	 * @param context Authentication context containing credentials
	 * @returns ThinqUserData if successful, undefined if further action required
	 */
	public async authenticate(method: ThinqAuthMethod, context: ThinqAuthContext): Promise<ThinqUserData | undefined> {
		const strategy = this.strategies.get(method);

		if (!strategy) {
			const availableMethods = Array.from(this.strategies.keys()).join(', ');
			this.logger.error(`Unknown ThinQ authentication method: ${method}. Available methods: ${availableMethods}`);
			throw new Error(`Unknown ThinQ authentication method: ${method}`);
		}

		const userData = await strategy.authenticate(context);
		if (!userData) {
			return userData;
		}

		this.logger.debug('AuthenticationCoordinator: resolving ThinQ user number post-login');
		const userNumber = await this.apiClient.getUserNumber(userData.accessToken);
		this.apiClient.setUserNumber(userNumber);

		return { ...userData, userNumber };
	}
}
