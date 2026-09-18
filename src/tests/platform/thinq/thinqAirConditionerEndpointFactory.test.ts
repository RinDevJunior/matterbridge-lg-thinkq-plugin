import { FanControl } from 'matterbridge/matter/clusters';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThinqAirConditionerDevice } from '../../../core/domain/entities/ThinqDevice.js';
import type { AirConditionerCapabilities } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
import { DEFAULT_AIR_CONDITIONER_CAPABILITIES } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
import * as auxiliaryToggleModule from '../../../platform/thinq/thinqAirConditionerAuxiliaryToggles.js';
import { buildAirConditionerEndpoint } from '../../../platform/thinq/thinqAirConditionerEndpointFactory.js';
import { asPartial } from '../../helpers/testUtils.js';

// Use hoisted to set up mocks before vi.mock is processed
const { MatterbridgeEndpointMockFn } = vi.hoisted(() => {
	let mockEndpointInstance: any;

	const MatterbridgeEndpointMockFn = vi.fn(function () {
		return mockEndpointInstance;
	});

	// Store the setter on the mock function itself
	(MatterbridgeEndpointMockFn as any).setEndpoint = (endpoint: any) => {
		mockEndpointInstance = endpoint;
	};

	return { MatterbridgeEndpointMockFn };
});

vi.mock('matterbridge', () => ({
	MatterbridgeEndpoint: MatterbridgeEndpointMockFn,
	roomAirConditioner: { id: 'roomAirConditioner' },
	powerSource: { id: 'powerSource' },
	humiditySensor: { id: 'humiditySensor' },
	airQualitySensor: { id: 'airQualitySensor' },
}));

vi.mock('../../../platform/thinq/thinqAirConditionerAuxiliaryToggles.js', () => ({
	addAuxiliaryToggleEndpoints: vi.fn(),
}));

function createChainableMock() {
	return {
		createDefaultIdentifyClusterServer: vi.fn().mockReturnThis(),
		createDefaultBasicInformationClusterServer: vi.fn().mockReturnThis(),
		createDefaultPowerSourceWiredClusterServer: vi.fn().mockReturnThis(),
		createDeadFrontOnOffClusterServer: vi.fn().mockReturnThis(),
		createDefaultThermostatClusterServer: vi.fn().mockReturnThis(),
		createDefaultCoolingThermostatClusterServer: vi.fn().mockReturnThis(),
		createDefaultThermostatUserInterfaceConfigurationClusterServer: vi.fn().mockReturnThis(),
		createDefaultFanControlClusterServer: vi.fn().mockReturnThis(),
		createCompleteFanControlClusterServer: vi.fn().mockReturnThis(),
		createOnOffFanControlClusterServer: vi.fn().mockReturnThis(),
		addChildDeviceType: vi.fn().mockReturnThis(),
		createDefaultRelativeHumidityMeasurementClusterServer: vi.fn().mockReturnThis(),
		createDefaultAirQualityClusterServer: vi.fn().mockReturnThis(),
		createDefaultPm25ConcentrationMeasurementClusterServer: vi.fn().mockReturnThis(),
		createDefaultPm10ConcentrationMeasurementClusterServer: vi.fn().mockReturnThis(),
	};
}

