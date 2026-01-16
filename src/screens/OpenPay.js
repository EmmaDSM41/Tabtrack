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

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [webReady, setWebReady] = useState(false);
  const [initPayload, setInitPayload] = useState(null);
  const [deviceSessionId, setDeviceSessionId] = useState(null);

  const [holder, setHolder] = useState(params.userFullname ?? '');
  const [cardNum, setCardNum] = useState('');
  const [mm, setMm] = useState('');
  const [yy, setYy] = useState('');
  const [cvv, setCvv] = useState('');
  const [email, setEmail] = useState(params.userEmail ?? '');

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
    openpay_merchant_id: param_merchant_id = '',
    openpay_public_api_key: param_public_api_key = '',
    userFullname = '',
    userEmail = '',
    logoUrl = null,
    restaurantImage = null,
  } = params;

  const buildTransactionUrl = () => {
    const host = String(api_host || 'https://127.0.0.1').trim().replace(/\/$/, '');
    return `${host}/api/transacciones-pago`;
  };

  const formatAmount = (n) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  const subtotalNum = Number(monto_subtotal ?? params.monto_subtotal ?? 0) || 0;
  const propinaNum = Number(monto_propina ?? params.monto_propina ?? 0) || 0;
  const displayAmountFinal = Number((displayAmount ?? (subtotalNum + propinaNum)).toFixed(2));

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
          const json = await res.json();
          const splitsArr = Array.isArray(json.splits) ? json.splits : [];
          const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
          if (paidSplits.length > 0) {
            const paidCodes = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
            return { ok: true, paidCodes, raw: json };
          }
        }
      } catch (err) {
        console.warn('pollSplitsUntilPaid error', err);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return { ok: false, reason: 'timeout' };
  };

  const handleWebMessage = async (event) => {
    try {
      const raw = event.nativeEvent.data;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || !data.type) return;

      if (data.type === 'inpage_ready') {
        setWebReady(true);
        setLoading(false);
        if (initPayload) {
          try { webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'init', payload: initPayload })); }
          catch (e) { console.warn('postMessage init failed', e); }
        }
        return;
      }

      if (data.type === 'device_session_created') {
        setDeviceSessionId(String(data.device_session_id || ''));
        return;
      }

      if (data.type === 'openpay_token') {
        const openpay_source_id = data.token;
        const device_session_id = data.device_session_id;
        const holder_name = data.holder_name ?? '';
        const customer_email = data.email ?? '';

        const monto_subtotal_to_send = (monto_subtotal !== null) ? Number(monto_subtotal) : safeNum(params.totalSinPropinaFinal ?? params.total ?? 0);
        const monto_propina_to_send = (monto_propina !== null) ? Number(monto_propina) : safeNum(params.tipAmount ?? 0);

        const items_pagados = Array.isArray(items) ? items.map(it => ({
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
          cantidad: Number(it.cantidad ?? it.qty ?? it.quantity ?? 1) || 1,
          precio_unitario: Number(
            it.precio_unitario ??   
            it.unitPrice ??
            it.price ??
            it.precio_item ??
            it.precio ??
            0
          ) || 0,
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
          customer_data: {
            email: customer_email || params.userEmail || userEmail || '',
            nombre: holder_name || params.userFullname || userFullname || '',
          },
          metadata: {
            mesa_id: mesa_id ?? null,
            venta_id: sale_id ?? '',
            openpay_source_id,
            device_session_id,
            source: 'elements'
          },
          mesa_id: mesa_id ?? null,
          items_pagados,
          flow: 'elements'
        };

        try {
          setProcessing(true);
          const url = buildTransactionUrl();
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(api_token ? { Authorization: `Bearer ${api_token}` } : {}) },
            body: JSON.stringify(body),
          });
          let json = null;
          try { json = await res.json(); } catch (e) { json = null; }

          if (!res.ok) {
            const serverMsg = json && (json.error || json.message) ? (json.error || json.message) : `Error del servidor (${res.status})`;
            setProcessing(false);
            Alert.alert('Error', String(serverMsg));
            return;
          }

          const transactionId = json?.transaction_id ?? json?.data?.transaction_id ?? json?.data?.transactionId ?? json?.transactionId ?? null;
          if (!transactionId) {
            setProcessing(false);
            Alert.alert('Error', 'El servidor no devolvió transaction_id. Revisa la respuesta en logs.');
            console.log('createTransaction response:', json);
            return;
          }

          try { await AsyncStorage.setItem(lastTransactionKeyForSale(sale_id), String(transactionId)); } catch (e) { /**/ }

          const checkoutUrl = json?.checkout_url ?? json?.data?.checkout_url ?? null;
          if (checkoutUrl) { try { Linking.openURL(checkoutUrl); } catch (e) { console.warn('open checkoutUrl failed', e); } }

          const pollResult = await pollSplitsUntilPaid(transactionId, 120000, 3000);
          setProcessing(false);
          if (pollResult.ok) {
            try {
              navigation.navigate('ConfirmacionPago', { transactionId, sale_id, amount: displayAmountFinal });
            } catch (e) {
              console.warn('navigate Confirmacion pago failed', e);
            }
            return;
          } else {
            Alert.alert('Pendiente', 'Transacción creada pero no se confirmó el pago inmediatamente.');
            navigation.goBack();
            return;
          }
        } catch (err) {
          console.warn('Error creando transaccion con token', err);
          setProcessing(false);
          Alert.alert('Error', 'No se pudo crear la transacción. Revisa la conexión y la URL.');
        }
      }

      if (data.type === 'error') {
        setProcessing(false);
        Alert.alert('Error', String(data.message || 'Ocurrió un error en la ventana de pago.'));
        return;
      }
    } catch (err) {
      console.warn('handleWebMessage parse error', err);
    }
  };

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
        Alert.alert('Error', 'No se pudieron obtener las credenciales de OpenPay. Revisa servidor/configuración.');
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

  const requestTokenFromWebView = (cardData) => {
    try {
      webviewRef.current && webviewRef.current.postMessage(JSON.stringify({ type: 'create_token', cardData }));
    } catch (e) {
      console.warn('postMessage create_token failed', e);
      Alert.alert('Error', 'No se pudo iniciar la creación del token.');
      setProcessing(false);
    }
  };

  const formatCardNumber = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const validateNativeForm = () => {
    if (!holder || holder.trim().length < 2) return 'Ingresa el nombre en la tarjeta';
    const digits = (cardNum || '').replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return 'Número de tarjeta inválido';
    if (!/^\d{2}$/.test(mm)) return 'Mes inválido';
    if (!/^\d{2}$/.test(yy)) return 'Año inválido';
    if (!/^\d{3,4}$/.test(cvv)) return 'CVV inválido';
    return null;
  };

  const onPayPress = () => {
    const v = validateNativeForm();
    if (v) { Alert.alert('Atención', v); return; }

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

  const nativeLogoSource = logoUrl ? { uri: logoUrl } : DEFAULT_LOGO;
  const restaurantSrc = restaurantImage ? { uri: restaurantImage } : DEFAULT_RESTAURANT;
  const currentDateText = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

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
        style={[
          styles.gradientHeader,
          {
            height: GRADIENT_HEIGHT,
            paddingHorizontal: H_PADDING,
            borderBottomRightRadius: 28,
            borderBottomLeftRadius: 0,
          }
        ]}
      >
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
                onChangeText={(t) => setCardNum(formatCardNumber(t))}
                keyboardType="number-pad"
                maxLength={23}
                placeholderTextColor="#96a0b8"
              />
            </View>

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

      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#0b58ff" style={{ marginRight: 12 }} />
            <Text style={styles.processingText}>Procesando pago…</Text>
          </View>
        </View>
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

  gradientHeader: {
    paddingVertical: 18,
  },
  gradientInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

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

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eef4ff', paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 44, fontSize: 14, color: '#0b1220' },

  rowSmall: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  inputWrapSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eef4ff', paddingHorizontal: 8, backgroundColor: '#fff' },
  inputIconSmall: { marginRight: 8 },
  inputSmall: { flex: 1, height: 44, fontSize: 14, color: "#000"},

  processingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2,6,23,0.18)' },
  processingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  processingText: { fontWeight: '700', fontSize: 16, color: '#0b1220' },
});
