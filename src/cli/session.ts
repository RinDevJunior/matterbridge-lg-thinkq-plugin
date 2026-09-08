import fs from 'node:fs';

import { CliSession, SESSION_FILE } from './types.js';

export function saveSession(session: CliSession): void {
	fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}
