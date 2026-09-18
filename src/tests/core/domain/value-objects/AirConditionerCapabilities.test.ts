import { describe, expect, it } from 'vitest';

import {
	DEFAULT_AIR_CONDITIONER_CAPABILITIES,
	resolveAirConditionerCapabilities,
} from '../../../../core/domain/value-objects/AirConditionerCapabilities.js';
import type { ThinqDeviceConfigEntry } from '../../../../model/LgThinkqPluginPlatformConfig.js';

describe('AirConditionerCapabilities', () => {
	describe('DEFAULT_AIR_CONDITIONER_CAPABILITIES', () => {
		it('should have existing capabilities set to true', () => {
			// Assert
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsHeat).toBe(true);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsDry).toBe(true);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsFanSpeedControl).toBe(true);
		});

		it('should have new Phase A toggle capabilities set to false (opt-in)', () => {
			// Assert
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsJetMode).toBe(false);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsQuietMode).toBe(false);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsEnergySaveMode).toBe(false);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsAirCleanMode).toBe(false);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsLedControl).toBe(false);
		});
	});

	describe('resolveAirConditionerCapabilities', () => {
		it('should return all-true default when devices array is undefined', () => {
			// Arrange & Act
			const result = resolveAirConditionerCapabilities(undefined, 'device-123');

			// Assert
			expect(result).toEqual(DEFAULT_AIR_CONDITIONER_CAPABILITIES);
		});

		it('should return all-true default when devices array is empty', () => {
			// Arrange & Act
			const result = resolveAirConditionerCapabilities([], 'device-123');

			// Assert
			expect(result).toEqual(DEFAULT_AIR_CONDITIONER_CAPABILITIES);
		});

		it('should return all-true default when device is not found in array', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [{ deviceId: 'device-999', capabilities: { supportsHeat: false } }];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result).toEqual(DEFAULT_AIR_CONDITIONER_CAPABILITIES);
		});

		it('should return all-true default when device is found but has no capabilities key', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [{ deviceId: 'device-123' }];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result).toEqual(DEFAULT_AIR_CONDITIONER_CAPABILITIES);
		});

		it('should override supportsHeat only when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsHeat: false },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsHeat).toBe(false);
			expect(result.supportsDry).toBe(true); // default
			expect(result.supportsFanSpeedControl).toBe(true); // default
		});

		it('should override supportsDry only when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsDry: false },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsHeat).toBe(true); // default
			expect(result.supportsDry).toBe(false);
			expect(result.supportsFanSpeedControl).toBe(true); // default
		});

		it('should override supportsFanSpeedControl only when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsFanSpeedControl: false },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsHeat).toBe(true); // default
			expect(result.supportsDry).toBe(true); // default
			expect(result.supportsFanSpeedControl).toBe(false);
		});

		it('should override all three flags when all are specified as false', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: {
						supportsHeat: false,
						supportsDry: false,
						supportsFanSpeedControl: false,
					},
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsHeat).toBe(false);
			expect(result.supportsDry).toBe(false);
			expect(result.supportsFanSpeedControl).toBe(false);
		});

		it('should resolve correct device from multiple entries in array', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{ deviceId: 'device-001', capabilities: { supportsHeat: false } },
				{ deviceId: 'device-123', capabilities: { supportsDry: false } },
				{ deviceId: 'device-999', capabilities: { supportsFanSpeedControl: false } },
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsHeat).toBe(true); // default
			expect(result.supportsDry).toBe(false); // from device-123
			expect(result.supportsFanSpeedControl).toBe(true); // default
		});

		it('should preserve readonly properties', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsHeat: false, supportsDry: false, supportsFanSpeedControl: true },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(Object.getOwnPropertyDescriptor(result, 'supportsHeat')?.writable).not.toBe(false);
			// Result is not frozen, it's just a regular object with readonly interface
			expect(result).toEqual({
				supportsHeat: false,
				supportsDry: false,
				supportsFanSpeedControl: true,
				supportsJetMode: false,
				supportsQuietMode: false,
				supportsEnergySaveMode: false,
				supportsAirCleanMode: false,
				supportsLedControl: false,
			});
		});

		it('should handle device with capabilities object but undefined individual properties', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: {
						supportsHeat: undefined,
						supportsDry: true,
						supportsFanSpeedControl: undefined,
					},
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsHeat).toBe(true); // defaults to true when undefined
			expect(result.supportsDry).toBe(true);
			expect(result.supportsFanSpeedControl).toBe(true); // defaults to true when undefined
		});

		it('should handle explicit true values for all capabilities', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: {
						supportsHeat: true,
						supportsDry: true,
						supportsFanSpeedControl: true,
					},
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result).toEqual(DEFAULT_AIR_CONDITIONER_CAPABILITIES);
		});

		it('should default new Phase A toggle flags to false when undefined', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [{ deviceId: 'device-123', capabilities: {} }];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(false);
			expect(result.supportsQuietMode).toBe(false);
			expect(result.supportsEnergySaveMode).toBe(false);
			expect(result.supportsAirCleanMode).toBe(false);
			expect(result.supportsLedControl).toBe(false);
		});

		it('should override supportsJetMode when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsJetMode: true },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(true);
			expect(result.supportsQuietMode).toBe(false); // default
			expect(result.supportsEnergySaveMode).toBe(false); // default
			expect(result.supportsAirCleanMode).toBe(false); // default
			expect(result.supportsLedControl).toBe(false); // default
		});

		it('should override supportsQuietMode when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsQuietMode: true },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(false); // default
			expect(result.supportsQuietMode).toBe(true);
			expect(result.supportsEnergySaveMode).toBe(false); // default
			expect(result.supportsAirCleanMode).toBe(false); // default
			expect(result.supportsLedControl).toBe(false); // default
		});

		it('should override supportsEnergySaveMode when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsEnergySaveMode: true },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(false); // default
			expect(result.supportsQuietMode).toBe(false); // default
			expect(result.supportsEnergySaveMode).toBe(true);
			expect(result.supportsAirCleanMode).toBe(false); // default
			expect(result.supportsLedControl).toBe(false); // default
		});

		it('should override supportsAirCleanMode when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsAirCleanMode: true },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(false); // default
			expect(result.supportsQuietMode).toBe(false); // default
			expect(result.supportsEnergySaveMode).toBe(false); // default
			expect(result.supportsAirCleanMode).toBe(true);
			expect(result.supportsLedControl).toBe(false); // default
		});

		it('should override supportsLedControl when specified', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: { supportsLedControl: true },
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(false); // default
			expect(result.supportsQuietMode).toBe(false); // default
			expect(result.supportsEnergySaveMode).toBe(false); // default
			expect(result.supportsAirCleanMode).toBe(false); // default
			expect(result.supportsLedControl).toBe(true);
		});

		it('should enable multiple new flags simultaneously', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: {
						supportsJetMode: true,
						supportsQuietMode: true,
						supportsEnergySaveMode: true,
						supportsLedControl: true,
					},
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			expect(result.supportsJetMode).toBe(true);
			expect(result.supportsQuietMode).toBe(true);
			expect(result.supportsEnergySaveMode).toBe(true);
			expect(result.supportsAirCleanMode).toBe(false); // not specified
			expect(result.supportsLedControl).toBe(true);
		});

		it('should preserve existing flag defaults (true) when resolving new flags', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-123',
					capabilities: {
						supportsJetMode: true,
						supportsQuietMode: false,
					},
				},
			];

			// Act
			const result = resolveAirConditionerCapabilities(devices, 'device-123');

			// Assert
			// Existing flags should still default to true
			expect(result.supportsHeat).toBe(true);
			expect(result.supportsDry).toBe(true);
			expect(result.supportsFanSpeedControl).toBe(true);
			// New flags as specified
			expect(result.supportsJetMode).toBe(true);
			expect(result.supportsQuietMode).toBe(false);
		});

		it('should isolate capability flags across multiple devices', () => {
			// Arrange
			const devices: ThinqDeviceConfigEntry[] = [
				{
					deviceId: 'device-001',
					capabilities: { supportsJetMode: true },
				},
				{
					deviceId: 'device-002',
					capabilities: { supportsQuietMode: true },
				},
				{
					deviceId: 'device-003',
					capabilities: { supportsEnergySaveMode: true },
				},
			];

			// Act
			const result001 = resolveAirConditionerCapabilities(devices, 'device-001');
			const result002 = resolveAirConditionerCapabilities(devices, 'device-002');
			const result003 = resolveAirConditionerCapabilities(devices, 'device-003');

			// Assert
			expect(result001.supportsJetMode).toBe(true);
			expect(result001.supportsQuietMode).toBe(false);
			expect(result002.supportsJetMode).toBe(false);
			expect(result002.supportsQuietMode).toBe(true);
			expect(result003.supportsEnergySaveMode).toBe(true);
			expect(result003.supportsJetMode).toBe(false);
		});
	});
});
