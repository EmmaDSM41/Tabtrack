import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logoTabTrack = require('../../assets/images/logo2.png');
const placeholderMerchant = require('../../assets/images/restaurante.jpeg');

const formatMoney = (n) =>
  Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

const API_HOST_CONST = 'https://api.tab-track.com';
const API_TOKEN_CONST = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';

const AS_KEYS = {
  USER_EMAIL: 'user_email',
  USER_MAIL: 'user_mail',
  USER_FULLNAME: 'user_fullname',
  USER_NOMBRE: 'user_nombre',
  USER_APELLIDO: 'user_apellido',
  USER_USUARIO_APP_ID: 'user_usuario_app_id',
};

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pendingKeyForSale = (saleId) => `pending_payment_${saleId}`;
const localPaidKeyForSale = (saleId) => `local_paid_items_${saleId}`;
const lastTransactionKeyForSale = (saleId) => `last_transaction_${saleId}`;

const promotePendingToLocal = async (saleId) => {
  if (!saleId) return;
  try {
    const pendKey = pendingKeyForSale(saleId);
    const rawPend = await AsyncStorage.getItem(pendKey);
    if (!rawPend) {
      return;
    }
    let pending = null;
    try {
      pending = JSON.parse(rawPend);
    } catch (e) {
      pending = null;
    }
    if (!pending || !Array.isArray(pending.ids) || pending.ids.length === 0) {
      await AsyncStorage.removeItem(pendKey);
      return;
    }

    const localKey = localPaidKeyForSale(saleId);
    const rawLocal = await AsyncStorage.getItem(localKey);
    let localArr = [];
    if (rawLocal) {
      try {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) localArr = parsed.map(String);
      } catch (e) {
        localArr = [];
      }
    }

    const union = Array.from(new Set([...(localArr || []), ...pending.ids.map(String)]));
    await AsyncStorage.setItem(localKey, JSON.stringify(union));
    await AsyncStorage.removeItem(pendKey);
    console.log('promotePendingToLocal -> promoted pending to local for sale', saleId, union.length);
  } catch (err) {
    console.warn('promotePendingToLocal error', err);
  }
};

