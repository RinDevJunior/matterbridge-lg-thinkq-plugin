import { AnsiLogger } from 'matterbridge/logger';

import { AccountAuthStrategy } from './AccountAuthStrategy.js';
import type { ThinqAuthContext, ThinqUserData } from './AuthContext.js';
import type { IAuthStrategy } from './IAuthStrategy.js';
import { TokenAuthStrategy } from './TokenAuthStrategy.js';

export type ThinqAuthMethod = 'account' | 'token';

/** Coordinates ThinQ authentication strategies based on the selected method. */
export class AuthenticationCoordinator {
	private readonly strategies: Map<string, IAuthStrategy>;

	constructor(
		accountStrategy: AccountAuthStrategy,
		tokenStrategy: TokenAuthStrategy,
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

		return strategy.authenticate(context);
	}
}
