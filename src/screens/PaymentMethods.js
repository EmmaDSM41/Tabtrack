import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
  PixelRatio,
  Animated,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { StripeProvider, CardField, confirmSetupIntent, initStripe } from '@stripe/stripe-react-native';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const BLUE = '#0046ff';
const SOFT_BLUE = '#dbe8ff';
const API_HOST_CONST = 'https://api.tab-track.com';

// PON AQUI TU PUBLIC KEY FIJA DE STRIPE.
const FIXED_STRIPE_PUBLISHABLE_KEY = 'pk_test_51RJbpaQaBqb9H2oSU1iY1gSZnZDsZmda42KJkP4d4Ta3RVyte3lcmyzC4WsoHfYJewiuOsef4tdeaIaqBUJbqtDL00K6T8g3bt';

const AS_KEYS = {
  USER_EMAIL: 'user_email',
  USER_MAIL: 'user_mail',
  USER_FULLNAME: 'user_fullname',
  USER_NOMBRE: 'user_nombre',
  USER_APELLIDO: 'user_apellido',
  USER_USUARIO_APP_ID: 'user_usuario_app_id',
  USER_PROFILE_URL: 'user_profile_url',
};

function SmallToast({ message, visible, success }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 180,
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
          borderColor: success ? '#e6f9ee' : '#f0f0f0',
        },
      ]}
    >
      <Text style={[toastStyles.toastText, success && { color: '#0a6b2b' }]}>{message}</Text>
    </Animated.View>
  );
}

