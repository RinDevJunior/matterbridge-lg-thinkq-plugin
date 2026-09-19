import { MatterbridgeEndpoint, onOffLight, onOffPlugInUnit } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { OnOff, Thermostat } from 'matterbridge/matter/clusters';

import type { ThinqAirConditionerDevice } from '../../core/domain/entities/ThinqDevice.js';
import type { AirConditionerCapabilities } from '../../core/domain/value-objects/AirConditionerCapabilities.js';
import type { ThinqSnapshot } from '../../core/domain/value-objects/ThinqSnapshot.js';
import { ThinqApiClient } from '../../services/thinq/thinqApiClient.js';

/** Configuration spec for a single auxiliary toggle (jet, quiet, energy-save, air-clean, LED). */
interface AuxiliaryToggleSpec {
	readonly endpointName: string;
	readonly dataKey: string;
	readonly deviceType: typeof onOffPlugInUnit;
	readonly requiresCoolModeGate: boolean;
}

/** Reverts a toggle endpoint's OnOff attribute back to its old value after a failed ThinQ command. */
function revertToggleOnFailure(child: MatterbridgeEndpoint, oldValue: boolean): () => void {
	return () => {
		child.updateAttribute(OnOff.id, 'onOff', oldValue, child.log).catch(() => {
			// Best-effort revert; original failure already logged inside withErrorHandling.
		});
	};
}

/**
 * Adds child OnOff endpoints for enabled auxiliary toggle capabilities (jet, quiet, energy-save, air-clean, LED).
 * Each toggle creates a separate child `onOffPlugInUnit` or `onOffLight` endpoint.
 */
export function addAuxiliaryToggleEndpoints(
	airConditioner: MatterbridgeEndpoint,
	capabilities: AirConditionerCapabilities,
): void {
	const toggleSpecs: AuxiliaryToggleSpec[] = [
		{
			endpointName: 'JetMode',
			dataKey: 'airState.wMode.jet',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'QuietMode',
			dataKey: 'airState.miscFuncState.silentAWHP',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'EnergySaveMode',
			dataKey: 'airState.powerSave.basic',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'AirCleanMode',
			dataKey: 'airState.wMode.airClean',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'LedLight',
			dataKey: 'airState.lightingState.displayControl',
			deviceType: onOffLight,
			requiresCoolModeGate: false,
		},
	];

	const capabilityMap: Record<string, boolean> = {
		'airState.wMode.jet': capabilities.supportsJetMode,
		'airState.miscFuncState.silentAWHP': capabilities.supportsQuietMode,
		'airState.powerSave.basic': capabilities.supportsEnergySaveMode,
		'airState.wMode.airClean': capabilities.supportsAirCleanMode,
		'airState.lightingState.displayControl': capabilities.supportsLedControl,
	};

	for (const spec of toggleSpecs) {
		if (capabilityMap[spec.dataKey]) {
			airConditioner
				.addChildDeviceType(spec.endpointName, [spec.deviceType])
				.createDefaultIdentifyClusterServer()
				.createDefaultOnOffClusterServer(false);
		}
	}
}

/**
 * Registers Apple Home → ThinQ command handlers for auxiliary toggles (jet, quiet, energy-save, air-clean, LED).
 * Jet/quiet/energy-save/air-clean require power-on + Cool-mode gate (client-side, no ThinQ call if gated).
 * LED only requires power-on gate.
 */
