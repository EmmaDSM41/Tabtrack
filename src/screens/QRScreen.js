import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  TouchableWithoutFeedback,
  Linking,
  PixelRatio,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

 
const API_BASE_FALLBACK = 'https://api.tab-track.com';
const API_TOKEN_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';

const STORAGE_KEYS = {
  API_HOST: 'api_host',
  API_TOKEN: 'api_token',
};

 const WHATSAPP_FULL_URL = 'https://api.whatsapp.com/send?phone=5214611011391&text=%C2%A1Hola!%20Quiero%20m%C3%A1s%20informaci%C3%B3n%20de%20'; // <-- reemplaza por tu URL completa

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

// -----------------------------
// Helpers (igual que antes)
// -----------------------------
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
    // noop
  }
  return API_BASE_FALLBACK.replace(/\/$/, '');
};

const buildHeaders = async () => {
  let token = API_TOKEN_FALLBACK;
  try {
    const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.API_TOKEN);
    if (storedToken) token = storedToken;
  } catch (err) {
    // noop
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
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

// -----------------------------
// Small components: pulsing icon + animated modal
// -----------------------------

function AnimatedIconPulse({ name, size = 28, color = '#1e8e3e', active = false }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loopAnim;
    if (active) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.12, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loopAnim.start();
    } else {
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
    return () => {
      if (loopAnim) loopAnim.stop();
    };
  }, [active]);

  return (
    <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

// AnimatedStatusModal ahora recibe headerHeight para ubicarse dinámicamente
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
  }, [visible, headerHeight]);

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
            <TouchableOpacity onPress={onClose} style={modalStyles.btnGhost}>
              <Text style={modalStyles.btnGhostText}>Cerrar</Text>
            </TouchableOpacity>

            {ok ? (
              <TouchableOpacity onPress={onScan} style={[modalStyles.btnPrimary, { backgroundColor: accent }]}>
                <Text style={modalStyles.btnPrimaryText}>Ir a venta</Text>
              </TouchableOpacity>
            ) : null}
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

