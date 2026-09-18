import { FanControl, OnOff, TemperatureMeasurement, Thermostat } from 'matterbridge/matter/clusters';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AirConditionerCapabilities } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
import { DEFAULT_AIR_CONDITIONER_CAPABILITIES } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
import { ThinqSnapshot } from '../../../core/domain/value-objects/ThinqSnapshot.js';
import {
	applyThinqSnapshotToAirConditioner,
	mapOperationModeToSystemMode,
	mapWindStrengthToPercent,
} from '../../../platform/thinq/thinqAirConditionerStateSync.js';
import { createMockLogger } from '../../helpers/testUtils.js';

describe('applyThinqSnapshotToAirConditioner', () => {
	let mockLogger: ReturnType<typeof createMockLogger>;
	let airConditioner: any;
	let capabilities: AirConditionerCapabilities;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockLogger = createMockLogger();
		capabilities = DEFAULT_AIR_CONDITIONER_CAPABILITIES;

		airConditioner = {
			id: 0x01,
			name: 'Living Room AC',
			log: mockLogger,
			updateAttribute: vi.fn().mockResolvedValue(false),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should update all attributes with full snapshot when powered on with all values defined', async () => {
		// Arrange
		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0, // COOL
			'airState.windStrength': 2, // LOW
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		expect(updateAttributeSpy).toHaveBeenCalledWith(OnOff.id, 'onOff', true, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(TemperatureMeasurement.id, 'measuredValue', 2200, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'localTemperature', 2200, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'occupiedCoolingSetpoint', 2400, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'occupiedHeatingSetpoint', 2400, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(
			Thermostat.id,
			'systemMode',
			Thermostat.SystemMode.Cool,
			mockLogger,
		);
		expect(updateAttributeSpy).toHaveBeenCalledWith(FanControl.id, 'fanMode', FanControl.FanMode.Low, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(FanControl.id, 'percentCurrent', 20, mockLogger);
	});

	it('should set systemMode to Off when power is off', async () => {
		// Arrange
		const snapshot = new ThinqSnapshot({
			'airState.operation': 0,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0, // COOL - ignored when powered off
			'airState.windStrength': 2,
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'systemMode', Thermostat.SystemMode.Off, mockLogger);
	});

	it('should skip measuredValue and localTemperature updates when currentTemperatureCelsius is undefined', async () => {
		// Arrange
		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		const calls = updateAttributeSpy.mock.calls;
		const hasTemperatureMeasurement = calls.some(
			(call) => call[0] === TemperatureMeasurement.id && call[1] === 'measuredValue',
		);
		const hasLocalTemp = calls.some((call) => call[0] === Thermostat.id && call[1] === 'localTemperature');

		expect(hasTemperatureMeasurement).toBe(false);
		expect(hasLocalTemp).toBe(false);
	});

	it('should skip setpoint updates when targetTemperatureCelsius is undefined', async () => {
		// Arrange
		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.opMode': 0,
			'airState.windStrength': 2,
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		const calls = updateAttributeSpy.mock.calls;
		const hasCoolingSetpoint = calls.some((call) => call[0] === Thermostat.id && call[1] === 'occupiedCoolingSetpoint');
		const hasHeatingSetpoint = calls.some((call) => call[0] === Thermostat.id && call[1] === 'occupiedHeatingSetpoint');

		expect(hasCoolingSetpoint).toBe(false);
		expect(hasHeatingSetpoint).toBe(false);
	});

	it('should not update occupiedHeatingSetpoint when capabilities.supportsHeat is false', async () => {
		// Arrange
		const noHeatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: false,
		};

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, noHeatCapabilities, mockLogger);

		// Assert
		const calls = updateAttributeSpy.mock.calls;
		const hasHeatingSetpoint = calls.some((call) => call[0] === Thermostat.id && call[1] === 'occupiedHeatingSetpoint');

		expect(hasHeatingSetpoint).toBe(false);
	});

	it('should not update fan attributes when supportsFanSpeedControl is false', async () => {
		// Arrange
		const noFanCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsFanSpeedControl: false,
		};

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, noFanCapabilities, mockLogger);

		// Assert
		const calls = updateAttributeSpy.mock.calls;
		const hasPercentCurrent = calls.some((call: any[]) => call[0] === FanControl.id && call[1] === 'percentCurrent');

		// Should have fanMode but mapped to fixed mode
		expect(calls.some((call: any[]) => call[0] === FanControl.id && call[1] === 'fanMode')).toBe(true);
		// Should not have percentCurrent
		expect(hasPercentCurrent).toBe(false);
	});
});