describe('buildAirConditionerEndpoint', () => {
	let mockDevice: ThinqAirConditionerDevice;
	let setpoints: {
		currentTemperature: number;
		targetTemperature: number;
		minHeatSetpointLimitCelsius: number;
		maxHeatSetpointLimitCelsius: number;
		minCoolSetpointLimitCelsius: number;
		maxCoolSetpointLimitCelsius: number;
	};
	let mockEndpoint: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create a fresh chainable mock for each test
		mockEndpoint = createChainableMock();

		// Set the endpoint for the mock constructor
		(MatterbridgeEndpointMockFn as any).setEndpoint(mockEndpoint);

		mockDevice = asPartial<ThinqAirConditionerDevice>({
			name: 'Living Room AC',
			id: '12345678-1234-1234-1234-123456789012',
			type: 'AC',
		});

		setpoints = {
			currentTemperature: 24,
			targetTemperature: 22,
			minHeatSetpointLimitCelsius: 16,
			maxHeatSetpointLimitCelsius: 30,
			minCoolSetpointLimitCelsius: 16,
			maxCoolSetpointLimitCelsius: 30,
		};
	});

	describe('endpoint construction', () => {
		it('should construct MatterbridgeEndpoint with roomAirConditioner and powerSource devices', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(MatterbridgeEndpointMockFn).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					id: expect.any(String),
				}),
			);
		});

		it('should remove spaces from device name and id in endpoint id', () => {
			mockDevice = asPartial<ThinqAirConditionerDevice>({
				name: 'Living Room AC With Spaces',
				id: 'device id with spaces',
				type: 'AC',
			});

			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(MatterbridgeEndpointMockFn).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					id: 'LivingRoomACWithSpaces-deviceidwithspaces',
				}),
			);
		});

		it('should call createDefaultIdentifyClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultIdentifyClusterServer).toHaveBeenCalledTimes(1);
		});

		it('should call createDefaultBasicInformationClusterServer with correct args', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultBasicInformationClusterServer).toHaveBeenCalledWith(
				mockDevice.name,
				mockDevice.id,
				0xfff1,
				'Matterbridge',
				0x8000,
				'Matterbridge Air Conditioner',
			);
		});

		it('should call createDefaultPowerSourceWiredClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultPowerSourceWiredClusterServer).toHaveBeenCalledTimes(1);
		});

		it('should call createDeadFrontOnOffClusterServer with true', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDeadFrontOnOffClusterServer).toHaveBeenCalledWith(true);
		});

		it('should call createDefaultThermostatUserInterfaceConfigurationClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultThermostatUserInterfaceConfigurationClusterServer).toHaveBeenCalledTimes(1);
		});
	});

	describe('thermostat cluster selection when supportsHeat=true', () => {
		it('should call createDefaultThermostatClusterServer with correct args', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultThermostatClusterServer).toHaveBeenCalledWith(
				setpoints.currentTemperature,
				setpoints.targetTemperature,
				setpoints.targetTemperature,
				1,
				setpoints.minHeatSetpointLimitCelsius,
				setpoints.maxHeatSetpointLimitCelsius,
				setpoints.minCoolSetpointLimitCelsius,
				setpoints.maxCoolSetpointLimitCelsius,
			);
		});

		it('should not call createDefaultCoolingThermostatClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultCoolingThermostatClusterServer).not.toHaveBeenCalled();
		});
	});

	describe('thermostat cluster selection when supportsHeat=false', () => {
		it('should call createDefaultCoolingThermostatClusterServer with correct args', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: false,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultCoolingThermostatClusterServer).toHaveBeenCalledWith(
				setpoints.currentTemperature,
				setpoints.targetTemperature,
				setpoints.minCoolSetpointLimitCelsius,
				setpoints.maxCoolSetpointLimitCelsius,
			);
		});

		it('should not call createDefaultThermostatClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: false,
				supportsFanSpeedControl: true,
			});

			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(mockEndpoint.createDefaultThermostatClusterServer).not.toHaveBeenCalled();
		});
	});

	describe('fan control cluster selection when supportsFanSpeedControl=true', () => {
		it('should call createDefaultFanControlClusterServer with correct args', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			const initialFanMode = FanControl.FanMode.Low;
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			expect(mockEndpoint.createDefaultFanControlClusterServer).toHaveBeenCalledWith(
				initialFanMode,
				FanControl.FanModeSequence.OffLowMedHighAuto,
				0,
				0,
			);
		});

		it('should not call createOnOffFanControlClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			const initialFanMode = FanControl.FanMode.Low;
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			expect(mockEndpoint.createOnOffFanControlClusterServer).not.toHaveBeenCalled();
		});
	});

	describe('fan control cluster selection when supportsFanSpeedControl=false', () => {
		it('should call createOnOffFanControlClusterServer with correct args', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: false,
			});

			const initialFanMode = FanControl.FanMode.Low;
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			expect(mockEndpoint.createOnOffFanControlClusterServer).toHaveBeenCalledWith(initialFanMode);
		});

		it('should not call createDefaultFanControlClusterServer', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: false,
			});

			const initialFanMode = FanControl.FanMode.Low;
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			expect(mockEndpoint.createDefaultFanControlClusterServer).not.toHaveBeenCalled();
		});
	});

	describe('return value', () => {
		it('should return the chainable endpoint', () => {
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
			});

			const result = buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			expect(result).toBe(mockEndpoint);
		});
	});

	describe('auxiliary toggle endpoints (Phase A)', () => {
		it('should call addAuxiliaryToggleEndpoints with capabilities when endpoint is built', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsJetMode: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(auxiliaryToggleModule.addAuxiliaryToggleEndpoints).toHaveBeenCalledWith(
				mockEndpoint,
				expect.objectContaining({
					supportsJetMode: true,
				}),
			);
		});

		it('should call addAuxiliaryToggleEndpoints with all default capabilities when none are enabled', () => {
			// Arrange
			const capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES };

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(auxiliaryToggleModule.addAuxiliaryToggleEndpoints).toHaveBeenCalledWith(
				mockEndpoint,
				expect.objectContaining({
					supportsJetMode: false,
					supportsQuietMode: false,
					supportsEnergySaveMode: false,
					supportsAirCleanMode: false,
					supportsLedControl: false,
				}),
			);
		});

		it('should call addAuxiliaryToggleEndpoints with multiple toggle capabilities enabled', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsJetMode: true,
				supportsQuietMode: true,
				supportsLedControl: true,
				supportsEnergySaveMode: false,
				supportsAirCleanMode: false,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(auxiliaryToggleModule.addAuxiliaryToggleEndpoints).toHaveBeenCalledWith(mockEndpoint, capabilities);
		});

		it('should call addAuxiliaryToggleEndpoints exactly once per endpoint build', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsJetMode: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(auxiliaryToggleModule.addAuxiliaryToggleEndpoints).toHaveBeenCalledTimes(1);
		});
	});

	describe('swing mode (Phase B)', () => {
		it('should call createCompleteFanControlClusterServer when supportsFanSpeedControl and supportsSwingMode are both true', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsSwingMode: true,
			});

			const initialFanMode = FanControl.FanMode.Low;

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			// Assert
			expect(mockEndpoint.createCompleteFanControlClusterServer).toHaveBeenCalledWith(
				initialFanMode,
				FanControl.FanModeSequence.OffLowMedHighAuto,
				0,
				0,
				undefined,
				undefined,
				undefined,
				{ rockLeftRight: true, rockUpDown: true, rockRound: true },
				{ rockLeftRight: false, rockUpDown: false, rockRound: false },
			);
		});

		it('should not call createDefaultFanControlClusterServer when supportsSwingMode is true', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsSwingMode: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultFanControlClusterServer).not.toHaveBeenCalled();
		});

		it('should call createDefaultFanControlClusterServer when supportsFanSpeedControl is true but supportsSwingMode is false', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsSwingMode: false,
			});

			const initialFanMode = FanControl.FanMode.Low;

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			// Assert
			expect(mockEndpoint.createDefaultFanControlClusterServer).toHaveBeenCalledWith(
				initialFanMode,
				FanControl.FanModeSequence.OffLowMedHighAuto,
				0,
				0,
			);
			expect(mockEndpoint.createCompleteFanControlClusterServer).not.toHaveBeenCalled();
		});

		it('should call createOnOffFanControlClusterServer when supportsFanSpeedControl is false, even if supportsSwingMode is true', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: false,
				supportsSwingMode: true,
			});

			const initialFanMode = FanControl.FanMode.Low;

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, initialFanMode);

			// Assert
			expect(mockEndpoint.createOnOffFanControlClusterServer).toHaveBeenCalledWith(initialFanMode);
			expect(mockEndpoint.createCompleteFanControlClusterServer).not.toHaveBeenCalled();
			expect(mockEndpoint.createDefaultFanControlClusterServer).not.toHaveBeenCalled();
		});
	});

	describe('humidity sensor child endpoint (Phase C)', () => {
		it('should create HumiditySensor child endpoint when supportsHumiditySensor is true', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsHumiditySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('HumiditySensor', expect.any(Array));
		});

		it('should create RelativeHumidityMeasurementClusterServer on HumiditySensor child', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsHumiditySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultRelativeHumidityMeasurementClusterServer).toHaveBeenCalledWith(0);
		});

		it('should not create HumiditySensor child endpoint when supportsHumiditySensor is false', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsHumiditySensor: false,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			const calls = (mockEndpoint.addChildDeviceType as any).mock.calls;
			const humidityCallExists = calls.some((call: any[]) => call[0] === 'HumiditySensor');
			expect(humidityCallExists).toBe(false);
		});

		it('should not call createDefaultRelativeHumidityMeasurementClusterServer when supportsHumiditySensor is false', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsHumiditySensor: false,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultRelativeHumidityMeasurementClusterServer).not.toHaveBeenCalled();
		});
	});

	describe('air quality sensor child endpoint (Phase C)', () => {
		it('should create AirQualitySensor child endpoint when supportsAirQualitySensor is true', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsAirQualitySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('AirQualitySensor', expect.any(Array));
		});

		it('should create AirQualityClusterServer on AirQualitySensor child', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsAirQualitySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultAirQualityClusterServer).toHaveBeenCalled();
		});

		it('should create PM2.5 ConcentrationMeasurementClusterServer on AirQualitySensor child', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsAirQualitySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultPm25ConcentrationMeasurementClusterServer).toHaveBeenCalled();
		});

		it('should create PM10 ConcentrationMeasurementClusterServer on AirQualitySensor child', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsAirQualitySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultPm10ConcentrationMeasurementClusterServer).toHaveBeenCalled();
		});

		it('should not create AirQualitySensor child endpoint when supportsAirQualitySensor is false', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsAirQualitySensor: false,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			const calls = (mockEndpoint.addChildDeviceType as any).mock.calls;
			const airQualityCallExists = calls.some((call: any[]) => call[0] === 'AirQualitySensor');
			expect(airQualityCallExists).toBe(false);
		});

		it('should not call air quality cluster servers when supportsAirQualitySensor is false', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsAirQualitySensor: false,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			expect(mockEndpoint.createDefaultAirQualityClusterServer).not.toHaveBeenCalled();
			expect(mockEndpoint.createDefaultPm25ConcentrationMeasurementClusterServer).not.toHaveBeenCalled();
			expect(mockEndpoint.createDefaultPm10ConcentrationMeasurementClusterServer).not.toHaveBeenCalled();
		});

		it('should create both humidity and air quality sensors when both capabilities are enabled', () => {
			// Arrange
			const capabilities = asPartial<AirConditionerCapabilities>({
				supportsHeat: true,
				supportsFanSpeedControl: true,
				supportsHumiditySensor: true,
				supportsAirQualitySensor: true,
			});

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			const calls = (mockEndpoint.addChildDeviceType as any).mock.calls;
			expect(calls.some((call: any[]) => call[0] === 'HumiditySensor')).toBe(true);
			expect(calls.some((call: any[]) => call[0] === 'AirQualitySensor')).toBe(true);
		});

		it('should maintain regression parity when both sensor capabilities are false (default)', () => {
			// Arrange
			const capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES };

			// Act
			buildAirConditionerEndpoint(mockDevice, capabilities, setpoints, FanControl.FanMode.Low);

			// Assert
			const calls = (mockEndpoint.addChildDeviceType as any).mock.calls;
			const hasHumiditySensor = calls.some((call: any[]) => call[0] === 'HumiditySensor');
			const hasAirQualitySensor = calls.some((call: any[]) => call[0] === 'AirQualitySensor');
			expect(hasHumiditySensor).toBe(false);
			expect(hasAirQualitySensor).toBe(false);
		});
	});
});
