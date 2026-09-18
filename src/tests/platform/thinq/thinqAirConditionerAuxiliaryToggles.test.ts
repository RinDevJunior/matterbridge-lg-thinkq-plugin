import { OnOff, Thermostat } from 'matterbridge/matter/clusters';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThinqAirConditionerDevice } from '../../../core/domain/entities/ThinqDevice.js';
import type { AirConditionerCapabilities } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
import { DEFAULT_AIR_CONDITIONER_CAPABILITIES } from '../../../core/domain/value-objects/AirConditionerCapabilities.js';
import { ThinqSnapshot } from '../../../core/domain/value-objects/ThinqSnapshot.js';
import {
	addAuxiliaryToggleEndpoints,
	applyAuxiliaryToggleSnapshot,
	registerAuxiliaryToggleCommandHandlers,
} from '../../../platform/thinq/thinqAirConditionerAuxiliaryToggles.js';
import { ThinqApiClient } from '../../../services/thinq/thinqApiClient.js';
import { asPartial, createMockLogger } from '../../helpers/testUtils.js';

function createMockEndpoint() {
	const mockChild = {
		updateAttribute: vi.fn().mockResolvedValue(false),
		addCommandHandler: vi.fn(),
		log: createMockLogger(),
	};

	return {
		addChildDeviceType: vi.fn().mockReturnValue({
			createDefaultIdentifyClusterServer: vi.fn().mockReturnValue({
				createDefaultOnOffClusterServer: vi.fn().mockReturnThis(),
			}),
		}),
		getChildEndpointById: vi.fn(),
		getAttribute: vi.fn(),
		log: createMockLogger(),
		mockChild,
	};
}

function createMockApiClient(): ThinqApiClient {
	return asPartial<ThinqApiClient>({
		sendCommand: vi.fn().mockResolvedValue(undefined),
	});
}

