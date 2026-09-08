import Path from 'node:path';

import { MatterbridgeDynamicPlatform, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';
import NodePersist from 'node-persist';

import { UNREGISTER_DEVICES_DELAY_MS } from './constants/index.js';
import { isAirConditionerDevice } from './core/domain/entities/ThinqDevice.js';
import { ManualProcessNeededError } from './errors/index.js';
import { LgThinkqPluginPlatformConfig } from './model/LgThinkqPluginPlatformConfig.js';
// Platform layer imports
import { DeviceRegistry } from './platform/deviceRegistry.js';
import { PlatformConfigManager } from './platform/platformConfigManager.js';
import { PlatformState } from './platform/platformState.js';
import { ThinqServiceContainer } from './services/thinq/serviceContainer.js';
import { ThinqSession } from './services/thinq/session.js';
import { PLUGIN_NAME } from './settings.js';

export default function initializePlugin(
	matterbridge: PlatformMatterbridge,
	log: AnsiLogger,
	config: PlatformConfig,
): LgThinkqMatterbridgePlatform {
	return new LgThinkqMatterbridgePlatform(matterbridge, log, config as LgThinkqPluginPlatformConfig);
}

/**
 * LG ThinQ + webOS TV platform for Matterbridge.
 * Empty lifecycle skeleton (Phase 0) — device discovery/configuration lands in Phase 1 (ThinQ) and Phase 3 (webOS).
 */
export class LgThinkqMatterbridgePlatform extends MatterbridgeDynamicPlatform {
	public persist: NodePersist.LocalStorage;

	// Platform layer
	public readonly registry: DeviceRegistry;
	public readonly configManager: PlatformConfigManager;
	public readonly state: PlatformState;

	// ThinQ family services (Phase 1: auth + discovery + polling, AirConditioner only)
	public readonly thinqServices: ThinqServiceContainer;

	private thinqPollingIntervalMs: number | undefined;

	constructor(
		matterbridge: PlatformMatterbridge,
		logger: AnsiLogger,
		override config: LgThinkqPluginPlatformConfig,
	) {
		super(matterbridge, logger, config);
		logger.logLevel = this.config.advancedFeature.settings.debug ? LogLevel.DEBUG : LogLevel.INFO;

		this.log.info('Initializing platform:', this.config.name);

		// Initialize persistence
		const persistDir = Path.join(this.matterbridge.matterbridgePluginDirectory, PLUGIN_NAME, 'persist');
		this.persist = NodePersist.create({ dir: persistDir });

		// Initialize platform layer
		this.configManager = PlatformConfigManager.create(config, this.log);
		this.registry = new DeviceRegistry();
		this.state = new PlatformState();
		this.thinqServices = new ThinqServiceContainer(this.log, this.persist, this.configManager);
	}

	// #region Lifecycle
	public override async onStart(reason?: string): Promise<void> {
		this.log.notice('onStart called with reason:', reason ?? 'none');

		await this.ready;
		await this.clearSelect();
		await this.persist.init();

		if (this.configManager.isClearStorageOnStartupEnabled) {
			return;
		}

		if (!this.configManager.validateConfig()) {
			this.log.error('Platform configuration is invalid.');
			this.state.setStartupCompleted(false);
			return;
		}

		try {
			await this.startThinqDevices();
		} catch (error) {
			this.log.error(`ThinQ startup failed: ${error instanceof Error ? error.message : String(error)}`);
			this.state.setStartupCompleted(false);
			return;
		}

		this.log.notice('onStart finished');
		this.state.setStartupCompleted(true);
	}

	public override async onConfigure(): Promise<void> {
		await super.onConfigure();
		this.log.notice('onConfigure called');

		if (this.configManager.isClearStorageOnStartupEnabled) {
			this.log.warn('Clearing persistence storage as per configuration.');
			await this.persist
				.clear()
				.then(() => this.unregisterAllDevices(UNREGISTER_DEVICES_DELAY_MS))
				.then(() => {
					this.log.notice('Please restart the platform now.');
					this.wssSendRestartRequired();
				})
				.catch((error: unknown) => {
					this.log.error(`Error clearing persistence storage: ${error}`);
				});
			return;
		}

		if (!this.state.isStartupCompleted) {
			return;
		}

		this.thinqPollingIntervalMs = this.configManager.thinqRefreshIntervalSeconds * 1000;
		this.thinqServices.getDeviceService().startPolling(this.thinqPollingIntervalMs, (deviceId, snapshot) => {
			this.log.debug(`ThinQ device update received for ${deviceId}:`, snapshot);
		});
	}

	public override async onShutdown(reason?: string): Promise<void> {
		await super.onShutdown(reason);
		this.log.notice('onShutdown called with reason:', reason ?? 'none');

		this.thinqServices.getDeviceService().stopPolling();

		if (this.configManager.unregisterOnShutdown) {
			await this.unregisterAllDevices(UNREGISTER_DEVICES_DELAY_MS);
		}

		this.state.setStartupCompleted(false);
	}

	/**
	 * Authenticates against LG ThinQ (account or token strategy), discovers AirConditioner devices,
	 * and registers each of them with Matterbridge. Ports the sibling plugin's discovery/configure split.
	 */
	private async startThinqDevices(): Promise<void> {
		const userDataRepository = this.thinqServices.getUserDataRepository();
		let userData = await userDataRepository.loadUserData();

		if (!userData) {
			userData = await this.thinqServices
				.getAuthenticationCoordinator()
				.authenticate(this.configManager.thinqLoginType, {
					username: this.configManager.thinqUsername,
					password: this.configManager.thinqPassword,
					refreshToken: this.configManager.thinqRefreshToken,
					country: this.configManager.country,
					language: this.configManager.language,
				});
		}

		if (!userData) {
			throw new ManualProcessNeededError(
				'LG ThinQ authentication did not return user data. This account likely uses a third-party SSO login ' +
					'(Google/Apple/Facebook/Amazon), which is not yet supported headlessly — please log in with a native ' +
					'LG account (email/password) or refresh token instead.',
				{ reason: 'THIRD_PARTY_SSO_NOT_SUPPORTED' },
			);
		}

		this.thinqServices.apiClient.setSession(ThinqSession.fromData(userData));
		await userDataRepository.saveUserData(userData);

		const devices = await this.thinqServices.getDeviceDiscovery().discoverDevices();
		const configurator = this.thinqServices.getDeviceConfigurator();

		for (const device of devices) {
			if (!isAirConditionerDevice(device)) {
				continue;
			}

			const airConditioner = await configurator.registerAirConditioner(device);
			await this.registerDevice(airConditioner);
			this.registry.register(device.id, airConditioner);
		}
	}

	public override async onChangeLoggerLevel(logLevel: LogLevel): Promise<void> {
		this.log.notice(`Change ${PLUGIN_NAME} log level: ${logLevel} (was ${this.log.logLevel})`);
		this.log.logLevel = logLevel;
	}
	// #endregion Lifecycle
}
