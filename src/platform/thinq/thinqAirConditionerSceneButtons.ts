import { genericSwitch, MatterbridgeEndpoint } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';

import type { ThinqAirConditionerDevice } from '../../core/domain/entities/ThinqDevice.js';
import type { ThinqSceneButtonConfig } from '../../model/LgThinkqPluginPlatformConfig.js';
import { ThinqApiClient } from '../../services/thinq/thinqApiClient.js';

/**
 * Adds child momentary-switch endpoints for custom scene buttons.
 * Each button creates a separate child `genericSwitch` endpoint.
 */
export function addSceneButtonEndpoints(airConditioner: MatterbridgeEndpoint, buttons: ThinqSceneButtonConfig[]): void {
	if (!buttons || buttons.length === 0) {
		return;
	}

	const usedNames = new Set<string>();

	for (let i = 0; i < buttons.length; i++) {
		const button = buttons[i];
		let endpointName = button.name.replaceAll(' ', '');

		if (usedNames.has(endpointName)) {
			endpointName = `${endpointName}${i}`;
		}

		usedNames.add(endpointName);

		airConditioner
			.addChildDeviceType(endpointName, [genericSwitch])
			.createDefaultIdentifyClusterServer()
			.createDefaultMomentarySwitchClusterServer();
	}
}

/**
 * Registers Apple Home → ThinQ command handlers for scene buttons.
 * Each button press sends the configured operation mode to ThinQ.
 */
export function registerSceneButtonCommandHandlers(
	airConditioner: MatterbridgeEndpoint,
	buttons: ThinqSceneButtonConfig[],
	device: ThinqAirConditionerDevice,
	apiClient: ThinqApiClient,
	logger: AnsiLogger,
): void {
	if (!buttons || buttons.length === 0) {
		return;
	}

	const usedNames = new Set<string>();

	for (let i = 0; i < buttons.length; i++) {
		const button = buttons[i];
		let endpointName = button.name.replaceAll(' ', '');

		if (usedNames.has(endpointName)) {
			endpointName = `${endpointName}${i}`;
		}

		usedNames.add(endpointName);

		const child = airConditioner.getChildEndpointById(endpointName);
		if (!child) {
			logger.debug(
				`ThinQ AirConditioner ${device.id}: scene button endpoint '${endpointName}' not found, skipping command handler registration.`,
			);
			continue;
		}

		child.addCommandHandler('toggle', async () => {
			logger.debug(
				`ThinQ AirConditioner ${device.id}: scene button '${endpointName}' (opMode=${button.opMode}) handler invoked`,
			);

			try {
				await apiClient.sendCommand(device.id, {
					dataKey: 'airState.opMode',
					dataValue: button.opMode,
				});
			} catch (error) {
				logger.error(
					`ThinQ AirConditioner scene button '${endpointName}' command failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				throw error;
			}
		});
	}
}
