import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const staticWidth = Dimensions.get('window').width;

const API_URL = 'https://api.tab-track.com';

export default function ProfileScreen({ navigation }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wp = (p) => Math.round((p / 100) * width);
  const hp = (p) => Math.round((p / 100) * height);
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const topSafe = Math.round(insets.top || StatusBar.currentHeight || 0);
  const bottomSafe = Math.round(insets.bottom || 0);

  const headerHeight = clamp(hp(2), 34, 120);
  const iconSize = clamp(rf(2.6), 19, 32);
  const avatarSize = clamp(Math.round(width * 0.18), 48, 120);
  const modalWidth = Math.min(Math.round(width * 0.92), 720);
  const logoutModalWidth = Math.min(Math.round(width * 0.86), 520);
  const basePadding = clamp(Math.round(width * 0.04), 10, 28);
  const titleFont = clamp(rf(4.4), 20, 22);
  const sectionTitleFont = clamp(rf(3.6), 14, 22);
  const optionFont = clamp(rf(3.6), 14, 20);
  const smallText = clamp(rf(3.2), 12, 16);

  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const emailRef = useRef(null);
  const MAX_STORE = 100;

  useEffect(() => {
    (async () => {
      try {
        let fullname = await AsyncStorage.getItem('user_fullname');
        if (!fullname) {
          const nombre = await AsyncStorage.getItem('user_nombre') || '';
          const apellido = await AsyncStorage.getItem('user_apellido') || '';
          fullname = `${nombre} ${apellido}`.trim();
        }
        if (!fullname) {
          const email = await AsyncStorage.getItem('user_email');
          if (email && email.includes('@')) fullname = email.split('@')[0];
        }
        if (fullname) setUsername(fullname);
      } catch (err) {
        console.warn('Error leyendo usuario desde AsyncStorage:', err);
        Toast.show('Error al cargar usuario', { duration: Toast.durations.SHORT });
      }
    })();

    (async () => {
      try {
        const cached = await AsyncStorage.getItem('user_profile_url');
        if (cached) setProfileUrl(getCacheBustedUrl(cached));
      } catch (e) { /* noop */ }

      await loadProfileFromApi();
    })();

    isMountedRef.current = true;

    (async () => {
      const e = await AsyncStorage.getItem('user_email');
      emailRef.current = e || null;
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

    const deviceListener = DeviceEventEmitter.addListener('notificationOpened', (payload) => {
      try {
        handleIncomingNotification(payload).catch(err => console.warn('device notificationOpened handler err', err));
      } catch (e) { console.warn('device listener callback err', e); }
    });

    const profileListener = DeviceEventEmitter.addListener('profileUpdated', (url) => {
      try {
        if (url) {
          const cb = getCacheBustedUrl(String(url));
          setProfileUrl(cb);
          AsyncStorage.setItem('user_profile_url', String(url)).catch(() => { /* noop */ });
        } else {
          setProfileUrl(null);
          AsyncStorage.removeItem('user_profile_url').catch(() => { /* noop */ });
        }
      } catch (e) {
        console.warn('profileUpdated listener error', e);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      try { deviceListener && deviceListener.remove(); } catch (e) { /* noop */ }
      try { profileListener && profileListener.remove(); } catch (e) { /* noop */ }
    };
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!emailRef.current) {
        emailRef.current = await AsyncStorage.getItem('user_email');
      }
      await fetchTodayNotificationsOnce();
      await loadProfileFromApi();
    })();
    return () => { };
  }, []));

  const unreadCount = notifications.filter(n => !n.read).length;

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

  function parseApiDate(value) {
    try {
      if (value === undefined || value === null) return null;
      if (value instanceof Date) {
        if (!Number.isNaN(value.getTime())) return value;
        return null;
      }

      if (typeof value === 'number') {
        const s = String(Math.abs(Math.floor(value)));
        const ms = (s.length <= 10) ? value * 1000 : value;
        const d = new Date(ms);
        return !Number.isNaN(d.getTime()) ? d : null;
      }

      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) return null;

        if (/^\d+$/.test(raw)) {
          const n = Number(raw);
          const ms = (raw.length <= 10) ? n * 1000 : n;
          const d = new Date(ms);
          if (!Number.isNaN(d.getTime())) return d;
        }

        const isoWithZone = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-Z]+(?:Z|[+\-][0-9]{2}:[0-9]{2})$/i;
        if (isoWithZone.test(raw)) {
          const d = new Date(raw);
          if (!Number.isNaN(d.getTime())) return d;
        }

        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
        if (m) {
          const year = Number(m[1]);
          const month = Number(m[2]) - 1;
          const day = Number(m[3]);
          const hour = Number(m[4]);
          const minute = Number(m[5]);
          const second = Number(m[6] ?? 0);
          const msPart = Number((m[7] ?? '0').padEnd(3, '0'));
          const dLocal = new Date(year, month, day, hour, minute, second, msPart);
          if (!Number.isNaN(dLocal.getTime())) return dLocal;
        }

        try {
          const d2 = new Date(raw);
          if (!Number.isNaN(d2.getTime())) return d2;
        } catch (e) { /* noop */ }

        try {
          const tUtc = raw.replace(' ', 'T') + 'Z';
          const d3 = new Date(tUtc);
          if (!Number.isNaN(d3.getTime())) return d3;
        } catch (e) { /* noop */ }
      }
    } catch (e) {
      console.warn('parseApiDate error', e);
    }
    return null;
  }

  function buildNotificationText({ branch, amount, date, saleId }) {
    const parsed = parseApiDate(date);
    const dtLabel = parsed ? parsed.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    return `Pago confirmado — ${formatMoney(Number(amount || 0))} — ${dtLabel}`;
  }

  async function fetchTodayNotificationsOnce() {
    try {
      await ensureToken();

      const email = emailRef.current ?? await AsyncStorage.getItem('user_email');
      if (!email) return;
      emailRef.current = email;

      const base = API_URL.replace(/\/$/, '');
      const day = todayIso();
      const url = `${base}/api/mobileapp/usuarios/consumos?email=${encodeURIComponent(email)}&desde=${day}&hasta=${day}`;

      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (TOKEN && TOKEN.trim()) headers['Authorization'] = `Bearer ${TOKEN}`;

      let res = null;
      try {
        res = await fetch(url, { method: 'GET', headers });
      } catch (err) {
        return;
      }
      if (!res || !res.ok) {
        return;
      }
      const json = await res.json();
      const ventas = Array.isArray(json?.venta_id) ? json.venta_id : (Array.isArray(json?.ventas) ? json.ventas : []);
      if (!Array.isArray(ventas) || ventas.length === 0) {
        return;
      }

      const seenSet = await loadSeenIds(email);
      const stored = await loadStoredNotifications(email);
      const storedById = new Map(stored.map(n => [n.id, n]));

      let added = false;

      for (const venta of ventas) {
        const ventaSaleId = venta?.venta_id ?? venta?.sale_id ?? venta?.ventaId ?? venta?.saleId ?? null;
        const ventaRestaurantId = venta?.restaurante_id ?? venta?.restaurant_id ?? venta?.restauranteId ?? venta?.restaurantId ?? null;
        const ventaBranchId = venta?.sucursal_id ?? venta?.sucursalId ?? venta?.branch_id ?? venta?.branchId ?? null;
        const ventaRestaurantName = venta?.nombre_restaurante ?? venta?.restaurantName ?? venta?.restaurante ?? '';
        const ventaBranchName = venta?.nombre_sucursal ?? venta?.branchName ?? venta?.sucursal ?? '';

        const pagos = Array.isArray(venta?.pagos) ? venta.pagos : [];
        if ((!Array.isArray(pagos) || pagos.length === 0) && Array.isArray(venta?.items_consumidos)) {
          const items = venta.items_consumidos;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const state = String(item?.estado ?? '').toLowerCase();
            if (state === 'paid' || state === 'confirmed') {
              const saleId = item?.venta_id ?? item?.sale_id ?? item?.ventaId ?? item?.saleId ?? ventaSaleId ?? null;
              const unique = paymentUniqueId(saleId, item, i);
              if (seenSet.has(unique) || storedById.has(unique)) continue;

              const amount = item?.precio_unitario ?? item?.subtotal ?? item?.precio ?? item?.amount ?? 0;
              const rawDate = item?.fecha_pago ?? item?.fecha_creacion ?? venta?.fecha_cierre_venta ?? new Date().toISOString();
              const parsed = parseApiDate(rawDate);
              const dateIso = parsed ? parsed.toISOString() : new Date().toISOString();
              const branch = ventaBranchName || item?.nombre_sucursal || '';

              const branchId = ventaBranchId ?? item?.sucursal_id ?? item?.sucursalId ?? item?.branch_id ?? item?.branchId ?? null;
              const restaurantId = ventaRestaurantId ?? item?.restaurante_id ?? item?.restaurant_id ?? null;

              const splitsUrl = (saleId && branchId) ? `${base}/api/transacciones-pago/sucursal/${encodeURIComponent(branchId)}/ventas/${encodeURIComponent(saleId)}/splits` : null;

              const notif = {
                id: unique,
                text: buildNotificationText({ branch, amount, date: dateIso, saleId }),
                amount: Number(amount || 0),
                branch: branch || '',
                branchName: branch || '',
                branchId: branchId ?? null,
                restaurantId: restaurantId ?? null,
                restaurantName: ventaRestaurantName || '',
                date: dateIso,
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

          const saleId = pago?.sale_id ?? pago?.venta_id ?? pago?.saleId ?? pago?.ventaId ?? ventaSaleId ?? null;

          const unique = paymentUniqueId(saleId, pago, i);
          if (seenSet.has(unique) || storedById.has(unique)) continue;

          const amount = pago?.amount ?? pago?.precio_unitario ?? pago?.subtotal ?? pago?.monto_propina ?? 0;
          const rawDate = pago?.fecha_creacion ?? pago?.fecha_pago ?? venta?.fecha_cierre_venta ?? new Date().toISOString();
          const parsed = parseApiDate(rawDate);
          const dateIso = parsed ? parsed.toISOString() : new Date().toISOString();
          const branch = ventaBranchName || pago?.nombre_sucursal || '';

          const branchId = ventaBranchId ?? pago?.sucursal_id ?? pago?.sucursalId ?? pago?.branch_id ?? pago?.branchId ?? null;
          const restaurantId = ventaRestaurantId ?? pago?.restaurante_id ?? pago?.restaurant_id ?? null;

          const splitsUrl = (saleId && branchId) ? `${base}/api/transacciones-pago/sucursal/${encodeURIComponent(branchId)}/ventas/${encodeURIComponent(saleId)}/splits` : null;

          const notif = {
            id: unique,
            text: buildNotificationText({ branch, amount, date: dateIso, saleId }),
            amount: Number(amount || 0),
            branch: branch || '',
            branchName: branch || '',
            branchId: branchId ?? null,
            restaurantId: restaurantId ?? null,
            restaurantName: ventaRestaurantName || '',
            date: dateIso,
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

  const markNotificationAsRead = async (notifId) => {
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
  };

  function getCacheBustedUrl(url) {
    if (!url) return null;
    try {
      const ts = Date.now();
      return url.includes('?') ? `${url}&_cb=${ts}` : `${url}?_cb=${ts}`;
    } catch (e) {
      return url;
    }
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

  function getAuthHeaders(extra = {}) {
    const base = { 'Content-Type': 'application/json', ...extra };
    if (TOKEN && TOKEN.trim().length > 0) base['Authorization'] = `Bearer ${TOKEN}`;
    return base;
  }

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

  async function loadCachedVisits() {
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      const email = await AsyncStorage.getItem('user_email');
      const currentId = uid || email || null;
      const candidates = [];
      if (currentId) candidates.push(`user_visits_${currentId}`);
      candidates.push('user_visits');

      for (const key of candidates) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && Array.isArray(parsed.data)) return parsed.data;
          if (parsed && typeof parsed === 'object') {
            const maybeArr = Object.values(parsed).filter(v => v && typeof v === 'object');
            if (maybeArr.length > 0) return maybeArr;
          }
        } catch (e) {
          console.warn('loadCachedVisits parse error for key', key, e);
          continue;
        }
      }
      return [];
    } catch (err) {
      console.warn('loadCachedVisits error', err);
      return [];
    }
  }

  async function updateCachedVisit(updatedVisit) {
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      const email = await AsyncStorage.getItem('user_email');
      const currentId = uid || email || null;
      const candidates = [];
      if (currentId) candidates.push(`user_visits_${currentId}`);
      candidates.push('user_visits');

      for (const key of candidates) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          let arr = [];
          if (Array.isArray(parsed)) arr = parsed;
          else if (parsed && Array.isArray(parsed.data)) arr = parsed.data;
          else continue;

          const idx = arr.findIndex(v => {
            const vid = String(v.sale_id ?? v.venta_id ?? v.saleId ?? '');
            const bid = String(v.sucursal_id ?? v.sucursal ?? v.branchId ?? v.branch_id ?? '');
            const uid1 = String(updatedVisit.sale_id ?? updatedVisit.venta_id ?? updatedVisit.saleId ?? '');
            const bid1 = String(updatedVisit.sucursal_id ?? updatedVisit.sucursal ?? updatedVisit.branchId ?? updatedVisit.branch_id ?? '');
            if (vid === uid1 && bid === bid1) return true;
            if (String(v.id ?? '').startsWith(`${uid1}_`) && String(v.id ?? '').includes(`_${bid1}`)) return true;
            return false;
          });
          if (idx >= 0) {
            arr[idx] = { ...arr[idx], ...updatedVisit };
            try {
              if (parsed && Array.isArray(parsed.data)) {
                await AsyncStorage.setItem(key, JSON.stringify({ ...parsed, data: arr }));
              } else {
                await AsyncStorage.setItem(key, JSON.stringify(arr));
              }
            } catch (e) { /* noop */ }
            return true;
          }
        } catch (e) {
          console.warn('updateCachedVisit parse error for key', key, e);
          continue;
        }
      }
    } catch (err) {
      console.warn('updateCachedVisit error', err);
    }
    return false;
  }

  function cleanName(v) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    if (s.toLowerCase() === 'restaurante') return '';
    return s;
  }

  async function enrichVisitWithBranchLogo(visit, fallbackMeta = {}) {
    try {
      if (!visit) return visit;

      await ensureToken();

      const restauranteId = visit?.restaurante_id ?? visit?.restaurant_id ?? visit?.restauranteId ?? visit?.restaurantId ?? fallbackMeta?.restauranteId ?? fallbackMeta?.restaurantId ?? null;
      const sucursalId = visit?.sucursal_id ?? visit?.branch_id ?? visit?.sucursalId ?? visit?.branchId ?? fallbackMeta?.sucursalId ?? fallbackMeta?.branchId ?? null;

      let restaurantName = visit?.restaurantName ?? visit?.nombre_restaurante ?? fallbackMeta?.restaurantName ?? '';
      let branchName = visit?.branchName ?? visit?.nombre_sucursal ?? fallbackMeta?.branchName ?? '';
      let restaurantImage = visit?.restaurantImage ?? visit?.logo_url ?? visit?.imagen_logo_url ?? null;
      let bannerImage = visit?.bannerImage ?? visit?.imagen_banner_url ?? null;

      if (restauranteId) {
        const infoCacheKey = `restaurant_info_${restauranteId}`;
        const branchesCacheKey = `restaurant_sucursales_${restauranteId}`;
        let infoData = null;
        let branchesData = null;

        try {
          const raw = await AsyncStorage.getItem(infoCacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            infoData = parsed?.data ?? parsed;
          }
        } catch (e) {
          console.warn('enrichVisitWithBranchLogo restaurant info cache read error', e);
        }

        try {
          const raw = await AsyncStorage.getItem(branchesCacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            branchesData = parsed?.data ?? parsed;
          }
        } catch (e) {
          console.warn('enrichVisitWithBranchLogo branches cache read error', e);
        }

        if (!infoData) {
          try {
            const endpoint = `${API_URL}/api/restaurantes/${encodeURIComponent(restauranteId)}`;
            const headers = getAuthHeaders();
            const res = await fetch(endpoint, { method: 'GET', headers });
            if (res.ok) {
              infoData = await res.json();
              try {
                await AsyncStorage.setItem(infoCacheKey, JSON.stringify({ savedAt: Date.now(), data: infoData }));
              } catch (e) {
                console.warn('enrichVisitWithBranchLogo restaurant info cache save error', e);
              }
            }
          } catch (e) {
            console.warn('enrichVisitWithBranchLogo restaurant info fetch error', e);
          }
        }

        if (!branchesData) {
          try {
            const endpoint = `${API_URL}/api/restaurantes/${encodeURIComponent(restauranteId)}/sucursales`;
            const headers = getAuthHeaders();
            const res = await fetch(endpoint, { method: 'GET', headers });
            if (res.ok) {
              branchesData = await res.json();
              try {
                await AsyncStorage.setItem(branchesCacheKey, JSON.stringify({ savedAt: Date.now(), data: branchesData }));
              } catch (e) {
                console.warn('enrichVisitWithBranchLogo branches cache save error', e);
              }
            }
          } catch (e) {
            console.warn('enrichVisitWithBranchLogo branches fetch error', e);
          }
        }

        if (infoData && typeof infoData === 'object') {
          restaurantName = cleanName(infoData?.nombre) || cleanName(infoData?.name) || restaurantName;
        }

        const sucursales = Array.isArray(branchesData?.sucursales) ? branchesData.sucursales : [];
        const matched = sucursales.find(s => String(s.id) === String(sucursalId)) || sucursales[0] || null;

        if (matched) {
          branchName = branchName || matched?.nombre || '';
          restaurantImage = restaurantImage || matched?.imagen_logo_url || null;
          bannerImage = bannerImage || matched?.imagen_banner_url || null;
        }
      }

      if (visit.restaurantImage) visit.restaurantImage = getCacheBustedUrl(visit.restaurantImage);
      if (visit.bannerImage) visit.bannerImage = getCacheBustedUrl(visit.bannerImage);

      const finalRestaurantImage = restaurantImage ? getCacheBustedUrl(String(restaurantImage)) : (visit.restaurantImage || null);
      const finalBannerImage = bannerImage ? getCacheBustedUrl(String(bannerImage)) : (visit.bannerImage || null);

      return {
        ...visit,
        restaurante_id: visit?.restaurante_id ?? restauranteId ?? null,
        restaurantId: visit?.restaurantId ?? restauranteId ?? null,
        sucursal_id: visit?.sucursal_id ?? sucursalId ?? null,
        branchId: visit?.branchId ?? sucursalId ?? null,
        nombre_restaurante: cleanName(restaurantName) || cleanName(visit?.nombre_restaurante) || cleanName(visit?.restaurantName) || '',
        restaurantName: cleanName(restaurantName) || cleanName(visit?.restaurantName) || cleanName(visit?.nombre_restaurante) || '',
        nombre: cleanName(restaurantName) || cleanName(visit?.nombre_restaurante) || cleanName(visit?.restaurantName) || '',
        nombre_sucursal: branchName || visit?.nombre_sucursal || '',
        branchName: branchName || visit?.branchName || '',
        imagen_logo_url: finalRestaurantImage,
        restaurantImage: finalRestaurantImage,
        logo_url: finalRestaurantImage,
        imagen_banner_url: finalBannerImage,
        bannerImage: finalBannerImage,
      };
    } catch (err) {
      console.warn('enrichVisitWithBranchLogo (noop) err', err);
      return visit;
    }
  }

  async function handleIncomingNotification(payload) {
    try {
      if (!payload) {
        console.warn('handleIncomingNotification: payload vacío');
        return;
      }
      const data = payload.data ?? payload;
      const saleId = data?.saleId ?? data?.venta_id ?? data?.sale_id ?? data?.sale ?? data?.venta ?? data?.saleld ?? data?.saleld ?? null;
      const branchId = data?.branchId ?? data?.sucursal_id ?? data?.sucursal ?? data?.branch_id ?? data?.branch ?? data?.branchld ?? data?.branchld ?? null;
      const restaurantId = data?.restaurante_id ?? data?.restaurant_id ?? data?.restauranteId ?? data?.restaurantId ?? null;
      const notifId = data?.id ?? data?.notifId ?? payload?.id ?? null;

      if (notifId) {
        try { await markNotificationAsRead(notifId); } catch (e) { /**/ }
      }

      try {
        const cached = await loadCachedVisits();
        const found = findVisitBySaleBranchLocal(cached, saleId, branchId);
        if (found) {
          const toNav = await enrichVisitWithBranchLogo(found, {
            restaurantId,
            branchId,
            restaurantName: data?.nombre_restaurante ?? data?.restaurantName ?? found?.nombre_restaurante ?? found?.restaurantName ?? '',
            branchName: data?.nombre_sucursal ?? data?.branchName ?? found?.nombre_sucursal ?? found?.branchName ?? '',
          });
          setShowNotifications(false);
          navigation.navigate('Experiences', { screen: 'ExperiencesDetails', params: { visit: toNav } });
          return;
        }
      } catch (e) {
        console.warn('error buscando visita en cache local', e);
      }

      const maybeAmount = data?.amount ?? data?.monto ?? data?.precio ?? data?.subtotal ?? data?.monto_total ?? null;
      const maybeBranchName = data?.branchName ?? data?.nombre_sucursal ?? data?.branch ?? data?.branch_name ?? data?.nombre ?? null;
      const maybeRestaurantName = data?.restaurantName ?? data?.nombre_restaurante ?? data?.restaurante ?? null;
      const maybeImage = data?.restaurantImage ?? data?.logo_url ?? data?.imagen_logo_url ?? data?.image ?? null;
      const maybeBanner = data?.bannerImage ?? data?.imagen_banner_url ?? data?.banner ?? null;
      const maybeDate = data?.date ?? data?.fecha_pago ?? data?.fecha_creacion ?? data?.fecha_cierre_venta ?? new Date().toISOString();
      const parsedDate = parseApiDate(maybeDate);
      const isoDate = parsedDate ? parsedDate.toISOString() : new Date().toISOString();

      if (saleId || branchId || maybeAmount || maybeBranchName || maybeRestaurantName || restaurantId) {
        const candidate = {
          id: `${saleId ?? 'unknown'}_${branchId ?? 'unknown'}`,
          sale_id: saleId ?? null,
          venta_id: saleId ?? null,
          restaurante_id: restaurantId ?? null,
          restaurant_id: restaurantId ?? null,
          sucursal_id: branchId ?? null,
          restaurantName: maybeRestaurantName ?? null,
          nombre_restaurante: maybeRestaurantName ?? null,
          branchName: maybeBranchName ?? null,
          nombre_sucursal: maybeBranchName ?? null,
          restaurantImage: maybeImage ? getCacheBustedUrl(String(maybeImage)) : null,
          imagen_logo_url: maybeImage ? getCacheBustedUrl(String(maybeImage)) : null,
          logo_url: maybeImage ? getCacheBustedUrl(String(maybeImage)) : null,
          bannerImage: maybeBanner ? getCacheBustedUrl(String(maybeBanner)) : null,
          imagen_banner_url: maybeBanner ? getCacheBustedUrl(String(maybeBanner)) : null,
          fecha: isoDate,
          total: (maybeAmount !== undefined && maybeAmount !== null) ? Number(maybeAmount) : null,
          moneda: data?.currency ?? data?.moneda ?? 'MXN',
          items: Array.isArray(data?.items) ? data.items : (Array.isArray(data?.items_consumidos) ? data.items_consumidos : []),
          pagos: Array.isArray(data?.pagos) ? data.pagos : [],
          __raw_notification: data,
        };

        const candidateReady = await enrichVisitWithBranchLogo(candidate, {
          restaurantId,
          branchId,
          restaurantName: maybeRestaurantName || '',
          branchName: maybeBranchName || '',
        });

        setShowNotifications(false);
        navigation.navigate('Experiences', { screen: 'ExperiencesDetails', params: { visit: candidateReady } });
        return;
      }

      try {
        if (saleId && branchId) {
          setShowNotifications(false);
          navigation.navigate('Experiences', { openSaleId: String(saleId), openBranchId: String(branchId) });
          return;
        }
      } catch (e) {
        console.warn('navigate to Experiences failed', e);
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

  const loadProfileFromApi = async () => {
    try {
      await ensureToken();

      setProfileLoading(true);
      const email = await AsyncStorage.getItem('user_email');
      if (!email) {
        setProfileLoading(false);
        return;
      }
      const endpoint = `${API_URL}/api/mobileapp/usuarios?mail=${encodeURIComponent(email)}&presign_ttl=30`;
      const headers = getAuthHeaders();
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        setProfileLoading(false);
        return;
      }
      const json = await res.json();
      const usuario = Array.isArray(json?.usuarios) && json.usuarios.length > 0 ? json.usuarios[0] : null;
      if (usuario && usuario.foto_perfil_url) {
        const url = usuario.foto_perfil_url;
        setProfileUrl(getCacheBustedUrl(url));
        try {
          await AsyncStorage.setItem('user_profile_url', url);
        } catch (e) { /* noop */ }

        try {
          DeviceEventEmitter.emit('profileUpdated', url);
        } catch (e) {
          console.warn('Emit profileUpdated error', e);
        }
      } else {
        setProfileUrl(null);
        try { await AsyncStorage.removeItem('user_profile_url').catch(() => null); } catch (_) { }
        try { DeviceEventEmitter.emit('profileUpdated', null); } catch (e) { /**/ }
      }
    } catch (err) {
      console.warn('Error cargando foto de perfil:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const onSelectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
      });

      if (!result || result.didCancel) {
        setShowAvatarOptions(false);
        return;
      }

      const asset = result.assets && result.assets.length > 0 ? result.assets[0] : null;
      if (!asset) {
        Toast.show('No se seleccionó imagen', { duration: Toast.durations.SHORT });
        setShowAvatarOptions(false);
        return;
      }

      await uploadProfilePhoto(asset);
      setShowAvatarOptions(false);
    } catch (err) {
      console.warn('Error seleccionando imagen:', err);
      Toast.show('Error al seleccionar imagen', { duration: Toast.durations.SHORT });
      setShowAvatarOptions(false);
    }
  };

  const uploadProfilePhoto = async (asset) => {
    try {
      await ensureToken();

      setUploading(true);
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      if (!uid) {
        Toast.show('No se encontró usuario', { duration: Toast.durations.SHORT });
        setUploading(false);
        return;
      }

      const contentType = asset.type || 'image/jpeg';
      const presignUrl = `${API_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/foto/presign`;
      const presignHeaders = getAuthHeaders();
      const presignRes = await fetch(presignUrl, {
        method: 'POST',
        headers: presignHeaders,
        body: JSON.stringify({ content_type: contentType }),
      });

      if (!presignRes.ok) {
        const txt = await presignRes.text().catch(() => null);
        console.warn('presign failed', presignRes.status, txt);
        Toast.show('No se pudo iniciar la subida', { duration: Toast.durations.SHORT });
        setUploading(false);
        return;
      }

      const presignJson = await presignRes.json();
      const uploadKey = presignJson.key;
      const uploadMethod = presignJson.method || 'PUT';
      const uploadUrl = presignJson.url;
      if (!uploadUrl || !uploadKey) {
        Toast.show('Respuesta inválida para presign', { duration: Toast.durations.SHORT });
        setUploading(false);
        return;
      }

      const uri = asset.uri;
      const fetched = await fetch(uri);
      const blob = await fetched.blob();

      const putRes = await fetch(uploadUrl, {
        method: uploadMethod,
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      });

      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => null);
        console.warn('Upload PUT failed', putRes.status, txt);
        Toast.show('Error al subir la imagen', { duration: Toast.durations.SHORT });
        setUploading(false);
        return;
      }

      const commitUrl = `${API_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/foto/commit`;
      const commitHeaders = getAuthHeaders();
      const commitRes = await fetch(commitUrl, {
        method: 'POST',
        headers: commitHeaders,
        body: JSON.stringify({ key: uploadKey }),
      });

      if (!commitRes.ok) {
        const txt = await commitRes.text().catch(() => null);
        console.warn('Commit failed', commitRes.status, txt);
        Toast.show('No se pudo confirmar la imagen', { duration: Toast.durations.SHORT });
        setUploading(false);
        return;
      }

      await loadProfileFromApi();

      Toast.show('Foto de perfil actualizada', { duration: Toast.durations.SHORT });
    } catch (err) {
      console.warn('Error en uploadProfilePhoto', err);
      Toast.show('Error al subir foto', { duration: Toast.durations.SHORT });
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePhoto = async () => {
    try {
      await ensureToken();

      setUploading(true);

      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      if (!uid) {
        Toast.show('No se encontró usuario', { duration: Toast.durations.SHORT });
        setUploading(false);
        setShowAvatarOptions(false);
        return;
      }

      const deleteUrl = `${API_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/foto`;
      const headers = getAuthHeaders();

      try {
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          console.warn('Delete profile photo failed', res.status, txt);
          Toast.show('No se pudo eliminar la foto en el servidor', { duration: Toast.durations.SHORT });
        } else {
          Toast.show('Foto de perfil eliminada', { duration: Toast.durations.SHORT });
        }
      } catch (err) {
        console.warn('Error calling DELETE foto endpoint', err);
        Toast.show('Error al eliminar la foto en el servidor', { duration: Toast.durations.SHORT });
      }

      try {
        await AsyncStorage.removeItem('user_profile_url').catch(() => { });
      } catch (e) { /* noop */ }

      setProfileUrl(null);

      try {
        DeviceEventEmitter.emit('profileUpdated', null);
      } catch (e) {
        console.warn('Emit profileUpdated (null) error', e);
      }

      try {
        await loadProfileFromApi();
      } catch (_) { /* noop */ }
    } catch (err) {
      console.warn('removeProfilePhoto error', err);
      Toast.show('Error al eliminar foto', { duration: Toast.durations.SHORT });
    } finally {
      setUploading(false);
      setShowAvatarOptions(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  function formatMoney(n) {
    return Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  }

  const handleLogout = async () => {
    try {
      setShowLogoutModal && setShowLogoutModal(false);

      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      const email = await AsyncStorage.getItem('user_email');
      const currentId = uid || email || null;

      try {
        if (email) {
          const profileCached = await AsyncStorage.getItem('user_profile_url');
          const raw = await AsyncStorage.getItem('recent_accounts_v1');
          let arr = raw ? JSON.parse(raw) : [];
          arr = Array.isArray(arr) ? arr.filter(a => String(a.email).toLowerCase() !== String(email).toLowerCase()) : [];
          arr.unshift({ email, avatarUrl: profileCached || null, savedAt: Date.now() });
          if (!Array.isArray(arr)) arr = [];
          if (arr.length > 6) arr = arr.slice(0, 6);
          try { await AsyncStorage.setItem('recent_accounts_v1', JSON.stringify(arr)); } catch (e) { console.warn('save recent_accounts failed', e); }
        }
      } catch (e) {
        console.warn('Guardar recent_account failed (pre-clean)', e);
      }

      const preserveKeys = new Set();

      const visitsBase = 'user_visits';
      const pendBase = 'pending_visits';
      if (currentId) {
        preserveKeys.add(`${visitsBase}_${currentId}`);
        preserveKeys.add(`${pendBase}_${currentId}`);
        preserveKeys.add(`favorites_${currentId}`);
        preserveKeys.add(`favorites_objs_${currentId}`);
      }
      preserveKeys.add(visitsBase);
      preserveKeys.add(pendBase);
      preserveKeys.add('recent_accounts_v1');

      const branchesPrefix = 'branches_cache_';

      const allKeys = await AsyncStorage.getAllKeys();

      const sessionPrefixes = ['session_', 'sess_', 'tmp_'];
      const tokenNames = ['auth_token', 'access_token', 'refresh_token', 'token', 'user_valid'];

      const keysToRemove = allKeys.filter(k => {
        if (preserveKeys.has(k)) return false;
        if (k.startsWith(branchesPrefix)) return false;
        if (tokenNames.includes(k)) return true;
        for (const p of sessionPrefixes) {
          if (k.startsWith(p)) return true;
        }
        return false;
      });

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      try {
        await AsyncStorage.multiRemove([
          'user_usuario_app_id',
          'user_email',
          'user_valid',
          'user_fullname',
          'user_profile_url',
          'user_default_home',
          'user_environment'
        ]);
      } catch (e) {
        console.warn('Error removing persistent auth keys on logout', e);
      }

      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Recent' }]
        });
      } catch (e) {
        console.warn('navigate RecentAccounts failed, falling back to Login', e);
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }]
          });
        } catch (_) { }
      }

      Toast.show('Sesión cerrada', { duration: Toast.durations.SHORT });
    } catch (err) {
      console.warn('Error cerrando sesión:', err);
      Toast.show('No se pudo cerrar sesión', { duration: Toast.durations.SHORT });
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }]
        });
      } catch (_) { }
    }
  };

  function NotificationRow({ n, onPress }) {
    const parsed = parseApiDate(n.date);
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe, paddingBottom: Math.max(12, bottomSafe) }]}>
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalListHeaderText, { fontSize: clamp(rf(3.8), 16, 20) }]}>Ultimas notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name="close" size={iconSize} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalList, { maxHeight: Math.round(Math.min(hp(60), 420)) }]}>
              {notifications && notifications.length > 0 ? (
                notifications.map(n => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onPress={() => handleNotificationPress(n)}
                  />
                ))
              ) : (
                <View style={styles.noNotifications}>
                  <Text style={styles.noNotificationsText}>No hay notificaciones nuevas.</Text>
                </View>
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>

      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.logoutModalBox, { width: logoutModalWidth, padding: basePadding }]}>
            <Text style={[styles.logoutTitle, { fontSize: clamp(rf(4.4), 18, 22) }]}>Cerrar sesión</Text>
            <Text style={[styles.logoutMessage, { fontSize: clamp(rf(3.6), 14, 18) }]}>¿Estás seguro de que deseas cerrar sesión?</Text>
            <View style={[styles.logoutButtons, { marginTop: Math.round(basePadding / 2) }]}>
              <TouchableOpacity style={[styles.cancelButton, { paddingVertical: clamp(Math.round(hp(1.6)), 8, 14) }]} onPress={() => setShowLogoutModal(false)}>
                <Text style={[styles.cancelText, { fontSize: clamp(rf(3.4), 13, 16) }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, { paddingVertical: clamp(Math.round(hp(1.6)), 8, 14) }]} onPress={handleLogout}>
                <Text style={[styles.confirmText, { fontSize: clamp(rf(3.4), 13, 16) }]}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAvatarOptions} transparent animationType="fade" onRequestClose={() => setShowAvatarOptions(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.avatarModal, { width: Math.min(modalWidth * 0.86, 520) }]}>
            <Text style={[styles.avatarModalTitle, { fontSize: clamp(rf(3.8), 15, 18) }]}>Cambiar foto de perfil</Text>

            <TouchableOpacity style={[styles.avatarModalBtn, { paddingVertical: clamp(10, 8, 14) }]} onPress={onSelectImage}>
              <Text style={[styles.avatarModalBtnText, { fontSize: clamp(rf(3.6), 13, 16) }]}>Seleccionar desde galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.avatarModalBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginTop: 10 }]} onPress={removeProfilePhoto}>
              <Text style={[styles.avatarModalBtnText, { color: '#444', fontSize: clamp(rf(3.6), 13, 16) }]}>Eliminar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.avatarModalBtn, { backgroundColor: '#eee', marginTop: 10 }]} onPress={() => setShowAvatarOptions(false)}>
              <Text style={[styles.avatarModalBtnText, { color: '#333', fontSize: clamp(rf(3.6), 13, 16) }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(24, hp(4), bottomSafe + 8) }]}>
        <View style={[styles.header, { height: headerHeight, paddingHorizontal: basePadding }]}>
          {/*           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
            <Ionicons name="chevron-back" size={iconSize} color="#0046ff" />
          </TouchableOpacity> */}
          <Text style={[styles.headerTitle, { fontSize: titleFont }]}>Perfil</Text>
          <View style={styles.headerRight}>
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
              style={styles.headerButton}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Ionicons name="notifications-outline" size={iconSize} color="#0046ff" />
              {unreadCount > 0 && (
                <View style={[styles.badge, { right: 2, top: 2 }]}>
                  <Text style={[styles.badgeText, { fontSize: clamp(rf(2.6), 10, 12) }]}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sectionDivider, { marginHorizontal: basePadding }]} />

        <View style={[styles.profileSection, { paddingHorizontal: basePadding }]}>
          <View style={{ width: avatarSize, height: avatarSize, marginRight: Math.round(basePadding * 0.6), position: 'relative' }}>
            <View style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: Math.round(avatarSize / 2),
              overflow: 'hidden',
              backgroundColor: '#f3f6ff',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {profileLoading ? (
                <ActivityIndicator size="small" color="#0046ff" />
              ) : profileUrl ? (
                <Image
                  source={{ uri: profileUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[styles.avatarInitials, { fontSize: Math.round(avatarSize * 0.36) }]}>
                    {getInitials(username) || '👤'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowAvatarOptions(true)}
              style={[
                styles.editAvatarBtn,
                {
                  right: -2,
                  bottom: -2,
                  width: Math.round(avatarSize * 0.36),
                  height: Math.round(avatarSize * 0.36),
                  borderRadius: Math.round(avatarSize * 0.18),
                }
              ]}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="pencil" size={Math.max(12, Math.round(avatarSize * 0.18))} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[styles.greeting, { fontSize: smallText }]}>Hola :)</Text>
            <Text style={[styles.username, { fontSize: clamp(rf(4.2), 16, 22) }]} numberOfLines={2}>{username || 'Usuario'}</Text>
          </View>
        </View>

        <View style={[styles.sectionDivider, { marginTop: 8, marginHorizontal: basePadding }]} />

        <Text style={[styles.sectionTitle, { fontSize: sectionTitleFont, paddingHorizontal: basePadding }]}>Configuración</Text>

        <View style={[styles.optionsContainer, { paddingHorizontal: basePadding }]}>
          <Option
            icon="person-outline"
            label="Información personal"
            onPress={() => navigation.navigate('InfoPersonal')}
            optionFont={optionFont}
          />
          {/*           <Option icon="card-outline" label="Métodos de Pago" onPress={() => navigation.navigate('Payments')} optionFont={optionFont} />*/}
          <Option icon="document-text-outline" label="Facturación" onPress={() => navigation.navigate('Facturacion')} optionFont={optionFont} />
          <Option icon="lock-closed-outline" label="Politicas de seguridad" onPress={() => navigation.navigate('Security')} optionFont={optionFont} />
          <Option icon="help-circle-outline" label="Ayuda / FAQ" onPress={() => navigation.navigate('Help')} optionFont={optionFont} />
          <Option icon="refresh-circle-outline" label="Actualizar contraseña" onPress={() => navigation.navigate('ChangePassword')} optionFont={optionFont} />
          <Option
            icon="home-outline"
            label="Seleccionar home"
            onPress={() => navigation.navigate('SelectDefaultHome')}
            optionFont={optionFont}
          />
          <Option icon="log-out-outline" label="Cerrar sesión" onPress={() => setShowLogoutModal(true)} optionFont={optionFont} />
        </View>

        <TouchableOpacity
          style={[styles.termsButton, {
            marginTop: Math.max(18, hp(2)),
            paddingHorizontal: clamp(Math.round(width * 0.06), 12, 34),
            paddingVertical: clamp(10, 8, 14)
          }]}
          onPress={() => navigation.navigate('Terms')}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <Text style={[styles.termsText, { fontSize: clamp(rf(3.6), 13, 16) }]}>Consulta términos y condiciones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.termsButton,
            {
              position: 'relative',
              overflow: 'hidden',
              marginTop: Math.max(12, hp(1.7)),
              paddingHorizontal: clamp(Math.round(width * 0.06), 12, 34),
              paddingVertical: clamp(10, 8, 14),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={async () => {
            try {
              const verified = await AsyncStorage.getItem('user_residence_verified');
              if (verified === 'true') {
                try {
                  navigation.navigate('HomeResidence');
                  return;
                } catch (e) {
                  console.warn('navigate HomeResidence failed (verified path)', e);
                }
              }

              const val = await AsyncStorage.getItem('user_residence_activo');
              if (String(val) === 'true') {
                try {
                  navigation.navigate('HomeResidence');
                  return;
                } catch (e) {
                  console.warn('navigate HomeResidence failed', e);
                  navigation.navigate('CodeResidence');
                  return;
                }
              } else {
                navigation.navigate('CodeResidence');
                return;
              }
            } catch (err) {
              console.warn('Error in switch button onPress (verified check + fallback)', err);
              navigation.navigate('CodeResidence');
            }
          }}

          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <LinearGradient
            colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <Image
            source={require('../../assets/images/LogoResB.png')}
            style={{
              width: Math.round(clamp(rf(3.8), 18, 28)),
              height: Math.round(clamp(rf(3.8), 18, 28)),
              marginRight: 10,
              resizeMode: 'contain',
            }}
          />
          <Text style={[styles.termsText, { fontSize: clamp(rf(3.6), 13, 16) }]}>
            Tabtrack Residence
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Option({ icon, label, onPress, optionFont = 16 }) {
  const iconSize = Math.round(optionFont * 1.05);
  return (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
      <Ionicons name={icon} size={iconSize} color="#555" style={styles.optionIcon} />
      <Text style={[styles.optionLabel, { fontSize: optionFont }]}>{label}</Text>
      <View style={styles.optionSeparator} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 32 },
  header: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { padding: 8 },
  headerTitle: { fontWeight: '700', color: '#0046ff', textAlign: 'center', flex: 1, fontFamily: 'Montserrat-Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  logoFull: { width: 32, height: 32, marginRight: 8, resizeMode: 'contain' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 8, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontWeight: '600', color: '#333' },

  modalListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f1f1' },
  modalListHeaderText: { fontWeight: '700', color: '#222' },

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

  logoutModalBox: { backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  logoutTitle: { fontWeight: '700', color: '#0046ff', marginBottom: 12 },
  logoutMessage: { color: '#333', textAlign: 'center', marginBottom: 20 },
  logoutButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 10, marginRight: 8, backgroundColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '600' },
  confirmButton: { flex: 1, paddingVertical: 10, marginLeft: 8, backgroundColor: '#0046ff', borderRadius: 8, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '600' },
  sectionDivider: { height: 1, backgroundColor: '#ccc', marginVertical: 12 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: { overflow: 'hidden', backgroundColor: '#f3f6ff', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  avatarPlaceholder: { backgroundColor: '#f3f6ff', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#0046ff', fontWeight: '700' },

  editAvatarBtn: {
    position: 'absolute',
    backgroundColor: '#6C5CE7',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },

  greeting: { color: '#000', fontFamily: 'Montserrat-Regular' },
  username: { fontWeight: '600', color: '#0046ff', marginTop: 4, fontFamily: 'Montserrat-Bold' },
  sectionTitle: { fontWeight: '600', color: '#000', marginBottom: 16, fontFamily: 'Montserrat-Bold' },
  optionsContainer: { paddingHorizontal: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, position: 'relative' },
  optionIcon: { marginRight: 12 },
  optionLabel: { color: '#222', fontFamily: 'Montserrat-Regular' },
  optionSeparator: { position: 'absolute', bottom: 0, left: 44, right: 0, height: 1, backgroundColor: '#eee' },
  termsButton: { alignSelf: 'center', backgroundColor: '#0046ff', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 24 },
  termsText: { color: '#fff', fontWeight: '600' },

  avatarModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  avatarModalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#222' },
  avatarModalBtn: {
    width: '100%',
    backgroundColor: '#0046ff',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  avatarModalBtnText: { color: '#fff', fontWeight: '700' },

  toastWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    zIndex: 60,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.95,
  },
  toastText: { color: '#fff', flex: 1, marginRight: 12 },
  toastLink: { color: '#4EA1FF', fontWeight: '700', marginLeft: 8 },
});
