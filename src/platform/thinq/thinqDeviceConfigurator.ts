import { MatterbridgeEndpoint } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { FanControl } from 'matterbridge/matter/clusters';

import type { ThinqAirConditionerDevice } from '../../core/domain/entities/ThinqDevice.js';
import type { ThinqApiClient } from '../../services/thinq/thinqApiClient.js';
import { PlatformConfigManager } from '../platformConfigManager.js';
import {
	registerAirConditionerCommandHandlers,
	THINQ_FAN_SPEED_AUTO,
	THINQ_FAN_SPEED_LOW,
	THINQ_FAN_SPEED_MEDIUM,
} from './thinqAirConditionerCommandHandlers.js';
import { buildAirConditionerEndpoint } from './thinqAirConditionerEndpointFactory.js';

const DEFAULT_TEMPERATURE_CELSIUS = 20;
const MAX_HEAT_SETPOINT_LIMIT_CELSIUS = 30;
const MIN_COOL_SETPOINT_LIMIT_CELSIUS = 18;

export function mapWindStrengthToFanMode(windStrength: number | undefined): FanControl.FanMode {
	if (windStrength === undefined || windStrength === THINQ_FAN_SPEED_AUTO) {
		return FanControl.FanMode.Auto;
	}
	if (windStrength <= THINQ_FAN_SPEED_LOW) {
		return FanControl.FanMode.Low;
	}
	if (windStrength <= THINQ_FAN_SPEED_MEDIUM) {
		return FanControl.FanMode.Medium;
	}
	return FanControl.FanMode.High;
}

export function mapWindStrengthToFixedFanMode(windStrength: number | undefined): FanControl.FanMode {
	return windStrength === undefined ? FanControl.FanMode.Off : FanControl.FanMode.High;
}

/**
 * Builds Matterbridge `AirConditioner` device endpoints from a ThinQ AirConditioner snapshot
 * (mirrors `matterbridge-example-dynamic-platform/src/module.ts:2726-2734`).
 */
export class ThinqDeviceConfigurator {
	constructor(
		private readonly logger: AnsiLogger,
		private readonly apiClient: ThinqApiClient,
		private readonly configManager: PlatformConfigManager,
	) {}

	public async registerAirConditioner(device: ThinqAirConditionerDevice): Promise<MatterbridgeEndpoint> {
		const snapshot = device.snapshot;
		const currentTemperature = snapshot.currentTemperatureCelsius ?? DEFAULT_TEMPERATURE_CELSIUS;
		const targetTemperature = snapshot.targetTemperatureCelsius ?? DEFAULT_TEMPERATURE_CELSIUS;
		const capabilities = this.configManager.getDeviceCapabilities(device.id);

		this.logger.info(`Registering ThinQ AirConditioner: ${device.name} (${device.id})`);

		const initialFanMode = capabilities.supportsFanSpeedControl
			? mapWindStrengthToFanMode(snapshot.windStrength)
			: mapWindStrengthToFixedFanMode(snapshot.windStrength);

		const airConditioner = buildAirConditionerEndpoint(
			device,
			capabilities,
			{
				currentTemperature,
				targetTemperature,
				minHeatSetpointLimitCelsius: 0,
				maxHeatSetpointLimitCelsius: MAX_HEAT_SETPOINT_LIMIT_CELSIUS,
				minCoolSetpointLimitCelsius: MIN_COOL_SETPOINT_LIMIT_CELSIUS,
				maxCoolSetpointLimitCelsius: 50,
			},
			initialFanMode,
		)
			.createDefaultTemperatureMeasurementClusterServer(currentTemperature * 100)
			.addRequiredClusterServers();

		// TODO: quick manual test only — replace with config-driven `enableServerMode` flag.
		airConditioner.mode = 'server';

		registerAirConditionerCommandHandlers(airConditioner, device, this.apiClient, this.logger, capabilities);

		return Promise.resolve(airConditioner);
	}
}
