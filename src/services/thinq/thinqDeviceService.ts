import { AnsiLogger } from 'matterbridge/logger';

import { isValidThinqDeviceId, ThinqDevice, toThinqDevice } from '../../core/domain/entities/ThinqDevice.js';
import type { ThinqSnapshot } from '../../core/domain/value-objects/ThinqSnapshot.js';
import { ThinqApiClient } from './thinqApiClient.js';

export type ThinqDeviceUpdateListener = (deviceId: string, snapshot: ThinqSnapshot) => void;

/**
 * Discovers ThinQ devices and polls their state. Phase 1 is polling-only (no MQTT) — ports
 * `pollThinQ2Devices()`'s full-refetch-per-tick approach (`platformMonitor.ts:104-123`).
 */
export class ThinqDeviceService {
	private pollTimer: NodeJS.Timeout | undefined;
	private pollTickCount = 0;

	constructor(
		private readonly apiClient: ThinqApiClient,
		private readonly logger: AnsiLogger,
	) {}

	/** Fetches every device on the account and maps it to the generic `ThinqDevice` domain entity. */
	public async discoverDevices(): Promise<ThinqDevice[]> {
		const rawDevices = await this.apiClient.getListDevices();

		return rawDevices.filter((device) => isValidThinqDeviceId(device.deviceId)).map((device) => toThinqDevice(device));
	}

	public startPolling(intervalMs: number, onUpdate: ThinqDeviceUpdateListener): void {
		this.stopPolling();
		this.pollTickCount = 0;
		this.logger.debug(`ThinQ polling: starting with interval=${intervalMs}ms`);
		this.pollTimer = setInterval(() => {
			void this.pollOnce(onUpdate);
		}, intervalMs);
	}

	public stopPolling(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = undefined;
			this.logger.debug(`ThinQ polling: stopped after ${this.pollTickCount} tick(s)`);
		}
	}

	private async pollOnce(onUpdate: ThinqDeviceUpdateListener): Promise<void> {
		this.pollTickCount += 1;
		this.logger.debug(`ThinQ polling: tick #${this.pollTickCount} at ${new Date().toISOString()}`);
		try {
			const devices = await this.discoverDevices();
			for (const device of devices) {
				onUpdate(device.id, device.snapshot);
			}
		} catch (error) {
			this.logger.error(`ThinQ polling tick failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
