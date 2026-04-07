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

import { StripeProvider, CardField, confirmPayment, confirmSetupIntent } from '@stripe/stripe-react-native';

const DEFAULT_LOGO = require('../../assets/images/logo2.png');
const DEFAULT_RESTAURANT = require('../../assets/images/restaurante.jpeg');

export default function StripePay() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const {
    api_host = 'https://api.tab-track.com',
    api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3NTUxMjcwNSwianRpIjoiNzA1NjU2YjgtZGFiZS00M2NlLTk2MjUtZmE5ODdmY2FiY2ZiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzU1MTI3MDUsImV4cCI6MTc3ODEwNDcwNSwicm9sIjoiRWRpdG9yIn0.03LJs1TRZzehSXSh5Cdez2e5NFSrANijsS4H6gUjm78',
    sucursal_id = null,
    sale_id = null,
    restaurante_id = null,
    usuario_app_id = null, // email fallback that you used previously
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
    publishableKey = null,
  } = params;

  const stripePublishableKey =
    publishableKey ||
    params.publishableKey ||
    params.stripe_public_key ||
    (params.creds && params.creds.public_key) ||
    'pk_test_REPLACE_ME';

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

  const subtotalNum = Number(monto_subtotal ?? params.monto_subtotal ?? 0) || 0;
  const propinaNum = Number(monto_propina ?? params.monto_propina ?? 0) || 0;
  const displayAmountFinal = Number((displayAmount ?? (subtotalNum + propinaNum)).toFixed(2));

  const formatAmount = (n) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  const buildTransactionUrl = () => `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/transacciones-pago`;
  const buildSetupIntentUrl = (sucursalId) =>
    `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/mobileapp/sucursales/${encodeURIComponent(sucursalId)}/payment-methods/stripe/setup-intent`;
  const buildListPaymentMethodsUrl = (sucursalId, usuarioAppId) =>
    `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/mobileapp/sucursales/${encodeURIComponent(sucursalId)}/payment-methods?gateway=stripe&environment=${encodeURIComponent(environment)}&usuario_app_id=${encodeURIComponent(usuarioAppId)}`;

  const genIdempotencyKey = () => {
    const hex = Math.random().toString(16).slice(2, 10);
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${hex}-idemp-${suffix}`;
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
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
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

  const showPaymentError = (title, message, details = null) => {
    console.warn('Navigating to ErrorPago:', title, message, details);
    setProcessing(false);
    setLoading(false);
    navigation.navigate('ErrorPago', { title: String(title || 'Error'), message: String(message || 'Ocurrió un problema procesando el pago.'), details: details ? String(details) : null });
  };

  // ------------------- fetchSavedPaymentMethods (lee AsyncStorage en el momento) -------------------
  const fetchSavedPaymentMethods = async () => {
    if (!sucursal_id) {
      Alert.alert('Error', 'Falta sucursal_id para listar tarjetas.');
      return;
    }

    let usuarioAppIdToSend = null;
    try {
      usuarioAppIdToSend = await AsyncStorage.getItem('user_usuario_app_id');
    } catch (e) {
      console.warn('Error leyendo user_usuario_app_id desde AsyncStorage', e);
    }
    usuarioAppIdToSend = usuarioAppIdToSend || usuario_app_id || '';

    if (!usuarioAppIdToSend) {
      console.warn('fetchSavedPaymentMethods - no user_usuario_app_id disponible', { usuario_app_id });
      Alert.alert('Error', 'No hay user_usuario_app_id en AsyncStorage');
      setSavedCards([]);
      setLastSavedCardsResponse(null);
      return;
    }

    setSavedCardsLoading(true);
    const url = buildListPaymentMethodsUrl(sucursal_id, usuarioAppIdToSend);
    const idKey = genIdempotencyKey();

    console.warn('[DEBUG] fetchSavedPaymentMethods - url:', url);
    console.warn('[DEBUG] fetchSavedPaymentMethods - Idempotency-Key:', idKey);
    console.warn('[DEBUG] fetchSavedPaymentMethods - Authorization present:', !!api_token);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idKey,
          ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}),
        },
      });

      console.warn('[DEBUG] fetchSavedPaymentMethods - httpStatus:', res.status);
      const json = await res.json().catch(() => null);
      console.warn('[DEBUG] fetchSavedPaymentMethods - response json:', json);

      setLastSavedCardsResponse(json ?? { status: res.status });

      if (!res.ok) {
        console.warn('fetchSavedPaymentMethods server error', res.status, json);
        Alert.alert('Error', `No se pudo obtener tarjetas guardadas (${res.status})`);
        setSavedCards([]);
        setSavedCardsLoading(false);
        return;
      }

      const arr = Array.isArray(json?.payment_methods) ? json.payment_methods : [];

      if (!arr.length) {
        console.warn('fetchSavedPaymentMethods: payment_methods vacío o no existe', { url, responseJson: json });
      } else {
        console.warn('fetchSavedPaymentMethods: tarjetas encontradas', arr.length);
      }

      // normalizar
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
    } catch (err) {
      console.warn('fetchSavedPaymentMethods exception', err);
      Alert.alert('Error', 'No se pudo conectar al servidor de tarjetas guardadas.');
      setSavedCards([]);
      setLastSavedCardsResponse({ error: String(err) });
    } finally {
      setSavedCardsLoading(false);
    }
  };

  // ------------------- SetupIntent & confirm -------------------
  const createSetupIntentOnServer = async () => {
    if (!sucursal_id) throw new Error('Falta sucursal_id para crear setup intent');
    const url = buildSetupIntentUrl(sucursal_id);
    let storedUserAppIdLocal = null;
    try {
      storedUserAppIdLocal = await AsyncStorage.getItem('user_usuario_app_id');
    } catch (e) {
      console.warn('Error leyendo user_usuario_app_id desde AsyncStorage', e);
    }
    const usuarioAppIdToSend = storedUserAppIdLocal || usuario_app_id || '';
    // AÑADIDO: enviamos set_preferred según el switch del modal
    const body = { environment: environment || 'sandbox', usuario_app_id: usuarioAppIdToSend, set_preferred: Boolean(savePreferred) };
    const idKey = genIdempotencyKey();
    console.warn('[DEBUG] createSetupIntentOnServer - url:', url, 'idKey:', idKey, 'body:', body);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idKey,
          ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}),
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
      return { ok: true, clientSecret, raw: json };
    } catch (err) {
      console.warn('createSetupIntentOnServer exception', err);
      return { ok: false, error: err };
    }
  };

  const confirmAndSaveCard = async (setupClientSecret) => {
    if (!setupClientSecret) return { ok: false, error: new Error('No client_secret') };
    try {
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

  // ------------------- processPaymentFlow (con corrección para tarjetas guardadas) -------------------
  const processPaymentFlow = async () => {
    setProcessing(true);
    setLoading(true);

    const monto_subtotal = Number(subtotalNum) || 0;
    const monto_propina = Number(propinaNum) || 0;
    const items_pagados = buildItemsPagados();
    const usuario_app_id_to_send = (email && String(email).trim()) || (usuario_app_id && String(usuario_app_id).trim()) || '';

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

    // Si se usa tarjeta guardada, agregamos los 2 campos: usuario_app_uuid y mobile_payment_method_id
    if (usingSavedCard && selectedSavedCard) {
      try {
        const storedUuid = await AsyncStorage.getItem('user_usuario_app_id');
        if (storedUuid) body.usuario_app_uuid = storedUuid;
      } catch (e) {}
      body.mobile_payment_method_id = selectedSavedCard.id ?? selectedSavedCard.mobile_payment_method_id ?? null;
    }

    console.warn('[DEBUG] processPaymentFlow - body:', body);

    let json = null;
    let transactionId = null;

    try {
      const url = buildTransactionUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
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

      // --- CORRECCIÓN CLAVE: si usamos tarjeta guardada, NO llamamos a confirmPayment en el cliente ---
      if (usingSavedCard && selectedSavedCard) {
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
      // --- fin corrección ---

      // Si no usamos tarjeta guardada, seguimos con confirmPayment normal (Elements)
      if (clientSecret) {
        try {
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

  // guardar tarjeta y luego pagar
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

      const setupConfirmResp = await confirmAndSaveCard(setupResp.clientSecret);
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

  const onPayPress = async () => {
    const v = validateForm();
    if (v) {
      Alert.alert('Atención', v);
      return;
    }
    if (!api_host) {
      Alert.alert('Falta API host', 'No hay api_host configurado');
      return;
    }
    if (!sucursal_id || !sale_id || !restaurante_id) {
      Alert.alert('Faltan datos', 'No hay sucursal / venta / restaurante');
      return;
    }
    if (!stripePublishableKey || stripePublishableKey === 'pk_test_REPLACE_ME') {
      Alert.alert('Falta Stripe key', 'Pasa stripe_public_key (creds.public_key) a esta pantalla en params o reemplaza pk_test_REPLACE_ME en el código.');
      return;
    }

    // Si está usando tarjeta guardada -> no preguntar por guardar, ir directo a processPaymentFlow
    if (usingSavedCard && selectedSavedCard) {
      await processPaymentFlow();
      return;
    }

    // Si no usa tarjeta guardada, mostrar modal "Guardar y pagar"
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

  // <-- NUEVO: cargar tarjetas guardadas al montar la pantalla y cuando la pantalla gana foco
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchSavedPaymentMethods();
      } catch (e) {
        console.warn('load saved cards on mount error', e);
      }
    })();
    const unsub = navigation.addListener('focus', () => {
      // refrescar tarjetas cuando el usuario vuelve a la pantalla
      fetchSavedPaymentMethods().catch((e) => console.warn('refresh saved cards on focus error', e));
    });
    return () => {
      try { if (unsub && typeof unsub === 'function') unsub(); } catch (e) {}
      mounted = false;
    };
  }, [navigation]);
  // <-- FIN del cambio mínimo y seguro

  const nativeLogoSource = logoUrl ? { uri: logoUrl } : DEFAULT_LOGO;
  const restaurantSrc = restaurantImage ? { uri: restaurantImage } : DEFAULT_RESTAURANT;
  const currentDateText = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

  // Saved card compact view used in form
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
        <TouchableOpacity onPress={() => { setUsingSavedCard(false); setSelectedSavedCard(null); setCardFieldFocused(false); }} style={{ padding: 6 }}>
          <Text style={{ color: '#0b58ff', fontWeight: '700' }}>Usar otra</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // NUEVO: confirma que se quiere eliminar (abre modal)
  const confirmDeleteSavedCard = (card) => {
    setCardToDelete(card);
    setDeleteConfirmVisible(true);
  };

  // NUEVO: muestra toast estilizado
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

  // NUEVO: realiza la petición para eliminar la tarjeta
  const performDeleteSavedCard = async () => {
    if (!cardToDelete) return;
    setDeletingCard(true);

    // construir URL según tu ejemplo
    const host = (String(api_host || 'https://127.0.0.1')).replace(/\/$/, '');
    const cardId = cardToDelete.id ?? cardToDelete.mobile_payment_method_id ?? cardToDelete.external_payment_method_id;
    const url = `${host}/api/mobileapp/sucursales/${encodeURIComponent(sucursal_id)}/payment-methods/${encodeURIComponent(cardId)}?gateway=stripe&environment=${encodeURIComponent(environment)}`;

    // obtener usuario_app_id desde AsyncStorage o param
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
      // MOSTRAR TOAST (en lugar de alerta gris)
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

  // modal sizing (AHORA DINÁMICO)
  const modalWidth = Math.min(700, winW - 24);

  // Calculo dinámico de la altura del modal según cantidad de tarjetas
  const maxVisibleItems = 4; // cuántas tarjetas mostrar antes de habilitar scroll dentro del modal
  const approxItemHeight = 72; // aproximado por cada item (ajustable)
  const headerHeight = 88; // espacio ocupado por el header del modal
  const footerHeight = 64; // espacio del footer (botones)
  const minModalHeight = 160; // tamaño mínimo aceptable
  const computedListHeight = Math.min((savedCards?.length || 0) * approxItemHeight, maxVisibleItems * approxItemHeight);
  const modalHeight = Math.min(Math.max(headerHeight + computedListHeight + footerHeight, minModalHeight), winH - 80);

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
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
                <Text style={[styles.gradientTotal, { fontSize: Math.max(22, Math.round(winW * 0.07)) }]}>{formatAmount(displayAmountFinal)}</Text>
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
                {usingSavedCard && selectedSavedCard ? (
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

                    {/* Mostrar "Usar tarjeta guardada" SOLO si hay tarjetas cargadas en savedCards */}
                    {!cardFieldFocused && !usingSavedCard && Array.isArray(savedCards) && savedCards.length > 0 && (
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
              <TouchableOpacity style={[styles.payBtn, { width: Math.min(560, winW - PADDING * 2) }]} onPress={onPayPress} activeOpacity={0.9} disabled={processing || loading}>
                {processing ? <ActivityIndicator color={'#fff'} style={{ marginRight: 10 }} /> : <Ionicons name="card-outline" size={18} color={'#ffffff'} style={{ marginRight: 8 }} />}
                <Text style={styles.payBtnText}>{processing ? 'Procesando…' : 'Pagar'}</Text>
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

        {/* Modal guardar tarjeta */}
        <Modal visible={saveModalVisible} transparent animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
          <View style={styles.autoModalBackdrop}>
            <View style={[styles.autoModalBox, { width: Math.min(360, winW - 48), flexDirection: 'column', padding: 18 }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0b1220', marginBottom: 8 }}>¿Deseas guardar esta tarjeta?</Text>
              <Text style={{ fontSize: 13, color: '#334155', marginBottom: 14 }}>Puedes guardar la tarjeta en Stripe para futuros pagos. Elige una opción:</Text>

              {/* NUEVO: switch preferida (igual estilo al OpenPay) */}
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

        {/* Modal: lista tarjetas guardadas (AHORA altura dinámica según tarjetas) */}
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
                          {/* Botón eliminar (esquina superior derecha del item) */}
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

        {/* Modal confirmación eliminar tarjeta (NUEVO) */}
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

        {/* NUEVO: Toast estilizado */}
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
  gradientRestaurant: { borderRadius: 12, marginLeft: 0, backgroundColor: '#fff', borderWidth: 0 },

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

  processingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E020617' },
  processingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 12, shadowColor: '#14000000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  processingText: { fontWeight: '700', fontSize: 16, color: '#0b1220' },

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

  // NUEVO: estilos para el toast
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