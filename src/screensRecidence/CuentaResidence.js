import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Alert,
  DeviceEventEmitter,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const API_BASE_URL = 'https://api.residence.tab-track.com';

const VISITS_STORAGE_KEY = 'user_visits';
const PENDING_VISITS_KEY = 'pending_visits';

const formatMoney = (n, currency = 'MXN') =>
  Number.isFinite(n) ? `${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00';

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function useResponsive() {
  const { width, height } = useWindowDimensions();
  const wp = (percent) => Math.round(((Number(percent) || 0) / 100) * width);
  const hp = (percent) => Math.round(((Number(percent) || 0) / 100) * height);
  const rf = (percent) => Math.round(((Number(percent) || 0) / 100) * width);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  return { width, height, wp, hp, rf, clamp };
}

async function saveVisitToStorage(visit) {
  try {
    if (!visit) return false;
    const normalized = {
      id: visit.id ?? visit.sale_id ?? `visit_${Date.now()}`,
      sale_id: visit.sale_id ?? null,
      restaurantName: visit.restaurantName ?? visit.name ?? visit.restaurante ?? visit.restaurant ?? 'Restaurante',
      restaurantImage: visit.restaurantImage ?? visit.restaurantImageUri ?? null,
      mesa: visit.mesa ?? visit.mesa_id ?? null,
      fecha: visit.fecha ?? new Date().toISOString(),
      total: Number(visit.total ?? visit.amount ?? 0) || 0,
      moneda: visit.moneda ?? visit.currency ?? 'MXN',
      items: Array.isArray(visit.items) ? visit.items : [],
      restaurante_id: visit.restaurante_id ?? null,
      sucursal_id: visit.sucursal_id ?? null,
      monto_propina: Number(visit.monto_propina ?? visit.propina ?? visit.tip ?? 0) || 0,
      propina: Number(visit.propina ?? visit.monto_propina ?? 0) || 0,
    };

    const raw = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) || []) : [];
    const existingIndex = arr.findIndex(a =>
      (normalized.sale_id && a.sale_id && String(a.sale_id) === String(normalized.sale_id)) ||
      a.id === normalized.id
    );
    if (existingIndex >= 0) arr.splice(existingIndex, 1);
    arr.unshift(normalized);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(arr.slice(0, 50)));

    try {
      if (normalized.sale_id) {
        const rawPend = await AsyncStorage.getItem(PENDING_VISITS_KEY);
        let pend = rawPend ? (JSON.parse(rawPend) || []) : [];
        pend = pend.filter(p => String(p.sale_id) !== String(normalized.sale_id));
        await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(pend));
        try { await AsyncStorage.removeItem(`pending_payment_${String(normalized.sale_id)}`); } catch (e) {}
      }
    } catch (e) {}
    return true;
  } catch (err) {
    console.warn('saveVisitToStorage error', err);
    return false;
  }
}

async function savePendingVisit(visit) {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    const arr = raw ? (JSON.parse(raw) || []) : [];
    const idKey = visit.sale_id ? String(visit.sale_id) : visit.id ? String(visit.id) : null;
    let filtered = arr;
    if (idKey) filtered = arr.filter(a => String(a.sale_id || a.id || '') !== idKey);
    filtered.unshift(visit);
    await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.warn('savePendingVisit error', e);
    return false;
  }
}

const buildPendingPaymentObj = (saleKey, itemsArr, amount) => {
  try {
    const idsSet = new Set();
    if (Array.isArray(itemsArr)) {
      itemsArr.forEach(it => {
        if (!it) return;
        const raw = it.raw ?? {};
        const candidates = [
          it.id,
          it.original_line_id,
          raw.id,
          raw.item_id,
          raw.codigo,
          raw.codigo_item,
          raw.line_id,
          raw.code,
          raw.sku,
          (raw.name || '').toLowerCase(),
          (it.name || '').toLowerCase(),
        ].filter(Boolean).map(String);
        candidates.forEach(c => idsSet.add(String(c)));
      });
    }
    return { ids: Array.from(idsSet), amount: Number(amount || 0) || 0, created_at: new Date().toISOString(), sale: saleKey };
  } catch (e) {
    return { ids: [], amount: Number(amount || 0) || 0, created_at: new Date().toISOString(), sale: saleKey };
  }
};

const getRestauranteIdFromResolveJson = (json) => {
  const candidates = [
    json?.mesa?.restaurante_id,
    json?.restaurante?.id,
    json?.restaurante_id,
    json?.open_consumption?.restaurante_id,
    json?.open_consumption?.restaurante?.id,
  ];

  const found = candidates.find(v => v !== null && v !== undefined && String(v).trim() !== '');
  return found !== undefined ? found : null;
};

const groupConsumptionItems = (flatItems = []) => {
  const grouped = [];
  const lastParentByCode = new Map();

  flatItems.forEach((it) => {
    if (!it) return;

    const raw = it.raw ?? {};
    const isSubitem = !!raw.is_subitem;
    const itemCode = String(it.codigo_item ?? raw.codigo_item ?? raw.codigo ?? '').trim();
    const parentCode = String(raw.parent_codigo_item ?? '').trim();

    if (!isSubitem) {
      const parentEntry = {
        ...it,
        isSubitem: false,
        subitems: [],
      };

      grouped.push(parentEntry);

      if (itemCode) {
        lastParentByCode.set(itemCode, parentEntry);
      }
    } else {
      const subEntry = {
        ...it,
        isSubitem: true,
        parent_codigo_item: parentCode || null,
        subitems: [],
      };

      const parent = parentCode ? lastParentByCode.get(parentCode) : null;

      if (parent) {
        parent.subitems = parent.subitems || [];
        parent.subitems.push(subEntry);
      } else {
        grouped.push(subEntry);
      }
    }
  });

  return grouped;
};

export default function CuentaResidence() {
  const navigation = useNavigation();
  const route = useRoute();
  const qr = route?.params?.qr ?? null;

  const { width, height, wp, hp, rf, clamp } = useResponsive();
  const insets = useSafeAreaInsets();

  const topSafe = Math.round(Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0)));
  const bottomSafe = Math.round(insets?.bottom ?? 0);
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 36));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [originalTotalConsumo, setOriginalTotalConsumo] = useState(0);
  const [totalConsumo, setTotalConsumo] = useState(0);
  const [saleId, setSaleId] = useState(null);
  const [totalComensales, setTotalComensales] = useState(null);
  const [fechaApertura, setFechaApertura] = useState(null);
  const [fechaCierre, setFechaCierre] = useState(null);
  const [mesaId, setMesaId] = useState(null);
  const [mesero, setMesero] = useState(null);
  const [moneda, setMoneda] = useState('MXN');
  const [restauranteId, setRestauranteId] = useState(null);
  const [sucursalId, setSucursalId] = useState(null);
  const [restaurantImageUri, setRestaurantImageUri] = useState(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const [noSaleModalVisible, setNoSaleModalVisible] = useState(false);
  const [noSaleModalMessage, setNoSaleModalMessage] = useState('');

  const [accountOpening, setAccountOpening] = useState(false);
  const [accountOpened, setAccountOpened] = useState(false);
  const [canOpenAccount, setCanOpenAccount] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  const [discountAmount, setDiscountAmount] = useState(0);
  const [validationBannerVisible, setValidationBannerVisible] = useState(false);

  const [startConsumptionModalVisible, setStartConsumptionModalVisible] = useState(false);

  // --- Propina (tip) state ---
  const [tipOption, setTipOption] = useState(null); // '10' | '15' | '20' | 'custom' | null
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipVisible, setCustomTipVisible] = useState(false);
  const [customTipPercentText, setCustomTipPercentText] = useState('');
  const [customTipPesosText, setCustomTipPesosText] = useState('');

  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const suppressNoOpenSaleRef = useRef(false);

  const validationBannerKey = useMemo(() => {
    if (!qr) return null;
    return `residence_validation_banner_state_${String(qr).trim()}`;
  }, [qr]);

  const persistValidationBannerState = useCallback(async (state) => {
    try {
      if (!validationBannerKey) return;

      if (!state) {
        await AsyncStorage.removeItem(validationBannerKey);
        return;
      }

      await AsyncStorage.setItem(
        validationBannerKey,
        JSON.stringify({
          started: !!state.started,
          visible: !!state.visible,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('persistValidationBannerState error', e);
    }
  }, [validationBannerKey]);

  const loadValidationBannerState = useCallback(async () => {
    try {
      if (!validationBannerKey) return;

      const raw = await AsyncStorage.getItem(validationBannerKey);
      if (!raw) {
        if (isMountedRef.current) setValidationBannerVisible(false);
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (isMountedRef.current) {
          setValidationBannerVisible(parsed?.started === true && parsed?.visible === true);
        }
      } catch (e) {
        if (isMountedRef.current) setValidationBannerVisible(false);
      }
    } catch (e) {
      console.warn('loadValidationBannerState error', e);
      if (isMountedRef.current) setValidationBannerVisible(false);
    }
  }, [validationBannerKey]);

  const openErrorModal = (m) => { setErrorModalMessage(m || 'Ocurrió un error'); setErrorModalVisible(true); };
  const closeErrorModal = () => setErrorModalVisible(false);

  const openNoSaleModal = (m) => { setNoSaleModalMessage(m || 'No hay una cuenta para esta mesa.'); setNoSaleModalVisible(true); };
  const closeNoSaleModal = () => {
    setNoSaleModalVisible(false);
    try { navigation.navigate('QrResidence'); } catch (e) { try { navigation.goBack?.(); } catch(e) {} }
  };

  const fetchRestaurantImage = useCallback(async (edificioIdToSearch, restauranteIdToSearch) => {
    try {
      await ensureToken();

      const edificioId = edificioIdToSearch !== null && edificioIdToSearch !== undefined ? String(edificioIdToSearch).trim() : '';
      const targetRestauranteId = restauranteIdToSearch !== null && restauranteIdToSearch !== undefined ? String(restauranteIdToSearch).trim() : '';

      console.log('[CuentaResidence] fetchRestaurantImage -> edificioId:', edificioId, 'restauranteId:', targetRestauranteId);

      if (!edificioId) {
        console.log('[CuentaResidence] Falta edificioId. No se consulta imagen.');
        if (isMountedRef.current) setRestaurantImageUri(null);
        return;
      }

      if (!targetRestauranteId) {
        console.log('[CuentaResidence] Falta restauranteId. No se consulta imagen.');
        if (isMountedRef.current) setRestaurantImageUri(null);
        return;
      }

      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/residence/edificios/${encodeURIComponent(edificioId)}/restaurantes`;
      console.log('[CuentaResidence] Consultando imagen en:', url);

      const headers = { Accept: 'application/json' };
      if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

      const res = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('[CuentaResidence] Status consulta restaurantes:', res.status);

      if (!res.ok) {
        console.log('[CuentaResidence] La consulta de restaurantes falló. Se usa imagen por defecto.');
        if (isMountedRef.current) setRestaurantImageUri(null);
        return;
      }

      const json = await res.json();
      console.log('[CuentaResidence] Respuesta completa restaurantes:', json);

      const restaurantes = Array.isArray(json?.restaurantes) ? json.restaurantes : [];
      const found = restaurantes.find(r => String(r?.id) === targetRestauranteId);

      console.log('[CuentaResidence] Restaurante encontrado:', found);

      const imageUrl = found?.imagen_perfil_url && String(found.imagen_perfil_url).trim()
        ? String(found.imagen_perfil_url).trim()
        : null;

      if (imageUrl) {
        console.log('[CuentaResidence] imagen_perfil_url asignada:', imageUrl);
      } else {
        console.log('[CuentaResidence] No hay imagen_perfil_url o vino null. Se usa imagen por defecto.');
      }

      if (isMountedRef.current) {
        setRestaurantImageUri(imageUrl);
      }
    } catch (err) {
      console.warn('fetchRestaurantImage error', err);
      console.log('[CuentaResidence] Error consultando imagen. Se usa imagen por defecto.');
      if (isMountedRef.current) setRestaurantImageUri(null);
    }
  }, []);

  const applyResolveJsonToState = useCallback((json, options = {}) => {
    try {
      const { deferOpenAccountState = false } = options;
      console.log('[CuentaResidence] JSON resolve QR recibido:', json);

      const oc = json.open_consumption ?? null;

      const mesaObj = json.mesa ?? (oc && oc.mesa) ?? null;
      const mesaNumero = mesaObj?.numero_mesa ?? mesaObj?.external_table_id ?? mesaObj?.id ?? json.mesa_id ?? null;
      setMesaId(mesaNumero);

      setMesero((oc && oc.mesero) ?? json.mesero ?? null);
      setMoneda((oc && oc.moneda) ?? json.moneda ?? 'MXN');

      const resolvedRestauranteId = getRestauranteIdFromResolveJson(json);
      console.log('[CuentaResidence] restauranteId desde resolve:', resolvedRestauranteId, {
        mesa_restaurante_id: json?.mesa?.restaurante_id,
        restaurante_obj_id: json?.restaurante?.id,
        restaurante_id: json?.restaurante_id,
        open_consumption_restaurante_id: json?.open_consumption?.restaurante_id,
        open_consumption_restaurante_obj_id: json?.open_consumption?.restaurante?.id,
      });

      setRestauranteId(resolvedRestauranteId ?? null);
      setSucursalId(json.sucursal_id ?? null);

      const resolvedSaleId = (oc && oc.sale_id) ?? json.sale_id ?? json.venta_id ?? json.external_sale_id ?? json.id ?? null;
      setSaleId(resolvedSaleId ?? null);
      setTotalComensales((oc && oc.total_comensales) ?? json.total_comensales ?? null);
      setFechaApertura((oc && oc.fecha_apertura) ?? json.fecha_apertura ?? null);
      setFechaCierre((oc && oc.fecha_cierre) ?? json.fecha_cierre ?? null);

      let itemsArray = [];
      if (oc && Array.isArray(oc.items)) itemsArray = oc.items;
      else if (Array.isArray(json.items)) itemsArray = json.items;
      else itemsArray = [];

      const reportedTotalFromJson = safeNum((oc && oc.total_consumo) ?? json.total_consumo ?? json.total ?? 0);
      const sumPrecioFieldNoQty = itemsArray.reduce((s, it) => s + safeNum(it.precio_item ?? it.precio ?? it.price ?? it.precio_unitario ?? 0), 0);
      const EPS = 0.5;
      const precioItemRepresentaTotalDeLinea = (reportedTotalFromJson > 0) && (Math.abs(sumPrecioFieldNoQty - reportedTotalFromJson) <= EPS);

      const expandedItems = [];
      itemsArray.forEach((it, idx) => {
        const rawQty = Math.max(1, safeNum(it.cantidad ?? it.qty ?? 1));
        const rawPrecioField = safeNum(it.precio_item ?? it.precio ?? it.price ?? it.precio_unitario ?? 0);
        let unitPrice;
        if (rawQty > 1 && precioItemRepresentaTotalDeLinea && rawPrecioField !== 0) {
          unitPrice = +(rawPrecioField / rawQty).toFixed(2);
        } else {
          unitPrice = +Number(rawPrecioField || 0).toFixed(2);
        }
        const originalId = it.codigo_item ?? it.codigo ?? it.id ?? it.item_id ?? `item-${idx}`;
        for (let k = 0; k < rawQty; k++) {
          const unitId = `${String(originalId)}#${idx}#${k+1}`;
          expandedItems.push({
            id: String(unitId),
            name: it.nombre_item ?? it.nombre ?? it.name ?? `Item ${idx+1}`,
            qty: 1,
            unitPrice,
            lineTotal: unitPrice,
            canceled: !!it.canceled || !!it.cancelado,
            raw: it,
            original_line_id: String(originalId),
            codigo_item: String(it.codigo_item ?? it.codigo ?? '').trim(),
          });
        }
      });

      const reportedTotal = safeNum((oc && oc.total_consumo) ?? json.total_consumo ?? json.total ?? 0);
      const computedTotal = reportedTotal > 0 ? reportedTotal : expandedItems.reduce((s,x)=> s + safeNum(x.lineTotal), 0);

      if (isMountedRef.current) {
        setOriginalTotalConsumo(+computedTotal.toFixed(2));
        setItems(expandedItems.map(it => ({ ...it, paid: false, paidPartial: false, paidAmount: 0 })));
        setTotalConsumo(+computedTotal.toFixed(2));
      }

      try {
        const montoDesc = safeNum((oc && oc.descuentos_venta && oc.descuentos_venta.monto_total) ?? json?.descuentos_venta?.monto_total ?? json?.totales_venta?.total_descuentos ?? 0);
        if (isMountedRef.current) setDiscountAmount(+montoDesc.toFixed(2));
      } catch (e) {
        if (isMountedRef.current) setDiscountAmount(0);
      }

      const apertura = json.apertura ?? null;
      const aperturaStatusRaw = apertura?.status ? String(apertura.status).toUpperCase() : null;
      const canOpen = apertura?.can_open_account === true;

      if (aperturaStatusRaw === 'NO_OPEN_SALE') {
        setCanOpenAccount(false);
        setAccountOpened(false);
      } else if (aperturaStatusRaw === 'NOT_OPENED') {
        setCanOpenAccount(!!canOpen);
        setAccountOpened(false);
      } else if (aperturaStatusRaw && aperturaStatusRaw.includes('OPEN')) {
        if (!deferOpenAccountState) {
          setAccountOpened(true);
          setCanOpenAccount(false);
        }
      } else {
        setCanOpenAccount(!!canOpen);
        setAccountOpened(false);
      }

      return {
        restauranteId: resolvedRestauranteId,
        aperturaStatusRaw,
      };
    } catch (err) {
      console.warn('applyResolveJsonToState error', err);
      return { restauranteId: null, aperturaStatusRaw: null };
    }
  }, []);

  const fetchConsumo = useCallback(async (opts = { showLoading: true, deferOpenAccountState: false }) => {
    if (!qr) {
      openErrorModal('QR no encontrado. Vuelve a escanear.');
      if (isMountedRef.current) setLoading(false);
      return;
    }

    if (opts.showLoading && isMountedRef.current) setLoading(true);

    try {
      await ensureToken();

      let usuarioAppId = null;
      try {
        usuarioAppId = await AsyncStorage.getItem('user_usuario_app_id');
        if (usuarioAppId) usuarioAppId = String(usuarioAppId).trim();
      } catch (e) { usuarioAppId = null; }

      if (!usuarioAppId) {
        openErrorModal('Usuario no identificado. Inicia sesión de nuevo.');
        if (isMountedRef.current) setLoading(false);
        return;
      }

      const resolveUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/mobileapp/residence/qr/resolve`;
      console.log('[CuentaResidence] Consultando QR resolve:', {
        resolveUrl,
        qr,
        usuarioAppId,
      });

      const res = await fetch(resolveUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
        body: JSON.stringify({ qr: qr, usuario_app_id: usuarioAppId }),
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        let txt = `No se pudo resolver el QR (HTTP ${res.status}).`;
        try {
          const errJson = await res.json();
          if (errJson && (errJson.error || errJson.message)) txt = String(errJson.error || errJson.message);
        } catch (e) {}
        openErrorModal(txt);
        if (isMountedRef.current) setLoading(false);
        return;
      }

      const json = await res.json();
      console.log('[CuentaResidence] Respuesta de QR resolve:', json);

      const apertura = json.apertura ?? null;
      const aperturaStatus = apertura?.status ? String(apertura.status).toUpperCase() : null;

      if (aperturaStatus === 'NO_OPEN_SALE') {
        if (suppressNoOpenSaleRef.current) {
          suppressNoOpenSaleRef.current = false;
          if (isMountedRef.current) setLoading(false);
          return;
        }

        openNoSaleModal('No hay una cuenta para esta mesa.');
        if (isMountedRef.current) setLoading(false);
        return;
      }

      const { restauranteId: resolvedRestaurantIdFromJson } = applyResolveJsonToState(json, { deferOpenAccountState: !!opts.deferOpenAccountState });

      let edificioId = null;
      try {
        const rawEdificioId = await AsyncStorage.getItem('user_edificio_id_actual');
        edificioId = rawEdificioId !== null && rawEdificioId !== undefined ? String(rawEdificioId).trim() : '';
      } catch (e) {
        edificioId = '';
      }

      console.log('[CuentaResidence] Datos para imagen desde resolve:', {
        edificioId,
        restauranteId: resolvedRestaurantIdFromJson,
      });

      await fetchRestaurantImage(edificioId, resolvedRestaurantIdFromJson);

    } catch (err) {
      console.warn('fetchConsumo error', err);
      openErrorModal('No se pudo consultar el consumo. Revisa tu conexión.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [qr, applyResolveJsonToState, fetchRestaurantImage]);

  useEffect(() => {
    loadValidationBannerState();
    fetchConsumo({ showLoading: true });
  }, [qr, loadValidationBannerState, fetchConsumo]);

  useFocusEffect(useCallback(() => {
    loadValidationBannerState();
    fetchConsumo({ showLoading: false });
  }, [loadValidationBannerState, fetchConsumo]));

  const handleCloseStartModal = useCallback(async () => {
    setStartConsumptionModalVisible(false);
    setAccountOpened(true);
    setCanOpenAccount(false);
    setValidationBannerVisible(true);
    await persistValidationBannerState({ started: true, visible: true });
  }, [persistValidationBannerState]);

  const handleStartConsumptionConfirmed = async () => {
    if (!qr) { openErrorModal('QR no disponible.'); return; }
    if (accountOpening || approveLoading) return;

    setAccountOpening(true);
    try {
      await ensureToken();

      let usuarioAppId = null;
      try {
        usuarioAppId = await AsyncStorage.getItem('user_usuario_app_id');
        if (usuarioAppId) usuarioAppId = String(usuarioAppId).trim();
      } catch (e) { usuarioAppId = null; }
      if (!usuarioAppId) {
        Alert.alert('Usuario no identificado', 'Inicia sesión de nuevo.');
        setAccountOpening(false);
        return;
      }

      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/mobileapp/residence/qr/open-account`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
        body: JSON.stringify({ qr: qr, usuario_app_id: usuarioAppId }),
      });

      if (!res.ok) {
        let txt = `Error abriendo cuenta (HTTP ${res.status}).`;
        try { const ej = await res.json(); if (ej && (ej.error || ej.message)) txt = String(ej.error || ej.message); } catch(e){}
        Alert.alert('Error', txt);
        setAccountOpening(false);
        return;
      }

      const json = await res.json();
      console.log('[CuentaResidence] Respuesta open-account:', json);

      const resolvedData = applyResolveJsonToState(json, { deferOpenAccountState: true });

      let edificioId = null;
      try {
        const rawEdificioId = await AsyncStorage.getItem('user_edificio_id_actual');
        edificioId = rawEdificioId !== null && rawEdificioId !== undefined ? String(rawEdificioId).trim() : '';
      } catch (e) {
        edificioId = '';
      }

      console.log('[CuentaResidence] Datos para imagen desde open-account:', {
        edificioId,
        restauranteId: resolvedData?.restauranteId ?? null,
      });

      await fetchRestaurantImage(edificioId, resolvedData?.restauranteId ?? null);

      const aperturaStatus = json.apertura?.status ? String(json.apertura.status).toUpperCase() : null;
      if (aperturaStatus && aperturaStatus.includes('OPEN')) {
        const resolvedSaleId = (json.open_consumption && json.open_consumption.sale_id) ?? json.external_sale_id ?? json.sale_id ?? json.venta_id ?? null;
        if (resolvedSaleId) setSaleId(String(resolvedSaleId));

        try { await fetchConsumo({ showLoading: false, deferOpenAccountState: true }); } catch(e) { /* noop */ }

        setStartConsumptionModalVisible(true);
      } else {
        if (aperturaStatus === 'NO_OPEN_SALE') {
          openNoSaleModal('El servidor indicó que no hay cuenta disponible.');
        } else {
          Alert.alert('Información', 'Respuesta recibida del servidor.');
        }
      }

      setAccountOpening(false);
    } catch (err) {
      console.warn('handleStartConsumption error', err);
      Alert.alert('Error', 'No se pudo iniciar consumo. Revisa tu conexión.');
      setAccountOpening(false);
    }
  };

  const handleStartConsumption = async () => {
    if (accountOpening || approveLoading) return;
    await handleStartConsumptionConfirmed();
  };

  // --- Propina (tip) helpers ---
  const applyTipPercent = useCallback((percent) => {
    const amt = +(safeNum(totalConsumo) * (percent / 100)).toFixed(2);
    setTipOption(String(percent));
    setTipAmount(amt);
    setCustomTipVisible(false);
    setCustomTipPercentText('');
    setCustomTipPesosText('');
  }, [totalConsumo]);

  const toggleCustomTip = useCallback(() => {
    setTipOption('custom');
    setCustomTipVisible(v => !v);
  }, []);

  const handleCustomTipPercentChange = useCallback((text) => {
    setCustomTipPercentText(text);
    const p = parseFloat(String(text).replace(',', '.'));
    if (Number.isFinite(p) && p >= 0) {
      const amt = +(safeNum(totalConsumo) * (p / 100)).toFixed(2);
      setTipAmount(amt);
      setCustomTipPesosText(amt.toFixed(2));
      setTipOption('custom');
    } else if (String(text).trim() === '') {
      setTipAmount(0);
    }
  }, [totalConsumo]);

  const handleCustomTipPesosChange = useCallback((text) => {
    setCustomTipPesosText(text);
    const v = parseFloat(String(text).replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) {
      setTipAmount(+v.toFixed(2));
      setTipOption('custom');
      const base = safeNum(totalConsumo);
      const pct = base > 0 ? +((v / base) * 100).toFixed(2) : 0;
      setCustomTipPercentText(pct ? String(pct) : '');
    } else if (String(text).trim() === '') {
      setTipAmount(0);
    }
  }, [totalConsumo]);

    const grandTotalWithTip = +(safeNum(totalConsumo) + safeNum(tipAmount)).toFixed(2);


  const handleApproveConsumption = async () => {
    if (!qr) { openErrorModal('QR no disponible.'); return; }
    if (!saleId) { Alert.alert('Venta no encontrada', 'No se pudo determinar el id de la venta.'); return; }

    setApproveLoading(true);
    try {
      await ensureToken();

      let usuarioAppId = null;
      try {
        usuarioAppId = await AsyncStorage.getItem('user_usuario_app_id');
        if (usuarioAppId) usuarioAppId = String(usuarioAppId).trim();
      } catch (e) { usuarioAppId = null; }
      if (!usuarioAppId) {
        Alert.alert('Usuario no identificado', 'Inicia sesión de nuevo.');
        setApproveLoading(false);
        return;
      }

      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/mobileapp/residence/ventas/${encodeURIComponent(String(saleId))}/approve`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
        body: JSON.stringify({ qr: qr, usuario_app_id: usuarioAppId, tip_amount: Number(tipAmount) || 0 }),
      });

      if (!res.ok) {
        let txt = `Error aprobando consumo (HTTP ${res.status}).`;
        try { const ej = await res.json(); if (ej && (ej.error || ej.message)) txt = String(ej.error || ej.message); } catch(e){}
        Alert.alert('Error', txt);
        setApproveLoading(false);
        return;
      }

      const json = await res.json();
      console.log('[CuentaResidence] Respuesta approve:', json);

      try {
        if (json && json.sale_id) {
          const visitToSave = {
            sale_id: json.sale_id,
            restaurante_id: json.restaurante_id ?? restauranteId,
            sucursal_id: sucursalId,
            restaurantName: null,
            restaurantImage: restaurantImageUri ?? null,
            mesa: mesaId ?? null,
            fecha: json.closed_at ?? new Date().toISOString(),
            total: grandTotalWithTip,            
            moneda: moneda ?? 'MXN',
            items: items ?? [],
            monto_propina: Number(json.tip_amount ?? tipAmount) || 0,
            propina: Number(json.tip_amount ?? tipAmount) || 0,
          };
          await saveVisitToStorage(visitToSave);
        }
      } catch (e) { console.warn('Could not save visit after approve', e); }

      try {
        const amountVal = grandTotalWithTip;
        const notifId = `notif_${Date.now()}_${Math.floor(Math.random()*10000)}`;
        const notifText = `Pago registrado: $${amountVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — Venta ${json.sale_id ?? saleId}${(json.mesa_id ?? mesaId) ? ` (Mesa ${json.mesa_id ?? mesaId})` : ''}`;
        const notification = {
          id: notifId,
          text: notifText,
          read: false,
          payload: json,
          createdAt: new Date().toISOString(),
        };

        const notifKeyBase = usuarioAppId ? `user_notifications_${usuarioAppId}` : 'user_notifications';
        try {
          const stored = await AsyncStorage.getItem(notifKeyBase);
          let arr = stored ? (JSON.parse(stored) || []) : [];
          if (json.sale_id) {
            arr = arr.filter(n => String(n.payload?.sale_id || n.payload?.venta_id || '') !== String(json.sale_id));
          }
          arr.unshift(notification);
          await AsyncStorage.setItem(notifKeyBase, JSON.stringify(arr.slice(0, 200)));
        } catch (e) {
          console.warn('Error guardando notificación en AsyncStorage', e);
        }

        try {
          DeviceEventEmitter.emit('notificationReceived', notification);
        } catch (e) {
          console.warn('Error emitiendo evento notificationReceived', e);
        }
      } catch (e) {
        console.warn('Error creando notificación tras aprobar consumo', e);
      }

      try {
        await persistValidationBannerState(null);
        setValidationBannerVisible(false);
      } catch (e) {}

      

      try {

        navigation.navigate('ConfirmacionConsumo', {
          amount: grandTotalWithTip,          
          date: json.closed_at ?? new Date().toISOString(),
          transactionId: json.sale_id ?? saleId,
          mesa: mesaId,
          restauranteId: json.restaurante_id ?? restauranteId,
          sucursalId: json.sucursal_id ?? sucursalId,
          rawResponse: json,
          edificioId: json.edificio_id ?? json.edificioId ?? null,
          tipAmount: Number(json.tip_amount ?? tipAmount) || 0,
        });
      } catch (e) {
        try { navigation.navigate('QrResidence'); } catch(er) {}
      }

      setApproveLoading(false);

    } catch (err) {
      console.warn('handleApproveConsumption error', err);
      setApproveLoading(false);
      Alert.alert('Error', 'No se pudo aprobar consumo. Revisa tu conexión.');
    }
  };

  const iva = +(totalConsumo / 1.16 * 0.16).toFixed(2);
  const subtotal = +(totalConsumo - iva).toFixed(2);
  const fechaTexto = fechaApertura ? new Date(fechaApertura).toLocaleString('es-MX') : '';
  const fechaCierreTexto = fechaCierre ? new Date(fechaCierre).toLocaleString('es-MX') : '';
 
  const consumoPaid = useMemo(() => {
    try {
      const anyItemPaid = Array.isArray(items) && items.some(it => !!it.paid || safeNum(it.paidAmount) > 0);
      const diff = Number(originalTotalConsumo) - Number(totalConsumo);
      const hasDiff = Number.isFinite(diff) && diff > 0.005;
      return anyItemPaid || hasDiff;
    } catch (e) {
      return false;
    }
  }, [items, originalTotalConsumo, totalConsumo]);

  const displayItems = useMemo(() => groupConsumptionItems(items), [items]);

  const layoutWidth = Math.min(width - (sidePad * 2), 420);
  const headerPaddingHorizontal = Math.max(sidePad, wp(4));
  const topBarBaseHeight = Math.max(64, hp(8));
  const logoWidth = clamp(Math.round(wp(28)), 80, 140);
  const restaurantImgSize = clamp(Math.round(wp(16)), 48, 96);
  const rightColMaxWidth = Math.round(Math.min(Math.max(wp(36), 120), 220));
  const totalNumberFont = clamp(rf(7.5), 20, 36);
  const totalCurrencyFont = clamp(rf(2.8), 12, 16);
  const desgloseTitleFont = clamp(rf(5.6), 18, 30);
  const mesaFont = clamp(rf(3.6), 14, 20);
  const itemNameFont = clamp(rf(3.6), 12, 16);
  const itemPriceWidth = Math.min(Math.max(wp(28), 90), 140);
  const subtotalValueFont = clamp(rf(3.8), 16, 22);

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { paddingHorizontal: headerPaddingHorizontal, height: topBarBaseHeight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backArrow, { fontSize: clamp(rf(4.2), 22, 36) }]}>{'‹'}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: clamp(rf(3.6), 14, 18) }]}>Tu cuenta</Text>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>{fechaTexto}</Text>
          {fechaCierreTexto ? <Text style={[styles.topSmall, { marginTop: 4, fontSize: clamp(rf(1.6), 10, 12) }]}>Cierre: {fechaCierreTexto}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>Mesa: {mesaId ?? '—'}</Text>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>Comensales: {totalComensales ?? '—'}</Text>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>Mesero: {mesero ?? '—'}</Text>
        </View>
      </View>

      <Modal visible={errorModalVisible} transparent animationType="fade" onRequestClose={closeErrorModal}>
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} style={[styles.modalBox, { width: Math.min(layoutWidth - 8, wp(94)) }]}>
            <Text style={styles.modalTitle}>Aviso</Text>
            <Text style={styles.modalMessage}>{errorModalMessage}</Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalBtnPrimary]} onPress={() => { setErrorModalVisible(false); navigation.navigate('QrResidence'); }}>
                <Text style={styles.modalBtnPrimaryText}>Volver a escanear</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtnGhost]} onPress={() => setErrorModalVisible(false)}>
                <Text style={styles.modalBtnGhostText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <Modal visible={noSaleModalVisible} transparent animationType="fade" onRequestClose={closeNoSaleModal}>
        <View style={styles.noSaleBackdrop}>
          <View style={[styles.noSaleBox, { width: Math.min(layoutWidth - 48, wp(86)) }]}>
            <Text style={styles.noSaleTitle}>Cuenta no disponible</Text>
            <Text style={styles.noSaleMessage}>{noSaleModalMessage}</Text>

            <TouchableOpacity style={styles.noSaleBtn} onPress={closeNoSaleModal} activeOpacity={0.8}>
              <Text style={styles.noSaleBtnText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={startConsumptionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseStartModal}
      >
        <View style={styles.startModalBackdrop}>
          <View style={[styles.startModalBox, { width: Math.min(layoutWidth - 36, wp(88)) }]}>
            <TouchableOpacity
              style={styles.startModalCloseBtn}
              onPress={handleCloseStartModal}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>

            <View style={styles.startModalIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={34} color="#0046ff" />
            </View>

            <Text style={styles.startModalTitle}>¿Validar consumo?</Text>
            <Text style={styles.startModalMessage}>
              Se agregará el monto a tu consumo del mes,{' '}
              ¿deseas validar?
            </Text>

            <TouchableOpacity
              style={styles.startModalAcceptBtn}
              onPress={async () => {
                setStartConsumptionModalVisible(false);
                await handleApproveConsumption();
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.startModalAcceptBtnText}>Validar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f6ff' }}>
          <ActivityIndicator size="large" color="#0046ff" />
          <Text style={{ marginTop: 12, color: '#666' }}>Cargando consumo…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1, paddingBottom: Math.max(20, hp(3)) + bottomSafe }]} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} locations={[0, 0.45, 1]} style={[styles.headerGradient, { paddingHorizontal: Math.max(14, wp(5)), paddingTop: Math.max(12, hp(2)), paddingBottom: Math.max(24, hp(4)), borderBottomRightRadius: Math.max(28, wp(8)) }]}>
            <View style={[styles.gradientRow, { alignItems: 'flex-start' }]}>
              <View style={[styles.leftCol]}>
                <Image source={require('../../assets/images/logo2.png')} style={[styles.tabtrackLogo, { width: logoWidth, height: Math.round(logoWidth * 0.32), marginBottom: Math.max(8, hp(1)) }]} resizeMode="contain" />
                <View style={[styles.logoWrap, { marginTop: Math.max(6, hp(0.5)), padding: Math.max(6, wp(1.5)), borderRadius: Math.max(8, wp(2)) }]}>
                  {restaurantImageUri ? (
                    <Image source={{ uri: restaurantImageUri }} style={[styles.restaurantImage, { width: restaurantImgSize, height: restaurantImgSize, borderRadius: Math.round(restaurantImgSize * 0.16) }]} />
                  ) : (
                    <Image source={require('../../assets/images/LogoResB.png')} style={[styles.restaurantImage, { width: restaurantImgSize, height: restaurantImgSize, borderRadius: Math.round(restaurantImgSize * 0.16) }]} />
                  )}
                </View>
              </View>

              <View style={[styles.rightCol, { maxWidth: rightColMaxWidth, marginRight: Math.max(12, wp(3)) }]}>
                <Text style={[styles.totalLabel, { fontSize: clamp(rf(2.6), 12, 16) }]}>Total</Text>
                <View style={[styles.totalRow, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.totalNumber, { fontSize: totalNumberFont, lineHeight: Math.round(totalNumberFont * 1.05) }]}>{formatMoney(grandTotalWithTip, moneda)}</Text>
                  <Text style={[styles.totalCurrency, { fontSize: totalCurrencyFont, marginLeft: Math.max(6, wp(1.6)) }]}>{moneda ?? 'MXN'}</Text>
                </View>
                <View style={styles.rightThanks}>
                  <Text style={[styles.thanksText, { fontSize: clamp(rf(2.6), 12, 16) }]}>¡Gracias por tu visita!</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.contentPlain, { width: layoutWidth, paddingVertical: Math.max(12, hp(1.6)), paddingHorizontal: Math.max(12, wp(3)), marginTop: Math.max(8, hp(1)) }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.mesaText, { fontSize: mesaFont }]}>Mesa: {mesaId ?? '—'}</Text>
              <View style={{ width: wp(10) }} />
            </View>

            <Text style={[styles.desgloseTitle, { fontSize: desgloseTitleFont }]}>Desglose</Text>
            <View style={styles.desgloseSeparator} />

            <View style={styles.items}>
              {displayItems.length === 0 && <Text style={{ color: '#666', marginVertical: 8 }}>No hay items registrados.</Text>}
              {displayItems.map((it, i) => (
                <View key={it.id ?? i} style={styles.itemBlock}>
                  <View style={styles.itemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={[styles.itemName, it.canceled && styles.itemCanceled, (it.paid || it.paidPartial) && { color: '#10b981', fontWeight: '800' }, { fontSize: itemNameFont }]} numberOfLines={1}>
                        {it.isSubitem ? `• ${it.name}` : it.name}
                      </Text>
                    </View>

                    <Text style={[styles.itemPrice, it.canceled && styles.itemCanceled, (it.paid || it.paidPartial) && { color: '#10b981', fontWeight: '800' }, { width: itemPriceWidth, fontSize: clamp(rf(2.8), 12, 16) }]}>
                      {formatMoney(it.lineTotal)} {moneda ?? 'MXN'}
                    </Text>
                  </View>

                  {it.canceled ? <Text style={[styles.canceledTag, { fontSize: clamp(rf(2.6), 11, 14) }]}>Cancelado</Text> : null}
                  {it.paid && !it.canceled ? <Text style={{ color: '#0b8f56', fontWeight: '800', marginTop: 6, fontSize: clamp(rf(2.6), 12, 14) }}>Pagado</Text> : it.paidPartial && !it.canceled ? <Text style={{ color: '#0b8f56', fontWeight: '700', marginTop: 6, fontSize: clamp(rf(2.6), 12, 14) }}>Parcial: {formatMoney(it.paidAmount)} pagado</Text> : null}

                  {Array.isArray(it.subitems) && it.subitems.length > 0 ? (
                    <View style={{ marginTop: 8, marginLeft: 14, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#e5e7eb' }}>
                      {it.subitems.map((sub, j) => (
                        <View key={sub.id ?? `${i}-${j}`} style={[styles.itemBlock, { marginBottom: 8 }]}>
                          <View style={styles.itemRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Text style={[styles.itemName, sub.canceled && styles.itemCanceled, (sub.paid || sub.paidPartial) && { color: '#10b981', fontWeight: '800' }, { fontSize: Math.max(itemNameFont - 1, 11), color: '#4b5563' }]} numberOfLines={1}>
                                {`• ${sub.name}`}
                              </Text>
                            </View>

                            <Text style={[styles.itemPrice, sub.canceled && styles.itemCanceled, (sub.paid || sub.paidPartial) && { color: '#10b981', fontWeight: '800' }, { width: itemPriceWidth, fontSize: clamp(rf(2.6), 11, 15), color: '#4b5563' }]}>
                              {formatMoney(sub.lineTotal)} {moneda ?? 'MXN'}
                            </Text>
                          </View>

                          {sub.canceled ? <Text style={[styles.canceledTag, { fontSize: clamp(rf(2.4), 10, 13) }]}>Cancelado</Text> : null}
                          {sub.paid && !sub.canceled ? <Text style={{ color: '#0b8f56', fontWeight: '800', marginTop: 6, fontSize: clamp(rf(2.4), 11, 13) }}>Pagado</Text> : sub.paidPartial && !sub.canceled ? <Text style={{ color: '#0b8f56', fontWeight: '700', marginTop: 6, fontSize: clamp(rf(2.4), 11, 13) }}>Parcial: {formatMoney(sub.paidAmount)} pagado</Text> : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}

              <View style={styles.beforeIvaSeparator} />

              <View style={[styles.itemRow, { paddingTop: 6 }]}>
                <Text style={[styles.subtotalLabel, { fontSize: clamp(rf(3.4), 14, 18) }]}>Sub total</Text>
                <Text style={[styles.subtotalValue, { fontSize: clamp(rf(3.4), 14, 18) }]}>{formatMoney(subtotal)} {moneda ?? 'MXN'}</Text>
              </View>

              <View style={[styles.itemRow, styles.ivaRow]}>
                <Text style={[styles.itemName, styles.ivaText, { fontSize: clamp(rf(3), 12, 16) }]}>IVA (estimado)</Text>
                <Text style={[styles.itemPrice, styles.ivaText, { fontSize: clamp(rf(3), 12, 16), width: itemPriceWidth }]}>{formatMoney(iva)} {moneda ?? 'MXN'}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={[styles.itemRow, { paddingTop: 6 }]}>
                  <Text style={[styles.subtotalLabel, { fontSize: subtotalValueFont }]}>Descuento</Text>
                  <Text style={[styles.subtotalValue, { fontSize: subtotalValueFont }]}>
                    -{formatMoney(discountAmount)} {moneda ?? 'MXN'}
                  </Text>
                </View>
              )}

              {tipAmount > 0 && (
                <View style={[styles.itemRow, { paddingTop: 6 }]}>
                  <Text style={[styles.subtotalLabel, { fontSize: subtotalValueFont }]}>Propina</Text>
                  <Text style={[styles.subtotalValue, { fontSize: subtotalValueFont, color: '#10b981' }]}>
                    {formatMoney(tipAmount)} {moneda ?? 'MXN'}
                  </Text>
                </View>
              )}

              <View style={[styles.itemRow, { paddingTop: 6 }]}>
                <Text style={[styles.subtotalLabel, { fontSize: subtotalValueFont }]}>Total</Text>
                <Text style={[styles.subtotalValue, { fontSize: subtotalValueFont }]}>{formatMoney(grandTotalWithTip)} {moneda ?? 'MXN'}</Text>
              </View>
            </View>
          </View>

          {validationBannerVisible ? (
            <View style={[styles.validationInlineBox, { width: Math.min(layoutWidth * 0.92, layoutWidth - 10) }]}>
              <Text style={[styles.validationInlineText, { fontSize: clamp(rf(2.9), 13, 16) }]}>
                Se agregará el monto a tu consumo del mes,{' '}
                ¿deseas validar?
              </Text>
            </View>
          ) : null}

          {(canOpenAccount || accountOpened) ? (
            <>
              <View style={[styles.tipSectionBox, { width: layoutWidth }]}>
                <Text style={[styles.tipSectionTitle, { fontSize: clamp(rf(3.4), 14, 18) }]}>Propina</Text>
                <View style={styles.tipButtonsRow}>
                  {[10, 15, 20].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.tipButton, tipOption === String(p) && styles.tipButtonActive]}
                      onPress={() => applyTipPercent(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.tipButtonText, tipOption === String(p) && styles.tipButtonTextActive]}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.tipButton, tipOption === 'custom' && styles.tipButtonActive]}
                    onPress={toggleCustomTip}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tipButtonText, tipOption === 'custom' && styles.tipButtonTextActive]}>Personalizar</Text>
                  </TouchableOpacity>
                </View>

                {customTipVisible ? (
                  <View style={styles.customTipBox}>
                    <View style={styles.customTipInputWrap}>
                      <Text style={styles.customTipLabel}>%</Text>
                      <TextInput
                        style={styles.customTipInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        value={customTipPercentText}
                        onChangeText={handleCustomTipPercentChange}
                      />
                    </View>
                    <View style={styles.customTipInputWrap}>
                      <Text style={styles.customTipLabel}>{moneda ?? 'MXN'}</Text>
                      <TextInput
                        style={styles.customTipInput}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                        value={customTipPesosText}
                        onChangeText={handleCustomTipPesosChange}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.smallPrimaryButton,
                  {
                    width: layoutWidth,
                    paddingVertical: Math.max(10, hp(1.2)),
                    backgroundColor: accountOpened ? '#16a34a' : '#0046ff',
                  },
                  (accountOpening || approveLoading) ? { opacity: 0.75 } : null
                ]}
                activeOpacity={0.85}
                onPress={accountOpened ? handleApproveConsumption : handleStartConsumption}
                disabled={accountOpening || approveLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {(accountOpening || approveLoading) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.smallPrimaryButtonText, { fontSize: clamp(rf(3.2), 14, 16), textAlign: 'center' }]}>
                    {accountOpened ? 'Validar consumo' : 'Aprobar consumo'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ height: 0 }} />
          )}

          <View style={{ height: Math.max(12, hp(1.2)) }} />

          <TouchableOpacity style={[styles.secondaryButton, { width: layoutWidth, backgroundColor: '#fff', borderColor: '#ddd', paddingVertical: Math.max(12, hp(1.4)) }]} onPress={() => navigation.navigate('QrResidence')}>
            <Text style={[styles.secondaryButtonText, { color: '#444', fontSize: clamp(rf(3.2), 13, 16) }]}>Volver a escanear</Text>
          </TouchableOpacity>

          <View style={{ height: Math.max(28, hp(3.6)) }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f6ff' },

  topBar: {
    width: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 20,
  },
  backBtn: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { fontSize: 32, color: '#222', marginLeft: 2 },
  title: { fontWeight: '800', color: '#111' },
  topSmall: { color: '#666' },

  container: { alignItems: 'center' },

  headerGradient: { width: '100%', borderBottomRightRadius: 42, overflow: 'hidden' },
  gradientRow: { flexDirection: 'row', justifyContent: 'space-between' },
  leftCol: { flexDirection: 'column', alignItems: 'center' },
  tabtrackLogo: { },
  logoWrap: { backgroundColor: 'rgba(255,255,255,0.12)' },
  restaurantImage: { backgroundColor: '#fff' },

  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 },
  totalLabel: { color: 'rgba(255,255,255,0.95)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  totalNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
  totalCurrency: { color: '#fff', marginLeft: 6, marginBottom: 3, opacity: 0.95 },

  rightThanks: { marginTop: 10, alignItems: 'flex-end' },
  thanksText: { color: '#fff', fontWeight: '700' },

  contentPlain: {
    backgroundColor: '#fff',
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mesaText: { fontWeight: '900', color: '#222' },
  desgloseTitle: { marginTop: 6, fontWeight: '700', color: '#333' },
  desgloseSeparator: { height: 1, backgroundColor: '#e9e9e9', marginTop: 10, marginBottom: 12 },

  items: {},
  itemBlock: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 0 },
  itemName: { color: '#333', flex: 1 },
  itemQty: { marginLeft: 8, color: '#9ca3af' },
  itemPrice: { color: '#333', textAlign: 'right', marginLeft: 12 },

  canceledTag: { marginTop: 6, color: '#ef4444', fontWeight: '700' },

  itemCanceled: { textDecorationLine: 'line-through', color: '#9ca3af' },

  beforeIvaSeparator: { height: 1, backgroundColor: '#e9e9e9', marginTop: 12, marginBottom: 8 },

  ivaRow: { paddingTop: 0 },
  ivaText: { fontWeight: '800' },

  subtotalLabel: { color: '#374151', fontWeight: '700' },
  subtotalValue: { color: '#111827', fontWeight: '900' },

  primaryButton: { backgroundColor: '#0046ff', borderRadius: 10, alignItems: 'center', marginTop: 18, shadowColor: '#085bff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },

  smallPrimaryButton: { backgroundColor: '#0046ff', borderRadius: 22, alignItems: 'center', marginTop: 18, shadowColor: '#085bff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  smallPrimaryButtonText: { color: '#fff', fontWeight: '800' },

  secondaryButton: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1.2, borderColor: '#0046ff' },
  secondaryButtonText: { color: '#085bff', fontWeight: '800' },

  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: { borderRadius: 12, padding: 18, alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalMessage: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 14 },

  modalButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff', marginRight: 8, alignItems: 'center' },
  modalBtnPrimaryText: { color: '#0046ff', fontWeight: '800' },
  modalBtnGhost: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginLeft: 8, alignItems: 'center' },
  modalBtnGhostText: { color: '#fff', fontWeight: '700' },

  gatewayModalBox: { borderRadius: 12, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12, overflow: 'hidden' },
  gatewayModalTitle: { color: '#fff', fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  gatewayModalMessage: { color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  gatewayModalButton: { marginTop: 12, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, minWidth: 120, alignItems: 'center', justifyContent: 'center' },
  gatewayModalButtonText: { color: '#0046ff', fontWeight: '800', fontSize: 15 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  conflictBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.35)' },
  conflictBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'flex-start', elevation: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 12 },
  conflictTitle: { fontWeight: '800', color: '#111', fontSize: 16, marginBottom: 6, textAlign: 'left' },
  conflictMessage: { color: '#111', fontSize: 14, lineHeight: 20 },
  conflictBtn: { backgroundColor: '#0046ff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  conflictBtnText: { color: '#fff', fontWeight: '800' },

  approvingBox: { backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center', justifyContent: 'center' },

  noSaleBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10000 },
  noSaleBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 12 },
  noSaleTitle: { fontWeight: '800', color: '#111', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  noSaleMessage: { color: '#111', fontSize: 15, marginBottom: 18, textAlign: 'center', lineHeight: 20 },
  noSaleBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
  noSaleBtnText: { color: '#0046ff', fontWeight: '800', fontSize: 16, textAlign: 'center' },

  validationInlineBox: {
    marginTop: 12,
    backgroundColor: '#d9d9d9',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#2f2f2f',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  validationInlineText: {
    color: '#3a3a3a',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },

  // --- Propina (tip) styles ---
  tipSectionBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  tipSectionTitle: { fontWeight: '800', color: '#222', marginBottom: 10 },
  tipButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tipButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tipButtonActive: { backgroundColor: '#eaf1ff', borderColor: '#0046ff' },
  tipButtonText: { color: '#444', fontWeight: '700', fontSize: 10 },
  tipButtonTextActive: { color: '#0046ff' },
  customTipBox: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  customTipInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    height: 40,
  },
  customTipLabel: { color: '#666', fontWeight: '700', marginRight: 6, fontSize: 12 },
  customTipInput: { flex: 1, color: '#111', fontSize: 14, padding: 0 },

  startModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  startModalBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
    overflow: 'hidden',
  },
  startModalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  startModalIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  startModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  startModalMessage: {
    fontSize: 15,
    color: '#111',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  startModalAcceptBtn: {
    width: '100%',
    backgroundColor: '#0046ff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startModalAcceptBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});