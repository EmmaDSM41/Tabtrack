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
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  PixelRatio,
  ToastAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TOKEN, ensureToken } from '../auth/tokenManager';
import { useBackHandler } from '../hooks/useBackHandler';


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

const VISITS_PAGE_SIZE = 10;

function safeJsonParse(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('safeJsonParse: parse error', e);
    return fallback;
  }
}
function getCacheBustedUrl(url) {
  if (!url) return null;
  try {
    const ts = Date.now();
    return url.includes('?') ? `${url}&_cb=${ts}` : `${url}?_cb=${ts}`;
  } catch (e) {
    return url;
  }
}
function getAuthHeaders(extra = {}) {
  const base = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
  if (TOKEN && TOKEN.trim()) base.Authorization = `Bearer ${TOKEN}`;
  return base;
}

function parseToLocalDate(value) {
  if (value === undefined || value === null) return null;
  try {
    if (value instanceof Date) {
      if (!Number.isNaN(value.getTime())) return value;
      return null;
    }

    const s = String(value).trim();
    if (!s) return null;

    if (/^\d+$/.test(s)) {
      if (s.length === 10) return new Date(Number(s) * 1000);
      if (s.length >= 13) return new Date(Number(s));
      return new Date(Number(s));
    }

    const spaceDateTime = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (spaceDateTime) {
      const year = Number(spaceDateTime[1]);
      const month = Number(spaceDateTime[2]) - 1;
      const day = Number(spaceDateTime[3]);
      const hour = Number(spaceDateTime[4]);
      const minute = Number(spaceDateTime[5]);
      const second = Number(spaceDateTime[6] ?? 0);
      return new Date(year, month, day, hour, minute, second);
    }

    const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]) - 1;
      const day = Number(dateOnly[3]);
      return new Date(year, month, day);
    }

    const isoLike = s.match(/^\d{4}-\d{2}-\d{2}T/);
    if (isoLike) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d;
    }

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  } catch (e) {
    return null;
  }
}

