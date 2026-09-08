/** Context object passed to ThinQ authentication strategies. */
export interface ThinqAuthContext {
	readonly username?: string;
	readonly password?: string;
	readonly refreshToken?: string;
	readonly country: string;
	readonly language: string;
}

/** Result of a successful ThinQ authentication, persisted across restarts. */
export interface ThinqUserData {
	accessToken: string;
	refreshToken: string;
	expiresAtEpochSeconds: number;
	country: string;
	language: string;
	/** LG's numeric account profile ID (`userNo`), fetched post-login and required for `x-user-no`/`x-client-id`. */
	userNumber?: string;
}
