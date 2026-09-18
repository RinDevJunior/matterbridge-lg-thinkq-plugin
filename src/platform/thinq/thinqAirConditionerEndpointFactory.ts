import { MatterbridgeEndpoint, powerSource, roomAirConditioner } from 'matterbridge';
import { FanControl } from 'matterbridge/matter/clusters';

import type { ThinqAirConditionerDevice } from '../../core/domain/entities/ThinqDevice.js';
import type { AirConditionerCapabilities } from '../../core/domain/value-objects/AirConditionerCapabilities.js';
import { addAuxiliaryToggleEndpoints } from './thinqAirConditionerAuxiliaryToggles.js';

export interface AirConditionerEndpointSetpoints {
	currentTemperature: number;
	targetTemperature: number;
	minHeatSetpointLimitCelsius: number;
	maxHeatSetpointLimitCelsius: number;
	minCoolSetpointLimitCelsius: number;
	maxCoolSetpointLimitCelsius: number;
}

/**
 * Hand-composes an `AirConditioner`-shaped `MatterbridgeEndpoint`, mirroring
 * `@matterbridge/core`'s own `AirConditioner` constructor, but branching the
 * Thermostat/FanControl cluster construction on the device's configured capabilities
 * (`Behaviors.require()` throws on a 2nd call for the same cluster id, so the feature
 * set must be chosen up-front — see `.claude/memory.md`).
 */
export function buildAirConditionerEndpoint(
	device: ThinqAirConditionerDevice,
	capabilities: AirConditionerCapabilities,
	setpoints: AirConditionerEndpointSetpoints,
	initialFanMode: FanControl.FanMode,
): MatterbridgeEndpoint {
	const {
		currentTemperature,
		targetTemperature,
		minHeatSetpointLimitCelsius,
		maxHeatSetpointLimitCelsius,
		minCoolSetpointLimitCelsius,
		maxCoolSetpointLimitCelsius,
	} = setpoints;

	const endpoint = new MatterbridgeEndpoint([roomAirConditioner, powerSource], {
		id: `${device.name.replaceAll(' ', '')}-${device.id.replaceAll(' ', '')}`,
	})
		.createDefaultIdentifyClusterServer()
		.createDefaultBasicInformationClusterServer(
			device.name,
			device.id,
			0xfff1,
			'Matterbridge',
			0x8000,
			'Matterbridge Air Conditioner',
		)
		.createDefaultPowerSourceWiredClusterServer()
		.createDeadFrontOnOffClusterServer(true);

	if (capabilities.supportsHeat) {
		endpoint.createDefaultThermostatClusterServer(
			currentTemperature,
			targetTemperature,
			targetTemperature,
			1,
			minHeatSetpointLimitCelsius,
			maxHeatSetpointLimitCelsius,
			minCoolSetpointLimitCelsius,
			maxCoolSetpointLimitCelsius,
		);
	} else {
		endpoint.createDefaultCoolingThermostatClusterServer(
			currentTemperature,
			targetTemperature,
			minCoolSetpointLimitCelsius,
			maxCoolSetpointLimitCelsius,
		);
	}
	endpoint.createDefaultThermostatUserInterfaceConfigurationClusterServer();

	if (capabilities.supportsFanSpeedControl) {
		endpoint.createDefaultFanControlClusterServer(initialFanMode, FanControl.FanModeSequence.OffLowMedHighAuto, 0, 0);
	} else {
		endpoint.createOnOffFanControlClusterServer(initialFanMode);
	}

	addAuxiliaryToggleEndpoints(endpoint, capabilities);

	return endpoint;
}
