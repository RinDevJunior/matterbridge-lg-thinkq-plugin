import { AnsiLogger } from 'matterbridge/logger';

import { toThinqDevice } from '../../core/domain/entities/ThinqDevice.js';
import { ThinqSession } from '../../services/thinq/session.js';
import { ThinqApiClient } from '../../services/thinq/thinqApiClient.js';
import type { CliSession } from '../types.js';

export async function cmdDevices(session: CliSession, logger: AnsiLogger): Promise<void> {
	const { userData, country, language } = session;

	const thinqSession = new ThinqSession(userData.accessToken, userData.refreshToken, userData.expiresAtEpochSeconds);
	const apiClient = new ThinqApiClient(thinqSession, country, language, logger);
	if (userData.userNumber) {
		apiClient.setUserNumber(userData.userNumber);
	}

	const rawDevices = await apiClient.getListDevices();
	const devices = rawDevices.map(toThinqDevice);

	if (devices.length === 0) {
		console.log('No devices found.');
		return;
	}

	console.log(`Found ${devices.length} device(s):\n`);
	devices.forEach((device, index) => {
		console.log(`${index + 1}. ${device.name}`);
		console.log(`   Device ID:     ${device.id}`);
		console.log(`   Type:          ${device.type}`);
		console.log(`   Platform Type: ${device.platformType ?? 'unknown'}`);
		console.log(`   Model Name:    ${device.modelName}`);
		console.log(`   Online:        ${device.online}`);
		console.log('');
	});
}
