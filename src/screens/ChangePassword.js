import React, { useState, useEffect, useRef } from 'react';
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
  PixelRatio,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = 'https://api.tab-track.com/api/mobileapp';
const API_TOKEN =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';
const PRIMARY = '#FEFFFFFF';

export default function ChangePassword() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // pass insets to styles generator so toast & paddings consider safe area
  const styles = makeStyles({ wp, hp, rf, clamp, width, height, Platform, insets });

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(''); 

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.toast);

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

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setOldPassword('');
      setNewPassword('');
    });

    // Obtener el email desde AsyncStorage al montar el componente
    const getEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('user_mail'); 
        if (storedEmail) {
          setEmail(storedEmail);
        } else {
          console.warn('No se encontró el email en AsyncStorage');
        }
      } catch (error) {
        console.error('Error al obtener el email desde AsyncStorage:', error);
      }
    };

    getEmail();
    return unsub;
  }, [navigation]);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      return showToast('Completa ambos campos');
    }

    setLoading(true);

    try {
      // leer email e id guardados en login
      const storedUserId = await AsyncStorage.getItem('user_id');

      if (!email && !storedUserId) {
        showToast('No se encontró usuario. Inicia sesión de nuevo.');
        setLoading(false);
        return;
      }

      // Primero intento endpoint por email (PUT /usuarios/change_password)
      if (email) {
        const urlEmail = `${API_BASE}/usuarios/change-password`;
        const resEmail = await fetch(urlEmail, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({
            mail: email, // Usar el estado 'email'
            password: oldPassword, // Usar 'password' en lugar de 'old_password'
            new_password: newPassword,
          }),
        });

        const textEmail = await resEmail.text();
        let dataEmail;
        try { dataEmail = JSON.parse(textEmail); } catch { dataEmail = { error: textEmail }; }

        if (resEmail.ok) {
          showToast('Contraseña actualizada', true, 1200, () => navigation.goBack());
          setLoading(false);
          return;
        } else {
          // si falla y no hay userId para fallback, mostrar error
          if (!storedUserId) {
            const errMsg = dataEmail?.error || dataEmail?.message || 'No se pudo actualizar';
            showToast(errMsg);
            setLoading(false);
            return;
          }
          // si hay userId, hacemos fallback abajo
        }
      }

      // Fallback: endpoint por id (PUT /usuarios/{id}/change_password)
      if (storedUserId) {
        const urlId = `${API_BASE}/usuarios/${storedUserId}/change-password`;
        const resId = await fetch(urlId, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({
            password: oldPassword, // Usar 'password' en lugar de 'old_password'
            new_password: newPassword,
          }),
        });

        const textId = await resId.text();
        let dataId;
        try { dataId = JSON.parse(textId); } catch { dataId = { error: textId }; }

        if (resId.ok) {
          showToast('Contraseña actualizada', true, 1200, () => navigation.goBack());
          setLoading(false);
          return;
        } else {
          const errMsg = dataId?.error || dataId?.message || 'No se pudo actualizar';
          showToast(errMsg);
          setLoading(false);
          return;
        }
      }

      // Caso extremo
      showToast('No se pudo cambiar la contraseña');
    } catch (err) {
      console.warn('ChangePassword error:', err);
      showToast('Error de red');
    } finally {
      setLoading(false);
    }
  };

  // ensure top safe area padding so content doesn't get cut on iOS notch or Android status bar
  const topPadding = Math.max(insets.top ?? 0, StatusBar.currentHeight ?? 0);

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
        locations={[0.35, 0.85]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.container, { paddingTop: topPadding }]}
      >
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.title}>Actualizar contraseña</Text>

        <TextInput
          style={[styles.input, styles.inputBorder]}
          placeholder="Contraseña actual"
          placeholderTextColor="#000"
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
        />

        <TextInput
          style={[styles.input, styles.inputBorder]}
          placeholder="Nueva contraseña"
          placeholderTextColor="#000"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0046ff" />
          ) : (
            <Text style={styles.buttonText}>Actualizar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Volver</Text>
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
        ]}
      >
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

// styles dinamicos generados con helpers responsivos
function makeStyles({ wp, hp, rf, clamp, width, height, Platform, insets }) {
  // compute safe bottom to place toast above home indicator on iOS and above nav bars on Android
  const safeBottom = Math.round((insets?.bottom ?? 0) + hp(1.6)); // small gap + responsive
  const iosDefaultBottom = Math.round(hp(9));
  const androidDefaultBottom = Math.round(hp(6));
  const toastBottom = Math.max(safeBottom, Platform.OS === 'ios' ? iosDefaultBottom : androidDefaultBottom);

  return StyleSheet.create({
    flex: { flex: 1 },

    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.round(wp(6)),
      paddingVertical: Math.round(hp(4)),
    },
    logo: {
      width: Math.round(clamp(wp(50), 120, 260)), // escala con límites
      height: Math.round(clamp(rf(11), 36, 120)),
      resizeMode: 'contain',
      marginBottom: Math.round(hp(2)),
    },
    title: {
      fontSize: Math.round(clamp(rf(6.2), 18, 28)),
      color: '#000',
      fontFamily: 'Montserrat-Bold',
      textAlign: 'center',
      marginBottom: Math.round(hp(2)),
    },

    input: {
      width: '100%',
      height: Math.round(clamp(hp(6.2), 40, 56)),
      borderRadius: Math.round(wp(4)),
      paddingHorizontal: Math.round(wp(4)),
      backgroundColor: 'transparent',
      marginBottom: Math.round(hp(1.8)),
      fontSize: Math.round(clamp(rf(3.4), 14, 18)),
    },
    inputBorder: {
      borderColor: '#000',
      borderWidth: 1,
      color: '#000',
    },

    button: {
      backgroundColor: '#0046ff',
      borderRadius: Math.round(wp(6)),
      width: Math.round(wp(60)),
      height: Math.round(clamp(hp(6.6), 44, 56)),
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: Math.round(hp(2)),
    },
    buttonText: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(3.6), 14, 18)),
      fontFamily: 'Montserrat-Bold',
    },

    backText: {
      color: '#000',
      fontFamily: 'Montserrat-Regular',
      fontSize: Math.round(clamp(rf(3.2), 12, 16)),
      opacity: 0.9,
    },

    toast: {
      position: 'absolute',
      bottom: toastBottom,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingVertical: Math.round(hp(1.2)),
      paddingHorizontal: Math.round(wp(4)),
      borderRadius: Math.round(wp(8)),
      maxWidth: '85%',
    },
    toastText: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(3.4), 12, 16)),
      textAlign: 'center',
      fontFamily: 'Montserrat-Regular',
    },
    successToast: {
      position: 'absolute',
      bottom: toastBottom,
      alignSelf: 'center',
      backgroundColor: 'rgb(0, 50, 186)',
      paddingVertical: Math.round(hp(1.4)),
      paddingHorizontal: Math.round(wp(5)),
      borderRadius: Math.round(wp(9)),
      maxWidth: '90%',
    },
  });
}
