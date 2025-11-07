import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  Button,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  DeviceEventEmitter,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import { useFocusEffect } from '@react-navigation/native';

 function useResponsive() {
  const { width, height } = useWindowDimensions();
  const wp = (percent) => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * width);
  };
  const hp = (percent) => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * height);
  };
  const rf = (percent) => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * width);
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return { width, height, wp, hp, rf, clamp };
}
 
const CARD_SLIDE_HEIGHT = 100;
const BLUE = '#0046ff';

 const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MjE4NzAyOCwianRpIjoiMTdlYTVjYTAtZTE3MC00ZjIzLTllMTgtZmZiZWYyMzg4OTE0IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjIxODcwMjgsImV4cCI6MTc2NDc3OTAyOCwicm9sIjoiRWRpdG9yIn0.W_zoGW2YpqCyaxpE1c_hnRXdtw5ty0DDd8jqvDbi6G0';
 
const VISITS_STORAGE_KEY_BASE = 'user_visits';  
const PENDING_VISITS_KEY_BASE = 'pending_visits';
const BRANCHES_CACHE_PREFIX = 'branches_cache_';
const VISITS_MAX = 100000;

const sampleNotifications = [
  { id: 'n1', text: 'Tu reserva en La Pizzería fue confirmada.', read: false },
  { id: 'n2', text: 'Nueva oferta: 20% de descuento en Sushi Place.', read: false },
  { id: 'n3', text: 'Recuerda calificar tu última visita a Café Central.', read: true },
];

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function looksClosedOrPaidFlag(v) {
  if (!v && v !== 0) return false;
  try {
    const s = String(v).toUpperCase();
    return s.includes('CLOS') || s.includes('CERR') || s.includes('CLOSE') || s.includes('CLOSED') ||
           s.includes('PAG') || s.includes('PAID') || s.includes('COMPLET') || s.includes('FINAL');
  } catch (e) { return false; }
}
function safeJsonParse(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('safeJsonParse: parse error', e);
    return fallback;
  }
}

// cache-busting helper (no toca AsyncStorage)
function getCacheBustedUrl(url) {
  if (!url) return null;
  try {
    const ts = Date.now();
    return url.includes('?') ? `${url}&_cb=${ts}` : `${url}?_cb=${ts}`;
  } catch (e) {
    return url;
  }
}

// auth headers helper (opcional Authorization si hay token)
function getAuthHeaders(extra = {}) {
  const base = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
  if (API_AUTH_TOKEN && API_AUTH_TOKEN.trim()) base.Authorization = `Bearer ${API_AUTH_TOKEN}`;
  return base;
}

