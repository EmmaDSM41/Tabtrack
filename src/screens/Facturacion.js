import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Linking,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from '@react-native-documents/picker';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://api.tab-track.com';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NDc4MTQ5MiwianRpIjoiYTFjMDUzMzUtYzI4Mi00NDY2LTllYzYtMjhlZTlkZjYxZDA2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjQ3ODE0OTIsImV4cCI6MTc2NzM3MzQ5Miwicm9sIjoiRWRpdG9yIn0.O8mIWbMyVGZ1bVv9y5KdohrTdWFtaehOFwdJhwV8RuU';

const initialMethods = [
  { key: 'card1', label: 'Razon Social' },
  { key: 'card2', label: 'RFC' },
  { key: 'paypal', label: 'Regimen' },
  { key: 'applepay', label: 'Uso de CFDI' },
  { key: 'other1', label: 'Constancia' },
  { key: 'other2', label: 'Identificacion' },
];

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
/* ----------------------------------------- */

export default function Facturacion({ navigation }) {
  const [methods] = useState(initialMethods);
  const [username, setUsername] = useState('Usuario');

  // NUEVO: estado fiscal
  const [cp, setCp] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('');
  const [rfc, setRfc] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('');

  const [csfKeyPresent, setCsfKeyPresent] = useState(false);
  const [csfPresignedUrl, setCsfPresignedUrl] = useState(null);
  const [ineKeyPresent, setIneKeyPresent] = useState(false);
  const [inePresignedUrl, setInePresignedUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // bandera si existe registro fiscal (si true -> usar PATCH; si false -> usar POST)
  const [fiscalExists, setFiscalExists] = useState(false);

  // NUEVO: estado para la URL de la foto de perfil guardada en AsyncStorage con clave 'user_profile_url'
  const [profileUrl, setProfileUrl] = useState(null);

  const { width, wp, hp, rf, clamp } = useResponsive();
  const insets = useSafeAreaInsets();
  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  const bottomSafe = Math.round(insets.bottom || 0);

  // --- Toast state ---
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info'); // success | error | info
  const toastAnim = useRef(new Animated.Value(0)).current;

  // --- PDF viewer modal state ---
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const nombre = await AsyncStorage.getItem('user_nombre');
        const apellido = await AsyncStorage.getItem('user_apellido');

        let displayName = '';
        if (nombre && apellido) {
          displayName = `${nombre.trim()} ${apellido.trim()}`;
        } else if (nombre) {
          displayName = nombre.trim();
        } else if (apellido) {
          displayName = apellido.trim();
        } else {
          displayName = 'Usuario';
        }

        setUsername(displayName);

        // leer foto de perfil cacheada
        try {
          const cachedUrl = await AsyncStorage.getItem('user_profile_url');
          if (cachedUrl) setProfileUrl(cachedUrl);
        } catch (e) {
          console.warn('Error leyendo user_profile_url desde AsyncStorage', e);
        }

        // cargar datos fiscales al iniciar
        await loadFiscal();
      } catch (err) {
        console.warn('Error leyendo usuario desde AsyncStorage:', err);
        setUsername('Usuario');
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getInitials = (name) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getAuthHeaders = (extra = {}) => {
    const base = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
    if (API_TOKEN && API_TOKEN.trim()) base['Authorization'] = `Bearer ${API_TOKEN}`;
    return base;
  };

  // Toast helper
  const showToast = (message = '', type = 'info', duration = 2500, cb) => {
    setToastMsg(message);
    setToastType(type);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => cb && cb());
      }, duration);
    });
  };

  // Carga de info fiscal (GET)
  const loadFiscal = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      if (!uid) {
        setLoading(false);
        return;
      }
      const endpoint = `${API_BASE_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/fiscal`;
      let res;
      try {
        res = await fetch(endpoint, { headers: getAuthHeaders() });
      } catch (err) {
        console.warn('loadFiscal fetch error', err);
        setFiscalExists(false);
        setCp('');
        setRazonSocial('');
        setRegimenFiscal('');
        setRfc('');
        setUsoCfdi('');
        setCsfKeyPresent(false);
        setCsfPresignedUrl(null);
        setIneKeyPresent(false);
        setInePresignedUrl(null);
        setLoading(false);
        return;
      }

      if (!res || !res.ok) {
        // 404 u otros -> campos vacíos
        setFiscalExists(false);
        setCp('');
        setRazonSocial('');
        setRegimenFiscal('');
        setRfc('');
        setUsoCfdi('');
        setCsfKeyPresent(false);
        setCsfPresignedUrl(null);
        setIneKeyPresent(false);
        setInePresignedUrl(null);
        setLoading(false);
        return;
      }

      let json = null;
      try {
        json = await res.json();
      } catch (err) {
        console.warn('loadFiscal parse json error', err);
        json = null;
      }

      setCp(json?.cp ?? '');
      setRazonSocial(json?.razon_social ?? '');
      setRegimenFiscal(json?.regimen_fiscal ?? '');
      setRfc(json?.rfc ?? '');
      setUsoCfdi(json?.uso_cfdi ?? '');

      setCsfKeyPresent(Boolean(json?.csf_key_present));
      setCsfPresignedUrl(json?.csf_presigned_url ?? null);
      setIneKeyPresent(Boolean(json?.ine_key_present));
      setInePresignedUrl(json?.ine_presigned_url ?? null);

      setFiscalExists(Boolean(json?.id || json?.id_usuario || true));
    } catch (err) {
      console.warn('loadFiscal error', err);
      setFiscalExists(false);
      setCp('');
      setRazonSocial('');
      setRegimenFiscal('');
      setRfc('');
      setUsoCfdi('');
      setCsfKeyPresent(false);
      setCsfPresignedUrl(null);
      setIneKeyPresent(false);
      setInePresignedUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // Guardar/crear datos fiscales (POST si no existe, PATCH si existe)
  const saveFiscal = async () => {
    setSaving(true);
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      if (!uid) {
        showToast('Usuario no encontrado: no se encontró id.', 'error');
        setSaving(false);
        return;
      }
      const endpoint = `${API_BASE_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/fiscal`;
      const payload = {
        cp: cp,
        razon_social: razonSocial,
        regimen_fiscal: regimenFiscal,
        rfc: rfc,
        uso_cfdi: usoCfdi,
      };

      const method = fiscalExists ? 'PATCH' : 'POST';

      let res;
      try {
        res = await fetch(endpoint, {
          method,
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('saveFiscal fetch error', err);
        showToast('No se pudo conectar al servidor. Revisa tu conexión.', 'error');
        setSaving(false);
        return;
      }

      if (!res || !res.ok) {
        const txt = await safeText(res);
        console.warn('saveFiscal failed', method, res?.status, txt);
        showToast(`No se pudo ${fiscalExists ? 'actualizar' : 'crear'} los datos.`, 'error');
        setSaving(false);
        return;
      }

      showToast(`Datos fiscales ${fiscalExists ? 'actualizados' : 'creados'} correctamente.`, 'success');
      await loadFiscal();
    } catch (err) {
      console.warn('saveFiscal error', err);
      showToast('Ocurrió un error al guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // helper para leer texto de response de forma segura
  const safeText = async (res) => {
    if (!res) return null;
    try {
      return await res.text();
    } catch (err) {
      return null;
    }
  };

  // Helper: obtener blob del fileUri usando XHR GET (fallback). Maneja arraybuffer -> Blob.
  const getFileBlobViaXhr = (fileUri) => {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', fileUri);
        try {
          xhr.responseType = 'blob';
        } catch (e) {
          try { xhr.responseType = 'arraybuffer'; } catch (_) { }
        }
        xhr.onload = function () {
          if (xhr.status === 200 || xhr.status === 0 || xhr.response) {
            const resp = xhr.response;
            if (!resp) {
              reject(new Error('No response from XHR GET'));
              return;
            }
            if (resp instanceof ArrayBuffer) {
              try {
                const b = new Blob([resp], { type: 'application/pdf' });
                resolve(b);
              } catch (errB) {
                reject(errB);
              }
            } else {
              resolve(resp); // Blob
            }
          } else {
            reject(new Error(`XHR GET failed status ${xhr.status}`));
          }
        };
        xhr.onerror = function () {
          reject(new Error('XHR GET error'));
        };
        xhr.send();
      } catch (err) {
        reject(err);
      }
    });
  };

  // Helper: subir blob con XHR PUT (fallback robusto)
  const uploadBlobViaXhr = (uploadUrl, method, headers = {}, blob) => {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(method, uploadUrl);
        try {
          Object.keys(headers || {}).forEach((k) => {
            xhr.setRequestHeader(k, headers[k]);
          });
        } catch (e) {
          // ignore
        }
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ status: xhr.status, responseText: xhr.responseText });
          } else {
            reject(new Error(`XHR upload failed status ${xhr.status} response ${xhr.responseText}`));
          }
        };
        xhr.onerror = function () {
          reject(new Error('XHR upload error'));
        };
        xhr.send(blob);
      } catch (err) {
        reject(err);
      }
    });
  };

  // flujo presign -> upload -> commit (estricto: presign-csf / presign-ine -> PUT -> commit)
  const presignAndUpload = async (type = 'csf') => {
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      if (!uid) {
        showToast('Usuario no encontrado (no se encontró id).', 'error');
        return;
      }

      // Selección del PDF
      let doc;
      try {
        const results = await DocumentPicker.pick({ type: [DocumentPicker.types.pdf] });
        doc = Array.isArray(results) ? results[0] : results;
      } catch (err) {
        const cancelled =
          (typeof DocumentPicker.isCancel === 'function' && DocumentPicker.isCancel(err)) ||
          err?.code === 'DOCUMENT_PICKER_CANCELED' ||
          err?.code === 'USER_CANCELED' ||
          /cancel/i.test(String(err?.message || '')) ||
          /cancel/i.test(String(err?.name || ''));
        if (cancelled) return;
        console.warn('DocumentPicker error', err);
        showToast('No se pudo seleccionar el archivo.', 'error');
        return;
      }

      if (!doc) {
        showToast('Archivo inválido (no se seleccionó nada).', 'error');
        return;
      }

      // fileUri (varía por plataforma)
      const fileUri = doc.uri || doc.fileUri || doc.fileCopyUri || null;
      const fileName = doc.name || (fileUri && fileUri.split('/').pop()) || `file-${Date.now()}.pdf`;
      if (!fileUri) {
        console.warn('selected doc missing uri', doc);
        showToast('El archivo seleccionado no provee una URI válida.', 'error');
        return;
      }

      setUploading(true);

      // presign endpoint estricto según type
      let presignEndpoint;
      if (type === 'ine') {
        presignEndpoint = `${API_BASE_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/fiscal/presign-ine`;
      } else {
        presignEndpoint = `${API_BASE_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/fiscal/presign-csf`;
      }

      // 1) pedir presign
      let presignRes;
      try {
        presignRes = await fetch(presignEndpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content_type: 'application/pdf' }),
        });
      } catch (err) {
        console.warn('presign network error', presignEndpoint, err);
        showToast('No se pudo solicitar URL de presign. Revisa la conexión.', 'error');
        setUploading(false);
        return;
      }

      // manejo 409
      if (presignRes.status === 409) {
        const txt409 = await safeText(presignRes);
        console.warn('presign returned 409:', txt409);
        showToast('Ya existen datos fiscales para este usuario. Se cargará la información.', 'info');
        await loadFiscal();
        setUploading(false);
        return;
      }

      if (!presignRes.ok) {
        const txt = await safeText(presignRes);
        console.warn('presign failed', presignRes.status, txt);
        showToast(`No se pudo obtener URL para subir el archivo. ${txt || presignRes.status}`, 'error');
        setUploading(false);
        return;
      }

      let presignJson = null;
      try {
        presignJson = await presignRes.json();
      } catch (err) {
        console.warn('presign json parse error', err);
        showToast('Respuesta de presign inválida.', 'error');
        setUploading(false);
        return;
      }

      const uploadUrl = presignJson?.url;
      const uploadKey = presignJson?.key;
      const uploadMethod = (presignJson?.method || 'PUT').toUpperCase();

      if (!uploadUrl || !uploadKey) {
        console.warn('presign missing url/key', presignJson);
        showToast('Respuesta de presign inválida (falta url o key).', 'error');
        setUploading(false);
        return;
      }

      if (typeof uploadUrl !== 'string' || !/^https?:\/\//i.test(uploadUrl)) {
        console.warn('uploadUrl seems invalid', uploadUrl);
        showToast('La URL de subida no es válida. Revisa la configuración del servidor.', 'error');
        setUploading(false);
        return;
      }

      // SUBIDA:
      let uploadOk = false;
      try {
        if (presignJson.fields && typeof presignJson.fields === 'object') {
          // presigned POST (Form):
          const form = new FormData();
          Object.keys(presignJson.fields).forEach((k) => form.append(k, presignJson.fields[k]));
          // en RN se debe pasar el objeto { uri, type, name }
          form.append('file', { uri: fileUri, type: 'application/pdf', name: fileName });

          let postRes;
          try {
            postRes = await fetch(uploadUrl, {
              method: 'POST',
              body: form,
            });
          } catch (errPost) {
            console.warn('presigned POST upload threw', errPost);
            throw errPost;
          }

          if (!postRes || !postRes.ok) {
            const txt = await safeText(postRes);
            console.warn('presigned POST upload failed', postRes?.status, txt);
            throw new Error(`Upload failed (presigned POST): ${postRes?.status || 'no status'} ${txt || ''}`);
          }

          uploadOk = true;
        } else {
          // presigned PUT: obtener blob usando XHR GET y subir con XHR PUT (evitar fetch(fileUri))
          let fileBlob = null;
          try {
            fileBlob = await getFileBlobViaXhr(fileUri);
          } catch (xhrGetErr) {
            console.warn('getFileBlobViaXhr failed', xhrGetErr);
            throw xhrGetErr;
          }

          if (!fileBlob) throw new Error('No se pudo leer el archivo local en formato blob.');

          // subir por XHR PUT (más robusto en RN)
          const headersForXhr = presignJson.headers && typeof presignJson.headers === 'object' ? presignJson.headers : { 'Content-Type': 'application/pdf' };

          try {
            await uploadBlobViaXhr(uploadUrl, uploadMethod, headersForXhr, fileBlob);
            uploadOk = true;
          } catch (xhrPutErr) {
            console.warn('upload PUT via XHR failed', xhrPutErr);
            uploadOk = false;
            throw xhrPutErr;
          }
        }
      } catch (uploadErr) {
        console.warn('upload exception', uploadErr);
        setUploading(false);
        showToast('Ocurrió un error durante la subida. Revisa la consola.', 'error');
        return;
      }

      if (!uploadOk) {
        showToast('La subida no se completó. Revisa la conectividad con la URL presign.', 'error');
        setUploading(false);
        return;
      }

      // commit
      let commitEndpoint;
      if (type === 'ine') {
        commitEndpoint = `${API_BASE_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/fiscal/commit-ine`;
      } else {
        commitEndpoint = `${API_BASE_URL}/api/mobileapp/usuarios/${encodeURIComponent(uid)}/fiscal/commit-csf`;
      }

      let commitRes;
      try {
        commitRes = await fetch(commitEndpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ key: uploadKey }),
        });
      } catch (err) {
        console.warn('commit fetch threw', err);
        showToast('No se pudo confirmar el archivo (commit). Revisa la conexión.', 'error');
        setUploading(false);
        return;
      }

      if (!commitRes || !commitRes.ok) {
        const txt = await safeText(commitRes);
        console.warn('commit failed', commitRes?.status, txt);
        showToast(`No se pudo confirmar el archivo en el servidor. Detalle: ${txt || commitRes?.status}`, 'error');
        setUploading(false);
        return;
      }

      showToast(`${type === 'ine' ? 'INE' : 'CSF'} subido correctamente.`, 'success');
      await loadFiscal();
    } catch (err) {
      console.warn('presignAndUpload error', err);
      if (String(err?.message || '').includes('Failed to construct Response') || String(err?.message || '').includes('status 0')) {
        showToast('Error de red al leer el archivo. Revisa la URL/Certificados y la conectividad.', 'error');
      } else {
        showToast('Ocurrió un error en la subida. Revisa la consola.', 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  // abrir presigned url (visualizar). Intento abrir con Linking; si no posible, abro modal con WebView
  const openUrl = async (url) => {
    if (!url) return;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return;
      }
    } catch (err) {
      console.warn('Linking open failed, will show WebView modal', err);
    }

    setPdfUrl(url);
    setPdfLoading(true);
    setPdfModalVisible(true);
  };

  // responsive computed values
  const headerPaddingH = Math.max(12, wp(4));
  const headerPaddingV = clamp(hp(4.5), 12, 36);
  const avatarSize = clamp(wp(9), 28, 56);
  const avatarMarginHorizontal = Math.max(6, wp(1.5));
  const logoWidth = clamp(wp(20), 56, 110);
  const logoHeight = clamp(rf(3.2), 16, 34);
  const scrollPadH = Math.max(12, wp(5));
  const sectionIconSize = clamp(rf(2.6), 14, 24);
  const methodFont = clamp(rf(2.8), 12, 16);
  const saveBtnMarginTop = clamp(hp(4), 12, 40);
  const saveBtnPaddingV = clamp(hp(1.7), 8, 14);
  const saveBtnPaddingH = clamp(wp(4.5), 12, 24);

  // styles mapping for toast types
  const toastBgFor = {
    success: '#0046ff',
    error: '#ff4d4f',
    info: '#333',
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View style={[styles.header, { paddingHorizontal: headerPaddingH, paddingVertical: headerPaddingV }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={clamp(rf(3.4), 20, 26)} color={styles.headerTitle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: clamp(rf(4.5), 20, 22) }]}>Perfil</Text>

        <View style={styles.headerRight}>
          {/* avatar */}
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: Math.round(avatarSize / 2),
              overflow: 'hidden',
              backgroundColor: '#f3f6ff',
              marginHorizontal: avatarMarginHorizontal,
            }}
          >
            {profileUrl ? (
              <Image
                source={{ uri: profileUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={[styles.avatarInitials, { fontSize: Math.round(avatarSize * 0.36) }]}>
                  {getInitials(username) || '👤'}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.username, { fontSize: clamp(rf(3.4), 13, 18), marginRight: Math.max(8, wp(2)) }]} numberOfLines={1}>
            {username}
          </Text>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: scrollPadH, paddingBottom: Math.max(32, bottomSafe + 24) }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="book-outline" size={sectionIconSize} color={styles.sectionTitle.color} />
          <Text style={[styles.sectionTitle, { fontSize: clamp(rf(3.6), 14, 20), marginLeft: 8 }]}>Facturación</Text>
        </View>

        {loading ? (
          <View style={{ padding: 18, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={styles.headerTitle.color} />
            <Text style={{ marginTop: 8 }}>Cargando información...</Text>
          </View>
        ) : (
          <>
            {/* Inline editable fields */}
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Código postal (cp)</Text>
              <TextInput
                value={String(cp ?? '')}
                onChangeText={setCp}
                keyboardType="numeric"
                style={styles.input}
                placeholder="03100"
                placeholderTextColor="#999"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Razón social</Text>
              <TextInput
                value={razonSocial}
                onChangeText={setRazonSocial}
                style={styles.input}
                placeholder="USUARIO DE PRUEBA"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Régimen fiscal</Text>
              <TextInput
                value={regimenFiscal}
                onChangeText={setRegimenFiscal}
                style={styles.input}
                placeholder="62"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>RFC</Text>
              <TextInput
                value={rfc}
                onChangeText={setRfc}
                style={styles.input}
                placeholder="AAA900000000"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Uso CFDI</Text>
              <TextInput
                value={usoCfdi}
                onChangeText={setUsoCfdi}
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { marginTop: saveBtnMarginTop, paddingVertical: saveBtnPaddingV, paddingHorizontal: saveBtnPaddingH }]}
              onPress={saveFiscal}
              disabled={saving}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{fiscalExists ? 'Actualizar' : 'Crear y guardar'}</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 20 }} />

            {/* CSF upload */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Constancia/CSF</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: csfKeyPresent ? '#0b8f56' : '#666' }}>{csfKeyPresent ? 'CSF cargada' : 'CSF no cargada'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {csfPresignedUrl ? (
                    <TouchableOpacity onPress={() => openUrl(csfPresignedUrl)} style={styles.smallBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.smallBtnText}>Ver</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => presignAndUpload('csf')} style={[styles.smallBtn, { marginLeft: 8 }]} disabled={uploading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {uploading ? <ActivityIndicator /> : <Text style={styles.smallBtnText}>Subir CSF (PDF)</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* INE upload */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Identificación (INE)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: ineKeyPresent ? '#0b8f56' : '#666' }}>{ineKeyPresent ? 'INE cargada' : 'INE no cargada'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {inePresignedUrl ? (
                    <TouchableOpacity onPress={() => openUrl(inePresignedUrl)} style={styles.smallBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.smallBtnText}>Ver</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => presignAndUpload('ine')} style={[styles.smallBtn, { marginLeft: 8 }]} disabled={uploading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {uploading ? <ActivityIndicator /> : <Text style={styles.smallBtnText}>Subir INE (PDF)</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: Math.max(20, hp(6)) }} />
      </ScrollView>

      {/* PDF modal (WebView) */}
      <Modal visible={pdfModalVisible} animationType="slide" onRequestClose={() => setPdfModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <TouchableOpacity onPress={() => setPdfModalVisible(false)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, color: '#000', marginLeft: 8 }}>Visor PDF</Text>
          </View>
          {pdfUrl ? (
            <WebView
              source={{ uri: pdfUrl }}
              onLoadStart={() => setPdfLoading(true)}
              onLoadEnd={() => setPdfLoading(false)}
              startInLoadingState
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text>No hay URL para mostrar.</Text>
            </View>
          )}
          {pdfLoading ? (
            <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' }}>
              <ActivityIndicator size="large" />
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Toast animado */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: bottomSafe + (Platform.OS === 'ios' ? 18 : 12),
          alignSelf: 'center',
          maxWidth: '92%',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 22,
          backgroundColor: toastBgFor[toastType] || toastBgFor.info,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          opacity: toastAnim,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>{toastMsg}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const BLUE = '#0046ff';
const DOT_COLOR = '#ccc';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: BLUE,
  },
  headerTitle: {
    fontWeight: '600',
    color: BLUE,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  profileAvatar: {
    resizeMode: 'cover',
  },
  username: {
    color: '#000',
  },
  backButton: { marginRight: 8 },
  logo: {
    resizeMode: 'contain',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: {
    fontWeight: '600',
    color: BLUE,
  },

  // inputs / fields
  fieldLabel: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e7e9ef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: '#fff',
    color: '#111',
  },

  methodsContainer: {},
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DOT_COLOR,
  },
  methodLeft: { flexDirection: 'row', alignItems: 'center' },
  methodText: { color: '#000', marginLeft: 8 },
  editText: { color: BLUE },
  saveButton: {
    alignSelf: 'flex-start',
    backgroundColor: BLUE,
    borderRadius: 8,
  },
  saveButtonText: { color: '#fff', fontWeight: '600' },

  smallBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6eefc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  smallBtnText: { color: BLUE, fontWeight: '700' },

  avatarInitials: { color: '#0046ff', fontWeight: '700' },
});
