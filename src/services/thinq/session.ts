/** Persistable shape of a `ThinqSession`. */
export interface ThinqSessionData {
	accessToken: string;
	refreshToken: string;
	expiresAtEpochSeconds: number;
}

/** Holds a ThinQ OAuth access/refresh token pair and its expiry, mirroring `homebridge-lg-thinq`'s `Session`. */
export class ThinqSession {
	private accessTokenValue: string;
	private readonly refreshTokenValue: string;
	private expiresAtEpochSecondsValue: number;

	constructor(accessToken: string, refreshToken: string, expiresAtEpochSeconds: number) {
		this.accessTokenValue = accessToken;
		this.refreshTokenValue = refreshToken;
		this.expiresAtEpochSecondsValue = expiresAtEpochSeconds;
	}

	public get accessToken(): string {
		return this.accessTokenValue;
	}

	public get refreshToken(): string {
		return this.refreshTokenValue;
	}

	public get expiresAtEpochSeconds(): number {
		return this.expiresAtEpochSecondsValue;
	}

	public hasToken(): boolean {
		return this.accessTokenValue !== '';
	}

	public isExpired(): boolean {
		return this.expiresAtEpochSecondsValue < ThinqSession.currentEpochSeconds();
	}

	public hasValidToken(): boolean {
		return this.hasToken() && !this.isExpired();
	}

	/** Mutates this session in place with a freshly issued access token (refresh token is never rotated). */
	public updateAccessToken(accessToken: string, expiresAtEpochSeconds: number): void {
		this.accessTokenValue = accessToken;
		this.expiresAtEpochSecondsValue = expiresAtEpochSeconds;
	}

	public static expiryFromExpiresIn(expiresInSeconds: number): number {
		return ThinqSession.currentEpochSeconds() + expiresInSeconds;
	}

	public toData(): ThinqSessionData {
		return {
			accessToken: this.accessTokenValue,
			refreshToken: this.refreshTokenValue,
			expiresAtEpochSeconds: this.expiresAtEpochSecondsValue,
		};
	}

	public static fromData(data: ThinqSessionData): ThinqSession {
		return new ThinqSession(data.accessToken, data.refreshToken, data.expiresAtEpochSeconds);
	}

	private static currentEpochSeconds(): number {
		return Math.round(Date.now() / 1000);
	}
}
