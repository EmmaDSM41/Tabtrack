import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AppState,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

const staticWidth = Dimensions.get('window').width;

const API_URL = 'https://api.tab-track.com';
const API_URL_2 = 'https://api.residence.tab-track.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3NTUxMjcwNSwianRpIjoiNzA1NjU2YjgtZGFiZS00M2NlLTk2MjUtZmE5ODdmY2FiY2ZiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzU1MTI3MDUsImV4cCI6MTc3ODEwNDcwNSwicm9sIjoiRWRpdG9yIn0.03LJs1TRZzehSXSh5Cdez2e5NFSrANijsS4H6gUjm78';

export default function ProfileResidence({ navigation }) {
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
  const logoSize = clamp(Math.round(width * 0.08), 28, 48);
  const avatarSize = clamp(Math.round(width * 0.18), 48, 120);
  const modalWidth = Math.min(Math.round(width * 0.92), 720);
  const logoutModalWidth = Math.min(Math.round(width * 0.86), 520);
  const basePadding = clamp(Math.round(width * 0.04), 10, 28);
  const titleFont = clamp(rf(4.4), 20, 22);
  const sectionTitleFont = clamp(rf(3.6), 14, 22);
  const optionFont = clamp(rf(3.6), 14, 20);
  const smallText = clamp(rf(3.2), 12, 16);

  const notificationsReadRef = useRef(new Set());
  const notificationsLoadedRef = useRef(false);
  const notificationsRef = useRef([]);
  const seenStorageKeyRef = useRef('user_notifications_seen');
  const seenLoadedKeyRef = useRef(null);
  const loadingNotificationsRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const isMarketingNotification = (text) => {
    if (!text) return false;
    return /pizz|pizzer|pizza|oferta|descuent|promocion|promo|sushi/i.test(String(text));
  };

  const formatMoney = (n) => {
    return Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  };

  const getAuthHeaders = (extra = {}) => {
    const base = { 'Content-Type': 'application/json', ...extra };
    if (TOKEN && TOKEN.trim().length > 0) base['Authorization'] = `Bearer ${TOKEN}`;
    return base;
  };

  const buildNotificationKey = (n) => {
    const saleId = n?.sale_id ?? n?.saleId ?? n?.transactionId ?? n?.transaction_id ?? n?.id ?? '';
    const date = n?.date ?? n?.createdAt ?? '';
    const amount = Number(n?.amount ?? n?.total ?? 0) || 0;
    const dept = n?.department_id ?? '';
    return `${dept}_${saleId}_${date}_${amount}`;
  };

  const ensureSeenMarkersLoaded = useCallback(async (deptId) => {
    const storageKey = deptId
      ? `user_notifications_seen_dept_${String(deptId).trim()}`
      : 'user_notifications_seen';

    if (seenLoadedKeyRef.current === storageKey) return;

    seenStorageKeyRef.current = storageKey;
    seenLoadedKeyRef.current = storageKey;

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      let parsed = [];
      try {
        parsed = raw ? JSON.parse(raw) : [];
      } catch (e) {
        parsed = [];
      }

      if (Array.isArray(parsed)) {
        notificationsReadRef.current = new Set(parsed.map(String));
      } else {
        notificationsReadRef.current = new Set();
      }
    } catch (e) {
      notificationsReadRef.current = new Set();
    }
  }, []);

  const persistSeenMarkers = useCallback(async () => {
    try {
      const key = seenStorageKeyRef.current || 'user_notifications_seen';
      const arr = Array.from(notificationsReadRef.current || []);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      console.warn('persistSeenMarkers error', e);
    }
  }, []);

  const normalizeNotification = (notif = {}) => {
    const raw = notif?.payload ?? notif ?? {};

    const saleId =
      notif.saleId ??
      notif.sale_id ??
      raw.sale_id ??
      raw.saleId ??
      raw.transactionId ??
      raw.transaction_id ??
      raw.id ??
      null;

    const departmentId =
      notif.departmentId ??
      raw.department_id ??
      raw.departmentId ??
      raw.deptId ??
      raw.departamento_id ??
      raw.departamentoId ??
      null;

    const approvedByName =
      raw.approved_by_usuario?.nombre ??
      raw.approved_by_usuario?.name ??
      raw.approved_by_usuario?.full_name ??
      raw.approved_by_nombre ??
      '';

    const approvedByEmail =
      raw.approved_by_email ??
      raw.approved_email ??
      raw.approved_by_usuario?.email ??
      raw.approved_by_usuario?.correo ??
      raw.approved_by_usuario?.mail ??
      notif.email ??
      '';

    const dateStr =
      notif.date ??
      raw.date ??
      raw.closed_at ??
      raw.createdAt ??
      raw.created_at ??
      raw.fecha_cierre ??
      raw.fecha_apertura ??
      new Date().toISOString();

    const amount = Number(
      notif.amount ??
      notif.total ??
      raw.amount ??
      raw.total ??
      raw.total_consumo ??
      raw?.detail_consumption?.total_consumo ??
      0
    ) || 0;

    const periodo = (() => {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          return `${y}${m}`;
        }
      } catch (e) {}
      return null;
    })();

    const baseText =
      notif.text ||
      raw.text ||
      `Consumo aprobado${approvedByName ? ` por ${approvedByName}` : ''}${amount > 0 ? ` por $${formatMoney(amount)}` : ''}`;

    return {
      id: notif.id || `notif_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      read: Boolean(notif.read),
      text: baseText,
      title: notif.title || raw.title || 'Consumo aprobado',
      amount,
      total: amount,
      saleId,
      sale_id: saleId,
      transactionId: saleId,
      transaction_id: saleId,
      department_id: departmentId,
      approvedByName,
      approvedByEmail,
      date: dateStr,
      createdAt: dateStr,
      periodo,
      payload: raw,
      api_url_2: notif.api_url_2 || raw.api_url_2 || API_URL_2,
      token: TOKEN,
    };
  };

  const extractConsumptionsFromHistory = (json) => {
    let rawConsumptions = null;

    if (json && Array.isArray(json.consumptions)) {
      rawConsumptions = json.consumptions;
    } else if (json && Array.isArray(json.periodos) && json.periodos.length > 0 && Array.isArray(json.periodos[0].consumptions)) {
      rawConsumptions = json.periodos[0].consumptions;
    } else if (json && Array.isArray(json.periodos) && json.periodos.length > 0) {
      const found = json.periodos.flatMap(p => Array.isArray(p.consumptions) ? p.consumptions : []);
      if (found.length) rawConsumptions = found;
    }

    if (!rawConsumptions && json) {
      for (const k of Object.keys(json)) {
        if (k.toLowerCase().includes('consum') && Array.isArray(json[k])) {
          rawConsumptions = json[k];
          break;
        }
      }
    }

    return Array.isArray(rawConsumptions) ? rawConsumptions : [];
  };

  const loadNotificationsFromApi = useCallback(async () => {
    if (loadingNotificationsRef.current) return;
    loadingNotificationsRef.current = true;

    try {
      const deptId = await AsyncStorage.getItem('user_residence_departamento_id_actual');
      if (!deptId) {
        setNotifications([]);
        return;
      }

      await ensureSeenMarkersLoaded(deptId);

      const now = new Date();
      const year = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const periodo_desde = `${year}01`;
      const periodo_hasta = `${year}${currentMonth}`;
      const tzOffset = -360;

      const base = API_URL_2.replace(/\/$/, '');
      const path = `/api/residence/departamentos/${encodeURIComponent(String(deptId))}/consumptions/history?periodo_desde=${encodeURIComponent(periodo_desde)}&periodo_hasta=${encodeURIComponent(periodo_hasta)}&detalle=true&tz_offset_minutes=${encodeURIComponent(String(tzOffset))}`;
      const url = `${base}${path}`;

      const headers = getAuthHeaders();

      const res = await fetch(url, { method: 'GET', headers });
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        json = null;
      }

      if (!res.ok) {
        console.warn('[notifications] http', res.status, json);
        return;
      }

      const rawConsumptions = extractConsumptionsFromHistory(json);
      const nextNotifications = [];
      const seen = new Set();
      const prevKeys = new Set((notificationsRef.current || []).map((n) => n._key || buildNotificationKey(n)));

      rawConsumptions.forEach((c, idx) => {
        const detail = c.detail_consumption ?? c.detail ?? c.detailConsumption ?? null;
        const itemsRaw = (detail && Array.isArray(detail.items)) ? detail.items : (Array.isArray(c.items) ? c.items : []);

        const items = itemsRaw.map((it, i) => ({
          id: `${c.sale_id ?? idx}-item-${i}`,
          label: it.nombre_item ?? it.nombre ?? it.name ?? it.label ?? `Item ${i + 1}`,
          qty: Number(it.cantidad ?? it.qty ?? 1) || 1,
          price: Number(it.precio_item ?? it.price ?? it.precio ?? 0) || 0,
          raw: it,
        }));

        const approvedByName =
          c.approved_by_usuario?.nombre ||
          c.approved_by_usuario?.name ||
          c.approved_by_usuario?.full_name ||
          c.approved_by_nombre ||
          null;

        const approvedByEmail =
          c.approved_by_email ??
          c.approved_email ??
          c.approved_by_usuario?.email ??
          c.approved_by_usuario?.correo ??
          c.approved_by_usuario?.mail ??
          null;

        const restaurantName = (c.restaurante && (c.restaurante.nombre || c.restaurante.name)) ? (c.restaurante.nombre || c.restaurante.name) : null;
        const fallbackName = approvedByName || restaurantName || `Transacción ${c.sale_id ?? (idx + 1)}`;

        const fechaA = (c.fechas && (c.fechas.fecha_apertura || c.fechas.fechaApertura)) || c.fecha_apertura || c.fechaApertura || null;
        const fechaC = (c.fechas && (c.fechas.fecha_cierre || c.fechas.fechaCierre)) || c.fecha_cierre || c.fechaCierre || null;

        const approvedState = String(c.estado ?? c.status ?? '').toLowerCase();
        const isApproved =
          Boolean(approvedByName || approvedByEmail || fechaC) ||
          /aprob|cerrad|pagad|complet/i.test(approvedState);

        if (!isApproved) return;

        const total = Number((detail && (detail.total_consumo ?? detail.total)) || c.total || c.total_consumo || 0) || 0;

        const dateSource = fechaC || fechaA || c.updated_at || c.created_at || c.fecha || new Date().toISOString();
        const normalizedDate = (() => {
          try {
            const d = new Date(dateSource);
            return isNaN(d.getTime()) ? String(dateSource) : d.toISOString();
          } catch (e) {
            return String(dateSource);
          }
        })();

        const periodo = (() => {
          try {
            const d = new Date(normalizedDate);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              return `${y}${m}`;
            }
          } catch (e) {}
          return null;
        })();

        const notif = normalizeNotification({
          id: c.sale_id ? `sale_${c.sale_id}_${normalizedDate}` : `sale_${idx}_${normalizedDate}`,
          text: `Consumo aprobado${approvedByName ? ` por ${approvedByName}` : ''} por $${formatMoney(total)}`,
          title: 'Consumo aprobado',
          amount: total,
          total,
          sale_id: c.sale_id ?? null,
          saleId: c.sale_id ?? null,
          transactionId: c.sale_id ?? null,
          transaction_id: c.sale_id ?? null,
          department_id: deptId,
          approved_by_name: approvedByName,
          approved_by_email: approvedByEmail,
          date: normalizedDate,
          createdAt: normalizedDate,
          periodo,
          payload: {
            rawConsumption: c,
            detail,
            items,
            approved_by_nombre: approvedByName,
            approved_by_email: approvedByEmail,
            department_id: deptId,
            total_consumo: total,
            fecha_apertura: fechaA,
            fecha_cierre: fechaC,
            sale_id: c.sale_id ?? null,
            saleId: c.sale_id ?? null,
            transactionId: c.sale_id ?? null,
            transaction_id: c.sale_id ?? null,
            id: c.sale_id ?? null,
            periodo,
          },
          api_url_2: API_URL_2,
          token: TOKEN,
        });

        const key = buildNotificationKey(notif);
        if (seen.has(key)) return;
        seen.add(key);

        const read = notificationsReadRef.current.has(key);

        nextNotifications.push({
          ...notif,
          read,
          _key: key,
          name: notif.approvedByName || notif.title || 'Consumo aprobado',
          timestamp: (() => {
            try {
              const d = new Date(normalizedDate);
              return isNaN(d.getTime()) ? '' : d.toLocaleString();
            } catch (e) {
              return '';
            }
          })(),
        });
      });

      nextNotifications.sort((a, b) => {
        const ta = new Date(a.date || a.createdAt || 0).getTime();
        const tb = new Date(b.date || b.createdAt || 0).getTime();
        return tb - ta;
      });

      if (!notificationsLoadedRef.current) {
        notificationsLoadedRef.current = true;
        notificationsRef.current = nextNotifications;
        setNotifications(nextNotifications);
        return;
      }

      const newItems = nextNotifications.filter(n => !prevKeys.has(n._key));

      if (newItems.length > 0) {
        newItems.forEach(item => {
          try {
            Toast.show(item.text || 'Consumo aprobado', { duration: Toast.durations.SHORT });
          } catch (e) {}
        });
      }

      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
    } catch (err) {
      console.warn('loadNotificationsFromApi error', err);
    } finally {
      loadingNotificationsRef.current = false;
    }
  }, [ensureSeenMarkersLoaded]);

  useFocusEffect(
    useCallback(() => {
      loadNotificationsFromApi();
    }, [loadNotificationsFromApi])
  );

  useEffect(() => {
    let mounted = true;

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
        if (fullname && mounted) setUsername(fullname);
      } catch (err) {
        console.warn('Error leyendo usuario desde AsyncStorage:', err);
        Toast.show('Error al cargar usuario', { duration: Toast.durations.SHORT });
      }
    })();

    (async () => {
      try {
        const cached = await AsyncStorage.getItem('user_profile_url');
        if (cached && mounted) setProfileUrl(cached);
      } catch (e) {}

      await loadProfileFromApi();
    })();

    loadNotificationsFromApi();

    const interval = setInterval(() => {
      loadNotificationsFromApi();
    }, 4000);

    const sub = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;

      if (wasBackground && nextState === 'active') {
        loadNotificationsFromApi();
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      try {
        sub.remove();
      } catch (e) {}
    };
  }, [loadNotificationsFromApi]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      const next = notifications.map(n => {
        const key = n._key || buildNotificationKey(n);
        notificationsReadRef.current.add(key);
        return { ...n, read: true, _key: key };
      });
      setNotifications(next);
      notificationsRef.current = next;
      await persistSeenMarkers();
    } catch (e) {
      console.warn('markAllRead error', e);
    }
  };

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
        console.warn('Guardar recent account failed (pre-clean)', e);
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

        ]);
      } catch (e) {
        console.warn('Error removing persistent auth keys on logout', e);
      }

      try {
        if (email) {
          await AsyncStorage.removeItem(`notifications_store_${email}`).catch(() => null);
          await AsyncStorage.removeItem(`notifications_seen_${email}`).catch(() => null);
        }
      } catch (e) {
        console.warn('Error removing notification store on logout', e);
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
        } catch (_) {}
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
      } catch (_) {}
    }
  };

  const openNotifications = async () => {
    try {
      setShowNotifications(true);
      await markAllRead();
    } catch (e) {
      console.warn('openNotifications error', e);
    }
  };

  const loadProfileFromApi = async () => {
    try {
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
        setProfileUrl(url);
        try {
          await AsyncStorage.setItem('user_profile_url', url);
        } catch (e) {}

        try {
          DeviceEventEmitter.emit('profileUpdated', url);
        } catch (e) {
          console.warn('Emit profileUpdated error', e);
        }
      } else {
        setProfileUrl(null);
        try { await AsyncStorage.removeItem('user_profile_url').catch(() => null); } catch (_) {}
        try { DeviceEventEmitter.emit('profileUpdated', null); } catch (e) {}
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
        await AsyncStorage.removeItem('user_profile_url').catch(() => {});
      } catch (e) {}

      setProfileUrl(null);

      try {
        DeviceEventEmitter.emit('profileUpdated', null);
      } catch (e) {
        console.warn('Emit profileUpdated (null) error', e);
      }

      try {
        await loadProfileFromApi();
      } catch (_) {}
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

  function NotificationRow({ n }) {
    const dateLabel = n.date || n.createdAt ? new Date(n.date || n.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
    const title = 'Consumo aprobado';
    const amount = Number(n.amount ?? n.total ?? n.payload?.total ?? n.payload?.amount ?? 0) || 0;

    const buildNotificationPayload = () => {
      const raw = n.payload ?? n;
      const saleId = n.saleId ?? n.sale_id ?? raw?.sale_id ?? raw?.saleId ?? raw?.transactionId ?? raw?.transaction_id ?? raw?.id ?? null;

      let periodo = n.periodo ?? raw?.periodo ?? null;
      const dateStr = n.date ?? raw?.date ?? raw?.closed_at ?? raw?.createdAt ?? raw?.created_at ?? null;
      if (!periodo && dateStr) {
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            periodo = `${y}${m}`;
          }
        } catch (e) {
          periodo = null;
        }
      }

      const payload = {
        periodo,
        sale_id: saleId ?? null,
        saleId: saleId ?? null,
        transactionId: saleId ?? null,
        transaction_id: saleId ?? null,
        id: saleId ?? null,
        amount: amount || (raw?.amount ?? raw?.total) || null,
        date: dateStr || null,
        department_id: n.department_id ?? raw?.department_id ?? null,
        approved_by_name: n.approvedByName ?? raw?.approved_by_nombre ?? null,
        approved_by_email: n.approvedByEmail ?? raw?.approved_by_email ?? null,
        api_url_2: API_URL_2,
        token: TOKEN,
        rawResponse: raw,
        rawConsumption: raw?.rawConsumption ?? raw?.raw_consumption ?? null,
        matchHints: {
          sale_id: saleId ?? null,
          transactionId: saleId ?? null,
          transaction_id: saleId ?? null,
          amount: amount || (raw?.amount ?? raw?.total) || null,
          date: dateStr || null,
          periodo,
          department_id: n.department_id ?? raw?.department_id ?? null,
        },
      };

      return payload;
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.notificationItemLarge, n.read ? styles.readCard : styles.unreadCard]}
        onPress={() => {
          try {
            const payload = buildNotificationPayload();
            navigation.navigate('Experiences', {
              screen: 'ExperiencesResidence',
              params: {
                notification: payload,
                saleId: payload.sale_id,
                transactionId: payload.transactionId,
                periodo: payload.periodo,
              }
            });
            setShowNotifications(false);
          } catch (e) {
            console.warn('navigation to Experiences failed', e);
          }
        }}
      >
        <View style={styles.notLeft}>
          <Text style={styles.notBranch} numberOfLines={2}>{title}</Text>
          <Text style={styles.notSale} numberOfLines={1}>
            Aprobado por: {n.approvedByName || '—'}
          </Text>
          <Text style={styles.notDate}>{dateLabel}</Text>
        </View>

        <View style={[styles.notRight, { minWidth: 90 }]}>
          <Text style={styles.notAmount}>{amount > 0 ? formatMoney(amount) : '—'}</Text>
          <Text style={styles.notCurrency}>{amount > 0 ? 'MXN' : ''}</Text>
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
              <Text style={[styles.modalTitle, { fontSize: clamp(rf(3.8), 16, 20) }]}>Utimas notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name="close" size={iconSize} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalList, { maxHeight: Math.round(Math.min(hp(60), 420)) }]}>
              {notifications && notifications.length > 0 ? (
                notifications.map(n => <NotificationRow key={n._key || n.id} n={n} />)
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
          <Text style={[styles.headerTitle, { fontSize: titleFont }]}>Perfil</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={openNotifications} style={styles.headerButton} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
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
          <Option icon="lock-closed-outline" label="Politicas de seguridad" onPress={() => navigation.navigate('SecurityResidence')} optionFont={optionFont} />
          <Option icon="help-circle-outline" label="Ayuda / FAQ" onPress={() => navigation.navigate('Help')} optionFont={optionFont} />
          <Option icon="refresh-circle-outline" label="Actualizar contraseña" onPress={() => navigation.navigate('ChangePassword')} optionFont={optionFont} />
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
              justifyContent: 'center'
            }
          ]}
          onPress={() => navigation.navigate('Home')}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <LinearGradient
            colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <Image
            source={require('../../assets/images/logo2.png')}
            style={{
              width: Math.round(clamp(rf(3.8), 18, 28)),
              height: Math.round(clamp(rf(3.8), 18, 28)),
              marginRight: 10,
              resizeMode: 'contain'
            }}
          />
          <Text style={[styles.termsText, { fontSize: clamp(rf(3.6), 13, 16) }]}>Tabtrack</Text>
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
  badgeText: { color: '#fff', fontSize: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontWeight: '600', color: '#333' },
  modalList: { paddingHorizontal: 16 },

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
  notRight: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 },

  notBranch: { fontWeight: '800', fontSize: 14, color: '#111', marginBottom: 2 },
  notSale: { color: '#666', fontSize: 12, marginBottom: 2 },
  notDate: { color: '#888', fontSize: 11 },

  notAmount: { fontWeight: '900', fontSize: 16, color: '#0b58ff' },
  notCurrency: { color: '#666', fontSize: 11 },

  noNotifications: { padding: 28, alignItems: 'center', justifyContent: 'center' },
  noNotificationsText: { color: '#666' },

  markReadButton: { padding: 12, backgroundColor: '#0046ff', alignItems: 'center', margin: 16, borderRadius: 8 },
  markReadText: { color: '#fff', fontWeight: '600' },

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
