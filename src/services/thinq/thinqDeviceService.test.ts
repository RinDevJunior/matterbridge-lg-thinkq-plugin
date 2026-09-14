import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asPartial, buildThinqDeviceData, createMockLogger } from '../../tests/helpers/testUtils.js';
import type { ThinqApiClient } from './thinqApiClient.js';
import { ThinqDeviceService } from './thinqDeviceService.js';

describe('ThinqDeviceService', () => {
	let mockApiClient: ThinqApiClient;
	let mockLogger: ReturnType<typeof createMockLogger>;
	let service: ThinqDeviceService;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockLogger = createMockLogger();
		mockApiClient = asPartial<ThinqApiClient>({
			getListDevices: vi.fn(),
		});
		service = new ThinqDeviceService(mockApiClient, mockLogger);
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('discoverDevices', () => {
		it('should return empty array when no devices found', async () => {
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue([]);

			const result = await service.discoverDevices();

			expect(result).toEqual([]);
		});

		it('should filter out devices with invalid IDs', async () => {
			const devices = [
				buildThinqDeviceData({ deviceId: '12345678-1234-1234-1234-123456789012' }),
				buildThinqDeviceData({ deviceId: 'invalid-id' }),
				buildThinqDeviceData({ deviceId: '87654321-4321-4321-4321-210987654321' }),
			];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);

			const result = await service.discoverDevices();

			expect(result).toHaveLength(2);
			expect(
				result.every((d) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(d.id)),
			).toBe(true);
		});

		it('should map raw devices to ThinqDevice entities', async () => {
			const devices = [
				buildThinqDeviceData({ deviceId: '12345678-1234-1234-1234-123456789012', alias: 'Living Room AC' }),
				buildThinqDeviceData({ deviceId: '87654321-4321-4321-4321-210987654321', alias: 'Bedroom AC' }),
			];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);

			const result = await service.discoverDevices();

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Living Room AC');
			expect(result[1].name).toBe('Bedroom AC');
		});

		it('should propagate getListDevices errors', async () => {
			const error = new Error('API call failed');
			vi.mocked(mockApiClient.getListDevices).mockRejectedValue(error);

			await expect(service.discoverDevices()).rejects.toThrow('API call failed');
		});
	});

	describe('startPolling and stopPolling', () => {
		it('should set interval and call onUpdate with device snapshots', async () => {
			const devices = [buildThinqDeviceData({ deviceId: '12345678-1234-1234-1234-123456789012' })];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);

			// Advance timer to trigger first poll
			await vi.advanceTimersByTimeAsync(1000);

			expect(onUpdate).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012', expect.any(Object));
		});

		it('should clear prior timer when startPolling called twice', async () => {
			const devices = [buildThinqDeviceData()];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);
			service.startPolling(1000, onUpdate);

			// Only one timer should be active
			await vi.advanceTimersByTimeAsync(1000);

			expect(onUpdate).toHaveBeenCalledTimes(1);
		});

		it('should stop polling and clear timer', async () => {
			const devices = [buildThinqDeviceData()];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);
			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(1);

			service.stopPolling();
			await vi.advanceTimersByTimeAsync(1000);

			// Should not have been called again after stopPolling
			expect(onUpdate).toHaveBeenCalledTimes(1);
		});

		it('should handle stopPolling when no timer is active', () => {
			// Should not throw
			expect(() => service.stopPolling()).not.toThrow();
		});

		it('should call onUpdate for each discovered device', async () => {
			const devices = [
				buildThinqDeviceData({ deviceId: '11111111-1111-1111-1111-111111111111' }),
				buildThinqDeviceData({ deviceId: '22222222-2222-2222-2222-222222222222' }),
				buildThinqDeviceData({ deviceId: '33333333-3333-3333-3333-333333333333' }),
			];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);
			await vi.advanceTimersByTimeAsync(1000);

			expect(onUpdate).toHaveBeenCalledTimes(3);
		});

		it('should continue polling on interval', async () => {
			const devices = [buildThinqDeviceData()];
			vi.mocked(mockApiClient.getListDevices).mockResolvedValue(devices);
			const onUpdate = vi.fn();

			service.startPolling(500, onUpdate);

			await vi.advanceTimersByTimeAsync(500);
			expect(onUpdate).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(500);
			expect(onUpdate).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(500);
			expect(onUpdate).toHaveBeenCalledTimes(3);

			service.stopPolling();
		});
	});

	describe('pollOnce', () => {
		it('should swallow and log errors from discoverDevices', async () => {
			const error = new Error('Discovery failed');
			vi.mocked(mockApiClient.getListDevices).mockRejectedValue(error);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('ThinQ polling tick failed'));
			expect(onUpdate).not.toHaveBeenCalled();
			service.stopPolling();
		});

		it('should log error message with original error details', async () => {
			const error = new Error('Network timeout');
			vi.mocked(mockApiClient.getListDevices).mockRejectedValue(error);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Network timeout'));
			service.stopPolling();
		});

		it('should handle non-Error exceptions gracefully', async () => {
			vi.mocked(mockApiClient.getListDevices).mockRejectedValue('String error');
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockLogger.error).toHaveBeenCalled();
			expect(onUpdate).not.toHaveBeenCalled();
			service.stopPolling();
		});

		it('should continue polling even after an error', async () => {
			const devices = [buildThinqDeviceData()];
			vi.mocked(mockApiClient.getListDevices)
				.mockRejectedValueOnce(new Error('First poll failed'))
				.mockResolvedValueOnce(devices);
			const onUpdate = vi.fn();

			service.startPolling(1000, onUpdate);

			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(1);

			service.stopPolling();
		});
	});
});
