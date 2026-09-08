import axios from 'axios';
import { AnsiLogger } from 'matterbridge/logger';

import { TokenExpiredError } from '../../errors/index.js';
import {
	formatRfc2822Utc,
	Gateway,
	GatewayData,
	signThinqMessage,
	THINQ_CLIENT_ID,
	THINQ_OAUTH_SECRET_KEY,
} from './gateway.js';
import { ThinqSession } from './session.js';

const GATEWAY_URL = 'https://route.lgthinq.com:46030/v1/service/application/gateway-uri';
const API_KEY = 'VGhpblEyLjAgU0VSVklDRQ==';
const API_CLIENT_ID = 'c713ea8e50f657534ff8b9d373dfebfc2ed70b88285c26b8ade49868c0b164d9';

export interface ThinqHome {
	homeId: string;
	[key: string]: unknown;
}

export interface ThinqDeviceData {
	deviceId: string;
	alias: string;
	modelJsonUri: string;
	deviceType: number;
	modelName?: string;
	manufacture?: {
		macAddress?: string;
		salesModel?: string;
		serialNo?: string;
		manufactureModel?: string;
	};
	modemInfo?: {
		appVersion?: string;
		modelName?: string;
	};
	snapshot: { online?: boolean } & Record<string, unknown>;
	platformType?: string;
	online?: boolean;
}

export interface ThinqCommandPayload {
	dataKey?: string | null;
	dataValue?: unknown;
	dataSetList?: Record<string, unknown>;
}

function randomMessageId(length = 22): string {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

/**
 * REST client for the LG ThinQ2 cloud API. Ports `API.ts` (`homebridge-lg-thinq`) — gateway discovery,
 * home/device listing, device control, and reactive token refresh on 401.
 */
export class ThinqApiClient {
	private gateway: Gateway | undefined;
	private homesCache: ThinqHome[] | undefined;

	constructor(
		private session: ThinqSession,
		private readonly country: string,
		private readonly language: string,
		private readonly logger: AnsiLogger,
	) {}

	/** Replaces the active session, e.g. once authentication completes. */
	public setSession(session: ThinqSession): void {
		this.session = session;
	}

	public async getGateway(): Promise<GatewayData> {
		if (!this.gateway) {
			const response = await axios.get<{ result: GatewayData }>(GATEWAY_URL, { headers: this.defaultHeaders });
			this.gateway = new Gateway(response.data.result);
		}

		return this.gateway.data;
	}

	public async getListHomes(): Promise<ThinqHome[]> {
		if (!this.homesCache) {
			const data = await this.request<{ result: { item: ThinqHome[] } }>('get', 'service/homes');
			this.homesCache = data.result?.item ?? [];
		}

		return this.homesCache;
	}

	public async getListDevices(): Promise<ThinqDeviceData[]> {
		const homes = await this.getListHomes();
		const devices: ThinqDeviceData[] = [];

		for (const home of homes) {
			const data = await this.request<{ result: { devices: ThinqDeviceData[] } }>(
				'get',
				`service/homes/${home.homeId}`,
			);
			devices.push(...(data.result?.devices ?? []));
		}

		return devices;
	}

	public async sendCommand(deviceId: string, payload: ThinqCommandPayload): Promise<void> {
		if (!deviceId.trim()) {
			throw new Error('Invalid deviceId: must be a non-empty string.');
		}

		await this.request('post', `service/devices/${deviceId}/control-sync`, {
			ctrlKey: 'basicCtrl',
			command: 'Set',
			...payload,
		});
	}

	/** Exchanges a refresh token for a new access token (`grant_type=refresh_token`), mutating and returning `session`. */
	public async refreshToken(session: ThinqSession): Promise<ThinqSession> {
		const tokenUrl = `https://${this.country.toLowerCase()}.lgeapi.com/oauth/1.0/oauth2/token`;
		const data = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refreshToken });
		const timestamp = formatRfc2822Utc(new Date());
		const requestUrl = `/oauth/1.0/oauth2/token?${data.toString()}`;
		const signature = signThinqMessage(`${requestUrl}\n${timestamp}`, THINQ_OAUTH_SECRET_KEY);

		try {
			const response = await axios.post<{ access_token: string; expires_in: string }>(tokenUrl, data.toString(), {
				headers: {
					'x-lge-app-os': 'ADR',
					'x-lge-appkey': THINQ_CLIENT_ID,
					'x-lge-oauth-signature': signature,
					'x-lge-oauth-date': timestamp,
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			session.updateAccessToken(
				response.data.access_token,
				ThinqSession.expiryFromExpiresIn(Number.parseInt(response.data.expires_in, 10)),
			);
			this.session = session;
			return session;
		} catch (error) {
			this.logger.error(`ThinQ token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
			throw new TokenExpiredError();
		}
	}

	private get defaultHeaders(): Record<string, string> {
		const authHeaders: Record<string, string> = {};
		if (this.session.accessToken) {
			authHeaders['x-emp-token'] = this.session.accessToken;
		}
		authHeaders['x-client-id'] = API_CLIENT_ID;

		return {
			'x-api-key': API_KEY,
			'x-thinq-app-ver': '3.6.1200',
			'x-thinq-app-type': 'NUTS',
			'x-thinq-app-level': 'PRD',
			'x-thinq-app-os': 'ANDROID',
			'x-thinq-app-logintype': 'LGE',
			'x-service-code': 'SVC202',
			'x-country-code': this.country,
			'x-language-code': this.language,
			'x-service-phase': 'OP',
			'x-origin': 'app-native',
			'x-model-name': 'samsung/SM-G930L',
			'x-os-version': 'AOS/7.1.2',
			'x-app-version': 'LG ThinQ/3.6.12110',
			'x-message-id': randomMessageId(),
			'user-agent': 'okhttp/3.14.9',
			...authHeaders,
		};
	}

	private async request<T>(method: 'get' | 'post', uri: string, data?: unknown, retry = false): Promise<T> {
		await this.getGateway();
		const gateway = this.gateway;
		if (!gateway) {
			throw new Error('ThinQ gateway is unavailable.');
		}

		const url = new URL(uri, gateway.thinq2Url).href;

		try {
			const response = await axios.request<T>({ method, url, data, headers: this.defaultHeaders });
			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				if (retry) {
					throw new TokenExpiredError();
				}

				await this.refreshToken(this.session);
				return this.request<T>(method, uri, data, true);
			}

			throw error;
		}
	}
}
