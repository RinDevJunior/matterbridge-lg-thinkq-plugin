import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThinqAirConditionerDevice } from '../../../core/domain/entities/ThinqDevice.js';
import type { ThinqSceneButtonConfig } from '../../../model/LgThinkqPluginPlatformConfig.js';
import {
	addSceneButtonEndpoints,
	registerSceneButtonCommandHandlers,
} from '../../../platform/thinq/thinqAirConditionerSceneButtons.js';
import type { ThinqApiClient } from '../../../services/thinq/thinqApiClient.js';
import { asPartial, createMockLogger } from '../../helpers/testUtils.js';

function createChainableMock() {
	return {
		createDefaultIdentifyClusterServer: vi.fn().mockReturnThis(),
		createDefaultMomentarySwitchClusterServer: vi.fn().mockReturnThis(),
		addCommandHandler: vi.fn().mockReturnThis(),
	};
}

function createMockAirConditioner() {
	const childMocks: Record<string, any> = {};

	const addChildDeviceTypeMock = vi.fn(function (name: string, deviceType: any[]) {
		const childEndpoint = createChainableMock();
		childMocks[name] = childEndpoint;
		return childEndpoint;
	});

	const getChildEndpointByIdMock = vi.fn((name: string) => childMocks[name]);

	return {
		addChildDeviceType: addChildDeviceTypeMock,
		getChildEndpointById: getChildEndpointByIdMock,
		log: {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		},
		_childMocks: childMocks,
	};
}

function createMockDevice(): ThinqAirConditionerDevice {
	return asPartial<ThinqAirConditionerDevice>({
		id: 'device-123',
		name: 'Living Room AC',
		type: 'AC',
	});
}

function createMockApiClient(): ThinqApiClient {
	return asPartial<ThinqApiClient>({
		sendCommand: vi.fn().mockResolvedValue(undefined),
	});
}

