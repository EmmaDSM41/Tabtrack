import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = 'https://api.tab-track.com/api/mobileapp'; 
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';  

export default function ResetPasswordCodeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const paramMail = route?.params?.mail ?? '';

  const [mail] = useState(paramMail); 
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);

  const { width, height } = useWindowDimensions();
  const wp = (p) => (width * Number(p)) / 100;
  const hp = (p) => (height * Number(p)) / 100;
  const rf = (p) => Math.round((width * Number(p)) / 100);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const insets = useSafeAreaInsets();
  const topSafe = Math.round(
    Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0))
  );
  const bottomSafe = Math.round(insets.bottom || 0);

  const dynamicStyles = {
    container: {
      paddingHorizontal: Math.min(wp(6), 40),
      paddingVertical: Math.min(hp(6), 48),
    },
    logo: {
      width: Math.min(wp(55), 220),
      aspectRatio: 200 / 80,
      height: undefined,
      marginBottom: Math.min(hp(2.5), 22),
    },
    title: {
      fontSize: clamp(rf(4.6), 16, 28),
      marginBottom: Math.min(hp(1.8), 16),
    },
    subtitle: {
      fontSize: clamp(rf(2.0), 12, 16),
      marginBottom: Math.min(hp(1.2), 12),
      textAlign: 'center',
    },
    input: {
      height: clamp(hp(6.2), 40, 56),
      borderRadius: Math.round(Math.min(999, hp(3.2))),
      paddingHorizontal: Math.min(wp(4.5), 18),
      marginBottom: Math.min(hp(1.6), 14),
    },
    button: {
      width: Math.min(wp(72), 420),
      height: clamp(hp(6.4), 44, 60),
      borderRadius: Math.round(Math.min(999, hp(3.6))),
      marginVertical: Math.min(hp(2.2), 18),
    },
    buttonText: {
      fontSize: clamp(rf(2.4), 14, 18),
    },
    backText: {
      fontSize: clamp(rf(1.9), 12, 16),
      marginTop: Math.min(hp(1.2), 10),
    },
    toast: {
      bottom: Platform.OS === 'ios' ? Math.min(hp(8), 80) : Math.min(hp(5.2), 48),
      maxWidth: Math.min(width - 40, wp(90)),
    },
  };

  const showToast = (message, success = false, duration = 1500, cb) => {
    setToastMsg(message);
    setToastStyle(success ? styles.successToast : styles.toast);

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => cb && cb());
      }, duration);
    });
  };

  const validateEmail = (e) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(e).toLowerCase());
  };

  const validatePassword = (p) => {
    return typeof p === 'string' && p.length >= 6;
  };

  const handleUpdate = async () => {
    if (!mail || !mail.trim()) {
      showToast('Correo no disponible. Regresa y envía el correo primero.');
      return;
    }
    if (!validateEmail(mail.trim())) {
      showToast('Email inválido');
      return;
    }
    if (!code.trim()) {
      showToast('Ingresa el código');
      return;
    }
    if (!newPassword) {
      showToast('Ingresa la nueva contraseña');
      return;
    }
    if (!validatePassword(newPassword)) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/usuarios/reset-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          mail: mail.trim(),
          code: code.trim(),
          new_password: newPassword,
        }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text }; }

      if (res.ok) {
        showToast('Contraseña actualizada', true, 1400, () => navigation.replace('Login'));
      } else {
        const errMsg = data?.error || data?.message || data?.detalle || 'No se pudo actualizar contraseña';
        showToast(errMsg);
      }
    } catch (err) {
      console.warn('reset error:', err);
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const containerPaddingTop = dynamicStyles.container.paddingVertical + topSafe;
  const containerPaddingBottom = dynamicStyles.container.paddingVertical + bottomSafe;
  const toastBottom = (Platform.OS === 'ios' ? Math.min(hp(8), 80) : Math.min(hp(5.2), 48)) + bottomSafe;

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.container,
          dynamicStyles.container,
          { paddingTop: containerPaddingTop, paddingBottom: containerPaddingBottom },
        ]}
      >
        <Image source={require('../../assets/images/logo.png')} style={[styles.logo, dynamicStyles.logo]} />

        <Text style={[styles.title, dynamicStyles.title]}>Introduce los campos para completar el proceso</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Asegúrate de revisar que los campos sean correctos.
        </Text>

        {mail ? (
          <Text style={{ marginBottom: 10, fontFamily: 'Montserrat-Regular', color: '#000' }}>
            Correo: <Text style={{ fontFamily: 'Montserrat-Bold' }}>{mail}</Text>
          </Text>
        ) : (
          <Text style={{ marginBottom: 10, fontFamily: 'Montserrat-Regular', color: '#a00' }}>
            Correo no disponible. Regresa a la pantalla anterior.
          </Text>
        )}

        <TextInput
          style={[styles.input, styles.inputBorder, dynamicStyles.input]}
          placeholder="Código (ej. 123456)"
          placeholderTextColor="#000"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, styles.inputBorder, dynamicStyles.input]}
          placeholder="Nueva contraseña"
          placeholderTextColor="#000"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }, dynamicStyles.button]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0046ff" />
          ) : (
            <Text style={[styles.buttonText, dynamicStyles.buttonText]}>Actualizar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={[styles.backText, dynamicStyles.backText]}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Animated.View
        pointerEvents="none"
        style={[
          toastStyle,
          {
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
          { bottom: toastBottom, maxWidth: dynamicStyles.toast.maxWidth },
        ]}
      >
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logo: {
    width: 200,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#222',
    fontFamily: 'Montserrat-Regular',
    marginBottom: 18,
    opacity: 0.9,
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  inputBorder: {
    borderColor: '#000',
    borderWidth: 1,
    color: '#000',
  },
  button: {
    backgroundColor: '#0046ff',
    borderRadius: 25,
    width: '60%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  backText: {
    color: '#000',
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    opacity: 0.9,
  },
  toast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    maxWidth: '85%',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
  },
  successToast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgb(0, 50, 186)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    maxWidth: '90%',
  },
});
