import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://api.tab-track.com/api/mobileapp/usuarios';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NDc4MTQ5MiwianRpIjoiYTFjMDUzMzUtYzI4Mi00NDY2LTllYzYtMjhlZTlkZjYxZDA2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjQ3ODE0OTIsImV4cCI6MTc2NzM3MzQ5Miwicm9sIjoiRWRpdG9yIn0.O8mIWbMyVGZ1bVv9y5KdohrTdWFtaehOFwdJhwV8RuU';
const VERIF_URL = 'https://api.tab-track.com/api/mobileapp/usuarios/verification-codes';
const PRIMARY = '#0046ff';

const DRAFT_KEY = 'cuenta_form_draft_v1';

export default function Cuenta({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [firmaDeslinde, setFirmaDeslinde] = useState(false);

  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const DRAFT_TTL = 3 * 60 * 1000;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);

        const savedAt = parsed._savedAt ?? parsed.savedAt ?? 0;
        const age = Date.now() - savedAt;

        if (age <= DRAFT_TTL) {
          if (!isMountedRef.current) return;
          if (parsed.nombre) setNombre(parsed.nombre);
          if (parsed.apellido) setApellido(parsed.apellido);
          if (parsed.mail) setMail(parsed.mail);
          if (parsed.password) setPassword(parsed.password);
          if (parsed.telefono) setTelefono(parsed.telefono);
          if (typeof parsed.firmaDeslinde === 'boolean') setFirmaDeslinde(parsed.firmaDeslinde);
          if (typeof parsed.privacyChecked === 'boolean') setPrivacyChecked(parsed.privacyChecked);
          if (typeof parsed.termsChecked === 'boolean') setTermsChecked(parsed.termsChecked);
        }
        await AsyncStorage.removeItem(DRAFT_KEY);
      } catch (err) {
        console.warn('Error al restaurar draft desde focus:', err);
        try { await AsyncStorage.removeItem(DRAFT_KEY); } catch(e) {}
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [navigation]);

  const saveDraftForTerms = async () => {
    try {
      const draft = {
        nombre,
        apellido,
        mail,
        password,
        telefono,
        firmaDeslinde,
        privacyChecked,
        termsChecked,
        _savedAt: Date.now(),
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
      console.warn('Error guardando draft temporal:', err);
    }
  };

  const onPressTerms = async () => {
    await saveDraftForTerms();
    navigation.navigate('Terms');
  };

  const handleRegister = async () => {
    if (!firmaDeslinde) {
      return Alert.alert('Debes aceptar la firma de deslinde');
    }
    if (!privacyChecked || !termsChecked) {
      return Alert.alert('Debes aceptar privacidad y términos');
    }
    if (!nombre || !apellido || !mail || !password || !telefono) {
      return Alert.alert('Completa todos los campos obligatorios');
    }

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          nombre,
          apellido,
          mail,
          password,
          telefono,
          firma_deslinde: firmaDeslinde,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.status === 201) {
        try {
          await AsyncStorage.removeItem(DRAFT_KEY);
        } catch (err) {
          console.warn('No se pudo borrar draft tras registro:', err);
        }

        try {
          await AsyncStorage.setItem('user_email', String(mail));
          await AsyncStorage.setItem('email', String(mail));
        } catch (e) {
          console.warn('No se pudo persistir email en AsyncStorage:', e);
        }

        let sendOk = false;
        try {
          const sendRes = await fetch(VERIF_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify({ email: mail }),
          });

          if (sendRes.ok) {
            sendOk = true;
          } else {
            const sendText = await sendRes.text().catch(() => null);
            console.warn('Verification code send failed', sendRes.status, sendText);
          }
        } catch (errSend) {
          console.warn('Error enviando código de verificación:', errSend);
        }

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Verificacion', params: { email: mail, verificationSent: !!sendOk } }],
          })
        );

        if (!sendOk) {
          setTimeout(() => {
            Alert.alert(
              'Aviso',
              'No pude enviar el código automáticamente. En la pantalla de verificación puedes reintentar "Reenviar código".'
            );
          }, 400);
        }
      } else {
        Alert.alert('Error al registrar', (data && (data.error || data.message)) ? (data.error || data.message) : JSON.stringify(data));
      }
    } catch (err) {
      Alert.alert('Error de red', err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // generar estilos responsivos (pasamos insets para notch/status bar)
  const styles = makeStyles({ wp, hp, rf, clamp, width, height, Platform, insets });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tu cuenta</Text>
        </View>

        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.stepTitle}>Termina de registrarme</Text>

        <Text style={styles.sectionTitle}>Datos del perfil</Text>

        <View style={styles.group}>
          <TextInput
            placeholder="Nombre"
            placeholderTextColor="#999"
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            returnKeyType="next"
          />
          <TextInput
            placeholder="Apellido"
            placeholderTextColor="#999"
            style={styles.input}
            value={apellido}
            onChangeText={setApellido}
            returnKeyType="next"
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            style={styles.input}
            keyboardType="email-address"
            value={mail}
            onChangeText={setMail}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#999"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="next"
          />
          <TextInput
            placeholder="Teléfono"
            placeholderTextColor="#999"
            style={styles.input}
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
            returnKeyType="done"
          />
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity onPress={() => setFirmaDeslinde(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: firmaDeslinde }}>
            <Ionicons
              name={firmaDeslinde ? 'checkbox' : 'square-outline'}
              size={Math.round(rf(4))}
              color={PRIMARY}
            />
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Acepto la firma de deslinde</Text>
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity onPress={() => setPrivacyChecked(p => !p)} accessibilityRole="checkbox" accessibilityState={{ checked: privacyChecked }}>
            <Ionicons
              name={privacyChecked ? 'checkbox' : 'square-outline'}
              size={Math.round(rf(4))}
              color={PRIMARY}
            />
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            Acepto el uso de mis datos de acuerdo a la declaración de privacidad
          </Text>
        </View>

        <TouchableOpacity
          style={styles.termsButton}
          onPress={onPressTerms}
        >
          <Text style={styles.termsButtonText}>
            Consulta términos y condiciones
          </Text>
        </TouchableOpacity>

        <View style={styles.checkboxRow}>
          <TouchableOpacity onPress={() => setTermsChecked(t => !t)} accessibilityRole="checkbox" accessibilityState={{ checked: termsChecked }}>
            <Ionicons
              name={termsChecked ? 'checkbox' : 'square-outline'}
              size={Math.round(rf(4))}
              color={PRIMARY}
            />
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            Acepto términos y condiciones
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!(privacyChecked && termsChecked && firmaDeslinde) || loading) && { opacity: 0.5 }
          ]}
          disabled={!(privacyChecked && termsChecked && firmaDeslinde) || loading}
          onPress={handleRegister}
        >
          {loading ? (
            <ActivityIndicator color={PRIMARY} />
          ) : (
            <Text style={styles.continueButtonText}>Continuar</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// estilos responsivos generados por makeStyles
function makeStyles({ wp, hp, rf, clamp, width, height, Platform, insets }) {
  const topSafe = Math.round(Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0)));
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 28)); // padding lateral con límites
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: '#fff',
      paddingTop: topSafe,
    },
    container: {
      paddingHorizontal: sidePad,
      paddingTop: Math.round(hp(2)),
      paddingBottom: Math.round(hp(4) + (insets?.bottom ?? 0)),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Math.round(hp(1.2)),
    },
    backImage: {
      width: Math.round(clamp(wp(12), 36, 56)),
      height: Math.round(clamp(rf(4.4), 28, 56)),
      resizeMode: 'contain',
      tintColor: PRIMARY,
    },
    headerTitle: {
      fontSize: Math.round(clamp(rf(4.6), 16, 22)),
      marginLeft: Math.round(wp(3)),
      color: PRIMARY,
      fontWeight: '600',
    },
    logo: {
      width: Math.round(clamp(wp(28), 80, 180)),
      height: Math.round(clamp(rf(6.4), 32, 80)),
      resizeMode: 'contain',
      marginLeft: Math.round(wp(1)),
      marginBottom: Math.round(hp(2)),
      alignSelf: 'center',
    },
    stepTitle: {
      fontSize: Math.round(clamp(rf(4.2), 14, 20)),
      marginLeft: 0,
      marginBottom: Math.round(hp(1.6)),
      color: '#333',
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: Math.round(clamp(rf(4.2), 14, 18)),
      marginLeft: 0,
      marginBottom: Math.round(hp(1)),
      color: '#555',
      textAlign: 'left',
    },
    group: {
      borderWidth: 1,
      borderColor: PRIMARY,
      borderRadius: Math.round(wp(2)),
      marginBottom: Math.round(hp(2.4)),
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    input: {
      paddingVertical: Math.round(hp(1.4)),
      paddingHorizontal: Math.round(wp(3)),
      borderBottomWidth: 1,
      borderBottomColor: PRIMARY,
      fontSize: Math.round(clamp(rf(3.4), 12, 16)),
      color: '#333',
    },
    inputPlaceholder: {
      fontSize: Math.round(clamp(rf(2.8), 10, 14)),
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Math.round(hp(1)),
    },
    checkboxLabel: {
      flex: 1,
      fontSize: Math.round(clamp(rf(3.4), 12, 16)),
      color: '#333',
      marginLeft: Math.round(wp(3)),
    },
    termsButton: {
      backgroundColor: PRIMARY,
      paddingVertical: Math.round(hp(1.2)),
      borderRadius: Math.round(wp(2)),
      alignItems: 'center',
      marginVertical: Math.round(hp(2)),
      alignSelf: 'center',
      paddingHorizontal: Math.round(wp(4)),
    },
    termsButtonText: {
      color: '#fff',
      fontSize: Math.round(clamp(rf(3.6), 12, 16)),
    },
    termsTextContainer: {
      borderWidth: 1,
      borderColor: '#DDD',
      borderRadius: Math.round(wp(2)),
      padding: Math.round(wp(3)),
      marginBottom: Math.round(hp(1.6)),
    },
    termsText: {
      fontSize: Math.round(clamp(rf(3.2), 12, 14)),
      color: '#666',
      lineHeight: Math.round(clamp(rf(4.8), 16, 22)),
    },
    continueButton: {
      borderWidth: 1,
      borderColor: PRIMARY,
      borderRadius: Math.round(wp(2)),
      paddingVertical: Math.round(hp(1.4)),
      alignItems: 'center',
      marginTop: Math.round(hp(3)),
      alignSelf: 'stretch',
    },
    continueButtonText: {
      color: PRIMARY,
      fontSize: Math.round(clamp(rf(4.0), 14, 18)),
    },
  });
}
