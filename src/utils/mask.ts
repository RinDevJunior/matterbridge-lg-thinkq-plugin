/** Masks a secret string, leaving only the last `visibleChars` characters visible (e.g. `****abcd`). */
export function maskSecret(value: string | undefined, visibleChars = 4): string {
	if (!value) {
		return '';
	}

	if (value.length <= visibleChars) {
		return '*'.repeat(value.length);
	}

	return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

/** Field names (case-insensitive) whose values are masked by `maskSensitiveFields` before being logged. */
const SENSITIVE_FIELD_NAMES = new Set([
	'refresh_token',
	'refreshtoken',
	'access_token',
	'accesstoken',
	'password',
	'client_secret',
	'clientsecret',
	'secret',
	'x-emp-token',
	'authorization',
]);

/**
 * Returns a shallow-safe, deep-masked copy of a plain object/record for debug logging: any key matching a known
 * secret field name (refresh/access token, password, client secret, auth headers) is masked via `maskSecret`;
 * everything else is copied as-is. Intended for logging outgoing request headers/bodies without leaking secrets.
 */
export function maskSensitiveFields(source: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
	if (!source) {
		return source;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(source)) {
		if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
			result[key] = typeof value === 'string' ? maskSecret(value) : value;
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			result[key] = maskSensitiveFields(value as Record<string, unknown>);
		} else {
			result[key] = value;
		}
	}

	return result;
}
