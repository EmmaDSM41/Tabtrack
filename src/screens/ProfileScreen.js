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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect } from '@react-navigation/native';

const staticWidth = Dimensions.get('window').width;

const API_URL = 'https://api.tab-track.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';

export default function ProfileScreen({ navigation }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState([]); // ahora inicia vacío
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

  // ---- Notification state & refs ----
  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const emailRef = useRef(null); // cache email for polling
  const MAX_STORE = 100; // límite de notificaciones guardadas

  useEffect(() => {
    // cargamos nombre y perfil (igual que antes)
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
        if (cached) setProfileUrl(cached);
      } catch (e) { /* noop */ }

      await loadProfileFromApi();
    })();

    // mark mounted
    isMountedRef.current = true;

    (async () => {
      // pre-carga de notificaciones guardadas del usuario (si existen) pero ahora no pre-populamos con ejemplos
      const e = await AsyncStorage.getItem('user_email');
      emailRef.current = e || null;
      if (emailRef.current) {
        const stored = await loadStoredNotifications(emailRef.current);
        if (isMountedRef.current && Array.isArray(stored) && stored.length > 0) {
          // aseguramos orden descendente por fecha
          const sorted = stored.slice().sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
          setNotifications(sorted);
        }
      }

      // initial fetch y polling
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

  // refresh cuando la pantalla toma foco
  useFocusEffect(useCallback(() => {
    (async () => {
      if (!emailRef.current) {
        emailRef.current = await AsyncStorage.getItem('user_email');
      }
      await fetchTodayNotificationsOnce();
    })();
    return () => {};
  }, []));

  const unreadCount = notifications.filter(n => !n.read).length;

  // ---- Storage helpers ----
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
      // cortamos al máximo guardado
      await AsyncStorage.setItem(`notifications_store_${email}`, JSON.stringify(arr.slice(0, MAX_STORE)));
    } catch (e) { console.warn('saveStoredNotifications err', e); }
  }

  // build unique id for a payment (sale + transaction/date fallback)
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
    const dt = new Date(date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    return `Pago confirmado — ${formatMoney(Number(amount || 0))} — ${dt}`;
  }

  // main fetcher: consulta la API para el día actual y agrega notificaciones nuevas (pagos CONFIRMED)
  async function fetchTodayNotificationsOnce() {
    try {
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
        // posible network/CORS, no hacer ruido
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
        const saleId = venta?.venta_id ?? venta?.sale_id ?? venta?.ventaId ?? null;
        const pagos = Array.isArray(venta?.pagos) ? venta.pagos : [];
        // fallback: items_consumidos
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
              const notif = {
                id: unique,
                text: buildNotificationText({ branch, amount, date, saleId }),
                amount: Number(amount || 0),
                branch: branch || '',
                date,
                saleId,
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
          const notif = {
            id: unique,
            text: buildNotificationText({ branch, amount, date, saleId }),
            amount: Number(amount || 0),
            branch: branch || '',
            date,
            saleId,
            read: false,
          };
          stored.unshift(notif);
          storedById.set(unique, notif);
          seenSet.add(unique);
          added = true;
        }
      }

      if (added) {
        // mantén el tamaño y ordena por fecha descendente
        const uniq = Array.from(storedById.values()).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, MAX_STORE);
        await saveSeenIds(email, seenSet);
        await saveStoredNotifications(email, uniq);
        if (isMountedRef.current) setNotifications(uniq);
      } else {
        if (isMountedRef.current) {
          // asegurar orden
          const sorted = stored.slice().sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, MAX_STORE);
          setNotifications(sorted);
        }
      }
    } catch (err) {
      console.warn('fetchTodayNotificationsOnce error', err);
    }
  }

  // mark all read and persist
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

  // ---- existing profile functions (left intact) ----

  const getAuthHeaders = (extra = {}) => {
    const base = { 'Content-Type': 'application/json', ...extra };
    if (TOKEN && TOKEN.trim().length > 0) base['Authorization'] = `Bearer ${TOKEN}`;
    return base;
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
        } catch (e) { /* noop */ }

        try {
          DeviceEventEmitter.emit('profileUpdated', url);
        } catch (e) {
          console.warn('Emit profileUpdated error', e);
        }
      } else {
        setProfileUrl(null);
        try { await AsyncStorage.removeItem('user_profile_url').catch(()=>null); } catch(_) {}
        try { DeviceEventEmitter.emit('profileUpdated', null); } catch(e) { /**/ }
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
        const txt = await presignRes.text().catch(()=>null);
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
        const txt = await putRes.text().catch(()=>null);
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
        const txt = await commitRes.text().catch(()=>null);
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
        await AsyncStorage.removeItem('user_profile_url').catch(()=>{});
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
          'user_profile_url'
        ]);
      } catch (e) {
        console.warn('Error removing persistent auth keys on logout', e);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });

      Toast.show('Sesión cerrada', { duration: Toast.durations.SHORT });
    } catch (err) {
      console.warn('Error cerrando sesión:', err);
      Toast.show('No se pudo cerrar sesión', { duration: Toast.durations.SHORT });
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }]
        });
      } catch (_) { /* noop */ }
    }
  };

  // Render de cada notificación con mejor layout
  function NotificationRow({ n }) {
    const dateLabel = n.date ? new Date(n.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return (
      <View style={[styles.notificationItemLarge, n.read ? styles.readCard : styles.unreadCard]}>
        <View style={styles.notLeft}>
          <Text style={styles.notBranch} numberOfLines={1}>{n.branch || `Venta ${n.saleId || ''}`}</Text>
          <Text style={styles.notSale}>Venta: {n.saleId ?? '-'}</Text>
          <Text style={styles.notDate}>{dateLabel}</Text>
        </View>

        <View style={styles.notRight}>
          <Text style={styles.notAmount}>{formatMoney(n.amount ?? 0)}</Text>
          <Text style={styles.notCurrency}>MXN</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe, paddingBottom: Math.max(12, bottomSafe) }]}>
      {/* Modal de notificaciones */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: clamp(rf(3.8), 16, 20) }]}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name="close" size={iconSize} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalListHeader}>
              <Text style={styles.modalListHeaderText}>Últimas notificaciones</Text>
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAllText}>Marcar todo leído</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalList, { maxHeight: Math.round(Math.min(hp(60), 420)) }]}>
              {notifications && notifications.length > 0 ? (
                notifications.map(n => <NotificationRow key={n.id} n={n} />)
              ) : (
                <View style={styles.noNotifications}>
                  <Text style={styles.noNotificationsText}>No hay notificaciones nuevas.</Text>
                </View>
              )}
            </ScrollView>

            {/* botón para marcar todo (también al pie) */}
            <TouchableOpacity style={[styles.markReadButton, { margin: basePadding }]} onPress={markAllRead}>
              <Text style={[styles.markReadText, { fontSize: clamp(rf(3.6), 13, 16) }]}>Marcar todo como leído</Text>
            </TouchableOpacity>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
            <Ionicons name="chevron-back" size={iconSize} color="#0046ff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: titleFont }]}>Perfil</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.headerButton} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
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
          <Option icon="card-outline" label="Métodos de Pago" onPress={() => navigation.navigate('Payments')} optionFont={optionFont} />
          <Option icon="document-text-outline" label="Facturación" onPress={() => navigation.navigate('Facturacion')} optionFont={optionFont} />
          <Option icon="lock-closed-outline" label="Politicas de seguridad" onPress={() => navigation.navigate('Security')} optionFont={optionFont} />
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
          style={[styles.termsButton, {
            marginTop: Math.max(12, hp(1.7)),
            paddingHorizontal: clamp(Math.round(width * 0.06), 12, 34),
            paddingVertical: clamp(10, 8, 14),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }]}
          onPress={() => navigation.navigate('LoginResidence')}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <Image
            source={require('../../assets/images/logo2.png')}
            style={{ width: Math.round(clamp(rf(3.8), 18, 28)), height: Math.round(clamp(rf(3.8), 18, 28)), marginRight: 10, resizeMode: 'contain' }}
          />
          <Text style={[styles.termsText, { fontSize: clamp(rf(3.6), 13, 16) }]}>Tabtrack Residence</Text>
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
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontWeight: '600', color: '#333' },

  modalListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f1f1' },
  modalListHeaderText: { fontWeight: '700', color: '#222' },
  markAllText: { color: '#0066FF', fontWeight: '700' },

  modalList: { paddingHorizontal: 12 },

  // nuevo estilo para item de notificación más claro y ordenado
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