describe('mapWindStrengthToPercent', () => {
	it('should map LOW windStrength to 20 percent', () => {
		// Act & Assert
		expect(mapWindStrengthToPercent(2)).toBe(20);
	});

	it('should map MEDIUM windStrength to 50 percent', () => {
		// Act & Assert
		expect(mapWindStrengthToPercent(4)).toBe(50);
	});

	it('should map HIGH windStrength to 90 percent', () => {
		// Act & Assert
		expect(mapWindStrengthToPercent(6)).toBe(90);
	});

	it('should map AUTO windStrength to undefined', () => {
		// Act & Assert
		expect(mapWindStrengthToPercent(8)).toBeUndefined();
	});

	it('should return undefined when windStrength is undefined', () => {
		// Act & Assert
		expect(mapWindStrengthToPercent(undefined)).toBeUndefined();
	});
});

describe('mapOperationModeToSystemMode', () => {
	let capabilities: AirConditionerCapabilities;

	beforeEach(() => {
		capabilities = DEFAULT_AIR_CONDITIONER_CAPABILITIES;
	});

	it('should return SystemMode.Off when powered off regardless of operation mode', () => {
		// Act & Assert
		expect(mapOperationModeToSystemMode(0, false, capabilities)).toBe(Thermostat.SystemMode.Off);
		expect(mapOperationModeToSystemMode(4, false, capabilities)).toBe(Thermostat.SystemMode.Off);
		expect(mapOperationModeToSystemMode(undefined, false, capabilities)).toBe(Thermostat.SystemMode.Off);
	});

	it('should map opMode 0 (COOL) to SystemMode.Cool', () => {
		// Act & Assert
		expect(mapOperationModeToSystemMode(0, true, capabilities)).toBe(Thermostat.SystemMode.Cool);
	});

	it('should map opMode 1 (DRY) to SystemMode.Dry when supported', () => {
		// Act & Assert
		const dryCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsDry: true,
		};
		expect(mapOperationModeToSystemMode(1, true, dryCapabilities)).toBe(Thermostat.SystemMode.Dry);
	});

	it('should map opMode 1 (DRY) to SystemMode.Cool when not supported', () => {
		// Act & Assert
		const noDryCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsDry: false,
		};
		expect(mapOperationModeToSystemMode(1, true, noDryCapabilities)).toBe(Thermostat.SystemMode.Cool);
	});

	it('should map opMode 2 (FAN) to SystemMode.FanOnly', () => {
		// Act & Assert
		expect(mapOperationModeToSystemMode(2, true, capabilities)).toBe(Thermostat.SystemMode.FanOnly);
	});

	it('should map opMode 4 (HEAT) to SystemMode.Heat when supported', () => {
		// Act & Assert
		const heatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: true,
		};
		expect(mapOperationModeToSystemMode(4, true, heatCapabilities)).toBe(Thermostat.SystemMode.Heat);
	});

	it('should map opMode 4 (HEAT) to SystemMode.Cool when not supported', () => {
		// Act & Assert
		const noHeatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: false,
		};
		expect(mapOperationModeToSystemMode(4, true, noHeatCapabilities)).toBe(Thermostat.SystemMode.Cool);
	});

	it('should map opMode 5 (AIR_CLEAN) to SystemMode.Auto when heat supported', () => {
		// Act & Assert
		const heatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: true,
		};
		expect(mapOperationModeToSystemMode(5, true, heatCapabilities)).toBe(Thermostat.SystemMode.Auto);
	});

	it('should map opMode 5 (AIR_CLEAN) to SystemMode.Cool when heat not supported', () => {
		// Act & Assert
		const noHeatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: false,
		};
		expect(mapOperationModeToSystemMode(5, true, noHeatCapabilities)).toBe(Thermostat.SystemMode.Cool);
	});

	it('should map opMode 6 (AUTO) to SystemMode.Auto when heat supported', () => {
		// Act & Assert
		const heatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: true,
		};
		expect(mapOperationModeToSystemMode(6, true, heatCapabilities)).toBe(Thermostat.SystemMode.Auto);
	});

	it('should map opMode 6 (AUTO) to SystemMode.Cool when heat not supported', () => {
		// Act & Assert
		const noHeatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: false,
		};
		expect(mapOperationModeToSystemMode(6, true, noHeatCapabilities)).toBe(Thermostat.SystemMode.Cool);
	});

	it('should map unknown opMode to SystemMode.Auto when heat supported', () => {
		// Act & Assert
		const heatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: true,
		};
		expect(mapOperationModeToSystemMode(999, true, heatCapabilities)).toBe(Thermostat.SystemMode.Auto);
	});

	it('should map unknown opMode to SystemMode.Cool when heat not supported', () => {
		// Act & Assert
		const noHeatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: false,
		};
		expect(mapOperationModeToSystemMode(999, true, noHeatCapabilities)).toBe(Thermostat.SystemMode.Cool);
	});

	it('should map undefined opMode to SystemMode.Auto when heat supported', () => {
		// Act & Assert
		const heatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: true,
		};
		expect(mapOperationModeToSystemMode(undefined, true, heatCapabilities)).toBe(Thermostat.SystemMode.Auto);
	});

	it('should map undefined opMode to SystemMode.Cool when heat not supported', () => {
		// Act & Assert
		const noHeatCapabilities: AirConditionerCapabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsHeat: false,
		};
		expect(mapOperationModeToSystemMode(undefined, true, noHeatCapabilities)).toBe(Thermostat.SystemMode.Cool);
	});
});

