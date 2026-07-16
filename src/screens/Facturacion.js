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
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from '@react-native-documents/picker';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const API_BASE_URL = 'https://api.tab-track.com';

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

  // ===== NUEVO: errores por campo (validación) =====
  const [fieldErrors, setFieldErrors] = useState({});

  // ===== NUEVO: catálogos de régimen fiscal y uso de CFDI =====
  const [regimenes, setRegimenes] = useState([]);
  const [usoCfdiOptions, setUsoCfdiOptions] = useState([]);
  const [loadingRegimenes, setLoadingRegimenes] = useState(false);
  const [loadingUsoCfdi, setLoadingUsoCfdi] = useState(false);
  const [regimenModalVisible, setRegimenModalVisible] = useState(false);
  const [usoCfdiModalVisible, setUsoCfdiModalVisible] = useState(false);

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

        // NUEVO: precargar catálogos (regímenes y usos de CFDI) en segundo plano,
        // así se pueden mostrar los nombres en vez de solo el código.
        fetchRegimenes();
        fetchUsoCfdiOptions();
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
    if (TOKEN && TOKEN.trim()) base['Authorization'] = `Bearer ${TOKEN}`;
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

      await ensureToken();

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

  // ===================== NUEVO: VALIDACIÓN DE CAMPOS =====================

  // Validación básica en el cliente antes de enviar al backend.
  const validateFiscalFields = () => {
    const errors = {};

    const cpTrim = String(cp ?? '').trim();
    if (!cpTrim) {
      errors.cp = 'El código postal es requerido.';
    } else if (!/^\d{5}$/.test(cpTrim)) {
      errors.cp = 'Código postal incorrecto (deben ser 5 dígitos).';
    }

    if (!razonSocial || !razonSocial.trim()) {
      errors.razonSocial = 'La razón social es requerida.';
    }

    if (!regimenFiscal) {
      errors.regimenFiscal = 'Selecciona un régimen fiscal.';
    }

    const rfcTrim = String(rfc ?? '').trim();
    // Formato general de RFC (persona física: 4 letras + 6 dígitos + 3 alfanuméricos,
    // persona moral: 3 letras + 6 dígitos + 3 alfanuméricos)
    const rfcPattern = /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/i;
    if (!rfcTrim) {
      errors.rfc = 'El RFC es requerido.';
    } else if (!rfcPattern.test(rfcTrim)) {
      errors.rfc = 'RFC no válido. Verifica el formato.';
    }

    if (!usoCfdi) {
      errors.usoCfdi = 'Selecciona un uso de CFDI.';
    }

    return errors;
  };

  // Normaliza los nombres de campo que pueda regresar el backend (snake_case) a
  // las claves que usamos en el estado de errores (camelCase).
  const normalizeFieldKey = (key) => {
    const map = {
      cp: 'cp',
      codigo_postal: 'cp',
      razon_social: 'razonSocial',
      razonSocial: 'razonSocial',
      regimen_fiscal: 'regimenFiscal',
      regimenFiscal: 'regimenFiscal',
      rfc: 'rfc',
      uso_cfdi: 'usoCfdi',
      usoCfdi: 'usoCfdi',
    };
    return map[key] || key;
  };

  // Intenta extraer errores por campo desde la respuesta del backend.
  // Soporta varios formatos comunes; si no encuentra nada estructurado,
  // intenta detectar palabras clave en el mensaje genérico.
  const parseBackendFieldErrors = (json, fallbackText) => {
    const errors = {};

    if (json && typeof json === 'object') {
      // Formato: { errors: { cp: 'mensaje', rfc: ['mensaje1', 'mensaje2'] } }
      if (json.errors && typeof json.errors === 'object' && !Array.isArray(json.errors)) {
        Object.keys(json.errors).forEach((key) => {
          const val = json.errors[key];
          const msg = Array.isArray(val) ? val[0] : val;
          if (msg) errors[normalizeFieldKey(key)] = String(msg);
        });
      }

      // Formato: { field: 'cp', message: 'mensaje' }
      if (json.field && json.message) {
        errors[normalizeFieldKey(json.field)] = String(json.message);
      }
    }

    // Si no se encontró nada estructurado, intentar deducir por palabras clave
    if (Object.keys(errors).length === 0) {
      const msg = String(json?.message || json?.error || fallbackText || '').toLowerCase();
      if (msg) {
        if (msg.includes('postal') || /\bcp\b/.test(msg)) {
          errors.cp = 'Código postal incorrecto.';
        }
        if (msg.includes('rfc')) {
          errors.rfc = 'RFC no válido.';
        }
        if (msg.includes('regimen') || msg.includes('régimen')) {
          errors.regimenFiscal = 'Régimen fiscal inválido.';
        }
        if (msg.includes('cfdi') || msg.includes('uso')) {
          errors.usoCfdi = 'Uso de CFDI inválido.';
        }
        if (msg.includes('razon') || msg.includes('razón') || msg.includes('social')) {
          errors.razonSocial = 'Razón social inválida.';
        }
      }
    }

    return errors;
  };

  const clearFieldError = (fieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  // ===================== NUEVO: CATÁLOGOS (régimen / uso CFDI) =====================

  const fetchRegimenes = async (force = false) => {
    if (!force && regimenes.length > 0) return regimenes;
    setLoadingRegimenes(true);
    try {
      await ensureToken();
      const res = await fetch(`${API_BASE_URL}/api/catalogos/regimenes`, { headers: getAuthHeaders() });
      if (!res || !res.ok) {
        console.warn('fetchRegimenes bad response', res?.status);
        showToast('No se pudo cargar el catálogo de régimen fiscal.', 'error');
        return [];
      }
      let json = null;
      try {
        json = await res.json();
      } catch (err) {
        console.warn('fetchRegimenes json parse error', err);
        showToast('Respuesta inválida del catálogo de régimen fiscal.', 'error');
        return [];
      }
      const list = Array.isArray(json) ? json : (json?.data || json?.regimenes || []);
      setRegimenes(list);
      return list;
    } catch (err) {
      console.warn('fetchRegimenes error', err);
      showToast('Error de conexión al cargar régimen fiscal.', 'error');
      return [];
    } finally {
      setLoadingRegimenes(false);
    }
  };

  const fetchUsoCfdiOptions = async (force = false) => {
    if (!force && usoCfdiOptions.length > 0) return usoCfdiOptions;
    setLoadingUsoCfdi(true);
    try {
      await ensureToken();
      const res = await fetch(`${API_BASE_URL}/api/catalogos/uso_cfdi`, { headers: getAuthHeaders() });
      if (!res || !res.ok) {
        console.warn('fetchUsoCfdiOptions bad response', res?.status);
        showToast('No se pudo cargar el catálogo de uso de CFDI.', 'error');
        return [];
      }
      let json = null;
      try {
        json = await res.json();
      } catch (err) {
        console.warn('fetchUsoCfdiOptions json parse error', err);
        showToast('Respuesta inválida del catálogo de uso de CFDI.', 'error');
        return [];
      }
      const list = Array.isArray(json) ? json : (json?.data || json?.uso_cfdi || []);
      setUsoCfdiOptions(list);
      return list;
    } catch (err) {
      console.warn('fetchUsoCfdiOptions error', err);
      showToast('Error de conexión al cargar uso de CFDI.', 'error');
      return [];
    } finally {
      setLoadingUsoCfdi(false);
    }
  };

  const openRegimenPicker = async () => {
    setRegimenModalVisible(true);
    if (regimenes.length === 0) {
      await fetchRegimenes();
    }
  };

  const openUsoCfdiPicker = async () => {
    setUsoCfdiModalVisible(true);
    if (usoCfdiOptions.length === 0) {
      await fetchUsoCfdiOptions();
    }
  };

  const selectRegimen = (item) => {
    setRegimenFiscal(item?.codigo != null ? String(item.codigo) : '');
    clearFieldError('regimenFiscal');
    setRegimenModalVisible(false);
  };

  const selectUsoCfdi = (item) => {
    setUsoCfdi(item?.codigo != null ? String(item.codigo) : '');
    clearFieldError('usoCfdi');
    setUsoCfdiModalVisible(false);
  };

  const getRegimenLabel = () => {
    if (!regimenFiscal) return '';
    const found = regimenes.find((r) => String(r.codigo) === String(regimenFiscal));
    return found ? `${found.codigo} - ${found.nombre}` : String(regimenFiscal);
  };

  const getUsoCfdiLabel = () => {
    if (!usoCfdi) return '';
    const found = usoCfdiOptions.find((r) => String(r.codigo) === String(usoCfdi));
    return found ? `${found.codigo} - ${found.descripcion}` : String(usoCfdi);
  };

  // Guardar/crear datos fiscales (POST si no existe, PATCH si existe)
  const saveFiscal = async () => {
    // NUEVO: validar antes de enviar
    const clientErrors = validateFiscalFields();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      showToast('Revisa los campos marcados en rojo.', 'error');
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const uid = await AsyncStorage.getItem('user_usuario_app_id');
      if (!uid) {
        showToast('Usuario no encontrado: no se encontró id.', 'error');
        setSaving(false);
        return;
      }

      await ensureToken();

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

        // NUEVO: intentar identificar el error específico devuelto por el backend
        let json = null;
        try {
          json = txt ? JSON.parse(txt) : null;
        } catch (e) {
          json = null;
        }
        const backendErrors = parseBackendFieldErrors(json, txt);

        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
          const summary = Object.values(backendErrors).join(' ');
          showToast(summary, 'error');
        } else {
          showToast(`No se pudo ${fiscalExists ? 'actualizar' : 'crear'} los datos.`, 'error');
        }

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

      await ensureToken();

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
                onChangeText={(val) => { setCp(val); clearFieldError('cp'); }}
                keyboardType="numeric"
                style={[styles.input, fieldErrors.cp ? styles.inputError : null]}
                placeholder="03100"
                placeholderTextColor="#999"
              />
              {fieldErrors.cp ? <Text style={styles.errorText}>{fieldErrors.cp}</Text> : null}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Razón social</Text>
              <TextInput
                value={razonSocial}
                onChangeText={(val) => { setRazonSocial(val); clearFieldError('razonSocial'); }}
                style={[styles.input, fieldErrors.razonSocial ? styles.inputError : null]}
                placeholder="USUARIO DE PRUEBA"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {fieldErrors.razonSocial ? <Text style={styles.errorText}>{fieldErrors.razonSocial}</Text> : null}
            </View>

            {/* NUEVO: Régimen fiscal ahora es un selector con lista desplegable */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Régimen fiscal</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, fieldErrors.regimenFiscal ? styles.inputError : null]}
                onPress={openRegimenPicker}
                activeOpacity={0.7}
              >
                <Text style={regimenFiscal ? styles.selectValueText : styles.selectPlaceholderText} numberOfLines={1}>
                  {regimenFiscal ? getRegimenLabel() : 'Selecciona un régimen fiscal'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
              {fieldErrors.regimenFiscal ? <Text style={styles.errorText}>{fieldErrors.regimenFiscal}</Text> : null}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>RFC</Text>
              <TextInput
                value={rfc}
                onChangeText={(val) => { setRfc(val); clearFieldError('rfc'); }}
                style={[styles.input, fieldErrors.rfc ? styles.inputError : null]}
                placeholder="AAA900000000"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
              {fieldErrors.rfc ? <Text style={styles.errorText}>{fieldErrors.rfc}</Text> : null}
            </View>

            {/* NUEVO: Uso de CFDI ahora es un selector con lista desplegable */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Uso CFDI</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, fieldErrors.usoCfdi ? styles.inputError : null]}
                onPress={openUsoCfdiPicker}
                activeOpacity={0.7}
              >
                <Text style={usoCfdi ? styles.selectValueText : styles.selectPlaceholderText} numberOfLines={1}>
                  {usoCfdi ? getUsoCfdiLabel() : 'Selecciona un uso de CFDI'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
              {fieldErrors.usoCfdi ? <Text style={styles.errorText}>{fieldErrors.usoCfdi}</Text> : null}
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

      {/* NUEVO: Modal selector de Régimen fiscal */}
      <Modal
        visible={regimenModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRegimenModalVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderText}>Régimen fiscal</Text>
              <TouchableOpacity onPress={() => setRegimenModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {loadingRegimenes ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={BLUE} />
              </View>
            ) : regimenes.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#666', marginBottom: 12 }}>No se pudo cargar el catálogo.</Text>
                <TouchableOpacity onPress={() => fetchRegimenes(true)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={regimenes}
                keyExtractor={(item, idx) => String(item?.codigo ?? idx)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.pickerItem} onPress={() => selectRegimen(item)}>
                    <Text style={styles.pickerItemText}>{item.codigo} - {item.nombre}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
                style={{ maxHeight: 420 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* NUEVO: Modal selector de Uso de CFDI */}
      <Modal
        visible={usoCfdiModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUsoCfdiModalVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderText}>Uso de CFDI</Text>
              <TouchableOpacity onPress={() => setUsoCfdiModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {loadingUsoCfdi ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={BLUE} />
              </View>
            ) : usoCfdiOptions.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#666', marginBottom: 12 }}>No se pudo cargar el catálogo.</Text>
                <TouchableOpacity onPress={() => fetchUsoCfdiOptions(true)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={usoCfdiOptions}
                keyExtractor={(item, idx) => String(item?.codigo ?? idx)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.pickerItem} onPress={() => selectUsoCfdi(item)}>
                    <Text style={styles.pickerItemText}>{item.codigo} - {item.descripcion}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
                style={{ maxHeight: 420 }}
              />
            )}
          </View>
        </View>
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

  // ===================== NUEVO: estilos añadidos =====================
  inputError: {
    borderColor: '#ff4d4f',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    marginTop: 4,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValueText: {
    color: '#111',
    flexShrink: 1,
    marginRight: 8,
  },
  selectPlaceholderText: {
    color: '#999',
    flexShrink: 1,
    marginRight: 8,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: BLUE,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pickerItemText: {
    fontSize: 14,
    color: '#111',
  },
});