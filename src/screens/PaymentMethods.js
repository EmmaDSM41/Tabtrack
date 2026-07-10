import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { StripeProvider, CardField, confirmSetupIntent, initStripe } from '@stripe/stripe-react-native';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const API_HOST_CONST = 'https://api.tab-track.com';

const FIXED_STRIPE_PUBLISHABLE_KEY = 'pk_test_51RJbpaQaBqb9H2oSU1iY1gSZnZDsZmda42KJkP4d4Ta3RVyte3lcmyzC4WsoHfYJewiuOsef4tdeaIaqBUJbqtDL00K6T8g3bt';

const COLORS = {
  bg: '#ffffff',
  surface: '#ffffff',
  text: '#161616',
  muted: '#6f6f6f',
  faint: '#f0f3f8',
  border: '#e8edf5',
  accent: '#202124',
  ink: '#111111',
  danger: '#d92d20',
  success: '#176b3a',
  softBlue: '#f6f7f9',
  blue:'#0b58ff'
};

const AS_KEYS = {
  USER_EMAIL: 'user_email',
  USER_MAIL: 'user_mail',
  USER_FULLNAME: 'user_fullname',
  USER_NOMBRE: 'user_nombre',
  USER_APELLIDO: 'user_apellido',
  USER_USUARIO_APP_ID: 'user_usuario_app_id',
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
          borderColor: success ? '#d8efe1' : COLORS.border,
        },
      ]}
    >
      <Text style={[toastStyles.toastText, success && { color: COLORS.success }]}>{message}</Text>
    </Animated.View>
  );
}