export function registerAuxiliaryToggleCommandHandlers(
	airConditioner: MatterbridgeEndpoint,
	device: ThinqAirConditionerDevice,
	apiClient: ThinqApiClient,
	logger: AnsiLogger,
	capabilities: AirConditionerCapabilities,
): void {
	const toggleSpecs: AuxiliaryToggleSpec[] = [
		{
			endpointName: 'JetMode',
			dataKey: 'airState.wMode.jet',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'QuietMode',
			dataKey: 'airState.miscFuncState.silentAWHP',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'EnergySaveMode',
			dataKey: 'airState.powerSave.basic',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'AirCleanMode',
			dataKey: 'airState.wMode.airClean',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'LedLight',
			dataKey: 'airState.lightingState.displayControl',
			deviceType: onOffLight,
			requiresCoolModeGate: false,
		},
	];

	const capabilityMap: Record<string, boolean> = {
		'airState.wMode.jet': capabilities.supportsJetMode,
		'airState.miscFuncState.silentAWHP': capabilities.supportsQuietMode,
		'airState.powerSave.basic': capabilities.supportsEnergySaveMode,
		'airState.wMode.airClean': capabilities.supportsAirCleanMode,
		'airState.lightingState.displayControl': capabilities.supportsLedControl,
	};

	for (const spec of toggleSpecs) {
		if (!capabilityMap[spec.dataKey]) {
			continue;
		}

		const child = airConditioner.getChildEndpointById(spec.endpointName);
		if (!child) {
			logger.debug(
				`ThinQ AirConditioner ${device.id}: child endpoint '${spec.endpointName}' not found, skipping command handler registration.`,
			);
			continue;
		}

		const onHandler = async (newValue: boolean, oldValue: boolean) => {
			logger.debug(
				`ThinQ AirConditioner ${device.id}: toggle '${spec.endpointName}' handler invoked, newValue=${newValue}`,
			);

			if (spec.requiresCoolModeGate) {
				const acPowerOn = airConditioner.getAttribute(OnOff.id, 'onOff') as boolean | undefined;
				const systemMode = airConditioner.getAttribute(Thermostat.id, 'systemMode') as
					Thermostat.SystemMode | undefined;

				if (!acPowerOn || systemMode !== Thermostat.SystemMode.Cool) {
					logger.debug(
						`ThinQ AirConditioner ${device.id}: toggle '${spec.endpointName}' blocked by cool-mode gate (powerOn=${acPowerOn}, systemMode=${systemMode}).`,
					);
					revertToggleOnFailure(child, oldValue)();
					return;
				}
			}

			try {
				await apiClient.sendCommand(device.id, {
					dataKey: spec.dataKey,
					dataValue: newValue ? 1 : 0,
				});
			} catch (error) {
				logger.error(
					`ThinQ AirConditioner toggle '${spec.endpointName}' command failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				revertToggleOnFailure(child, oldValue)();
				throw error;
			}
		};

		child.addCommandHandler('on', async () => onHandler(true, false));
		child.addCommandHandler('off', async () => onHandler(false, true));
	}
}

/**
 * Pushes auxiliary toggle states from a ThinQ snapshot to child endpoints.
 */
export async function applyAuxiliaryToggleSnapshot(
	airConditioner: MatterbridgeEndpoint,
	snapshot: ThinqSnapshot,
	capabilities: AirConditionerCapabilities,
	logger: AnsiLogger,
): Promise<void> {
	const toggleSpecs: AuxiliaryToggleSpec[] = [
		{
			endpointName: 'JetMode',
			dataKey: 'airState.wMode.jet',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'QuietMode',
			dataKey: 'airState.miscFuncState.silentAWHP',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'EnergySaveMode',
			dataKey: 'airState.powerSave.basic',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'AirCleanMode',
			dataKey: 'airState.wMode.airClean',
			deviceType: onOffPlugInUnit,
			requiresCoolModeGate: true,
		},
		{
			endpointName: 'LedLight',
			dataKey: 'airState.lightingState.displayControl',
			deviceType: onOffLight,
			requiresCoolModeGate: false,
		},
	];

	const capabilityMap: Record<string, boolean> = {
		'airState.wMode.jet': capabilities.supportsJetMode,
		'airState.miscFuncState.silentAWHP': capabilities.supportsQuietMode,
		'airState.powerSave.basic': capabilities.supportsEnergySaveMode,
		'airState.wMode.airClean': capabilities.supportsAirCleanMode,
		'airState.lightingState.displayControl': capabilities.supportsLedControl,
	};

	const stateGetterMap: Record<string, () => boolean> = {
		'airState.wMode.jet': () => snapshot.isJetModeOn,
		'airState.miscFuncState.silentAWHP': () => snapshot.isQuietModeOn,
		'airState.powerSave.basic': () => snapshot.isEnergySaveModeOn,
		'airState.wMode.airClean': () => snapshot.isAirCleanModeOn,
		'airState.lightingState.displayControl': () => snapshot.isLedOn,
	};

	for (const spec of toggleSpecs) {
		if (!capabilityMap[spec.dataKey]) {
			continue;
		}

		const child = airConditioner.getChildEndpointById(spec.endpointName);
		if (!child) {
			continue;
		}

		const getter = stateGetterMap[spec.dataKey];
		const state = getter();
		await child.updateAttribute(OnOff.id, 'onOff', state, logger);
	}
}
