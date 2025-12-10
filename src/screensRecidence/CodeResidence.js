// CodeResidence.js
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function CodeResidence(props) {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

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

  const onContinue = async () => {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      Alert.alert('Código requerido', 'Por favor ingresa el código enviado por tu residencia.');
      return;
    }

    // Si el padre quiere validar antes, respeta prop onSubmit
    if (props.onSubmit && typeof props.onSubmit === 'function') {
      try {
        setLoading(true);
        await props.onSubmit(trimmed);
      } catch (e) {
        console.warn('onSubmit error', e);
        Alert.alert('Error', 'Ocurrió un error al validar el código.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // === Cambio pedido: en lugar de ir directo a Home, vamos a la pantalla de splash ===
    try {
      setLoading(true);
      navigation.navigate('SplashResidence', { residenceCode: trimmed });
    } catch (e) {
      console.warn('Navigation to ResidenceSplash failed:', e);
      Alert.alert('Navegación', 'No se encontró la ruta de destino. Integra la ruta "ResidenceSplash" o maneja onSubmit.');
    } finally {
      setLoading(false);
    }
  };

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
              // Ajusta la ruta si tu logo se llama distinto
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
            <Text style={[styles.continueText, { fontSize: Math.round(clamp(rf(3.8), 14, 18)) }]}>
              {loading ? '...Cargando' : 'Continuar'}
            </Text>
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
});
