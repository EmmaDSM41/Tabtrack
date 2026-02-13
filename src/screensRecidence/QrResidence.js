import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  PermissionsAndroid,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  PixelRatio,
  Image,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const API_BASE_FALLBACK = 'https://api.residence.tab-track.com';
const API_TOKEN_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY'; 

const STORAGE_KEYS = {
  API_HOST: 'api_host',
  API_TOKEN: 'api_token',
};

const WHATSAPP_FULL_URL = 'https://api.whatsapp.com/send?phone=5214611011391&text=%C2%A1Hola!%20Quiero%20m%C3%A1s%20informaci%C3%B3n%20de%20';

const openWhatsApp = async () => {
  try {
    await Linking.openURL(WHATSAPP_FULL_URL);
    return;
  } catch (webErr) {
    console.warn('No se pudo abrir la URL web de WhatsApp:', webErr);
  }

  try {
    const scheme = 'whatsapp://send?text=Hola';
    const canOpen = await Linking.canOpenURL(scheme);
    if (canOpen) {
      await Linking.openURL(scheme);
      return;
    }
  } catch (schemeErr) {
    console.warn('Error intentando abrir esquema whatsapp://', schemeErr);
  }

  Alert.alert(
    'No se pudo abrir WhatsApp',
    'No fue posible abrir WhatsApp ni la URL web asociada. Asegúrate de tener WhatsApp o un navegador disponible.'
  );
};

