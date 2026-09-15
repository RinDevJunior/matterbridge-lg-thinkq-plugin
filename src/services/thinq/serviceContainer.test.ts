import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LocalStorage } from 'node-persist';

import { asPartial, createMockLogger } from '../../tests/helpers/testUtils.js';
import type { PlatformConfigManager } from '../../platform/platformConfigManager.js';
import { ThinqServiceContainer } from './serviceContainer.js';

describe('ThinqServiceContainer', () => {
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockPersist: LocalStorage;
	let mockConfigManager: PlatformConfigManager;
	let container: ThinqServiceContainer;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = createMockLogger();
		mockPersist = asPartial<LocalStorage>({
			getItem: vi.fn(),
			setItem: vi.fn(),
		});
		mockConfigManager = asPartial<PlatformConfigManager>({
			country: 'US',
			language: 'en',
		});
		container = new ThinqServiceContainer(mockLogger, mockPersist, mockConfigManager, '/tmp/mqtt');
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getMqttListener', () => {
		it('should return a ThinqMqttListener instance', () => {
			const listener = container.getMqttListener();

			expect(listener).toBeDefined();
			expect(listener).toHaveProperty('start');
			expect(listener).toHaveProperty('stop');
		});

		it('should return the same instance on repeated calls (singleton)', () => {
			const listener1 = container.getMqttListener();
			const listener2 = container.getMqttListener();

			expect(listener1).toBe(listener2);
		});

		it('should pass the mqttCertDir to the listener instance', () => {
			const mqttDir = '/custom/mqtt/dir';
			const customContainer = new ThinqServiceContainer(mockLogger, mockPersist, mockConfigManager, mqttDir);

			const listener = customContainer.getMqttListener();

			expect(listener).toBeDefined();
			// Verify by checking the private mqttDir field (if accessible, or through behavior)
			expect(listener['mqttDir']).toBe(mqttDir);
		});

		it('should use the apiClient instance for the listener', () => {
			const listener = container.getMqttListener();

			expect(listener['apiClient']).toBe(container.apiClient);
		});

		it('should use the correct logger for the listener', () => {
			const listener = container.getMqttListener();

			expect(listener['logger']).toBe(mockLogger);
		});
	});
});