describe('thinqAirConditionerSceneButtons', () => {
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockAirConditioner: any;
	let mockDevice: ThinqAirConditionerDevice;
	let mockApiClient: ThinqApiClient;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = createMockLogger();
		mockAirConditioner = createMockAirConditioner();
		mockDevice = createMockDevice();
		mockApiClient = createMockApiClient();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('addSceneButtonEndpoints', () => {
		it('should not add any endpoints when buttons array is empty', () => {
			// Act
			addSceneButtonEndpoints(mockAirConditioner, []);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).not.toHaveBeenCalled();
		});

		it('should not add any endpoints when buttons is undefined', () => {
			// Act
			addSceneButtonEndpoints(mockAirConditioner, undefined as unknown as ThinqSceneButtonConfig[]);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).not.toHaveBeenCalled();
		});

		it('should add one genericSwitch endpoint for a single button', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'PowerOff', opMode: 0 }];

			// Act
			addSceneButtonEndpoints(mockAirConditioner, buttons);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenCalledTimes(1);
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenCalledWith('PowerOff', expect.any(Array));
		});

		it('should add multiple genericSwitch endpoints for multiple buttons', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [
				{ name: 'PowerOff', opMode: 0 },
				{ name: 'Cool26', opMode: 1 },
				{ name: 'Sleep', opMode: 2 },
			];

			// Act
			addSceneButtonEndpoints(mockAirConditioner, buttons);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenCalledTimes(3);
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(1, 'PowerOff', expect.any(Array));
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(2, 'Cool26', expect.any(Array));
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(3, 'Sleep', expect.any(Array));
		});

		it('should sanitize endpoint names by removing spaces', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'Power Off', opMode: 0 }];

			// Act
			addSceneButtonEndpoints(mockAirConditioner, buttons);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenCalledWith('PowerOff', expect.any(Array));
		});

		it('should deduplicate sanitized endpoint names with index suffix', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [
				{ name: 'Power Off', opMode: 0 },
				{ name: 'PowerOff', opMode: 1 },
			];

			// Act
			addSceneButtonEndpoints(mockAirConditioner, buttons);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(1, 'PowerOff', expect.any(Array));
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(2, 'PowerOff1', expect.any(Array));
		});

		it('should handle multiple duplicate collisions independently', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [
				{ name: 'Scene1', opMode: 0 },
				{ name: 'Scene1', opMode: 1 },
				{ name: 'Scene2', opMode: 2 },
				{ name: 'Scene 2', opMode: 3 },
			];

			// Act
			addSceneButtonEndpoints(mockAirConditioner, buttons);

			// Assert
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(1, 'Scene1', expect.any(Array));
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(2, 'Scene11', expect.any(Array));
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(3, 'Scene2', expect.any(Array));
			expect(mockAirConditioner.addChildDeviceType).toHaveBeenNthCalledWith(4, 'Scene23', expect.any(Array));
		});

		it('should chain createDefaultIdentifyClusterServer and createDefaultMomentarySwitchClusterServer', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'PowerOff', opMode: 0 }];

			// Act
			addSceneButtonEndpoints(mockAirConditioner, buttons);

			// Assert
			const childEndpoint = mockAirConditioner._childMocks['PowerOff'];
			expect(childEndpoint.createDefaultIdentifyClusterServer).toHaveBeenCalled();
			expect(childEndpoint.createDefaultMomentarySwitchClusterServer).toHaveBeenCalled();
		});
	});

	describe('registerSceneButtonCommandHandlers', () => {
		it('should not register handlers when buttons array is empty', () => {
			// Act
			registerSceneButtonCommandHandlers(mockAirConditioner, [], mockDevice, mockApiClient, mockLogger);

			// Assert
			expect(mockApiClient.sendCommand).not.toHaveBeenCalled();
		});

		it('should not register handlers when buttons is undefined', () => {
			// Act
			registerSceneButtonCommandHandlers(
				mockAirConditioner,
				undefined as unknown as ThinqSceneButtonConfig[],
				mockDevice,
				mockApiClient,
				mockLogger,
			);

			// Assert
			expect(mockApiClient.sendCommand).not.toHaveBeenCalled();
		});

		it('should register toggle command handler for a single button', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'PowerOff', opMode: 0 }];

			// First, set up the mock to have the child endpoint
			const childEndpoint = createChainableMock();
			vi.mocked(mockAirConditioner.getChildEndpointById).mockReturnValue(childEndpoint);

			// Act
			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Assert
			expect(childEndpoint.addCommandHandler).toHaveBeenCalledWith('toggle', expect.any(Function));
		});

		it('should send command with correct dataKey and opMode on button press', async () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'PowerOff', opMode: 0 }];
			const childEndpoint = createChainableMock();
			vi.mocked(mockAirConditioner.getChildEndpointById).mockReturnValue(childEndpoint);

			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Act
			const toggleHandler = vi.mocked(childEndpoint.addCommandHandler).mock.calls[0]?.[1];
			if (toggleHandler) {
				await toggleHandler();
			}

			// Assert
			expect(vi.mocked(mockApiClient.sendCommand)).toHaveBeenCalledWith('device-123', {
				dataKey: 'airState.opMode',
				dataValue: 0,
			});
		});

		it('should send correct opMode for multiple buttons independently', async () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [
				{ name: 'PowerOff', opMode: 0 },
				{ name: 'Cool26', opMode: 1 },
			];

			const powerOffChild = createChainableMock();
			const cool26Child = createChainableMock();

			vi.mocked(mockAirConditioner.getChildEndpointById).mockImplementation((name: string) => {
				if (name === 'PowerOff') return powerOffChild;
				if (name === 'Cool26') return cool26Child;
				return undefined;
			});

			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Act
			const powerOffHandler = vi.mocked(powerOffChild.addCommandHandler).mock.calls[0]?.[1];
			const cool26Handler = vi.mocked(cool26Child.addCommandHandler).mock.calls[0]?.[1];

			if (powerOffHandler) await powerOffHandler();
			if (cool26Handler) await cool26Handler();

			// Assert
			expect(vi.mocked(mockApiClient.sendCommand)).toHaveBeenCalledTimes(2);
			expect(vi.mocked(mockApiClient.sendCommand)).toHaveBeenNthCalledWith(1, 'device-123', {
				dataKey: 'airState.opMode',
				dataValue: 0,
			});
			expect(vi.mocked(mockApiClient.sendCommand)).toHaveBeenNthCalledWith(2, 'device-123', {
				dataKey: 'airState.opMode',
				dataValue: 1,
			});
		});

		it('should log debug message on button press', async () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'PowerOff', opMode: 0 }];
			const childEndpoint = createChainableMock();
			vi.mocked(mockAirConditioner.getChildEndpointById).mockReturnValue(childEndpoint);

			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Act
			const toggleHandler = vi.mocked(childEndpoint.addCommandHandler).mock.calls[0]?.[1];
			if (toggleHandler) {
				await toggleHandler();
			}

			// Assert
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining("scene button 'PowerOff' (opMode=0) handler invoked"),
			);
		});

		it('should log error when command fails', async () => {
			// Arrange
			const testError = new Error('Command failed');
			vi.mocked(mockApiClient.sendCommand).mockRejectedValueOnce(testError);

			const buttons: ThinqSceneButtonConfig[] = [{ name: 'PowerOff', opMode: 0 }];
			const childEndpoint = createChainableMock();
			vi.mocked(mockAirConditioner.getChildEndpointById).mockReturnValue(childEndpoint);

			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Act
			const toggleHandler = vi.mocked(childEndpoint.addCommandHandler).mock.calls[0]?.[1];
			let caughtError: Error | undefined;
			if (toggleHandler) {
				try {
					await toggleHandler();
				} catch (error) {
					caughtError = error as Error;
				}
			}

			// Assert
			expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("scene button 'PowerOff' command failed"));
			expect(caughtError).toBe(testError);
		});

		it('should skip handler registration when child endpoint not found', () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [{ name: 'MissingButton', opMode: 0 }];
			// Simulate child not found by returning undefined
			vi.mocked(mockAirConditioner.getChildEndpointById).mockReturnValue(undefined);

			// Act
			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Assert
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining("scene button endpoint 'MissingButton' not found"),
			);
		});

		it('should handle deduplication during handler registration', async () => {
			// Arrange
			const buttons: ThinqSceneButtonConfig[] = [
				{ name: 'Scene1', opMode: 0 },
				{ name: 'Scene1', opMode: 1 },
			];

			// Set up mocks to return child endpoints with deduped names
			const childEndpoint1 = createChainableMock();
			const childEndpoint2 = createChainableMock();
			vi.mocked(mockAirConditioner.getChildEndpointById).mockImplementation((name: string) => {
				if (name === 'Scene1') return childEndpoint1;
				if (name === 'Scene11') return childEndpoint2;
				return undefined;
			});

			// Act
			registerSceneButtonCommandHandlers(mockAirConditioner, buttons, mockDevice, mockApiClient, mockLogger);

			// Get the handlers
			const handler1 = vi.mocked(childEndpoint1.addCommandHandler).mock.calls[0]?.[1];
			const handler2 = vi.mocked(childEndpoint2.addCommandHandler).mock.calls[0]?.[1];

			if (handler1) await handler1();
			if (handler2) await handler2();

			// Assert
			expect(vi.mocked(mockApiClient.sendCommand)).toHaveBeenNthCalledWith(1, 'device-123', {
				dataKey: 'airState.opMode',
				dataValue: 0,
			});
			expect(vi.mocked(mockApiClient.sendCommand)).toHaveBeenNthCalledWith(2, 'device-123', {
				dataKey: 'airState.opMode',
				dataValue: 1,
			});
		});
	});
});
