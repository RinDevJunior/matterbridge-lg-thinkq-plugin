import { MatterbridgeEndpoint } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import {
	AirQuality,
	ElectricalPowerMeasurement,
	FanControl,
	OnOff,
	Pm10ConcentrationMeasurement,
	Pm25ConcentrationMeasurement,
	RelativeHumidityMeasurement,
	TemperatureMeasurement,
	Thermostat,
} from 'matterbridge/matter/clusters';

import type { AirConditionerCapabilities } from '../../core/domain/value-objects/AirConditionerCapabilities.js';
import type { ThinqSnapshot } from '../../core/domain/value-objects/ThinqSnapshot.js';
import { applyAuxiliaryToggleSnapshot } from './thinqAirConditionerAuxiliaryToggles.js';
import {
	THINQ_FAN_SPEED_AUTO,
	THINQ_FAN_SPEED_LOW,
	THINQ_FAN_SPEED_MEDIUM,
} from './thinqAirConditionerCommandHandlers.js';
import { mapWindStrengthToFanMode, mapWindStrengthToFixedFanMode } from './thinqDeviceConfigurator.js';

/** LG `airState.opMode` values (`homebridge-lg-thinq/src/devices/AirConditioner.ts`). */
const THINQ_OP_MODE_COOL = 0;
const THINQ_OP_MODE_DRY = 1;
const THINQ_OP_MODE_FAN = 2;
const THINQ_OP_MODE_HEAT = 4;
const THINQ_OP_MODE_AIR_CLEAN = 5;
const THINQ_OP_MODE_AUTO = 6;

const WIND_STRENGTH_LOW_PERCENT = 20;
const WIND_STRENGTH_MEDIUM_PERCENT = 50;
const WIND_STRENGTH_HIGH_PERCENT = 90;

/** Maps a ThinQ `airState.windStrength` value to a Matter `FanControl.percentCurrent` (Auto has no percent equivalent). */
export function mapWindStrengthToPercent(windStrength: number | undefined): number | undefined {
	if (windStrength === undefined || windStrength === THINQ_FAN_SPEED_AUTO) {
		return undefined;
	}
	if (windStrength <= THINQ_FAN_SPEED_LOW) {
		return WIND_STRENGTH_LOW_PERCENT;
	}
	if (windStrength <= THINQ_FAN_SPEED_MEDIUM) {
		return WIND_STRENGTH_MEDIUM_PERCENT;
	}
	return WIND_STRENGTH_HIGH_PERCENT;
}

/** Maps ThinQ power-state + `airState.opMode` to a Matter `Thermostat.SystemMode`. */
export function mapOperationModeToSystemMode(
	operationMode: number | undefined,
	isPowerOn: boolean,
	capabilities: AirConditionerCapabilities,
): Thermostat.SystemMode {
	if (!isPowerOn) {
		return Thermostat.SystemMode.Off;
	}

	switch (operationMode) {
		case THINQ_OP_MODE_AUTO:
			return capabilities.supportsHeat ? Thermostat.SystemMode.Auto : Thermostat.SystemMode.Cool;
		case THINQ_OP_MODE_COOL:
			return Thermostat.SystemMode.Cool;
		case THINQ_OP_MODE_HEAT:
			return capabilities.supportsHeat ? Thermostat.SystemMode.Heat : Thermostat.SystemMode.Cool;
		case THINQ_OP_MODE_FAN:
			return Thermostat.SystemMode.FanOnly;
		case THINQ_OP_MODE_DRY:
			return capabilities.supportsDry ? Thermostat.SystemMode.Dry : Thermostat.SystemMode.Cool;
		case THINQ_OP_MODE_AIR_CLEAN:
		default:
			return capabilities.supportsHeat ? Thermostat.SystemMode.Auto : Thermostat.SystemMode.Cool;
	}
}

/**
 * Pushes a freshly polled ThinQ snapshot onto the Matter `AirConditioner` endpoint's attributes
 * (device → Apple Home). Uses `updateAttribute` (idempotent) to avoid redundant attribute-report churn.
 */
