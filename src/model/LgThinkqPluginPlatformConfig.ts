import { PlatformConfig } from 'matterbridge';

export interface ThinqAuthConfig {
	loginType: 'account' | 'token';
	username?: string;
	password?: string;
	refreshToken?: string;
	country: string;
	language: string;
	refreshIntervalSeconds?: number;
	devices: unknown[];
}

export interface WebosPluginConfig {
	devices: unknown[];
}

export interface AdvancedFeatureSetting {
	debug: boolean;
	clearStorageOnStartup: boolean;
	unregisterOnShutdown: boolean;
}

export interface AdvancedFeatureConfiguration {
	settings: AdvancedFeatureSetting;
}

export interface LgThinkqPluginPlatformConfig extends PlatformConfig {
	thinq: ThinqAuthConfig;
	webos: WebosPluginConfig;
	advancedFeature: AdvancedFeatureConfiguration;
}

export function createDefaultAdvancedFeature(): AdvancedFeatureConfiguration {
	return {
		settings: {
			debug: false,
			clearStorageOnStartup: false,
			unregisterOnShutdown: false,
		},
	};
}

export function createDefaultThinqConfig(): ThinqAuthConfig {
	return {
		loginType: 'account',
		country: 'US',
		language: 'en-US',
		devices: [],
	};
}