export default function VisitsScreen({ navigation }) {
  const { width, wp, hp, rf, clamp } = useResponsive(); /* RESPONSIVE */

  const [visits, setVisits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState(null); // display URL (cache-busted)
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const branchesMemRef = useRef({});
  const restaurantsMemRef = useRef({});
  const saveLockRef = useRef(false);

  const pushLog = useCallback((msg, extra) => {
    try {
      const t = new Date().toISOString();
      const full = extra ? `${t} - ${msg} - ${JSON.stringify(extra)}` : `${t} - ${msg}`;
      console.log(full);
    } catch (e) {
      console.log('pushLog error', e);
    }
  }, []);

  const resolveCurrentUserId = useCallback(async () => {
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      const email = await AsyncStorage.getItem('user_email');
      return uid || email || null;
    } 
    catch (e) {
      return null;
    }
  }, []);

  const visitsKeyForUser = (userId) => userId ? `${VISITS_STORAGE_KEY_BASE}_${userId}` : VISITS_STORAGE_KEY_BASE;
  const pendingKeyForUser = (userId) => userId ? `${PENDING_VISITS_KEY_BASE}_${userId}` : PENDING_VISITS_KEY_BASE;

  function parseDateToTs(d) {
    if (!d) return 0;
    try {
      const dt = new Date(d);
      const t = dt.getTime();
      if (!Number.isFinite(t) || t <= 0) {
        const alt = Date.parse(String(d).replace(' ', 'T'));
        return Number.isFinite(alt) ? alt : 0;
      }
      return t;
    } catch (e) {
      return 0;
    }
  }

  /* ------------------------ REUSABLE: load profile (from API) ------------------------
     - lee user_email desde AsyncStorage
     - consulta: `${API_BASE_URL}/api/mobileapp/usuarios?mail=${mail}&presign_ttl=30`
     - SIEMPRE usa la respuesta del API (si existe) para foto_perfil_url y nombre
     - muestra la URL con cache-busting para forzar recarga al actualizar
  ------------------------------------------------------------------------------- */
  const loadProfileFromApi = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (!email) return; // no hay mail -> no hacemos nada

      const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/api/mobileapp/usuarios?mail=${encodeURIComponent(email)}&presign_ttl=30`;
      const headers = getAuthHeaders();

      let res;
      try {
        res = await fetch(endpoint, { method: 'GET', headers });
      } catch (networkErr) {
        console.warn('loadProfileFromApi network error', networkErr);
        return; // no fallback a caché según solicitud
      }

      if (!res.ok) {
        console.warn('loadProfileFromApi http not ok', res.status);
        return; // no fallback a caché según solicitud
      }

      const json = await res.json();
      // estructura esperada: { usuarios: [ { foto_perfil_url, nombre, apellido, mail, ... } ] }
      const usuario = Array.isArray(json?.usuarios) && json.usuarios.length > 0
        ? json.usuarios[0]
        : (Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : null);

      if (!usuario) return;

      // foto (si viene, la usamos; si no viene, no tocamos nada)
      if (usuario.foto_perfil_url) {
        setProfileUrl(getCacheBustedUrl(usuario.foto_perfil_url));
      }

      // nombre (si viene)
      const nombreApi = usuario.nombre ?? usuario.nombre_completo ?? null;
      const apellidoApi = usuario.apellido ?? null;
      if (nombreApi || apellidoApi) {
        let display = '';
        if (nombreApi && apellidoApi) display = `${String(nombreApi).trim()} ${String(apellidoApi).trim()}`;
        else display = (nombreApi ?? apellidoApi ?? '').toString().trim();
        if (display) setUsername(display);
      }
    } catch (err) {
      console.warn('loadProfileFromApi error', err);
      return;
    }
  }, []);

  const saveVisitToStorageForUser = useCallback(async (visit, userId = null) => {
    if (!visit) {
      pushLog('saveVisitToStorageForUser -> no visit provided');
      return false;
    }

    const waitForUnlock = async () => {
      const MAX_WAIT = 2000;
      const STEP = 50;
      let waited = 0;
      while (saveLockRef.current && waited < MAX_WAIT) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, STEP));
        waited += STEP;
      }
      return !saveLockRef.current;
    };

    try {
      let resolvedUserId = userId;
      if (!resolvedUserId) resolvedUserId = currentUserId || await resolveCurrentUserId();
      const keyPerUser = visitsKeyForUser(resolvedUserId || null);
      const keyGlobal = VISITS_STORAGE_KEY_BASE;

      const normalized = {
        id: visit.id ?? visit.sale_id ?? `visit_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
        sale_id: visit.sale_id ?? null,
        restaurantName: visit.restaurantName ?? visit.name ?? visit.restaurante ?? visit.restaurant ?? 'Restaurante',
        restaurantImage: visit.restaurantImage ?? visit.restaurantImageUri ?? visit.logo ?? null,
        bannerImage: visit.bannerImage ?? null,
        mesa: visit.mesa ?? visit.mesa_id ?? null,
        fecha: visit.fecha ? new Date(visit.fecha).toISOString() : new Date().toISOString(),
        total: Number(visit.total ?? visit.amount ?? 0) || 0,
        moneda: visit.moneda ?? visit.currency ?? 'MXN',
        items: Array.isArray(visit.items) ? visit.items : [],
        restaurante_id: visit.restaurante_id ?? visit.restauranteId ?? visit.restaurante ?? null,
        sucursal_id: visit.sucursal_id ?? visit.sucursal ?? visit.sucursalId ?? null,
        monto_propina: Number(visit.monto_propina ?? visit.propina ?? visit.tip ?? 0) || 0,
        propina: Number(visit.propina ?? visit.monto_propina ?? 0) || 0,
        branchName: visit.branchName ?? visit.sucursal_nombre ?? null,
      };

      await waitForUnlock();
      saveLockRef.current = true;
      try {
        // Per-user
        let rawPer = null;
        try { rawPer = await AsyncStorage.getItem(keyPerUser); } catch (e) { rawPer = null; pushLog('read per-user key failed', { keyPerUser, err: String(e) }); }
        let arrPer = safeJsonParse(rawPer, []);
        if (!Array.isArray(arrPer)) arrPer = [];
        arrPer = arrPer.filter(a => !(normalized.sale_id && a.sale_id && String(a.sale_id) === String(normalized.sale_id)) && !(a.id && String(a.id) === String(normalized.id)));
        arrPer.unshift(normalized);
        if (Number.isFinite(VISITS_MAX) && VISITS_MAX > 0 && arrPer.length > VISITS_MAX) arrPer = arrPer.slice(0, VISITS_MAX);
        try { await AsyncStorage.setItem(keyPerUser, JSON.stringify(arrPer)); } catch (e) { pushLog('set per-user failed', { keyPerUser, err: String(e) }); }

        // Global backup as compatibility
        let rawGlob = null;
        try { rawGlob = await AsyncStorage.getItem(keyGlobal); } catch (e) { rawGlob = null; pushLog('read global key failed', { keyGlobal, err: String(e) }); }
        let arrGlob = safeJsonParse(rawGlob, []);
        if (!Array.isArray(arrGlob)) arrGlob = [];
        arrGlob = arrGlob.filter(a => !(normalized.sale_id && a.sale_id && String(a.sale_id) === String(normalized.sale_id)) && !(a.id && String(a.id) === String(normalized.id)));
        arrGlob.unshift(normalized);
        if (Number.isFinite(VISITS_MAX) && VISITS_MAX > 0 && arrGlob.length > VISITS_MAX) arrGlob = arrGlob.slice(0, VISITS_MAX);
        try { await AsyncStorage.setItem(keyGlobal, JSON.stringify(arrGlob)); } catch (e) { pushLog('set global failed', { keyGlobal, err: String(e) }); }

        // remove pending for this sale in per-user pending & global pending
        try {
          if (normalized.sale_id) {
            const perPendKey = pendingKeyForUser(resolvedUserId || null);
            let rawPend = null;
            try { rawPend = await AsyncStorage.getItem(perPendKey); } catch (e) { rawPend = null; pushLog('read perPend failed', { perPendKey, err: String(e) }); }
            let pend = safeJsonParse(rawPend, []);
            if (!Array.isArray(pend)) pend = [];
            pend = pend.filter(p => String(p.sale_id || p.id || '') !== String(normalized.sale_id));
            try { await AsyncStorage.setItem(perPendKey, JSON.stringify(pend)); } catch (e) { /* ignore */ }

            const globPendKey = PENDING_VISITS_KEY_BASE;
            let rawPendG = null;
            try { rawPendG = await AsyncStorage.getItem(globPendKey); } catch (e) { rawPendG = null; }
            let pendG = safeJsonParse(rawPendG, []);
            if (!Array.isArray(pendG)) pendG = [];
            pendG = pendG.filter(p => String(p.sale_id || p.id || '') !== String(normalized.sale_id));
            try { await AsyncStorage.setItem(globPendKey, JSON.stringify(pendG)); } catch (e) { /* ignore */ }
          }
        } catch (e) { /* ignore */ }

        pushLog('saveVisitToStorageForUser -> saved', { keyPerUser, keyGlobal, id: normalized.id, sale_id: normalized.sale_id });
        return true;
      } finally {
        saveLockRef.current = false;
      }
    } catch (err) {
      pushLog('saveVisitToStorageForUser error', { err: String(err) });
      saveLockRef.current = false;
      return false;
    }
  }, [currentUserId, resolveCurrentUserId, pushLog]);

  const migrateGlobalVisitsIfNeeded = useCallback(async (userId) => {
    try {
      if (!userId) return;
      const targetKey = visitsKeyForUser(userId);
      const existing = safeJsonParse(await AsyncStorage.getItem(targetKey), null);
      if (existing) return;
      const globalRaw = await AsyncStorage.getItem(VISITS_STORAGE_KEY_BASE);
      if (globalRaw) {
        const parsed = safeJsonParse(globalRaw, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          try {
            await AsyncStorage.setItem(targetKey, JSON.stringify(parsed));
            try { await AsyncStorage.removeItem(VISITS_STORAGE_KEY_BASE); } catch (e) { /* ignore */ }
            pushLog('Migrated global visits to per-user key', { userId, count: parsed.length });
          } catch (e) {
            pushLog('migrateGlobalVisitsIfNeeded setItem failed', { err: String(e) });
          }
        }
      }
    } catch (e) {
      pushLog('migrateGlobalVisitsIfNeeded error', { err: String(e) });
    }
  }, [pushLog]);

  async function ensureBranchesForRestaurant(restId, forceNetwork = false, logFn = () => {}) {
    if (!restId) {
      logFn('ensureBranchesForRestaurant no restId');
      return [];
    }
    const key = String(restId);
    if (!forceNetwork && branchesMemRef.current[key]) {
      logFn(`branches cached for ${key} (mem) count=${branchesMemRef.current[key].length}`);
      return branchesMemRef.current[key];
    }

    try {
      const rawCache = await AsyncStorage.getItem(BRANCHES_CACHE_PREFIX + key);
      if (rawCache && !forceNetwork) {
        const parsed = safeJsonParse(rawCache, null);
        const arr = parsed && Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        branchesMemRef.current[key] = arr;
        logFn('Branches cache hit for ' + key + ' count=' + arr.length);
        return arr;
      }
    } catch (e) {
      logFn('cache read error', e);
    }

    try {
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/restaurantes/${encodeURIComponent(restId)}/sucursales`;
      logFn('fetching branches from ' + url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
        },
      });
      if (!res.ok) {
        logFn('ensureBranchesForRestaurant -> fetch failed ' + res.status);
        Toast.show(`No pude obtener sucursales (${res.status}) para rest ${restId}`, { duration: Toast.durations.LONG });
        return [];
      }
      const json = await res.json();
      let arr = [];
      if (Array.isArray(json)) arr = json;
      else if (Array.isArray(json.sucursales)) arr = json.sucursales;
      else if (Array.isArray(json.data)) arr = json.data;
      else if (Array.isArray(json.sucursal)) arr = json.sucursal;
      else if (Array.isArray(json.sucursales?.data)) arr = json.sucursales.data;
      else arr = [];
      arr = arr.map(b => (b && typeof b === 'object' ? b : {}));
      branchesMemRef.current[key] = arr;
      try { await AsyncStorage.setItem(BRANCHES_CACHE_PREFIX + key, JSON.stringify({ data: arr, ts: Date.now() })); } catch (e) { logFn('cache write failed', e); }
      logFn(`Fetched branches for rest ${restId}: ${arr.length}`);
      return arr;
    } catch (err) {
      logFn('ensureBranchesForRestaurant error', err);
      Toast.show('Error al obtener sucursales (ver consola)', { duration: Toast.durations.LONG });
      return [];
    }
  }

  async function ensureRestaurantInfo(restId, forceNetwork = false, logFn = () => {}) {
    if (!restId) return null;
    const key = String(restId);
    if (!forceNetwork && restaurantsMemRef.current[key]) {
      logFn(`restaurant info cached for ${key}`);
      return restaurantsMemRef.current[key];
    }
    try {
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/restaurantes/${encodeURIComponent(restId)}`;
      logFn('fetching restaurant info from ' + url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
        },
      });
      if (!res.ok) {
        logFn('ensureRestaurantInfo -> fetch failed ' + res.status);
        return null;
      }
      const json = await res.json();
      restaurantsMemRef.current[key] = json || null;
      return json || null;
    } catch (err) {
      logFn('ensureRestaurantInfo error', err);
      return null;
    }
  }

  async function loadVisitsAndEnrich(logFn = () => {}) {
    try {
      logFn('loadVisitsAndEnrich: resolving user & reading visits');
      const userId = currentUserId || await resolveCurrentUserId();
      setCurrentUserId(userId || null);

      await migrateGlobalVisitsIfNeeded(userId);

      const keyPerUser = visitsKeyForUser(userId);
      let rawPer = null;
      try { rawPer = await AsyncStorage.getItem(keyPerUser); } catch (e) { rawPer = null; logFn('read visits per-user error', e); }
      let arrPer = safeJsonParse(rawPer, []) || [];

      let rawGlob = null;
      try { rawGlob = await AsyncStorage.getItem(VISITS_STORAGE_KEY_BASE); } catch (e) { rawGlob = null; logFn('read visits global error', e); }
      let arrGlob = safeJsonParse(rawGlob, []) || [];

      const seen = new Set();
      const merged = [];

      if (Array.isArray(arrPer)) {
        for (const v of arrPer) {
          if (!v) continue;
          const keyId = v.sale_id ? `s:${String(v.sale_id)}` : `i:${String(v.id)}`;
          if (seen.has(keyId)) continue;
          seen.add(keyId);
          merged.push(v);
        }
      }

      if (Array.isArray(arrGlob)) {
        for (const v of arrGlob) {
          if (!v) continue;
          const keyId = v.sale_id ? `s:${String(v.sale_id)}` : `i:${String(v.id)}`;
          if (seen.has(keyId)) continue;
          seen.add(keyId);
          merged.push(v);
        }
      }

      if (!Array.isArray(merged) || merged.length === 0) {
        setVisits([]);
        logFn('No visits found in per-user or global keys', { keyPerUser, globalKey: VISITS_STORAGE_KEY_BASE });
        return;
      }

      merged.sort((a, b) => parseDateToTs(b.fecha) - parseDateToTs(a.fecha));

      const groupedByRest = {};
      merged.forEach(v => {
        const restId = v.restaurante_id ?? v.restauranteId ?? v.restaurante ?? v.restaurant_id ?? null;
        const keyg = (restId !== undefined && restId !== null) ? String(restId) : '__no_rest__';
        if (!groupedByRest[keyg]) groupedByRest[keyg] = [];
        groupedByRest[keyg].push(v);
      });

      const enriched = merged.map(v => ({ ...v }));

      for (const restKey of Object.keys(groupedByRest)) {
        if (restKey === '__no_rest__') continue;
        const branches = await ensureBranchesForRestaurant(restKey, false, logFn);
        if (!Array.isArray(branches) || branches.length === 0) {
          logFn('no branches for rest ' + restKey);
          continue;
        }
        const restInfo = await ensureRestaurantInfo(restKey, false, logFn);
        const restNombre = restInfo?.nombre ?? restInfo?.name ?? null;

        const mapById = new Map();
        for (const b of branches) {
          try {
            if (b.id !== undefined && b.id !== null) mapById.set(String(b.id), b);
            if (b.sucursal_id !== undefined && b.sucursal_id !== null) mapById.set(String(b.sucursal_id), b);
            if (b.codigo !== undefined && b.codigo !== null) mapById.set(String(b.codigo), b);
          } catch (e) { /* ignore */ }
        }

        for (const visitItem of groupedByRest[restKey]) {
          const visitBranchId = visitItem.sucursal_id ?? visitItem.sucursal ?? visitItem.sucursalId ?? visitItem.branchId ?? null;
          let found = null;

          if (visitBranchId != null && mapById.has(String(visitBranchId))) {
            found = mapById.get(String(visitBranchId));
            logFn('matched by map id', { visitBranchId, foundId: found?.id });
          }

          if (!found) {
            for (const b of branches) {
              if (!b) continue;
              const candidates = [b.id, b.sucursal_id, b.codigo];
              for (const cand of candidates) {
                if (cand === undefined || cand === null) continue;
                if (numericEquals(cand, visitBranchId)) {
                  found = b;
                  break;
                }
              }
              if (found) break;
            }
            if (found) logFn('matched by numericEquals', { visitBranchId, foundId: found?.id });
          }

          if (!found) {
            const visitName = visitItem.restaurantName ?? visitItem.restaurant ?? visitItem.name ?? visitItem.nombre ?? null;
            if (visitName) {
              const vn = String(visitName).toLowerCase().trim();
              for (const b of branches) {
                const bname = String(b?.nombre ?? b?.name ?? '').toLowerCase().trim();
                if (!bname) continue;
                if (bname === vn || bname.includes(vn) || vn.includes(bname)) {
                  found = b;
                  break;
                }
              }
              if (found) logFn('matched by name', { visitName, foundId: found?.id });
            }
          }

          if (!found && branches.length === 1) {
            found = branches[0];
            logFn('fallback single branch used', { restKey, foundId: found?.id });
          }

          if (!found) {
            const forced = await ensureBranchesForRestaurant(restKey, true, logFn);
            for (const b of forced) {
              if (!b) continue;
              if (numericEquals(b.id, visitBranchId) || numericEquals(b.sucursal_id, visitBranchId)) {
                found = b;
                break;
              }
            }
            if (found) logFn('matched after forced fetch', { visitBranchId, foundId: found?.id });
          }

          if (found) {
            const idx = enriched.findIndex(x => (x.sale_id && visitItem.sale_id && String(x.sale_id) === String(visitItem.sale_id)) || x.id === visitItem.id);
            if (idx >= 0) {
              const updated = { ...enriched[idx] };
              const logo = branchGetLogoUrl(found);
              const banner = branchGetBannerUrl(found);
              const name = branchGetName(found);

              if (name) updated.branchName = name;
              if (logo) updated.restaurantImage = logo;
              if (banner) updated.bannerImage = banner;

              if (restNombre) {
                const combined = restNombre + (updated.branchName ? ` — ${updated.branchName}` : '');
                updated.restaurantName = combined;
                updated.branchName = null;
              }

              enriched[idx] = updated;
              logFn('Enriquecida visita', { sale_id: visitItem.sale_id, sucursal_id: visitBranchId, branchName: updated.branchName, logo: !!logo, banner: !!banner });
            }
          } else {
            logFn('No matched branch for visit', { restKey, visitId: visitItem.id ?? visitItem.sale_id, visitBranchId, branchesCount: branches.length });
          }
        }
      }

      enriched.sort((a, b) => parseDateToTs(b.fecha) - parseDateToTs(a.fecha));

      try {
        const userId = userId || currentUserId || await resolveCurrentUserId();
        if (userId) {
          const key = visitsKeyForUser(userId);
          await AsyncStorage.setItem(key, JSON.stringify(enriched));
          logFn('Saved enriched visits to per-user', { key, count: enriched.length });
        }
        try { await AsyncStorage.setItem(VISITS_STORAGE_KEY_BASE, JSON.stringify(enriched)); } catch (e) { /* ignore */ }
      } catch (e) {
        /* ignore */
      }

      setVisits(enriched);
    } catch (err) {
      pushLog('loadVisitsAndEnrich error', err);
      setVisits([]);
    }
  }

  async function loadAndPromotePending(logFn = () => {}) {
    try {
      const userId = currentUserId || await resolveCurrentUserId();
      setCurrentUserId(userId || null);
      const pendKey = pendingKeyForUser(userId);

      let rawPend = null;
      try { rawPend = await AsyncStorage.getItem(pendKey); } catch (e) { rawPend = null; logFn('read pendKey error', e); }
      let pend = safeJsonParse(rawPend, []);
      if (!Array.isArray(pend)) pend = [];

      let rawPendG = null;
      try { rawPendG = await AsyncStorage.getItem(PENDING_VISITS_KEY_BASE); } catch (e) { rawPendG = null; }
      let pendG = safeJsonParse(rawPendG, []);
      if (!Array.isArray(pendG)) pendG = [];

      const mergedPend = [];
      const seen = new Set();
      for (const p of pend) {
        if (!p) continue;
        const key = p.sale_id ? `s:${String(p.sale_id)}` : `i:${String(p.id)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mergedPend.push(p);
      }
      for (const p of pendG) {
        if (!p) continue;
        const key = p.sale_id ? `s:${String(p.sale_id)}` : `i:${String(p.id)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mergedPend.push(p);
      }

      if (!Array.isArray(mergedPend) || mergedPend.length === 0) return;

      const toKeep = [];
      for (const p of mergedPend) {
        const sale = p.sale_id ?? null;
        const rest = p.restaurante_id ?? null;
        const suc = p.sucursal_id ?? null;
        const total = safeNum(p.total ?? 0);
        let promoted = false;

        if (sale && suc && rest) {
          try {
            const paymentsUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/restaurantes/${encodeURIComponent(rest)}/sucursales/${encodeURIComponent(suc)}/ventas/${encodeURIComponent(sale)}/pagos`;
            const payRes = await fetch(paymentsUrl, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
              },
            });
            if (payRes.ok) {
              const payJson = await payRes.json();
              const paymentsTotal = (typeof payJson.payments_total === 'number') ? payJson.payments_total
                : (typeof payJson.paymentsTotal === 'number' ? payJson.paymentsTotal : (Array.isArray(payJson.payments) ? payJson.payments.reduce((s, q) => s + safeNum(q.amount), 0) : safeNum(payJson.payments_total ?? payJson.paymentsTotal ?? 0)));
              const saleState = (payJson.sale_state ?? payJson.saleState ?? payJson.status ?? payJson.state ?? '').toString().toUpperCase();

              const confirmed = (typeof paymentsTotal === 'number' && paymentsTotal + 0.001 >= total) || looksClosedOrPaidFlag(saleState);
              if (confirmed) {
                const visitToSave = {
                  sale_id: sale,
                  restaurante_id: rest,
                  sucursal_id: suc,
                  restaurantName: p.restaurantName ?? p.restaurant ?? null,
                  restaurantImage: p.restaurantImage ?? null,
                  bannerImage: p.bannerImage ?? null,
                  mesa: p.mesa ?? null,
                  fecha: new Date().toISOString(),
                  total: total,
                  moneda: p.moneda ?? 'MXN',
                  items: p.items ?? [],
                  monto_propina: Number(p.monto_propina ?? p.propina ?? p.tip ?? 0) || 0,
                  propina: Number(p.propina ?? p.monto_propina ?? 0) || 0,
                };
                try {
                  await saveVisitToStorageForUser(visitToSave, userId);
                  promoted = true;
                } catch (e) { logFn('promote save err', e); }
              }
            } else {
              logFn('loadAndPromotePending -> pagos http ' + payRes.status);
            }
          } catch (err) {
            logFn('loadAndPromotePending err', err);
          }
        }

        if (!promoted) toKeep.push(p);
      }

      try {
        const perPendKey = pendingKeyForUser(userId);
        await AsyncStorage.setItem(perPendKey, JSON.stringify(toKeep));
        await AsyncStorage.setItem(PENDING_VISITS_KEY_BASE, JSON.stringify(toKeep));
      } catch (e) {
        logFn('Error saving pendKey after promotion', e);
      }
    } catch (err) {
      pushLog('loadAndPromotePending error', err);
    }
  }

  // -------------- REFRESH USER (NAME + PROFILE) helper (usa API SIEMPRE) ----------------
  const refreshUserFromApi = useCallback(async () => {
    await loadProfileFromApi();
  }, [loadProfileFromApi]);

  useEffect(() => {
    (async () => {
      setNotifications(sampleNotifications);
      try {
        // siempre intentar obtener la info del API al montar
        await refreshUserFromApi();
      } catch (err) {
        pushLog('Error refreshing user from API', err);
        Toast.show('No se pudo actualizar datos de usuario', { duration: Toast.durations.SHORT });
      }

      try {
        const uid = await resolveCurrentUserId();
        setCurrentUserId(uid || null);
        await migrateGlobalVisitsIfNeeded(uid);
        await loadAndPromotePending(pushLog);
        await loadVisitsAndEnrich(pushLog);
      } catch (e) {
        pushLog('initial load error', e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Suscripción a evento profileUpdated: cuando se emite, reconsulta al API ----------
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('profileUpdated', async () => {
      try {
        await loadProfileFromApi();
      } catch (e) {
        console.warn('profileUpdated listener error', e);
      }
    });

    return () => {
      try { listener.remove(); } catch (e) { /* ignore */ }
    };
  }, [loadProfileFromApi]);
  // --------------------------------------------------------------------------------------------

  useFocusEffect(useCallback(() => {
    (async () => {
      // Al volver a la pantalla siempre reconsultamos API para foto/nombre y recargamos visitas
      await refreshUserFromApi();
      await loadVisitsAndEnrich(pushLog);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const runStorageHealthCheck = async () => {
    try {
      const uid = currentUserId || await resolveCurrentUserId();
      const perKey = visitsKeyForUser(uid);
      const rawPer = await AsyncStorage.getItem(perKey);
      const rawGlob = await AsyncStorage.getItem(VISITS_STORAGE_KEY_BASE);
      const rawPendPer = await AsyncStorage.getItem(pendingKeyForUser(uid));
      const rawPendG = await AsyncStorage.getItem(PENDING_VISITS_KEY_BASE);
      const perArr = safeJsonParse(rawPer, []);
      const globArr = safeJsonParse(rawGlob, []);
      const pendPerArr = safeJsonParse(rawPendPer, []);
      const pendGArr = safeJsonParse(rawPendG, []);
      const msg = `per:${Array.isArray(perArr)?perArr.length:0} global:${Array.isArray(globArr)?globArr.length:0} pendPer:${Array.isArray(pendPerArr)?pendPerArr.length:0} pendG:${Array.isArray(pendGArr)?pendGArr.length:0}`;
      pushLog('storageHealth', { userId: uid, perKey, msg });
      Toast.show(msg, { duration: Toast.durations.LONG });
      if (Array.isArray(perArr) && perArr.length > 0) {
        const first = perArr[0];
        pushLog('storageHealth sample per-first', { id: first.id, sale_id: first.sale_id, total: first.total });
      } else if (Array.isArray(globArr) && globArr.length > 0) {
        const first = globArr[0];
        pushLog('storageHealth sample glob-first', { id: first.id, sale_id: first.sale_id, total: first.total });
      } else {
        pushLog('storageHealth: no visits present in either key');
      }
    } catch (e) {
      pushLog('runStorageHealthCheck error', e);
      Toast.show('Health check error (ver consola)', { duration: Toast.durations.SHORT });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BLUE} />
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  /* RESPONSIVE computed values used in JSX */
  const headerGradientHeight = clamp(hp(14), 110, 220);
  const avatarWrapperSize = clamp(wp(18), 48, 92);
  const avatarInner = Math.round(avatarWrapperSize * 0.9);
  const contentPaddingHorizontal = Math.max(12, wp(4));
  const modalW = Math.min(Math.max(wp(92), 300), 920);
  const cardLeftWidth = clamp(wp(28), 84, 140);
  const logoSize = clamp(Math.round(cardLeftWidth * 0.66), 48, 84);
  const slideWidth = Math.max(Math.round(width - cardLeftWidth - Math.max(24, wp(6))), Math.round(wp(40)));
  const cardRadius = 12;

  // helper: iniciales desde username
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }]}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.topBar, { paddingHorizontal: contentPaddingHorizontal }]}>
        <Text style={[styles.title, { fontSize: clamp(rf(4.6), 19, 20) }]}>                       Experiencias</Text>

        <View style={styles.iconsRight}>
          <TouchableOpacity onPress={() => setShowNotifications(true)} style={[styles.headerButton, { marginLeft: 12 }]}>
            <Ionicons name="notifications-outline" size={clamp(rf(3.2), 19, 26)} color="#0051c9" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: modalW }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeaderText, { fontSize: clamp(rf(3.6), 16, 20) }]}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={clamp(rf(3), 16, 22)} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalList, { maxHeight: Math.round(hp(40)) }]}>
              {notifications.map(n => (
                <View key={n.id} style={[styles.notificationItem, n.read ? styles.read : styles.unread]}>
                  <Text style={[styles.notificationText, { fontSize: clamp(rf(2.8), 12, 16) }]}>{n.text}</Text>
                </View>
              ))}
            </ScrollView>
            <Button title="Marcar todo como leído" onPress={markAllRead} color={BLUE} />
          </View>
        </View>
      </Modal>

      <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={[styles.headerGradient, { height: headerGradientHeight, borderBottomLeftRadius: Math.round(cardRadius / 1.5), borderBottomRightRadius: Math.round(cardRadius * 5) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={[styles.avatarWrapper, { width: avatarWrapperSize, height: avatarWrapperSize, borderRadius: Math.round(avatarWrapperSize / 2), left: Math.max(12, wp(3)), top: -Math.round(avatarWrapperSize / 3) }]}>
          {profileUrl ? (
            <Image source={{ uri: profileUrl }} style={[styles.avatar, { width: avatarInner, height: avatarInner, borderRadius: Math.round(avatarInner / 2) }]} />
          ) : (
            <View style={[styles.initialsContainer, { width: avatarInner, height: avatarInner, borderRadius: Math.round(avatarInner / 2) }]}>
              <Text style={{ fontSize: Math.round(avatarInner * 0.36), fontWeight: '700', color: BLUE }}>{getInitials(username)}</Text>
            </View>
          )}
        </View>
        <View style={[styles.greetingContainer, { marginLeft: Math.max(84, cardLeftWidth) + 8, paddingTop: Math.max(8, hp(1.5)) }]}>
          <Text style={[styles.greeting, { fontSize: clamp(rf(3.2), 14, 18) }]}>Hola :)</Text>
          <Text style={[styles.username, { fontSize: clamp(rf(4), 18, 28), marginTop: 4 }]}>{username}</Text>
        </View>
      </LinearGradient>

      <View style={[styles.content, { paddingHorizontal: contentPaddingHorizontal, marginTop: Math.max(12, hp(2)) }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { fontSize: clamp(rf(3.2), 14, 18) }]}>Visitas recientes</Text>
          <TouchableOpacity onPress={runStorageHealthCheck} accessibilityLabel="Health check" style={{ padding: 6 }}>
         {/*             <Ionicons name="bug-outline" size={clamp(rf(2.8), 14, 20)} color="#333" />*/} 
         </TouchableOpacity>
        </View>

        {visits.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: '#666' }}>No hay visitas registradas todavía.</Text>
          </View>
        ) : (
          <FlatList
            data={visits}
            keyExtractor={item => String(item.sale_id ?? item.id ?? Math.random())}
            renderItem={({ item }) => <VisitCard item={item} navigation={navigation} slideWidth={slideWidth} cardLeftWidth={cardLeftWidth} logoSize={logoSize} cardRadius={cardRadius} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            initialNumToRender={8}
            maxToRenderPerBatch={12}
            windowSize={15}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------- helpers (sin cambios) ---------------- */
function branchGetLogoUrl(b) {
  return b?.imagen_logo_url ?? b?.imagen_logo ?? b?.logo_url ?? b?.logo ?? b?.imagenLogoUrl ?? null;
}
function branchGetBannerUrl(b) {
  return b?.imagen_banner_url ?? b?.imagen_banner ?? b?.banner_url ?? b?.banner ?? null;
}
function branchGetName(b) {
  return b?.nombre ?? b?.name ?? b?.title ?? b?.nombre_sucursal ?? null;
}
function numericEquals(a, b) {
  if (a === undefined || b === undefined || a === null || b === null) return false;
  try {
    if (String(a) === String(b)) return true;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true;
    return false;
  } catch (e) { return false; }
}
/* ------------------------------------------------------ */

/* VisitCard: únicamente estilos y anchos ahora vienen por props responsivas */
function VisitCard({ item, navigation, slideWidth = 260, cardLeftWidth = 100, logoSize = 64, cardRadius = 12 }) {
  const scrollRef = useRef(null);
  const [idx, setIdx] = useState(0);
  let lastVisitText = '—';
  try {
    if (item.fecha) {
      const dt = new Date(item.fecha);
      if (!Number.isNaN(dt.getTime())) {
        lastVisitText = dt.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
      }
    }
  } catch (e) { lastVisitText = '—'; }

  const displayName = item.restaurantName ?? item.restaurant ?? item.name ?? item.nombre ?? 'Restaurante';
  const branchName = item.branchName ?? item.sucursal_nombre ?? null;
  const logoUri = item.restaurantImage ? String(item.restaurantImage).trim() : null;
  const bannerUri = item.bannerImage ? String(item.bannerImage).trim() : null;

  return (
    <View style={[styles.card, { borderRadius: cardRadius }]}>
      <View style={[styles.cardLeft, { width: cardLeftWidth, paddingVertical: Math.max(10, Math.round(cardLeftWidth * 0.12)) }]}>
        <View style={[styles.logoWrapper, { width: logoSize, height: logoSize, borderRadius: Math.round(logoSize / 2) }]}>
          {logoUri ? <Image source={{ uri: logoUri }} style={[styles.logoImage, { width: logoSize, height: logoSize }]} /> : <Image source={require('../../assets/images/restaurante.jpeg')} style={[styles.logoImage, { width: logoSize, height: logoSize }]} />}
        </View>
        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }, (_, i) => (<Text key={i} style={[styles.star, i < 4 ? styles.starFilled : styles.starEmpty]}>★</Text>))}
        </View>
      </View>

      <View style={[styles.cardRight, { paddingHorizontal: Math.max(8, Math.round(cardLeftWidth * 0.12)) }]}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles.slider, { height: CARD_SLIDE_HEIGHT, width: slideWidth }]} onScroll={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / (slideWidth || 1)))} scrollEventThrottle={16} ref={scrollRef}>
          {bannerUri ? <Image key={'banner'} source={{ uri: bannerUri }} style={[styles.slideImage, { width: slideWidth, height: CARD_SLIDE_HEIGHT }]} /> : <Image key={'fallback'} source={logoUri ? { uri: logoUri } : require('../../assets/images/restaurante.jpeg')} style={[styles.slideImage, { width: slideWidth, height: CARD_SLIDE_HEIGHT }]} />}
        </ScrollView>

        <View style={styles.infoContainer}>
          <Text style={{ fontSize: Math.max(14, Math.round(slideWidth * 0.045)), fontWeight: '700', marginBottom: 4, color:'#000' }}>{displayName}</Text>
          {branchName ? <Text style={{ fontSize: Math.max(12, Math.round(slideWidth * 0.032)), color: '#666', marginBottom: 6 }}>{branchName}</Text> : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última visita</Text>
            <Text style={styles.infoValue1}>{lastVisitText}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monto pagado</Text>
            <Text style={styles.infoValue}>{(Number(item.total || 0)).toFixed(2)} {item.moneda ?? 'MXN'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Calificación</Text>
            <Text style={styles.infoValue}>—</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('ExperiencesDetails', { visit: item })}><Text style={styles.btnText}>Detalle</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Opinion', { visit: item })}><Text style={styles.btnText}>Calificar</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Styles (la mayoría invariables) ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 12 },
  headerButton: { padding: 8 },
  title: { fontWeight: '600', color: '#0046ff' },
  iconsRight: { flexDirection: 'row', alignItems: 'center' },
  tabLogo: { resizeMode: 'contain' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', padding: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  modalHeaderText: { fontSize: 18, color: '#000000' },
  modalList: { paddingHorizontal: 16 },
  notificationItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  notificationText: { fontSize: 14, color: '#333' },
  unread: { backgroundColor: '#eef5ff' },
  read: { backgroundColor: '#fff' },
  headerGradient: { alignSelf: 'center', width: '100%', paddingTop: 6, paddingBottom: 14 },
  avatarWrapper: { position: 'absolute', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  avatar: { resizeMode: 'cover' },
  initialsContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }, // nuevo: contenedor de iniciales
  greetingContainer: { /* marginLeft aplicado en JSX */ },
  greeting: { color: '#fff' },
  username: { color: '#fff' },
  content: { flex: 1, marginTop: 16 },
  sectionTitle: { color: '#0046ff', marginBottom: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 16, overflow: 'hidden' },
  cardLeft: { alignItems: 'center' },
  logoWrapper: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  logoImage: { resizeMode: 'cover' },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  star: { fontSize: 14, marginHorizontal: 1 },
  starFilled: { color: '#FFD700' },
  starEmpty: { color: '#CCC' },
  cardRight: { flex: 1 },
  slider: { /* height dinamico */ },
  slideImage: { marginHorizontal: 4, borderRadius: 8, resizeMode: 'cover' },
  infoContainer: { padding: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 12, color: '#555' },
  infoValue1: { fontSize: 10, color: '#000', fontWeight: '700' },
  infoValue: { fontSize: 13, color: '#000', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 6 },
  buttonRow: { flexDirection: 'row', marginTop: 8, marginHorizontal: 8, marginBottom: 12 },
  btn: { flex: 1, backgroundColor: '#0046ff', paddingVertical: 10, borderRadius: 4, marginHorizontal: 4 },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