// -----------------------------
// Componente principal QRScreen (responsive, sin cambiar lógica)
// -----------------------------
export default function QRScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // responsive helpers
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Estados UI
  const [hasPermission, setHasPermission] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [allowScan, setAllowScan] = useState(false); // para Escanear QR (manual)
  const [allowScanForStatus, setAllowScanForStatus] = useState(false); // para Status
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [statusToken, setStatusToken] = useState(null);

  const scannerRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  // UI config (responsive)
  const baseHeader = 56;
  const headerHeight = clamp(rf(baseHeader), 48, 110);
  const qrSize = Math.min(Math.round(width * 0.68), clamp(360, 220, 500));
  const holeTop = headerHeight + clamp(rf(64), 72, 140);
  const holeLeft = Math.round((width - qrSize) / 2);
  const cornerArc = clamp(64, 40, 96);
  const cornerThickness = Math.max(8, Math.round((width / 375) * 10));
  const cornerOuterRadius = Math.round(Math.min(qrSize, 320) * 0.06);
  const overlayAlpha = 0.26;
  const innerPanelOpacity = 0.04;
  const CAMERA_HEIGHT = Math.max(height - headerHeight - insets.bottom - 16, Math.round(height * 0.6));

  // --- LOGO sizing for the new element (responsive and caps) ---
  const logoMaxWidth = Math.round(Math.min(160, width * 0.36)); // cap absolute
  const logoWidth = Math.min(logoMaxWidth, Math.round(qrSize * 0.38)); // relative to qrSize but capped
  const logoHeight = Math.round(logoWidth * 0.5); // aspect ratio (ajustable)
  // position above hole: leave unaggressive offset so it sits clearly above the QR frame
  const logoTopPos = Math.max(12, holeTop - logoHeight - Math.round(logoHeight * 0.35));
  // ------------------------------------------------

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setScannerActive(true);
      setAllowScan(false);
      setAllowScanForStatus(false);
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

  const startManualScan = () => reactivateScanner(true);
  const toggleFlash = () => setFlashEnabled((p) => !p);

  const onSuccess = async (e) => {
    if (!allowScan && !allowScanForStatus) return;

    setAllowScan(false);
    setAllowScanForStatus(false);
    setScannerActive(false);

    const raw = e?.data ?? '';
    const token = extractTokenFromRaw(raw);

    if (!token) {
      setStatusResult({ ok: false, message: 'No se encontró un token válido en el QR.' });
      setStatusLoading(false);
      setStatusModalVisible(true);

      setTimeout(() => reactivateScanner(true), 900);
      return;
    }

    if (allowScanForStatus) {
      if (statusTimeoutRef.current) { clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = null; }
      handleStatusFetchForToken(raw, token);
      return;
    }

    navigation.navigate('Escanear', { token });
  };

  const showStatusModal = (resultObj, token = null, loading = false) => {
    if (statusTimeoutRef.current) { clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = null; }
    setStatusResult(resultObj);
    setStatusToken(token);
    setStatusLoading(loading);
    setStatusModalVisible(true);
  };

  const hideStatusModal = () => {
    setStatusModalVisible(false);
    setStatusResult(null);
    setStatusToken(null);
    setStatusLoading(false);
    setScannerActive(true);
    setAllowScan(false);
    setAllowScanForStatus(false);
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

  const handleStatusFetchForToken = async (raw, token) => {
    setStatusLoading(true);
    showStatusModal({ ok: null, message: 'Consultando estado de la mesa…' }, token, true);

    try {
      const host = await resolveApiHost(raw);
      if (!host) {
        setStatusLoading(false);
        showStatusModal({ ok: false, message: 'No se pudo determinar la URL del servidor desde el QR. Escanea con "Escanear QR" para ver detalles.' }, token, false);
        return;
      }

      const apiUrl = `${host}/api/mesas/r/${encodeURIComponent(token)}`;
      const headers = await buildHeaders();

      const res = await fetchWithTimeout(apiUrl, { headers }, 10000);
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      setStatusLoading(false);

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        showStatusModal({ ok: false, message: msg }, token, false);
        return;
      }

      const summaryParts = [];
      if (json && typeof json === 'object') {
        if (json.venta_id || json.id) summaryParts.push(`Venta: ${json.venta_id ?? json.id}`);
        if (json.total) summaryParts.push(`Total: ${json.total}`);
        if (json.items && Array.isArray(json.items)) summaryParts.push(`Items: ${json.items.length}`);
      }
      const summary = summaryParts.length ? summaryParts.join(' • ') : 'Hay una venta activa para esta mesa.';

      showStatusModal({ ok: true, message: 'Existe una venta activa.', details: summary, payload: json }, token, false);

    } catch (err) {
      console.warn('Status fetch error', err);
      setStatusLoading(false);
      showStatusModal({ ok: false, message: 'Error al conectar con el servidor. Intenta de nuevo.' }, token, false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={[styles.loading, { backgroundColor: '#000' }]}>
        <Text style={styles.loadingText}>Solicitando permiso…</Text>
      </View>
    );
  }

  const buttonsTop = holeTop + qrSize + clamp(rf(48), 80, 160);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: '#000', paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { height: headerHeight }]}>
        <TouchableOpacity onPress={openWhatsApp} style={styles.iconBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name="face-agent"
            size={rf(22)}
            color="#0046ff"
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: clamp(rf(18), 14, 22) }]}>Escanear QR</Text>

        <TouchableOpacity onPress={toggleFlash} style={styles.iconBtn} activeOpacity={1}>
          <Ionicons name={flashEnabled ? 'flashlight' : 'flashlight-outline'} size={rf(22)} color="#0046ff" />
        </TouchableOpacity>
      </View>

      {/* Cámara */}
      <View style={[styles.cameraWrapper, { height: CAMERA_HEIGHT }]}>
        {scannerActive && (
          <QRCodeScanner
            ref={scannerRef}
            onRead={onSuccess}
            cameraStyle={[styles.camera, { height: CAMERA_HEIGHT }]}
            flashMode={flashEnabled ? RNCamera.Constants.FlashMode.torch : RNCamera.Constants.FlashMode.off}
            showMarker={false}
            reactivate={false}
            topViewStyle={styles.zero}
            bottomViewStyle={styles.zero}
          />
        )}

        {/* Overlay (hueco para QR) */}
        <View style={[styles.overlay, { height: CAMERA_HEIGHT }]}>
          <View style={[styles.overlayRow, { height: holeTop, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />

          {/* --- LOGO: ahora sin recuadro blanco, más grande y un poco por encima del recuadro --- */}
          <View style={{
            position: 'absolute',
            top: logoTopPos,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 30,
            pointerEvents: 'none', // no intercepta toques
          }}>
            {/* Ajusta la ruta del require si tu logo está en otra carpeta */}
            <Image
              source={require('../../assets/images/logo2.png')}
              style={{
                width: logoWidth,
                height: logoHeight,
                resizeMode: 'contain',
                // sombra sutil para que destaque sin fondo blanco
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 4,
              }}
            />
          </View>
          {/* ------------------------------------------------------------------------------- */}

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

              {/* esquinas */}
              <View style={{
                position: 'absolute', top: 0, left: 0, width: cornerArc, height: cornerArc,
                borderTopWidth: cornerThickness, borderLeftWidth: cornerThickness, borderColor: '#fff',
                borderTopLeftRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent',
              }} />
              <View style={{
                position: 'absolute', top: 0, right: 0, width: cornerArc, height: cornerArc,
                borderTopWidth: cornerThickness, borderRightWidth: cornerThickness, borderColor: '#fff',
                borderTopRightRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent',
              }} />
              <View style={{
                position: 'absolute', bottom: 0, left: 0, width: cornerArc, height: cornerArc,
                borderBottomWidth: cornerThickness, borderLeftWidth: cornerThickness, borderColor: '#fff',
                borderBottomLeftRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent',
              }} />
              <View style={{
                position: 'absolute', bottom: 0, right: 0, width: cornerArc, height: cornerArc,
                borderBottomWidth: cornerThickness, borderRightWidth: cornerThickness, borderColor: '#fff',
                borderBottomRightRadius: cornerOuterRadius, zIndex: 10, backgroundColor: 'transparent',
              }} />
            </View>

            <View style={[styles.overlayCol, { width: holeLeft, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />
          </View>

          <View style={[styles.overlayRow, { flex: 1, backgroundColor: `rgba(0,0,0,${overlayAlpha})` }]} />
        </View>

        {/* Botones flotantes */}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: buttonsTop, left: 0, width, alignItems: 'center', zIndex: 40 }}>
          <TouchableOpacity activeOpacity={1} onPress={startManualScan} style={[styles.floatPrimary, { width: Math.min(360, Math.round(width * 0.78)), paddingVertical: clamp(rf(12), 10, 18) }]}>
            <View style={styles.actionContent}>
              <Ionicons name="qr-code-outline" size={rf(18)} color="#fff" style={{ marginRight: 12 }} />
              <Text style={[styles.primaryActionText, { fontSize: clamp(rf(16), 14, 18) }]}>Escanear QR</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity activeOpacity={1} onPress={onStatusPress} style={[styles.floatSecondary, { width: Math.min(360, Math.round(width * 0.78)), paddingVertical: clamp(rf(10), 8, 16) }]}>
            <View style={styles.actionContent}>
              <Ionicons name="time-outline" size={rf(16)} color="#fff" style={{ marginRight: 10 }} />
              <Text style={[styles.secondaryActionText, { fontSize: clamp(rf(15), 13, 17) }]}>Status</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Animated Modal (aparece por encima del header) */}
      <AnimatedStatusModal
        visible={statusModalVisible}
        loading={statusLoading}
        result={statusResult}
        onClose={hideStatusModal}
        onScan={() => {
          hideStatusModal();
          if (statusToken) navigation.navigate('Escanear', { token: statusToken });
        }}
        headerHeight={headerHeight}
      />
    </SafeAreaView>
  );
}

// -----------------------------
// Estilos (conservé tus estilos y añadí modalStyles)
// -----------------------------
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
  root: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff' },

  header: {
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    zIndex: 200,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e6eefc',
  },
  iconBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#0046ff', fontWeight: '700' },

  cameraWrapper: { width: '100%', position: 'relative' },
  camera: { width: '100%', position: 'absolute', top: 0, left: 0 },

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

  statusModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  statusModalBox: { width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'flex-start' },
  statusTitle: { fontSize: 18, fontWeight: '700', color: '#0046ff', marginBottom: 8 },
  statusMessage: { fontSize: 15, color: '#333', marginBottom: 6 },
  statusDetails: { fontSize: 13, color: '#666', marginBottom: 6 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusBtnText: { fontSize: 14, fontWeight: '700' },
});