export default function PaymentMethods({ navigation, route }) {
  const params = route?.params ?? {};
  const { width: dimWidth, height: dimHeight } = Dimensions.get('window');
  const rf = p => Math.round(PixelRatio.roundToNearestPixel((Number(p) / 100) * dimWidth));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const pagePadding = useMemo(() => Math.max(18, Math.round(dimWidth * 0.055)), [dimWidth]);
  const iconSize = useMemo(() => clamp(Math.round(rf(2.6)), 18, 26), [dimWidth]);

  const apiHost = params.api_host ?? API_HOST_CONST;
  const apiToken = params.api_token ?? TOKEN ?? '';

  const [screen, setScreen] = useState('wallet');
  const [username, setUsername] = useState('Usuario');
  const [userEmail, setUserEmail] = useState(params.userEmail ?? params.user_email ?? '');
  const [userFullname, setUserFullname] = useState(params.userFullname ?? params.user_fullname ?? '');
  const [usuarioAppId, setUsuarioAppId] = useState(params.usuario_app_id ?? params.user_usuario_app_id ?? '');

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [stripeCardDetails, setStripeCardDetails] = useState(null);
  const [savePreferred, setSavePreferred] = useState(true);
  const [stripeAccountId, setStripeAccountId] = useState(params.stripe_account_id || params.stripeAccountId || null);

  const [selectedPreferred, setSelectedPreferred] = useState(null);
  const [settingPreferredId, setSettingPreferredId] = useState(null);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

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
  const buildListPaymentMethodsUrl = useCallback((userId) => `${hostBase()}/api/mobileapp/payment-methods?usuario_app_id=${encodeURIComponent(userId)}`, [hostBase]);
  const buildDeletePaymentMethodUrl = useCallback((cardId) => `${hostBase()}/api/mobileapp/payment-methods/${encodeURIComponent(cardId)}?gateway=stripe`, [hostBase]);
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
    gateway: 'stripe',
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

  const loadCards = useCallback(async () => {
    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontro usuario_app_id', false);
      return;
    }

    setLoadingCards(true);
    try {
      await ensureToken();
      const res = await fetch(buildListPaymentMethodsUrl(userId), {
        method: 'GET',
        headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-setup') }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn('loadCards error', res.status, json);
        showToast('No se pudieron cargar tus tarjetas', false);
        return;
      }

      const arr = Array.isArray(json?.payment_methods)
        ? json.payment_methods
        : (Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []));
      setCards(arr.map(normalizePaymentMethod));
    } catch (err) {
      console.warn('loadCards exception', err);
      showToast('No se pudo conectar al servidor', false);
    } finally {
      setLoadingCards(false);
    }
  }, [buildListPaymentMethodsUrl, getAuthHeaders, resolveUsuarioAppId, showToast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const nombre = await AsyncStorage.getItem(AS_KEYS.USER_NOMBRE);
        const apellido = await AsyncStorage.getItem(AS_KEYS.USER_APELLIDO);
        const full = await AsyncStorage.getItem(AS_KEYS.USER_FULLNAME);
        const email = await AsyncStorage.getItem(AS_KEYS.USER_EMAIL) || await AsyncStorage.getItem(AS_KEYS.USER_MAIL);
        const userId = await AsyncStorage.getItem(AS_KEYS.USER_USUARIO_APP_ID);

        const displayName = full || `${nombre ?? ''} ${apellido ?? ''}`.trim() || 'Usuario';
        if (!mounted) return;

        setUsername(displayName);
        if (!userFullname) setUserFullname(displayName);
        if (!userEmail && email) setUserEmail(email);
        if (!usuarioAppId && userId) setUsuarioAppId(userId);
      } catch (e) {
        console.warn('Error leyendo AsyncStorage', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (usuarioAppId) loadCards();
  }, [usuarioAppId, loadCards]);

  useEffect(() => {
    const unsub = navigation.addListener?.('focus', () => {
      if (usuarioAppId) loadCards();
    });
    return () => {
      try { if (typeof unsub === 'function') unsub(); } catch (e) {}
    };
  }, [navigation, usuarioAppId, loadCards]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const openAddCardScreen = () => {
    setStripeCardDetails(null);
    setSavePreferred(cards.length === 0);
    setScreen('add-card');
  };

  const closeAddCardScreen = () => {
    if (savingCard) return;
    setStripeCardDetails(null);
    setScreen('wallet');
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

    if (!clientSecret) throw new Error('El servidor no devolvio client_secret');
    return { clientSecret, stripeAccountId: extractStripeAccountId(json), raw: json };
  };

  const saveStripeCard = async () => {
    if (!stripeCardDetails || !stripeCardDetails.complete) {
      showToast('Completa los datos de la tarjeta', false);
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

      showToast('Tarjeta agregada a tu wallet', true);
      setScreen('wallet');
      setStripeCardDetails(null);
      await loadCards();
    } catch (err) {
      console.warn('saveStripeCard error', err);
      showToast(err?.message || 'No se pudo guardar la tarjeta', false);
    } finally {
      setSavingCard(false);
    }
  };

  const setPreferredCard = async (card) => {
    const cardId = card.id ?? card.mobile_payment_method_id ?? card.external_payment_method_id;
    if (!cardId) {
      showToast('No se encontro el id de la tarjeta', false);
      return;
    }

    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontro usuario_app_id', false);
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
        console.warn('setPreferredCard error', res.status, json);
        showToast(`No se pudo marcar como preferida (${res.status})`, false);
        return;
      }

      setSelectedPreferred(null);
      setCards(prev => prev.map(item => ({
        ...item,
        is_preferred: String(item.id) === String(cardId),
      })));
      showToast('Tarjeta preferida actualizada', true);
      await loadCards();
    } catch (err) {
      console.warn('setPreferredCard exception', err);
      showToast('Error al marcar preferida', false);
    } finally {
      setSettingPreferredId(null);
    }
  };

  const deleteCard = async (card) => {
    const cardId = card.id ?? card.mobile_payment_method_id ?? card.external_payment_method_id;
    if (!cardId) {
      showToast('No se encontro el id de la tarjeta', false);
      return;
    }

    const userId = await resolveUsuarioAppId();
    if (!userId) {
      showToast('No se encontro usuario_app_id', false);
      return;
    }

    setDeletingCardId(cardId);
    try {
      await ensureToken();
      const res = await fetch(buildDeletePaymentMethodUrl(cardId), {
        method: 'DELETE',
        headers: getAuthHeaders({ 'Idempotency-Key': genIdempotencyKey('pm-delete') }),
        body: JSON.stringify({ usuario_app_id: userId }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn('deleteCard error', res.status, json);
        showToast(`No se pudo eliminar tarjeta (${res.status})`, false);
        return;
      }

      setCards(prev => prev.filter(item => String(item.id) !== String(cardId)));
      setSelectedPreferred(null);
      showToast('Tarjeta eliminada', true);
    } catch (err) {
      console.warn('deleteCard exception', err);
      showToast('Error al eliminar tarjeta', false);
    } finally {
      setDeletingCardId(null);
      setDeleteConfirmVisible(false);
      setCardToDelete(null);
    }
  };

  const confirmDeleteCard = (card) => {
    setCardToDelete(card);
    setDeleteConfirmVisible(true);
  };

  const closeDeleteConfirm = () => {
    if (deletingCardId) return;
    setDeleteConfirmVisible(false);
    setCardToDelete(null);
  };

  const getBrandLabel = (brand) => {
    const clean = String(brand || '').trim();
    if (!clean) return 'Card';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const getBrandMark = (brand) => {
    const lower = String(brand || '').toLowerCase();
    if (lower.includes('visa')) return { text: 'VISA', style: 'visa' };
    if (lower.includes('master')) return { text: 'MC', style: 'mastercard' };
    if (lower.includes('amex') || lower.includes('american')) return { text: 'AMEX', style: 'amex' };
    return { text: 'CARD', style: 'generic' };
  };

  const renderExternalWallets = () => (
    <View style={styles.walletBlock}>
      <Text style={styles.blockTitle}>Metodos de pago</Text>

      <TouchableOpacity style={styles.walletOption} activeOpacity={0.88} onPress={() => showToast('  ', false)}>
        <View style={styles.walletLogo}>
          <Ionicons name="logo-apple" size={24} color={COLORS.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletOptionTitle}>Apple Pay</Text>
          <Text style={styles.walletOptionSub}>Apple pay</Text>
        </View>
{/*         <Text style={styles.soonBadge}>Pronto</Text>*/}
      </TouchableOpacity>

      <TouchableOpacity style={styles.walletOption} activeOpacity={0.88} onPress={() => showToast(' ', false)}>
        <View style={styles.walletLogo}>
          <Ionicons name="logo-paypal" size={23} color="#003087" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletOptionTitle}>PayPal</Text>
          <Text style={styles.walletOptionSub}> Paypal</Text>
        </View>
{/*         <Text style={styles.soonBadge}>Pronto</Text>*/} 
     </TouchableOpacity>
    </View>
  );

  const renderCardItem = (card) => {
    const cardId = card.id ?? card.external_payment_method_id;
    const brand = getBrandLabel(card.brand);
    const mark = getBrandMark(card.brand);
    const last4 = card.last4 || '----';
    const exp = card.exp_month && card.exp_year ? `${card.exp_month}/${String(card.exp_year).slice(-2)}` : '--/--';
    const isPreferred = Boolean(card.is_preferred);
    const isSelected = String(selectedPreferred?.id ?? selectedPreferred?.external_payment_method_id ?? '') === String(cardId);
    const deleting = String(deletingCardId) === String(cardId);
    const settingPreferred = String(settingPreferredId) === String(cardId);

    return (
      <TouchableOpacity
        key={`card-${cardId}`}
        style={[styles.cardRow, isSelected && styles.cardRowSelected]}
        activeOpacity={0.86}
        onPress={() => {
          setSelectedPreferred(card);
          if (!isPreferred) setPreferredCard(card);
        }}
      >
        <View style={[styles.cardBrandMark, styles[`cardBrandMark_${mark.style}`]]}>
          {mark.style === 'mastercard' ? (
            <View style={styles.mastercardLogo}>
              <View style={[styles.mastercardCircle, styles.mastercardCircleLeft]} />
              <View style={[styles.mastercardCircle, styles.mastercardCircleRight]} />
            </View>
          ) : (
            <Text style={[styles.cardBrandText, mark.style === 'visa' && styles.cardBrandTextVisa]}>{mark.text}</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.cardTopLine}>
            <Text style={styles.cardTitle}>•••• {last4}</Text>
            {isPreferred ? (
              <View style={styles.preferredChip}>
                <Ionicons name="star" size={11} color={COLORS.blue} style={{ marginRight: 3 }} />
                <Text style={styles.preferredChipText}>Principal</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardSub}>{brand} · Expira {exp}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardIconButton}
            onPress={() => {
              setSelectedPreferred(card);
              if (!isPreferred) setPreferredCard(card);
            }}
            disabled={settingPreferred}
          >
            {settingPreferred ? <ActivityIndicator size="small" /> : <Ionicons name={isPreferred ? 'star' : 'star-outline'} size={19} color={isPreferred ? COLORS.blue : COLORS.muted} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardIconButton} onPress={() => confirmDeleteCard(card)} disabled={deleting}>
            {deleting ? <ActivityIndicator size="small" /> : <Ionicons name="trash-outline" size={19} color={COLORS.danger} />}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderWalletScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={[styles.header, { paddingHorizontal: pagePadding }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={Math.round(clamp(iconSize, 23, 28))} color={COLORS.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Metodos de pago</Text>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pagePadding }]} keyboardShouldPersistTaps="always">
        <View style={styles.hero}>
{/*           <Text style={styles.heroKicker}>Metodos de pago</Text>*/} 
           <Text style={styles.heroTitle}>Configura tus metodos de pago</Text>
{/*            <Text style={styles.heroCopy}>Agrega tarjetas, elige una principal y mantén tus opciones listas para el checkout.</Text>*/}
        </View>

        {renderExternalWallets()}

        <View style={styles.cardsBlock}>
          <View style={styles.blockHeader}>
            <View>
              <Text style={styles.blockTitle}>Tarjetas</Text>
              <Text style={styles.blockSubtitle}>{cards.length ? `${cards.length} tarjeta${cards.length === 1 ? '' : 's'} guardada${cards.length === 1 ? '' : 's'}` : 'Sin tarjetas guardadas'}</Text>
            </View>
            <TouchableOpacity style={styles.addCardButton} onPress={openAddCardScreen} activeOpacity={0.9}>
              <Ionicons name="add" size={19} color={COLORS.blue} style={{ marginRight: 5 }} />
              <Text style={styles.addCardButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {loadingCards ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.text} />
              <Text style={styles.emptyText}>Cargando tarjetas...</Text>
            </View>
          ) : cards.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="card-outline" size={27} color={COLORS.text} />
              </View>
              <Text style={styles.emptyTitle}>Aun no hay tarjetas</Text>
              <Text style={styles.emptyText}>Agrega una tarjeta para pagar mas rapido en tus proximas visitas.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddCardScreen}>
                <Text style={styles.emptyButtonText}>Agregar tarjeta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {cards.map(renderCardItem)}
            </View>
          )}
        </View>
      </ScrollView>

      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        card={cardToDelete}
        deleting={Boolean(deletingCardId)}
        onClose={closeDeleteConfirm}
        onConfirm={() => cardToDelete && deleteCard(cardToDelete)}
      />

      <View style={toastStyles.container} pointerEvents="box-none">
        <SmallToast message={toastMsg} visible={toastVisible} success={toastSuccess} />
      </View>
    </SafeAreaView>
  );

  const renderAddCardScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={[styles.header, { paddingHorizontal: pagePadding }]}>
        <TouchableOpacity onPress={closeAddCardScreen} style={styles.headerIconButton} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={Math.round(clamp(iconSize, 20, 28))} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar tarjeta</Text>
        <View style={styles.headerIconButton} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.addContent, { paddingHorizontal: pagePadding }]} keyboardShouldPersistTaps="always">
          <View style={styles.cardPreview}>
            <View style={styles.cardPreviewTop}>
              <Text style={styles.cardPreviewBrand}>{getBrandLabel(stripeCardDetails?.brand) || 'Card'}</Text>
              <View style={styles.cardPreviewChip} />
            </View>
            <Text style={styles.cardPreviewNumber}>
              {stripeCardDetails?.last4 ? `••••  ••••  ••••  ${stripeCardDetails.last4}` : '••••  ••••  ••••  ••••'}
            </Text>
            <View style={styles.cardPreviewBottom}>
              <View>
                <Text style={styles.cardPreviewLabel}>Titular</Text>
                <Text style={styles.cardPreviewValue}>{userFullname || username || 'Nombre del cliente'}</Text>
              </View>
              <View>
                <Text style={styles.cardPreviewLabel}>Expira</Text>
                <Text style={styles.cardPreviewValue}>
                  {stripeCardDetails?.expiryMonth && stripeCardDetails?.expiryYear
                    ? `${String(stripeCardDetails.expiryMonth).padStart(2, '0')}/${String(stripeCardDetails.expiryYear).slice(-2)}`
                    : 'MM/AA'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>Datos de la tarjeta</Text>
{/*             <Text style={styles.formCopy}>La tarjeta se guarda de forma segura con Stripe. No almacenamos el numero completo en la app.</Text>
 */}
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
                onCardChange={setStripeCardDetails}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.preferenceTitle}>Usar como tarjeta principal</Text>
                <Text style={styles.preferenceSub}>La seleccionaremos por defecto en pagos futuros.</Text>
              </View>
              <Switch
                value={savePreferred}
                onValueChange={setSavePreferred}
                trackColor={{ false: '#d8d4ce', true: '#0b58ff' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.addFooter, { paddingHorizontal: pagePadding }]}>
          <TouchableOpacity style={styles.secondaryButton} onPress={closeAddCardScreen} disabled={savingCard}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={saveStripeCard} disabled={savingCard}>
            {savingCard ? <ActivityIndicator color="#fefefe" /> : <Text style={styles.primaryButtonText}>Guardar tarjeta</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <View style={toastStyles.container} pointerEvents="box-none">
        <SmallToast message={toastMsg} visible={toastVisible} success={toastSuccess} />
      </View>
    </SafeAreaView>
  );

  return (
    <StripeProvider publishableKey={FIXED_STRIPE_PUBLISHABLE_KEY} stripeAccountId={stripeAccountId || undefined}>
      {screen === 'add-card' ? renderAddCardScreen() : renderWalletScreen()}
    </StripeProvider>
  );
}

