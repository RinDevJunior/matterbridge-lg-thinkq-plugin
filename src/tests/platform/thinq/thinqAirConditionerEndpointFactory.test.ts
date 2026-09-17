import { FanControl } from 'matterbridge/matter/clusters';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThinqAirConditionerDevice } from '../../../core/domain/entities/ThinqDevice.js';
import type { AirConditionerCapabilities } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
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
		createOnOffFanControlClusterServer: vi.fn().mockReturnThis(),
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
});