export async function applyThinqSnapshotToAirConditioner(
	airConditioner: MatterbridgeEndpoint,
	snapshot: ThinqSnapshot,
	capabilities: AirConditionerCapabilities,
	logger: AnsiLogger,
): Promise<void> {
	const deviceId = airConditioner.serialNumber ?? airConditioner.uniqueId ?? 'unknown';
	const attributesToPush = ['power', 'systemMode'];
	if (snapshot.currentTemperatureCelsius !== undefined) {
		attributesToPush.push('currentTemp');
	}
	if (snapshot.targetTemperatureCelsius !== undefined) {
		attributesToPush.push('targetTemp');
	}
	if (capabilities.supportsFanSpeedControl || snapshot.windStrength !== undefined) {
		attributesToPush.push('fanSpeed');
	}
	logger.debug(
		`applyThinqSnapshotToAirConditioner: entry for deviceId=${deviceId}, pushing ${attributesToPush.length} attributes: ${attributesToPush.join(', ')}`,
	);

	await airConditioner.updateAttribute(OnOff.id, 'onOff', snapshot.isPowerOn, logger);

	const currentTemperatureCelsius = snapshot.currentTemperatureCelsius;
	if (currentTemperatureCelsius !== undefined) {
		await airConditioner.updateAttribute(
			TemperatureMeasurement.id,
			'measuredValue',
			currentTemperatureCelsius * 100,
			logger,
		);
		await airConditioner.updateAttribute(Thermostat.id, 'localTemperature', currentTemperatureCelsius * 100, logger);
	}

	const targetTemperatureCelsius = snapshot.targetTemperatureCelsius;
	if (targetTemperatureCelsius !== undefined) {
		await airConditioner.updateAttribute(
			Thermostat.id,
			'occupiedCoolingSetpoint',
			targetTemperatureCelsius * 100,
			logger,
		);
		if (capabilities.supportsHeat) {
			await airConditioner.updateAttribute(
				Thermostat.id,
				'occupiedHeatingSetpoint',
				targetTemperatureCelsius * 100,
				logger,
			);
		}
	}

	await airConditioner.updateAttribute(
		Thermostat.id,
		'systemMode',
		mapOperationModeToSystemMode(snapshot.operationMode, snapshot.isPowerOn, capabilities),
		logger,
	);

	if (capabilities.supportsFanSpeedControl) {
		await airConditioner.updateAttribute(
			FanControl.id,
			'fanMode',
			mapWindStrengthToFanMode(snapshot.windStrength),
			logger,
		);

		const percentCurrent = mapWindStrengthToPercent(snapshot.windStrength);
		if (percentCurrent !== undefined) {
			await airConditioner.updateAttribute(FanControl.id, 'percentCurrent', percentCurrent, logger);
		}

		if (capabilities.supportsSwingMode) {
			await airConditioner.updateAttribute(
				FanControl.id,
				'rockSetting',
				{
					rockLeftRight: snapshot.isHorizontalSwingOn,
					rockUpDown: snapshot.isVerticalSwingOn,
					rockRound: snapshot.isVerticalSwingOn && snapshot.isHorizontalSwingOn,
				},
				logger,
			);
		}
	} else {
		await airConditioner.updateAttribute(
			FanControl.id,
			'fanMode',
			mapWindStrengthToFixedFanMode(snapshot.windStrength),
			logger,
		);
	}

	await applyAuxiliaryToggleSnapshot(airConditioner, snapshot, capabilities, logger);

	if (capabilities.supportsHumiditySensor) {
		const humidityPercent = snapshot.humidityPercent;
		if (humidityPercent !== undefined) {
			const humiditySensorChild = airConditioner.getChildEndpointById('HumiditySensor');
			if (humiditySensorChild) {
				await humiditySensorChild.updateAttribute(
					RelativeHumidityMeasurement.id,
					'measuredValue',
					humidityPercent * 100,
					logger,
				);
			}
		}
	}

	if (capabilities.supportsAirQualitySensor) {
		const airQualitySensorChild = airConditioner.getChildEndpointById('AirQualitySensor');
		if (airQualitySensorChild) {
			const airQualityOverall = snapshot.airQualityOverall;
			if (airQualityOverall !== undefined) {
				await airQualitySensorChild.updateAttribute(AirQuality.id, 'airQuality', airQualityOverall, logger);
			}

			const pm25Value = snapshot.pm25;
			if (pm25Value !== undefined) {
				await airQualitySensorChild.updateAttribute(
					Pm25ConcentrationMeasurement.id,
					'measuredValue',
					pm25Value,
					logger,
				);
			}

			const pm10Value = snapshot.pm10;
			if (pm10Value !== undefined) {
				await airQualitySensorChild.updateAttribute(
					Pm10ConcentrationMeasurement.id,
					'measuredValue',
					pm10Value,
					logger,
				);
			}
		}
	}

	if (capabilities.supportsEnergyMonitoring) {
		const powerConsumptionWatts = snapshot.powerConsumptionWatts;
		if (powerConsumptionWatts !== undefined) {
			const energyMonitorChild = airConditioner.getChildEndpointById('EnergyMonitor');
			if (energyMonitorChild) {
				await energyMonitorChild.updateAttribute(ElectricalPowerMeasurement.id, 'power', powerConsumptionWatts, logger);
			}
		}
	}
}
