import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  StripeProvider,
  CardField,
  confirmPayment,
  confirmSetupIntent,
  initStripe,
  isPlatformPaySupported,
  confirmPlatformPayPayment,
} from '@stripe/stripe-react-native';
import { TOKEN, ensureToken } from '../auth/tokenManager';
import { getClientMetadataId } from '../native/magnes';

const API_HOST_CONST = 'https://api.tab-track.com';
const DEFAULT_RESTAURANT = require('../../assets/images/restaurante.jpeg');
const TABTRACK_LOGO = require('../../assets/images/logo2.png');

const FIXED_STRIPE_PUBLISHABLE_KEY = 'pk_test_51RJbpaQaBqb9H2oSU1iY1gSZnZDsZmda42KJkP4d4Ta3RVyte3lcmyzC4WsoHfYJewiuOsef4tdeaIaqBUJbqtDL00K6T8g3bt';

const MIN_IOS_VERSION_FOR_APPLE_PAY = 10;

const PAYMENT_METHODS_ENVIRONMENT = 'sandbox';

const COLORS = {
  bg: '#ffffff',
  surface: '#ffffff',
  soft: '#f7f7f5',
  border: '#e8edf5',
  text: '#161616',
  muted: '#6f6f6f',
  ink: '#111111',
  accent: '#0b58ff',
  danger: '#d92d20',
  success: '#176b3a',
};

const AS_KEYS = {
  USER_EMAIL: 'user_email',
  USER_MAIL: 'user_mail',
  USER_FULLNAME: 'user_fullname',
  USER_NOMBRE: 'user_nombre',
  USER_APELLIDO: 'user_apellido',
  USER_USUARIO_APP_ID: 'user_usuario_app_id',
};

const formatMoney = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

const round2 = (v) => Number(Number(v || 0).toFixed(2));
const toCents = (v) => Math.round(Number(v || 0) * 100);
const fromCents = (cents) => Number((Number(cents || 0) / 100).toFixed(2));
const splitAmountByIndex = (amount, parts, index) => {
  const safeParts = Math.max(1, Math.floor(Number(parts) || 1));
  const safeIndex = Math.max(0, Math.min(safeParts - 1, Math.floor(Number(index) || 0)));
  const totalCents = toCents(amount);
  const base = Math.floor(totalCents / safeParts);
  const remainder = totalCents % safeParts;
  const extra = safeIndex >= (safeParts - remainder) ? 1 : 0;
  return fromCents(base + extra);
};
const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(String(value || '').trim());

const isIosVersionCompatibleWithApplePay = () => {
  if (Platform.OS !== 'ios') return false;
  const majorVersion = parseInt(String(Platform.Version).split('.')[0], 10);
  return Number.isFinite(majorVersion) && majorVersion >= MIN_IOS_VERSION_FOR_APPLE_PAY;
};

const isApplePayGatewayName = (gateway) => {
  const g = String(gateway || '').toLowerCase().trim();
  return g === 'applepay' || g === 'apple_pay';
};

function Toast({ message, visible, success }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        toastStyles.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
          borderColor: success ? '#d8efe1' : COLORS.border,
        },
      ]}
    >
      <Text style={[toastStyles.toastText, success && { color: COLORS.success }]}>{message}</Text>
    </Animated.View>
  );
}