describe('applyThinqSnapshotToAirConditioner with auxiliary toggles (Phase A)', () => {
	let mockLogger: ReturnType<typeof createMockLogger>;
	let airConditioner: any;
	let capabilities: AirConditionerCapabilities;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = createMockLogger();

		airConditioner = {
			id: 0x01,
			name: 'Living Room AC',
			log: mockLogger,
			updateAttribute: vi.fn().mockResolvedValue(false),
			getChildEndpointById: vi.fn(),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should update jet mode toggle when supportsJetMode is enabled and snapshot has value', async () => {
		// Arrange
		capabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsJetMode: true,
		};

		const mockChild = {
			updateAttribute: vi.fn().mockResolvedValue(false),
		};
		airConditioner.getChildEndpointById.mockReturnValue(mockChild);

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
			'airState.wMode.jet': 1,
		});

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('JetMode');
		expect(mockChild.updateAttribute).toHaveBeenCalledWith(OnOff.id, 'onOff', true, mockLogger);
	});

	it('should update quiet mode toggle when supportsQuietMode is enabled', async () => {
		// Arrange
		capabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsQuietMode: true,
		};

		const mockChild = {
			updateAttribute: vi.fn().mockResolvedValue(false),
		};
		airConditioner.getChildEndpointById.mockReturnValue(mockChild);

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
			'airState.miscFuncState.silentAWHP': 0,
		});

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('QuietMode');
		expect(mockChild.updateAttribute).toHaveBeenCalledWith(OnOff.id, 'onOff', false, mockLogger);
	});

	it('should not update jet mode toggle when supportsJetMode is disabled', async () => {
		// Arrange
		capabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsJetMode: false,
		};

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
			'airState.wMode.jet': 1,
		});

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		expect(airConditioner.getChildEndpointById).not.toHaveBeenCalledWith('JetMode');
	});

	it('should update all enabled auxiliary toggles in a single snapshot', async () => {
		// Arrange
		capabilities = {
			...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
			supportsJetMode: true,
			supportsQuietMode: true,
			supportsEnergySaveMode: true,
			supportsAirCleanMode: true,
			supportsLedControl: true,
		};

		const mockChild = {
			updateAttribute: vi.fn().mockResolvedValue(false),
		};
		airConditioner.getChildEndpointById.mockReturnValue(mockChild);

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0,
			'airState.windStrength': 2,
			'airState.wMode.jet': 1,
			'airState.miscFuncState.silentAWHP': 1,
			'airState.powerSave.basic': 0,
			'airState.wMode.airClean': 1,
			'airState.lightingState.displayControl': 0,
		});

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('JetMode');
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('QuietMode');
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('EnergySaveMode');
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('AirCleanMode');
		expect(airConditioner.getChildEndpointById).toHaveBeenCalledWith('LedLight');
	});

	it('should maintain full regression parity with default capabilities (all toggles disabled)', async () => {
		// Arrange
		capabilities = DEFAULT_AIR_CONDITIONER_CAPABILITIES; // all new flags = false

		const snapshot = new ThinqSnapshot({
			'airState.operation': 1,
			'airState.tempState.current': 22,
			'airState.tempState.target': 24,
			'airState.opMode': 0, // COOL
			'airState.windStrength': 2, // LOW
		});

		const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

		// Act
		await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

		// Assert - only the existing attributes should be updated
		expect(updateAttributeSpy).toHaveBeenCalledWith(OnOff.id, 'onOff', true, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(TemperatureMeasurement.id, 'measuredValue', 2200, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'localTemperature', 2200, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'occupiedCoolingSetpoint', 2400, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'occupiedHeatingSetpoint', 2400, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(
			Thermostat.id,
			'systemMode',
			Thermostat.SystemMode.Cool,
			mockLogger,
		);
		expect(updateAttributeSpy).toHaveBeenCalledWith(FanControl.id, 'fanMode', FanControl.FanMode.Low, mockLogger);
		expect(updateAttributeSpy).toHaveBeenCalledWith(FanControl.id, 'percentCurrent', 20, mockLogger);
		// No child endpoint calls should happen
		expect(airConditioner.getChildEndpointById).not.toHaveBeenCalled();
	});

	describe('applyThinqSnapshotToAirConditioner with rockSetting (Phase B)', () => {
		let mockLogger: ReturnType<typeof createMockLogger>;
		let airConditioner: any;
		let capabilities: AirConditionerCapabilities;

		beforeEach(() => {
			vi.clearAllMocks();
			mockLogger = createMockLogger();

			airConditioner = {
				id: 0x01,
				name: 'Living Room AC',
				log: mockLogger,
				updateAttribute: vi.fn().mockResolvedValue(false),
			};
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should update rockSetting when supportsSwingMode is true with both axes on', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsSwingMode: true,
			};

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
				'airState.wDir.vStep': 100,
				'airState.wDir.hStep': 100,
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert
			expect(updateAttributeSpy).toHaveBeenCalledWith(
				FanControl.id,
				'rockSetting',
				{
					rockLeftRight: true,
					rockUpDown: true,
					rockRound: true,
				},
				mockLogger,
			);
		});

		it('should update rockSetting with vertical swing only', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsSwingMode: true,
			};

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
				'airState.wDir.vStep': 100,
				'airState.wDir.hStep': 0,
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert
			expect(updateAttributeSpy).toHaveBeenCalledWith(
				FanControl.id,
				'rockSetting',
				{
					rockLeftRight: false,
					rockUpDown: true,
					rockRound: false,
				},
				mockLogger,
			);
		});

		it('should update rockSetting with horizontal swing only', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsSwingMode: true,
			};

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
				'airState.wDir.vStep': 0,
				'airState.wDir.hStep': 100,
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert
			expect(updateAttributeSpy).toHaveBeenCalledWith(
				FanControl.id,
				'rockSetting',
				{
					rockLeftRight: true,
					rockUpDown: false,
					rockRound: false,
				},
				mockLogger,
			);
		});

		it('should update rockSetting with both axes off', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsSwingMode: true,
			};

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
				'airState.wDir.vStep': 0,
				'airState.wDir.hStep': 0,
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert
			expect(updateAttributeSpy).toHaveBeenCalledWith(
				FanControl.id,
				'rockSetting',
				{
					rockLeftRight: false,
					rockUpDown: false,
					rockRound: false,
				},
				mockLogger,
			);
		});

		it('should not update rockSetting when supportsSwingMode is false', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsSwingMode: false,
			};

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
				'airState.wDir.vStep': 100,
				'airState.wDir.hStep': 100,
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert
			const rockSettingCalls = updateAttributeSpy.mock.calls.filter(
				(call: any[]) => call[0] === FanControl.id && call[1] === 'rockSetting',
			);
			expect(rockSettingCalls).toHaveLength(0);
		});

		it('should handle string values for swing steps (100 as string)', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsSwingMode: true,
			};

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
				'airState.wDir.vStep': '100',
				'airState.wDir.hStep': '100',
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert
			expect(updateAttributeSpy).toHaveBeenCalledWith(
				FanControl.id,
				'rockSetting',
				{
					rockLeftRight: true,
					rockUpDown: true,
					rockRound: true,
				},
				mockLogger,
			);
		});

		it('should maintain parity with existing attributes when supportsSwingMode is false', async () => {
			// Arrange - regression test: all capabilities at default (false for new features)
			capabilities = DEFAULT_AIR_CONDITIONER_CAPABILITIES;

			const snapshot = new ThinqSnapshot({
				'airState.operation': 1,
				'airState.tempState.current': 22,
				'airState.tempState.target': 24,
				'airState.opMode': 0,
				'airState.windStrength': 2,
			});

			const updateAttributeSpy = vi.spyOn(airConditioner, 'updateAttribute').mockResolvedValue(false);

			// Act
			await applyThinqSnapshotToAirConditioner(airConditioner, snapshot, capabilities, mockLogger);

			// Assert - existing attributes unchanged
			expect(updateAttributeSpy).toHaveBeenCalledWith(OnOff.id, 'onOff', true, mockLogger);
			expect(updateAttributeSpy).toHaveBeenCalledWith(TemperatureMeasurement.id, 'measuredValue', 2200, mockLogger);
			expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'localTemperature', 2200, mockLogger);
			expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'occupiedCoolingSetpoint', 2400, mockLogger);
			expect(updateAttributeSpy).toHaveBeenCalledWith(Thermostat.id, 'occupiedHeatingSetpoint', 2400, mockLogger);
			expect(updateAttributeSpy).toHaveBeenCalledWith(
				Thermostat.id,
				'systemMode',
				Thermostat.SystemMode.Cool,
				mockLogger,
			);
			expect(updateAttributeSpy).toHaveBeenCalledWith(FanControl.id, 'fanMode', FanControl.FanMode.Low, mockLogger);
			expect(updateAttributeSpy).toHaveBeenCalledWith(FanControl.id, 'percentCurrent', 20, mockLogger);
			// rockSetting should NOT be called
			const rockSettingCalls = updateAttributeSpy.mock.calls.filter(
				(call: any[]) => call[0] === FanControl.id && call[1] === 'rockSetting',
			);
			expect(rockSettingCalls).toHaveLength(0);
		});
	});
});
