import React, { useRef, useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

 const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MjE4NzAyOCwianRpIjoiMTdlYTVjYTAtZTE3MC00ZjIzLTllMTgtZmZiZWYyMzg4OTE0IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjIxODcwMjgsImV4cCI6MTc2NDc3OTAyOCwicm9sIjoiRWRpdG9yIn0.W_zoGW2YpqCyaxpE1c_hnRXdtw5ty0DDd8jqvDbi6G0'; 

 const SEND_BASE = 'https://api.tab-track.com/api/mobileapp/usuarios/verification-codes';
const VALIDATE_BASE = 'https://api.tab-track.com/api/mobileapp/usuarios/verification-codes/validate';

export default function VerificationScreen({ navigation, route }) {
  const NUM = 6;
  const [digits, setDigits] = useState(Array(NUM).fill(''));
  const inputsRef = useRef(Array(NUM).fill(null));
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [email, setEmail] = useState(null);
  const [resendCount, setResendCount] = useState(0);
  const [resendLimitReached, setResendLimitReached] = useState(false);

  // responsive helpers (patrón Propina.js)
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Responsive sizes
  const horizontalPadding = Math.max(12, Math.round(width * 0.06));
  const topSpacingHeight = clamp(rf(18), 120, 48);
  const logoSize = clamp(Math.round(Math.min(width * 0.56, height * 0.32)), rf(80), 360);
  const otpSize = clamp(Math.round(Math.min(60, Math.max(44, (width - horizontalPadding * 2 - 48) / NUM))), 40, 80);
  const otpMargin = Math.max(6, Math.round(width * 0.015));
  const helperFont = clamp(rf(14), 12, 18);
  const titleFont = clamp(rf(22), 18, 32);
  const verifyBtnWidth = Math.round(Math.min(520, Math.max(width * 0.6, width * 0.8)));
  const bottomSafe = insets.bottom || 16;
  // end responsive

  // key for storing resend count per email
  const resendKeyFor = (e) => `verification_resend_count_${String(e || '').toLowerCase()}`;

  useEffect(() => {
    (async () => {
      // Preferir el email que venga en params
      try {
        const fromParams = route?.params?.email ?? route?.params?.mail ?? route?.params?.userEmail ?? null;
        if (fromParams && String(fromParams).trim()) {
          const normalized = String(fromParams).trim();
          setEmail(normalized);
          await AsyncStorage.setItem('user_email', normalized);
          await AsyncStorage.setItem('email', normalized);
          await loadResendCount(normalized);
          return;
        }
      } catch (e) {
        console.warn('VerificationScreen: error reading email from params', e);
      }

      // Si no vino por params, intentar leer desde AsyncStorage
      (async () => {
        try {
          const keys = ['user_email', 'email', 'mail'];
          for (const k of keys) {
            const v = await AsyncStorage.getItem(k);
            if (v && String(v).trim()) {
              const normalized = String(v).trim();
              setEmail(normalized);
              await loadResendCount(normalized);
              return;
            }
          }
        } catch (e) {
          console.warn('VerificationScreen: error reading email from storage', e);
        }
      })();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadResendCount = async (e) => {
    if (!e) return;
    try {
      const raw = await AsyncStorage.getItem(resendKeyFor(e));
      const n = raw ? Number(raw) : 0;
      const safe = Number.isFinite(n) ? Math.max(0, Math.min(9999, n)) : 0;
      setResendCount(safe);
      setResendLimitReached(safe >= 5);
    } catch (err) {
      console.warn('loadResendCount error', err);
      setResendCount(0);
      setResendLimitReached(false);
    }
  };

  const focusTo = (idx) => {
    if (inputsRef.current[idx]) inputsRef.current[idx].focus();
  };

  const handleChange = (text, idx) => {
    const ch = String(text).replace(/[^0-9]/g, '').slice(0, 1);
    const copy = [...digits];
    copy[idx] = ch;
    setDigits(copy);
    if (ch && idx < NUM - 1) {
      focusTo(idx + 1);
    }
    if (!ch && idx > 0) {
      // si borró, dejamos que el usuario maneje foco (no tocar lógica)
    }
  };

  const handleKeyPress = ({ nativeEvent }, idx) => {
    if (nativeEvent.key === 'Backspace' && digits[idx] === '' && idx > 0) {
      focusTo(idx - 1);
      const copy = [...digits];
      copy[idx - 1] = '';
      setDigits(copy);
    }
  };

  const joinCode = () => digits.join('');

  // obtiene email desde params o AsyncStorage (promesa)
  const getEmailFromParamsOrStorage = async () => {
    const fromParams = route?.params?.email ?? route?.params?.mail ?? route?.params?.userEmail ?? null;
    if (fromParams && String(fromParams).trim()) return String(fromParams).trim();
    try {
      const keys = ['user_email', 'email', 'mail'];
      for (const k of keys) {
        const v = await AsyncStorage.getItem(k);
        if (v && String(v).trim()) return String(v).trim();
      }
    } catch (e) { /* ignore */ }
    return null;
  };

  const persistResendCount = async (e, count) => {
    try {
      await AsyncStorage.setItem(resendKeyFor(e), String(count));
    } catch (err) {
      console.warn('persistResendCount error', err);
    }
  };

  const onResend = async () => {
    setVerificationError('');
    setInfoMessage('');
    try {
      const e = await getEmailFromParamsOrStorage();
      if (!e) {
        Alert.alert('Correo no disponible', 'No se pudo determinar el correo. Vuelve al registro o intenta ingresar el correo manualmente.');
        return;
      }
      // reload current count in case persisted changed elsewhere
      const rawCnt = await AsyncStorage.getItem(resendKeyFor(e));
      const cnt = rawCnt ? Number(rawCnt) : resendCount;
      const current = Number.isFinite(cnt) ? Math.max(0, cnt) : 0;
      if (current >= 5) {
        setResendLimitReached(true);
        setInfoMessage('Has alcanzado el límite de reenvíos (5).');
        return;
      }

      setLoadingResend(true);

      // enviar POST { email }
      const res = await fetch(SEND_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        },
        body: JSON.stringify({ email: e }),
      });

      let bodyText = null;
      try { bodyText = await res.text(); } catch (_) { bodyText = null; }

      if (!res.ok) {
        // intentar parsear mensaje útil
        let msg = 'No se pudo reenviar el código. Intenta más tarde.';
        try {
          if (bodyText) {
            const parsed = JSON.parse(bodyText);
            if (parsed && parsed.message) msg = parsed.message;
            else if (parsed && parsed.error) msg = parsed.error;
          }
        } catch (_) { /* keep default */ }
        setVerificationError(msg);
        console.warn('Resend failed', res.status, bodyText);
        return;
      }

      // ok: incrementar contador
      const newCount = current + 1;
      setResendCount(newCount);
      await persistResendCount(e, newCount);
      setResendLimitReached(newCount >= 5);

      // mostrar mensaje informativo
      setInfoMessage('Código enviado. Revisa tu correo (incluye spam).');
      // Clear any previous error
      setVerificationError('');
    } catch (err) {
      console.warn('onResend error', err);
      setVerificationError('Error al reenviar el código. Revisa tu conexión.');
    } finally {
      setLoadingResend(false);
    }
  };

  const onVerify = async () => {
    setVerificationError('');
    setInfoMessage('');
    const code = joinCode();
    if (!code || code.length < NUM) {
      setVerificationError('Ingresa el código completo.');
      return;
    }

    setLoadingVerify(true);
    try {
      const e = await getEmailFromParamsOrStorage();
      if (!e) {
        Alert.alert('Email no disponible', 'No pude localizar el correo asociado. Vuelve al registro o intenta nuevamente.');
        setLoadingVerify(false);
        return;
      }

      // llamar validate
      const url = `${VALIDATE_BASE}?email=${encodeURIComponent(e)}&code=${encodeURIComponent(code)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        },
      });

      // parse JSON seguro
      let json = null;
      try { json = await res.json(); } catch (err) { json = null; }

      if (res.ok && json && json.valid === true) {
        // marcado como válido: opcionalmente persistir bandera local y navegar
        try {
          await AsyncStorage.setItem('user_verified', '1');
          // si quieres marcar doble_verificacion locally:
          await AsyncStorage.setItem('user_double_verification', '1');
        } catch (e) {
          console.warn('persist local verification flag error', e);
        }

        // navegar
        navigation.navigate('Loading');
        return;
      }

      // si llegamos aquí: server dijo invalid o hubo error
      let msg = 'Código incorrecto o expirado.';
      if (json && json.message) msg = json.message;
      setVerificationError(msg);
    } catch (err) {
      console.warn('Verification error', err);
      setVerificationError('Error al verificar. Intenta nuevamente.');
    } finally {
      setLoadingVerify(false);
    }
  };

  // UI: friendly message about resend attempts left
  const renderResendInfo = () => {
    if (!email) return null;
    const left = Math.max(0, 5 - (Number(resendCount) || 0));
    if (resendLimitReached) {
      return <Text style={[styles.resendNote, { fontSize: helperFont }]}>Límite de reenvíos alcanzado (5).</Text>;
    }
    return <Text style={[styles.resendNote, { fontSize: helperFont }]}>Reenvíos disponibles: {left}</Text>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[styles.container, { paddingHorizontal: horizontalPadding }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ height: topSpacingHeight }} />

          <View style={[styles.logoWrap, { marginTop: Math.round(rf(6)) }]}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={{ width: logoSize, height: Math.round(logoSize * 0.48), resizeMode: 'contain' }}
            />
          </View>

          {/* --- ESPACIO EXTRA DESPUÉS DEL LOGO para bajar el contenido (solicitud) --- */}
          <View style={{ height: Math.round(rf(12)) }} />

          <Text style={[styles.title, { fontSize: titleFont }]}>Valida tu cuenta</Text>

          <View style={{ marginTop: Math.round(rf(8)) }}>
            <Text style={[styles.emailText, { fontSize: helperFont }]}>{email ? `Código enviado a: ${email}` : 'No se detectó correo'}</Text>
          </View>

          <View style={[styles.otpRow, { marginTop: Math.round(rf(18)) }]}>
            {Array.from({ length: NUM }).map((_, i) => (
              <TextInput
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                value={digits[i]}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                returnKeyType="done"
                textContentType="oneTimeCode"
                maxLength={1}
                style={[
                  styles.otpInput,
                  {
                    width: otpSize,
                    height: otpSize,
                    marginHorizontal: otpMargin,
                    fontSize: Math.round(otpSize * 0.38),
                    borderRadius: Math.round(otpSize / 2),
                  },
                ]}
                selectionColor={PRIMARY}
                autoFocus={i === 0}
              />
            ))}
          </View>

          <Text style={[styles.helperText, { fontSize: helperFont, marginTop: Math.round(rf(14)), paddingHorizontal: Math.round(rf(6)) }]}>
            Por favor ingresa el código de verificación que enviamos por correo.
          </Text>

          {verificationError ? (
            <View style={{ marginTop: Math.round(rf(12)), paddingHorizontal: 12 }}>
              <Text style={{ color: '#ef4444', textAlign: 'center', fontWeight: '700', fontSize: helperFont }}>{verificationError}</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={{ marginTop: Math.round(rf(12)), paddingHorizontal: 12 }}>
              <Text style={{ color: '#0b8f56', textAlign: 'center', fontWeight: '700', fontSize: helperFont }}>{infoMessage}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', marginTop: Math.round(rf(18)), alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={onResend}
              style={[
                styles.resendBtn,
                resendLimitReached && { opacity: 0.5 },
                { minWidth: Math.max(120, Math.round(width * 0.35)), paddingHorizontal: Math.max(12, Math.round(width * 0.03)) },
              ]}
              disabled={loadingResend || resendLimitReached}
            >
              {loadingResend ? <ActivityIndicator color={PRIMARY} /> : <Text style={[styles.resendBtnText, { fontSize: helperFont, fontWeight: '800' }]}>Reenviar código</Text>}
            </TouchableOpacity>

            <View style={{ width: Math.round(Math.max(10, width * 0.03)) }} />

            <TouchableOpacity
              onPress={async () => {
                // pequeña ayuda: abrir correo o mostrar instrucciones
                Alert.alert('Ayuda', 'Si no llega el correo, revisa tu carpeta de spam o intenta reenviar el código.');
              }}
              style={[styles.spamInfo, { paddingHorizontal: Math.max(10, Math.round(width * 0.03)), paddingVertical: Math.max(8, Math.round(rf(8))), marginTop: 0 }]}
            >
              <Text style={[styles.spamText, { fontSize: helperFont * 0.95 }]}>¿No recibiste el correo?</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: Math.round(rf(8)), alignItems: 'center' }}>
            {renderResendInfo()}
          </View>

          {/* --- MENSAJE SOLICITADO: "Revisa tu bandeja de spam" (entre reenvíos disponibles y verificar) --- */}
          <View style={{ marginTop: Math.round(rf(50)), alignItems: 'center', paddingHorizontal: Math.round(rf(6)) }}>
            <Text style={{ fontSize: helperFont, color: PRIMARY, textAlign: 'center', fontWeight: '800' }}>Revisa tu bandeja de spam.</Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              { width: verifyBtnWidth, paddingVertical: Math.max(12, Math.round(rf(12))), marginBottom: Math.max(24, bottomSafe) },
              joinCode().length < NUM && { opacity: 0.6 },
            ]}
            onPress={onVerify}
            activeOpacity={0.9}
            disabled={joinCode().length < NUM || loadingVerify}
          >
            {loadingVerify ? <ActivityIndicator color="#fff" /> : <Text style={[styles.verifyBtnText, { fontSize: clamp(rf(16), 14, 20) }]}>VERIFICAR</Text>}
          </TouchableOpacity>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const PRIMARY = '#0046ff';
const PURPLE = '#6b2cff';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, alignItems: 'center' },
  topSpacing: { height: 28 },

  logoWrap: { alignItems: 'center', justifyContent: 'center', width: '100%' },

  title: { marginTop: 18, color: PRIMARY, textAlign: 'center', fontWeight: '800' },

  emailText: { marginTop: 8, color: '#374151', textAlign: 'center' },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },

  otpInput: {
    backgroundColor: '#f3f4f6',
    textAlign: 'center',
    fontWeight: '800',
    color: '#222',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  helperText: {
    marginTop: 18,
    lineHeight: 20,
    color: '#334155',
    textAlign: 'center',
  },

  resendBtn: {
    backgroundColor: '#fff',
    borderColor: PRIMARY,
    borderWidth: 1.4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  resendBtnText: { color: PRIMARY },

  spamInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: '#e6eefc',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 18,
  },
  spamText: { color: '#6b7280', textDecorationLine: 'underline' },

  resendNote: { marginTop: 8, color: '#6b7280' },

  verifyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  verifyBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.6 },
});
