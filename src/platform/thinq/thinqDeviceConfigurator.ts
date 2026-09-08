import { AirConditioner } from 'matterbridge/devices';
import { AnsiLogger } from 'matterbridge/logger';
import { FanControl } from 'matterbridge/matter/clusters';

import type { ThinqAirConditionerDevice } from '../../core/domain/entities/ThinqDevice.js';

/** LG `airState.windStrength` values (`homebridge-lg-thinq/src/devices/AirConditioner.ts:15,19-25`). */
const THINQ_FAN_SPEED_AUTO = 8;
const THINQ_FAN_SPEED_LOW = 2;
const THINQ_FAN_SPEED_MEDIUM = 4;

const DEFAULT_TEMPERATURE_CELSIUS = 20;
const MAX_HEAT_SETPOINT_LIMIT_CELSIUS = 30;
const MIN_COOL_SETPOINT_LIMIT_CELSIUS = 18;

function mapWindStrengthToFanMode(windStrength: number | undefined): FanControl.FanMode {
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

/**
 * Builds Matterbridge `AirConditioner` device endpoints from a ThinQ AirConditioner snapshot
 * (mirrors `matterbridge-example-dynamic-platform/src/module.ts:2726-2734`).
 */
export class ThinqDeviceConfigurator {
	constructor(private readonly logger: AnsiLogger) {}

	public async registerAirConditioner(device: ThinqAirConditionerDevice): Promise<AirConditioner> {
		const snapshot = device.snapshot;
		const currentTemperature = snapshot.currentTemperatureCelsius ?? DEFAULT_TEMPERATURE_CELSIUS;
		const targetTemperature = snapshot.targetTemperatureCelsius ?? DEFAULT_TEMPERATURE_CELSIUS;

		this.logger.info(`Registering ThinQ AirConditioner: ${device.name} (${device.id})`);

		const airConditioner = new AirConditioner(device.name, device.id, {
			localTemperature: currentTemperature,
			occupiedCoolingSetpoint: targetTemperature,
			occupiedHeatingSetpoint: targetTemperature,
			maxHeatSetpointLimit: MAX_HEAT_SETPOINT_LIMIT_CELSIUS,
			minCoolSetpointLimit: MIN_COOL_SETPOINT_LIMIT_CELSIUS,
			fanMode: mapWindStrengthToFanMode(snapshot.windStrength),
		})
			.createDefaultTemperatureMeasurementClusterServer(currentTemperature * 100)
			.addRequiredClusterServers();

		// TODO: quick manual test only — replace with config-driven `enableServerMode` flag.
		airConditioner.mode = 'server';

		return Promise.resolve(airConditioner);
	}
}
