import * as Keychain from 'react-native-keychain';
import {
  ACCESS_TOKEN_URL,
  DEVICE_CODE_URL,
  OAUTH_CLIENT_ID,
  OAUTH_SCOPES,
  USER_AGENT,
} from './config';

/* ============================================================
 *  Token storage  (iOS Keychain / Android Keystore via RN-Keychain)
 * ============================================================ */

const TOKEN_SERVICE = 'vibegym.github.token';
const TOKEN_USER = 'oauth';

export interface TokenInfo {
  token: string;
  kind: 'oauth' | 'pat';
  /** GitHub username / login resolved from the token, when known. */
  login?: string;
  /** Full display name from the GitHub profile, when known. */
  name?: string;
  /** Profile picture URL — used as user identity in the home/settings. */
  avatarUrl?: string;
  /** Saved repo full name "owner/repo" for sync, when known. */
  repo?: string;
}

interface StoredToken extends TokenInfo {}

export const saveTokenInfo = async (info: TokenInfo): Promise<void> => {
  await Keychain.setGenericPassword(TOKEN_USER, JSON.stringify(info), {
    service: TOKEN_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });
};

export const loadTokenInfo = async (): Promise<TokenInfo | null> => {
  try {
    const creds = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
    if (!creds) return null;
    return JSON.parse(creds.password) as StoredToken;
  } catch {
    return null;
  }
};

export const clearTokenInfo = async (): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
  } catch {
    /* ignore */
  }
};

/* ============================================================
 *  OAuth Device Flow
 *  https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 * ============================================================ */

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DeviceCodeError {
  error: string;
  description?: string;
}

const githubHeaders = (): Record<string, string> => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': USER_AGENT,
});

export const requestDeviceCode = async (): Promise<DeviceCode> => {
  if (!OAUTH_CLIENT_ID) {
    throw new Error(
      'OAUTH_CLIENT_ID non configurato. Registra una OAuth App su GitHub e imposta il client_id, oppure usa un Personal Access Token.'
    );
  }
  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      client_id: OAUTH_CLIENT_ID,
      scope: OAUTH_SCOPES,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Device code richiesta fallita (${res.status}): ${body}`);
  }
  const data = (await res.json()) as DeviceCode | DeviceCodeError;
  if ('error' in data) {
    throw new Error(data.description ?? data.error);
  }
  return data;
};

interface AccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  interval?: number;
}

const pollOnce = async (deviceCode: string): Promise<AccessTokenResponse> => {
  const res = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      client_id: OAUTH_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });
  return (await res.json()) as AccessTokenResponse;
};

/**
 * Poll GitHub's device endpoint until the user authorizes or things go wrong.
 * Pass an `onCancel` callback that returns true to bail out cleanly.
 */
export const pollForAccessToken = async (
  dc: DeviceCode,
  onCancel: () => boolean
): Promise<string> => {
  const startedAt = Date.now();
  let intervalMs = Math.max(1, dc.interval) * 1000;

  while (Date.now() - startedAt < dc.expires_in * 1000) {
    if (onCancel()) throw new Error('Cancellato');
    await sleep(intervalMs);
    const data = await pollOnce(dc.device_code);
    if (data.access_token) return data.access_token;
    if (data.error) {
      switch (data.error) {
        case 'authorization_pending':
          break;
        case 'slow_down':
          intervalMs = (data.interval ?? Math.ceil(intervalMs / 1000) + 5) * 1000;
          break;
        case 'expired_token':
          throw new Error('Codice scaduto, riprova');
        case 'access_denied':
          throw new Error("Accesso negato dall'utente");
        default:
          throw new Error(data.error_description ?? data.error);
      }
    }
  }
  throw new Error('Tempo scaduto');
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
