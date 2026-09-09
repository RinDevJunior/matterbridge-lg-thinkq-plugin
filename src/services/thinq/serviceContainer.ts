import { AnsiLogger } from 'matterbridge/logger';
import { LocalStorage } from 'node-persist';

import { PlatformConfigManager } from '../../platform/platformConfigManager.js';
import { ThinqDeviceConfigurator } from '../../platform/thinq/thinqDeviceConfigurator.js';
import { ThinqDeviceDiscovery } from '../../platform/thinq/thinqDeviceDiscovery.js';
import { AccountAuthStrategy } from '../authentication/AccountAuthStrategy.js';
import { AuthenticationCoordinator } from '../authentication/AuthenticationCoordinator.js';
import { TokenAuthStrategy } from '../authentication/TokenAuthStrategy.js';
import { UserDataRepository } from '../authentication/UserDataRepository.js';
import { ThinqSession } from './session.js';
import { ThinqApiClient } from './thinqApiClient.js';
import { ThinqDeviceService } from './thinqDeviceService.js';

/** DI container wiring together ThinQ authentication, discovery, and polling services (singletons). */
export class ThinqServiceContainer {
	private readonly apiClientInstance: ThinqApiClient;
	private authenticationCoordinatorInstance: AuthenticationCoordinator | undefined;
	private deviceServiceInstance: ThinqDeviceService | undefined;
	private deviceDiscoveryInstance: ThinqDeviceDiscovery | undefined;
	private deviceConfiguratorInstance: ThinqDeviceConfigurator | undefined;
	private userDataRepositoryInstance: UserDataRepository | undefined;

	constructor(
		private readonly logger: AnsiLogger,
		private readonly persist: LocalStorage,
		private readonly configManager: PlatformConfigManager,
	) {
		this.apiClientInstance = new ThinqApiClient(
			new ThinqSession('', '', 0),
			this.configManager.country,
			this.configManager.language,
			this.logger,
		);
	}

	public get apiClient(): ThinqApiClient {
		return this.apiClientInstance;
	}

	public getUserDataRepository(): UserDataRepository {
		this.userDataRepositoryInstance ??= new UserDataRepository(this.persist, this.configManager, this.logger);
		return this.userDataRepositoryInstance;
	}

	public getAuthenticationCoordinator(): AuthenticationCoordinator {
		if (!this.authenticationCoordinatorInstance) {
			const accountStrategy = new AccountAuthStrategy(this.apiClientInstance, this.logger);
			const tokenStrategy = new TokenAuthStrategy(this.apiClientInstance, this.logger);
			this.authenticationCoordinatorInstance = new AuthenticationCoordinator(
				accountStrategy,
				tokenStrategy,
				this.apiClientInstance,
				this.logger,
			);
		}
		return this.authenticationCoordinatorInstance;
	}

	public getDeviceService(): ThinqDeviceService {
		this.deviceServiceInstance ??= new ThinqDeviceService(this.apiClientInstance, this.logger);
		return this.deviceServiceInstance;
	}

	public getDeviceDiscovery(): ThinqDeviceDiscovery {
		this.deviceDiscoveryInstance ??= new ThinqDeviceDiscovery(this.getDeviceService(), this.logger);
		return this.deviceDiscoveryInstance;
	}

	public getDeviceConfigurator(): ThinqDeviceConfigurator {
		this.deviceConfiguratorInstance ??= new ThinqDeviceConfigurator(this.logger, this.apiClientInstance);
		return this.deviceConfiguratorInstance;
	}
}
