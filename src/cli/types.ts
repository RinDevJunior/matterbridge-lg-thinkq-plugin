import type { ThinqUserData } from '../services/authentication/AuthContext.js';

export interface CliSession {
	readonly loginType: 'account' | 'token';
	readonly country: string;
	readonly language: string;
	readonly userData: ThinqUserData;
}

export const SESSION_FILE = '.cli-session.json';
