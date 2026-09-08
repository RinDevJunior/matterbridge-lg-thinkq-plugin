import crypto from 'node:crypto';

/** Shared LG EMP (Enterprise Membership Platform) client identifiers, reverse-engineered constants used by every EMP call. */
export const THINQ_CLIENT_ID = 'LGAO221A02';
export const THINQ_OAUTH_SECRET_KEY = 'c053c2a6ddeb7ad97cb0eed0dcb31cf8';
export const THINQ_OAUTH_CLIENT_KEY = 'LGAO722A02';
export const THINQ_APPLICATION_KEY = '6V1V8H2BN5P9ZQGOI5DAQ92YZBDO3EK9';

/** Raw gateway lookup response shape (`GET .../gateway-uri`). */
export interface GatewayData {
	empTermsUri: string;
	empSpxUri: string;
	thinq2Uri: string;
	thinq1Uri: string;
	countryCode: string;
	languageCode: string;
}

/** Resolves EMP/ThinQ base URLs from a gateway lookup response. */
export class Gateway {
	constructor(public readonly data: GatewayData) {}

	public get empBaseUrl(): string {
		return `${this.data.empTermsUri}/`;
	}

	public get loginBaseUrl(): string {
		return `${this.data.empSpxUri}/`;
	}

	public get thinq2Url(): string {
		return `${this.data.thinq2Uri}/`;
	}

	public get thinq1Url(): string {
		return `${this.data.thinq1Uri}/`;
	}

	public get countryCode(): string {
		return this.data.countryCode;
	}

	public get languageCode(): string {
		return this.data.languageCode;
	}
}

/** HMAC-SHA1 signature used by the EMP/oauth2 endpoints (`lgemp-x-signature`/`x-lge-oauth-signature`). */
export function signThinqMessage(message: string, secret: string): string {
	return crypto.createHmac('sha1', Buffer.from(secret)).update(message).digest('base64');
}

const RFC2822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC2822_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats a UTC timestamp in RFC 2822 form (`Mon, 08 Sep 2026 12:34:56 +0000`), as required by LG's oauth signature headers. */
export function formatRfc2822Utc(date: Date): string {
	const day = RFC2822_DAYS[date.getUTCDay()];
	const dd = String(date.getUTCDate()).padStart(2, '0');
	const month = RFC2822_MONTHS[date.getUTCMonth()];
	const hh = String(date.getUTCHours()).padStart(2, '0');
	const mi = String(date.getUTCMinutes()).padStart(2, '0');
	const ss = String(date.getUTCSeconds()).padStart(2, '0');

	return `${day}, ${dd} ${month} ${date.getUTCFullYear()} ${hh}:${mi}:${ss} +0000`;
}

/** Default headers required by the `preLogin`/`account/session` EMP endpoints. */
export function buildEmpDefaultHeaders(gateway: Gateway): Record<string, string> {
	return {
		Accept: 'application/json',
		'X-Application-Key': THINQ_APPLICATION_KEY,
		'X-Client-App-Key': THINQ_CLIENT_ID,
		'X-Lge-Svccode': 'SVC709',
		'X-Device-Type': 'M01',
		'X-Device-Platform': 'ADR',
		'X-Device-Language-Type': 'IETF',
		'X-Device-Publish-Flag': 'Y',
		'X-Device-Country': gateway.countryCode,
		'X-Device-Language': gateway.languageCode,
		'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		'Access-Control-Allow-Origin': '*',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'en-US,en;q=0.9',
	};
}
