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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StripeProvider, CardField, confirmPayment } from '@stripe/stripe-react-native';

const DEFAULT_LOGO = require('../../assets/images/logo2.png');
const DEFAULT_RESTAURANT = require('../../assets/images/restaurante.jpeg');

const lastTransactionKeyForSale = (saleId) => `last_transaction_${saleId}`;
const safeNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const isColorString = (v) => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  const hexRe = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const nameRe = /^[a-z]+$/i;
  return hexRe.test(s) || nameRe.test(s);
};
const safeColor = (val, fallback) => (isColorString(val) ? val : fallback);

export default function StripePay() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const {
    api_host = 'https://api.tab-track.com',
    api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc',
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

  const gradient1 = '#9F4CFF';
  const gradient2 = '#6A43FF';
  const gradient3 = '#2C7DFF';

  const primaryColor = safeColor(params.primaryColor || '#0b58ff', '#0b58ff');

  const cardTextColor = '#0b1220';
  const cardPlaceholderColor = '#0b1220';

  const whiteColor = '#ffffff';
  const darkText = '#0b1220';

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

  const pollingRef = useRef({ running: false, stopRequested: false, lastResult: null });

  const subtotalNum = Number(monto_subtotal ?? params.monto_subtotal ?? 0) || 0;
  const propinaNum = Number(monto_propina ?? params.monto_propina ?? 0) || 0;
  const displayAmountFinal = Number((displayAmount ?? (subtotalNum + propinaNum)).toFixed(2));

  const formatAmount = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  const buildTransactionUrl = () => `${(String(api_host || 'https://127.0.0.1')).replace(/\/$/, '')}/api/transacciones-pago`;

  const buildItemsPagados = () => {
    return Array.isArray(items)
      ? items.map(it => ({
          codigo_item: String(
            it.codigo_item ??
            it.codigo ??
            it.code ??
            it.original_line_id ??
            it.id ??
            ''
          ),
          nombre_item:
            it.nombre_item ??
            it.nombre ??
            it.name ??
            it.title ??
            '',
          cantidad: Number(
            it.cantidad ??
            it.qty ??
            it.quantity ??
            1
          ) || 1,
          precio_unitario: Number(
            it.precio_unitario ??   
            it.precio ??           
            it.precio_item ??       
            it.unitPrice ??        
            it.price ??             
            0
          ) || 0,
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
          const json = await res.json();
          const splitsArr = Array.isArray(json.splits) ? json.splits : [];
          const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
          if (paidSplits.length > 0) {
            const paidCodes = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
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
      await new Promise(r => setTimeout(r, intervalMs));
    }

    pollingRef.current.running = false;
    return { ok: false, reason: 'timeout', last: pollingRef.current.lastResult ?? null };
  };

  const validateForm = () => {
    if (!holder || holder.trim().length < 2) return 'Ingresa el nombre en la tarjeta';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Ingresa un correo electrónico válido';
    if (!cardDetails || !cardDetails.complete) return 'Ingresa los datos de la tarjeta';
    return null;
  };

  const onPayPress = async () => {
    const v = validateForm();
    if (v) { Alert.alert('Atención', v); return; }
    if (!api_host) { Alert.alert('Falta API host', 'No hay api_host configurado'); return; }
    if (!sucursal_id || !sale_id || !restaurante_id) { Alert.alert('Faltan datos', 'No hay sucursal / venta / restaurante'); return; }
    if (!stripePublishableKey || stripePublishableKey === 'pk_test_REPLACE_ME') {
      Alert.alert('Falta Stripe key', 'Pasa stripe_public_key (creds.public_key) a esta pantalla en params o reemplaza pk_test_REPLACE_ME en el código.');
      return;
    }

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
      customer_data: {
        email: email || userEmail || '',
        nombre: holder || userFullname || '',
      },
      metadata: {
        mesa_id: mesa_id ?? null,
        venta_id: sale_id ?? '',
      },
      mesa_id: mesa_id ?? null,
      items_pagados,
      return_url: params.return_url ?? params.returnUrl ?? undefined,
      flow: 'elements'
    };

    let json = null;
    let transactionId = null;

    try {
      const url = buildTransactionUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
        body: JSON.stringify(body),
      });

      try { json = await res.json(); } catch (e) { json = null; }

      setLoading(false);

      if (!res.ok) {
        const serverMsg = json && (json.error || json.message) ? (json.error || json.message) : `Error del servidor (${res.status})`;
        setProcessing(false);
        Alert.alert('Error creando transacción', String(serverMsg));
        console.log('createTransaction error:', json);
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
        Alert.alert('Error', 'El servidor no devolvió transaction_id. Revisa la respuesta en consola.');
        console.log('createTransaction response:', json);
        return;
      }

      try { await AsyncStorage.setItem(lastTransactionKeyForSale(sale_id), String(transactionId)); } catch (e) { console.warn('save last tx failed', e); }

      const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
      if (checkoutUrl) {
        try { Linking.openURL(checkoutUrl); } catch (e) { console.warn('open checkoutUrl failed', e); }
      }

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
            Alert.alert('Pago no procesado', error.message ?? 'Error al confirmar el pago con Stripe.');
            try { navigation.navigate('QRMain'); } catch (e) { /* ignore */ }
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
              } catch (e) { console.warn('navigate PaymentSuccessScreen failed', e); }
              return;
            } else {
              Alert.alert('Pendiente', 'Pago confirmado por Stripe pero el servidor aún no refleja la venta como pagada.');
              try { navigation.navigate('QRMain'); } catch (e) { /* ignore */ }
              return;
            }
          } else {
            setProcessing(false);
            Alert.alert('Pago no completado', `Estado del pago: ${String(paymentIntent?.status)}`);
            try { navigation.navigate('QRMain'); } catch (e) { /* ignore */ }
            return;
          }
        } catch (err) {
          console.warn('confirmPayment exception', err);
          setProcessing(false);
          Alert.alert('Error', 'Ocurrió un error confirmando el pago con Stripe.');
          try { navigation.navigate('QRMain'); } catch (e) { /* ignore */ }
          return;
        }
      } else {
        setProcessing(false);
        Alert.alert('Falta client_secret', 'El servidor no devolvió client_secret. Revisa la respuesta en consola.');
        console.log('createTransaction response (no client_secret):', json);
        return;
      }
    } catch (err) {
      console.warn('Error creando transacción stripe', err);
      setProcessing(false);
      setLoading(false);
      Alert.alert('Error', 'No se pudo conectar con el servidor de pagos. Revisa la URL y el token.');
    }
  };

  useEffect(() => {
    return () => {
      try {
        pollingRef.current.stopRequested = true;
      } catch (e) { /* ignore */ }
    };
  }, []);

  const nativeLogoSource = logoUrl ? { uri: logoUrl } : DEFAULT_LOGO;
  const restaurantSrc = restaurantImage ? { uri: restaurantImage } : DEFAULT_RESTAURANT;
  const currentDateText = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

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

        <LinearGradient
          colors={[gradient1, gradient2, gradient3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientHeader, { height: GRADIENT_H, paddingHorizontal: PADDING, borderBottomRightRadius: 28, borderBottomLeftRadius: 0 }]}
        >
          <View style={styles.gradientInner}>
            <View style={styles.gradientLeftColumn}>
              <Image source={nativeLogoSource} style={[styles.gradientLogo, { width: LOGO_W }]} resizeMode="contain" />
              <Image source={restaurantSrc} style={[styles.gradientRestaurant, { width: REST_W, height: REST_W, marginTop: 12, marginLeft: 12 }]} resizeMode="cover" />
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
              <Ionicons name="card-outline" size={18} color={darkText} style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
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
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#96a0b8" />
            </View>
                      <View style={{ marginTop: PAY_BTN_MARGIN, alignItems: 'center' }}>
            <TouchableOpacity style={[styles.payBtn, { width: Math.min(560, winW - PADDING * 2) }]} onPress={onPayPress} activeOpacity={0.9} disabled={processing || loading}>
              {processing ? <ActivityIndicator color={whiteColor} style={{ marginRight: 10 }} /> : <Ionicons name="card-outline" size={18} color={'#ffffff'} style={{ marginRight: 8 }} />}
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

  rowSmall: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  inputWrapSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eef4ff', paddingHorizontal: 8, backgroundColor: '#fff' },
  inputIconSmall: { marginRight: 8 },
  inputSmall: { flex: 1, height: 44, fontSize: 14 },

  processingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E020617' },
  processingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 12, shadowColor: '#14000000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  processingText: { fontWeight: '700', fontSize: 16, color: '#0b1220' },

  autoModalBackdrop: { flex: 1, backgroundColor: '#2E020617', justifyContent: 'center', alignItems: 'center', padding: 18 },
  autoModalBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 12, width: Math.min(340, 340), shadowColor: '#14000000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  checkCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eaf3ff', alignItems: 'center', justifyContent: 'center' },
  autoModalTitle: { fontSize: 15, fontWeight: '800', color: '#0b58ff' },
  autoModalMsg: { fontSize: 13, color: '#334155', marginTop: 2 },
});