describe('thinqAirConditionerAuxiliaryToggles', () => {
	let mockEndpoint: any;
	let mockApiClient: ThinqApiClient;
	let mockLogger: ReturnType<typeof createMockLogger>;
	let capabilities: AirConditionerCapabilities;
	let mockDevice: ThinqAirConditionerDevice;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEndpoint = createMockEndpoint();
		mockApiClient = createMockApiClient();
		mockLogger = createMockLogger();
		capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES };
		mockDevice = asPartial<ThinqAirConditionerDevice>({
			id: 'device-123',
			name: 'Living Room AC',
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('addAuxiliaryToggleEndpoints', () => {
		it('should add all 5 child endpoints when all capabilities are enabled', () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsQuietMode: true,
				supportsEnergySaveMode: true,
				supportsAirCleanMode: true,
				supportsLedControl: true,
			};

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledTimes(5);
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('JetMode', expect.any(Array));
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('QuietMode', expect.any(Array));
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('EnergySaveMode', expect.any(Array));
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('AirCleanMode', expect.any(Array));
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('LedLight', expect.any(Array));
		});

		it('should add no child endpoints when all capabilities are disabled', () => {
			// Arrange - all default to false
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES };

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).not.toHaveBeenCalled();
		});

		it('should add only JetMode endpoint when supportsJetMode is enabled', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledTimes(1);
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('JetMode', expect.any(Array));
		});

		it('should add only QuietMode endpoint when supportsQuietMode is enabled', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsQuietMode: true };

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledTimes(1);
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('QuietMode', expect.any(Array));
		});

		it('should add only EnergySaveMode endpoint when supportsEnergySaveMode is enabled', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsEnergySaveMode: true };

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledTimes(1);
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('EnergySaveMode', expect.any(Array));
		});

		it('should add only AirCleanMode endpoint when supportsAirCleanMode is enabled', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsAirCleanMode: true };

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledTimes(1);
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('AirCleanMode', expect.any(Array));
		});

		it('should add only LedLight endpoint when supportsLedControl is enabled', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsLedControl: true };

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledTimes(1);
			expect(mockEndpoint.addChildDeviceType).toHaveBeenCalledWith('LedLight', expect.any(Array));
		});

		it('should chain cluster server calls correctly', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			const mockIdentifyChain = {
				createDefaultOnOffClusterServer: vi.fn().mockReturnThis(),
			};
			const mockAddChain = {
				createDefaultIdentifyClusterServer: vi.fn().mockReturnValue(mockIdentifyChain),
			};
			mockEndpoint.addChildDeviceType.mockReturnValue(mockAddChain);

			// Act
			addAuxiliaryToggleEndpoints(mockEndpoint, capabilities);

			// Assert
			expect(mockAddChain.createDefaultIdentifyClusterServer).toHaveBeenCalled();
			expect(mockIdentifyChain.createDefaultOnOffClusterServer).toHaveBeenCalledWith(false);
		});
	});

	describe('registerAuxiliaryToggleCommandHandlers', () => {
		beforeEach(() => {
			// Set up getChildEndpointById to return the mock child
			mockEndpoint.getChildEndpointById.mockReturnValue(mockEndpoint.mockChild);
		});

		it('should register handlers for all 5 toggles when all capabilities are enabled', () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsQuietMode: true,
				supportsEnergySaveMode: true,
				supportsAirCleanMode: true,
				supportsLedControl: true,
			};

			// Act
			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			// Assert
			expect(mockEndpoint.mockChild.addCommandHandler).toHaveBeenCalledTimes(10); // on + off for each of 5
		});

		it('should not register handlers when all capabilities are disabled', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES };

			// Act
			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			// Assert
			expect(mockEndpoint.mockChild.addCommandHandler).not.toHaveBeenCalled();
		});

		it('should skip handler registration when child endpoint is not found', () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			mockEndpoint.getChildEndpointById.mockReturnValueOnce(undefined);

			// Act
			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			// Assert
			expect(mockEndpoint.mockChild.addCommandHandler).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("child endpoint 'JetMode' not found"));
		});

		it('should send jet mode command when handler is invoked with device powered on and in Cool mode', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true; // power on
				if (attr === 'systemMode') return Thermostat.SystemMode.Cool;
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			// Get the handler that was registered
			const onCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'on');
			expect(onCall).toBeDefined();
			if (!onCall) return;
			const onHandler = onCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act
			await onHandler(true, false);

			// Assert
			expect(mockApiClient.sendCommand).toHaveBeenCalledWith(mockDevice.id, {
				dataKey: 'airState.wMode.jet',
				dataValue: 1,
			});
		});

		it('should revert toggle when power is off (Cool-mode gate)', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return false; // power off
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			const onCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'on');
			if (!onCall) return;
			const onHandler = onCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act
			await onHandler(true, false);

			// Assert
			expect(mockApiClient.sendCommand).not.toHaveBeenCalled();
		});

		it('should revert toggle when system mode is not Cool (Cool-mode gate)', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsQuietMode: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true; // power on
				if (attr === 'systemMode') return Thermostat.SystemMode.Heat; // not Cool
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			const onCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'on');
			if (!onCall) return;
			const onHandler = onCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act
			await onHandler(true, false);

			// Assert
			expect(mockApiClient.sendCommand).not.toHaveBeenCalled();
		});

		it('should send LED command when handler is invoked with device powered on (no Cool-mode gate)', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsLedControl: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true; // power on
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			const onCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'on');
			if (!onCall) return;
			const onHandler = onCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act
			await onHandler(true, false);

			// Assert
			expect(mockApiClient.sendCommand).toHaveBeenCalledWith(mockDevice.id, {
				dataKey: 'airState.lightingState.displayControl',
				dataValue: 1,
			});
		});

		it('should send LED command regardless of power state (no gate)', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsLedControl: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return false; // power off
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			const onCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'on');
			if (!onCall) return;
			const onHandler = onCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act
			await onHandler(true, false);

			// Assert - LED has no gate, so it sends even if power is off
			expect(mockApiClient.sendCommand).toHaveBeenCalledWith(mockDevice.id, {
				dataKey: 'airState.lightingState.displayControl',
				dataValue: 1,
			});
		});

		it('should send off command with dataValue 0', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true;
				if (attr === 'systemMode') return Thermostat.SystemMode.Cool;
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			const offCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'off');
			if (!offCall) return;
			const offHandler = offCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act
			await offHandler(false, true);

			// Assert
			expect(mockApiClient.sendCommand).toHaveBeenCalledWith(mockDevice.id, {
				dataKey: 'airState.wMode.jet',
				dataValue: 0,
			});
		});

		it('should throw error after reverting on sendCommand failure', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true;
				if (attr === 'systemMode') return Thermostat.SystemMode.Cool;
				return undefined;
			});

			const apiError = new Error('Network error');
			vi.mocked(mockApiClient.sendCommand).mockRejectedValue(apiError);

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			const onCall = vi
				.mocked(mockEndpoint.mockChild.addCommandHandler)
				.mock.calls.find((call: unknown[]) => call[0] === 'on');
			if (!onCall) return;
			const onHandler = onCall[1] as (newValue: boolean, oldValue: boolean) => Promise<void>;

			// Act & Assert
			await expect(onHandler(true, false)).rejects.toThrow('Network error');
		});

		it('should register correct dataKey for each toggle', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsQuietMode: true,
				supportsEnergySaveMode: true,
				supportsAirCleanMode: true,
			};
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true;
				if (attr === 'systemMode') return Thermostat.SystemMode.Cool;
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);

			// Simulate calling handlers for each toggle
			const handlers = vi.mocked(mockEndpoint.mockChild.addCommandHandler).mock.calls;
			const jetHandlers = handlers.filter((call: unknown[]) => call[0] === 'on').slice(0, 1);
			const quietHandlers = handlers.filter((call: unknown[]) => call[0] === 'on').slice(1, 2);
			const energyHandlers = handlers.filter((call: unknown[]) => call[0] === 'on').slice(2, 3);
			const airCleanHandlers = handlers.filter((call: unknown[]) => call[0] === 'on').slice(3, 4);

			// Act - call jet handler
			if (!jetHandlers[0]) return;
			await (jetHandlers[0][1] as (newValue: boolean, oldValue: boolean) => Promise<void>)(true, false);

			// Assert
			const jetCall = vi.mocked(mockApiClient.sendCommand).mock.calls[0];
			expect(jetCall[1].dataKey).toBe('airState.wMode.jet');

			// Clear and test quiet handler
			vi.clearAllMocks();
			mockEndpoint.getAttribute.mockImplementation((clusterId: unknown, attr: unknown) => {
				if (attr === 'onOff') return true;
				if (attr === 'systemMode') return Thermostat.SystemMode.Cool;
				return undefined;
			});

			registerAuxiliaryToggleCommandHandlers(mockEndpoint, mockDevice, mockApiClient, mockLogger, capabilities);
			const newHandlers = vi.mocked(mockEndpoint.mockChild.addCommandHandler).mock.calls;
			const newQuietHandlers = newHandlers.filter((call: unknown[]) => call[0] === 'on').slice(1, 2);
			if (!newQuietHandlers[0]) return;
			await (newQuietHandlers[0][1] as (newValue: boolean, oldValue: boolean) => Promise<void>)(true, false);

			const quietCall = vi.mocked(mockApiClient.sendCommand).mock.calls[0];
			expect(quietCall[1].dataKey).toBe('airState.miscFuncState.silentAWHP');
		});
	});

	describe('applyAuxiliaryToggleSnapshot', () => {
		beforeEach(() => {
			mockEndpoint.getChildEndpointById.mockReturnValue(mockEndpoint.mockChild);
		});

		it('should update all child endpoints when all capabilities are enabled and snapshot values are true', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsQuietMode: true,
				supportsEnergySaveMode: true,
				supportsAirCleanMode: true,
				supportsLedControl: true,
			};
			const snapshot = new ThinqSnapshot({
				'airState.wMode.jet': 1,
				'airState.miscFuncState.silentAWHP': 1,
				'airState.powerSave.basic': 1,
				'airState.wMode.airClean': 1,
				'airState.lightingState.displayControl': 1,
			});

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledTimes(5);
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledWith(OnOff.id, 'onOff', true, mockLogger);
		});

		it('should not update any child endpoints when all capabilities are disabled', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES };
			const snapshot = new ThinqSnapshot({
				'airState.wMode.jet': 1,
				'airState.miscFuncState.silentAWHP': 1,
				'airState.powerSave.basic': 1,
				'airState.wMode.airClean': 1,
				'airState.lightingState.displayControl': 1,
			});

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).not.toHaveBeenCalled();
		});

		it('should skip updating child endpoint when it is not found', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			mockEndpoint.getChildEndpointById.mockReturnValue(undefined);
			const snapshot = new ThinqSnapshot({ 'airState.wMode.jet': 1 });

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).not.toHaveBeenCalled();
		});

		it('should push false value when snapshot value is 0', async () => {
			// Arrange
			capabilities = { ...DEFAULT_AIR_CONDITIONER_CAPABILITIES, supportsJetMode: true };
			const snapshot = new ThinqSnapshot({ 'airState.wMode.jet': 0 });

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledWith(OnOff.id, 'onOff', false, mockLogger);
		});

		it('should update individual toggles independently', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsQuietMode: true,
			};
			const snapshot = new ThinqSnapshot({
				'airState.wMode.jet': 1,
				'airState.miscFuncState.silentAWHP': 0,
			});

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledTimes(2);
		});

		it('should handle missing child endpoint gracefully', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsQuietMode: true,
			};
			const snapshot = new ThinqSnapshot({
				'airState.wMode.jet': 1,
				'airState.miscFuncState.silentAWHP': 1,
			});

			// Mock: JetMode found, QuietMode not found
			mockEndpoint.getChildEndpointById.mockImplementation((name: string) => {
				return name === 'JetMode' ? mockEndpoint.mockChild : undefined;
			});

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledTimes(1);
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledWith(OnOff.id, 'onOff', true, mockLogger);
		});

		it('should update LED toggle independently from Cool-gated toggles', async () => {
			// Arrange
			capabilities = {
				...DEFAULT_AIR_CONDITIONER_CAPABILITIES,
				supportsJetMode: true,
				supportsLedControl: true,
			};
			const snapshot = new ThinqSnapshot({
				'airState.wMode.jet': 1,
				'airState.lightingState.displayControl': 0,
			});

			// Act
			await applyAuxiliaryToggleSnapshot(mockEndpoint, snapshot, capabilities, mockLogger);

			// Assert
			expect(mockEndpoint.mockChild.updateAttribute).toHaveBeenCalledTimes(2);
			// Check that both are called (gating happens only in command handlers, not in state sync)
		});
	});
});