const extractTokenFromRaw = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const m1 = raw.match(/\/r\/([^\/?#]+)/i);
  if (m1 && m1[1]) return m1[1];
  const m2 = raw.match(/[?&]token=([^&]+)/i);
  if (m2 && m2[1]) return m2[1];
  try {
    const u = new URL(raw);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  } catch (err) {
    const m3 = raw.match(/([^\/?#]+)$/);
    if (m3 && m3[1]) return m3[1];
  }
  return null;
};

const deriveHostFromRaw = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch (e) {
    return null;
  }
};

const resolveApiHost = async (raw) => {
  const hostFromQr = deriveHostFromRaw(raw);
  if (hostFromQr) return hostFromQr.replace(/\/$/, '');
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.API_HOST);
    if (stored) return stored.replace(/\/$/, '');
  } catch (err) {
  }
  return API_BASE_FALLBACK.replace(/\/$/, '');
};

const buildHeaders = async () => {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (API_TOKEN_FALLBACK && String(API_TOKEN_FALLBACK).trim()) headers.Authorization = `Bearer ${API_TOKEN_FALLBACK}`;
  return headers;
};

const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

function AnimatedIconPulse({ name, size = 28, color = '#1e8e3e', active = false }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loopAnim;
    if (active) {
      loopAnim = Animated.loop(
        Animated.sequence([ Animated.timing(scale, { toValue: 1.12, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                            Animated.timing(scale, { toValue: 1.0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }) ])
      );
      loopAnim.start();
    } else {
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
    return () => { if (loopAnim) loopAnim.stop(); };
  }, [active, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

function AnimatedStatusModal({ visible, loading, result, onClose, onScan, headerHeight = 56 }) {
  const translateY = useRef(new Animated.Value(-260)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: headerHeight + 8, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -280, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, headerHeight, translateY, opacity]);

  if (!visible) return null;

  const ok = !!(result && result.ok);
  const accent = ok ? '#1e8e3e' : '#e03b3b';
  const bg = ok ? 'rgba(242,253,246,0.98)' : 'rgba(255,244,244,0.99)';

  return (
    <Modal transparent visible animationType="none">
      <SafeAreaView pointerEvents="box-none" style={modalStyles.overlayContainer}>
        <Animated.View style={[modalStyles.card, { transform: [{ translateY }], opacity, backgroundColor: bg, borderLeftColor: accent }]}>
          <View style={modalStyles.rowTop}>
            <View style={modalStyles.iconCol}>
              <AnimatedIconPulse name={ok ? 'checkmark-circle' : 'alert-circle'} size={34} color={accent} active={ok} />
            </View>
            <View style={modalStyles.contentCol}>
              <Text style={[modalStyles.title, { color: accent }]}>{ok ? 'Venta activa' : (loading ? 'Estado' : 'Estado')}</Text>
              <Text style={modalStyles.message} numberOfLines={2}>
                {result?.message ?? (loading ? 'Buscando...' : 'No hay información disponible')}
              </Text>
              {result?.details ? <Text style={modalStyles.details}>{result.details}</Text> : null}
            </View>
          </View>

          <View style={modalStyles.rowBottom}>
            <TouchableOpacity onPress={onClose} style={modalStyles.btnGhost}><Text style={modalStyles.btnGhostText}>Cerrar</Text></TouchableOpacity>
            {ok ? (<TouchableOpacity onPress={onScan} style={[modalStyles.btnPrimary, { backgroundColor: accent }]}><Text style={modalStyles.btnPrimaryText}>Ir a venta</Text></TouchableOpacity>) : null}
          </View>

          {loading ? (
            <View style={modalStyles.loaderRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={modalStyles.loadingText}>Consultando…</Text>
            </View>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

export default function QrResidence({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const [hasPermission, setHasPermission] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [allowScan, setAllowScan] = useState(false);
  const [allowScanForStatus, setAllowScanForStatus] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [statusQr, setStatusQr] = useState(null);

  const [deptBilling, setDeptBilling] = useState(null);
  const [deptHistoryLoading, setDeptHistoryLoading] = useState(false);
  const [deptIdStored, setDeptIdStored] = useState(null);

  const [scanTarget, setScanTarget] = useState(null); 
  const scannerRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  const baseHeader = 56;
  const headerHeight = clamp(rf(baseHeader), 78, 110);

  const gradientColors = ['#9F4CFF', '#6A43FF', '#2C7DFF'];
  const gradientCardHeight = Math.round(Math.max(80, Math.min(160, height * 0.14)));
  const gradientCardLeftRight = Math.round(Math.max(12, width * 0.06));
  const gradientInnerPad = Math.round(Math.max(12, width * 0.04));
  const gradientSeparation = -5;

  const holeGap = clamp(rf(45), 45, 90);
  const buttonsGap = clamp(rf(40), 56, 140);

  const qrSize = Math.min(Math.round(width * 0.68), clamp(360, 220, 500));
  const holeTop = headerHeight + gradientCardHeight + holeGap;
  const holeLeft = Math.round((width - qrSize) / 2);
  const cornerArc = clamp(64, 40, 96);
  const cornerThickness = Math.max(8, Math.round((width / 375) * 10));
  const cornerOuterRadius = Math.round(Math.min(qrSize, 320) * 0.06);
  const overlayAlpha = 0.26;
  const innerPanelOpacity = 0.04;


  const CAMERA_HEIGHT = height;

  const logoMaxWidth = Math.round(Math.min(160, width * 0.36));
  const logoWidth = Math.min(logoMaxWidth, Math.round(qrSize * 0.38));
  const logoHeight = Math.round(logoWidth * 0.5);
  const logoTopPos = Math.max(headerHeight + Math.round(gradientCardHeight * 0.1), holeTop - logoHeight - Math.round(logoHeight * 0.25));

  const fallbackConsumed = 425.0;
  const fallbackAvailable = 3075.0;
  const fallbackUtilization = Math.round((fallbackConsumed / (fallbackConsumed + fallbackAvailable)) * 1000) / 10;

  const deviceAspect = height / width;
  const preferRatio = deviceAspect > 2.0 ? '16:9' : '4:3';

  const cameraScaleAndroid = 1.06;
  const cameraScale = Platform.OS === 'android' ? cameraScaleAndroid : 1.0;

  useEffect(() => {
    (async () => {
      try {
        let granted = false;
        if (Platform.OS === 'android') {
          const res = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Permiso de cámara',
              message: 'Necesitamos acceso a la cámara para escanear QR',
              buttonPositive: 'Aceptar',
              buttonNegative: 'Cancelar',
            }
          );
          granted = res === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const res = await request(PERMISSIONS.IOS.CAMERA);
          granted = res === RESULTS.GRANTED;
        }
        setHasPermission(granted);
        if (!granted) {
          Alert.alert('Permiso denegado', 'Sin cámara no podemos escanear QR', [
            { text: 'OK', onPress: () => navigation.goBack?.() },
          ]);
        }
      } catch (err) {
        console.warn('Error al solicitar permiso de cámara', err);
        setHasPermission(false);
      }
    })();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setScannerActive(true);
      setAllowScan(false);
      setAllowScanForStatus(false);
      setScanTarget(null); 
      setTimeout(() => {
        try {
          if (scannerRef?.current && typeof scannerRef.current.reactivate === 'function') {
            scannerRef.current.reactivate();
          }
        } catch (err) {}
      }, 300);

      return () => {
        setAllowScan(false);
        setAllowScanForStatus(false);
        setScanTarget(null);
        if (statusTimeoutRef.current) { clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = null; }
      };
    }, [])
  );

  const reactivateScanner = (allow = false) => {
    setScannerActive(true);
    if (allow) setAllowScan(true);
    setTimeout(() => {
      try {
        if (scannerRef?.current && typeof scannerRef.current.reactivate === 'function') {
          scannerRef.current.reactivate();
        }
      } catch (err) {}
    }, 250);
  };

  const startManualScan = (target = 'Cuenta') => {
    setScanTarget(target);
    reactivateScanner(true);
  };
  const toggleFlash = () => setFlashEnabled((p) => !p);

  const onSuccess = async (e) => {
    if (!allowScan && !allowScanForStatus) return;

    setAllowScan(false);
    setAllowScanForStatus(false);
    setScannerActive(false);

    const raw = e?.data ?? '';
    const qr = extractTokenFromRaw(raw); 

    if (!qr) {
      setStatusResult({ ok: false, message: 'No se encontró un token válido en el QR.' });
      setStatusLoading(false);
      setStatusModalVisible(true);

      setTimeout(() => reactivateScanner(true), 900);
      return;
    }

    if (allowScanForStatus) {
      if (statusTimeoutRef.current) { clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = null; }
      handleStatusFetchForToken(raw, qr);
      return;
    }

    const target = scanTarget || 'Cuenta';
    setScanTarget(null);

    if (target === 'Miembros') {
      navigation.navigate('Miembros', { qr });
      return;
    }

    navigation.navigate('CuentaResidence', { qr });
  };

  const showStatusModal = (resultObj, qr = null, loading = false) => {
    if (statusTimeoutRef.current) { clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = null; }
    setStatusResult(resultObj);
    setStatusQr(qr);
    setStatusLoading(loading);
    setStatusModalVisible(true);
  };

  const hideStatusModal = () => {
    setStatusModalVisible(false);
    setStatusResult(null);
    setStatusQr(null);
    setStatusLoading(false);
    setScannerActive(true);
    setAllowScan(false);
    setAllowScanForStatus(false);
    setScanTarget(null);
    setTimeout(() => {
      try {
        if (scannerRef?.current && typeof scannerRef.current.reactivate === 'function') {
          scannerRef.current.reactivate();
        }
      } catch (err) {}
    }, 300);
  };

  const onStatusPress = () => {
    setAllowScanForStatus(true);
    showStatusModal({ ok: null, message: 'Apunta la cámara al QR para verificar la mesa...' }, null, true);

    reactivateScanner(false);

    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
    statusTimeoutRef.current = setTimeout(() => {
      setAllowScanForStatus(false);
      setScannerActive(true);
      showStatusModal({ ok: false, message: 'No se detectó QR. Apunta la cámara al QR y prueba "Escanear QR".' }, null, false);
    }, 7000);
  };

  const handleStatusFetchForToken = async (raw, qr) => {
    setStatusLoading(true);
    showStatusModal({ ok: null, message: 'Consultando estado de la mesa…' }, qr, true);

    try {
      const host = await resolveApiHost(raw);
      if (!host) {
        setStatusLoading(false);
        showStatusModal({ ok: false, message: 'No se pudo determinar la URL del servidor desde el QR. Escanea con "Escanear QR" para ver detalles.' }, qr, false);
        return;
      }

      const apiUrl = `${host}/api/mesas/r/${encodeURIComponent(qr)}`;
      const headers = await buildHeaders();

      const res = await fetchWithTimeout(apiUrl, { headers }, 10000);
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      setStatusLoading(false);

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        showStatusModal({ ok: false, message: msg }, qr, false);
        return;
      }

      const summaryParts = [];
      if (json && typeof json === 'object') {
        if (json.venta_id || json.id) summaryParts.push(`Venta: ${json.venta_id ?? json.id}`);
        if (json.total) summaryParts.push(`Total: ${json.total}`);
        if (json.items && Array.isArray(json.items)) summaryParts.push(`Items: ${json.items.length}`);
      }
      const summary = summaryParts.length ? summaryParts.join(' • ') : 'Hay una venta activa para esta mesa.';

      showStatusModal({ ok: true, message: 'Existe una venta activa.', details: summary, payload: json }, qr, false);

    } catch (err) {
      console.warn('Status fetch error', err);
      setStatusLoading(false);
      showStatusModal({ ok: false, message: 'Error al conectar con el servidor. Intenta de nuevo.' }, qr, false);
    }
  };

  const fetchDepartmentHistory = useCallback(async () => {
    setDeptHistoryLoading(true);
    setDeptBilling(null);

    try {
      let dept = null;
      try {
        const rawDept = await AsyncStorage.getItem('user_residence_departamento_id_actual');
        if (rawDept !== null && rawDept !== undefined && String(rawDept).trim() !== '') {
          dept = String(rawDept).trim();
        }
      } catch (e) {
        console.warn('[dept-history] error leyendo AsyncStorage', e);
      }

      setDeptIdStored(dept);

      if (!dept) {
        console.warn('[dept-history] user_residence_departamento_id_actual no encontrado en AsyncStorage');
        setDeptHistoryLoading(false);
        return;
      }

      const now = new Date();
      const periodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      const tzOffset = -360; 

      const baseHost = API_BASE_FALLBACK.replace(/\/$/, '');

      const path = `/api/residence/departamentos/${encodeURIComponent(String(dept))}/consumptions/history?periodo=${encodeURIComponent(periodo)}&detalle=false&tz_offset_minutes=${encodeURIComponent(String(tzOffset))}`;
      const url = `${baseHost}${path}`;

      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (API_TOKEN_FALLBACK && String(API_TOKEN_FALLBACK).trim()) headers.Authorization = `Bearer ${API_TOKEN_FALLBACK}`;

      console.log('[dept-history] consultando URL:', url);

      const res = await fetchWithTimeout(url, { headers }, 10000);
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      console.log('[dept-history] status:', res.status, json);

      if (!res.ok) {
        if (res.status === 404) {
          Alert.alert('Historial no encontrado', 'Ruta 404: departamento no existe o ruta no disponible para este host / periodo.');
        } else {
          Alert.alert('Error al consultar historial', `HTTP ${res.status}.`);
        }
        setDeptBilling(null);
        setDeptHistoryLoading(false);
        return;
      }

      if (json && Array.isArray(json.periodos) && json.periodos.length > 0 && json.periodos[0].billing) {
        const b = json.periodos[0].billing;
        setDeptBilling({
          moneda: b.moneda ?? (json.departamento && json.departamento.moneda) ?? 'MXN',
          monto_mensual_usado: Number(b.monto_mensual_usado ?? 0) || 0,
          porcentaje_usado: Number(b.porcentaje_usado ?? 0) || 0,
          saldo_disponible: Number(b.saldo_disponible ?? 0) || 0,
          saldo_mensual: Number(b.saldo_mensual ?? (json.departamento && json.departamento.saldo_mensual) ?? 0) || 0,
        });
      } else if (json && json.departamento && typeof json.departamento === 'object' && json.departamento.saldo_mensual !== undefined) {

        setDeptBilling({
          moneda: json.departamento.moneda ?? 'MXN',
          monto_mensual_usado: Number(json.departamento.monto_mensual_usado ?? 0) || 0,
          porcentaje_usado: Number(json.departamento.porcentaje_usado ?? 0) || 0,
          saldo_disponible: Number(json.departamento.saldo_disponible ?? json.departamento.saldo_mensual ?? 0) || 0,
          saldo_mensual: Number(json.departamento.saldo_mensual ?? 0) || 0,
        });
      } else {
        console.warn('[dept-history] OK pero sin estructura esperada:', json);
        setDeptBilling(null);
      }
    } catch (err) {
      console.warn('fetchDepartmentHistory error', err);
      Alert.alert('Error', 'No fue posible consultar historial del departamento. Revisa conexión / host.');
      setDeptBilling(null);
    } finally {
      setDeptHistoryLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchDepartmentHistory();
  }, [fetchDepartmentHistory]));

  useEffect(() => {
    fetchDepartmentHistory();
  }, [fetchDepartmentHistory]);

  if (!hasPermission) {
    return (
      <View style={[styles.loading, { backgroundColor: '#000' }]}>
        <Text style={styles.loadingText}>Solicitando permiso…</Text>
      </View>
    );
  }

  const consumed = deptBilling ? Number(deptBilling.monto_mensual_usado || 0) : fallbackConsumed;

  let availableNumber;
  if (deptHistoryLoading) {
    availableNumber = null;
  } else if (deptBilling) {
    const saldoMensual = Number(deptBilling.saldo_mensual || 0);
    const montoUsado = Number(deptBilling.monto_mensual_usado || 0);
    const computedAvailable = saldoMensual - montoUsado;

    const apiAvailRaw = deptBilling.saldo_disponible;
    const apiAvailable = (apiAvailRaw !== undefined && apiAvailRaw !== null && !Number.isNaN(Number(apiAvailRaw))) ? Number(apiAvailRaw) : null;

    if (!Number.isNaN(computedAvailable) && computedAvailable < 0) {
      availableNumber = computedAvailable;
    } else if (apiAvailable !== null) {
      availableNumber = apiAvailable;
    } else {
      availableNumber = computedAvailable;
    }
  } else {
    availableNumber = Number(fallbackAvailable);
  }
  const utilization = (consumed + (availableNumber !== null ? availableNumber : fallbackAvailable)) > 0
    ? Math.round((consumed / (consumed + (availableNumber !== null ? availableNumber : fallbackAvailable))) * 1000) / 10
    : 0;

  const consumedDisplay = deptHistoryLoading ? '…' : (deptBilling ? `${Number(consumed).toFixed(2)}` : `${fallbackConsumed.toFixed(2)}`);

  const availableIsNegative = availableNumber !== null && availableNumber < 0;
  const formattedAvailableDisplay = deptHistoryLoading
    ? '…'
    : (availableIsNegative ? `-$${Math.abs(availableNumber).toFixed(2)}` : `$${Number(availableNumber).toFixed(2)}`);
  const availableTextColor = deptHistoryLoading ? '#fff' : (availableIsNegative ? '#FF3B30' : '#fff');

  const utilizationDisplay = deptHistoryLoading ? '…' : `${utilization}%`;

  const bottomButtonsOffset = insets.bottom + 24;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: 'transparent',paddingTop: insets.top  }} edges={['left','right','top']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.cameraWrapper, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
        {scannerActive && (
          <QRCodeScanner
            ref={scannerRef}
            onRead={onSuccess}
            containerStyle={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', overflow: 'hidden'
            }}
            cameraStyle={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
              transform: [{ scaleX: cameraScale }, { scaleY: cameraScale }],
            }}
            flashMode={flashEnabled ? RNCamera.Constants.FlashMode.torch : RNCamera.Constants.FlashMode.off}
            showMarker={false}
            reactivate={false}
            topViewStyle={styles.zero}
            bottomViewStyle={styles.zero}
            cameraProps={{ ratio: preferRatio }}
          />
        )}

        <View style={[styles.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
          <View style={[styles.overlayRow, { height: holeTop, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />

{/*           <View style={{
            position: 'absolute',
            top: logoTopPos,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 30,
            pointerEvents: 'none',
          }}>
            <Image
              source={require('../../assets/images/logo2.png')}
              style={{
                width: logoWidth,
                height: logoHeight,
                resizeMode: 'contain',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 4,
              }}
            />
          </View> */}

          <View style={{ flexDirection: 'row' }}>
            <View style={[styles.overlayCol, { width: holeLeft, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />

            <View style={[styles.hole, { width: qrSize, height: qrSize }]}>
              <View
                style={{
                  position: 'absolute',
                  width: qrSize - 8,
                  height: qrSize - 8,
                  borderRadius: cornerOuterRadius,
                  backgroundColor: `rgba(255,255,255,${innerPanelOpacity})`,
                  zIndex: 3,
                }}
              />

              <View style={{ position: 'absolute', top: 0, left: 0, width: cornerArc, height: cornerArc, borderTopWidth: cornerThickness, borderLeftWidth: cornerThickness, borderColor: '#fff', borderTopLeftRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent' }} />
              <View style={{ position: 'absolute', top: 0, right: 0, width: cornerArc, height: cornerArc, borderTopWidth: cornerThickness, borderRightWidth: cornerThickness, borderColor: '#fff', borderTopRightRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent' }} />
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: cornerArc, height: cornerArc, borderBottomWidth: cornerThickness, borderLeftWidth: cornerThickness, borderColor: '#fff', borderBottomLeftRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent' }} />
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: cornerArc, height: cornerArc, borderBottomWidth: cornerThickness, borderRightWidth: cornerThickness, borderColor: '#fff', borderBottomRightRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent' }} />
            </View>

            <View style={[styles.overlayCol, { width: holeLeft, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />
          </View>

          <View style={[styles.overlayRow, { flex: 1, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />
        </View>

        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: bottomButtonsOffset, left: 0, width, alignItems: 'center', zIndex: 40 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => startManualScan('Cuenta')} style={[styles.floatPrimary, { width: Math.min(360, Math.round(width * 0.78)), paddingVertical: clamp(rf(12), 10, 18) }]}>
            <View style={styles.actionContent}>
              <Ionicons name="qr-code-outline" size={rf(18)} color="#fff" style={{ marginRight: 12 }} />
              <Text style={[styles.primaryActionText, { fontSize: clamp(rf(16), 14, 18) }]}>Escanear QR</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => navigation.navigate('Miembros')}
            style={[styles.floatSecondary, { width: Math.min(360, Math.round(width * 0.78)), paddingVertical: clamp(rf(10), 8, 16), marginTop: 0 }]}
          >
            <View style={styles.actionContent}>
              <Ionicons name="person-outline" size={rf(16)} color="#fff" style={{ marginRight: 10 }} />
              <Text style={[styles.primaryActionText, { fontSize: clamp(rf(15), 13, 17) }]}>Miembros</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={openWhatsApp} style={styles.iconBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="face-agent" size={rf(22)} color="#ffffff" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: clamp(rf(18), 14, 22) }]}>Escanear QR</Text>

        <TouchableOpacity onPress={toggleFlash} style={styles.iconBtn} activeOpacity={1}>
          <Ionicons name={flashEnabled ? 'flashlight' : 'flashlight-outline'} size={rf(22)} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + headerHeight + gradientSeparation,
          left: gradientCardLeftRight,
          right: gradientCardLeftRight,
          zIndex: 60,
        }}
      >
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientCardSmall, { height: gradientCardHeight, borderRadius: 14, padding: gradientInnerPad }]}>
          {deptHistoryLoading ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.gradientSmallLabel, { marginLeft: 8 }]}>Cargando consumo del departamento…</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.gradientSmallLabel}>Usado</Text>
                <Text style={styles.gradientSmallValue}>${consumedDisplay}</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.gradientSmallLabel}>Disponible</Text>
                <Text style={[styles.gradientSmallValue, { fontSize: Math.round(clamp(rf(20), 18, 26)), fontWeight: '900', color: availableTextColor }]}>{formattedAvailableDisplay}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 10 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={styles.progressTrackSmall}>
              <View style={[styles.progressFillSmall, { width: `${Math.min(100, Math.max(0, utilization))}%` }]} />
            </View>
            <Text style={styles.progressLabelSmall}>{deptHistoryLoading ? '…' : utilizationDisplay} utilizado</Text>
          </View>
        </LinearGradient>
      </View>

      <AnimatedStatusModal
        visible={statusModalVisible}
        loading={statusLoading}
        result={statusResult}
        onClose={hideStatusModal}
        onScan={() => {
          hideStatusModal();
          if (statusQr) navigation.navigate('Escanear', { qr: statusQr }); 
        }}
        headerHeight={headerHeight}
      />
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, elevation: 9999, zIndex: 9999 },
  card: { marginHorizontal: 12, borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#fff', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  iconCol: { width: 52, alignItems: 'center', justifyContent: 'center' },
  contentCol: { flex: 1, marginLeft: 10 },
  title: { fontSize: 18, fontWeight: '800' },
  message: { fontSize: 15, color: '#333', marginTop: 2 },
  details: { fontSize: 13, color: '#555', marginTop: 6 },
  rowBottom: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  btnGhost: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 8, backgroundColor: 'transparent' },
  btnGhostText: { fontWeight: '700', color: '#444' },
  btnPrimary: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '800' },
  loaderRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  loadingText: { marginLeft: 8, color: '#333' },
});

const styles = StyleSheet.create({
  root: { flex: 1, },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    zIndex: 200,
  },
  iconBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontWeight: '700' },

  cameraWrapper: { width: '100%' },
  camera: { width: '100%' },

  overlay: { position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 10 },
  overlayRow: { width: '100%' },
  overlayCol: {},

  hole: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'visible' },

  floatPrimary: { backgroundColor: '#0046ff', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  floatSecondary: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.22)' },

  actionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '800' },
  secondaryActionText: { color: '#fff', fontWeight: '700' },

  zero: { height: 0, flex: 0 },

  gradientCardSmall: {
    width: '100%',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  gradientSmallLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600' },
  gradientSmallValue: { color: '#fff', fontWeight: '900', fontSize: 18 },

  progressTrackSmall: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, height: 10, overflow: 'hidden', marginRight: 12 },
  progressFillSmall: { backgroundColor: '#fff', height: '100%' },
  progressLabelSmall: { color: 'rgba(255,255,255,0.95)', fontSize: 12 },

  progressLabel: { color: '#fff' },
});
export { styles as qrStyles };
