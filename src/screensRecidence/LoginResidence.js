import React, { useState } from 'react';
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
  useWindowDimensions,
  StatusBar,
  ScrollView,
} from 'react-native';

export default function ResidenceLoginScreen({ navigation }) {
  const { width, height } = useWindowDimensions();

  const wp = (percent) => Math.round((percent / 100) * width);
  const hp = (percent) => Math.round((percent / 100) * height);
  const basePadding = Math.max(12, wp(6));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onContinue = () => {
     navigation.navigate('CodeResidence');
  };

  const onCreateAccount = () => {
    console.log('Crear cuenta pressed');
  };

  const onTerms = () => {
    console.log('Terms pressed');
  };

  const onPrivacy = () => {
    console.log('Privacy pressed');
  };

  const logoWidth = Math.round(Math.min(wp(48), 280));
  const inputHeight = Math.round(Math.max(44, hp(6)));
  const buttonHeight = Math.round(Math.max(48, hp(6.5)));
  const borderRadius = 12;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: basePadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topSpacer} />

          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={{ width: logoWidth, height: Math.round(logoWidth * 0.72), resizeMode: 'contain' }}
            />
          </View>

          <Text style={[styles.instruction, { marginTop: Math.round(hp(2)), marginBottom: Math.round(hp(1)) }]}>
            Introduce tu correo electrónico para iniciar sesión
          </Text>

          <View style={{ width: '100%', marginTop: 6 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@domain.com"
              placeholderTextColor="#9aa0a6"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  height: inputHeight,
                  borderRadius,
                  marginBottom: 12,
                },
              ]}
              returnKeyType="next"
              onSubmitEditing={() => { }}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="contraseña"
              placeholderTextColor="#9aa0a6"
              secureTextEntry
              style={[
                styles.input,
                {
                  height: inputHeight,
                  borderRadius,
                  marginBottom: 18,
                },
              ]}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onContinue}
            style={[
              styles.primaryButton,
              {
                height: buttonHeight,
                borderRadius: Math.round(buttonHeight / 2),
                marginBottom: Math.round(hp(2)),
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </TouchableOpacity>

          <View style={styles.sepRow}>
            <View style={styles.sepLine} />
            <View style={styles.sepDot} />
            <View style={styles.sepLine} />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onCreateAccount}
            style={[
              styles.primaryButton,
              {
                height: buttonHeight,
                borderRadius: Math.round(buttonHeight / 2),
                backgroundColor: '#000',
                marginTop: Math.round(hp(2)),
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>Crear Cuenta</Text>
          </TouchableOpacity>

          <Text style={[styles.legal, { marginTop: Math.round(hp(5)), marginBottom: Math.round(hp(6)) }]}>
            Al hacer clic en continuar, aceptas nuestros{' '}
            <Text style={styles.link} onPress={onTerms}>Términos de Servicio</Text>{' '}
            y nuestra{' '}
            <Text style={styles.link} onPress={onPrivacy}>Política de Privacidad</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: {
    alignItems: 'center',
    paddingTop: 18,
  },
  topSpacer: { height: 6 },

  logoWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 46,
  },

  instruction: {
    textAlign: 'center',
    color: '#222',
    fontSize: 15,
    paddingHorizontal: 6,
  },

  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 14,
    color: '#111',
    fontSize: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },

  primaryButton: {
    width: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  sepRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    justifyContent: 'center',
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e6e6e6',
    marginHorizontal: 12,
  },
  sepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fff',
  },

  legal: {
    textAlign: 'center',
    color: '#7a7a7a',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  link: {
    color: '#000',
    fontWeight: '700',
  },
});
