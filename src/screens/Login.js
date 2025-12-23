import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NDc4MTQ5MiwianRpIjoiYTFjMDUzMzUtYzI4Mi00NDY2LTllYzYtMjhlZTlkZjYxZDA2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjQ3ODE0OTIsImV4cCI6MTc2NzM3MzQ5Miwicm9sIjoiRWRpdG9yIn0.O8mIWbMyVGZ1bVv9y5KdohrTdWFtaehOFwdJhwV8RuU';
const PRIMARY = '#FEFFFFFF';

export default function Login() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const BASE_WIDTH = 375;
  const rf = (size) => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const scaled = {
    paddingVertical: clamp(rf(60), 8, 140),
    logoWidth: clamp(rf(250), 120, Math.round(width * 0.9)),
    logoHeight: clamp(rf(100), 48, Math.round(width * 0.4)),
    titleFont: clamp(rf(34), 16, 46),
    titleMarginTop: clamp(rf(18), 6, 60),
    caritaFont: clamp(rf(34), 16, 46),
    inputWidthPct: '80%',
    inputHeight: clamp(rf(40), 36, 56),
    inputRadius: clamp(rf(20), 8, 28),
    inputPaddingH: clamp(rf(10), 8, 18),
    inicioWidthPct: '50%',
    inicioWidth: Math.min(Math.round(width * 0.5), 360),
    inicioHeight: clamp(rf(40), 36, 56),
    inicioRadius: clamp(rf(25), 12, 30),
    buttonTextSize: clamp(rf(16), 12, 20),
    forgotSize: clamp(rf(14), 10, 18),
    buttonContainerWidthPct: '80%',
    buttonContainerMarginTop: clamp(rf(40), 12, Math.round(height * 0.45)),
    toastBottomIOS: clamp(rf(80), 40, 140),
    toastBottomAndroid: clamp(rf(40), 20, 120),
  };

  const topInset = Math.max(insets.top ?? 0, StatusBar.currentHeight ?? 0);
  const headerApprox = 56; 
  const keyboardVerticalOffset = Platform.OS === 'ios' ? topInset + headerApprox : (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20);

  const toastBottomBase = Platform.OS === 'ios' ? scaled.toastBottomIOS : scaled.toastBottomAndroid;
  const toastBottom = toastBottomBase + (insets.bottom ?? 0);
  const successToastBottom = toastBottom + 20;

  const titleCaritaSpacing = clamp(Math.round(scaled.titleFont * 0.5), 8, 48);

  const dynamic = StyleSheet.create({
    containerOverride: {
      paddingVertical: scaled.paddingVertical + topInset,
    },
    logoOverride: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
    },
    titleOverride: {
      fontSize: scaled.titleFont,
      marginTop: scaled.titleMarginTop,
    },
    caritaOverride: {
      fontSize: scaled.caritaFont,
      marginTop: Math.round(Math.max(4, scaled.titleFont * 0.05)),
    },
    inputOverride: {
      width: scaled.inputWidthPct,
      height: scaled.inputHeight,
      borderRadius: scaled.inputRadius,
      paddingHorizontal: scaled.inputPaddingH,
    },
    inicioOverride: {
      width: scaled.inicioWidth,
      height: scaled.inicioHeight,
      borderRadius: scaled.inicioRadius,
    },
    buttonTextOverride: {
      fontSize: scaled.buttonTextSize,
    },
    forgotOverride: {
      fontSize: scaled.forgotSize,
    },
    buttonContainerOverride: {
      width: scaled.buttonContainerWidthPct,
      marginTop: scaled.buttonContainerMarginTop,
    },
    toastOverride: {
      bottom: toastBottom,
    },
    successToastOverride: {
      bottom: successToastBottom,
    },
    titleCaritaContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaled.titleMarginTop,
      marginBottom: titleCaritaSpacing,
      paddingHorizontal: Math.round(Math.min(width * 0.08, 28)),
      minHeight: Math.round(scaled.titleFont * 1.6), 
      width: '100%',
    },
  });

  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);
  const toastAnim = useRef(new Animated.Value(0)).current;

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

  const handleLogin = async () => {
    if (!mail.trim() || !password) {
      return showToast('Falta correo o contraseña');
    }
    setLoading(true);
    try {
      const url = `${API_BASE}/usuarios/validate-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({ mail: mail.trim(), password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (res.status === 200) {
        const usuario = data.usuario || {};

        for (const [key, value] of Object.entries(usuario)) {
          if (value !== null && value !== undefined) {
            await AsyncStorage.setItem(`user_${key}`, String(value));
          }
        }

        if (usuario.usuario_app_id) {
          await AsyncStorage.setItem('user_usuario_app_id', usuario.usuario_app_id);
        }

        await AsyncStorage.setItem('user_valid', String(data.valid));

        const fullname = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
        await AsyncStorage.setItem('user_fullname', fullname);

        if (usuario.mail) {
          await AsyncStorage.setItem('user_email', usuario.mail);
        }

        showToast(
          fullname ? `¡Bienvenido, ${fullname}!` : '¡Bienvenido!',
          true,
          700,
          () => navigation.replace('Home')
        );
      } else {
        const errMsg = data?.error || data?.message || 'Correo o contraseña inválidos';
        showToast(errMsg);
      }
    } catch (err) {
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.container, dynamic.containerOverride]}
      >
        <Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, dynamic.logoOverride]}
        />

        <View style={dynamic.titleCaritaContainer}>
          <Text style={[styles.title, dynamic.titleOverride]}>¡Hola!</Text>
          <Text style={[styles.carita, dynamic.caritaOverride]}>:)</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', alignItems: 'center' }}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View style={[styles.inputWrapper, dynamic.inputOverride]}>
            <TextInput
              style={styles.inputInner}
              placeholder="Correo electrónico"
              placeholderTextColor="#000"
              value={mail}
              onChangeText={setMail}
              keyboardType="email-address"
              autoCapitalize="none"
              underlineColorAndroid="transparent" 
              importantForAutofill="yes"
              textContentType="username"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputWrapper, dynamic.inputOverride]}>
            <TextInput
              style={styles.inputInner}
              placeholder="Contraseña"
              placeholderTextColor="#000"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              underlineColorAndroid="transparent"
              importantForAutofill="yes"
              textContentType="password"
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.inicio,
              dynamic.inicioOverride,
              (loading || !mail.trim() || !password) && { opacity: 0.6 },
            ]}
            onPress={handleLogin}
            disabled={loading || !mail.trim() || !password}
          >
            {loading ? (
              <ActivityIndicator color={PRIMARY} />
            ) : (
              <Text style={[styles.buttonText, dynamic.buttonTextOverride]}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => navigation.navigate('SendEmail')}
          >
            <Text style={[styles.forgotPasswordText, dynamic.forgotOverride]}>¿Se te olvidó tu contraseña?</Text>
          </TouchableOpacity>

          <View style={[styles.buttonContainer, dynamic.buttonContainerOverride]}>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Animated.View
        pointerEvents="none"
        style={[
          toastStyle,
          (toastStyle === styles.toast ? { bottom: toastBottom } : { bottom: successToastBottom }),
          {
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
            }],
          },
        ]}
      >
        <Text style={[styles.toastText, toastStyle === styles.successToast && styles.successToastText]}>
          {toastMsg}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 60 },
  logo: { width: 250, height: 100, resizeMode: 'contain', marginTop: 5 },
  title: { fontSize: 34, color: '#000', textAlign: 'center', marginTop: 18, fontFamily: 'Montserrat-Bold' },
  carita: { fontSize: 34, color: '#000', textAlign: 'center', marginTop: 6, fontFamily: 'Montserrat-Bold' },
  inputWrapper: {
    width: '80%',
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    marginBottom: 16,

  },

  inputInner: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    color: '#000',
  },

  inicio: { width: '50%', height: 40, borderRadius: 25, backgroundColor: '#0046ff', marginTop: 18, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat-Regular' },
  buttonText1: { color: '#000', fontSize: 16, fontFamily: 'Montserrat-Regular' },
  forgotPasswordContainer: { marginTop: 6, alignItems: 'center' },
  forgotPasswordText: { color: '#000', fontFamily: 'Montserrat-Regular', fontSize: 14, opacity: 0.9 },
  buttonContainer: { width: '80%', marginTop: 18 },
  button: { backgroundColor: '#ffffff', padding: 7, borderRadius: 10, marginVertical: 3, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#000', borderRadius: 8, },
  icon: { width: 20, height: 20, marginRight: 10, color: "#000" },
  toast: { position: 'absolute', left: 12, right: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, maxWidth: '85%' },
  toastText: { color: '#fff', fontSize: 14, textAlign: 'center', fontFamily: 'Montserrat-Regular' },
  successToast: { position: 'absolute', left: 12, right: 12, alignSelf: 'center', backgroundColor: 'rgb(0, 50, 186)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, maxWidth: '90%' },
  successToastText: { fontSize: 16, fontFamily: 'Montserrat-Bold' },
});