function DeleteConfirmModal({ visible, card, deleting, onClose, onConfirm }) {
  const brand = String(card?.brand || 'Tarjeta').toUpperCase();
  const last4 = card?.last4 || '----';

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose} presentationStyle="overFullScreen">
      <View style={styles.deleteOverlay}>
        <Pressable style={styles.deleteBackdrop} onPress={onClose} />
        <View style={styles.deleteModalBox}>
          <View style={styles.deleteIconCircle}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
          </View>
          <Text style={styles.deleteTitle}>Eliminar tarjeta</Text>
          <Text style={styles.deleteMessage}>Esta tarjeta se quitara de tus metodos de pago guardados.</Text>

          <View style={styles.deleteCardPreview}>
            <Ionicons name="card-outline" size={19} color={COLORS.text} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteCardTitle}>{brand} •••• {last4}</Text>
              <Text style={styles.deleteCardSub}>Esta accion no se puede deshacer.</Text>
            </View>
          </View>

          <View style={styles.deleteButtons}>
            <TouchableOpacity style={styles.deleteCancelButton} onPress={onClose} disabled={deleting}>
              <Text style={styles.deleteCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteConfirmButton} onPress={onConfirm} disabled={deleting}>
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteConfirmText}>Eliminar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 34,
  },
  hero: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroKicker: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 8,
    alignItems: 'center',
    textAlign: 'center',

  },
  heroCopy: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  walletBlock: {
    marginTop: 4,
  },
  blockTitle: {
    color: COLORS.blue,
    fontSize: 18,
    fontWeight: '900',
  },
  blockSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 10,
  },
  walletLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f2f0ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletOptionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  walletOptionSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  soonBadge: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f2f0ed',
    overflow: 'hidden',
  },
  cardsBlock: {
    marginTop: 24,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addCardButtonText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f2f0ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 14,
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: '#cfe2ff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  cardsList: {
    marginTop: 2,
  },
  cardRow: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowSelected: {
    borderColor: COLORS.text,
  },
  cardBrandMark: {
    width: 52,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  cardBrandMark_visa: { backgroundColor: '#ffffff', borderColor: '#d8dde8' },
  cardBrandMark_mastercard: { backgroundColor: '#ffffff', borderColor: '#e8ded3' },
  cardBrandMark_amex: { backgroundColor: '#ffffff', borderColor: '#d8e7f2' },
  cardBrandMark_generic: { backgroundColor: '#f7f6f3', borderColor: COLORS.border },
  cardBrandText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '900',
  },
  cardBrandTextVisa: {
    color: '#1a4fb7',
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  mastercardLogo: {
    width: 32,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mastercardCircle: {
    position: 'absolute',
    width: 19,
    height: 19,
    borderRadius: 10,
  },
  mastercardCircleLeft: {
    left: 3,
    backgroundColor: '#eb001b',
    opacity: 0.92,
  },
  mastercardCircleRight: {
    right: 3,
    backgroundColor: '#f79e1b',
    opacity: 0.92,
  },
  cardTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    marginRight: 6,
  },
  cardSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  preferredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f0ed',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  preferredChipText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  cardIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    backgroundColor: '#f7f6f3',
  },
  addContent: {
    paddingTop: 10,
    paddingBottom: 110,
  },
  cardPreview: {
    minHeight: 190,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPreviewBrand: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  cardPreviewChip: {
    width: 34,
    height: 25,
    borderRadius: 8,
    backgroundColor: '#f0d89f',
  },
  cardPreviewNumber: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardPreviewValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    maxWidth: 180,
  },
  formBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 18,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
  },
  formCopy: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  stripeFieldWrap: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.faint,
  },
  preferenceTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  preferenceSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  addFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'rgba(247,247,245,0.96)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1.35,
    height: 48,
    borderRadius: 14,
    borderColor:COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginLeft: 8,
  
  },
  primaryButtonText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: '900',
  },
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
    backgroundColor: 'rgba(10,10,10,0.48)',
  },
  deleteModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  deleteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  deleteMessage: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  deleteCardPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    padding: 12,
  },
  deleteCardTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 13,
  },
  deleteCardSub: {
    color: COLORS.muted,
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
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 11,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  deleteCancelText: {
    color: COLORS.text,
    fontWeight: '900',
  },
  deleteConfirmButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 13,
    paddingVertical: 11,
    marginLeft: 8,
    backgroundColor: COLORS.danger,
  },
  deleteConfirmText: {
    color: '#fff',
    fontWeight: '900',
  },
});

const toastStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 84 : 64,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    minWidth: 160,
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '700',
  },
});
