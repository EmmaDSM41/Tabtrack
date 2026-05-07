import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@app_token_data';
const RENEW_DAYS = 30;
const RENEW_MS = RENEW_DAYS * 24 * 60 * 60 * 1000;

// Solo para el login que genera token
const AUTH_BASE_URL = 'https://api.tab-track.com';
const LOGIN_BODY = {
  username: 'frontend_editor',
  password: 'B73P6kZbImbC',
};

export let TOKEN = '';
let savedAt = 0;
let refreshPromise = null;

async function saveToken(token) {
  TOKEN = token;
  savedAt = Date.now();

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: TOKEN,
      savedAt,
    })
  );
}

async function loadToken() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    TOKEN = data?.token || '';
    savedAt = data?.savedAt || 0;
    return data;
  } catch (e) {
    return null;
  }
}

function shouldRenew() {
  if (!TOKEN || !savedAt) return true;
  return Date.now() - savedAt >= RENEW_MS;
}

async function requestNewToken() {
  const res = await fetch(`${AUTH_BASE_URL}/api/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(LOGIN_BODY),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`No se pudo obtener token: ${res.status} ${text}`);
  }

  const json = await res.json();

  if (!json?.access_token) {
    throw new Error('La respuesta no trajo access_token');
  }

  await saveToken(json.access_token);
  return json.access_token;
}

export async function ensureToken() {
  if (TOKEN) {
    if (!shouldRenew()) return TOKEN;
  } else {
    await loadToken();
    if (TOKEN && !shouldRenew()) return TOKEN;
  }

  return await refreshToken();
}

export async function refreshToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = requestNewToken()
    .then((token) => token)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function authHeader() {
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}