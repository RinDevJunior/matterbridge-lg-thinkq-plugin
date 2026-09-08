import crypto from 'node:crypto';

import axios from 'axios';
import { AnsiLogger } from 'matterbridge/logger';

import { AuthenticationError, InvalidCredentialsError } from '../../errors/index.js';
import {
	buildEmpDefaultHeaders,
	formatRfc2822Utc,
	Gateway,
	signThinqMessage,
	THINQ_CLIENT_ID,
	THINQ_OAUTH_CLIENT_KEY,
	THINQ_OAUTH_SECRET_KEY,
} from '../thinq/gateway.js';
import { ThinqSession } from '../thinq/session.js';
import { ThinqApiClient } from '../thinq/thinqApiClient.js';
import type { ThinqAuthContext, ThinqUserData } from './AuthContext.js';
import type { IAuthStrategy } from './IAuthStrategy.js';

interface PreLoginResponse {
	signature: string;
	tStamp: string;
	encrypted_pw: string;
}

interface AccountSessionResponse {
	userIDType: string;
	country: string;
	userID: string;
	loginSessionID: string;
}

interface EmpAuthorizeResponse {
	status: number;
	message?: string;
	redirect_uri: string;
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: string;
}

const EMP_REDIRECT_URI = 'lgaccount.lgsmartthinq:/';

/** True when `err` is an Axios error with a 4xx HTTP status (i.e. a real bad-credentials/rejected-request response). */
function isClientErrorResponse(err: unknown): boolean {
	if (!axios.isAxiosError(err)) {
		return false;
	}

	const status = err.response?.status;

	return status !== undefined && status >= 400 && status < 500;
}

/**
 * Account (username/password) authentication strategy. Ports the 5-call EMP login chain
 * (`Auth.login`→`loginStep2`, `homebridge-lg-thinq/src/lib/Auth.ts:99-229`): SHA-512 password hash,
 * preLogin, EMP session, OAuth secret-key lookup, HMAC-SHA1-signed empsession authorize, then oauth2 token exchange.
 */
export class AccountAuthStrategy implements IAuthStrategy {
	constructor(
		private readonly apiClient: ThinqApiClient,
		private readonly logger: AnsiLogger,
	) {}

	public async authenticate(context: ThinqAuthContext): Promise<ThinqUserData | undefined> {
		if (!context.username || !context.password) {
			throw new InvalidCredentialsError(context.username);
		}

		this.logger.notice('Authenticating with LG ThinQ account credentials...');

		const gatewayData = await this.apiClient.getGateway();
		const gateway = new Gateway(gatewayData);
		const hashedPassword = crypto.createHash('sha512').update(context.password).digest('hex');

		return this.loginStep2(gateway, context.username, hashedPassword, context.country, context.language);
	}

	private async loginStep2(
		gateway: Gateway,
		username: string,
		encryptedPassword: string,
		country: string,
		language: string,
	): Promise<ThinqUserData> {
		const headers: Record<string, string> = { ...buildEmpDefaultHeaders(gateway) };

		const preLoginData = new URLSearchParams({
			user_auth2: encryptedPassword,
			log_param: `login request / user_id : ${username} / third_party : null / svc_list : SVC202,SVC710 / 3rd_service : `,
		});

		const preLogin = await axios
			.post<PreLoginResponse>(`${gateway.loginBaseUrl}preLogin`, preLoginData.toString(), { headers })
			.then((res) => res.data)
			.catch((err: unknown) => {
				if (isClientErrorResponse(err)) {
					throw new InvalidCredentialsError(username);
				}

				throw new AuthenticationError('LG pre-login failed.', { cause: err });
			});

		headers['X-Signature'] = preLogin.signature;
		headers['X-Timestamp'] = preLogin.tStamp;

		const sessionData = new URLSearchParams({
			user_auth2: preLogin.encrypted_pw,
			password_hash_prameter_flag: 'Y',
			svc_list: 'SVC202,SVC710',
		});

		const loginUrl = `${gateway.empBaseUrl}emp/v2.0/account/session/${encodeURIComponent(username)}`;
		const account = await axios
			.post<{ account: AccountSessionResponse }>(loginUrl, sessionData.toString(), { headers })
			.then((res) => res.data.account)
			.catch((err: unknown) => {
				if (isClientErrorResponse(err)) {
					throw new InvalidCredentialsError(username);
				}

				throw new AuthenticationError('LG account login failed.', { cause: err });
			});

		const secretKeyUrl = `${gateway.loginBaseUrl}searchKey?key_name=OAUTH_SECRETKEY&sever_type=OP`;
		const secretKey = await axios
			.get<{ returnData: string }>(secretKeyUrl)
			.then((res) => res.data.returnData)
			.catch((err: unknown) => {
				throw new AuthenticationError('LG OAuth key lookup failed.', { cause: err });
			});

		const timestamp = formatRfc2822Utc(new Date());
		const empParams = new URLSearchParams({
			account_type: account.userIDType,
			client_id: THINQ_CLIENT_ID,
			country_code: account.country,
			redirect_uri: EMP_REDIRECT_URI,
			response_type: 'code',
			state: '12345',
			username: account.userID,
		});
		const empUrl = new URL(`https://emp-oauth.lgecloud.com/emp/oauth2/authorize/empsession?${empParams.toString()}`);
		const empSignature = signThinqMessage(`${empUrl.pathname}${empUrl.search}\n${timestamp}`, secretKey);

		const authorize = await axios
			.get<EmpAuthorizeResponse>(empUrl.href, {
				headers: {
					'lgemp-x-app-key': THINQ_OAUTH_CLIENT_KEY,
					'lgemp-x-date': timestamp,
					'lgemp-x-session-key': account.loginSessionID,
					'lgemp-x-signature': empSignature,
					Accept: 'application/json',
					'X-Device-Type': 'M01',
					'X-Device-Platform': 'ADR',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			})
			.then((res) => res.data)
			.catch((err: unknown) => {
				throw new AuthenticationError('LG OAuth authorization failed.', { cause: err });
			});

		if (authorize.status !== 1) {
			throw new AuthenticationError(authorize.message ?? 'LG OAuth authorization was rejected.');
		}

		const redirectUri = new URL(authorize.redirect_uri);
		const code = redirectUri.searchParams.get('code') ?? '';
		const oauth2BackendUrl = redirectUri.searchParams.get('oauth2_backend_url') ?? gateway.loginBaseUrl;

		const tokenData = new URLSearchParams({
			code,
			grant_type: 'authorization_code',
			redirect_uri: EMP_REDIRECT_URI,
		});
		const requestPath = `/oauth/1.0/oauth2/token?${tokenData.toString()}`;
		const tokenTimestamp = formatRfc2822Utc(new Date());

		const token = await axios
			.post<TokenResponse>(`${oauth2BackendUrl}oauth/1.0/oauth2/token`, tokenData.toString(), {
				headers: {
					'x-lge-app-os': 'ADR',
					'x-lge-appkey': THINQ_CLIENT_ID,
					'x-lge-oauth-signature': signThinqMessage(`${requestPath}\n${tokenTimestamp}`, THINQ_OAUTH_SECRET_KEY),
					'x-lge-oauth-date': tokenTimestamp,
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			})
			.then((res) => res.data)
			.catch((err: unknown) => {
				throw new AuthenticationError('LG token exchange failed.', { cause: err });
			});

		return {
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			expiresAtEpochSeconds: ThinqSession.expiryFromExpiresIn(Number.parseInt(token.expires_in, 10)),
			country,
			language,
		};
	}
}
