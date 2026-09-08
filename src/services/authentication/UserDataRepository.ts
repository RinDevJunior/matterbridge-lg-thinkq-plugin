import { AnsiLogger } from 'matterbridge/logger';
import type NodePersist from 'node-persist';

import { PlatformConfigManager } from '../../platform/platformConfigManager.js';
import type { ThinqUserData } from './AuthContext.js';

const STORAGE_KEY = 'thinq:userData';

/** Repository for persisting and retrieving ThinQ user session data. */
export class UserDataRepository {
	constructor(
		private readonly persist: NodePersist.LocalStorage,
		private readonly configManager: PlatformConfigManager,
		private readonly logger: AnsiLogger,
	) {}

	/** Load saved ThinQ user data, discarding it if the configured country no longer matches. */
	public async loadUserData(): Promise<ThinqUserData | undefined> {
		const savedUserData = (await this.persist.getItem(STORAGE_KEY)) as ThinqUserData | undefined;

		if (!savedUserData) {
			this.logger.debug('No saved ThinQ userData found');
			return undefined;
		}

		if (savedUserData.country !== this.configManager.country) {
			this.logger.debug('Saved ThinQ userData country does not match current config, ignoring saved data');
			await this.clearUserData();
			return undefined;
		}

		this.logger.debug('Loading saved ThinQ userData');
		return savedUserData;
	}

	/** Save user data for future use. */
	public async saveUserData(userData: ThinqUserData): Promise<void> {
		await this.persist.setItem(STORAGE_KEY, userData);
		this.logger.debug('ThinQ user data saved successfully');
	}

	/** Clear saved user data. */
	public async clearUserData(): Promise<void> {
		await this.persist.removeItem(STORAGE_KEY);
	}
}
