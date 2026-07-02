import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Modal,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  useWindowDimensions,
  FlatList,
  Animated,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StripeProvider, CardField, confirmPayment, confirmSetupIntent, initStripe } from '@stripe/stripe-react-native';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const DEFAULT_LOGO = require('../../assets/images/logo2.png');
const DEFAULT_RESTAURANT = require('../../assets/images/restaurante.jpeg');

 
const FIXED_STRIPE_PUBLISHABLE_KEY = 'pk_test_51RJbpaQaBqb9H2oSU1iY1gSZnZDsZmda42KJkP4d4Ta3RVyte3lcmyzC4WsoHfYJewiuOsef4tdeaIaqBUJbqtDL00K6T8g3bt';

export default function StripePruebas() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const {
    api_host = 'https://api.tab-track.com',
    api_token = '',
    sucursal_id = null,
    sale_id = null,
    restaurante_id = null,
    usuario_app_id = null,
    moneda = 'MXN',
    environment = 'sandbox',
    displayAmount = null,
    monto_subtotal = null,
    monto_propina = null,
    items = [],
    payment_method_id = 1,
    mesa_id = null,
    userFullname = '',
    userEmail = '',
    logoUrl = null,
    restaurantImage = null,
    pollingTimeoutMs = 120000,
    pollingIntervalMs = 3000,
  } = params;

  const AUTH_TOKEN = TOKEN || api_token || '';

  const getAuthHeaders = (extra = {}) => {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...extra,
    };
    if (AUTH_TOKEN && AUTH_TOKEN.trim()) {
      headers.Authorization = `Bearer ${AUTH_TOKEN}`;
    }
    return headers;
  };

  const stripePublishableKey = FIXED_STRIPE_PUBLISHABLE_KEY;

  const presetClientSecret =
    params.presetClientSecret ||
    params.client_secret ||
    params.payment_intent_client_secret ||
    params.paymentIntentClientSecret ||
    null;

  const primaryColor = '#0b58ff';
  const cardTextColor = '#0b1220';
  const cardPlaceholderColor = '#0b1220';

  const PADDING = Math.max(12, Math.round(winW * 0.04));
  const LOGO_W = Math.min(140, Math.round(winW * 0.32));
  const REST_W = Math.min(72, Math.round(winW * 0.16));
  const GRADIENT_H = Math.max(120, Math.round(winH * 0.22));
  const PAY_BTN_MARGIN = Math.max(18, Math.round(winH * 0.035));

  const [holder, setHolder] = useState(userFullname || '');
  const [email, setEmail] = useState(userEmail || '');
  const [cardDetails, setCardDetails] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // tarjetas guardadas
  const [savedCardsModalVisible, setSavedCardsModalVisible] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [usingSavedCard, setUsingSavedCard] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState(null);
  const [manualCardMode, setManualCardMode] = useState(false);
  const [quickPayLoading, setQuickPayLoading] = useState(false);
  const [quickPayNotice, setQuickPayNotice] = useState({
    visible: false,
    title: '',
    message: '',
    icon: 'card-outline',
  });

  // modal guardar tarjeta
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  // NUEVO: preferida switch para modal guardar tarjeta (Stripe)
  const [savePreferred, setSavePreferred] = useState(true);

  // focus del CardField -> para ocultar overlay "Usar tarjeta guardada"
  const [cardFieldFocused, setCardFieldFocused] = useState(false);

  // debug: última respuesta raw del endpoint de tarjetas
  const [lastSavedCardsResponse, setLastSavedCardsResponse] = useState(null);

  const pollingRef = useRef({ running: false, stopRequested: false, lastResult: null });

  // NUEVO: estado para confirmar eliminación
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [deletingCard, setDeletingCard] = useState(false);

  // NUEVO: toast state + animated opacity
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [stripeAccountId, setStripeAccountId] = useState(
    params.stripe_account_id || params.stripeAccountId || null
  );

  const subtotalNum = Number(monto_subtotal ?? params.monto_subtotal ?? 0) || 0;
  const propinaNum = Number(monto_propina ?? params.monto_propina ?? 0) || 0;
  const displayAmountFinal = Number((displayAmount ?? (subtotalNum + propinaNum)).toFixed(2));

  const formatAmount = (n) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  const buildTransactionUrl = () => `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/transacciones-pago`;
  const buildSetupIntentUrl = () =>
    `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/mobileapp/payment-methods/stripe/setup-intent`;
  const buildListPaymentMethodsUrl = (usuarioAppId) =>
    `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/mobileapp/payment-methods?gateway=stripe&usuario_app_id=${encodeURIComponent(usuarioAppId)}`;

  const genIdempotencyKey = (prefix = 'pm-setup') => {
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${suffix}`;
  };

  const extractStripeAccountId = (payload) =>
    payload?.stripe_account_id ||
    payload?.stripeAccountId ||
    payload?.stripe_account ||
    payload?.stripeAccount ||
    payload?.data?.stripe_account_id ||
    payload?.data?.stripeAccountId ||
    payload?.data?.stripe_account ||
    payload?.data?.stripeAccount ||
    null;

  const configureStripeForAccount = async (accountId = null) => {
    if (!stripePublishableKey || stripePublishableKey === 'pk_test_REPLACE_ME') {
      throw new Error('Falta configurar FIXED_STRIPE_PUBLISHABLE_KEY');
    }

    await initStripe({
      publishableKey: stripePublishableKey,
      stripeAccountId: accountId || undefined,
    });
  };

  const buildItemsPagados = () => {
    return Array.isArray(items)
      ? items.map((it) => ({
          codigo_item: String(it.codigo_item ?? it.codigo ?? it.code ?? it.original_line_id ?? it.id ?? ''),
          nombre_item: it.nombre_item ?? it.nombre ?? it.name ?? it.title ?? '',
          cantidad: Number(it.cantidad ?? it.qty ?? it.quantity ?? 1) || 1,
          precio_unitario: Number(it.precio_unitario ?? it.precio ?? it.precio_item ?? it.unitPrice ?? it.price ?? 0) || 0,
        }))
      : [];
  };

  const pollSplitsUntilPaid = async (transactionId, timeoutMs = pollingTimeoutMs, intervalMs = pollingIntervalMs) => {
    if (!transactionId) return { ok: false, reason: 'no_tx' };
    await ensureToken();
    const hostBase = (api_host || 'https://127.0.0.1').replace(/\/$/, '');
    const url = `${hostBase}/api/transacciones-pago/${encodeURIComponent(transactionId)}/splits`;
    const start = Date.now();
    pollingRef.current.running = true;
    pollingRef.current.stopRequested = false;
    pollingRef.current.lastResult = null;

    while (!pollingRef.current.stopRequested && Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);
          const splitsArr = Array.isArray(json?.splits) ? json.splits : [];
          const paidSplits = splitsArr.filter((s) => String(s.estado ?? '').toLowerCase() === 'paid');

          if (paidSplits.length > 0) {
            const paidCodes = paidSplits.map((s) => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
            pollingRef.current.running = false;
            return { ok: true, paidCodes, raw: json };
          }
          pollingRef.current.lastResult = { json };
        } else {
          console.warn('pollSplitsUntilPaid - http status', res.status);
          try {
            const errJson = await res.json().catch(() => null);
            pollingRef.current.lastResult = { status: res.status, body: errJson };
          } catch (e) {}
        }
      } catch (err) {
        console.warn('pollSplitsUntilPaid error', err);
        pollingRef.current.lastResult = { exception: String(err) };
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    pollingRef.current.running = false;
    return { ok: false, reason: 'timeout', last: pollingRef.current.lastResult ?? null };
  };

  const validateForm = () => {
    if (!holder || holder.trim().length < 2) return 'Ingresa el nombre en la tarjeta';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Ingresa un correo electrónico válido';
    if (!usingSavedCard && (!cardDetails || !cardDetails.complete)) return 'Ingresa los datos de la tarjeta';
    return null;
  };

  const validateBasePaymentData = () => {
    if (!holder || holder.trim().length < 2) return 'Ingresa el nombre en la tarjeta';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Ingresa un correo electrónico válido';
    return null;
  };

  const showPaymentError = (title, message, details = null) => {
    console.warn('Navigating to ErrorPago:', title, message, details);
    setProcessing(false);
    setLoading(false);
    navigation.navigate('ErrorPago', {
      title: String(title || 'Error'),
      message: String(message || 'Ocurrió un problema procesando el pago.'),
      details: details ? String(details) : null,
    });
  };

  const fetchSavedPaymentMethods = async ({ silent = false } = {}) => {
    await ensureToken();

    let usuarioAppIdToSend = null;
    try {
      usuarioAppIdToSend = await AsyncStorage.getItem('user_usuario_app_id');
    } catch (e) {
      console.warn('Error leyendo user_usuario_app_id desde AsyncStorage', e);
    }
    usuarioAppIdToSend = usuarioAppIdToSend || usuario_app_id || '';

    if (!usuarioAppIdToSend) {
      console.warn('fetchSavedPaymentMethods - no user_usuario_app_id disponible', { usuario_app_id });
      if (!silent) Alert.alert('Error', 'No hay user_usuario_app_id en AsyncStorage');
      setSavedCards([]);
      setLastSavedCardsResponse(null);
      return [];
    }

    setSavedCardsLoading(true);
    const url = buildListPaymentMethodsUrl(usuarioAppIdToSend);
    const idKey = genIdempotencyKey('pm-setup');

    console.warn('[DEBUG] fetchSavedPaymentMethods - url:', url);
    console.warn('[DEBUG] fetchSavedPaymentMethods - Idempotency-Key:', idKey);
    console.warn('[DEBUG] fetchSavedPaymentMethods - Authorization present:', !!AUTH_TOKEN);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idKey,
          ...getAuthHeaders(),
        },
      });

      console.warn('[DEBUG] fetchSavedPaymentMethods - httpStatus:', res.status);
      const json = await res.json().catch(() => null);
      console.warn('[DEBUG] fetchSavedPaymentMethods - response json:', json);

      setLastSavedCardsResponse(json ?? { status: res.status });

      if (!res.ok) {
        console.warn('fetchSavedPaymentMethods server error', res.status, json);
        if (!silent) Alert.alert('Error', `No se pudo obtener tarjetas guardadas (${res.status})`);
        setSavedCards([]);
        setSavedCardsLoading(false);
        return [];
      }

      const arr = Array.isArray(json?.payment_methods) ? json.payment_methods : [];

      if (!arr.length) {
        console.warn('fetchSavedPaymentMethods: payment_methods vacío o no existe', { url, responseJson: json });
      } else {
        console.warn('fetchSavedPaymentMethods: tarjetas encontradas', arr.length);
      }

      const normalized = arr.map((pm) => ({
        id: pm.id ?? pm.mobile_payment_method_id ?? null,
        external_payment_method_id: pm.external_payment_method_id ?? pm.external_id ?? pm.external_pm_id ?? null,
        brand: pm.brand ?? pm.card_brand ?? '',
        last4: pm.last4 ?? pm.card_last4 ?? '',
        exp_month: pm.exp_month ?? pm.card_exp_month ?? null,
        exp_year: pm.exp_year ?? pm.card_exp_year ?? null,
        is_preferred: pm.is_preferred ?? pm.preferred ?? false,
        status: pm.status ?? pm.state ?? '',
        raw: pm,
      }));

      setSavedCards(normalized);
      return normalized;
    } catch (err) {
      console.warn('fetchSavedPaymentMethods exception', err);
      if (!silent) Alert.alert('Error', 'No se pudo conectar al servidor de tarjetas guardadas.');
      setSavedCards([]);
      setLastSavedCardsResponse({ error: String(err) });
      return [];
    } finally {
      setSavedCardsLoading(false);
    }
  };

  const createSetupIntentOnServer = async () => {
    await ensureToken();
    const url = buildSetupIntentUrl();
    let storedUserAppIdLocal = null;
    try {
      storedUserAppIdLocal = await AsyncStorage.getItem('user_usuario_app_id');
    } catch (e) {
      console.warn('Error leyendo user_usuario_app_id desde AsyncStorage', e);
    }
    const usuarioAppIdToSend = storedUserAppIdLocal || usuario_app_id || '';
    if (!usuarioAppIdToSend) throw new Error('Falta usuario_app_id para crear setup intent');
    const body = { usuario_app_id: usuarioAppIdToSend, set_preferred: Boolean(savePreferred) };
    const idKey = genIdempotencyKey();
    console.warn('[DEBUG] createSetupIntentOnServer - url:', url, 'idKey:', idKey, 'body:', body);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idKey,
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);
      console.warn('[DEBUG] createSetupIntentOnServer - response status:', res.status, 'json:', json);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) ? (json.error || json.message) : `Error del servidor (${res.status})`);
      }

      const clientSecret =
        json?.client_secret ||
        json?.data?.client_secret ||
        json?.payment_intent_client_secret ||
        json?.paymentIntentClientSecret ||
        null;

      if (!clientSecret) throw new Error('El servidor no devolvió client_secret para SetupIntent');
      return { ok: true, clientSecret, stripeAccountId: extractStripeAccountId(json), raw: json };
    } catch (err) {
      console.warn('createSetupIntentOnServer exception', err);
      return { ok: false, error: err };
    }
  };

  const confirmAndSaveCard = async (setupClientSecret, setupStripeAccountId = null) => {
    if (!setupClientSecret) return { ok: false, error: new Error('No client_secret') };
    try {
      const accountIdToUse = setupStripeAccountId || stripeAccountId || null;
      await configureStripeForAccount(accountIdToUse);
      if (accountIdToUse) setStripeAccountId(accountIdToUse);

      const billingDetails = { email: email || '', name: holder || '' };
      const res = await confirmSetupIntent(setupClientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails },
      });
      if (res.error) return { ok: false, error: res.error };
      return { ok: true, setupIntent: res.setupIntent ?? null };
    } catch (err) {
      console.warn('confirmSetupIntent exception', err);
      return { ok: false, error: err };
    }
  };

  const processPaymentFlow = async (savedCardOverride = null) => {
    setProcessing(true);
    setLoading(true);

    await ensureToken();

    const monto_subtotal = Number(subtotalNum) || 0;
    const monto_propina = Number(propinaNum) || 0;
    const items_pagados = buildItemsPagados();
    const usuario_app_id_to_send = (email && String(email).trim()) || (usuario_app_id && String(usuario_app_id).trim()) || '';
    const savedCardForPayment = savedCardOverride || selectedSavedCard;
    const shouldUseSavedCard = Boolean(savedCardForPayment);

    const body = {
      sucursal_id,
      gateway: 'stripe',
      environment,
      monto_subtotal,
      monto_propina,
      moneda: moneda || 'MXN',
      payment_method_id,
      usuario_app_id: usuario_app_id_to_send,
      customer_data: { email: email || userEmail || '', nombre: holder || userFullname || '' },
      metadata: { mesa_id: mesa_id ?? null, venta_id: sale_id ?? '' },
      mesa_id: mesa_id ?? null,
      items_pagados,
      return_url: params.return_url ?? params.returnUrl ?? undefined,
      flow: 'elements',
    };

    if (shouldUseSavedCard) {
      try {
        const storedUuid = await AsyncStorage.getItem('user_usuario_app_id');
        if (storedUuid) body.usuario_app_uuid = storedUuid;
      } catch (e) {}
      body.mobile_payment_method_id = savedCardForPayment.id ?? savedCardForPayment.mobile_payment_method_id ?? null;
    }

    console.warn('[DEBUG] processPaymentFlow - body:', body);

    let json = null;
    let transactionId = null;

    try {
      const url = buildTransactionUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      try {
        json = await res.json();
      } catch (e) {
        json = null;
      }
      console.warn('[DEBUG] processPaymentFlow - create transaction response:', json);

      setLoading(false);

      if (!res.ok) {
        const serverMsg = json && (json.error || json.message) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        setProcessing(false);
        showPaymentError('Error creando transacción', String(serverMsg), json ? JSON.stringify(json) : null);
        return;
      }

      transactionId = json?.transaction_id ?? json?.data?.transaction_id ?? json?.transactionId ?? null;

      const clientSecretFromResponse =
        json?.client_secret ||
        json?.payment_intent_client_secret ||
        json?.data?.client_secret ||
        json?.paymentIntentClientSecret ||
        json?.clientSecret ||
        null;

      const clientSecret = clientSecretFromResponse || presetClientSecret || null;
      const stripeAccountIdFromResponse = extractStripeAccountId(json);
      const accountIdToUse = stripeAccountIdFromResponse || stripeAccountId || null;

      if (stripeAccountIdFromResponse) {
        setStripeAccountId(stripeAccountIdFromResponse);
      }

      if (!transactionId) {
        setProcessing(false);
        showPaymentError('Error', 'El servidor no devolvió transaction_id. Revisa la respuesta en consola.', json ? JSON.stringify(json) : null);
        return;
      }

      try {
        await AsyncStorage.setItem(`last_transaction_${sale_id}`, String(transactionId));
      } catch (e) {
        console.warn('save last tx failed', e);
      }

      const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
      if (checkoutUrl) {
        try {
          Linking.openURL(checkoutUrl);
        } catch (e) {
          console.warn('open checkoutUrl failed', e);
        }
      }

      if (shouldUseSavedCard) {
        console.warn('[DEBUG] usando tarjeta guardada -> saltando confirmPayment en cliente; iniciando pollSplitsUntilPaid');
        const pollResult = await pollSplitsUntilPaid(transactionId, pollingTimeoutMs, pollingIntervalMs);
        setProcessing(false);

        if (pollResult.ok) {
          try {
            navigation.navigate('ConfirmacionPago', {
              amount: displayAmountFinal,
              date: new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }),
            });
          } catch (e) {
            console.warn('navigate PaymentSuccessScreen failed', e);
          }
          return;
        } else {
          showPaymentError('Pendiente', 'Pago con tarjeta guardada: el servidor aún no refleja la venta como pagada.', pollResult ? JSON.stringify(pollResult) : null);
          return;
        }
      }

      if (clientSecret) {
        try {
          await configureStripeForAccount(accountIdToUse);

          const billingDetails = { email: email || '', name: holder || '' };
          const { error, paymentIntent } = await confirmPayment(clientSecret, {
            paymentMethodType: 'Card',
            paymentMethodData: { billingDetails },
          });

          if (error) {
            console.warn('confirmPayment error', error);
            setProcessing(false);
            showPaymentError('Pago no procesado', error.message ?? 'Error al confirmar el pago con Stripe.', error.code ? `code: ${error.code}` : JSON.stringify(error));
            return;
          }

          const status = (paymentIntent?.status ?? '').toLowerCase();
          console.log('paymentIntent status:', paymentIntent);

          if (status === 'succeeded' || status === 'requires_capture' || status === 'processing' || status === 'requires_confirmation') {
            const pollResult = await pollSplitsUntilPaid(transactionId, pollingTimeoutMs, pollingIntervalMs);
            setProcessing(false);

            if (pollResult.ok) {
              try {
                navigation.navigate('ConfirmacionPago', {
                  amount: displayAmountFinal,
                  date: new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }),
                });
              } catch (e) {
                console.warn('navigate PaymentSuccessScreen failed', e);
              }
              return;
            } else {
              showPaymentError('Pendiente', 'Pago confirmado por Stripe pero el servidor aún no refleja la venta como pagada.', pollResult ? JSON.stringify(pollResult) : null);
              return;
            }
          } else {
            setProcessing(false);
            showPaymentError('Pago no completado', `Estado del pago: ${String(paymentIntent?.status)}`, paymentIntent ? JSON.stringify(paymentIntent) : null);
            return;
          }
        } catch (err) {
          console.warn('confirmPayment exception', err);
          setProcessing(false);
          showPaymentError('Error', 'Ocurrió un error confirmando el pago con Stripe.', err ? JSON.stringify(err) : null);
          return;
        }
      } else {
        setProcessing(false);
        showPaymentError('Falta client_secret', 'El servidor no devolvió client_secret. Revisa la respuesta en consola.', json ? JSON.stringify(json) : null);
        return;
      }
    } catch (err) {
      console.warn('Error creando transacción stripe', err);
      setProcessing(false);
      setLoading(false);
      showPaymentError('Error', 'No se pudo conectar con el servidor de pagos. Revisa la URL y el token.', err ? JSON.stringify(err) : null);
    }
  };

  const handleSaveAndPay = async () => {
    setSaveModalVisible(false);
    setSavingCard(true);

    try {
      const setupResp = await createSetupIntentOnServer();
      if (!setupResp.ok) {
        console.warn('No se pudo crear setup intent:', setupResp.error);
        Alert.alert('Advertencia', 'No se pudo guardar la tarjeta. Se continuará con el pago sin guardar la tarjeta.');
        await processPaymentFlow();
        return;
      }

      const setupConfirmResp = await confirmAndSaveCard(setupResp.clientSecret, setupResp.stripeAccountId);
      if (!setupConfirmResp.ok) {
        console.warn('No se pudo confirmar SetupIntent:', setupConfirmResp.error);
        Alert.alert('Advertencia', 'No se pudo confirmar el guardado de la tarjeta. Se continuará con el pago sin guardar la tarjeta.');
        await processPaymentFlow();
        return;
      }

      console.log('Tarjeta guardada OK', setupConfirmResp.setupIntent);
      await processPaymentFlow();
    } catch (err) {
      console.warn('handleSaveAndPay exception', err);
      Alert.alert('Error', 'Ocurrió un error al intentar guardar la tarjeta. Se intentará continuar con el pago.');
      await processPaymentFlow();
    } finally {
      setSavingCard(false);
    }
  };

  const handleContinueWithoutSaving = async () => {
    setSaveModalVisible(false);
    await processPaymentFlow();
  };

  const findPreferredSavedCard = (cards = []) => {
    if (!Array.isArray(cards) || cards.length === 0) return null;
    return cards.find((card) => Boolean(card.is_preferred)) || null;
  };

  const enableManualCardEntry = () => {
    setManualCardMode(true);
    setUsingSavedCard(false);
    setSelectedSavedCard(null);
    setCardDetails(null);
    setCardFieldFocused(false);
  };

  const showQuickPayNotice = ({ title, message, icon = 'card-outline' }) => {
    setQuickPayNotice({ visible: true, title, message, icon });
  };

  const closeQuickPayNotice = () => {
    setQuickPayNotice((prev) => ({ ...prev, visible: false }));
  };

  const payWithPreferredSavedCard = async () => {
    setQuickPayLoading(true);
    try {
      const cards = await fetchSavedPaymentMethods({ silent: true });
      const preferredCard = findPreferredSavedCard(cards);

      if (!preferredCard) {
        enableManualCardEntry();
        const hasCards = Array.isArray(cards) && cards.length > 0;
        showQuickPayNotice({
          title: hasCards ? 'Elige una tarjeta preferida' : 'Agrega una tarjeta para pagar más rápido',
          message: hasCards
            ? 'Tienes tarjetas guardadas, pero ninguna está marcada como preferida. Puedes configurarla desde tu perfil o continuar ahora ingresando una tarjeta.'
            : 'Aún no tienes tarjetas guardadas. Para continuar con este pago, ingresa una tarjeta; después podrás guardarla para futuros pagos.',
          icon: hasCards ? 'star-outline' : 'card-outline',
        });
        return;
      }

      setSelectedSavedCard(preferredCard);
      setUsingSavedCard(true);
      await processPaymentFlow(preferredCard);
    } catch (err) {
      console.warn('payWithPreferredSavedCard error', err);
      enableManualCardEntry();
      showQuickPayNotice({
        title: 'No pudimos consultar tus tarjetas',
        message: 'Por el momento no fue posible obtener tu tarjeta preferida. Puedes continuar el pago ingresando una tarjeta manualmente.',
        icon: 'alert-circle-outline',
      });
    } finally {
      setQuickPayLoading(false);
    }
  };

  const onPayPress = async () => {
    if (!api_host) {
      Alert.alert('Falta API host', 'No hay api_host configurado');
      return;
    }
    if (!sucursal_id || !sale_id || !restaurante_id) {
      Alert.alert('Faltan datos', 'No hay sucursal / venta / restaurante');
      return;
    }
    if (!stripePublishableKey || stripePublishableKey === 'pk_test_REPLACE_ME') {
      Alert.alert('Falta Stripe key', 'Configura FIXED_STRIPE_PUBLISHABLE_KEY en este archivo con tu public key fija de Stripe.');
      return;
    }

    if (!manualCardMode && !usingSavedCard) {
      const baseValidation = validateBasePaymentData();
      if (baseValidation) {
        Alert.alert('Atención', baseValidation);
        return;
      }
      await payWithPreferredSavedCard();
      return;
    }

    const v = validateForm();
    if (v) {
      Alert.alert('Atención', v);
      return;
    }

    if (usingSavedCard && selectedSavedCard) {
      await processPaymentFlow();
      return;
    }

    setSaveModalVisible(true);
  };

  const openSavedCardsModal = async () => {
    setSavedCardsModalVisible(true);
    await fetchSavedPaymentMethods();
  };

  const handleSelectSavedCard = (card) => {
    console.warn('[DEBUG] handleSelectSavedCard - card:', card);
    setSelectedSavedCard(card);
    setUsingSavedCard(true);
    setSavedCardsModalVisible(false);
    setCardDetails(null);
    setCardFieldFocused(false);
  };

  const handlePayWithOther = () => {
    setSavedCardsModalVisible(false);
    setUsingSavedCard(false);
    setSelectedSavedCard(null);
    setTimeout(() => setCardFieldFocused(false), 100);
  };

  useEffect(() => {
    return () => {
      try {
        pollingRef.current.stopRequested = true;
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setManualCardMode(false);
      setUsingSavedCard(false);
      setSelectedSavedCard(null);
      setCardDetails(null);
      setCardFieldFocused(false);
    });
    return () => {
      try { if (unsub && typeof unsub === 'function') unsub(); } catch (e) {}
    };
  }, [navigation]);

  const nativeLogoSource = logoUrl ? { uri: logoUrl } : DEFAULT_LOGO;
  const restaurantSrc = restaurantImage ? { uri: restaurantImage } : DEFAULT_RESTAURANT;
  const currentDateText = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

  const SavedCardView = ({ card }) => {
    if (!card) return null;
    const mask = `**** **** **** ${card.last4 ?? ''}`;
    const brand = (card.brand || '').toUpperCase();
    const exp = `${card.exp_month ?? ''}/${String(card.exp_year ?? '').slice(-2)}`;
    return (
      <View style={styles.savedCardRow}>
        <Ionicons name="card-outline" size={20} color={'#0b1220'} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: '#0b1220' }}>{brand} • {mask}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Exp: {exp} {card.is_preferred ? ' • Preferida' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => { setManualCardMode(true); setUsingSavedCard(false); setSelectedSavedCard(null); setCardFieldFocused(false); }} style={{ padding: 6 }}>
          <Text style={{ color: '#0b58ff', fontWeight: '700' }}>Usar otra</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const confirmDeleteSavedCard = (card) => {
    setCardToDelete(card);
    setDeleteConfirmVisible(true);
  };

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

  const performDeleteSavedCard = async () => {
    if (!cardToDelete) return;
    setDeletingCard(true);

    await ensureToken();

    const host = (String(api_host || 'https://127.0.0.1')).replace(/\/$/, '');
    const cardId = cardToDelete.id ?? cardToDelete.mobile_payment_method_id ?? cardToDelete.external_payment_method_id;
    const url = `${host}/api/mobileapp/payment-methods/${encodeURIComponent(cardId)}?gateway=stripe`;

    let usuarioAppUuid = null;
    try {
      usuarioAppUuid = await AsyncStorage.getItem('user_usuario_app_id');
    } catch (e) {
      console.warn('performDeleteSavedCard - read user_usuario_app_id failed', e);
    }
    usuarioAppUuid = usuarioAppUuid || usuario_app_id || '';

    const idKey = genIdempotencyKey('pm-delete');

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idKey,
          ...getAuthHeaders(),
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

      setSavedCards((prev) => (Array.isArray(prev) ? prev.filter((c) => String(c.id) !== String(cardToDelete.id)) : []));
      setDeleteConfirmVisible(false);
      setCardToDelete(null);
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

  const modalWidth = Math.min(700, winW - 24);

  const maxVisibleItems = 4;
  const approxItemHeight = 72;
  const headerHeight = 88;
  const footerHeight = 64;
  const minModalHeight = 160;
  const computedListHeight = Math.min((savedCards?.length || 0) * approxItemHeight, maxVisibleItems * approxItemHeight);
  const modalHeight = Math.min(Math.max(headerHeight + computedListHeight + footerHeight, minModalHeight), winH - 80);

  return (
    <StripeProvider publishableKey={stripePublishableKey} stripeAccountId={stripeAccountId || undefined}>
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.nativeHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={primaryColor} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tu cuenta</Text>
          <Text style={styles.headerDate}>{currentDateText}</Text>
        </View>

        <LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.gradientHeader, { height: GRADIENT_H, paddingHorizontal: PADDING }]}>
          <View style={styles.gradientInner}>
            <View style={styles.gradientLeftColumn}>
              <Image source={nativeLogoSource} style={[styles.gradientLogo, { width: LOGO_W }]} resizeMode="contain" />
              <Image source={restaurantSrc} style={[styles.gradientRestaurant, { width: REST_W, height: REST_W, marginTop: 12 }]} resizeMode="cover" />
            </View>

            <View style={styles.gradientRight}>
              <Text style={styles.gradientSmall}>Total</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={[styles.gradientTotal, { fontSize: Math.max(30, Math.round(winW * 0.07)) }]}>{formatAmount(displayAmountFinal)}</Text>
                <Text style={styles.gradientCurrency}> {moneda ?? 'MXN'}</Text>
              </View>
              <Text style={styles.gradientDetail}>Detalle</Text>
              <Text style={styles.gradientCount}>{Array.isArray(items) ? items.length : 0} {Array.isArray(items) && items.length === 1 ? 'item' : 'items'}</Text>
            </View>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingHorizontal: PADDING }}>
          <View style={{ height: 14 }} />

          <View style={[styles.form, { padding: Math.max(12, Math.round(winW * 0.03)) }]}>
            <Text style={styles.formLabel}>Pagar con tarjeta</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Nombre en la tarjeta" value={holder} onChangeText={setHolder} placeholderTextColor="#96a0b8" />
            </View>

            <View style={[styles.inputWrap, { paddingVertical: 8 }]}>
              <Ionicons name="card-outline" size={18} color={'#0b1220'} style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                {!manualCardMode && !usingSavedCard ? (
                  <View style={styles.quickPayInfo}>
                    <Text style={styles.quickPayTitle}>Pago rápido con tarjeta seleccionada</Text>
                    <Text style={styles.quickPaySub}>Si no sabes como esta configurado puedes revisar el apartado de metodos de pago en perfil.</Text>
                  </View>
                ) : usingSavedCard && selectedSavedCard ? (
                  <SavedCardView card={selectedSavedCard} />
                ) : (
                  <>
                    <CardField
                      postalCodeEnabled={false}
                      placeholders={{ number: '' }}
                      cardStyle={{
                        borderRadius: 8,
                        backgroundColor: '#ffffff',
                        textColor: cardTextColor,
                        placeholderColor: cardPlaceholderColor,
                      }}
                      style={{ width: '100%', height: 48 }}
                      onCardChange={(details) => {
                        setCardDetails(details);
                      }}
                      onFocus={() => setCardFieldFocused(true)}
                      onBlur={() => setCardFieldFocused(false)}
                    />

                    {false && !cardFieldFocused && !usingSavedCard && Array.isArray(savedCards) && savedCards.length > 0 && (
                      <TouchableOpacity onPress={openSavedCardsModal} style={{ position: 'absolute', right: 8, top: 8, padding: 6 }}>
                        <Text style={{ color: '#0b58ff', fontWeight: '700' }}>Usar tarjeta guardada</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#96a0b8" />
            </View>

            <View style={{ marginTop: PAY_BTN_MARGIN, alignItems: 'center' }}>
              <TouchableOpacity style={[styles.payBtn, { width: Math.min(560, winW - PADDING * 2) }]} onPress={onPayPress} activeOpacity={0.9} disabled={processing || loading || quickPayLoading}>
                {(processing || quickPayLoading) ? <ActivityIndicator color={'#fff'} style={{ marginRight: 10 }} /> : <Ionicons name="card-outline" size={18} color={'#ffffff'} style={{ marginRight: 8 }} />}
                <Text style={styles.payBtnText}>{processing ? 'Procesando…' : (quickPayLoading ? 'Buscando tarjeta…' : 'Pagar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {(processing || loading) && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={primaryColor} style={{ marginRight: 12 }} />
              <Text style={styles.processingText}>{processing ? 'Esperando confirmación de pago…' : 'Enviando datos…'}</Text>
            </View>
          </View>
        )}

        <Modal visible={quickPayNotice.visible} transparent animationType="fade" onRequestClose={closeQuickPayNotice}>
          <View style={styles.quickPayModalBackdrop}>
            <View style={[styles.quickPayModalBox, { width: Math.min(380, winW - 48) }]}>
              <View style={styles.quickPayIconCircle}>
                <Ionicons name={quickPayNotice.icon} size={25} color={primaryColor} />
              </View>

              <Text style={styles.quickPayModalTitle}>{quickPayNotice.title}</Text>
              <Text style={styles.quickPayModalMessage}>{quickPayNotice.message}</Text>

              <View style={styles.quickPayModalHint}>
                <Ionicons name="lock-closed-outline" size={15} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.quickPayModalHintText}>Tu pago se procesará de forma segura con Stripe.</Text>
              </View>

              <TouchableOpacity style={styles.quickPayModalButton} onPress={closeQuickPayNotice} activeOpacity={0.9}>
                <Text style={styles.quickPayModalButtonText}>Ingresar tarjeta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={saveModalVisible} transparent animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
          <View style={styles.autoModalBackdrop}>
            <View style={[styles.autoModalBox, { width: Math.min(360, winW - 48), flexDirection: 'column', padding: 18 }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0b1220', marginBottom: 8 }}>¿Deseas guardar esta tarjeta?</Text>
              <Text style={{ fontSize: 13, color: '#334155', marginBottom: 14 }}>Puedes guardar la tarjeta en Stripe para futuros pagos. Elige una opción:</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ flex: 1, fontSize: 14, color: '#334155', fontWeight: '700' }}>Marcar como preferida</Text>
                <Switch
                  value={savePreferred}
                  onValueChange={(v) => setSavePreferred(v)}
                  trackColor={{ false: '#d1d5db', true: '#bfe0ff' }}
                  thumbColor={savePreferred ? '#0b58ff' : '#ffffff'}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <TouchableOpacity onPress={handleContinueWithoutSaving} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e6eefb', alignItems: 'center', backgroundColor: '#fff' }} disabled={savingCard}>
                  <Text style={{ fontWeight: '700', color: '#0b58ff' }}>Continuar sin guardar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSaveAndPay} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#0b58ff' }} disabled={savingCard}>
                  {savingCard ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '800', color: '#fff' }}>Guardar y pagar</Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setSaveModalVisible(false)} style={{ marginTop: 12, alignItems: 'center' }} disabled={savingCard}>
                <Text style={{ color: '#6b7280' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={savedCardsModalVisible} transparent animationType="fade" onRequestClose={() => setSavedCardsModalVisible(false)}>
          <View style={styles.autoModalBackdrop}>
            <View style={[styles.savedCardsModalBox, { width: modalWidth, height: modalHeight }]}>
              <View style={{ padding: 14, borderBottomWidth: 1, borderColor: '#eef4ff' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0b1220' }}>Selecciona una tarjeta</Text>
                <Text style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>Toca una tarjeta para seleccionarla o pulsa "Pagar con otra".</Text>
              </View>

              <View style={{ flex: 1, padding: 8 }}>
                {savedCardsLoading ? (
                  <View style={{ padding: 12, alignItems: 'center' }}>
                    <ActivityIndicator />
                  </View>
                ) : (
                  <FlatList
                    data={savedCards}
                    keyExtractor={(i) => String(i.id ?? i.external_payment_method_id ?? Math.random())}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    renderItem={({ item }) => (
                      <View style={styles.savedCardTouchable}>
                        <TouchableOpacity onPress={() => handleSelectSavedCard(item)} style={{ flex: 1 }}>
                          <View>
                            <Text style={styles.savedCardTitle}>{(item.brand || '').toUpperCase()} • **** **** **** {item.last4 ?? ''}</Text>
                            <Text style={styles.savedCardSub}>Exp: {item.exp_month}/{item.exp_year} {item.is_preferred ? ' • Preferida' : ''}</Text>
                          </View>
                        </TouchableOpacity>

                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          <TouchableOpacity onPress={() => confirmDeleteSavedCard(item)} style={{ padding: 6 }}>
                            <Ionicons name="remove-circle-outline" size={22} color="#ef4444" />
                          </TouchableOpacity>

                          <Text style={styles.savedCardStatus}>{item.status ?? ''}</Text>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={() => (
                      <View style={{ padding: 12 }}>
                        <Text style={{ color: '#6b7280' }}>No hay tarjetas guardadas.</Text>
                        <View style={{ height: 8 }} />
                        <TouchableOpacity
                          onPress={() => {
                            console.warn('[DEBUG] lastSavedCardsResponse:', lastSavedCardsResponse);
                            Alert.alert('Respuesta (debug)', JSON.stringify(lastSavedCardsResponse ?? { note: 'no response' }, null, 2).slice(0, 2000));
                          }}
                          style={{ marginTop: 8 }}
                        >
                          <Text style={{ color: '#0b58ff', fontWeight: '700' }}>Ver respuesta (debug)</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>

              <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#eef4ff', flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={handlePayWithOther} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e6eefb', backgroundColor: '#fff' }}>
                  <Text style={{ fontWeight: '700', color: '#0b58ff' }}>Pagar con otra</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSavedCardsModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#0b58ff' }}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

        <Modal visible={successModalVisible} transparent animationType="fade">
          <View style={styles.autoModalBackdrop}>
            <View style={styles.autoModalBox}>
              <View style={styles.checkCircle}><Ionicons name="checkmark" size={20} color={primaryColor} /></View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.autoModalTitle}>Pago confirmado</Text>
                <Text style={styles.autoModalMsg} numberOfLines={3} ellipsizeMode="tail">Gracias — el pago se procesó correctamente. Puedes regresar al menú.</Text>
              </View>
            </View>
          </View>
        </Modal>

        {toastVisible && (
          <Animated.View pointerEvents="none" style={[styles.toastBox, { opacity: toastOpacity }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f6f9' },
  nativeHeader: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 6, width: 44 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0b58ff', textAlign: 'center', flex: 1 },
  headerDate: { fontSize: 12, color: '#6b7280', width: 160, textAlign: 'right' },

  gradientHeader: { paddingVertical: 18 },
  gradientInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradientLeftColumn: { flexDirection: 'column', alignItems: 'flex-start' },
  gradientLogo: { height: 36, tintColor: '#fff' },
  gradientRestaurant: { borderRadius: 12, marginLeft: 25, backgroundColor: '#fff', borderWidth: 0 },

  gradientRight: { alignItems: 'flex-end' },
  gradientSmall: { color: '#e6ffffff', fontSize: 13 },
  gradientTotal: { color: '#ffffff', fontSize: 30, fontWeight: '900' },
  gradientCurrency: { color: '#ffffff', fontSize: 14, marginLeft: 6, marginBottom: 3 },
  gradientDetail: { color: '#e6ffffff', marginTop: 8, fontWeight: '700' },
  gradientCount: { color: '#f2ffffff', marginTop: 4 },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b58ff', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignSelf: 'center', shadowColor: '#14000000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  form: { marginTop: 6, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#14000000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, borderWidth: 1, borderColor: '#08000000' },
  formLabel: { fontSize: 16, fontWeight: '800', color: '#0b1220', marginBottom: 8 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eef4ff', paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 44, fontSize: 14, color: '#0b1220' },
  quickPayInfo: { minHeight: 48, justifyContent: 'center', paddingVertical: 6 },
  quickPayTitle: { color: '#0b1220', fontWeight: '800', fontSize: 14 },
  quickPaySub: { color: '#64748b', fontSize: 12, marginTop: 3 },

  processingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E020617' },
  processingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 12, shadowColor: '#14000000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  processingText: { fontWeight: '700', fontSize: 16, color: '#0b1220' },

  quickPayModalBackdrop: {
    flex: 1,
    backgroundColor: '#2E020617',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  quickPayModalBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 18,
  },
  quickPayIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eaf3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickPayModalTitle: {
    color: '#0b1220',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickPayModalMessage: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  quickPayModalHint: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#eef4ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 14,
  },
  quickPayModalHintText: {
    color: '#64748b',
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'center',
  },
  quickPayModalButton: {
    width: '100%',
    backgroundColor: '#0b58ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 14,
  },
  quickPayModalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  autoModalBackdrop: { flex: 1, backgroundColor: '#2E020617', justifyContent: 'center', alignItems: 'center', padding: 18 },
  autoModalBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 12, width: Math.min(340, 340), shadowColor: '#14000000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  checkCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eaf3ff', alignItems: 'center', justifyContent: 'center' },
  autoModalTitle: { fontSize: 15, fontWeight: '800', color: '#0b58ff' },
  autoModalMsg: { fontSize: 13, color: '#334155', marginTop: 2 },

  savedCardsModalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 20 },

  savedCardTouchable: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
  savedCardTitle: { fontWeight: '800', color: '#0b1220' },
  savedCardSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  savedCardStatus: { fontSize: 12, color: '#64748b' },

  savedCardRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, backgroundColor: '#fff', padding: 10, borderWidth: 1, borderColor: '#eef4ff' },

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
