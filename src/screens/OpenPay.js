// OpenPay.js (modales: tamaño dinámico + logos oficiales en el formulario)
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  useWindowDimensions,
  Modal,
  Switch,
  FlatList,
  ScrollView,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const lastTransactionKeyForSale = (saleId) => `last_transaction_${saleId}`;
const safeNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const DEFAULT_LOGO = require('../../assets/images/logo2.png');
const DEFAULT_RESTAURANT = require('../../assets/images/restaurante.jpeg');

// --- Logos oficiales: coloca estos archivos en ../../assets/images/
// openpay.png, visa.png, mastercard.png, paypal.png
 const LOGO_OPENPAY = require('../../assets/images/openpay.png');
 const LOGO_PAYNET = require('../../assets/images/paynet.png');


export default function OpenPay() {
  const webviewRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const params = route.params ?? {};

  const H_PADDING = Math.max(12, Math.round(winW * 0.04));
  const LOGO_W = Math.min(140, Math.round(winW * 0.32));
  const RESTAURANT_W = Math.min(72, Math.round(winW * 0.18));
  const GRADIENT_HEIGHT = Math.max(120, Math.round(winH * 0.22));
  const PAY_BTN_MARGIN_TOP = Math.max(18, Math.round(winH * 0.035));

  // modal sizing (used for saved cards modal)
  const modalWidth = Math.min(700, winW - 24);
  const maxModalHeight = Math.min(680, winH - 120);

  // UI state
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [webReady, setWebReady] = useState(false);
  const [initPayload, setInitPayload] = useState(null);

  // form
  const [holder, setHolder] = useState(params.userFullname ?? '');
  const [cardNum, setCardNum] = useState('');
  const [mm, setMm] = useState('');
  const [yy, setYy] = useState('');
  const [cvv, setCvv] = useState('');
  const [email, setEmail] = useState(params.userEmail ?? '');

  const [deviceSessionId, setDeviceSessionId] = useState(null);

  // save card modal
  const [saveCardModalVisible, setSaveCardModalVisible] = useState(false);
  const [savePreferred, setSavePreferred] = useState(true);
  const [savingCard, setSavingCard] = useState(false);
  const [pendingOpenpayToken, setPendingOpenpayToken] = useState(null);
  const [lastCardInput, setLastCardInput] = useState(null);
  const [awaitingNewTokenForPayment, setAwaitingNewTokenForPayment] = useState(false);

  // saved cards modal
  const [savedCardsModalVisible, setSavedCardsModalVisible] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState(null);
  const [showCardFields, setShowCardFields] = useState(true);

  // NEW: delete confirm + toast states
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // params defaults
  const {
    api_host = 'https://api.tab-track.com',
    api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3NTUxMjcwNSwianRpIjoiNzA1NjU2YjgtZGFiZS00M2NlLTk2MjUtZmE5ODdmY2FiY2ZiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzU1MTI3MDUsImV4cCI6MTc3ODEwNDcwNSwicm9sIjoiRWRpdG9yIn0.03LJs1TRZzehSXSh5Cdez2e5NFSrANijsS4H6gUjm78',
    sucursal_id = null,
    sale_id = null,
    usuario_app_id = null,
    moneda = 'MXN',
    environment = 'sandbox',
    displayAmount = null,
    monto_subtotal = null,
    monto_propina = null,
    items = [],
    payment_method_id = 1,
    mesa_id = null,
    openpay_merchant_id: param_merchant_id = '',
    openpay_public_api_key: param_public_api_key = '',
    userFullname = '',
    userEmail = '',
    logoUrl = null,
    restaurantImage = null,
  } = params;

  const formatAmount = (n) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  const subtotalNum = Number(monto_subtotal ?? params.monto_subtotal ?? 0) || 0;
  const propinaNum = Number(monto_propina ?? params.monto_propina ?? 0) || 0;
  const displayAmountFinal = Number((displayAmount ?? (subtotalNum + propinaNum)).toFixed(2));

  const buildTransactionUrl = () => {
    const host = String(api_host || 'https://127.0.0.1').trim().replace(/\/$/, '');
    return `${host}/api/transacciones-pago`;
  };

  const genIdempotencyKey = () => {
    const hex = Math.random().toString(16).slice(2, 10);
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${hex}-idemp-${suffix}`;
  };

  // polling helper (igual que antes)
  const pollSplitsUntilPaid = async (transactionId, timeoutMs = 120000, intervalMs = 3000) => {
    if (!transactionId) return { ok: false, reason: 'no_tx' };
    const hostBase = (api_host || 'https://127.0.0.1').replace(/\/$/, '');
    const url = `${hostBase}/api/transacciones-pago/${encodeURIComponent(transactionId)}/splits`;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const splitsArr = Array.isArray(json?.splits) ? json.splits : [];
          const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
          if (paidSplits.length > 0) {
            const paidCodes = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
            return { ok: true, paidCodes, raw: json };
          }
        } else {
          console.warn('pollSplitsUntilPaid - http status', res.status);
        }
      } catch (err) {
        console.warn('pollSplitsUntilPaid error', err);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return { ok: false, reason: 'timeout' };
  };

  const showPaymentError = (title, message, details = null) => {
    console.warn('Navigating to ErrorPago:', title, message, details);
    try { setProcessing(false); } catch (e) {}
    try { setLoading(false); } catch (e) {}
    navigation.navigate('ErrorPago', { title: String(title || 'Error'), message: String(message || 'Ocurrió un problema procesando el pago.'), details: details ? String(details) : null, transactionId: null });
  };

  // -----------------------
  // WebView message handler
  // -----------------------
  const handleWebMessage = async (event) => {
    try {
      const raw = event.nativeEvent.data;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || !data.type) return;

      if (data.type === 'inpage_ready') {
        setWebReady(true);
        setLoading(false);
        if (initPayload) {
          try { webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'init', payload: initPayload })); } catch (e) { console.warn('postMessage init failed', e); }
        }
        return;
      }

      if (data.type === 'device_session_created') {
        console.warn('[WebView] device_session_created =', data.device_session_id);
        setDeviceSessionId(String(data.device_session_id || ''));
        return;
      }

      if (data.type === 'openpay_token') {
        if (awaitingNewTokenForPayment) {
          console.warn('[WebView] second openpay_token received (for payment) token=', data.token);
          setAwaitingNewTokenForPayment(false);
          await processPaymentWithToken({
            openpay_source_id: data.token,
            device_session_id: data.device_session_id,
            holder_name: data.holder_name ?? '',
            customer_email: data.email ?? ''
          });
          return;
        }

        // primer token (guardar o continuar)
        const openpay_source_id = data.token;
        const device_session_id = data.device_session_id;
        const holder_name = data.holder_name ?? '';
        const customer_email = data.email ?? '';
        console.warn('[DEBUG] openpay_token received (first) token=', openpay_source_id, 'device=', device_session_id);

        setPendingOpenpayToken({ openpay_source_id, device_session_id, holder_name, customer_email });
        setSavePreferred(true);
        setSaveCardModalVisible(true);
        return;
      }

      if (data.type === 'error') {
        setProcessing(false);
        showPaymentError('Error', String(data.message || 'Ocurrió un error en la ventana de pago.'), data ? JSON.stringify(data) : null);
        return;
      }
    } catch (err) {
      console.warn('handleWebMessage parse error', err);
    }
  };

  // -----------------------
  // Save card on server
  // -----------------------
  const saveOpenpayCardOnServer = async ({ token_id, device_session_id, set_preferred }) => {
    if (!sucursal_id) throw new Error('Falta sucursal_id');
    const hostBase = (api_host || 'https://127.0.0.1').replace(/\/$/, '');
    const url = `${hostBase}/api/mobileapp/sucursales/${encodeURIComponent(sucursal_id)}/payment-methods/openpay/cards?environment=${encodeURIComponent(environment)}`;
    const idKey = genIdempotencyKey();

    let usuarioAppUuid = null;
    try { usuarioAppUuid = await AsyncStorage.getItem('user_usuario_app_id'); } catch (e) { console.warn('read user_usuario_app_id failed', e); }
    usuarioAppUuid = usuarioAppUuid || usuario_app_id || '';

    const body = {
      token_id,
      device_session_id,
      usuario_app_id: usuarioAppUuid,
      set_preferred: Boolean(set_preferred),
    };

    console.warn('[DEBUG] saveOpenpayCardOnServer - url:', url, 'body:', body, 'Idempotency-Key:', idKey);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idKey, ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      console.warn('[DEBUG] saveOpenpayCardOnServer - status:', res.status, 'json:', json);
      if (!res.ok) {
        throw new Error(json && (json.error || json.message) ? (json.error || json.message) : `Error ${res.status}`);
      }

      const pm = json?.payment_method ?? json?.data?.payment_method ?? json?.data ?? json;
      const normalized = {
        id: pm?.id ?? pm?.mobile_payment_method_id ?? pm?.card_id ?? null,
        external_payment_method_id: pm?.external_payment_method_id ?? pm?.external_id ?? pm?.source_id ?? null,
        brand: pm?.brand ?? pm?.card_brand ?? '',
        last4: pm?.last4 ?? pm?.card_last4 ?? '',
        exp_month: pm?.exp_month ?? pm?.card_exp_month ?? null,
        exp_year: pm?.exp_year ?? pm?.card_exp_year ?? null,
        is_preferred: pm?.is_preferred ?? pm?.preferred ?? false,
        status: pm?.status ?? pm?.state ?? '',
        raw: pm,
      };

      return { ok: true, payment_method: normalized, raw: json };
    } catch (err) {
      console.warn('saveOpenpayCardOnServer exception', err);
      return { ok: false, error: err, raw: null };
    }
  };

  // -----------------------
  // Payment with token (nuevo)
  // -----------------------
  const processPaymentWithToken = async ({ openpay_source_id, device_session_id, holder_name, customer_email }) => {
    setSaveCardModalVisible(false);
    setProcessing(true);

    const monto_subtotal_to_send = (monto_subtotal !== null) ? Number(monto_subtotal) : safeNum(params.totalSinPropinaFinal ?? params.total ?? 0);
    const monto_propina_to_send = (monto_propina !== null) ? Number(monto_propina) : safeNum(params.tipAmount ?? 0);

    const items_pagados = Array.isArray(items) ? items.map(it => ({
      codigo_item: String(it.codigo_item ?? it.codigo ?? it.code ?? it.original_line_id ?? it.id ?? ''),
      nombre_item: it.nombre_item ?? it.nombre ?? it.name ?? it.title ?? '',
      cantidad: Number(it.cantidad ?? it.qty ?? it.quantity ?? 1) || 1,
      precio_unitario: Number(it.precio_unitario ?? it.unitPrice ?? it.price ?? it.precio_item ?? it.precio ?? 0) || 0,
    })) : [];

    const body = {
      sucursal_id,
      gateway: 'openpay',
      environment,
      monto_subtotal: monto_subtotal_to_send,
      monto_propina: monto_propina_to_send,
      payment_method_id,
      moneda,
      usuario_app_id: usuario_app_id ?? params.userEmail ?? usuario_app_id ?? '',
      redirect_url: "https://www.tab-track.com/openpay/return",
      customer_data: {
        email: customer_email || params.userEmail || userEmail || '',
        nombre: holder_name || params.userFullname || userFullname || '',
      },
      metadata: {
        mesa_id: mesa_id ?? null,
        venta_id: sale_id ?? '',
        openpay_source_id,
        device_session_id,
        source: 'elements',
      },
      mesa_id: mesa_id ?? null,
      items_pagados,
      flow: 'elements'
    };

    console.warn('[DEBUG] processPaymentWithToken - body (pay token):', { openpay_source_id, device_session_id });

    try {
      const url = buildTransactionUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
        body: JSON.stringify(body),
      });

      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }
      console.warn('[DEBUG] processPaymentWithToken - create transaction response:', json);

      if (!res.ok) {
        const serverMsg = json && (json.error || json.message) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        setProcessing(false);
        showPaymentError('Error creando transacción', String(serverMsg), json ? JSON.stringify(json) : null);
        return;
      }

      const transactionId = json?.transaction_id ?? json?.data?.transaction_id ?? json?.transactionId ?? null;
      if (!transactionId) {
        setProcessing(false);
        showPaymentError('Error', 'El servidor no devolvió transaction_id. Revisa la respuesta en logs.', json ? JSON.stringify(json) : null);
        return;
      }

      try { await AsyncStorage.setItem(lastTransactionKeyForSale(sale_id), String(transactionId)); } catch (e) {}

      const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
      if (checkoutUrl) { try { Linking.openURL(checkoutUrl); } catch (e) { console.warn('open checkoutUrl failed', e); } }

      const pollResult = await pollSplitsUntilPaid(transactionId, 120000, 3000);
      setProcessing(false);
      if (pollResult.ok) {
        try {
          navigation.navigate('ConfirmacionPago', { transactionId, sale_id, amount: displayAmountFinal });
        } catch (e) { console.warn('navigate ConfirmacionPago failed', e); }
        return;
      } else {
        showPaymentError('Pendiente', 'Transacción creada pero no se confirmó el pago inmediatamente.', pollResult ? JSON.stringify(pollResult) : null);
        return;
      }
    } catch (err) {
      console.warn('Error creando transaccion con token', err);
      setProcessing(false);
      showPaymentError('Error', 'No se pudo crear la transacción. Revisa la conexión y la URL.', err ? JSON.stringify(err) : null);
    }
  };

  // -----------------------
  // Payment with saved card
  // -----------------------
  const processPaymentWithSavedCard = async (savedCard) => {
    setProcessing(true);
    const monto_subtotal_to_send = (monto_subtotal !== null) ? Number(monto_subtotal) : safeNum(params.totalSinPropinaFinal ?? params.total ?? 0);
    const monto_propina_to_send = (monto_propina !== null) ? Number(monto_propina) : safeNum(params.tipAmount ?? 0);
    const items_pagados = Array.isArray(items) ? items.map(it => ({
      codigo_item: String(it.codigo_item ?? it.codigo ?? it.code ?? it.original_line_id ?? it.id ?? ''),
      nombre_item: it.nombre_item ?? it.nombre ?? it.name ?? it.title ?? '',
      cantidad: Number(it.cantidad ?? it.qty ?? it.quantity ?? 1) || 1,
      precio_unitario: Number(it.precio_unitario ?? it.unitPrice ?? it.price ?? it.precio_item ?? it.precio ?? 0) || 0,
    })) : [];

    const usuario_app_id_to_send = usuario_app_id ?? params.userEmail ?? '';

    const body = {
      sucursal_id,
      gateway: 'openpay',
      environment,
      monto_subtotal: monto_subtotal_to_send,
      monto_propina: monto_propina_to_send,
      payment_method_id,
      moneda,
      usuario_app_id: usuario_app_id_to_send,
      redirect_url: "https://www.tab-track.com/openpay/return",
      customer_data: {},
      metadata: {
        mesa_id: mesa_id ?? null,
        venta_id: sale_id ?? '',
        device_session_id: deviceSessionId ?? null,
        source: 'elements'
      },
      mesa_id: mesa_id ?? null,
      items_pagados,
      flow: 'elements'
    };

    try {
      const storedUuid = await AsyncStorage.getItem('user_usuario_app_id');
      if (storedUuid) body.usuario_app_uuid = storedUuid;
      else if (usuario_app_id) body.usuario_app_uuid = usuario_app_id;
    } catch (e) { /* ignore */ }

    body.mobile_payment_method_id = savedCard?.id ?? savedCard?.mobile_payment_method_id ?? null;

    console.warn('[DEBUG] processPaymentWithSavedCard - body:', body);

    try {
      const url = buildTransactionUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
        body: JSON.stringify(body),
      });

      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }
      console.warn('[DEBUG] processPaymentWithSavedCard - create transaction response:', json);

      if (!res.ok) {
        const serverMsg = json && (json.error || json.message) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        setProcessing(false);
        showPaymentError('Error creando transacción', String(serverMsg), json ? JSON.stringify(json) : null);
        return;
      }

      const transactionId = json?.transaction_id ?? json?.data?.transaction_id ?? json?.transactionId ?? null;
      if (!transactionId) {
        setProcessing(false);
        showPaymentError('Error', 'El servidor no devolvió transaction_id. Revisa la respuesta en logs.', json ? JSON.stringify(json) : null);
        return;
      }

      try { await AsyncStorage.setItem(lastTransactionKeyForSale(sale_id), String(transactionId)); } catch (e) {}

      const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
      if (checkoutUrl) { try { Linking.openURL(checkoutUrl); } catch (e) { console.warn('open checkoutUrl failed', e); } }

      const pollResult = await pollSplitsUntilPaid(transactionId, 120000, 3000);
      setProcessing(false);
      if (pollResult.ok) {
        try {
          navigation.navigate('ConfirmacionPago', { transactionId, sale_id, amount: displayAmountFinal });
        } catch (e) { console.warn('navigate ConfirmacionPago failed', e); }
        return;
      } else {
        showPaymentError('Pendiente', 'Pago con tarjeta guardada: el servidor aún no refleja la venta como pagada.', pollResult ? JSON.stringify(pollResult) : null);
        return;
      }
    } catch (err) {
      console.warn('processPaymentWithSavedCard exception', err);
      setProcessing(false);
      showPaymentError('Error', 'No se pudo crear la transacción con tarjeta guardada.', err ? JSON.stringify(err) : null);
    }
  };

  // -----------------------
  // Save & Pay handler
  // -----------------------
  const handleSaveAndPayWithOpenpayToken = async () => {
    if (!pendingOpenpayToken) {
      Alert.alert('Error', 'No hay token disponible para guardar.');
      setSaveCardModalVisible(false);
      return;
    }
    setSavingCard(true);
    try {
      const { openpay_source_id: token_id, device_session_id } = pendingOpenpayToken;

      console.warn('[SaveAndPay] token_save:', token_id, 'device:', device_session_id, 'set_preferred=', savePreferred);
      const saveResp = await saveOpenpayCardOnServer({ token_id, device_session_id, set_preferred: savePreferred });
      if (!saveResp.ok) {
        console.warn('[SaveAndPay] saveOpenpayCardOnServer failed', saveResp.error, saveResp.raw);
        Alert.alert('Advertencia', 'No se pudo guardar la tarjeta. Se intentará continuar con el pago sin guardar.');
        await processPaymentWithToken({ openpay_source_id: token_id, device_session_id, holder_name: pendingOpenpayToken.holder_name, customer_email: pendingOpenpayToken.customer_email });
        setPendingOpenpayToken(null);
        return;
      }

      console.warn('[SaveAndPay] tarjeta guardada correctamente -> solicitar NUEVO token para pagar (token distinto requerido por ti). saved pm=', saveResp.payment_method);
      // solicitar un segundo token distinto para el pago
      setAwaitingNewTokenForPayment(true);

      const cardDataToRequest = lastCardInput || {
        holder_name: holder.trim(),
        card_number: (cardNum || '').replace(/\s/g, ''),
        expiration_month: mm,
        expiration_year: yy,
        cvv2: cvv,
        email,
      };

      console.warn('[SaveAndPay] requesting new token_for_payment (masked): holder=', cardDataToRequest.holder_name, 'last4=', (cardDataToRequest.card_number || '').slice(-4));
      try {
        webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'create_token', cardData: cardDataToRequest }));
      } catch (e) {
        console.warn('[SaveAndPay] failed to postMessage create_token for new token', e);
        setAwaitingNewTokenForPayment(false);
        await processPaymentWithToken({ openpay_source_id: token_id, device_session_id, holder_name: pendingOpenpayToken.holder_name, customer_email: pendingOpenpayToken.customer_email });
      }
      setPendingOpenpayToken(null);
    } catch (err) {
      console.warn('handleSaveAndPayWithOpenpayToken exception', err);
      Alert.alert('Error', 'Ocurrió un error guardando la tarjeta. Se intentará continuar con el pago sin guardar.');
      if (pendingOpenpayToken) {
        const { openpay_source_id: token_id, device_session_id } = pendingOpenpayToken;
        await processPaymentWithToken({ openpay_source_id: token_id, device_session_id, holder_name: pendingOpenpayToken.holder_name, customer_email: pendingOpenpayToken.customer_email });
      }
    } finally {
      setSavingCard(false);
      setPendingOpenpayToken(null);
    }
  };

  const handleContinueWithoutSavingOpenpayToken = async () => {
    setSaveCardModalVisible(false);
    if (!pendingOpenpayToken) {
      Alert.alert('Error', 'No hay token disponible.');
      return;
    }
    const { openpay_source_id: token_id, device_session_id, holder_name, customer_email } = pendingOpenpayToken;
    setPendingOpenpayToken(null);
    await processPaymentWithToken({ openpay_source_id: token_id, device_session_id, holder_name, customer_email });
  };

  // -----------------------
  // WebView html (igual)
  // -----------------------
  const html = `
<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body>
<script src="https://js.openpay.mx/openpay.v1.min.js"></script>
<script src="https://js.openpay.mx/openpay-data.v1.min.js"></script>
<script>
  const post = (o)=>{ try{ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }catch(e){} };
  try{ post({ type:'inpage_ready' }); }catch(e){}
  function createToken(cardData){
    if (typeof OpenPay === 'undefined'){ post({ type:'error', message:'OpenPay SDK not loaded' }); return; }
    try {
      OpenPay.token.create(cardData,
        function(resp){
          post({ type:'openpay_token', token: resp.data.id, device_session_id: window._deviceSessionId || '', holder_name: cardData.holder_name || '', email: cardData.email || '' });
        },
        function(err){
          const msg = (err && err.data && err.data.description) ? err.data.description : JSON.stringify(err);
          post({ type:'error', message: msg });
        }
      );
    } catch(e){ post({ type:'error', message: String(e) }); }
  }
  function init(payload){
    try{
      OpenPay.setId(payload.openpay_merchant_id || '');
      OpenPay.setApiKey(payload.openpay_public_api_key || '');
      OpenPay.setSandboxMode(Boolean(payload.environment === 'sandbox'));
      try {
        const dev = OpenPay.deviceData.setup('card-form','dev');
        window._deviceSessionId = dev;
        post({ type:'device_session_created', device_session_id: dev});
      } catch(e) { post({ type:'error', message: String(e) }); }
    } catch(e) { post({ type:'error', message:String(e) }); }
  }
  function handleMessage(raw){
    try {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!msg || !msg.type) return;
      if (msg.type === 'init') return init(msg.payload || {});
      if (msg.type === 'create_token') return createToken(msg.cardData || {});
    } catch(e){ post({ type:'error', message:String(e) }); }
  }
  document.addEventListener('message',(e)=>handleMessage(e.data));
  window.addEventListener('message',(e)=>handleMessage(e.data));
</script>
</body>
</html>
  `;

  // -----------------------
  // Init OpenPay
  // -----------------------
  useEffect(() => {
    let mounted = true;
    (async function fetchCredsAndSendInit() {
      const subtotal = Number(monto_subtotal ?? params.monto_subtotal ?? 0) || 0;
      const prop = Number(monto_propina ?? params.monto_propina ?? 0) || 0;
      const computedDisplay = Number((displayAmount ?? (subtotal + prop)).toFixed(2));

      if (param_merchant_id && param_public_api_key) {
        const payload = { openpay_merchant_id: param_merchant_id, openpay_public_api_key: param_public_api_key, environment };
        setInitPayload({ ...payload, displayAmount: computedDisplay });
        if (webReady) {
          try { webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'init', payload })); } catch (e) { console.warn(e); }
        }
        setLoading(false);
        return;
      }

      try {
        const hostBase = (api_host || 'https://127.0.0.1').replace(/\/$/, '');
        const res = await fetch(`${hostBase}/api/openpay-credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
          body: JSON.stringify({ sucursal_id }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(()=>null);
          throw new Error(`Error ${res.status} obteniendo credenciales: ${txt || res.statusText}`);
        }
        const json = await res.json();
        const mid = json.openpay_merchant_id || json.merchant_id || '';
        const pub = json.openpay_public_api_key || json.public_api_key || json.publicKey || '';
        const envResp = json.environment || environment || 'sandbox';
        if (!mid || !pub) throw new Error('Credenciales incompletas devueltas por servidor.');
        if (!mounted) return;
        const payload = { openpay_merchant_id: mid, openpay_public_api_key: pub, environment: envResp };
        setInitPayload({ ...payload, displayAmount: computedDisplay });
        if (webReady) {
          try { webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'init', payload })); } catch (e) { console.warn(e); }
        }
        setLoading(false);
      } catch (err) {
        console.warn('fetchCredsAndSendInit error', err);
        showPaymentError('Error', 'No se pudieron obtener las credenciales de OpenPay. Revisa servidor/configuración.', err ? String(err) : null);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [webReady]);

  useEffect(() => {
    if (webReady && initPayload) {
      try { webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'init', payload: initPayload })); } catch (e) { console.warn(e); }
    }
  }, [webReady, initPayload]);

  // -----------------------
  // Request token (y guardo lastCardInput)
  // -----------------------
  const requestTokenFromWebView = (cardData) => {
    try {
      setLastCardInput(cardData);
      console.log('[requestTokenFromWebView] create_token request (masked): holder=', cardData.holder_name, 'last4=', (cardData.card_number||'').slice(-4));
      webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'create_token', cardData }));
    } catch (e) {
      console.warn('postMessage create_token failed', e);
      showPaymentError('Error', 'No se pudo iniciar la creación del token.', e ? String(e) : null);
      setProcessing(false);
    }
  };

  // -----------------------
  // Fetch saved cards (now accepts openModal flag; default behavior unchanged)
  // -----------------------
  const fetchSavedCards = async (openModal = true) => {
    if (!sucursal_id) {
      Alert.alert('Error', 'Falta sucursal_id');
      return;
    }
    setLoadingSavedCards(true);
    try {
      let usuarioAppUuid = null;
      try { usuarioAppUuid = await AsyncStorage.getItem('user_usuario_app_id'); } catch (e) { console.warn('read user_usuario_app_id failed', e); }
      usuarioAppUuid = usuarioAppUuid || usuario_app_id || '';

      const hostBase = (api_host || 'https://127.0.0.1').replace(/\/$/, '');
      const url = `${hostBase}/api/mobileapp/sucursales/${encodeURIComponent(sucursal_id)}/payment-methods?gateway=openpay&environment=${encodeURIComponent(environment)}&usuario_app_id=${encodeURIComponent(usuarioAppUuid)}`;
      const idKey = genIdempotencyKey();

      console.warn('[fetchSavedCards] GET ->', url, 'Idempotency-Key:', idKey);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idKey, ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
      });
      const json = await res.json().catch(() => null);
      console.warn('[fetchSavedCards] status=', res.status, 'json=', json);

      if (!res.ok) {
        throw new Error(json && (json.error || json.message) ? (json.error || json.message) : `Error ${res.status}`);
      }

      const pmArr = Array.isArray(json.payment_methods) ? json.payment_methods : (Array.isArray(json.data) ? json.data : []);
      const normalized = pmArr.map(pm => ({
        id: pm.id,
        brand: pm.brand,
        last4: pm.last4,
        exp_month: pm.exp_month,
        exp_year: pm.exp_year,
        external_id: pm.external_payment_method_id ?? pm.external_id,
        is_preferred: pm.is_preferred ?? false,
        raw: pm,
      }));
      setSavedCards(normalized);
      // sólo abrir modal si se pidió explícitamente (comportamiento previo)
      if (openModal) setSavedCardsModalVisible(true);
    } catch (err) {
      console.warn('fetchSavedCards exception', err);
      Alert.alert('Error', `No se pudo obtener las tarjetas guardadas: ${String(err)}`);
    } finally {
      setLoadingSavedCards(false);
    }
  };

  // -----------------------
  // Form validation + pay
  // -----------------------
  const formatCardNumber = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const validateNativeForm = () => {
    if (!holder || holder.trim().length < 2) return 'Ingresa el nombre en la tarjeta';
    const digits = (cardNum || '').replace(/\D/g, '');
    if (selectedSavedCard) return null; // si usa tarjeta guardada no validar campos de tarjeta
    if (digits.length < 13 || digits.length > 19) return 'Número de tarjeta inválido';
    if (!/^\d{2}$/.test(mm)) return 'Mes inválido';
    if (!/^\d{2}$/.test(yy)) return 'Año inválido';
    if (!/^\d{3,4}$/.test(cvv)) return 'CVV inválido';
    return null;
  };

  const onPayPress = async () => {
    const v = validateNativeForm();
    if (v) { Alert.alert('Atención', v); return; }

    if (selectedSavedCard) {
      console.warn('[onPayPress] pago con tarjeta guardada, mobilePaymentMethodId=', selectedSavedCard.id);
      if (!deviceSessionId && initPayload && webReady) {
        try { webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'init', payload: initPayload })); } catch (e) { console.warn('init postMessage failed', e); }
      }
      await processPaymentWithSavedCard(selectedSavedCard);
      return;
    }

    setProcessing(true);
    const cardData = {
      holder_name: holder.trim(),
      card_number: (cardNum || '').replace(/\s/g, ''),
      expiration_month: mm,
      expiration_year: yy,
      cvv2: cvv,
      email,
    };
    requestTokenFromWebView(cardData);
  };

  const onSelectSavedCard = (cardObj) => {
    console.warn('[onSelectSavedCard] selected', cardObj);
    setSelectedSavedCard(cardObj);
    setCardNum(`${(cardObj.brand || '').toUpperCase()} •••• ${cardObj.last4 ?? ''}`);
    setShowCardFields(false);
    setSavedCardsModalVisible(false);
  };

  const onUseAnotherCard = () => {
    setSelectedSavedCard(null);
    setCardNum('');
    setMm('');
    setYy('');
    setCvv('');
    setShowCardFields(true);
    setSavedCardsModalVisible(false);
  };

  const onCardNumChange = (t) => {
    if (selectedSavedCard) {
      setSelectedSavedCard(null);
      setShowCardFields(true);
    }
    setCardNum(formatCardNumber(t));
  };

  const nativeLogoSource = logoUrl ? { uri: logoUrl } : DEFAULT_LOGO;
  const restaurantSrc = restaurantImage ? { uri: restaurantImage } : DEFAULT_RESTAURANT;
  const currentDateText = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

  // -----------------------
  // DYNAMIC modal height calculation (adjust to content)
  // -----------------------
  // approximate heights (px)
  const ITEM_ROW_HEIGHT = 72; // estimated per tarjeta row (padding + text)
  const MODAL_HEADER_HEIGHT = 72; // title + subtitle area
  const MODAL_FOOTER_HEIGHT = 72; // footer buttons area
  const cardCount = (Array.isArray(savedCards) && savedCards.length > 0) ? savedCards.length : (loadingSavedCards ? 1 : 0);
  const contentNeeded = Math.max(120, cardCount * ITEM_ROW_HEIGHT);
  const computedModalHeight = Math.min(maxModalHeight, MODAL_HEADER_HEIGHT + contentNeeded + MODAL_FOOTER_HEIGHT);

  // -----------------------
  // NEW: confirm delete saved card (open modal)
  const confirmDeleteSavedCard = (card) => {
    setCardToDelete(card);
    setDeleteConfirmVisible(true);
  };

  // NEW: show toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setToastVisible(false);
          setToastMessage('');
        });
      }, 2000);
    });
  };

  // NEW: perform delete saved card (DELETE request)
  const performDeleteSavedCard = async () => {
    if (!cardToDelete) return;
    setDeletingCard(true);

    const host = (String(api_host || 'https://127.0.0.1')).replace(/\/$/, '');
    const cardId = cardToDelete.id ?? cardToDelete.external_id ?? cardToDelete.external_payment_method_id ?? cardToDelete.mobile_payment_method_id;
    const url = `${host}/api/mobileapp/sucursales/${encodeURIComponent(sucursal_id)}/payment-methods/${encodeURIComponent(cardId)}?gateway=openpay&environment=${encodeURIComponent(environment)}`;

    let usuarioAppUuid = null;
    try {
      usuarioAppUuid = await AsyncStorage.getItem('user_usuario_app_id');
    } catch (e) {
      console.warn('performDeleteSavedCard - read user_usuario_app_id failed', e);
    }
    usuarioAppUuid = usuarioAppUuid || usuario_app_id || '';

    const idKey = genIdempotencyKey();

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idKey,
          ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}),
        },
        body: JSON.stringify({ usuario_app_id: usuarioAppUuid }),
      });

      let json = null;
      try { json = await res.json().catch(() => null); } catch (e) {}

      if (!res.ok) {
        console.warn('performDeleteSavedCard - server error', res.status, json);
        Alert.alert('Error', `No se pudo eliminar la tarjeta (${res.status}).`);
        setDeletingCard(false);
        setDeleteConfirmVisible(false);
        setCardToDelete(null);
        return;
      }

      // éxito: actualizar lista en UI
      setSavedCards((prev) => (Array.isArray(prev) ? prev.filter((c) => String(c.id) !== String(cardToDelete.id)) : []));
      // cerrar modal de confirmación
      setDeleteConfirmVisible(false);
      setCardToDelete(null);
      // mostrar toast
      showToast('Tarjeta eliminada correctamente');
    } catch (err) {
      console.warn('performDeleteSavedCard exception', err);
      Alert.alert('Error', 'Ocurrió un error al eliminar la tarjeta.');
      setDeleteConfirmVisible(false);
      setCardToDelete(null);
    } finally {
      setDeletingCard(false);
    }
  };

  // -----------------------
  // Load saved cards on mount and refresh on focus (silent: don't auto-open modal)
  // -----------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchSavedCards(false); // silent load: no modal open
      } catch (e) {
        console.warn('silent fetchSavedCards error', e);
      }
    })();

    const unsub = navigation.addListener('focus', () => {
      fetchSavedCards(false).catch(e => console.warn('refresh saved cards on focus error', e));
    });

    return () => {
      try { if (unsub && typeof unsub === 'function') unsub(); } catch (e) {}
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, sucursal_id]);

  // -----------------------
  // Render
  // -----------------------
  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.nativeHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0b58ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tu cuenta</Text>
        <Text style={styles.headerDate}>{currentDateText}</Text>
      </View>

      <LinearGradient
        colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[ styles.gradientHeader, { height: GRADIENT_HEIGHT, paddingHorizontal: H_PADDING, borderBottomRightRadius: 28, borderBottomLeftRadius: 0 }]}>
        <View style={styles.gradientInner}>
          <View style={[styles.gradientLeftColumn]}>
            <Image source={nativeLogoSource} style={[styles.gradientLogo, { width: LOGO_W }]} resizeMode="contain" />
            <Image source={restaurantSrc} style={[styles.gradientRestaurant, { width: RESTAURANT_W, height: RESTAURANT_W, marginTop: 20 }]} resizeMode="cover" />
          </View>

          <View style={styles.gradientRight}>
            <Text style={styles.gradientSmall}>Total</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={[styles.gradientTotal, { fontSize: Math.max(22, Math.round(winW * 0.07)) }]}>{formatAmount(displayAmountFinal)}</Text>
              <Text style={styles.gradientCurrency}> {moneda ?? 'MXN'}</Text>
            </View>
            <Text style={styles.gradientDetail}>Detalle</Text>
            <Text style={styles.gradientCount}>{Array.isArray(items) ? items.length : 0} {Array.isArray(items) && items.length === 1 ? 'item' : 'items'}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.mainWrap, { paddingHorizontal: H_PADDING }]}>
        <View style={styles.card}>
          <View style={{ height: 14 }} />

          <View style={[styles.form, { padding: Math.max(12, Math.round(winW * 0.03)) }]}>
            <Text style={styles.formLabel}>Pagar con tarjeta</Text>

            {/* Logos area: ahora con imágenes oficiales */}
            <View style={styles.logosRow}>
              <Image source={LOGO_OPENPAY} style={styles.brandLogo} resizeMode="contain" />
              <Image source={LOGO_PAYNET} style={styles.brandLogo} resizeMode="contain" />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre en la tarjeta"
                value={holder}
                onChangeText={setHolder}
                returnKeyType="next"
                placeholderTextColor="#96a0b8"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="card-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Número de tarjeta"
                value={cardNum}
                onChangeText={onCardNumChange}
                keyboardType="number-pad"
                maxLength={23}
                placeholderTextColor="#96a0b8"
              />
              {/* SOLO mostrar el texto si ya hay tarjetas cargadas */}
              { Array.isArray(savedCards) && savedCards.length > 0 ? (
                <TouchableOpacity onPress={() => fetchSavedCards(true)} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                  <Text style={{ color: '#0b58ff', fontWeight: '700' }}>Usar tarjeta guardada</Text>
                </TouchableOpacity>
              ) : null }
            </View>

            {showCardFields && (
              <View style={styles.rowSmall}>
                <View style={styles.inputWrapSmall}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" style={styles.inputIconSmall} />
                  <TextInput style={styles.inputSmall} placeholder="MM" value={mm} onChangeText={(t)=>setMm(t.replace(/\D/g,'').slice(0,2))} keyboardType="number-pad" placeholderTextColor="#96a0b8" />
                </View>

                <View style={styles.inputWrapSmall}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" style={styles.inputIconSmall} />
                  <TextInput style={styles.inputSmall} placeholder="AA" value={yy} onChangeText={(t)=>setYy(t.replace(/\D/g,'').slice(0,2))} keyboardType="number-pad" placeholderTextColor="#96a0b8" />
                </View>

                <View style={styles.inputWrapSmall}>
                  <Ionicons name="keypad-outline" size={16} color="#6b7280" style={styles.inputIconSmall} />
                  <TextInput style={styles.inputSmall} placeholder="CVV" value={cvv} onChangeText={(t)=>setCvv(t.replace(/\D/g,'').slice(0,4))} keyboardType="number-pad" placeholderTextColor="#96a0b8" />
                </View>
              </View>
            )}

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#96a0b8"
              />
            </View>
          </View>

          <View style={{ marginTop: PAY_BTN_MARGIN_TOP, alignItems: 'center' }}>
            <TouchableOpacity style={[styles.payBtn, { width: Math.min(560, winW - H_PADDING * 2) }]} onPress={onPayPress} activeOpacity={0.9} disabled={processing}>
              {processing ? <ActivityIndicator color="#fff" style={{ marginRight: 10 }} /> : <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />}
              <Text style={styles.payBtnText}>{processing ? 'Procesando…' : 'Pagar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* WebView hidden */}
      <View style={{ height: 0, width: 0, opacity: 0 }}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={handleWebMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          style={{ flex: 1 }}
        />
      </View>

      {/* Modal: Guardar tarjeta (responsive & compact - MATCHES stripe modal style) */}
      <Modal visible={saveCardModalVisible} transparent animationType="fade" onRequestClose={() => { if (!savingCard) setSaveCardModalVisible(false); }}>
        <View style={styles.autoModalBackdrop}>
          <View style={[styles.autoModalBox, { width: Math.min(360, winW - 48), flexDirection: 'column', padding: 18 }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0b1220', marginBottom: 8 }}>¿Deseas guardar esta tarjeta?</Text>
            <Text style={{ fontSize: 13, color: '#334155', marginBottom: 14 }}>Puedes guardar la tarjeta en OpenPay para futuros pagos. Elige una opción:</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <TouchableOpacity onPress={handleContinueWithoutSavingOpenpayToken} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e6eefb', alignItems: 'center', backgroundColor: '#fff' }} disabled={savingCard}>
                <Text style={{ fontWeight: '700', color: '#0b58ff' }}>Continuar sin guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSaveAndPayWithOpenpayToken} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#0b58ff' }} disabled={savingCard}>
                {savingCard ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '800', color: '#fff' }}>Guardar y pagar</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { if (!savingCard) setSaveCardModalVisible(false); }} style={{ marginTop: 12, alignItems: 'center' }} disabled={savingCard}>
              <Text style={{ color: '#6b7280' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Tarjetas guardadas (responsive & compact; altura dinámica + scroll interno) */}
      <Modal visible={savedCardsModalVisible} transparent animationType="fade" onRequestClose={() => setSavedCardsModalVisible(false)}>
        <View style={styles.autoModalBackdrop}>
          <View style={[styles.savedCardsModalBox, { width: modalWidth, height: computedModalHeight }]}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderColor: '#eef4ff' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0b1220' }}>Tarjetas guardadas</Text>
              <Text style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>Toca una tarjeta para seleccionarla o pulsa "Usar otra".</Text>
            </View>

            <View style={{ padding: 8, flex: 1 }}>
              {loadingSavedCards ? (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <FlatList
                  data={savedCards}
                  keyExtractor={(i) => String(i.id ?? i.external_id ?? Math.random())}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  renderItem={({ item }) => (
                    <View style={styles.savedCardRow}>
                      <TouchableOpacity onPress={() => onSelectSavedCard(item)} style={{ flex: 1 }}>
                        <View>
                          <Text style={{ fontWeight: '800', color: '#0b1220' }}>{(item.brand || '').toUpperCase()} • **** {item.last4 ?? ''}</Text>
                          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Vence: {String(item.exp_month || '--')}/{String(item.exp_year || '--')} {item.is_preferred ? ' • Preferida' : ''}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={{ alignItems: 'flex-end' }}>
                        {/* delete button */}
                        <TouchableOpacity onPress={() => confirmDeleteSavedCard(item)} style={{ padding: 6 }}>
                          <Ionicons name="remove-circle-outline" size={22} color="#ef4444" />
                        </TouchableOpacity>

                        <Text style={{ fontSize: 12, color: '#64748b' }}>{item.status ?? ''}</Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={() => (
                    <View style={{ padding: 12 }}>
                      <Text style={{ color: '#6b7280' }}>No hay tarjetas guardadas.</Text>
                    </View>
                  )}
                />
              )}
            </View>

            <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#eef4ff', flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onUseAnotherCard} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e6eefb', backgroundColor: '#fff' }}>
                <Text style={{ fontWeight: '700', color: '#0b58ff' }}>Usar otra</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSavedCardsModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#0b58ff' }}>
                <Text style={{ fontWeight: '800', color: '#fff' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal confirmación eliminar tarjeta */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => { if (!deletingCard) setDeleteConfirmVisible(false); }}>
        <View style={styles.autoModalBackdrop}>
          <View style={[styles.autoModalBox, { width: Math.min(360, winW - 48), flexDirection: 'column', padding: 18 }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0b1220', marginBottom: 8 }}>Eliminar tarjeta</Text>
            <Text style={{ fontSize: 13, color: '#334155', marginBottom: 14 }}>
              ¿Estás seguro que deseas eliminar esta tarjeta? Esta acción no se puede deshacer.
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <TouchableOpacity onPress={() => { if (!deletingCard) setDeleteConfirmVisible(false); setCardToDelete(null); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e6eefb', alignItems: 'center', backgroundColor: '#fff' }} disabled={deletingCard}>
                <Text style={{ fontWeight: '700', color: '#0b58ff' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={performDeleteSavedCard} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#ef4444' }} disabled={deletingCard}>
                {deletingCard ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '800', color: '#fff' }}>Sí, eliminar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#0b58ff" style={{ marginRight: 12 }} />
            <Text style={styles.processingText}>Procesando pago…</Text>
          </View>
        </View>
      )}

      {/* Toast estilizado (nuevo) */}
      {toastVisible && (
        <Animated.View pointerEvents="none" style={[styles.toastBox, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f6f9' },

  nativeHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 6, width: 44 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b58ff', textAlign: 'center', flex: 1 },
  headerDate: { fontSize: 12, color: '#6b7280', width: 160, textAlign: 'right' },

  gradientHeader: { paddingVertical: 18 },
  gradientInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  gradientLeftColumn: { flexDirection: 'column', alignItems: 'flex-start' },
  gradientLogo: { height: 36, tintColor: '#fff' },
  gradientRestaurant: { borderRadius: 12, marginLeft: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)' },

  gradientRight: { alignItems: 'flex-end' },
  gradientSmall: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  gradientTotal: { color: '#fff', fontSize: 30, fontWeight: '900' },
  gradientCurrency: { color: '#fff', fontSize: 14, marginLeft: 6, marginBottom: 3 },
  gradientDetail: { color: 'rgba(255,255,255,0.9)', marginTop: 8, fontWeight: '700' },
  gradientCount: { color: 'rgba(255,255,255,0.95)', marginTop: 4 },

  mainWrap: { flex: 1 },
  card: { flex: 1, backgroundColor: 'transparent' },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b58ff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: 'center',
    shadowColor: '#0b58ff',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  form: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  formLabel: { fontSize: 16, fontWeight: '800', color: '#0b1220', marginBottom: 8 },

  // logosRow ahora con imágenes
  logosRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  brandLogo: { width: 64, height: 28, marginRight: 12 },

  logoChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#f2f8ff', borderRadius: 10, marginRight: 8 },
  logoChipText: { marginLeft: 6, fontWeight: '700', color: '#0b58ff' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eef4ff', paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 44, fontSize: 14, color: '#0b1220' },

  rowSmall: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inputWrapSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eef4ff', paddingHorizontal: 8, backgroundColor: '#fff', marginRight: 8 },
  inputIconSmall: { marginRight: 8 },
  inputSmall: { flex: 1, height: 44, fontSize: 14, color: "#000" },

  processingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2,6,23,0.18)' },
  processingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  processingText: { fontWeight: '700', fontSize: 16, color: '#0b1220' },

  /* --- estilos para los modales (estilo compacto como Stripe) --- */
  autoModalBackdrop: { flex: 1, backgroundColor: '#2E020617', justifyContent: 'center', alignItems: 'center', padding: 18 },
  autoModalBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 12, width: Math.min(360, 360), shadowColor: '#14000000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  autoModalTitle: { fontSize: 18, fontWeight: '800', color: '#0b1220' },
  autoModalMsg: { fontSize: 13, color: '#334155', marginTop: 6 },

  savedCardsModalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 20 },

  modalPrimaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#0b58ff' },
  modalSecondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eefb' },

  savedCardRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // NEW: toast styles
  toastBox: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 26, 205, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 160,
    maxWidth: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});