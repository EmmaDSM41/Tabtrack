import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  PixelRatio,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_API_BASE = 'https://api.residence.tab-track.com';
const DEFAULT_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY'; 

export default function CodeResidence(props) {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const logoSize = clamp(Math.round(width * 0.38), 84, 160);
  const inputHeight = Math.round(clamp(rf(9), 44, 60));
  const buttonHeight = Math.round(clamp(rf(10), 48, 60));
  const contentPad = Math.round(Math.max(20, wp(6)));

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastSuccess, setToastSuccess] = useState(false);
  const toastHideTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastHideTimeoutRef.current) {
        clearTimeout(toastHideTimeoutRef.current);
        toastHideTimeoutRef.current = null;
      }
    };
  }, []);

  const showToast = (message, success = false, duration = 1800, cb) => {
    // clear previous timeout if any
    if (toastHideTimeoutRef.current) {
      clearTimeout(toastHideTimeoutRef.current);
      toastHideTimeoutRef.current = null;
    }
    setToastMsg(String(message ?? ''));
    setToastSuccess(!!success);

    toastAnim.setValue(0); 
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      toastHideTimeoutRef.current = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          toastHideTimeoutRef.current = null;
          if (typeof cb === 'function') cb();
        });
      }, duration);
    });
  };

  const getStoredEmail = async () => {
    const keysToTry = ['user_email', 'user_mail', 'userEmail', 'email'];
    try {
      for (const k of keysToTry) {
        const v = await AsyncStorage.getItem(k);
        if (v && String(v).trim()) return String(v).trim();
      }
    } catch (err) {
      console.warn('getStoredEmail error', err);
    }
    return null;
  };

  const getApiConfig = async () => {
    return { host: String(DEFAULT_API_BASE).replace(/\/$/, ''), token: String(DEFAULT_API_TOKEN) };
  };

  const callActivateApi = async (mail, tokenToSend) => {
    const { host, token: apiToken } = await getApiConfig();
    let base = (host || DEFAULT_API_BASE).replace(/\/$/, '');
    let endpoint = '';
    if (base.match(/\/api\/mobileapp$/i)) {
      endpoint = `${base}/residence/activate`;
    } else if (base.match(/\/api$/i)) {
      endpoint = `${base}/mobileapp/residence/activate`;
    } else {
      endpoint = `${base}/api/mobileapp/residence/activate`;
    }

    console.warn('callActivateApi -> POST', endpoint);

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (apiToken && apiToken.length > 0) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    const body = { mail: mail || '', token: tokenToSend || '' };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      return { ok: res.ok, status: res.status, json, endpoint };
    } catch (err) {
      console.warn('fetch error calling activate endpoint', err, endpoint);
      throw err;
    }
  };

  const onContinue = async () => {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      showToast('Código requerido — ingresa el código enviado por tu residencia.', false);
      return;
    }

    if (props.onSubmit && typeof props.onSubmit === 'function') {
      try {
        setLoading(true);
        await props.onSubmit(trimmed);
      } catch (e) {
        console.warn('onSubmit error', e);
        showToast('Ocurrió un error al validar el código.', false);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      const mailFromStorage = await getStoredEmail();
      if (!mailFromStorage) {
        setLoading(false);
        showToast('Correo no disponible. Asegúrate de haber iniciado sesión.', false);
        return;
      }

      let result;
      try {
        result = await callActivateApi(mailFromStorage, trimmed);
      } catch (err) {
        console.warn('callActivateApi error', err);
        setLoading(false);
        showToast('No se pudo conectar con el servidor. Revisa la URL y el token.', false);
        return;
      }

      setLoading(false);

      if (result.ok) {
        try {
          navigation.navigate('SplashResidence', { residenceCode: trimmed });
        } catch (e) {
          console.warn('Navigation to ResidenceSplash failed:', e);
          showToast('Código verificado — pero no se pudo navegar automáticamente.', true);
        }
        return;
      }

      const serverMsg =
        (result.json && (result.json.error || result.json.message || result.json.msg)) ??
        `Error del servidor (${result.status}) en ${result.endpoint ?? 'unknown'}`;
      showToast(String(serverMsg), false);
    } catch (e) {
      console.warn('onContinue unexpected error', e);
      setLoading(false);
      showToast('Ocurrió un error al validar el código.', false);
    } finally {
      setLoading(false);
    }
  };

  const translateY = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: contentPad, paddingTop: Math.round(hp(4)) }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={{ width: logoSize, height: Math.round(logoSize * 0.58), resizeMode: 'contain' }}
            />
          </View>

          <View style={{ height: Math.round(hp(10)) }} />

          <Text style={[styles.title, { fontSize: Math.round(clamp(rf(4.6), 16, 20)) }]}>
            Ingresa el código de tu residencia
          </Text>

          <View style={{ height: Math.round(hp(3.2)) }} />

          <TextInput
            value={code}
            onChangeText={(t) => setCode(t)}
            placeholder="Código enviado por tu residencia"
            placeholderTextColor="#9aa0a6"
            keyboardType="default"
            autoCapitalize="none"
            returnKeyType="done"
            style={[
              styles.input,
              {
                height: inputHeight,
                fontSize: Math.round(clamp(rf(3.6), 14, 18)),
                paddingHorizontal: Math.round(Math.max(12, wp(3))),
              },
            ]}
            onSubmitEditing={onContinue}
          />

          <View style={{ height: Math.round(hp(2)) }} />

          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.9}
            style={[
              styles.continueBtn,
              { height: buttonHeight, borderRadius: Math.round(buttonHeight / 2) },
            ]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.continueText, { fontSize: Math.round(clamp(rf(3.8), 14, 18)) }]}>
                Continuar
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: Math.round(hp(6.5)) }} />

          <Text style={[styles.termsText, { fontSize: Math.round(clamp(rf(2.8), 12, 14)), paddingHorizontal: 6, textAlign: 'center' }]}>
            Al hacer clic en continuar, aceptas nuestros{' '}
            <Text style={{ fontWeight: '700' }}>Términos de Servicio</Text> y nuestra{' '}
            <Text style={{ fontWeight: '700' }}>Política de Privacidad</Text>
          </Text>

          <View style={{ height: Math.max(56, hp(20)) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        pointerEvents="box-none"
        style={[
          toastSuccess ? styles.successToast : styles.toast,
          {
            top: (insets.top || 12) + 8,
            transform: [{ translateY }],
            opacity: toastAnim,
            zIndex: 9999,
            elevation: 9999,
          },
        ]}
      >
        <Text style={[styles.toastText, toastSuccess && styles.successToastText]}>{toastMsg}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 46,
  },
  title: {
    textAlign: 'center',
    color: '#111827',
    fontWeight: '800',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    color: '#111827',
  },
  continueBtn: {
    width: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#fff',
    fontWeight: '700',
  },
  termsText: {
    color: '#6b7280',
  },

  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignSelf: 'center',
    backgroundColor: '#0046ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  successToast: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignSelf: 'center',
    backgroundColor: 'rgb(0, 50, 186)', 
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 12,
  },
  successToastText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
});