export default function VisitsScreen(props) {
  useBackHandler();
  const navigation = useNavigation();
  const { width, wp, hp, rf, clamp } = useResponsive();
  const insets = useSafeAreaInsets();
  const topSafe = Math.round(Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0)));
  const bottomSafe = Math.round(insets?.bottom ?? 0);
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 36));

  const [allVisits, setAllVisits] = useState([]);       
  const [displayCount, setDisplayCount] = useState(VISITS_PAGE_SIZE); 
  const [manualFilterActive, setManualFilterActive] = useState(false); 
  const [hasMore, setHasMore] = useState(true);         
  const [loadingMore, setLoadingMore] = useState(false);
  const oldestFetchedDateRef = useRef(null);           

  const [loading, setLoading] = useState(true);
  const [fetchingSales, setFetchingSales] = useState(false);

  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const emailRef = useRef(null);
  const MAX_STORE = 100;

  const surveysMemRef = useRef({});
  const SURVEY_FIXED_ID = '8916180a-95fd-46af-bde4-60635cc7e1ab';
  const SURVEY_CACHE_TTL_MS = 5 * 60 * 1000;

  const defaultDesde = new Date();
  defaultDesde.setDate(defaultDesde.getDate() - 29);
  const [desdeDate, setDesdeDate] = useState(defaultDesde);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const branchesMemRef = useRef({});
  const restaurantsMemRef = useRef({});

  const headerGradientHeight = clamp(hp(14), 110, 220);
  const avatarWrapperSize = clamp(wp(18), 48, 92);
  const avatarInner = Math.round(avatarWrapperSize * 0.9);
  const contentPaddingHorizontal = Math.max(12, wp(4));
  const modalW = Math.min(Math.max(wp(92), 300), 920);
  const cardLeftWidth = clamp(wp(28), 84, 140);
  const logoSize = clamp(Math.round(cardLeftWidth * 0.66), 48, 84);
  const slideWidth = Math.max(Math.round(width - cardLeftWidth - Math.max(24, wp(6))), Math.round(wp(40)));
  const cardRadius = 12;

  const MAX_RANGE_DAYS = 31;

  const formatDateYMD = (d) => {
    if (!d) return '';
    const dt = (d instanceof Date) ? d : new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  async function loadSeenIds(email) {
    if (!email) return new Set();
    try {
      const raw = await AsyncStorage.getItem(`notifications_seen_${email}`);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.warn('loadSeenIds err', e);
      return new Set();
    }
  }
  async function saveSeenIds(email, setOfIds) {
    if (!email) return;
    try {
      await AsyncStorage.setItem(`notifications_seen_${email}`, JSON.stringify(Array.from(setOfIds)));
    } catch (e) { console.warn('saveSeenIds err', e); }
  }
  async function loadStoredNotifications(email) {
    if (!email) return [];
    try {
      const raw = await AsyncStorage.getItem(`notifications_store_${email}`);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('loadStoredNotifications err', e);
      return [];
    }
  }
  async function saveStoredNotifications(email, arr) {
    if (!email) return;
    try {
      await AsyncStorage.setItem(`notifications_store_${email}`, JSON.stringify(arr.slice(0, MAX_STORE)));
    } catch (e) { console.warn('saveStoredNotifications err', e); }
  }

  function paymentUniqueId(saleId, payment, idx) {
    const part = payment?.payment_transaction_id ?? payment?.payment_id ?? payment?.fecha_creacion ?? payment?.fecha_pago ?? String(payment?.amount ?? '') + `_${idx}`;
    return `${String(saleId)}_${String(part)}`;
  }

  function todayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function buildNotificationText({ branch, amount, date, saleId }) {
    try {
      const parsed = parseToLocalDate(date);
      const dt = parsed
        ? parsed.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
        : new Date(date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      return `Pago confirmado — ${formatMoney(Number(amount || 0))} — ${dt}`;
    } catch (e) {
      return `Pago confirmado — ${formatMoney(Number(amount || 0))}`;
    }
  }

  async function fetchTodayNotificationsOnce() {
    try {
      const email = emailRef.current ?? await AsyncStorage.getItem('user_email');
      if (!email) return;
      emailRef.current = email;

      const base = API_BASE_URL.replace(/\/$/, '');
      const day = todayIso();
      const url = `${base}/api/mobileapp/usuarios/consumos?email=${encodeURIComponent(email)}&desde=${day}&hasta=${day}`;

      await ensureToken();
      const headers = getAuthHeaders();
      let res = null;
      try {
        res = await fetch(url, { method: 'GET', headers });
      } catch (err) {
        return;
      }
      if (!res || !res.ok) return;
      const json = await res.json();
      const ventas = Array.isArray(json?.venta_id) ? json.venta_id : (Array.isArray(json?.ventas) ? json.ventas : []);
      if (!Array.isArray(ventas) || ventas.length === 0) return;

      const seenSet = await loadSeenIds(email);
      const stored = await loadStoredNotifications(email);
      const storedById = new Map(stored.map(n => [n.id, n]));

      let added = false;

      for (const venta of ventas) {
        const saleId = venta?.venta_id ?? venta?.sale_id ?? venta?.ventaId ?? null;
        const pagos = Array.isArray(venta?.pagos) ? venta.pagos : [];
        if ((!Array.isArray(pagos) || pagos.length === 0) && Array.isArray(venta?.items_consumidos)) {
          const items = venta.items_consumidos;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const state = String(item?.estado ?? '').toLowerCase();
            if (state === 'paid' || state === 'confirmed') {
              const unique = paymentUniqueId(saleId, item, i);
              if (seenSet.has(unique) || storedById.has(unique)) continue;
              const amount = item?.precio_unitario ?? item?.subtotal ?? item?.precio ?? item?.amount ?? 0;
              const date = item?.fecha_pago ?? item?.fecha_creacion ?? venta?.fecha_cierre_venta ?? new Date().toISOString();
              const branch = venta?.nombre_sucursal ?? venta?.nombre_restaurante ?? item?.nombre_sucursal ?? '';

              const branchId = venta?.sucursal_id ?? venta?.sucursal ?? venta?.sucursalId ?? venta?.branch_id ?? venta?.branchId ??
                item?.sucursal_id ?? item?.sucursalId ?? item?.branch_id ?? item?.branchId ?? null;
              const splitsUrl = (saleId && branchId) ? `${base}/api/transacciones-pago/sucursal/${encodeURIComponent(branchId)}/ventas/${encodeURIComponent(saleId)}/splits` : null;

              const notif = {
                id: unique,
                text: buildNotificationText({ branch, amount, date, saleId }),
                amount: Number(amount || 0),
                branch: branch || '',
                branchId: branchId ?? null,
                date,
                saleId,
                url: splitsUrl,
                read: false,
              };
              stored.unshift(notif);
              storedById.set(unique, notif);
              seenSet.add(unique);
              added = true;
            }
          }
          continue;
        }

        for (let i = 0; i < pagos.length; i++) {
          const pago = pagos[i];
          const status = String(pago?.status ?? pago?.estado ?? '').toLowerCase();
          if (status !== 'confirmed' && status !== 'paid') continue;
          const unique = paymentUniqueId(saleId, pago, i);
          if (seenSet.has(unique) || storedById.has(unique)) continue;
          const amount = pago?.amount ?? pago?.precio_unitario ?? pago?.subtotal ?? pago?.monto_propina ?? 0;
          const date = pago?.fecha_creacion ?? pago?.fecha_pago ?? venta?.fecha_cierre_venta ?? new Date().toISOString();
          const branch = venta?.nombre_sucursal ?? venta?.nombre_restaurante ?? pago?.nombre_sucursal ?? '';

          const branchId = venta?.sucursal_id ?? venta?.sucursal ?? venta?.sucursalId ?? venta?.branch_id ?? venta?.branchId ??
            pago?.sucursal_id ?? pago?.sucursalId ?? pago?.branch_id ?? pago?.branchId ?? null;
          const splitsUrl = (saleId && branchId) ? `${base}/api/transacciones-pago/sucursal/${encodeURIComponent(branchId)}/ventas/${encodeURIComponent(saleId)}/splits` : null;

          const notif = {
            id: unique,
            text: buildNotificationText({ branch, amount, date, saleId }),
            amount: Number(amount || 0),
            branch: branch || '',
            branchId: branchId ?? null,
            date,
            saleId,
            url: splitsUrl,
            read: false,
          };
          stored.unshift(notif);
          storedById.set(unique, notif);
          seenSet.add(unique);
          added = true;
        }
      }

      if (added) {
        const uniq = Array.from(storedById.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, MAX_STORE);
        await saveSeenIds(email, seenSet);
        await saveStoredNotifications(email, uniq);
        if (isMountedRef.current) setNotifications(uniq);
      } else {
        if (isMountedRef.current) {
          const sorted = stored.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, MAX_STORE);
          setNotifications(sorted);
        }
      }
    } catch (err) {
      console.warn('fetchTodayNotificationsOnce error', err);
    }
  }

  const markAllRead = useCallback(async () => {
    try {
      const email = emailRef.current ?? await AsyncStorage.getItem('user_email');
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
      if (email) {
        await saveStoredNotifications(email, updated);
      }
    } catch (e) {
      console.warn('markAllRead err', e);
    }
  }, [notifications]);

  const markNotificationAsRead = useCallback(async (notifId) => {
    try {
      const email = emailRef.current ?? await AsyncStorage.getItem('user_email');
      const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
      setNotifications(updated);
      if (email) {
        await saveStoredNotifications(email, updated);
      }
    } catch (e) {
      console.warn('markNotificationAsRead err', e);
    }
  }, [notifications]);

  function findVisitBySaleBranchLocal(visitsArr, saleId, branchId) {
    if (!saleId || !branchId || !Array.isArray(visitsArr)) return null;
    const sId = String(saleId);
    const bId = String(branchId);
    return visitsArr.find(v => {
      const vid = String(v.sale_id ?? v.venta_id ?? v.saleId ?? '');
      const bid = String(v.sucursal_id ?? v.sucursal ?? v.branchId ?? v.branch_id ?? '');
      if (vid === sId && bid === bId) return true;
      if (String(v.id ?? '').startsWith(`${sId}_`) && String(v.id ?? '').includes(`_${bId}`)) return true;
      return false;
    }) ?? null;
  }

  async function handleIncomingNotification(payload) {
    try {
      if (!payload) {
        console.warn('handleIncomingNotification: payload vacío');
        return;
      }
      const data = payload.data ?? payload;
      const saleId = data?.saleId ?? data?.venta_id ?? data?.sale_id ?? data?.sale ?? data?.venta ?? null;
      const branchId = data?.branchId ?? data?.sucursal_id ?? data?.sucursal ?? data?.branch_id ?? data?.branch ?? null;
      const notifId = data?.notifId ?? payload?.id ?? payload?.notifId ?? null;

      if (!saleId || !branchId) {
        console.warn('handleIncomingNotification: faltan saleId o branchId en payload', { saleId, branchId, payload });
      }

      if (notifId) {
        try { await markNotificationAsRead(notifId); } catch (e) { /* ignore */ }
      }

      let visit = findVisitBySaleBranchLocal(allVisits, saleId, branchId);
      if (visit) {
        setShowNotifications(false);
        navigation.navigate('ExperiencesDetails', { visit });
        return;
      }

      try {
        if (manualFilterActive) {
          await applyDateFilter(desdeDate);
        } else {
          await fetchVisitsForDesde(desdeDate);
        }
      } catch (e) {
        console.warn('fetchVisitsForDesde error en handleIncomingNotification', e);
      }

      await new Promise(res => setTimeout(res, 250));
      visit = findVisitBySaleBranchLocal(allVisits, saleId, branchId);
      if (visit) {
        setShowNotifications(false);
        navigation.navigate('ExperiencesDetails', { visit });
        return;
      }

      if (saleId && branchId) {
        setShowNotifications(false);
        navigation.navigate('SaleDetail', { saleId: String(saleId), branchId: String(branchId), branchName: data?.branch ?? data?.nombre_sucursal ?? '' });
        return;
      }

      Toast.show('No hay datos suficientes en la notificación para abrir el detalle.', { duration: Toast.durations.SHORT });

    } catch (err) {
      console.warn('handleIncomingNotification err', err);
    }
  }

  const handleNotificationPress = async (n) => {
    try {
      if (!n) return;
      if (!n.read) await markNotificationAsRead(n.id);
      setShowNotifications(false);
      await handleIncomingNotification(n);
    } catch (err) {
      console.warn('handleNotificationPress err', err);
    }
  };

  const loadProfileFromApi = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (!email) return;
      const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/api/mobileapp/usuarios?mail=${encodeURIComponent(email)}&presign_ttl=30`;
      await ensureToken();
      const headers = getAuthHeaders();
      let res;
      try {
        res = await fetch(endpoint, { method: 'GET', headers });
      } catch (networkErr) {
        console.warn('loadProfileFromApi network error', networkErr);
        return;
      }
      if (!res.ok) {
        console.warn('loadProfileFromApi http not ok', res.status);
        return;
      }
      const json = await res.json();
      const usuario = Array.isArray(json?.usuarios) && json.usuarios.length > 0
        ? json.usuarios[0]
        : (Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : null);
      if (!usuario) return;
      if (usuario.foto_perfil_url) {
        setProfileUrl(getCacheBustedUrl(usuario.foto_perfil_url));
      }
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

  const BRANCHES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min, igual que las encuestas

  async function ensureBranchesForRestaurant(restId, forceNetwork = false) {
    if (!restId) return [];
    const key = String(restId);

    const memCached = branchesMemRef.current[key];
    if (!forceNetwork && memCached && (Date.now() - memCached.ts) < BRANCHES_CACHE_TTL_MS) {
      return memCached.data;
    }

    if (!forceNetwork) {
      try {
        const rawCache = await AsyncStorage.getItem(`branches_cache_${key}`);
        if (rawCache) {
          const parsed = safeJsonParse(rawCache, null);
          if (parsed && Array.isArray(parsed.data) && (Date.now() - (parsed.ts || 0)) < BRANCHES_CACHE_TTL_MS) {
            branchesMemRef.current[key] = { data: parsed.data, ts: parsed.ts };
            return parsed.data;
          }
        }
      } catch (e) { /* ignore */ }
    }

    try {
      await ensureToken();
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/restaurantes/${encodeURIComponent(restId)}/sucursales`;
      const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      if (!res.ok) {
        Toast.show(`No pude obtener sucursales (${res.status}) para rest ${restId}`, { duration: Toast.durations.LONG });
        return [];
      }
      const json = await res.json();
      let arr = [];
      if (Array.isArray(json)) arr = json;
      else if (Array.isArray(json.sucursales)) arr = json.sucursales;
      else if (Array.isArray(json.data)) arr = json.data;

      const ts = Date.now();
      branchesMemRef.current[key] = { data: arr, ts };
      try { await AsyncStorage.setItem(`branches_cache_${key}`, JSON.stringify({ data: arr, ts })); } catch (e) { /* ignore */ }
      return arr;
    } catch (err) {
      Toast.show('Error al obtener sucursales (ver consola)', { duration: Toast.durations.LONG });
      return [];
    }
  }

  async function ensureRestaurantInfo(restId, forceNetwork = false) {
    if (!restId) return null;
    const key = String(restId);
    if (!forceNetwork && restaurantsMemRef.current[key]) return restaurantsMemRef.current[key];
    try {
      await ensureToken();
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/restaurantes/${encodeURIComponent(restId)}`;
      const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      if (!res.ok) return null;
      const json = await res.json();
      restaurantsMemRef.current[key] = json || null;
      return json || null;
    } catch (err) {
      return null;
    }
  }

  function branchGetLogoUrl(b) {
    return b?.imagen_logo_url ?? b?.imagen_logo ?? b?.logo_url ?? b?.logo ?? b?.imagenLogoUrl ?? null;
  }
  function branchGetBannerUrl(b) {
    return b?.imagen_banner_url ?? b?.imagen_banner ?? b?.banner_url ?? b?.banner ?? null;
  }
  function branchGetName(b) {
    return b?.nombre ?? b?.name ?? b?.title ?? b?.nombre_sucursal ?? null;
  }

  function computeSaleTotal(saleEntry) {
    if (!saleEntry) return 0;
    const candidates = [
      saleEntry.monto_total_venta,
      saleEntry.monto_total,
      saleEntry.total,
      saleEntry.monto,
      saleEntry.montoTotal,
      saleEntry.monto_venta,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== '') {
        const n = Number(c);
        if (!Number.isNaN(n)) return n;
      }
    }
    const items = Array.isArray(saleEntry?.items_consumidos) ? saleEntry.items_consumidos : (Array.isArray(saleEntry.items) ? saleEntry.items : []);
    if (Array.isArray(items) && items.length > 0) {
      let sum = 0;
      for (const it of items) {
        const qty = Number(it.cantidad ?? it.quantity ?? 1) || 0;
        const price = Number(it.precio_unitario ?? it.price ?? it.unit_price ?? 0) || 0;
        sum += qty * price;
      }
      if (sum > 0) return sum;
    }
    return 0;
  }

  async function fetchVisitsRange(desdeDateArg, hastaDateArg) {
    const email = await AsyncStorage.getItem('user_email');
    if (!email) {
      Toast.show('No se encontró email del usuario', { duration: Toast.durations.SHORT });
      return null;
    }

    const desdeStr = formatDateYMD(desdeDateArg);
    const hastaStr = formatDateYMD(hastaDateArg);
    const base = API_BASE_URL.replace(/\/$/, '');
    const urlVentas = `${base}/api/mobileapp/usuarios/consumos?email=${encodeURIComponent(email)}&desde=${encodeURIComponent(desdeStr)}&hasta=${encodeURIComponent(hastaStr)}`;

    let resVentas;
    try {
      await ensureToken();
      resVentas = await fetch(urlVentas, { method: 'GET', headers: getAuthHeaders() });
    } catch (err) {
      console.warn('fetch ventas network err', err);
      Toast.show('Error de red al obtener ventas', { duration: Toast.durations.LONG });
      return null;
    }

    if (!resVentas.ok) {
      const txt = await resVentas.text().catch(() => '');
      console.warn('ventas http error', resVentas.status, txt);
      Toast.show(`Error al consultar ventas (${resVentas.status})`, { duration: Toast.durations.LONG });
      return null;
    }

    const jsonVentas = await resVentas.json().catch(() => ({}));
    const ventaArray = Array.isArray(jsonVentas?.venta_id) ? jsonVentas.venta_id : [];

    if (!ventaArray || ventaArray.length === 0) {
      return [];
    }

    const rawCandidates = [];
    for (const v of ventaArray) {
      const ventaId = v?.venta_id ?? v?.sale_id ?? null;
      const sucursalId = v?.sucursal_id ?? v?.sucursal ?? null;
      if (!ventaId || !sucursalId) continue;

      const key = `${ventaId}_${sucursalId}`;
      if (rawCandidates.some(c => c.id === key)) continue;

      const fechaCierreRaw =
        v?.fecha_cierre_venta ??
        v?.fecha_cierre ??
        v?.fecha_pago ??
        v?.created_at ??
        v?.fecha ??
        null;

      const computedTotal = computeSaleTotal(v);
if (!fechaCierreRaw) {
  console.log('Venta sin fecha —', JSON.stringify(v));
}

      rawCandidates.push({
        id: key,
        sale_id: ventaId,
        restaurante_id: v?.restaurante_id ?? v?.restaurante ?? null,
        sucursal_id: sucursalId,
        restaurantName: v?.nombre_restaurante ?? null,
        branchName: v?.nombre_sucursal ?? null,
        restaurantImage: null,
        bannerImage: null,
        fecha: fechaCierreRaw,
        total: computedTotal,
        moneda: v?.moneda ?? 'MXN',
        items: Array.isArray(v?.items_consumidos) ? v.items_consumidos : (Array.isArray(v?.items) ? v.items : []),
        pagos: Array.isArray(v?.pagos) ? v.pagos : [],
      });
    }


    let validCandidates = rawCandidates.filter(c => !(c.total === 0 && !c.fecha));

    const sinFechaCount = validCandidates.filter(c => !c.fecha).length;
    if (sinFechaCount > 0) {
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 1200;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const aunSinFecha = validCandidates.filter(c => !c.fecha);
        if (aunSinFecha.length === 0) break;

        await new Promise(res => setTimeout(res, RETRY_DELAY_MS));

        try {
          await ensureToken();
          const retryRes = await fetch(urlVentas, { method: 'GET', headers: getAuthHeaders() });
          if (!retryRes.ok) break;
          const retryJson = await retryRes.json().catch(() => ({}));
          const retryArray = Array.isArray(retryJson?.venta_id) ? retryJson.venta_id : [];

          const retryMap = new Map();
          for (const v of retryArray) {
            const ventaId = v?.venta_id ?? v?.sale_id ?? null;
            const sucursalId = v?.sucursal_id ?? v?.sucursal ?? null;
            if (!ventaId || !sucursalId) continue;
            const key = `${ventaId}_${sucursalId}`;
            const fechaCierreRaw =
              v?.fecha_cierre_venta ??
              v?.fecha_cierre ??
              v?.fecha_pago ??
              v?.created_at ??
              v?.fecha ??
              null;
            if (fechaCierreRaw) retryMap.set(key, fechaCierreRaw);
          }

          validCandidates = validCandidates.map(c => {
            if (c.fecha) return c;
            const fechaRetry = retryMap.get(c.id);
            return fechaRetry ? { ...c, fecha: fechaRetry } : c;
          });

          console.log(`fetchVisitsRange retry ${attempt + 1}: ${retryMap.size} fechas recuperadas, quedan ${validCandidates.filter(c => !c.fecha).length} sin fecha`);
        } catch (retryErr) {
          console.warn(`fetchVisitsRange retry ${attempt + 1} error`, retryErr);
          break;
        }
      }
    }
    const uniqueRestIds = Array.from(new Set(validCandidates.map(c => c.restaurante_id).filter(Boolean)));
    const restDataById = new Map();
    await Promise.all(uniqueRestIds.map(async (restId) => {
      const [restInfo, branches] = await Promise.all([
        ensureRestaurantInfo(restId, false),
        ensureBranchesForRestaurant(restId, false),
      ]);
      restDataById.set(String(restId), { restInfo, branches });
    }));

    const detailedVisits = validCandidates.map(candidate => {
      const restData = candidate.restaurante_id ? restDataById.get(String(candidate.restaurante_id)) : null;
      if (!restData) return candidate;

      const { restInfo, branches } = restData;
      let matchedBranch = null;
      if (Array.isArray(branches) && branches.length > 0) {
        for (const b of branches) {
          const candidateIds = [b.id, b.sucursal_id, b.codigo];
          if (candidateIds.some(cId => cId !== undefined && cId !== null && String(cId) === String(candidate.sucursal_id))) {
            matchedBranch = b;
            break;
          }
        }
        if (!matchedBranch && branches.length === 1) matchedBranch = branches[0];
      }

      let restaurantImage = null;
      let bannerImage = null;
      let branchName = candidate.branchName;

      let mostrarRating = null;

      if (matchedBranch) {
        const logoUrl = matchedBranch?.imagen_logo_url ?? matchedBranch?.logo_url ?? matchedBranch?.imagen_logo ?? null;
        const bannerUrl = matchedBranch?.imagen_banner_url ?? matchedBranch?.banner_url ?? matchedBranch?.imagen_banner ?? null;
        if (logoUrl) restaurantImage = getCacheBustedUrl(logoUrl);
        if (bannerUrl) bannerImage = getCacheBustedUrl(bannerUrl);
        if (!branchName) branchName = branchGetName(matchedBranch);
        mostrarRating = matchedBranch?.mostrar_rating ?? null;
      }

      if (!restaurantImage && restInfo) {
        const candLogo = restInfo?.imagen_logo_url ?? restInfo?.logo ?? restInfo?.imagen_logo;
        if (candLogo) restaurantImage = getCacheBustedUrl(candLogo);
      }

      return { ...candidate, restaurantImage, bannerImage, branchName, mostrar_rating: mostrarRating };
    });

    detailedVisits.sort((a, b) => {
      const ta = a.fecha ? (new Date(a.fecha).getTime() || 0) : 0;
      const tb = b.fecha ? (new Date(b.fecha).getTime() || 0) : 0;
      return tb - ta;
    });

    return detailedVisits;
  }


  const fetchVisitsForDesde = useCallback(async (desdeDateParam) => {
    setFetchingSales(true);
    try {
      const desdeCandidate = (desdeDateParam instanceof Date) ? desdeDateParam : new Date(desdeDateParam);
      const hoy = new Date();
      const startOfHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const diffMs = startOfHoy.getTime() - new Date(desdeCandidate.getFullYear(), desdeCandidate.getMonth(), desdeCandidate.getDate()).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > MAX_RANGE_DAYS) {
        const cappedDate = new Date(startOfHoy.getTime() - (MAX_RANGE_DAYS * 24 * 60 * 60 * 1000));
        setDesdeDate(cappedDate);
        Toast.show(
          `El rango máximo es ${MAX_RANGE_DAYS} días. Mostrando desde ${formatDateYMD(cappedDate)}.`,
          { duration: Toast.durations.LONG }
        );
        desdeCandidate.setTime(cappedDate.getTime());
      }

      const result = await fetchVisitsRange(desdeCandidate, new Date());
      if (result === null) return; 

      setAllVisits(result);
      setDisplayCount(VISITS_PAGE_SIZE);
      setManualFilterActive(false);
      oldestFetchedDateRef.current = desdeCandidate;
      setHasMore(true); 

      fetchRatingsForVisits(result.slice(0, VISITS_PAGE_SIZE)).catch(e =>
        console.warn('fetchRatingsForVisits err', e)
      );

      if (result.length === 0) {
        Toast.show('No se encontraron visitas para las fechas seleccionadas.', { duration: Toast.durations.SHORT });
      }
    } catch (err) {
      console.warn('fetchVisitsForDesde error', err);
      Toast.show('Error al obtener visitas (ver consola)', { duration: Toast.durations.LONG });
    } finally {
      setFetchingSales(false);
      setLoading(false);
    }
  }, []);


  const applyDateFilter = useCallback(async (desdeDateParam) => {
    setFetchingSales(true);
    try {
      const desdeCandidate = (desdeDateParam instanceof Date) ? desdeDateParam : new Date(desdeDateParam);
      const hoy = new Date();
      const startOfHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const diffMs = startOfHoy.getTime() - new Date(desdeCandidate.getFullYear(), desdeCandidate.getMonth(), desdeCandidate.getDate()).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > MAX_RANGE_DAYS) {
        const cappedDate = new Date(startOfHoy.getTime() - (MAX_RANGE_DAYS * 24 * 60 * 60 * 1000));
        setDesdeDate(cappedDate);
        Toast.show(
          `El rango máximo es ${MAX_RANGE_DAYS} días. Mostrando desde ${formatDateYMD(cappedDate)}.`,
          { duration: Toast.durations.LONG }
        );
        desdeCandidate.setTime(cappedDate.getTime());
      }

      const result = await fetchVisitsRange(desdeCandidate, new Date());
      if (result === null) return;

      setAllVisits(result);
      setDisplayCount(result.length || VISITS_PAGE_SIZE); 
      setManualFilterActive(true);
      oldestFetchedDateRef.current = desdeCandidate;
      setHasMore(false); 

      fetchRatingsForVisits(result).catch(e =>
        console.warn('fetchRatingsForVisits err', e)
      );

      if (result.length === 0) {
        Toast.show(
          `No hay visitas entre ${formatDateYMD(desdeCandidate)} y ${formatDateYMD(new Date())}. Intenta con otro rango de fechas.`,
          { duration: Toast.durations.LONG }
        );
      }
    } catch (err) {
      console.warn('applyDateFilter error', err);
      Toast.show('Error al obtener visitas (ver consola)', { duration: Toast.durations.LONG });
    } finally {
      setFetchingSales(false);
      setLoading(false);
    }
  }, []);

 
const loadMore = useCallback(async () => {
    if (loadingMore || manualFilterActive) return;

    if (displayCount < allVisits.length) {
      setDisplayCount(prev => Math.min(prev + VISITS_PAGE_SIZE, allVisits.length));

      const sinFecha = allVisits.filter(v => !v.fecha);
      if (sinFecha.length > 0) {
        fetchVisitsRange(desdeDate, new Date())
          .then(refreshed => {
            if (!refreshed || refreshed.length === 0) return;
            setAllVisits(prev => {
              const map = new Map(prev.map(v => [v.id, v]));
              refreshed.forEach(v => {
                if (v.fecha && map.has(v.id)) {
                  map.set(v.id, { ...map.get(v.id), fecha: v.fecha });
                }
              });
              return Array.from(map.values()).sort((a, b) => {
                const ta = a.fecha ? (new Date(a.fecha).getTime() || 0) : 0;
                const tb = b.fecha ? (new Date(b.fecha).getTime() || 0) : 0;
                return tb - ta;
              });
            });
          })
          .catch(e => console.warn('refresh fechas nulas err', e));
      }
      return;
    }

    if (!hasMore) return;

    setLoadingMore(true);
    try {
      const currentOldest = oldestFetchedDateRef.current ?? desdeDate;
      const newHasta = new Date(currentOldest);
      newHasta.setDate(newHasta.getDate() - 1);
      const newDesde = new Date(newHasta);
      newDesde.setDate(newDesde.getDate() - (MAX_RANGE_DAYS - 1));

      const more = await fetchVisitsRange(newDesde, newHasta);

      if (!more || more.length === 0) {
        setHasMore(false);
      } else {
        setAllVisits(prev => {
          const map = new Map(prev.map(v => [v.id, v]));
          more.forEach(v => { if (!map.has(v.id)) map.set(v.id, v); });
          const merged = Array.from(map.values()).sort((a, b) => {
            const ta = a.fecha ? (new Date(a.fecha).getTime() || 0) : 0;
            const tb = b.fecha ? (new Date(b.fecha).getTime() || 0) : 0;
            return tb - ta;
          });
          return merged;
        });
        setDisplayCount(prev => prev + VISITS_PAGE_SIZE);
        oldestFetchedDateRef.current = newDesde;

        fetchRatingsForVisits(more).catch(e => console.warn('fetchRatingsForVisits loadMore err', e));

        const resolverFechasNulas = async (intentosRestantes = 4) => {
          if (intentosRestantes <= 0) return;
          
          setAllVisits(prev => {
            const sinFecha = prev.filter(v => !v.fecha);
            if (sinFecha.length === 0) return prev; 

            (async () => {
              try {
                await new Promise(res => setTimeout(res, 800));
                const refreshed = await fetchVisitsRange(desdeDate, new Date());
                if (!refreshed || refreshed.length === 0) return;

                setAllVisits(current => {
                  const map = new Map(current.map(v => [v.id, v]));
                  let parcheadas = 0;
                  refreshed.forEach(v => {
                    if (v.fecha && map.has(v.id) && !map.get(v.id).fecha) {
                      map.set(v.id, { ...map.get(v.id), fecha: v.fecha });
                      parcheadas++;
                    }
                  });
                  if (parcheadas === 0) return current; 

                  const resultado = Array.from(map.values()).sort((a, b) => {
                    const ta = a.fecha ? (new Date(a.fecha).getTime() || 0) : 0;
                    const tb = b.fecha ? (new Date(b.fecha).getTime() || 0) : 0;
                    return tb - ta;
                  });

                  
                  const aunSinFecha = resultado.filter(v => !v.fecha).length;
                  if (aunSinFecha > 0) {
                    resolverFechasNulas(intentosRestantes - 1);
                  }

                  return resultado;
                });
              } catch (e) {
                console.warn('resolverFechasNulas err', e);
              }
            })();

            return prev; 
          });
        };

        resolverFechasNulas();
      }
    } catch (err) {
      console.warn('loadMore error', err);
      Toast.show('Error al cargar más visitas', { duration: Toast.durations.SHORT });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, manualFilterActive, displayCount, allVisits, hasMore, desdeDate]);

  const resetToDefault = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    setDesdeDate(d);
    fetchVisitsForDesde(d);
  }, [fetchVisitsForDesde]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadProfileFromApi();
      fetchVisitsForDesde(desdeDate);
      setLoading(false);
    })();

    isMountedRef.current = true;
    (async () => {
      const e = await AsyncStorage.getItem('user_email');
      emailRef.current = e ?? null;
      if (emailRef.current) {
        const stored = await loadStoredNotifications(emailRef.current);
        if (isMountedRef.current && Array.isArray(stored) && stored.length > 0) {
          const sorted = stored.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          setNotifications(sorted);
        }
      }
      await fetchTodayNotificationsOnce();
      const pollSeconds = 12;
      pollIntervalRef.current = setInterval(() => {
        fetchTodayNotificationsOnce().catch(err => console.warn('poll fetch error', err));
      }, pollSeconds * 1000);
    })();

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useFocusEffect(useCallback(() => {
    if (manualFilterActive) {
      applyDateFilter(desdeDate);
    } else {
      fetchVisitsForDesde(desdeDate);
    }
    (async () => {
      if (!emailRef.current) emailRef.current = await AsyncStorage.getItem('user_email');
      await fetchTodayNotificationsOnce();
    })();
  }, [desdeDate]));

  const onPressDesde = () => setShowDatePicker(true);
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed') {
      return;
    }
    const d = selectedDate || desdeDate;
    setDesdeDate(d);
    applyDateFilter(d); 
  };

  function formatMoney(n) {
    return Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  }

  function NotificationRow({ n, onPress }) {
    const parsed = parseToLocalDate(n.date);
    const dateLabel = parsed ? parsed.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return (
      <TouchableOpacity onPress={onPress} style={[styles.notificationItemLarge, n.read ? styles.readCard : styles.unreadCard]} activeOpacity={0.8}>
        <View style={styles.notLeft}>
          <Text style={styles.notBranch}>Confirmacion de pago</Text>
          <Text style={styles.notBranch} numberOfLines={1}>{n.branch || `Venta ${n.saleId || ''}`}</Text>
          <Text style={styles.notDate}>{dateLabel}</Text>
        </View>

        <View style={styles.notRight}>
          <Text style={styles.notAmount}>{formatMoney(n.amount ?? 0)}</Text>
          <Text style={styles.notCurrency}>MXN</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  async function fetchSurveyForBranch(sucursalId) {
    if (!sucursalId) return null;
    const key = String(sucursalId);
    const now = Date.now();
    try {
      const cached = surveysMemRef.current[key];
      if (cached && (now - cached.ts) < SURVEY_CACHE_TTL_MS) {
        return cached.value;
      }
    } catch (e) { /* ignore */ }

    try {
      await ensureToken();
      const base = API_BASE_URL.replace(/\/$/, '');
      const url = `${base}/api/encuestas/${SURVEY_FIXED_ID}/reportes?sucursal_id=${encodeURIComponent(String(sucursalId))}`;
      const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      if (!res || !res.ok) {
        surveysMemRef.current[key] = { ts: Date.now(), value: null };
        return null;
      }
      const json = await res.json().catch(() => null);
      if (!json) {
        surveysMemRef.current[key] = { ts: Date.now(), value: null };
        return null;
      }

      let node = null;
      if (Array.isArray(json.resumen_por_sucursal)) {
        node = json.resumen_por_sucursal.find(r => {
          if (r == null) return false;
          return String(r.sucursal_id ?? r.sucursal ?? '').trim() === String(sucursalId).trim();
        }) ?? json.resumen_por_sucursal[0] ?? null;
      } else if (json.resumen_por_sucursal && typeof json.resumen_por_sucursal === 'object') {
        node = json.resumen_por_sucursal;
      } else {
        node = null;
      }

      if (!node || !Array.isArray(node.preguntas)) {
        surveysMemRef.current[key] = { ts: Date.now(), value: null };
        return null;
      }

      const starQuestions = node.preguntas.filter(p => String(p.tipo ?? '').toUpperCase() === 'ESTRELLAS' || String(p.tipo ?? '').toUpperCase() === 'STARS');
      if (!starQuestions || starQuestions.length === 0) {
        surveysMemRef.current[key] = { ts: Date.now(), value: null };
        return null;
      }

      let sum = 0;
      let cnt = 0;
      for (const q of starQuestions) {
        const v = q.promedio;
        const n = (v === undefined || v === null) ? NaN : Number(v);
        if (!Number.isNaN(n)) {
          sum += n;
          cnt += 1;
        }
      }
      if (cnt === 0) {
        surveysMemRef.current[key] = { ts: Date.now(), value: null };
        return null;
      }
      const avg = sum / cnt;
      const norm = Math.max(0, Math.min(5, avg));
      surveysMemRef.current[key] = { ts: Date.now(), value: norm };
      return norm;
    } catch (err) {
      console.warn('fetchSurveyForBranch err', err);
      try { surveysMemRef.current[String(sucursalId)] = { ts: Date.now(), value: null }; } catch (e) {}
      return null;
    }
  }

  async function fetchRatingsForVisits(visitsArr) {
    if (!Array.isArray(visitsArr) || visitsArr.length === 0) return;
    const uniqueBranchIds = Array.from(new Set(visitsArr.map(v => v.sucursal_id ?? v.sucursal ?? v.branchId ?? v.branch_id).filter(Boolean)));
    if (uniqueBranchIds.length === 0) return;

    try {
      const promises = uniqueBranchIds.map(id => fetchSurveyForBranch(id));
      const results = await Promise.all(promises);
      const map = new Map();
      for (let i = 0; i < uniqueBranchIds.length; i++) {
        map.set(String(uniqueBranchIds[i]), results[i]);
      }

      if (!isMountedRef.current) return;
      setAllVisits(prev => prev.map(v => {
        const bid = String(v.sucursal_id ?? v.sucursal ?? v.branchId ?? v.branch_id ?? '');
        if (!map.has(bid)) return v;
        const rating = map.get(bid);
        return { ...v, rating: (rating === null || rating === undefined) ? null : Number(rating) };
      }));
    } catch (err) {
      console.warn('fetchRatingsForVisits err', err);
    }
  }

  const visibleVisits = allVisits.slice(0, displayCount);
  const canLoadMore = !manualFilterActive && (displayCount < allVisits.length || hasMore);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BLUE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { paddingHorizontal: contentPaddingHorizontal, paddingTop: 6 }]}>
        <Text style={[styles.title, { fontSize: clamp(rf(4.6), 19, 20) }]}>Experiencias</Text>

        <View style={styles.iconsRight}>
          <TouchableOpacity
            onPress={async () => {
              try {
                await markAllRead();
              } catch (e) {
                console.warn('markAllRead on bell press failed', e);
              } finally {
                setShowNotifications(true);
              }
            }}
            style={[styles.headerButton, { marginLeft: 12 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={18} color="#0051c9" />
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
              <Text style={[styles.modalListHeaderText, { fontSize: clamp(rf(3.6), 16, 20) }]}>Ultimas notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={clamp(rf(3), 16, 22)} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalList, { maxHeight: Math.round(Math.min(hp(60), 420)) }]}>
              {notifications && notifications.length > 0 ? (
                notifications.map(n => <NotificationRow key={n.id} n={n} onPress={() => handleNotificationPress(n)} />)
              ) : (
                <View style={styles.noNotifications}>
                  <Text style={styles.noNotificationsText}>No hay notificaciones nuevas.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
        style={[styles.headerGradient, { height: headerGradientHeight, borderBottomLeftRadius: Math.round(cardRadius / 1.5), borderBottomRightRadius: Math.round(cardRadius * 5) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={[styles.avatarWrapper, { width: avatarWrapperSize, height: avatarWrapperSize, borderRadius: Math.round(avatarWrapperSize / 2), left: Math.max(12, sidePad * 0.7), top: -Math.round(avatarWrapperSize / 3), elevation: 6 }]}>
          {profileUrl ? (
            <Image source={{ uri: profileUrl }} style={[styles.avatar, { width: avatarInner, height: avatarInner, borderRadius: Math.round(avatarInner / 2) }]} />
          ) : (
            <View style={[styles.initialsContainer, { width: avatarInner, height: avatarInner, borderRadius: Math.round(avatarInner / 2) }]}>
              <Text style={{ fontSize: Math.round(avatarInner * 0.36), fontWeight: '700', color: BLUE }}>{getInitials(username)}</Text>
            </View>
          )}
        </View>
        <View style={[styles.greetingContainer, { marginLeft: Math.max(84, cardLeftWidth) - 8, paddingTop: Math.max(5, hp(1.2)) }]}>
          <Text style={[styles.greeting, { fontSize: clamp(rf(3.2), 14, 18) }]}>Hola :)</Text>
          <Text style={[styles.username, { fontSize: clamp(rf(4), 18, 28), marginTop: 4 }]} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: contentPaddingHorizontal, marginTop: 12 }}>
        <Text style={[styles.sectionTitle, { fontSize: clamp(rf(3.2), 14, 18) }]}>Visitas recientes</Text>

{/*         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {manualFilterActive && (
            <TouchableOpacity onPress={resetToDefault} style={{ marginRight: 8 }}>
              <Text style={{ color: '#0066FF', fontSize: 12, fontWeight: '600' }}>Quitar filtro</Text>
            </TouchableOpacity>
          )}
          <Text style={{ marginRight: 8, color: '#666' }}>Desde:</Text>
          <TouchableOpacity onPress={onPressDesde} style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
            <Text style={{ color: "#000" }}>{formatDateYMD(desdeDate)}</Text>
          </TouchableOpacity>
        </View> */}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={desdeDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          maximumDate={new Date()}
          onChange={onChangeDate}
        />
      )}

      <View style={[styles.content, { paddingHorizontal: contentPaddingHorizontal, marginTop: Math.max(12, hp(2)) }]}>
        {allVisits.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: '#666' }}>{fetchingSales ? 'Buscando visitas...' : 'No hay visitas para las fechas seleccionadas.'}</Text>
          </View>
        ) : (
          <FlatList
            data={visibleVisits}
            keyExtractor={item => String(item.id ?? `${item.sale_id ?? ''}_${item.sucursal_id ?? ''}`)}
            renderItem={({ item }) => <VisitCard item={item} navigation={navigation} slideWidth={slideWidth} cardLeftWidth={cardLeftWidth} logoSize={logoSize} cardRadius={cardRadius} />}
            contentContainerStyle={{ paddingBottom: 24 + bottomSafe }}
            initialNumToRender={6}
            maxToRenderPerBatch={12}
            windowSize={11}
            ListFooterComponent={
              canLoadMore ? (
                <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={styles.loadMoreBtn}>
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={BLUE} />
                  ) : (
                    <Text style={styles.loadMoreText}>Ver más</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
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
function getInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function VisitCard({ item, navigation, slideWidth = 260, cardLeftWidth = 100, logoSize = 64, cardRadius = 12 }) {
  const [idx, setIdx] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  let lastVisitText = '—';
  try {
    if (item.fecha) {
      const parsed = parseToLocalDate(item.fecha);
      if (parsed && !Number.isNaN(parsed.getTime())) {
        lastVisitText = parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
      }
    }
  } catch (e) { lastVisitText = '—'; }

  const displayName = item.restaurantName ?? item.restaurant ?? item.name ?? item.nombre ?? 'Restaurante';
  const branchName = item.branchName ?? item.sucursal_nombre ?? null;
  const logoUri = item.restaurantImage ? String(item.restaurantImage).trim() : null;
  const bannerUri = item.bannerImage ? String(item.bannerImage).trim() : null;

  const rating = (item.rating === undefined || item.rating === null) ? null : Number(item.rating);
  const safeRating = (rating === null || Number.isNaN(rating)) ? null : Math.max(0, Math.min(5, rating));


  const shouldShowRating = !!(
    item?.mostrar_rating === true ||
    (item?.mostrar_rating && String(item.mostrar_rating).toLowerCase() === 'true')
  );

  const starSize = 16;
  const containerWidth = Math.round(starSize * 1.25);

  const renderPartialStar = (index, fillRatio) => {
    const ratio = Math.max(0, Math.min(1, fillRatio));
    const fillWidth = Math.round(containerWidth * ratio);
    const minFill = (ratio > 0 && fillWidth < 1) ? 1 : fillWidth;
    return (
      <View
        key={`star_${index}`}
        style={{
          width: containerWidth,
          height: starSize,
          marginHorizontal: 1,
          position: 'relative',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
        accessible={false}
        pointerEvents="none"
      >
        <Text
          style={{
            fontSize: starSize,
            lineHeight: starSize,
            color: '#CCC',
            includeFontPadding: false,
            textAlign: 'left',
            width: containerWidth,
            allowFontScaling: false,
          }}
        >
          ★
        </Text>

        {ratio > 0 && (
          <View style={{ position: 'absolute', left: 0, top: 0, width: minFill, height: starSize, overflow: 'hidden' }}>
            <Text
              style={{
                fontSize: starSize,
                lineHeight: starSize,
                color: '#FFD700',
                includeFontPadding: false,
                textAlign: 'left',
                width: containerWidth,
                allowFontScaling: false,
              }}
            >
              ★
            </Text>
          </View>
        )}
      </View>
    );
  };

  const stars = Array.from({ length: 5 }, (_, i) => {
    let fill = 0;
    if (safeRating === null) fill = 0;
    else {
      const diff = safeRating - i;
      fill = Math.max(0, Math.min(1, diff));
    }
    return renderPartialStar(i, fill);
  });

  return (
    <View style={[styles.card, { borderRadius: cardRadius }]}>
      <View style={[styles.cardLeft, { width: cardLeftWidth, paddingVertical: Math.max(10, Math.round(cardLeftWidth * 0.12)) }]}>
        <View style={[styles.logoWrapper, { width: logoSize, height: logoSize, borderRadius: Math.round(logoSize / 2) }]}>
          {logoUri && !logoError ? (
            <Image
              source={{ uri: logoUri }}
              style={[styles.logoImage, { width: logoSize, height: logoSize }]}
              onError={() => setLogoError(true)}
            />
          ) : (
            <Image
              source={require('../../assets/images/restaurante.jpeg')}
              style={[styles.logoImage, { width: logoSize, height: logoSize }]}
            />
          )}
        </View>
        <View style={styles.ratingRow}>
          {shouldShowRating && stars}
        </View>
      </View>

      <View style={[styles.cardRight, { paddingHorizontal: Math.max(8, Math.round(cardLeftWidth * 0.12)) }]}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles.slider, { height: CARD_SLIDE_HEIGHT, width: slideWidth }]} onScroll={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / (slideWidth || 1)))} scrollEventThrottle={16}>
          {bannerUri && !bannerError ? (
            <Image
              key={'banner'}
              source={{ uri: bannerUri }}
              style={[styles.slideImage, { width: slideWidth, height: CARD_SLIDE_HEIGHT }]}
              onError={() => setBannerError(true)}
            />
          ) : (
            <Image
              key={'fallback'}
              source={logoUri && !logoError ? { uri: logoUri } : require('../../assets/images/restaurante.jpeg')}
              style={[styles.slideImage, { width: slideWidth, height: CARD_SLIDE_HEIGHT }]}
            />
          )}
        </ScrollView>

        <View style={styles.infoContainer}>
          <Text style={{ fontSize: Math.max(14, Math.round(slideWidth * 0.045)), fontWeight: '700', marginBottom: 4, color: '#000' }} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
          {branchName ? <Text style={{ fontSize: Math.max(12, Math.round(slideWidth * 0.032)), color: '#666', marginBottom: 6 }} numberOfLines={1} ellipsizeMode="tail">{branchName}</Text> : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última visita</Text>
            <Text style={styles.infoValue1}>{lastVisitText}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monto pagado</Text>
            <Text style={styles.infoValue}>{Number(item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.moneda ?? 'MXN'}</Text>          
            </View>
          <View style={styles.divider} />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('ExperiencesDetails', { visit: item })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={styles.btnText}>Detalle</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Opinion', { visit: item })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={styles.btnText}>Calificar</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 12 },
  headerButton: { padding: 8 },
  title: { fontWeight: '600', color: '#0046ff', marginLeft: 120, },
  iconsRight: { flexDirection: 'row', alignItems: 'center' },
  tabLogo: { resizeMode: 'contain' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalHeaderText: { fontSize: 18, color: '#000000' },

  modalListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f1f1' },
  modalListHeaderText: { fontWeight: '700', color: '#222' },
  markAllText: { color: '#0066FF', fontWeight: '700' },

  modalList: { paddingHorizontal: 12 },

  notificationItemLarge: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eef3ff',
    backgroundColor: '#fff'
  },
  unreadCard: { backgroundColor: '#f2f8ff', borderColor: '#d7e8ff' },
  readCard: { backgroundColor: '#ffffff', borderColor: '#f0f0f0' },

  notLeft: { flex: 1, paddingRight: 8 },
  notRight: { alignItems: 'flex-end', justifyContent: 'center' },

  notBranch: { fontWeight: '800', fontSize: 14, color: '#111', marginBottom: 2 },
  notSale: { color: '#666', fontSize: 12, marginBottom: 2 },
  notDate: { color: '#888', fontSize: 11 },

  notAmount: { fontWeight: '900', fontSize: 16, color: '#0b58ff' },
  notCurrency: { color: '#666', fontSize: 11 },

  noNotifications: { padding: 28, alignItems: 'center', justifyContent: 'center' },
  noNotificationsText: { color: '#666' },

  markReadButton: { padding: 12, backgroundColor: '#0046ff', alignItems: 'center', margin: 16, borderRadius: 8 },
  markReadText: { color: '#fff', fontWeight: '600' },

  headerGradient: { alignSelf: 'center', width: '100%', paddingTop: 6, paddingBottom: 14 },
  avatarWrapper: { position: 'absolute', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatar: { resizeMode: 'cover' },
  initialsContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  greetingContainer: {},
  greeting: { color: '#fff' },
  username: { color: '#fff' },
  content: { flex: 1, marginTop: 16 },
  sectionTitle: { color: '#0046ff', marginBottom: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 16, overflow: 'hidden', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  cardLeft: { alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#fff', justifyContent: 'center' },
  logoWrapper: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logoImage: { resizeMode: 'cover', borderRadius: 999 },
  ratingRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center' },
  star: { fontSize: 14, marginHorizontal: 1 },
  starFilled: { color: '#FFD700' },
  starEmpty: { color: '#CCC' },
  cardRight: { flex: 1, backgroundColor: '#fff' },
  slider: {},
  slideImage: { marginHorizontal: 4, borderRadius: 8, resizeMode: 'cover' },
  infoContainer: { padding: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 12, color: '#555' },
  infoValue1: { fontSize: 10, color: '#000', fontWeight: '700' },
  infoValue: { fontSize: 13, color: '#000', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 6 },
  buttonRow: { flexDirection: 'row', marginTop: 8, marginHorizontal: 8, marginBottom: 12 },
  btn: { flex: 1, backgroundColor: '#0046ff', paddingVertical: 10, borderRadius: 4, marginHorizontal: 4 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  loadMoreBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 4 },
  loadMoreText: { color: '#0046ff', fontWeight: '700', fontSize: 14 },
});