const mergePaidIdsLocal = async (saleId, ids = []) => {
  if (!saleId || !Array.isArray(ids) || ids.length === 0) return;
  try {
    const localKey = localPaidKeyForSale(saleId);
    const rawLocal = await AsyncStorage.getItem(localKey);
    let localArr = [];
    if (rawLocal) {
      try {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) localArr = parsed.map(String);
      } catch (e) {
        localArr = [];
      }
    }
    const union = Array.from(new Set([...(localArr || []), ...ids.map(String)]));
    await AsyncStorage.setItem(localKey, JSON.stringify(union));

    const pendKey = pendingKeyForSale(saleId);
    try {
      const rawPend = await AsyncStorage.getItem(pendKey);
      if (rawPend) {
        let pending = null;
        try { pending = JSON.parse(rawPend); } catch (e) { pending = null; }
        if (pending && Array.isArray(pending.ids)) {
          const remaining = pending.ids.map(String).filter(x => !new Set(ids.map(String)).has(String(x)));
          if (remaining.length === 0) {
            await AsyncStorage.removeItem(pendKey);
          } else {
            pending.ids = remaining;
            await AsyncStorage.setItem(pendKey, JSON.stringify(pending));
          }
        }
      }
    } catch (e) {
      console.warn('mergePaidIdsLocal: error updating pending', e);
    }
    console.log('mergePaidIdsLocal -> merged', union.length, 'paid ids for sale', saleId);
  } catch (err) {
    console.warn('mergePaidIdsLocal error', err);
  }
};

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params ?? {};

  useEffect(() => {
    console.log('PaymentScreen route.params:', params);
  }, [params]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  const bottomSafe = Math.round(insets.bottom || 0);

  const wp = (p) => Math.round((p / 100) * width);
  const hp = (p) => Math.round((p / 100) * height);
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375)); 
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let rawItems = [];
  if (Array.isArray(params.items)) rawItems = params.items;
  else if (typeof params.itemsJson === 'string') {
    try {
      const parsed = JSON.parse(params.itemsJson);
      if (Array.isArray(parsed)) rawItems = parsed;
    } catch (e) {
      rawItems = [];
    }
  }

  const normalizeItems = (itemsArr) => {
    if (!Array.isArray(itemsArr)) return [];
    return itemsArr.map((it, idx) => {
      const qty = Number(it.qty ?? it.cantidad ?? it.quantity ?? 1) || 1;
      const unit = Number(it.unitPrice ?? it.precio_item ?? it.precio ?? it.price ?? it.unit_price ?? 0) || 0;
      const line = Number(it.lineTotal ?? it.line_total ?? it.total ?? +(unit * qty).toFixed(2)) || +(unit * qty).toFixed(2);
      const name = it.name ?? it.nombre ?? it.nombre_item ?? it.title ?? `Item ${idx + 1}`;
      const canceled = !!(it.canceled || it.cancelado);
      const codigo_item = it.codigo_item ?? it.codigo ?? it.code ?? it.original_line_id ?? it.item_id ?? it.id ?? null;
      return {
        ...it,
        name,
        qty,
        price: unit,
        unitPrice: unit,
        lineTotal: line,
        canceled,
        codigo_item,
      };
    });
  };

  const items = normalizeItems(rawItems);

  const subtotal = Number(
    params.subtotal ??
    params.monto_subtotal ??
    params.subtotalToCharge ??
    params.subtotal_to_charge ??
    params.subtotal_local ??
    0
  );

  const iva = Number(
    params.iva ??
    params.monto_iva ??
    params.ivaAmount ??
    params.iva_local ??
    0
  );

  const tipAmount = Number(
    params.tipAmount ??
    params.monto_propina ??
    params.tip_amount ??
    params.tipAmountLocal ??
    params.propina ??
    0
  );

  const tipPercent = Number(
    params.tipPercent ??
    params.tip_percent ??
    params.tipPercentLocal ??
    params.tip_percent_local ??
    0
  );

  const totalWithTip = Number(
    params.displayTotal ??
    params.display_total ??
    params.totalWithTip ??
    params.total_with_tip ??
    params.total ??
    params.totalToCharge ??
    params.total_to_charge ??
    params.totalToPay ??
    params.perPersonTotal ??
    params.perPersonBaseTotal ??
    params.per_person_total ??
    0
  );

  const totalFromItems = items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
  const totalSinPropina = Number(
    params.total ?? params.monto_total ?? params.totalWithoutTip ?? params.total_sin_propina ?? params.monto_subtotal ?? totalFromItems
  );
  const totalSinPropinaFinal = Number(totalSinPropina) || Number(totalFromItems) || 0;

  const restaurantImage = params.restaurantImage ?? params.restaurantImageUri ?? null;

  const mesa_id = params.mesa_id ?? params.mesaId ?? params.mesa ?? null;
  const sucursal_id = params.sucursal_id ?? params.sucursalId ?? params.sucursal ?? null;
  const sale_id = params.sale_id ?? params.saleId ?? params.venta_id ?? null;
  const restaurante_id = params.restaurante_id ?? params.restauranteId ?? params.restaurante ?? null;
  const fecha_apertura = params.fecha_apertura ?? params.fechaApertura ?? null;
  const moneda = params.moneda ?? params.currency ?? 'MXN';
  const mesero = params.mesero ?? params.waiter ?? null;

  const apiHost = params.api_host ?? API_HOST_CONST;
  const apiToken = params.api_token ?? API_TOKEN_CONST;
  const environment = params.environment ?? 'sandbox';
  const providedReturnUrl = params.return_url ?? params.returnUrl ?? null;
  const providedCancelUrl = params.cancel_url ?? params.cancelUrl ?? null;

  const [userEmail, setUserEmail] = useState(params.user_email ?? params.userEmail ?? null);
  const [userFullname, setUserFullname] = useState(params.user_fullname ?? params.userFullname ?? null);
  const [userUsuarioAppId, setUserUsuarioAppId] = useState(params.user_usuario_app_id ?? params.userUsuarioAppId ?? null);

  const [loadingKey, setLoadingKey] = useState(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [gatewayModalVisible, setGatewayModalVisible] = useState(false);
  const [gatewayModalMessage, setGatewayModalMessage] = useState('');

  const pollingRef = useRef({ running: false, stopRequested: false, lastResult: null });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userEmail) {
          const e1 = await AsyncStorage.getItem(AS_KEYS.USER_EMAIL);
          const e2 = await AsyncStorage.getItem(AS_KEYS.USER_MAIL);
          const chosenEmail = e1 || e2 || null;
          if (mounted && chosenEmail) setUserEmail(chosenEmail);
        }
        if (!userFullname) {
          const full = await AsyncStorage.getItem(AS_KEYS.USER_FULLNAME);
          if (full && mounted) setUserFullname(full);
          else {
            const nombre = await AsyncStorage.getItem(AS_KEYS.USER_NOMBRE);
            const apellido = await AsyncStorage.getItem(AS_KEYS.USER_APELLIDO);
            const combined = `${nombre ?? ''} ${apellido ?? ''}`.trim();
            if (combined && mounted) setUserFullname(combined);
          }
        }
        if (!userUsuarioAppId) {
          const id = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);
          if (mounted && id) setUserUsuarioAppId(id);
        }
      } catch (err) {
        console.warn('PaymentScreen AsyncStorage read error', err);
      } finally {
        if (mounted) setLoadingInit(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const buildTransactionUrl = () => {
    const fallback = API_HOST_CONST;
    const host = (apiHost || fallback).trim();
    if (host.includes('/api/transacciones-pago')) return host;
    return `${host.replace(/\/$/, '')}/api/transacciones-pago`;
  };

  const checkGatewayAvailable = async (gateway) => {
    try {
      if (!sucursal_id) return null;
      const hostBase = (apiHost || API_HOST_CONST).replace(/\/$/, '');
      const checkUrl = `${hostBase}/api/sucursales/${encodeURIComponent(sucursal_id)}/gateways`;
      const res = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const list =
        Array.isArray(json.gateways) ? json.gateways :
        Array.isArray(json.available) ? json.available :
        Array.isArray(json.methods) ? json.methods :
        null;
      if (!list) return null;
      return list.map((g) => String(g).toLowerCase()).includes(String(gateway).toLowerCase());
    } catch (err) {
      console.warn('checkGatewayAvailable error:', err);
      return null;
    }
  };


  const fetchStripeCredentials = async (restId, sucId) => {
    try {
      if (!restId || !sucId) return null;
      const hostBase = (apiHost || API_HOST_CONST).replace(/\/$/, '');
      const url = `${hostBase}/api/restaurantes/${encodeURIComponent(restId)}/sucursales/${encodeURIComponent(sucId)}/payment-gateways`;
      console.log('fetchStripeCredentials ->', url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
      });
      if (!res.ok) {
        console.warn('fetchStripeCredentials -> http status', res.status);
        return null;
      }
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (Array.isArray(json.gateways) ? json.gateways : (Array.isArray(json.available) ? json.available : null));
      if (!arr || !Array.isArray(arr)) {
        console.warn('fetchStripeCredentials -> unexpected response shape', json);
        return null;
      }
      const found = arr.find((g) => String(g.gateway ?? '').toLowerCase() === 'stripe' && (g.activo === undefined || !!g.activo));
      if (!found) {
        console.log('fetchStripeCredentials -> stripe gateway not found in list');
        return null;
      }
      const credentials = found.credentials ?? {};
      const pub =
        credentials.public_key ??
        credentials.publicKey ??
        credentials.publishable_key ??
        credentials.publishableKey ??
        credentials.public ??
        '';
      const env = found.environment ?? found.env ?? environment ?? 'sandbox';
      if (!pub) {
        console.warn('fetchStripeCredentials -> missing public_key', { found });
        return null;
      }
      return { public_key: pub, environment: env, raw: found };
    } catch (err) {
      console.warn('fetchStripeCredentials error', err);
      return null;
    }
  };

  const openUrlRobust = async (rawUrl) => {
    if (!rawUrl) return false;
    const cleanRaw = String(rawUrl).trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/[\n\r\t]/g, '');
    try { await Linking.openURL(cleanRaw); return true; } catch (e) { console.warn('openUrlRobust1', e); }
    try { const encoded = encodeURI(cleanRaw); await Linking.openURL(encoded); return true; } catch (e) { console.warn('openUrlRobust2', e); }
    if (/\s/.test(cleanRaw)) {
      try { const noSpaces = cleanRaw.replace(/\s+/g, ''); await Linking.openURL(noSpaces); return true; } catch (e) { console.warn('openUrlRobust3', e); }
      try { const encNo = encodeURI(cleanRaw.replace(/\s+/g, '')); await Linking.openURL(encNo); return true; } catch (e) { console.warn('openUrlRobust4', e); }
    }
    return false;
  };

  const showGatewayUnavailableModal = (gateway) => {
    setGatewayModalMessage(`Lo sentimos — el método de pago ${gateway.toUpperCase()} no está disponible para esta sucursal.`);
    setGatewayModalVisible(true);
  };

  const pollSplitsUntilPaid = async (transactionId, timeoutMs = 120 * 1000, intervalMs = 3000) => {
    if (!transactionId) return { ok: false, reason: 'no_tx' };
    const hostBase = (apiHost || API_HOST_CONST).replace(/\/$/, '');
    const url = `${hostBase}/api/transacciones-pago/${encodeURIComponent(transactionId)}/splits`;
    const start = Date.now();
    pollingRef.current.running = true;
    pollingRef.current.stopRequested = false;

    while (!pollingRef.current.stopRequested && Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          const splitsArr = Array.isArray(json.splits) ? json.splits : [];
          const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
          if (paidSplits.length > 0) {
            const paidCodes = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
            try {
              await mergePaidIdsLocal(sale_id, paidCodes);
            } catch (e) { console.warn('mergePaidIdsLocal error', e); }
            pollingRef.current.running = false;
            return { ok: true, paidCodes, raw: json };
          }
          pollingRef.current.lastResult = { json };
        } else {
          console.warn('pollSplitsUntilPaid - http status', res.status);
        }
      } catch (err) {
        console.warn('pollSplitsUntilPaid error', err);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    pollingRef.current.running = false;
    return { ok: false, reason: 'timeout', last: pollingRef.current.lastResult ?? null };
  };

  const startCheckoutAndPoll = async ({ gateway }) => {
    if (loadingKey) return;
    if (loadingInit) {
      Alert.alert('Espere', 'Cargando datos de sesión, intente de nuevo en un momento.');
      return;
    }
    if (!apiHost) {
      Alert.alert('Falta API host', 'No hay api_host configurado. Pasa api_host en route.params o ajusta API_HOST_CONST.');
      return;
    }
    if (!userEmail || !userFullname) {
      Alert.alert('Usuario no disponible', 'No se encontraron datos del usuario (correo/nombre). Inicia sesión o pásalos en params.');
      return;
    }
    if (!sucursal_id || !sale_id || !restaurante_id) {
      Alert.alert('Faltan datos', 'No hay sucursal_id / sale_id / restaurante_id. No es posible verificar el pago automáticamente.');
      return;
    }

    const avail = await checkGatewayAvailable(gateway);
    if (avail === false) { showGatewayUnavailableModal(gateway); return; }

    setLoadingKey(gateway);

    const url = buildTransactionUrl();

    const usuario_app_id_to_send =
      (userEmail && String(userEmail).trim()) || (userUsuarioAppId && String(userUsuarioAppId).trim()) || '';

    const monto_subtotal = Number(totalSinPropinaFinal);
    const monto_propina = Number(tipAmount || 0);

    const isEqualSplitOrigin = params.groupPeople !== undefined && params.groupPeople !== null;
    const items_pagados = isEqualSplitOrigin
      ? [
          {
            codigo_item: String(1),
            nombre_item: 'pago por partes iguales',
            cantidad: 1,
            precio_unitario: Number(monto_subtotal || 0),
          },
        ]
      : (Array.isArray(items ? items : []) ? items : []).map(it => ({
          codigo_item: it.codigo_item ?? it.codigo ?? it.code ?? it.original_line_id ?? String(it.id ?? ''),
          nombre_item: it.name ?? it.nombre ?? '',
          cantidad: Number(it.qty ?? it.cantidad ?? 1) || 1,
          precio_unitario: Number(it.unitPrice ?? it.price ?? it.precio_item ?? it.precio ?? 0) || 0,
        }));

    let resolvedPaymentMethodId = 1;
    try {
      if (restaurante_id) {
        const hostBase = (apiHost || API_HOST_CONST).replace(/\/$/, '');
        const restUrl = `${hostBase}/api/restaurantes/${encodeURIComponent(restaurante_id)}`;
        const restRes = await fetch(restUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
          },
        });
        if (restRes.ok) {
          const restJson = await restRes.json();
          const plataforma = String(restJson.plataforma_gestion ?? restJson.plataforma ?? '').toLowerCase();
          if (plataforma.includes('eposnow') || plataforma.includes('epos now')) {
            resolvedPaymentMethodId = 9;
          } else {
            resolvedPaymentMethodId = 3;
          }
        } else {
          console.warn('startCheckoutAndPoll: no se pudo consultar restaurante (http ' + String(restRes.status) + '). Usando default payment_method_id=3');
          resolvedPaymentMethodId = 3;
        }
      } else {
        console.warn('startCheckoutAndPoll: restaurante_id no disponible para resolver plataforma_gestion. Usando default payment_method_id=3');
        resolvedPaymentMethodId = 3;
      }
    } catch (err) {
      console.warn('Error consultando plataforma_gestion del restaurante:', err, '-> usando default payment_method_id=3');
      resolvedPaymentMethodId = 3;
    }

    const payment_method_id = params.payment_method_id ?? resolvedPaymentMethodId;

    const body = {
      sucursal_id: sucursal_id,
      gateway: gateway,
      environment: environment,
      monto_subtotal,
      monto_propina,
      moneda: moneda || 'MXN',
      payment_method_id,
      usuario_app_id: usuario_app_id_to_send,
      customer_data: {
        email: userEmail || '',
        nombre: userFullname || '',
      },
      metadata: {
        mesa_id: mesa_id ?? null,
        venta_id: sale_id ?? '',
      },
      mesa_id: mesa_id ?? null,
      items_pagados,
      flow: 'checkout',
      ...(providedReturnUrl ? { return_url: providedReturnUrl } : {}),
      ...(providedCancelUrl ? { cancel_url: providedCancelUrl } : {}),
    };

    console.log('createTransaction -> body (envío):', JSON.stringify(body, null, 2), 'POST ->', url);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      if (!res.ok) {
        const serverMsg = json && (json.error || json.message) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        const lowerMsg = String(serverMsg ?? '').toLowerCase();
        if (lowerMsg.includes('gateway') || lowerMsg.includes('no configur') || lowerMsg.includes('no disponible')) {
          showGatewayUnavailableModal(gateway);
          setLoadingKey(null);
          return;
        }
        Alert.alert('Error creando transacción', serverMsg);
        console.log('createTransaction - respuesta error:', json);
        setLoadingKey(null);
        return;
      }

      const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
      const transactionId = json?.transaction_id ?? json?.data?.transaction_id ?? json?.data?.transactionId ?? json?.transactionId ?? null;

      console.log('createTransaction -> checkout_url:', checkoutUrl, ' transaction_id:', transactionId);

      if (!checkoutUrl) {
        Alert.alert('Respuesta inválida', 'El servidor no devolvió checkout_url.');
        console.log('Respuesta completa:', json);
        setLoadingKey(null);
        return;
      }

      if (transactionId && sale_id) {
        try {
          await AsyncStorage.setItem(lastTransactionKeyForSale(sale_id), String(transactionId));
        } catch (e) {
          console.warn('Error guardando last transaction id', e);
        }
      }

      const opened = await openUrlRobust(checkoutUrl);
      setLoadingKey(null);

      navigation.navigate('QRMain');

      const expectedAmount =
        safeNum(params.perPersonAmount ?? params.per_person_amount ?? params.totalToCharge ?? params.total_persona ?? null) ||
        safeNum(totalWithTip) ||
        safeNum(totalSinPropinaFinal);

      (async () => {
        pollingRef.current.stopRequested = false;
        if (transactionId) {
          const result = await pollSplitsUntilPaid(transactionId, 120 * 1000, 3000);
          if (result.ok) {
            console.log('Splits indicate paid:', result);
            try { await promotePendingToLocal(sale_id); } catch (e) { console.warn('promotePendingToLocal after splits', e); }
            navigation.navigate('QRMain');
            return;
          } else {
            console.warn('Splits polling finished without paid:', result);
            return;
          }
        } else {
          console.warn('No transactionId returned; no splits to poll and /pagos polling removed by request.');
          return;
        }
      })();

    } catch (err) {
      console.warn('Error al crear transacción', err);
      Alert.alert('Error', 'No se pudo conectar con el servidor de pagos. Revisa la URL y el token.');
      setLoadingKey(null);
    }
  };

  useEffect(() => {
    const handler = ({ url }) => {
      console.log('PaymentScreen Linking handler, url:', url);
      (async () => {
        if (!sale_id) return;
        try {
          const rawTx = await AsyncStorage.getItem(lastTransactionKeyForSale(sale_id));
          const txId = rawTx ? rawTx : null;
          if (txId) {
            const r = await pollSplitsUntilPaid(txId, 30 * 1000, 2500);
            if (r.ok) {
              console.log('Pago confirmado (splits deeplink):', r);
              try { await promotePendingToLocal(sale_id); } catch (e) { console.warn('promotePendingToLocal error (deeplink)', e); }
              navigation.navigate('QRMain');
              return;
            } else {
              console.warn('Splits deeplink: no confirmado:', r);
            }
          }
        } catch (e) {
          console.warn('deeplink: error reading last tx', e);
        }
        console.warn('Deep-link returned but no confirmation from splits and fallback to /pagos was removed.');
      })();
    };

    let subscription = null;
    try {
      if (typeof Linking.addListener === 'function') {
        subscription = Linking.addListener('url', handler);
      } else if (typeof Linking.addEventListener === 'function') {
        subscription = Linking.addEventListener('url', handler);
      } else {
        console.warn('Linking does not expose addListener/addEventListener on this platform.');
      }
    } catch (e) {
      console.warn('Could not attach Linking listener', e);
      try { Linking.addEventListener && Linking.addEventListener('url', handler); } catch (er) { console.warn('Could not attach Linking listener fallback', er); }
    }

    return () => {
      try {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        } else if (typeof Linking.removeEventListener === 'function') {
          Linking.removeEventListener('url', handler);
        }
      } catch (e) {
        console.warn('Error removing Linking listener', e);
      }
      pollingRef.current.stopRequested = true;
    };
  }, [sale_id, sucursal_id, restaurante_id, totalWithTip, totalSinPropinaFinal, params.perPersonAmount]);

  const validateBeforeStripe = () => {
    if (loadingInit) {
      Alert.alert('Espere', 'Cargando datos de sesión, intente de nuevo en un momento.');
      return false;
    }
    if (!apiHost) {
      Alert.alert('Falta API host', 'No hay api_host configurado. Pasa api_host en route.params o ajusta API_HOST_CONST.');
      return false;
    }
    if (!userEmail || !userFullname) {
      Alert.alert('Usuario no disponible', 'No se encontraron datos del usuario (correo/nombre). Inicia sesión o pásalos en params.');
      return false;
    }
    if (!sucursal_id || !sale_id || !restaurante_id) {
      Alert.alert('Faltan datos', 'No se encontró sucursal_id / sale_id / restaurante_id en los datos. No se puede iniciar verificación automática.');
      return false;
    }
    return true;
  };

  const onOptionPress = async (opt) => {
    if (opt.key === 'stripe') {
      if (!validateBeforeStripe()) return;

      try {
        setLoadingKey('stripe');
        const creds = await fetchStripeCredentials(restaurante_id, sucursal_id);
        setLoadingKey(null);
        if (!creds || !creds.public_key) {
          Alert.alert('Stripe no configurado', 'No se encontró la public_key de Stripe para esta sucursal. Verifica la configuración del restaurante.');
          return;
        }

        navigation.navigate('Stripe', {
          sucursal_id,
          sale_id,
          restaurante_id,
          usuario_app_id: userEmail || userUsuarioAppId,
          moneda,
          environment,
          displayAmount: totalWithTip || totalSinPropinaFinal,
          monto_subtotal: totalSinPropinaFinal,
          monto_propina: tipAmount,
          items,
          mesa_id,
          userFullname,
          userEmail,
          stripe_public_key: creds.public_key, 
        });
      } catch (err) {
        setLoadingKey(null);
        console.warn('onOptionPress stripe - fetch creds error', err);
        Alert.alert('Error', 'No fue posible obtener las credenciales de Stripe.');
      }

      return;
    }
    if (opt.key === 'paypal') {
      if (!validateBeforeStripe()) return;
      startCheckoutAndPoll({ gateway: 'paypal' });
      return;
    }
    if (opt.key === 'openpay') {
      if (!validateBeforeStripe()) return;

      try {
        setLoadingKey('openpay');
        const creds = await fetchOpenpayCredentials(restaurante_id, sucursal_id);
        setLoadingKey(null);

        if (!creds) {
          Alert.alert(
            'OpenPay no configurado',
            'No se encontraron credenciales válidas de OpenPay para esta sucursal. Verifica la configuración del restaurante.'
          );
          return;
        }

        navigation.navigate('Openpay', {
          sucursal_id,
          sale_id,
          restaurante_id,
          usuario_app_id: userEmail || userUsuarioAppId,
          moneda,
          environment: creds.environment ?? environment,
          monto_subtotal: totalSinPropinaFinal,
          monto_propina: tipAmount,
          items,
          mesa_id,
          openpay_merchant_id: creds.merchant_id || '',
          openpay_public_api_key: creds.public_key || '',
          userFullname,
          userEmail,
        });
        return;
      } catch (err) {
        setLoadingKey(null);
        console.warn('onOptionPress(openpay) error', err);
        Alert.alert('Error', 'No se pudieron obtener las credenciales de OpenPay. Revisa la configuración.');
        return;
      }
    }
    Alert.alert(opt.label);
  };

  const paymentOptions = [
    { key: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
    { key: 'stripe', label: 'Tarjeta de credito o debito', icon: 'card-outline' },
    { key: 'openpay', label: 'OpenPay', icon: 'cash-outline' },
  ];

  const dateText = fecha_apertura ? new Date(fecha_apertura).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  const totalLabel = useMemo(() => formatMoney(totalWithTip || totalSinPropinaFinal), [totalWithTip, totalSinPropinaFinal]);

  const headerHeight = clamp(hp(10), 64, 112);
  const logoSize = clamp(Math.round(width * 0.28), 80, 160);
  const restaurantImageSize = clamp(Math.round(width * 0.16), 48, 120);
  const contentWidth = Math.min(Math.round(width - 32), Math.max(420, Math.round(width * 0.92)));
  const contentPadding = clamp(Math.round(width * 0.04), 12, 28);
  const payButtonHeight = clamp(Math.round(hp(6)), 44, 60);
  const optionRowHeight = clamp(Math.round(hp(6.5)), 48, 72);
  const iconBoxSize = clamp(Math.round(width * 0.11), 40, 64);
  const titleFont = clamp(rf(2.8), 14, 20);
  const totalNumberFont = clamp(rf(6.0), 20, 40);

  async function fetchOpenpayCredentials(restId, sucId) {
    try {
      if (!restId || !sucId) return null;
      const hostBase = (apiHost || API_HOST_CONST).replace(/\/$/, '');
      const url = `${hostBase}/api/restaurantes/${encodeURIComponent(restId)}/sucursales/${encodeURIComponent(sucId)}/payment-gateways`;
      console.log('fetchOpenpayCredentials ->', url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
      });
      if (!res.ok) {
        console.warn('fetchOpenpayCredentials -> http status', res.status);
        return null;
      }
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (Array.isArray(json.gateways) ? json.gateways : null);
      if (!arr || !Array.isArray(arr)) {
        console.warn('fetchOpenpayCredentials -> unexpected response shape', json);
        return null;
      }
      const found = arr.find((g) => String(g.gateway ?? '').toLowerCase() === 'openpay' && (g.activo === undefined || !!g.activo));
      if (!found) {
        console.log('fetchOpenpayCredentials -> openpay gateway not found in list');
        return null;
      }
      const credentials = found.credentials ?? {};
      const merchant =
        credentials.merchant_id ??
        credentials.merchantId ??
        credentials.openpay_merchant_id ??
        credentials.merchant ??
        '';
      const publicKey =
        credentials.public_key ??
        credentials.publicKey ??
        credentials.openpay_public_api_key ??
        credentials.public_api_key ??
        credentials.public ??
        '';
      const env = found.environment ?? found.env ?? found.environment ?? environment ?? 'sandbox';
      if (!merchant || !publicKey) {
        console.warn('fetchOpenpayCredentials -> missing merchant or publicKey', { merchant, publicKey, found });
        return null;
      }
      return { merchant_id: merchant, public_key: publicKey, environment: env, raw: found };
    } catch (err) {
      console.warn('fetchOpenpayCredentials error', err);
      return null;
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { height: headerHeight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Text style={[styles.backArrow, { fontSize: clamp(rf(9), 20, 36) }]}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: titleFont }]}>Tu cuenta</Text>
        <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 14) }]} numberOfLines={1} ellipsizeMode="tail">{dateText}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(hp(3), bottomSafe + 12) }]}>
        <LinearGradient
          colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[styles.headerGradient, { paddingHorizontal: Math.max(12, contentPadding), paddingTop: Math.max(16, hp(2)), paddingBottom: Math.max(18, hp(2)) }]}
        >
          <View style={styles.gradientRow}>
            <View style={[styles.leftCol, { flex: 1 }]}>
              <Image source={logoTabTrack} style={[styles.tabtrackLogo, { width: Math.min(logoSize, 160), height: Math.round(Math.min(logoSize, 160) * 0.32) }]} resizeMode="contain" />
              <View style={[styles.logoWrap, { marginTop: Math.max(6, hp(1)), padding: Math.max(6, wp(1)) }]}>
                <Image
                  source={restaurantImage ? { uri: restaurantImage } : placeholderMerchant}
                  style={[styles.restaurantImage, { width: restaurantImageSize, height: restaurantImageSize, borderRadius: clamp(Math.round(restaurantImageSize / 6), 8, 18) }]}
                />
              </View>
            </View>

            <View style={[styles.rightCol, { maxWidth: Math.round(width * 0.45) }]}>
              <Text style={[styles.totalLabel, { fontSize: clamp(rf(1.8), 12, 16) }]}>Total</Text>
              <View style={styles.totalRow}>
                <Text style={[styles.totalNumber, { fontSize: totalNumberFont }]} numberOfLines={1} ellipsizeMode="tail">
                  {totalLabel}
                </Text>
                <Text style={[styles.totalCurrency, { fontSize: clamp(rf(1.8), 12, 16) }]}>{moneda ?? 'MXN'}</Text>
              </View>
              <View style={styles.rightThanks}>
                <Text style={[styles.thanksText, { fontSize: clamp(rf(1.6), 12, 16) }]}>Detalle</Text>
                <Text style={[styles.thanksSub, { fontSize: clamp(rf(1.4), 11, 14) }]}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.content, { width: contentWidth, padding: contentPadding }]}>
          <TouchableOpacity
            style={[styles.payButton, { height: payButtonHeight, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
            activeOpacity={0.9}
            disabled={loadingKey === 'main'}
            onPress={() => {
              Alert.alert('Pagar', 'Seleccione un método de pago en la lista inferior.');
            }}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            {loadingKey === 'main' ? <ActivityIndicator color="#fff" style={{ marginRight: 10 }} /> : null}
            <Text style={[styles.payButtonText, { fontSize: clamp(rf(1.8), 14, 18) }]}>{loadingKey === 'main' ? 'Creando pago…' : 'Pagar'}</Text>
          </TouchableOpacity>

          <View style={[styles.optionsList, { marginTop: Math.max(8, hp(1)) }]}>
            {paymentOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionRow, { height: optionRowHeight, paddingHorizontal: Math.max(6, wp(2)) }]}
                onPress={() => onOptionPress(opt)}
                activeOpacity={0.7}
                disabled={loadingKey === opt.key}
                hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize, borderRadius: Math.round(iconBoxSize / 6) }]}>
                    {loadingKey === opt.key ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Ionicons name={opt.icon} size={clamp(Math.round(iconBoxSize * 0.42), 16, 24)} color="#0046ff" />
                    )}
                  </View>
                  <Text style={[styles.optionLabel, { fontSize: clamp(rf(1.8), 14, 18) }]}>{opt.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={clamp(Math.round(rf(1.8)), 14, 20)} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Math.max(20, hp(2.5)) }} />
      </ScrollView>

      {gatewayModalVisible && (
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#fff','#fff']} style={[styles.gatewayModalBox, { width: Math.min(width - 48, 420) }]}>
            <Ionicons name="alert-circle" size={44} color="#0046ff" style={{ marginBottom: 8 }} />
            <Text style={[styles.gatewayModalTitle, { fontSize: clamp(rf(2.2), 16, 20) }]}>Método no disponible</Text>
            <Text style={[styles.gatewayModalMessage, { fontSize: clamp(rf(1.6), 13, 16) }]}>{gatewayModalMessage}</Text>

            <TouchableOpacity
              style={styles.gatewayModalButton}
              onPress={() => setGatewayModalVisible(false)}
              activeOpacity={0.9}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={[styles.gatewayModalButtonText, { fontSize: clamp(rf(1.6), 13, 16) }]}>Aceptar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const BLUE = '#0046ff';
const DOT_COLOR = '#ccc';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fb' },
  topBar: {
    width: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: '#0b58ff', marginLeft: 2 },
  title: { fontWeight: '800', color: '#0b58ff' },
  topSmall: { color: '#6b7280' },
  container: { alignItems: 'center', paddingBottom: 24, backgroundColor: '#f5f7fb' },
  headerGradient: {
    width: '100%',
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  gradientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftCol: { flex: 1, flexDirection: 'column', alignItems: 'flex-start' },
  tabtrackLogo: { marginBottom: 8 },
  logoWrap: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.12)', padding: 8, borderRadius: 10 },
  restaurantImage: { backgroundColor: '#fff' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  totalLabel: { color: 'rgba(255,255,255,0.95)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  totalNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
  totalCurrency: { color: '#fff', marginLeft: 6, marginBottom: 3, opacity: 0.95 },
  rightThanks: { marginTop: 10, alignItems: 'flex-end' },
  thanksText: { color: '#fff', fontWeight: '700' },
  thanksSub: { color: 'rgba(255,255,255,0.95)', marginTop: 6 },
  content: { backgroundColor: '#fff', marginTop: 8, borderRadius: 8, alignSelf: 'center' },
  payButton: { backgroundColor: BLUE, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  payButtonText: { color: '#fff', fontWeight: '800' },
  optionsList: { borderTopWidth: 1, borderTopColor: '#f0f0f5' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: '#f0f0f5', borderBottomWidth: 1 },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { borderRadius: 8, backgroundColor: '#f3f6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optionLabel: { fontWeight: '700', color: '#222' },

  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 },
  gatewayModalBox: { borderRadius: 12, padding: 18, alignItems: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 8 },
  gatewayModalTitle: { color: BLUE, fontWeight: '800', marginBottom: 6 },
  gatewayModalMessage: { color: BLUE, textAlign: 'center', marginBottom: 12 },
  gatewayModalButton: { marginTop: 6, backgroundColor: BLUE, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  gatewayModalButtonText: { color: '#fff', fontWeight: '800' },
});
