import { describe, expect, it } from 'vitest';

import {
	type AirConditionerCapabilities,
	DEFAULT_AIR_CONDITIONER_CAPABILITIES,
	resolveAirConditionerCapabilities,
} from '../../../../core/domain/value-objects/AirConditionerCapabilities.js';
import type { ThinqDeviceConfigEntry } from '../../../../model/LgThinkqPluginPlatformConfig.js';

describe('AirConditionerCapabilities', () => {
	describe('DEFAULT_AIR_CONDITIONER_CAPABILITIES', () => {
		it('should have all capabilities set to true', () => {
			// Assert
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsHeat).toBe(true);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsDry).toBe(true);
			expect(DEFAULT_AIR_CONDITIONER_CAPABILITIES.supportsFanSpeedControl).toBe(true);
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
	});
});
