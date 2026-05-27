/**
 * GitHub backend configuration.
 *
 * To enable OAuth Device Flow (the recommended path), register a free GitHub
 * OAuth App at https://github.com/settings/developers and:
 *   1. Tick "Enable Device Flow"
 *   2. Set Homepage URL to anything (e.g. https://vibe-gym.app)
 *   3. Set Authorization callback URL to anything (Device Flow doesn't use it)
 *   4. Copy the Client ID into `OAUTH_CLIENT_ID` below
 *
 * The client id is public — it gets shipped inside the app and that's fine
 * for Device Flow.
 *
 * Users without a configured client_id can still connect via Personal Access
 * Token (PAT) — see SyncScreen.
 */

export const OAUTH_CLIENT_ID: string = '';

export const OAUTH_SCOPES = 'repo';

export const DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const VERIFICATION_URL = 'https://github.com/login/device';

export const GITHUB_API = 'https://api.github.com';

/** Default repo name created when none exists. Users can rename later. */
export const DEFAULT_REPO_NAME = 'vibe-gym-data';

export const USER_AGENT = 'VibeGym-RN/1.0';

export const isOAuthConfigured = (): boolean => OAUTH_CLIENT_ID.trim().length > 0;