export default function PaymentMarketplace() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params ?? {};
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const wp = (p) => Math.round(((Number(p) || 0) / 100) * width);
  const hp = (p) => Math.round(((Number(p) || 0) / 100) * height);
  const rf = (p) => Math.round(((Number(p) || 0) / 100) * width);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const apiHost = params.api_host ?? API_HOST_CONST;
  const apiToken = params.api_token ?? TOKEN ?? '';
  const environment = params.environment ?? 'sandbox';

  const sucursal_id = params.sucursal_id ?? params.sucursalId ?? params.sucursal ?? null;
  const restaurante_id = params.restaurante_id ?? params.restauranteId ?? params.restaurante ?? null;
  const sale_id = params.sale_id ?? params.saleId ?? params.venta_id ?? null;
  const mesa_id = params.mesa_id ?? params.mesaId ?? params.mesa ?? null;
  const moneda = params.moneda ?? params.currency ?? 'MXN';
  const restaurantImage = params.restaurantImage ?? params.restaurantImageUri ?? null;

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
        unitPrice: unit,
        price: Number(it.price ?? line),
        lineTotal: line,
        canceled,
        codigo_item,
      };
    });
  };

  const items = normalizeItems(rawItems);
  const totalFromItems = items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
  const totalSinPropina = Number(
    params.total ??
    params.monto_total ??
    params.totalWithoutTip ??
    params.total_sin_propina ??
    params.monto_subtotal ??
    totalFromItems
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
  const subtotalAmount = Number(totalSinPropina || 0);
  const rawDisplayAmount = Number(
    params.displayAmount ??
    params.displayTotal ??
    params.display_total ??
    params.totalWithTip ??
    params.total_with_tip ??
    params.totalToPay ??
    round2(subtotalAmount + tipAmount)
  ) || 0;
  const comingFromEqualSplit = params.groupPeople !== undefined && params.groupPeople !== null;
  const groupPeopleCount = Math.max(1, Number(params.groupPeople ?? params.people ?? 1) || 1);
  const splitBaseForCharge = comingFromEqualSplit
    ? Number(totalFromItems || params.groupTotal || params.group_total || totalSinPropina || 0)
    : subtotalAmount;

  const [screen, setScreen] = useState('checkout');
  const [userEmail, setUserEmail] = useState(params.user_email ?? params.userEmail ?? '');
  const [userFullname, setUserFullname] = useState(params.user_fullname ?? params.userFullname ?? '');
  const [usuarioAppId, setUsuarioAppId] = useState(params.usuario_app_id ?? params.user_usuario_app_id ?? params.userUsuarioAppId ?? '');

  const [loadingMethods, setLoadingMethods] = useState(false);
  const [methods, setMethods] = useState([]);
  const [availableGateways, setAvailableGateways] = useState([]);
  const [restaurantPaymentEnvironment, setRestaurantPaymentEnvironment] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showOtherMethods, setShowOtherMethods] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [manualCardDetails, setManualCardDetails] = useState(null);
  const [cardHolderName, setCardHolderName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [savingCard, setSavingCard] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(params.stripe_account_id || params.stripeAccountId || null);

  const [applePayDeviceSupported, setApplePayDeviceSupported] = useState(false);

  const [paypalClientMetadataId, setPaypalClientMetadataId] = useState(null);
  const [paypalNoticeVisible, setPaypalNoticeVisible] = useState(false);
  const [notice, setNotice] = useState({ visible: false, title: '', message: '' });
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastSuccess, setToastSuccess] = useState(false);
  const [equalSplitCharge, setEqualSplitCharge] = useState(null);
  const toastTimeoutRef = useRef(null);
  const pollingRef = useRef({ stopRequested: false, lastResult: null });

  const fallbackEqualSplitBase = splitAmountByIndex(splitBaseForCharge, groupPeopleCount, 0);
  const fallbackEqualSplitTip = tipPercent > 0 ? round2(fallbackEqualSplitBase * (tipPercent / 100)) : Number(tipAmount || 0);
  const displayCharge = comingFromEqualSplit
    ? (equalSplitCharge ?? {
      paidCount: 0,
      baseAmount: fallbackEqualSplitBase,
      tipAmount: fallbackEqualSplitTip,
      totalAmount: round2(fallbackEqualSplitBase + fallbackEqualSplitTip),
    })
    : {
      paidCount: 0,
      baseAmount: subtotalAmount,
      tipAmount: Number(tipAmount || 0),
      totalAmount: rawDisplayAmount,
    };
  const displayAmount = round2(displayCharge.totalAmount);
  const pagePadding = Math.max(18, Math.round(width * 0.055));
  const totalText = `${formatMoney(displayAmount)} ${moneda}`;

  const getAuthHeaders = useCallback((extra = {}) => {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...extra,
    };
    const token = TOKEN || apiToken || '';
    if (token && String(token).trim()) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [apiToken]);

  const hostBase = useCallback(() => String(apiHost || API_HOST_CONST).replace(/\/$/, ''), [apiHost]);
  const buildPaymentMethodsUrl = useCallback((userId, restId) => {
    const query = `usuario_app_id=${encodeURIComponent(userId)}${restId ? `&id_restaurante=${encodeURIComponent(restId)}` : ''}`;
    return `${hostBase()}/api/mobileapp/payment-methods?${query}`;
  }, [hostBase]);
  const buildRestaurantPaymentsUrl = useCallback((restId) => `${hostBase()}/api/restaurantes/${encodeURIComponent(restId)}/payments`, [hostBase]);
  const buildTransactionUrl = useCallback(() => {
    const host = String(apiHost || API_HOST_CONST).trim();
    if (host.includes('/api/transacciones-pago')) return host;
    return `${host.replace(/\/$/, '')}/api/transacciones-pago`;
  }, [apiHost]);
  const buildSetupIntentUrl = useCallback(() => `${hostBase()}/api/mobileapp/payment-methods/stripe/setup-intent`, [hostBase]);
  const buildSplitsUrl = useCallback((transactionId) => `${hostBase()}/api/transacciones-pago/${encodeURIComponent(transactionId)}/splits`, [hostBase]);
  const buildSaleSplitsUrl = useCallback(
    (sucursalId, saleId) => `${hostBase()}/api/transacciones-pago/sucursal/${encodeURIComponent(String(sucursalId))}/ventas/${encodeURIComponent(String(saleId))}/splits`,
    [hostBase]
  );

  const showToast = useCallback((message, success = false, duration = 1700) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(message);
    setToastSuccess(success);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  const genIdempotencyKey = (prefix = 'pm-setup') => {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now()}-${randomPart}`;
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

  const normalizeGateway = (value) => String(value || '').toLowerCase().trim();

  const isWalletApplePayPayload = (pm) => {
    const rawType = String(pm?.type ?? pm?.wallet_type ?? '').toLowerCase().trim();
    const rawCategory = String(pm?.category ?? '').toLowerCase().trim();
    if (rawType === 'apple_pay' || rawType === 'applepay') return true;
    if (rawCategory === 'wallet' && rawType.includes('apple')) return true;
    return false;
  };

  const normalizePaymentMethod = (pm) => {
    let gateway = normalizeGateway(pm.gateway ?? pm.provider ?? pm.payment_gateway ?? pm.tipo_gateway ?? pm.raw?.gateway);
    if (isWalletApplePayPayload(pm)) gateway = 'apple_pay';

    return {
      id: pm.id ?? pm.mobile_payment_method_id ?? pm.payment_method_id ?? null,
      mobile_payment_method_id: pm.mobile_payment_method_id ?? pm.id ?? null,
      external_payment_method_id: pm.external_payment_method_id ?? pm.external_id ?? pm.external_pm_id ?? null,
      gateway: gateway || 'stripe',
      brand: pm.brand ?? pm.card_brand ?? pm.gateway_brand ?? '',
      last4: pm.last4 ?? pm.card_last4 ?? '',
      exp_month: pm.exp_month ?? pm.card_exp_month ?? null,
      exp_year: pm.exp_year ?? pm.card_exp_year ?? null,
      is_preferred: pm.is_preferred ?? pm.preferred ?? false,
      status: pm.status ?? pm.state ?? '',
      raw: pm,
    };
  };

  const isPaymentGatewayReady = (payment) => {
    if (!payment) return false;
    return payment.configured === true && payment.enabled === true;
  };

  const parseRestaurantPayments = (json) => {
    const source = Array.isArray(json?.payments)
      ? json.payments
      : (Array.isArray(json?.data?.payments)
        ? json.data.payments
        : (Array.isArray(json?.data) ? json.data : []));

    return source
      .filter(isPaymentGatewayReady)
      .map((payment) => ({
        ...payment,
        gateway: normalizeGateway(payment.gateway ?? payment.provider ?? payment.name),
      }))
      .filter((payment) => payment.gateway)
      .filter((payment) => (isApplePayGatewayName(payment.gateway) ? applePayDeviceSupported : true));
  };

  const loadRestaurantPayments = useCallback(async () => {
    if (!restaurante_id) return [];

    try {
      await ensureToken();
      const res = await fetch(buildRestaurantPaymentsUrl(restaurante_id), {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn('loadRestaurantPayments error', res.status, json);
        return [];
      }

      const readyPayments = parseRestaurantPayments(json);
      setRestaurantPaymentEnvironment(json?.environment ?? json?.data?.environment ?? '');
      return readyPayments.map((payment) => payment.gateway);
    } catch (err) {
      console.warn('loadRestaurantPayments exception', err);
      return [];
    }
  }, [buildRestaurantPaymentsUrl, getAuthHeaders, restaurante_id, applePayDeviceSupported]);

  const resolveAvailableGateways = (restaurantGateways, normalizedMethods) => {
    const readyGateways = Array.from(new Set((restaurantGateways || []).map(normalizeGateway).filter(Boolean)));
    if (readyGateways.length) return readyGateways;
    return Array.from(new Set((normalizedMethods || []).map((m) => normalizeGateway(m.gateway)).filter(Boolean)));
  };

  const resolveUsuarioAppId = useCallback(async () => {
    if (usuarioAppId) return usuarioAppId;
    const stored = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);
    if (stored) {
      setUsuarioAppId(stored);
      return stored;
    }
    return '';
  }, [usuarioAppId]);

  const resolveCustomerForPayment = useCallback(async () => {
    let email = String(userEmail || '').trim();
    let name = String(userFullname || '').trim();
    let userId = await resolveUsuarioAppId();

    if (!email) {
      const storedEmail = await AsyncStorage.getItem(AS_KEYS.USER_EMAIL) || await AsyncStorage.getItem(AS_KEYS.USER_MAIL);
      email = String(storedEmail || '').trim();
      if (email) setUserEmail(email);
    }

    if (!name) {
      const storedFull = await AsyncStorage.getItem(AS_KEYS.USER_FULLNAME);
      const storedNombre = await AsyncStorage.getItem(AS_KEYS.USER_NOMBRE);
      const storedApellido = await AsyncStorage.getItem(AS_KEYS.USER_APELLIDO);
      name = String(storedFull || `${storedNombre ?? ''} ${storedApellido ?? ''}`.trim()).trim();
      if (name) setUserFullname(name);
    }

    if (!userId) {
      const storedUserId = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);
      userId = String(storedUserId || '').trim();
      if (userId) setUsuarioAppId(userId);
    }

    if (!name || name.length < 2) throw new Error('Ingresa el nombre del titular de la tarjeta');
    if (!email || !isValidEmail(email)) throw new Error('Ingresa un correo electrónico válido');

    return {
      email,
      name,
      usuarioAppId: userId,
      transactionUsuarioAppId: email,
    };
  }, [resolveUsuarioAppId, userEmail, userFullname]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const email = await AsyncStorage.getItem(AS_KEYS.USER_EMAIL) || await AsyncStorage.getItem(AS_KEYS.USER_MAIL);
        const full = await AsyncStorage.getItem(AS_KEYS.USER_FULLNAME);
        const nombre = await AsyncStorage.getItem(AS_KEYS.USER_NOMBRE);
        const apellido = await AsyncStorage.getItem(AS_KEYS.USER_APELLIDO);
        const userId = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);
        const name = full || `${nombre ?? ''} ${apellido ?? ''}`.trim();
        if (!mounted) return;
        if (!userEmail && email) setUserEmail(email);
        if (!userFullname && name) setUserFullname(name);
        if (!usuarioAppId && userId) setUsuarioAppId(userId);
      } catch (err) {
        console.warn('PaymentMarketplace AsyncStorage error', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isIosVersionCompatibleWithApplePay()) {
        if (mounted) setApplePayDeviceSupported(false);
        return;
      }
      try {
        const supported = await isPlatformPaySupported({ applePay: true });
        if (mounted) setApplePayDeviceSupported(Boolean(supported));
      } catch (err) {
        console.warn('isPlatformPaySupported error', err);
        if (mounted) setApplePayDeviceSupported(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await getClientMetadataId();
        if (mounted && id) setPaypalClientMetadataId(id);
      } catch (err) {
        console.warn('Magnes getClientMetadataId error', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadMarketplaceMethods = useCallback(async () => {
    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontró usuario_app_id', false);
      return;
    }

    setLoadingMethods(true);
    try {
      const restaurantGateways = await loadRestaurantPayments();
      await ensureToken();
      const res = await fetch(buildPaymentMethodsUrl(userId, restaurante_id), {
        method: 'GET',
        headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-setup') }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn('loadMarketplaceMethods error', res.status, json);
        showToast('No se pudieron cargar los métodos de pago', false);
        setMethods([]);
        setAvailableGateways(restaurantGateways);
        return;
      }

      const envBucket = json?.environments?.[PAYMENT_METHODS_ENVIRONMENT];
      const arr = Array.isArray(envBucket?.payment_methods)
        ? envBucket.payment_methods
        : (Array.isArray(json?.payment_methods)
          ? json.payment_methods
          : (Array.isArray(json?.data?.payment_methods)
            ? json.data.payment_methods
            : (Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []))));

      const normalized = arr
        .map(normalizePaymentMethod)
        .filter((m) => (isApplePayGatewayName(m.gateway) ? applePayDeviceSupported : true));

      const gateways = resolveAvailableGateways(restaurantGateways, normalized);
      const filtered = normalized.filter((m) => gateways.includes(normalizeGateway(m.gateway)));
      const preferred = filtered.find((m) => Boolean(m.is_preferred)) || filtered[0] || null;

      setMethods(filtered);
      setAvailableGateways(gateways);
      setSelectedMethod(preferred);
      setShowOtherMethods(false);
    } catch (err) {
      console.warn('loadMarketplaceMethods exception', err);
      showToast('No se pudo conectar al servidor de pagos', false);
      setAvailableGateways([]);
    } finally {
      setLoadingMethods(false);
    }
  }, [buildPaymentMethodsUrl, getAuthHeaders, loadRestaurantPayments, restaurante_id, resolveUsuarioAppId, showToast, applePayDeviceSupported]);

  useEffect(() => {
    if (usuarioAppId) loadMarketplaceMethods();
  }, [usuarioAppId, loadMarketplaceMethods]);

  useEffect(() => {
    const unsub = navigation.addListener?.('focus', () => {
      if (usuarioAppId) loadMarketplaceMethods();
    });
    return () => {
      try { if (typeof unsub === 'function') unsub(); } catch (e) { }
    };
  }, [navigation, usuarioAppId, loadMarketplaceMethods]);

  useEffect(() => {
    return () => {
      pollingRef.current.stopRequested = true;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const configureStripeForAccount = async (accountId = null) => {
    if (!FIXED_STRIPE_PUBLISHABLE_KEY || FIXED_STRIPE_PUBLISHABLE_KEY === 'pk_test_REPLACE_ME') {
      throw new Error('Falta configurar FIXED_STRIPE_PUBLISHABLE_KEY');
    }
    await initStripe({
      publishableKey: FIXED_STRIPE_PUBLISHABLE_KEY,
      stripeAccountId: accountId || undefined,
    });
  };

  const pollSplitsUntilPaid = async (transactionId, timeoutMs = 120000, intervalMs = 3000) => {
    if (!transactionId) return { ok: false, reason: 'no_tx' };
    await ensureToken();
    const start = Date.now();
    pollingRef.current.stopRequested = false;
    pollingRef.current.lastResult = null;

    while (!pollingRef.current.stopRequested && Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(buildSplitsUrl(transactionId), {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const json = await res.json().catch(() => null);
        if (res.ok) {
          const splitsArr = Array.isArray(json?.splits) ? json.splits : (Array.isArray(json?.data?.splits) ? json.data.splits : []);
          const paidSplits = splitsArr.filter((s) => String(s.estado ?? '').toLowerCase() === 'paid');
          if (paidSplits.length > 0) {
            const paidCodes = paidSplits.map((s) => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
            return { ok: true, paidCodes, raw: json };
          }
          pollingRef.current.lastResult = { json };
        } else {
          pollingRef.current.lastResult = { status: res.status, body: json };
        }
      } catch (err) {
        pollingRef.current.lastResult = { exception: String(err) };
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return { ok: false, reason: 'timeout', last: pollingRef.current.lastResult };
  };

  const buildItemsForGateway = (baseAmount) => {
    if (comingFromEqualSplit) {
      return [
        {
          codigo_item: String(1),
          nombre_item: 'pago por partes iguales',
          cantidad: 1,
          precio_unitario: Number(baseAmount || 0),
        },
      ];
    }
    return (Array.isArray(items) ? items : []).map((it) => ({
      codigo_item: it.codigo_item ?? it.codigo ?? it.code ?? it.original_line_id ?? String(it.id ?? ''),
      nombre_item: it.name ?? it.nombre ?? '',
      cantidad: Number(it.qty ?? it.cantidad ?? 1) || 1,
      precio_unitario: Number(it.unitPrice ?? it.price ?? it.precio_item ?? it.precio ?? 0) || 0,
    }));
  };

  const resolveEqualSplitCharge = useCallback(async () => {
    const fallbackBase = Number(splitBaseForCharge || 0);
    const fallbackTip = tipPercent > 0 ? round2(fallbackBase * (tipPercent / 100)) : Number(tipAmount || 0);

    if (!comingFromEqualSplit || !sale_id || !sucursal_id) {
      const baseAmount = splitAmountByIndex(fallbackBase, groupPeopleCount, 0);
      const computedTip = tipPercent > 0 ? round2(baseAmount * (tipPercent / 100)) : fallbackTip;
      return { paidCount: 0, baseAmount, tipAmount: computedTip, totalAmount: round2(baseAmount + computedTip) };
    }

    try {
      await ensureToken();
      const res = await fetch(buildSaleSplitsUrl(sucursal_id, sale_id), {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const baseAmount = splitAmountByIndex(fallbackBase, groupPeopleCount, 0);
        const computedTip = tipPercent > 0 ? round2(baseAmount * (tipPercent / 100)) : fallbackTip;
        return { paidCount: 0, baseAmount, tipAmount: computedTip, totalAmount: round2(baseAmount + computedTip) };
      }

      const splitsArr = Array.isArray(json?.splits) ? json.splits : (Array.isArray(json?.data?.splits) ? json.data.splits : []);

      const paidEqualSplits = splitsArr.filter((s) => {
        const estado = String(s.estado ?? '').toLowerCase();
        if (estado !== 'paid') return false;
        const code = String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim();
        const name = String(s.nombre_item ?? s.nombre ?? s.name ?? '').toLowerCase();
        return code === '1' || /partes iguales|pago por partes iguales|pago por partes/i.test(name);
      });

      const paidCount = paidEqualSplits.length;
      const baseAmount = splitAmountByIndex(fallbackBase, groupPeopleCount, paidCount);
      const computedTip = tipPercent > 0 ? round2(baseAmount * (tipPercent / 100)) : fallbackTip;

      return { paidCount, baseAmount, tipAmount: computedTip, totalAmount: round2(baseAmount + computedTip) };
    } catch (err) {
      console.warn('resolveEqualSplitCharge error', err);
      const baseAmount = splitAmountByIndex(fallbackBase, groupPeopleCount, 0);
      const computedTip = tipPercent > 0 ? round2(baseAmount * (tipPercent / 100)) : fallbackTip;
      return { paidCount: 0, baseAmount, tipAmount: computedTip, totalAmount: round2(baseAmount + computedTip) };
    }
  }, [buildSaleSplitsUrl, comingFromEqualSplit, getAuthHeaders, groupPeopleCount, sale_id, splitBaseForCharge, sucursal_id, tipAmount, tipPercent]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!comingFromEqualSplit) { setEqualSplitCharge(null); return; }
      const info = await resolveEqualSplitCharge();
      if (mounted) setEqualSplitCharge(info);
    })();
    return () => { mounted = false; };
  }, [comingFromEqualSplit, resolveEqualSplitCharge]);

  const getChargeInfoForTransaction = async () => {
    if (comingFromEqualSplit) {
      const info = equalSplitCharge ?? await resolveEqualSplitCharge();
      setEqualSplitCharge(info);
      return info;
    }
    return {
      paidCount: 0,
      baseAmount: subtotalAmount,
      tipAmount: Number(tipAmount || 0),
      totalAmount: round2(subtotalAmount + Number(tipAmount || 0)),
    };
  };

  const createTransaction = async ({ gateway, savedMethod = null, walletType = null }) => {
    await ensureToken();
    const customer = await resolveCustomerForPayment();
    const chargeInfo = await getChargeInfoForTransaction();

    const isPaypal = normalizeGateway(gateway) === 'paypal';
    const body = {
      sucursal_id,
      gateway,
      monto_subtotal: Number(chargeInfo.baseAmount) || 0,
      monto_propina: Number(chargeInfo.tipAmount) || 0,
      moneda: moneda || 'MXN',
      usuario_app_id: customer.transactionUsuarioAppId,
      customer_data: { email: customer.email, nombre: customer.name },
      metadata: { mesa_id: mesa_id ?? null, venta_id: sale_id ?? '', equal_split_paid_count: chargeInfo.paidCount ?? 0 },
      mesa_id: mesa_id ?? null,
      items_pagados: buildItemsForGateway(chargeInfo.baseAmount),
      return_url: params.return_url ?? params.returnUrl ?? undefined,
      flow: isPaypal ? 'checkout' : 'elements',
    };

    if (isPaypal && paypalClientMetadataId) {
      body.paypal_client_metadata_id = paypalClientMetadataId;
    }

    if (walletType) body.wallet_type = walletType;

    if (savedMethod) {
      body.mobile_payment_method_id = savedMethod.id ?? savedMethod.mobile_payment_method_id ?? null;
      if (customer.usuarioAppId) body.usuario_app_uuid = customer.usuarioAppId;
    }

    const res = await fetch(buildTransactionUrl(), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.message || json?.error || `Error del servidor (${res.status})`);
    }

    const transactionId = json?.transaction_id ?? json?.data?.transaction_id ?? json?.transactionId ?? null;
    const clientSecret =
      json?.client_secret || json?.payment_intent_client_secret || json?.data?.client_secret ||
      json?.paymentIntentClientSecret || json?.clientSecret || null;
    const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
    const accountId = extractStripeAccountId(json);

    if (!transactionId) throw new Error('El servidor no devolvió transaction_id');

    try {
      if (sale_id) await AsyncStorage.setItem(`last_transaction_${sale_id}`, String(transactionId));
    } catch (e) { }

    return { transactionId, clientSecret, checkoutUrl, stripeAccountId: accountId, chargeInfo, raw: json };
  };

  const navigateSuccess = (amount = displayAmount) => {
    navigation.navigate('ConfirmacionPago', {
      amount: round2(amount),
      date: new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }),
    });
  };

  const showPaymentError = (title, message, details = null) => {
    navigation.navigate('ErrorPago', {
      title: String(title || 'Error'),
      message: String(message || 'Ocurrió un problema procesando el pago.'),
      details: details ? String(details) : null,
    });
  };

  const validateBeforePayment = () => {
    if (!apiHost) throw new Error('Falta api_host para crear el pago');
    if (!sucursal_id) throw new Error('Falta sucursal_id para crear el pago');
    if (!sale_id) throw new Error('Falta sale_id o venta_id para verificar el pago');
    if (!restaurante_id) throw new Error('Falta restaurante_id para validar métodos de pago');
    return true;
  };

  // --- NUEVO: verifica si hay método de PayPal guardado y muestra alerta si no ---
  const hasPaypalMethodSaved = () => {
    return methods.some((m) => normalizeGateway(m.gateway) === 'paypal' && !m.isPlaceholder);
  };

const showPaypalNotConfiguredAlert = () => {
  setPaypalNoticeVisible(true);
};

  const payWithSavedMethod = async (method) => {
    if (!method) {
      showToast('Selecciona un método de pago', false);
      return;
    }

    const gateway = normalizeGateway(method.gateway);
    if (!gateway) {
      showToast('El método seleccionado no tiene gateway', false);
      return;
    }

    if (isApplePayGatewayName(gateway)) {
      await payWithApplePay();
      return;
    }

    if (gateway === 'paypal') {
      // --- CAMBIO: si es placeholder (no configurado), muestra alerta en vez de intentar el pago ---
      if (method.isPlaceholder || !hasPaypalMethodSaved()) {
        showPaypalNotConfiguredAlert();
        return;
      }
      await payWithPaypal(method);
      return;
    }

    if (gateway !== 'stripe') {
      setNotice({
        visible: true,
        title: 'Método preparado',
        message: 'Este método ya queda preparado en la pantalla, pero aún falta conectar su flujo de pago.',
      });
      return;
    }

    setProcessing(true);
    try {
      validateBeforePayment();
      const tx = await createTransaction({ gateway, savedMethod: method });
      const poll = await pollSplitsUntilPaid(tx.transactionId);
      if (poll.ok) {
        navigateSuccess(tx.chargeInfo?.totalAmount);
      } else {
        showPaymentError('Pago pendiente', 'El servidor aún no refleja la venta como pagada.', JSON.stringify(poll));
      }
    } catch (err) {
      console.warn('payWithSavedMethod error', err);
      showPaymentError('Pago no procesado', err?.message || 'No se pudo procesar el pago con el método guardado.');
    } finally {
      setProcessing(false);
    }
  };

  const createSetupIntentOnServer = async () => {
    const userId = await resolveUsuarioAppId();
    if (!userId) throw new Error('Falta usuario_app_id');

    await ensureToken();
    const res = await fetch(buildSetupIntentUrl(), {
      method: 'POST',
      headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-setup') }),
      body: JSON.stringify({ usuario_app_id: userId, set_preferred: true, environment: PAYMENT_METHODS_ENVIRONMENT }),
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) throw new Error(json?.message || json?.error || `Error del servidor (${res.status})`);

    const clientSecret =
      json?.client_secret || json?.data?.client_secret ||
      json?.setup_intent_client_secret || json?.setupIntentClientSecret || null;

    if (!clientSecret) throw new Error('El servidor no devolvió client_secret');
    return { clientSecret, stripeAccountId: extractStripeAccountId(json), raw: json };
  };

  const confirmAndSaveCard = async () => {
    const setup = await createSetupIntentOnServer();
    const accountIdToUse = setup.stripeAccountId || stripeAccountId || null;
    await configureStripeForAccount(accountIdToUse);
    if (accountIdToUse) setStripeAccountId(accountIdToUse);

    const billingDetails = { email: userEmail, name: cardHolderName };
    const res = await confirmSetupIntent(setup.clientSecret, {
      paymentMethodType: 'Card',
      paymentMethodData: { billingDetails },
    });

    if (res.error) throw new Error(res.error.message || 'No se pudo guardar la tarjeta');
    return res.setupIntent;
  };

  const payWithManualStripeCard = async ({ save }) => {
    if (!manualCardDetails || !manualCardDetails.complete) {
      showToast('Ingresa los datos completos de la tarjeta', false);
      return;
    }
    if (!cardHolderName || !cardHolderName.trim()) {
      showToast('Ingresa el nombre del titular', false);
      return;
    }

    setProcessing(true);
    setSavingCard(Boolean(save));
    try {
      validateBeforePayment();
      await resolveCustomerForPayment();
      if (save) await confirmAndSaveCard();

      const tx = await createTransaction({ gateway: 'stripe' });
      if (!tx.clientSecret) throw new Error('El servidor no devolvió client_secret');

      const accountIdToUse = tx.stripeAccountId || stripeAccountId || null;
      await configureStripeForAccount(accountIdToUse);
      if (accountIdToUse) setStripeAccountId(accountIdToUse);

      const billingDetails = { email: userEmail, name: cardHolderName };
      const { error, paymentIntent } = await confirmPayment(tx.clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails },
      });

      if (error) throw new Error(error.message || 'Error al confirmar el pago con Stripe');

      const status = String(paymentIntent?.status ?? '').toLowerCase();
      if (['succeeded', 'requires_capture', 'processing', 'requires_confirmation'].includes(status)) {
        const poll = await pollSplitsUntilPaid(tx.transactionId);
        if (poll.ok) { navigateSuccess(tx.chargeInfo?.totalAmount); return; }
        showPaymentError('Pago pendiente', 'Stripe confirmó el pago, pero el servidor aún no refleja la venta como pagada.', JSON.stringify(poll));
        return;
      }

      showPaymentError('Pago no completado', `Estado del pago: ${String(paymentIntent?.status)}`, JSON.stringify(paymentIntent));
    } catch (err) {
      console.warn('payWithManualStripeCard error', err);
      showPaymentError('Pago no procesado', err?.message || 'No se pudo procesar el pago.');
    } finally {
      setProcessing(false);
      setSavingCard(false);
    }
  };

  const buildApplePayCartItems = (chargeInfo) => [
    { label: 'Total', amount: String(round2(chargeInfo?.totalAmount ?? displayAmount)) },
  ];

  const payWithApplePay = async () => {
    if (!applePayDeviceSupported) {
      showToast('Apple Pay no está disponible en este dispositivo', false);
      return;
    }

    setProcessing(true);
    try {
      validateBeforePayment();
      await resolveCustomerForPayment();

      const tx = await createTransaction({ gateway: 'stripe', walletType: 'apple_pay' });
      if (!tx.clientSecret) throw new Error('El servidor no devolvió client_secret');

      const accountIdToUse = tx.stripeAccountId || stripeAccountId || null;
      await configureStripeForAccount(accountIdToUse);
      if (accountIdToUse) setStripeAccountId(accountIdToUse);

      const { error, paymentIntent } = await confirmPlatformPayPayment(tx.clientSecret, {
        applePay: {
          cartItems: buildApplePayCartItems(tx.chargeInfo),
          merchantCountryCode: 'MX',
          currencyCode: moneda || 'MXN',
        },
      });

      if (error) throw new Error(error.message || 'Error al confirmar el pago con Apple Pay');

      const status = String(paymentIntent?.status ?? '').toLowerCase();
      if (['succeeded', 'requires_capture', 'processing', 'requires_confirmation'].includes(status)) {
        const poll = await pollSplitsUntilPaid(tx.transactionId);
        if (poll.ok) { navigateSuccess(tx.chargeInfo?.totalAmount); return; }
        showPaymentError('Pago pendiente', 'Apple Pay confirmó el pago, pero el servidor aún no refleja la venta como pagada.', JSON.stringify(poll));
        return;
      }

      showPaymentError('Pago no completado', `Estado del pago: ${String(paymentIntent?.status)}`, JSON.stringify(paymentIntent));
    } catch (err) {
      console.warn('payWithApplePay error', err);
      showPaymentError('Pago no procesado', err?.message || 'No se pudo procesar el pago con Apple Pay.');
    } finally {
      setProcessing(false);
    }
  };

  // flujo de pago con PayPal con AppState para reducir tiempo de espera
  const payWithPaypal = async (savedMethod = null) => {
    console.log('[PayPal] clientMetadataId:', paypalClientMetadataId);
    setProcessing(true);
    try {
      validateBeforePayment();
      const tx = await createTransaction({ gateway: 'paypal', savedMethod });

      if (tx.checkoutUrl) {
        await Linking.openURL(tx.checkoutUrl);
      }

      // Espera a que el usuario regrese a la app antes de iniciar el polling.
      // Si tarda más de 3 minutos en volver, arranca el polling de todas formas.
      await new Promise((resolve) => {
        const timeoutId = setTimeout(resolve, 180000);
        const subscription = AppState.addEventListener('change', (nextState) => {
          if (nextState === 'active') {
            clearTimeout(timeoutId);
            subscription.remove();
            resolve();
          }
        });
      });

      // Polling con intervalo corto (1500ms) porque el usuario ya aprobó en PayPal.
      const poll = await pollSplitsUntilPaid(tx.transactionId, 60000, 1500);
      if (poll.ok) {
        navigateSuccess(tx.chargeInfo?.totalAmount);
      } else {
        showPaymentError('Pago pendiente', 'El servidor aún no refleja la venta como pagada con PayPal.', JSON.stringify(poll));
      }
    } catch (err) {
      console.warn('payWithPaypal error', err);
      showPaymentError('Pago no procesado', err?.message || 'No se pudo procesar el pago con PayPal.');
    } finally {
      setProcessing(false);
    }
  };

  // --- CAMBIO: openManualGateway verifica si PayPal está configurado antes de proceder ---
  const openManualGateway = (gateway) => {
    const normalized = normalizeGateway(gateway);
    if (normalized === 'stripe' || normalized === 'card') {
      setManualCardDetails(null);
      setCardHolderName('');
      setScreen('manual-card');
      return;
    }
    if (isApplePayGatewayName(normalized)) {
      payWithApplePay();
      return;
    }
    if (normalized === 'paypal') {
      if (!hasPaypalMethodSaved()) {
        showPaypalNotConfiguredAlert();
        return;
      }
      payWithPaypal(null);
      return;
    }
    setNotice({
      visible: true,
      title: 'Método preparado',
      message: 'Este método se mostrará aquí cuando su integración esté lista para marketplace.',
    });
  };

  const getBrandMark = (brand) => {
    const lower = String(brand || '').toLowerCase();
    if (lower.includes('visa')) return { text: 'VISA', style: 'visa' };
    if (lower.includes('master')) return { text: 'MC', style: 'mastercard' };
    if (lower.includes('amex') || lower.includes('american')) return { text: 'AMEX', style: 'amex' };
    return { text: 'CARD', style: 'generic' };
  };

  const getBrandLabel = (brand) => {
    const clean = String(brand || '').trim();
    if (!clean) return 'Tarjeta';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const gatewayLabel = (gateway) => {
    const g = normalizeGateway(gateway);
    if (g === 'stripe' || g === 'card') return 'Tarjeta';
    if (g === 'paypal') return 'PayPal';
    if (isApplePayGatewayName(g)) return 'Apple Pay';
    if (g === 'openpay') return 'OpenPay';
    return g ? g.toUpperCase() : 'Método';
  };

  const renderCardNetworkLogos = () => (
    <View style={styles.cardNetworkRow}>
      <View style={styles.miniVisa}><Text style={styles.miniVisaText}>VISA</Text></View>
      <View style={styles.miniMastercard}>
        <View style={[styles.miniMastercardCircle, styles.miniMastercardLeft]} />
        <View style={[styles.miniMastercardCircle, styles.miniMastercardRight]} />
      </View>
      <View style={styles.miniAmex}><Text style={styles.miniAmexText}>AMEX</Text></View>
    </View>
  );

  const renderGatewayLogo = (gateway) => {
    const g = normalizeGateway(gateway);
    if (g === 'paypal') {
      return (
        <View style={styles.paypalLogo}>
          <Text style={styles.paypalTextPay}>Pay</Text>
          <Text style={styles.paypalTextPal}>Pal</Text>
        </View>
      );
    }
    if (isApplePayGatewayName(g)) {
      return (
        <View style={styles.applePayLogo}>
          <Ionicons name="logo-apple" size={22} color={COLORS.text} />
          <Text style={styles.applePayText}>Pay</Text>
        </View>
      );
    }
    return renderCardNetworkLogos();
  };

  const preferredMethod = methods.find((m) => Boolean(m.is_preferred)) || null;
  const hasMethods = methods.length > 0;
  const gatewaysForEmptyState = availableGateways;

  const methodGatewaySet = useMemo(
    () => new Set(methods.map((m) => normalizeGateway(m.gateway))),
    [methods]
  );

  const placeholderGatewayMethods = useMemo(() => {
    return availableGateways
      .filter((g) => {
        const norm = normalizeGateway(g);
        if (!norm) return false;
        if (norm === 'stripe' || norm === 'card') return false;
        if (methodGatewaySet.has(norm)) return false;
        return true;
      })
      .map((g) => {
        const norm = normalizeGateway(g);
        return {
          id: `placeholder-${norm}`,
          mobile_payment_method_id: null,
          external_payment_method_id: null,
          gateway: norm,
          brand: '',
          last4: '',
          exp_month: null,
          exp_year: null,
          is_preferred: false,
          status: '',
          isPlaceholder: true,
          raw: null,
        };
      });
  }, [availableGateways, methodGatewaySet]);

  const preferredKey = preferredMethod ? String(preferredMethod.id ?? preferredMethod.external_payment_method_id) : null;
  const otherMethodsList = useMemo(() => {
    const nonPreferred = methods.filter((m) => String(m.id ?? m.external_payment_method_id) !== preferredKey);
    return [...nonPreferred, ...placeholderGatewayMethods];
  }, [methods, placeholderGatewayMethods, preferredKey]);

  const renderBrandMark = (brand) => {
    const mark = getBrandMark(brand);
    return (
      <View style={[styles.brandMark, styles[`brandMark_${mark.style}`]]}>
        {mark.style === 'mastercard' ? (
          <View style={styles.mastercardLogo}>
            <View style={[styles.mastercardCircle, styles.mastercardCircleLeft]} />
            <View style={[styles.mastercardCircle, styles.mastercardCircleRight]} />
          </View>
        ) : (
          <Text style={[styles.brandText, mark.style === 'visa' && styles.brandTextVisa]}>{mark.text}</Text>
        )}
      </View>
    );
  };

  const renderMethodRow = (method) => {
    const methodId = method.id ?? method.external_payment_method_id;
    const selected = selectedMethod && String(selectedMethod.id ?? selectedMethod.external_payment_method_id) === String(methodId);
    const preferred = Boolean(method.is_preferred);
    const gateway = normalizeGateway(method.gateway);
    const isCardGateway = gateway === 'stripe' || gateway === 'card';
    const isPaypalGateway = gateway === 'paypal';

    if (isPaypalGateway) {
      return (
        <TouchableOpacity
          key={`${gateway}-${methodId}`}
          style={[styles.methodRow, selected && styles.methodRowSelected, styles.methodRowPaypal]}
          activeOpacity={0.88}
          onPress={() => setSelectedMethod(method)}
        >
          <View style={styles.paypalLogoFull}>
            <Text style={styles.paypalTextPay}>Pay</Text>
            <Text style={styles.paypalTextPal}>Pal</Text>
          </View>
          {preferred ? (
            <View style={styles.preferredChip}>
              <Ionicons name="star" size={11} color={COLORS.accent} style={{ marginRight: 3 }} />
              <Text style={styles.preferredChipText}>Predeterminado</Text>
            </View>
          ) : null}
          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? COLORS.accent : COLORS.muted} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      );
    }

    if (!isCardGateway) {
      return (
        <TouchableOpacity
          key={`${gateway}-${methodId}`}
          style={[styles.methodRow, selected && styles.methodRowSelected]}
          activeOpacity={0.88}
          onPress={() => setSelectedMethod(method)}
        >
          <View style={styles.gatewayLogoWrap}>{renderGatewayLogo(gateway)}</View>
          <View style={{ flex: 1 }}>
            <View style={styles.methodTitleLine}>
              <Text style={styles.methodTitle}>{gatewayLabel(gateway)}</Text>
              {preferred ? (
                <View style={styles.preferredChip}>
                  <Ionicons name="star" size={11} color={COLORS.accent} style={{ marginRight: 3 }} />
                  <Text style={styles.preferredChipText}>Predeterminado</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? COLORS.accent : COLORS.muted} />
        </TouchableOpacity>
      );
    }

    const last4 = method.last4 || '----';
    const exp = method.exp_month && method.exp_year ? `${method.exp_month}/${String(method.exp_year).slice(-2)}` : '--/--';

    return (
      <TouchableOpacity
        key={`${method.gateway}-${methodId}`}
        style={[styles.methodRow, selected && styles.methodRowSelected]}
        activeOpacity={0.88}
        onPress={() => setSelectedMethod(method)}
      >
        {renderBrandMark(method.brand)}
        <View style={{ flex: 1 }}>
          <View style={styles.methodTitleLine}>
            <Text style={styles.methodTitle}>.... {last4}</Text>
            {preferred ? (
              <View style={styles.preferredChip}>
                <Ionicons name="star" size={11} color={COLORS.accent} style={{ marginRight: 3 }} />
                <Text style={styles.preferredChipText}>Predeterminado</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.methodSub}>{getBrandLabel(method.brand)} - {gatewayLabel(method.gateway)} - Expira {exp}</Text>
        </View>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? COLORS.accent : COLORS.muted} />
      </TouchableOpacity>
    );
  };

  const renderGatewayOption = (gateway) => {
    const g = normalizeGateway(gateway);
    const isCard = g === 'stripe' || g === 'card';
    const isApplePay = isApplePayGatewayName(g);

    return (
      <TouchableOpacity key={g} style={styles.gatewayOption} activeOpacity={0.88} onPress={() => openManualGateway(g)}>
        <View style={styles.gatewayLogoWrap}>{renderGatewayLogo(g)}</View>
        <View style={styles.gatewayCopy}>
          <Text style={styles.gatewayTitle}>
            {isCard ? 'Tarjeta de crédito o débito' : isApplePay ? 'Apple Pay' : gatewayLabel(g)}
          </Text>
          <Text style={styles.gatewaySub}>
            {isCard ? 'Paga con una tarjeta bancaria.' : isApplePay ? 'Paga rápido y seguro con Apple Pay.' : 'Disponible en este restaurante.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={COLORS.accent} />
      </TouchableOpacity>
    );
  };

  const logoWidth = clamp(Math.round(wp(28)), 80, 140);
  const restaurantImgSize = clamp(Math.round(wp(16)), 48, 96);
  const rightColMaxWidth = Math.round(Math.min(Math.max(wp(36), 120), 220));
  const totalNumberFont = clamp(rf(7.5), 20, 36);
  const totalCurrencyFont = clamp(rf(2.8), 12, 16);

  const renderCheckoutScreen = () => (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top || 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={[styles.header, { paddingHorizontal: pagePadding }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="chevron-back" size={26} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagar</Text>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 130 }}>
        <LinearGradient
          colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.45, 1]}
          style={[styles.headerGradient, { paddingHorizontal: Math.max(14, wp(5)), paddingTop: Math.max(12, hp(2)), paddingBottom: Math.max(20, hp(3)), borderBottomRightRadius: Math.max(28, wp(8)) }]}
        >
          <View style={styles.gradientRow}>
            <View style={styles.leftCol}>
              <Image source={TABTRACK_LOGO} style={[styles.tabtrackLogo, { width: logoWidth, height: Math.round(logoWidth * 0.32), marginBottom: Math.max(8, hp(1)) }]} resizeMode="contain" />
              <View style={[styles.logoWrap, { marginTop: Math.max(6, hp(0.5)), padding: Math.max(6, wp(1.5)), borderRadius: Math.max(8, wp(2)) }]}>
                <Image
                  source={restaurantImage ? { uri: restaurantImage } : DEFAULT_RESTAURANT}
                  style={[styles.restaurantImage, { width: restaurantImgSize, height: restaurantImgSize, borderRadius: Math.round(restaurantImgSize * 0.16) }]}
                />
              </View>
            </View>
            <View style={[styles.rightCol, { maxWidth: rightColMaxWidth, marginRight: Math.max(12, wp(3)) }]}>
              <Text style={[styles.totalLabel, { fontSize: clamp(rf(2.6), 12, 16) }]}>Total</Text>
              <View style={[styles.totalRow, { alignItems: 'flex-end' }]}>
                <Text style={[styles.totalNumber, { fontSize: totalNumberFont, lineHeight: Math.round(totalNumberFont * 1.05) }]}>{formatMoney(displayAmount)}</Text>
                <Text style={[styles.totalCurrency, { fontSize: totalCurrencyFont, marginLeft: Math.max(6, wp(1.6)) }]}>{moneda ?? 'MXN'}</Text>
              </View>
              <View style={styles.rightThanks}>
                <Text style={[styles.thanksText, { fontSize: clamp(rf(2.6), 12, 16) }]}>¡Gracias por tu visita!</Text>
                <Text style={[styles.itemsTipText, { fontSize: clamp(rf(2.2), 11, 13) }]}>
                  {items.length} {items.length === 1 ? 'item' : 'items'} · Propina {formatMoney(displayCharge.tipAmount)} {moneda}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: pagePadding }}>
          <View style={styles.securityLine}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.accent} />
            <Text style={styles.securityText}>Pago seguro. Solo verás métodos disponibles para este restaurante.</Text>
          </View>

          {loadingMethods ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loadingText}>Preparando métodos de pago...</Text>
            </View>
          ) : hasMethods ? (
            <>
              {preferredMethod ? (
                <View style={styles.featureBlock}>
                  <Text style={styles.blockTitle}>Método de pago</Text>
                  {renderMethodRow(preferredMethod)}
                  {!showOtherMethods ? (
                    <TouchableOpacity style={styles.linkRow} onPress={() => setShowOtherMethods(true)}>
                      <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.accent} />
                      <Text style={styles.linkRowText}>Seleccionar otro método</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {showOtherMethods || !preferredMethod ? (
                <View style={styles.featureBlock}>
                  <View style={styles.blockHeader}>
                    <View>
                      <Text style={styles.blockTitle}>{preferredMethod ? 'Otros métodos' : 'Elige cómo pagar'}</Text>
                      <Text style={styles.blockSub}>Selecciona un método y confirma el pago.</Text>
                    </View>
                  </View>
                  {otherMethodsList.map(renderMethodRow)}
                  <TouchableOpacity style={styles.linkRow} onPress={() => openManualGateway('stripe')}>
                    <Ionicons name="add" size={18} color={COLORS.accent} />
                    <Text style={styles.linkRowText}>Usar una tarjeta nueva</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <LinearGradient
                colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.9}
                  onPress={() => payWithSavedMethod(selectedMethod)}
                  disabled={processing || !selectedMethod}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Pagar {totalText}</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </>
          ) : (
            <View style={styles.featureBlock}>
              <Text style={styles.blockTitle}>Elige cómo pagar</Text>
              <Text style={styles.blockSub}>
                {gatewaysForEmptyState.length
                  ? 'No tienes métodos guardados disponibles para este restaurante.'
                  : 'Por ahora este restaurante no tiene métodos de pago en línea disponibles.'}
              </Text>
              {gatewaysForEmptyState.length ? gatewaysForEmptyState.map(renderGatewayOption) : (
                <View style={styles.emptyPaymentsBox}>
                  <Ionicons name="card-outline" size={24} color={COLORS.muted} />
                  <Text style={styles.emptyPaymentsText}>Puedes regresar e intentar más tarde o consultar con el restaurante.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <NoticeModal notice={notice} onClose={() => setNotice((prev) => ({ ...prev, visible: false }))} />
      <View style={toastStyles.container} pointerEvents="box-none">
        <Toast message={toastMsg} visible={toastVisible} success={toastSuccess} />
      </View>
    </SafeAreaView>
  );

  const renderManualCardScreen = () => (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top || 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={[styles.header, { paddingHorizontal: pagePadding }]}>
        <TouchableOpacity onPress={() => setScreen('checkout')} style={styles.headerIconButton}>
          <Ionicons name="chevron-back" size={26} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva tarjeta</Text>
        <View style={styles.headerIconButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.manualContent, { paddingHorizontal: pagePadding, paddingBottom: Math.max(insets.bottom, 16) + 210 }]} keyboardShouldPersistTaps="always">
          <View style={styles.cardPreview}>
            <View style={styles.cardPreviewTop}>
              <Text style={styles.cardPreviewBrand}>{getBrandLabel(manualCardDetails?.brand)}</Text>
              <View style={styles.cardPreviewChip} />
            </View>
            <Text style={styles.cardPreviewNumber}>
              {manualCardDetails?.last4 ? `....  ....  ....  ${manualCardDetails.last4}` : '....  ....  ....  ....'}
            </Text>
            <View style={styles.cardPreviewBottom}>
              <View>
                <Text style={styles.cardPreviewLabel}>Titular</Text>
                <Text style={styles.cardPreviewValue}>{cardHolderName || 'Nombre del titular'}</Text>
              </View>
              <View>
                <Text style={styles.cardPreviewLabel}>Expira</Text>
                <Text style={styles.cardPreviewValue}>
                  {manualCardDetails?.expiryMonth && manualCardDetails?.expiryYear
                    ? `${String(manualCardDetails.expiryMonth).padStart(2, '0')}/${String(manualCardDetails.expiryYear).slice(-2)}`
                    : 'MM/AA'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.featureBlock}>
            <Text style={styles.blockTitle}>Datos de la tarjeta</Text>
            <Text style={styles.blockSub}>Puedes pagar ahora y, si quieres, guardarla para futuros pagos.</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre del titular"
                value={cardHolderName}
                onChangeText={setCardHolderName}
                placeholderTextColor="#9a9a9a"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#9a9a9a"
              />
            </View>
            <View style={styles.stripeFieldWrap}>
              <CardField
                postalCodeEnabled={false}
                placeholders={{ number: '4242 4242 4242 4242' }}
                cardStyle={{
                  borderRadius: 8,
                  backgroundColor: COLORS.surface,
                  textColor: COLORS.text,
                  placeholderColor: '#9a9a9a',
                }}
                style={{ width: '100%', height: 52 }}
                onCardChange={setManualCardDetails}
              />
            </View>
            <View style={styles.saveRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saveRowTitle}>Guardar tarjeta</Text>
                <Text style={styles.saveRowSub}>Se guardará como método predeterminado si el pago es exitoso.</Text>
              </View>
              <Switch
                value={saveCard}
                onValueChange={setSaveCard}
                trackColor={{ false: '#d8d4ce', true: COLORS.accent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingHorizontal: pagePadding, paddingBottom: Math.max(insets.bottom, 16) + 78 }]}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('checkout')} disabled={processing}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButtonFooter} onPress={() => payWithManualStripeCard({ save: saveCard })} disabled={processing || savingCard}>
            {processing || savingCard ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonTextWhite}>Pagar</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <View style={toastStyles.container} pointerEvents="box-none">
        <Toast message={toastMsg} visible={toastVisible} success={toastSuccess} />
      </View>
    </SafeAreaView>
  );

return (
  <StripeProvider publishableKey={FIXED_STRIPE_PUBLISHABLE_KEY} stripeAccountId={stripeAccountId || undefined}>
    {screen === 'manual-card' ? renderManualCardScreen() : renderCheckoutScreen()}
    <PaypalNotConfiguredModal
      visible={paypalNoticeVisible}
      onCancel={() => setPaypalNoticeVisible(false)}
      onGoToPayments={() => {
        setPaypalNoticeVisible(false);
        navigation.navigate('Payments');
      }}
    />
  </StripeProvider>
);
}

function NoticeModal({ notice, onClose }) {
  return (
    <Modal visible={notice.visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.noticeBackdrop}>
        <View style={styles.noticeBox}>
          <View style={styles.noticeIcon}>
            <Ionicons name="information-circle-outline" size={26} color={COLORS.accent} />
          </View>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeMessage}>{notice.message}</Text>
          <TouchableOpacity style={styles.noticeButton} onPress={onClose}>
            <Text style={styles.noticeButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
function PaypalNotConfiguredModal({ visible, onCancel, onGoToPayments }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.noticeBackdrop}>
        <View style={styles.noticeBox}>
          <View style={styles.noticeIcon}>
            <Ionicons name="information-circle-outline" size={26} color={COLORS.accent} />
          </View>
          <Text style={styles.noticeTitle}>PayPal no configurado</Text>
          <Text style={styles.noticeMessage}>
            Para pagar con PayPal primero debes vincular tu cuenta desde la sección de métodos de pago en tu perfil.
          </Text>
          <View style={styles.paypalAlertButtonsRow}>
            <TouchableOpacity
              style={styles.paypalAlertCancelButton}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={styles.paypalAlertCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paypalAlertConfirmButton}
              onPress={onGoToPayments}
              activeOpacity={0.85}
            >
              <Text style={styles.paypalAlertConfirmText}>Ir a métodos de pago</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bg },
  headerIconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: COLORS.text, fontSize: 17, fontWeight: '900' },
  headerGradient: { width: '100%', overflow: 'hidden' },
  gradientRow: { flexDirection: 'row', justifyContent: 'space-between' },
  leftCol: { flexDirection: 'column', alignItems: 'center' },
  tabtrackLogo: {},
  logoWrap: { backgroundColor: 'rgba(255,255,255,0.12)' },
  restaurantImage: { backgroundColor: '#fff' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 },
  totalLabel: { color: 'rgba(255,255,255,0.95)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  totalNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
  totalCurrency: { color: '#fff', marginLeft: 6, marginBottom: 3, opacity: 0.95 },
  rightThanks: { marginTop: 10, alignItems: 'flex-end' },
  thanksText: { color: '#fff', fontWeight: '700' },
  itemsTipText: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  securityLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginTop: 16, marginBottom: 10 },
  securityText: { color: COLORS.muted, fontSize: 12, marginLeft: 6, flex: 1 },
  loadingBox: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 20, padding: 22, alignItems: 'center' },
  loadingText: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  featureBlock: { marginTop: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, backgroundColor: COLORS.surface, padding: 14 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  blockSub: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 10 },
  methodRow: { width: '100%', borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 13, marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface },
  methodRowSelected: { borderColor: COLORS.text },
  methodRowPaypal: { backgroundColor: '#FFC439', borderColor: '#FFC439', justifyContent: 'space-between', paddingHorizontal: 16 },
  paypalLogoFull: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  brandMark: { width: 52, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1 },
  brandMark_visa: { backgroundColor: '#ffffff', borderColor: '#d8dde8' },
  brandMark_mastercard: { backgroundColor: '#ffffff', borderColor: '#e8ded3' },
  brandMark_amex: { backgroundColor: '#ffffff', borderColor: '#d8e7f2' },
  brandMark_generic: { backgroundColor: COLORS.soft, borderColor: COLORS.border },
  brandText: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  brandTextVisa: { color: '#1a4fb7', fontSize: 13, fontStyle: 'italic', letterSpacing: 0.5 },
  mastercardLogo: { width: 32, height: 20, alignItems: 'center', justifyContent: 'center' },
  mastercardCircle: { position: 'absolute', width: 19, height: 19, borderRadius: 10 },
  mastercardCircleLeft: { left: 3, backgroundColor: '#eb001b', opacity: 0.92 },
  mastercardCircleRight: { right: 3, backgroundColor: '#f79e1b', opacity: 0.92 },
  methodTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  methodTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginRight: 6 },
  methodSub: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  preferredChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef4ff', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  preferredChipText: { color: COLORS.accent, fontSize: 10, fontWeight: '900' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.text, borderRadius: 14, height: 46, marginTop: 12, backgroundColor: '#f7fbff' },
  linkRowText: { color: COLORS.accent, fontSize: 13, fontWeight: '900', marginLeft: 6 },
  gatewayOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, marginTop: 10, backgroundColor: COLORS.surface },
  gatewayLogoWrap: { minWidth: 112, minHeight: 42, marginRight: 10, justifyContent: 'center' },
  gatewayCopy: { flex: 1, minWidth: 0 },
  cardNetworkRow: { flexDirection: 'row', alignItems: 'center' },
  miniVisa: { width: 42, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#d8dde8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginRight: 6 },
  miniVisaText: { color: '#1a4fb7', fontSize: 11, fontWeight: '900', fontStyle: 'italic' },
  miniMastercard: { width: 42, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#e8ded3', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginRight: 6 },
  miniMastercardCircle: { position: 'absolute', width: 16, height: 16, borderRadius: 8 },
  miniMastercardLeft: { left: 10, backgroundColor: '#eb001b', opacity: 0.92 },
  miniMastercardRight: { right: 10, backgroundColor: '#f79e1b', opacity: 0.92 },
  miniAmex: { width: 46, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#d8e7f2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  miniAmexText: { color: COLORS.text, fontSize: 10, fontWeight: '900' },
  paypalLogo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFC439' },
  paypalTextPay: { color: '#003087', fontSize: 17, fontWeight: '900', fontStyle: 'italic' },
  paypalTextPal: { color: '#009cde', fontSize: 17, fontWeight: '900', fontStyle: 'italic' },
  applePayLogo: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#ffffff' },
  applePayText: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginLeft: 2 },
  gatewayTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900' },
  gatewaySub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  emptyPaymentsBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 10, backgroundColor: '#eef4ff' },
  emptyPaymentsText: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  primaryButtonGradient: { height: 52, borderRadius: 16, marginTop: 16, overflow: 'hidden' },
  primaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  manualContent: { paddingTop: 10 },
  cardPreview: { minHeight: 190, borderRadius: 24, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: 20, justifyContent: 'space-between' },
  cardPreviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPreviewBrand: { color: COLORS.text, fontSize: 15, fontWeight: '900' },
  cardPreviewChip: { width: 34, height: 25, borderRadius: 8, backgroundColor: '#f0d89f' },
  cardPreviewNumber: { color: COLORS.text, fontSize: 23, fontWeight: '800', letterSpacing: 1 },
  cardPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardPreviewValue: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginTop: 4, maxWidth: 180 },
  stripeFieldWrap: { width: '100%', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 10, marginTop: 14 },
  inputWrap: { height: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 10 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '700', paddingVertical: 0 },
  saveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveRowTitle: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  saveRowSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 12, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  secondaryButton: { flex: 1, height: 50, borderRadius: 15, borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  secondaryButtonText: { color: COLORS.accent, fontSize: 14, fontWeight: '900' },
  primaryButtonFooter: { flex: 1.35, height: 50, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  primaryButtonTextWhite: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  noticeBackdrop: { flex: 1, backgroundColor: 'rgba(10,10,10,0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  noticeBox: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, alignItems: 'center' },
  noticeIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  noticeTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  noticeMessage: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  noticeButton: { width: '100%', height: 46, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  noticeButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  paypalAlertButtonsRow: { flexDirection: 'row', width: '100%', marginTop: 16 },
paypalAlertCancelButton: {
  flex: 1,
  height: 46,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: COLORS.border,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
  backgroundColor: COLORS.surface,
},
paypalAlertCancelText: { color: COLORS.muted, fontSize: 14, fontWeight: '900' },
paypalAlertConfirmButton: {
  flex: 1,
  height: 46,
  borderRadius: 14,
  backgroundColor: COLORS.accent,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},
paypalAlertConfirmText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

const toastStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-start', paddingTop: Platform.OS === 'ios' ? 84 : 64, zIndex: 9999, elevation: 9999 },
  toast: { minWidth: 160, maxWidth: '86%', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 8, alignItems: 'center' },
  toastText: { fontSize: 13, color: COLORS.text, textAlign: 'center', fontWeight: '700' },
});
 