export default function PaymentMethods({ navigation, route }) {
  const params = route?.params ?? {};
  const { width: dimWidth, height: dimHeight } = Dimensions.get('window');
  const wp = p => Math.round((Number(p) / 100) * dimWidth);
  const hp = p => Math.round((Number(p) / 100) * dimHeight);
  const rf = p => Math.round(PixelRatio.roundToNearestPixel((Number(p) / 100) * dimWidth));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const headerPaddingVertical = useMemo(() => clamp(hp(3.5), 12, 36), [dimHeight]);
  const headerPaddingHorizontal = useMemo(() => clamp(wp(4), 12, 28), [dimWidth]);
  const avatarSize = useMemo(() => clamp(Math.round(Math.min(dimWidth * 0.08, 40)), 28, 48), [dimWidth]);
  const modalWidth = useMemo(() => Math.min(Math.round(dimWidth * 0.88), 520), [dimWidth]);
  const iconSize = useMemo(() => clamp(Math.round(rf(2.6)), 16, 26), [dimWidth]);

  const apiHost = params.api_host ?? API_HOST_CONST;
  const apiToken = params.api_token ?? TOKEN ?? '';

  const [username, setUsername] = useState('Usuario');
  const [profileUrl, setProfileUrl] = useState(null);
  const [userEmail, setUserEmail] = useState(params.userEmail ?? params.user_email ?? '');
  const [userFullname, setUserFullname] = useState(params.userFullname ?? params.user_fullname ?? '');
  const [usuarioAppId, setUsuarioAppId] = useState(params.usuario_app_id ?? params.user_usuario_app_id ?? '');

  const [stripeCards, setStripeCards] = useState([]);
  const [openpayCards, setOpenpayCards] = useState([]);
  const [loadingStripeCards, setLoadingStripeCards] = useState(false);
  const [loadingOpenpayCards, setLoadingOpenpayCards] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [preferredCardId, setPreferredCardId] = useState(null);
  const [selectedPreferred, setSelectedPreferred] = useState({ stripe: null, openpay: null });
  const [settingPreferredId, setSettingPreferredId] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [gatewayToDelete, setGatewayToDelete] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('stripe');
  const [stripeCardDetails, setStripeCardDetails] = useState(null);
  const [savePreferred, setSavePreferred] = useState(true);
  const [stripeAccountId, setStripeAccountId] = useState(params.stripe_account_id || params.stripeAccountId || null);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastSuccess, setToastSuccess] = useState(false);
  const toastTimeoutRef = useRef(null);

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
  const buildSetupIntentUrl = useCallback(() => `${hostBase()}/api/mobileapp/payment-methods/stripe/setup-intent`, [hostBase]);
  const buildListPaymentMethodsUrl = useCallback((gateway, userId) => `${hostBase()}/api/mobileapp/payment-methods?gateway=${encodeURIComponent(gateway)}&usuario_app_id=${encodeURIComponent(userId)}`, [hostBase]);
  const buildDeletePaymentMethodUrl = useCallback((cardId, gateway) => `${hostBase()}/api/mobileapp/payment-methods/${encodeURIComponent(cardId)}?gateway=${encodeURIComponent(gateway)}`, [hostBase]);
  const buildPreferredPaymentMethodUrl = useCallback((cardId) => `${hostBase()}/api/mobileapp/payment-methods/${encodeURIComponent(cardId)}/preferred`, [hostBase]);

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

  const genIdempotencyKey = (prefix = 'pm-request') => {
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
    if (!FIXED_STRIPE_PUBLISHABLE_KEY || FIXED_STRIPE_PUBLISHABLE_KEY === 'pk_test_REPLACE_ME') {
      throw new Error('Falta configurar FIXED_STRIPE_PUBLISHABLE_KEY');
    }
    await initStripe({
      publishableKey: FIXED_STRIPE_PUBLISHABLE_KEY,
      stripeAccountId: accountId || undefined,
    });
  };

  const normalizePaymentMethod = (pm) => ({
    id: pm.id ?? pm.mobile_payment_method_id ?? pm.payment_method_id ?? null,
    external_payment_method_id: pm.external_payment_method_id ?? pm.external_id ?? pm.external_pm_id ?? null,
    brand: pm.brand ?? pm.card_brand ?? pm.gateway_brand ?? '',
    last4: pm.last4 ?? pm.card_last4 ?? '',
    exp_month: pm.exp_month ?? pm.card_exp_month ?? null,
    exp_year: pm.exp_year ?? pm.card_exp_year ?? null,
    is_preferred: pm.is_preferred ?? pm.preferred ?? false,
    status: pm.status ?? pm.state ?? '',
    gateway: pm.gateway ?? '',
    raw: pm,
  });

  const resolveUsuarioAppId = useCallback(async () => {
    if (usuarioAppId) return usuarioAppId;
    const stored = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);
    if (stored) {
      setUsuarioAppId(stored);
      return stored;
    }
    return '';
  }, [usuarioAppId]);

  const loadPaymentMethods = useCallback(async (gateway) => {
    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontró usuario_app_id', false);
      return;
    }

    if (gateway === 'stripe') setLoadingStripeCards(true);
    if (gateway === 'openpay') setLoadingOpenpayCards(true);

    try {
      await ensureToken();
      const res = await fetch(buildListPaymentMethodsUrl(gateway, userId), {
        method: 'GET',
        headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-setup') }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn(`loadPaymentMethods ${gateway} error`, res.status, json);
        if (gateway === 'openpay') {
          setOpenpayCards([]);
          return;
        }
        showToast(`No se pudieron cargar tarjetas ${gateway}`, false);
        return;
      }

      const arr = Array.isArray(json?.payment_methods)
        ? json.payment_methods
        : (Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []));
      const normalized = arr.map(normalizePaymentMethod);

      if (gateway === 'stripe') setStripeCards(normalized);
      if (gateway === 'openpay') setOpenpayCards(normalized);
    } catch (err) {
      console.warn(`loadPaymentMethods ${gateway} exception`, err);
      if (gateway === 'stripe') showToast('No se pudo conectar al servidor de tarjetas', false);
    } finally {
      if (gateway === 'stripe') setLoadingStripeCards(false);
      if (gateway === 'openpay') setLoadingOpenpayCards(false);
    }
  }, [buildListPaymentMethodsUrl, getAuthHeaders, resolveUsuarioAppId, showToast]);

  const loadAllPaymentMethods = useCallback(async () => {
    await loadPaymentMethods('stripe');
    await loadPaymentMethods('openpay');
  }, [loadPaymentMethods]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const nombre = await AsyncStorage.getItem(AS_KEYS.USER_NOMBRE);
        const apellido = await AsyncStorage.getItem(AS_KEYS.USER_APELLIDO);
        const full = await AsyncStorage.getItem(AS_KEYS.USER_FULLNAME);
        const email = await AsyncStorage.getItem(AS_KEYS.USER_EMAIL) || await AsyncStorage.getItem(AS_KEYS.USER_MAIL);
        const userId = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);
        const cachedUrl = await AsyncStorage.getItem(AS_KEYS.USER_PROFILE_URL);

        const displayName = full || `${nombre ?? ''} ${apellido ?? ''}`.trim() || 'Usuario';
        if (!mounted) return;

        setUsername(displayName);
        if (!userFullname) setUserFullname(displayName);
        if (!userEmail && email) setUserEmail(email);
        if (!usuarioAppId && userId) setUsuarioAppId(userId);
        if (cachedUrl) setProfileUrl(cachedUrl);
      } catch (e) {
        console.warn('Error leyendo AsyncStorage', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (usuarioAppId) loadAllPaymentMethods();
  }, [usuarioAppId, loadAllPaymentMethods]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const openAddCardModal = (gateway) => {
    setSelectedGateway(gateway);
    setSavePreferred(true);
    setStripeCardDetails(null);
    setModalVisible(true);
  };

  const createStripeSetupIntent = async () => {
    const userId = await resolveUsuarioAppId();
    if (!userId) throw new Error('Falta usuario_app_id');

    await ensureToken();
    const res = await fetch(buildSetupIntentUrl(), {
      method: 'POST',
      headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-setup') }),
      body: JSON.stringify({
        usuario_app_id: userId,
        set_preferred: Boolean(savePreferred),
      }),
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.message || json?.error || `Error del servidor (${res.status})`);
    }

    const clientSecret =
      json?.client_secret ||
      json?.data?.client_secret ||
      json?.setup_intent_client_secret ||
      json?.setupIntentClientSecret ||
      null;

    if (!clientSecret) throw new Error('El servidor no devolvió client_secret');
    return { clientSecret, stripeAccountId: extractStripeAccountId(json), raw: json };
  };

  const saveStripeCard = async () => {
    if (!stripeCardDetails || !stripeCardDetails.complete) {
      showToast('Ingresa los datos de la tarjeta', false);
      return;
    }

    setSavingCard(true);
    try {
      const setupResp = await createStripeSetupIntent();
      const accountIdToUse = setupResp.stripeAccountId || stripeAccountId || null;
      await configureStripeForAccount(accountIdToUse);
      if (accountIdToUse) setStripeAccountId(accountIdToUse);

      const billingDetails = {
        email: userEmail || '',
        name: userFullname || username || '',
      };

      const result = await confirmSetupIntent(setupResp.clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails },
      });

      if (result.error) {
        showToast(result.error.message || 'No se pudo guardar la tarjeta', false);
        return;
      }

      setModalVisible(false);
      showToast('Tarjeta Stripe guardada', true);
      await loadPaymentMethods('stripe');
    } catch (err) {
      console.warn('saveStripeCard error', err);
      showToast(err?.message || 'No se pudo guardar la tarjeta', false);
    } finally {
      setSavingCard(false);
    }
  };

  const saveOpenpayCard = async () => {
    setModalVisible(false);
    showToast('OpenPay todavía no está listo en backend', false, 2200);
  };

  const onSaveCard = () => {
    if (selectedGateway === 'stripe') {
      saveStripeCard();
      return;
    }
    saveOpenpayCard();
  };

  const selectPreferredCandidate = (card, gateway) => {
    const cardId = card.id ?? card.mobile_payment_method_id ?? card.external_payment_method_id;
    if (!cardId) {
      showToast('No se encontró el id de la tarjeta', false);
      return;
    }
    setSelectedPreferred(prev => ({ ...prev, [gateway]: card }));
    showToast('Tarjeta seleccionada. Presiona Guardar preferida.', true, 1800);
  };

  const setPreferredCard = async (card, gateway) => {
    if (gateway !== 'stripe') {
      showToast('Preferida OpenPay aún no está disponible', false, 2200);
      return;
    }

    const cardId = card.id ?? card.mobile_payment_method_id ?? card.external_payment_method_id;
    if (!cardId) {
      showToast('No se encontró el id de la tarjeta', false);
      return;
    }

    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontró usuario_app_id', false);
      return;
    }

    setSettingPreferredId(cardId);
    try {
      await ensureToken();
      const res = await fetch(buildPreferredPaymentMethodUrl(cardId), {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-preferred') }),
        body: JSON.stringify({ usuario_app_id: userId }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn('setPreferredCard server error', res.status, json);
        showToast(`No se pudo marcar como preferida (${res.status})`, false);
        return;
      }

      setPreferredCardId(cardId);
      setStripeCards(prev => prev.map(item => ({
        ...item,
        is_preferred: String(item.id) === String(cardId),
      })));
      setSelectedPreferred(prev => ({ ...prev, [gateway]: null }));
      showToast('Tarjeta marcada como preferida', true);
      await loadPaymentMethods('stripe');
    } catch (err) {
      console.warn('setPreferredCard exception', err);
      showToast('Error al marcar preferida', false);
    } finally {
      setSettingPreferredId(null);
    }
  };

  const savePreferredSelection = async (gateway) => {
    const card = selectedPreferred[gateway];
    if (!card) {
      showToast('Selecciona una tarjeta primero', false);
      return;
    }
    await setPreferredCard(card, gateway);
  };

  const deleteCard = async (card, gateway) => {
    if (gateway !== 'stripe') {
      showToast('Eliminar OpenPay aún no está disponible', false, 2200);
      return;
    }

    const cardId = card.id ?? card.mobile_payment_method_id ?? card.external_payment_method_id;
    if (!cardId) {
      showToast('No se encontró el id de la tarjeta', false);
      return;
    }

    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontró usuario_app_id', false);
      return;
    }

    setDeletingCardId(cardId);
    try {
      await ensureToken();
      const res = await fetch(buildDeletePaymentMethodUrl(cardId, gateway), {
        method: 'DELETE',
        headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-delete') }),
        body: JSON.stringify({ usuario_app_id: userId }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn('deleteCard server error', res.status, json);
        showToast(`No se pudo eliminar tarjeta (${res.status})`, false);
        return;
      }

      setStripeCards(prev => prev.filter(item => String(item.id) !== String(cardId)));
      setSelectedPreferred(prev => ({ ...prev, [gateway]: null }));
      showToast('Tarjeta eliminada', true);
    } catch (err) {
      console.warn('deleteCard exception', err);
      showToast('Error al eliminar tarjeta', false);
    } finally {
      setDeletingCardId(null);
    }
  };

  const confirmDeleteCard = (card, gateway) => {
    setCardToDelete(card);
    setGatewayToDelete(gateway);
    setDeleteConfirmVisible(true);
  };

  const closeDeleteConfirm = () => {
    if (deletingCardId) return;
    setDeleteConfirmVisible(false);
    setCardToDelete(null);
    setGatewayToDelete(null);
  };

  const performConfirmedDelete = async () => {
    if (!cardToDelete || !gatewayToDelete) return;
    await deleteCard(cardToDelete, gatewayToDelete);
    setDeleteConfirmVisible(false);
    setCardToDelete(null);
    setGatewayToDelete(null);
  };

  const renderCardItem = (card, gateway) => {
    const cardId = card.id ?? card.external_payment_method_id;
    const brand = String(card.brand || gateway).toUpperCase();
    const last4 = card.last4 || '----';
    const exp = card.exp_month && card.exp_year ? `${card.exp_month}/${String(card.exp_year).slice(-2)}` : 'Exp --/--';
    const isPreferred = Boolean(card.is_preferred) || String(preferredCardId) === String(cardId);
    const isSelected = String(selectedPreferred[gateway]?.id ?? selectedPreferred[gateway]?.external_payment_method_id ?? '') === String(cardId);
    const deleting = String(deletingCardId) === String(cardId);
    const settingPreferred = String(settingPreferredId) === String(cardId);

    return (
      <View key={`${gateway}-${cardId}`} style={[styles.cardItem, isSelected && styles.cardItemSelected]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.82} onPress={() => selectPreferredCandidate(card, gateway)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={isPreferred ? 'star' : (isSelected ? 'checkmark-circle' : 'star-outline')} size={17} color={isPreferred || isSelected ? BLUE : '#9aa0a6'} style={{ marginRight: 8 }} />
            <Text style={styles.cardLabel}>{brand} • **** **** **** {last4}</Text>
          </View>
          <Text style={styles.cardMeta}>{exp}{isPreferred ? ' • Preferida' : (isSelected ? ' • Seleccionada' : ' • Toca para seleccionar')}</Text>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => selectPreferredCandidate(card, gateway)}
            style={styles.iconAction}
            disabled={settingPreferred}
          >
            {settingPreferred ? <ActivityIndicator size="small" /> : <Ionicons name="checkmark-circle-outline" size={19} color={BLUE} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => confirmDeleteCard(card, gateway)}
            style={styles.iconAction}
            disabled={deleting}
          >
            {deleting ? <ActivityIndicator size="small" /> : <Ionicons name="trash-outline" size={19} color="#ef4444" />}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGatewaySection = ({ gateway, title, subtitle, cards, loading }) => (
    <View style={styles.gatewaySection}>
      <View style={styles.gatewayHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="card-outline" size={20} color={BLUE} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={[styles.sectionTitle, { fontSize: clamp(Math.round(rf(1.9)), 14, 18) }]}>{title}</Text>
            <Text style={styles.gatewaySubtitle}>{subtitle}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => openAddCardModal(gateway)}
          style={styles.addButton}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={18} color={BLUE} style={{ marginRight: 6 }} />
          <Text style={{ color: BLUE, fontWeight: '700' }}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 12 }}>
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color={BLUE} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ color: '#333' }}>
              {gateway === 'openpay' ? 'OpenPay' : 'Aún no tienes tarjetas guardadas.'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {cards.map(card => renderCardItem(card, gateway))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.preferredSaveButton, { opacity: selectedPreferred[gateway] ? 1 : 0.55 }]}
        onPress={() => savePreferredSelection(gateway)}
        disabled={!selectedPreferred[gateway] || Boolean(settingPreferredId)}
      >
        {settingPreferredId && selectedPreferred[gateway] ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="star-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.saveButtonText}>Guardar preferida</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const addModalTitle = selectedGateway === 'stripe' ? 'Agregar tarjeta Stripe' : 'Agregar tarjeta OpenPay';

  return (
    <StripeProvider publishableKey={FIXED_STRIPE_PUBLISHABLE_KEY} stripeAccountId={stripeAccountId || undefined}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={[styles.header, { paddingVertical: headerPaddingVertical, paddingHorizontal: headerPaddingHorizontal }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={Math.round(clamp(iconSize, 20, 28))} color={BLUE} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: clamp(Math.round(rf(2.6)), 20, 22) }]}>Perfil</Text>

          <View style={styles.headerRight}>
            <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: Math.round(avatarSize / 2) }]}>
              {profileUrl ? (
                <Image source={{ uri: profileUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={[styles.avatarInitials, { fontSize: Math.round(avatarSize * 0.36) }]}>
                    {getInitials(username)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.username, { fontSize: clamp(Math.round(rf(1.8)), 14, 18), marginRight: Math.round(Math.max(8, dimWidth * 0.02)) }]} numberOfLines={1}>
              {username}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.max(16, Math.round(dimWidth * 0.06)) }]} keyboardShouldPersistTaps="always">
          <View style={styles.mainTitleRow}>
            <Ionicons name="wallet-outline" size={21} color={BLUE} />
            <Text style={[styles.mainTitle, { fontSize: clamp(Math.round(rf(2)), 16, 20) }]}>Métodos de pago</Text>
          </View>

          {renderGatewaySection({
            gateway: 'stripe',
            title: 'Stripe',
            subtitle: 'Tarjetas guardadas para pagos con Stripe',
            cards: stripeCards,
            loading: loadingStripeCards,
          })}

          {renderGatewaySection({
            gateway: 'openpay',
            title: 'OpenPay',
            subtitle: 'OpenPay',
            cards: openpayCards,
            loading: loadingOpenpayCards,
          })}

          <TouchableOpacity style={[styles.refreshButton, { alignSelf: dimWidth > 420 ? 'flex-end' : 'flex-start' }]} onPress={loadAllPaymentMethods}>
            <Ionicons name="refresh-outline" size={17} color="#fff" style={{ marginRight: 6 }} />
            <Text style={[styles.saveButtonText, { fontSize: clamp(Math.round(rf(1.6)), 13, 16) }]}>Actualizar</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)} presentationStyle="overFullScreen">
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrapper}>
              <View style={[styles.modalContainer, { width: modalWidth }]}>
                <LinearGradient colors={['#ffffff', '#fbfbff']} style={styles.modalGradient}>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)} accessibilityLabel="Cerrar">
                    <Ionicons name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>

                  <Text style={[styles.modalTitle, { fontSize: clamp(Math.round(rf(2.1)), 16, 20) }]}>{addModalTitle}</Text>

                  <View style={styles.cardPreview}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ color: '#222', fontWeight: '700', fontSize: 13 }}>Tarjeta</Text>
                      <Text style={styles.cardNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>
                        •••• •••• •••• ••••
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#666', marginRight: 12 }}>Gateway</Text>
                        <Text style={styles.cardHolder}>{selectedGateway === 'stripe' ? 'STRIPE' : 'OPENPAY'}</Text>
                      </View>
                    </View>

                    <View style={{ width: 110, alignItems: 'flex-end' }}>
                      <View style={styles.expiryPill}>
                        <Text style={styles.expiryText}>MM/AA</Text>
                      </View>
                      <Image source={require('../../assets/images/logo.png')} style={{ width: 64, height: 18, marginTop: 16 }} resizeMode="contain" />
                    </View>
                  </View>

                  {selectedGateway === 'stripe' ? (
                    <>
                      <View style={styles.stripeFieldWrap}>
                        <CardField
                          postalCodeEnabled={false}
                          placeholders={{ number: '4242 4242 4242 4242' }}
                          cardStyle={{
                            borderRadius: 8,
                            backgroundColor: '#ffffff',
                            textColor: '#222222',
                            placeholderColor: '#9aa0a6',
                          }}
                          style={{ width: '100%', height: 48 }}
                          onCardChange={setStripeCardDetails}
                        />
                      </View>

                      <View style={styles.preferredRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.preferredTitle}>Marcar como preferida</Text>
                          <Text style={styles.preferredSub}>Se guardará como tarjeta principal de Stripe.</Text>
                        </View>
                        <Switch
                          value={savePreferred}
                          onValueChange={setSavePreferred}
                          trackColor={{ false: '#d1d5db', true: '#bfe0ff' }}
                          thumbColor={savePreferred ? BLUE : '#ffffff'}
                        />
                      </View>
                    </>
                  ) : (
                    <View style={styles.emptyBox}>
                      <Text style={{ color: '#333' }}>OpenPay queda listo visualmente. Cuando el backend esté disponible se conecta aquí sin cambiar el diseño.</Text>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={savingCard}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButtonModal} onPress={onSaveCard} disabled={savingCard}>
                      {savingCard ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
                    </TouchableOpacity>
                  </View>

                  <SmallToast message={toastMsg} visible={toastVisible} success={toastSuccess} />
                </LinearGradient>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal animationType="fade" transparent visible={deleteConfirmVisible} onRequestClose={closeDeleteConfirm} presentationStyle="overFullScreen">
          <View style={styles.deleteOverlay}>
            <Pressable style={styles.deleteBackdrop} onPress={closeDeleteConfirm} />
            <View style={styles.deleteModalBox}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </View>

              <Text style={styles.deleteTitle}>Eliminar tarjeta</Text>
              <Text style={styles.deleteMessage}>
                ¿Deseas eliminar esta tarjeta guardada?
              </Text>

              {cardToDelete ? (
                <View style={styles.deleteCardPreview}>
                  <Ionicons name="card-outline" size={19} color={BLUE} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deleteCardTitle}>
                      {String(cardToDelete.brand || gatewayToDelete || 'tarjeta').toUpperCase()} • **** {cardToDelete.last4 || '----'}
                    </Text>
                    <Text style={styles.deleteCardSub}>
                      Esta acción no se puede deshacer.
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.deleteButtons}>
                <TouchableOpacity style={styles.deleteCancelButton} onPress={closeDeleteConfirm} disabled={Boolean(deletingCardId)}>
                  <Text style={styles.deleteCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteConfirmButton} onPress={performConfirmedDelete} disabled={Boolean(deletingCardId)}>
                  {deletingCardId ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.deleteConfirmText}>Eliminar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={toastStyles.container} pointerEvents="box-none">
          <SmallToast message={toastMsg} visible={toastVisible} success={toastSuccess} />
        </View>
      </SafeAreaView>
    </StripeProvider>
  );
}

function getInitials(name) {
  if (!name) return 'US';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BLUE },
  headerTitle: { fontSize: 22, fontWeight: '600', color: BLUE },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  avatar: { overflow: 'hidden', backgroundColor: '#f3f6ff', marginHorizontal: 8 },
  avatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: BLUE, fontWeight: '700' },
  username: { fontSize: 16, color: '#000', marginRight: 16, maxWidth: 160 },
  backButton: { marginRight: 12 },
  scrollContent: { paddingTop: 16, paddingBottom: 32 },

  mainTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  mainTitle: { color: BLUE, fontWeight: '800', marginLeft: 8 },
  gatewaySection: { marginBottom: 18 },
  gatewayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: BLUE },
  gatewaySubtitle: { color: '#667085', fontSize: 12, marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6eefc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: BLUE,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  refreshButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 6 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fbfbff',
    borderWidth: 1,
    borderColor: '#eef1ff',
  },
  cardsList: { marginTop: 4, paddingVertical: 4 },
  cardItem: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef1ff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  cardItemSelected: {
    borderColor: '#bcd9ff',
    backgroundColor: '#f8fbff',
  },
  cardLabel: { fontSize: 15, color: '#222', fontWeight: '700', flexShrink: 1 },
  cardMeta: { fontSize: 12, color: '#666', marginTop: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  iconAction: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#e6eefc', backgroundColor: '#fff', marginLeft: 6 },
  preferredSaveButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 150,
  },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,10,20,0.6)' },
  modalWrapper: { width: '100%', alignItems: 'center', paddingHorizontal: 18 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10 },
  modalGradient: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  modalClose: { position: 'absolute', top: 6, right: 6, zIndex: 10, padding: 6 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: BLUE, marginBottom: 8 },
  cardPreview: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: SOFT_BLUE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
  },
  cardNumber: { color: '#222', marginTop: 10, fontSize: 18, letterSpacing: 1.2, fontWeight: '700' },
  cardHolder: { color: '#222', fontWeight: '700', fontSize: 14 },
  expiryPill: { backgroundColor: '#f0f6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e6eefc' },
  expiryText: { color: BLUE, fontWeight: '700', fontSize: 14 },
  stripeFieldWrap: {
    width: '100%',
    backgroundColor: '#fbfbfd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eef1f6',
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginBottom: 8,
  },
  preferredRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
    marginTop: 2,
    backgroundColor: '#fff',
  },
  preferredTitle: { color: '#222', fontWeight: '800', fontSize: 13 },
  preferredSub: { color: '#667085', marginTop: 2, fontSize: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ff', paddingVertical: 8, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: BLUE, fontWeight: '700', fontSize: 13 },
  saveButtonModal: { flex: 1, backgroundColor: BLUE, paddingVertical: 8, borderRadius: 8, marginLeft: 8, alignItems: 'center' },

  deleteOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  deleteBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,10,20,0.56)',
  },
  deleteModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 14,
  },
  deleteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0b1220',
  },
  deleteMessage: {
    color: '#475467',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  deleteCardPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef1ff',
    backgroundColor: '#fbfbff',
    padding: 12,
  },
  deleteCardTitle: {
    color: '#222',
    fontWeight: '800',
    fontSize: 13,
  },
  deleteCardSub: {
    color: '#667085',
    fontSize: 12,
    marginTop: 3,
  },
  deleteButtons: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 16,
  },
  deleteCancelButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#dbe4ff',
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  deleteCancelText: {
    color: BLUE,
    fontWeight: '800',
  },
  deleteConfirmButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    paddingVertical: 10,
    marginLeft: 8,
    backgroundColor: '#ef4444',
  },
  deleteConfirmText: {
    color: '#fff',
    fontWeight: '800',
  },
});

const toastStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 86 : 68,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    minWidth: 140,
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
  },
  toastText: { fontSize: 13, color: '#222', textAlign: 'center' },
});
