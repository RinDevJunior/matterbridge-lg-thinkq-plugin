# ThinQ CLI Login Helper

A standalone command-line tool for authenticating with LG ThinQ and saving your session for use with the Matterbridge LG ThinQ plugin.

## Setup

Build the project first:

```bash
npm run build:local
```

This compiles TypeScript and generates the CLI binary at `dist/cli.js`.

## Usage

Run the CLI with:

```bash
npm run cli -- --command <command> [options]
```

## Commands

| Command | Options                             | Description                   |
| ------- | ----------------------------------- | ----------------------------- |
| `login` | `--type`, `--country`, `--language` | Authenticate and save session |
| `help`  |                                     | Show help message             |

## Login Command

The `login` command guides you through authentication and saves your credentials to a local session file.

### Options

- `--type`: Authentication method (default: `account`)
  - `account`: Username/password authentication
  - `token`: Refresh token authentication
- `--country`: Country code (default: `US`) — must match your LG ThinQ account region
- `--language`: Language code (default: `en-US`)
- `--debug`: Enable debug logging

### Examples

#### Account-based authentication (default):

```bash
npm run cli -- --command login
```

You will be prompted for:

- Username (email)
- Password

#### Account-based authentication with specific region:

```bash
npm run cli -- --command login --type account --country KR --language ko-KR
```

#### Token-based authentication:

```bash
npm run cli -- --command login --type token
```

You will be prompted for:

- Refresh token

### Example Session Output

```
Login successful. Session saved to .cli-session.json
Session Summary:
  Login Type: account
  Country: US
  Language: en-US
  Access Token: ****XXXX
  Refresh Token: ****XXXX
  Expires At: 2026-09-08T23:59:59.000Z
```

Note: All tokens are masked in the output for security.

## Session File

After successful login, your session is saved to `.cli-session.json` in your working directory:

```json
{
  "loginType": "account",
  "country": "US",
  "language": "en-US",
  "userData": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAtEpochSeconds": 1234567890,
    "country": "US",
    "language": "en-US"
  }
}
```

**⚠️ Important:** This file contains authentication credentials. Keep it secure and do NOT commit it to version control (it is in `.gitignore` by default).

## Notes

### Supported Authentication Methods

- **Account (username/password):** Uses LG's standard account login flow
- **Refresh token:** For previously-saved tokens; skips the full login chain

### Browser-Based SSO

Third-party SSO (Google, Apple, Facebook, Amazon) is not yet supported in this CLI tool. If your account uses only these methods, you will need to use the Matterbridge web UI or manually obtain a refresh token.

### Device Control

This CLI is currently limited to authentication (`login` command). Device discovery and control are not yet available. Those features are handled by the full Matterbridge runtime instead.

### Credentials Security

- Passwords are **never printed** to the console or stored anywhere (only the token is saved).
- All displayed tokens are automatically masked for security.
- Input credentials are read interactively via the terminal, not from command-line arguments, to avoid exposure in shell history.
