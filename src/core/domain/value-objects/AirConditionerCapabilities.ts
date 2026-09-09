import type { ThinqDeviceConfigEntry } from '../../../model/LgThinkqPluginPlatformConfig.js';

/** Resolved per-device Matter capability set for a ThinQ AirConditioner endpoint. */
export interface AirConditionerCapabilities {
	readonly supportsHeat: boolean;
	readonly supportsDry: boolean;
	readonly supportsFanSpeedControl: boolean;
}

export const DEFAULT_AIR_CONDITIONER_CAPABILITIES: AirConditionerCapabilities = {
	supportsHeat: true,
	supportsDry: true,
	supportsFanSpeedControl: true,
};

/**
 * Merges configured per-device capability flags over the full-support default.
 * Missing device entry or missing flag defaults to `true` (matches today's behavior).
 */
export function resolveAirConditionerCapabilities(
	devices: ThinqDeviceConfigEntry[] | undefined,
	deviceId: string,
): AirConditionerCapabilities {
	const entry = devices?.find((device) => device.deviceId === deviceId);
	const capabilities = entry?.capabilities;

	return {
		supportsHeat: capabilities?.supportsHeat ?? DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsHeat,
		supportsDry: capabilities?.supportsDry ?? DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsDry,
		supportsFanSpeedControl:
			capabilities?.supportsFanSpeedControl ?? DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsFanSpeedControl,
	};
}
