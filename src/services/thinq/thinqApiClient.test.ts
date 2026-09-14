import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenExpiredError } from '../../errors/index.js';
import { buildGatewayResponse, buildThinqDeviceData, createMockLogger } from '../../tests/helpers/testUtils.js';
import { ThinqSession } from './session.js';
import { ThinqApiClient } from './thinqApiClient.js';

describe('ThinqApiClient', () => {
	let mockAxios: MockAdapter;
	let mockLogger: ReturnType<typeof createMockLogger>;
	let apiClient: ThinqApiClient;
	let session: ThinqSession;

	const gatewayData = buildGatewayResponse();

	beforeEach(() => {
		vi.clearAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockAxios = new MockAdapter(axios as any);
		mockLogger = createMockLogger();
		session = new ThinqSession('access-token-123', 'refresh-token-123', Math.floor(Date.now() / 1000) + 3600);
		apiClient = new ThinqApiClient(session, 'US', 'en', mockLogger);
	});

	afterEach(() => {
		mockAxios.reset();
		vi.clearAllMocks();
	});

	describe('getGateway', () => {
		it('should cache gateway after first call', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });

			const result1 = await apiClient.getGateway();
			const result2 = await apiClient.getGateway();

			expect(result1).toEqual(gatewayData);
			expect(result2).toEqual(gatewayData);
			expect(mockAxios.history.get).toHaveLength(1);
		});

		it('should return gateway data on successful request', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });

			const result = await apiClient.getGateway();

			expect(result).toEqual(gatewayData);
		});
	});

	describe('getListHomes', () => {
		it('should cache homes after first call', async () => {
			const homes = [{ homeId: 'home-1' }, { homeId: 'home-2' }];
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`).reply(200, { result: { item: homes } });

			const result1 = await apiClient.getListHomes();
			const result2 = await apiClient.getListHomes();

			expect(result1).toEqual(homes);
			expect(result2).toEqual(homes);
		});

		it('should return empty array when no homes found', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`).reply(200, { result: { item: undefined } });

			const result = await apiClient.getListHomes();

			expect(result).toEqual([]);
		});
	});

	describe('getListDevices', () => {
		it('should fetch devices from all homes', async () => {
			const homes = [{ homeId: 'home-1' }, { homeId: 'home-2' }];
			const devicesHome1 = [buildThinqDeviceData({ deviceId: 'device-1' })];
			const devicesHome2 = [buildThinqDeviceData({ deviceId: 'device-2' })];

			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`).reply(200, { result: { item: homes } });
			mockAxios
				.onGet(`${gatewayData.thinq2Uri}/service/homes/home-1`)
				.reply(200, { result: { devices: devicesHome1 } });
			mockAxios
				.onGet(`${gatewayData.thinq2Uri}/service/homes/home-2`)
				.reply(200, { result: { devices: devicesHome2 } });

			const result = await apiClient.getListDevices();

			expect(result).toHaveLength(2);
			expect(result[0].deviceId).toBe('device-1');
			expect(result[1].deviceId).toBe('device-2');
		});

		it('should skip homes with no devices', async () => {
			const homes = [{ homeId: 'home-1' }, { homeId: 'home-2' }];
			const devices = [buildThinqDeviceData({ deviceId: 'device-1' })];

			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`).reply(200, { result: { item: homes } });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes/home-1`).reply(200, { result: { devices } });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes/home-2`).reply(200, { result: { devices: undefined } });

			const result = await apiClient.getListDevices();

			expect(result).toHaveLength(1);
			expect(result[0].deviceId).toBe('device-1');
		});
	});

	describe('sendCommand', () => {
		it('should throw error when deviceId is empty', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });

			await expect(apiClient.sendCommand('', { dataKey: 'test' })).rejects.toThrow('Invalid deviceId');
		});

		it('should throw error when deviceId is whitespace only', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });

			await expect(apiClient.sendCommand('   ', { dataKey: 'test' })).rejects.toThrow('Invalid deviceId');
		});

		it('should send command with payload', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });
			mockAxios.onPost(`${gatewayData.thinq2Uri}/service/devices/device-123/control-sync`).reply(200);

			await apiClient.sendCommand('device-123', { dataKey: 'test', dataValue: 'value' });

			expect(mockAxios.history.post).toHaveLength(1);
		});
	});

	describe('refreshToken', () => {
		it('should refresh the session access token', async () => {
			const oldSession = new ThinqSession('old-access', 'refresh-token-123', Math.floor(Date.now() / 1000));
			mockAxios
				.onPost(new RegExp('https://.*.lgeapi.com/oauth/1.0/oauth2/token'))
				.reply(200, { access_token: 'new-access-token', expires_in: '3600' });

			const result = await apiClient.refreshToken(oldSession);

			expect(result.accessToken).toBe('new-access-token');
			expect(result.refreshToken).toBe('refresh-token-123');
		});

		it('should throw TokenExpiredError on refresh failure', async () => {
			const oldSession = new ThinqSession('old-access', 'refresh-token-123', Math.floor(Date.now() / 1000));
			mockAxios.onPost(new RegExp('https://.*.lgeapi.com/oauth/1.0/oauth2/token')).reply(500);

			await expect(apiClient.refreshToken(oldSession)).rejects.toThrow(TokenExpiredError);
		});
	});

	describe('setSession', () => {
		it('should replace the active session', () => {
			const newSession = new ThinqSession('new-access', 'new-refresh', Math.floor(Date.now() / 1000) + 7200);

			apiClient.setSession(newSession);

			expect(apiClient['session']).toBe(newSession);
		});
	});

	describe('setUserNumber', () => {
		it('should set the user number and compute client ID', () => {
			apiClient.setUserNumber('user-123');

			expect(apiClient['userNumber']).toBe('user-123');
			expect(apiClient['clientId']).toBeDefined();
			expect(apiClient['clientId']).not.toBe('');
		});
	});

	describe('getUserNumber', () => {
		it('should return user number from profile response', async () => {
			mockAxios
				.onGet(new RegExp('https://.*.lgeapi.com/users/profile'))
				.reply(200, { status: undefined, account: { userNo: 'user-number-123' } });

			const result = await apiClient.getUserNumber('access-token-123');

			expect(result).toBe('user-number-123');
		});

		it('should throw error when status is 2', async () => {
			mockAxios.onGet(new RegExp('https://.*.lgeapi.com/users/profile')).reply(200, {
				status: 2,
				message: 'Profile lookup failed',
				account: { userNo: '' },
			});

			await expect(apiClient.getUserNumber('access-token-123')).rejects.toThrow('Profile lookup failed');
		});
	});

	describe('request 401 retry logic', () => {
		it('should retry once on 401 response', async () => {
			const homes = [{ homeId: 'home-1' }];
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });

			// First call returns 401, second call returns 200
			const homesAdapter = mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`);
			homesAdapter.replyOnce(401);
			homesAdapter.replyOnce(200, { result: { item: homes } });

			mockAxios.onPost(new RegExp('https://.*.lgeapi.com/oauth/1.0/oauth2/token')).reply(200, {
				access_token: 'new-access-token',
				expires_in: '3600',
			});

			const result = await apiClient.getListHomes();

			expect(result).toEqual(homes);
		});

		it('should throw TokenExpiredError on 401 after retry', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });

			// Both calls return 401
			const homesAdapter = mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`);
			homesAdapter.replyOnce(401);
			homesAdapter.replyOnce(401);

			mockAxios.onPost(new RegExp('https://.*.lgeapi.com/oauth/1.0/oauth2/token')).reply(200, {
				access_token: 'new-access-token',
				expires_in: '3600',
			});

			await expect(apiClient.getListHomes()).rejects.toThrow(TokenExpiredError);
		});

		it('should not retry on non-401 errors', async () => {
			mockAxios
				.onGet('https://route.lgthinq.com:46030/v1/service/application/gateway-uri')
				.reply(200, { result: gatewayData });
			mockAxios.onGet(`${gatewayData.thinq2Uri}/service/homes`).reply(500);

			await expect(apiClient.getListHomes()).rejects.toThrow();
			expect(mockAxios.history.get.filter((h) => h.url?.includes('/service/homes'))).toHaveLength(1);
		});
	});
});
