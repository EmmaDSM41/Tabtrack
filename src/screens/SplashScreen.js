// SplashScreen.js
import React, { useEffect } from 'react';
import { Image, StyleSheet, Platform, PixelRatio, useWindowDimensions, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let mounted = true;

    const decideAndNavigate = async () => {
      try {
        // Comprobamos claves que guarda Login.js para decidir si hay sesión activa.
        const uid = await AsyncStorage.getItem('user_usuario_app_id');
        const valid = await AsyncStorage.getItem('user_valid');
        const email = await AsyncStorage.getItem('user_email');

        const hasSession = !!(uid || (valid && (valid === 'true' || valid === '1')) || email);

        // Mantener el mismo delay visual que ya tenía: 3s
        setTimeout(() => {
          if (!mounted) return;
          navigation.replace(hasSession ? 'Home' : 'Welcome');
        }, 3000);
      } catch (err) {
        // En caso de error, seguir al welcome (pero mantener el splash por 3s)
        setTimeout(() => {
          if (!mounted) return;
          navigation.replace('Welcome');
        }, 3000);
      }
    };

    decideAndNavigate();

    return () => {
      mounted = false;
    };
  }, [navigation]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // --- CORRECCIÓN: usar topInset respetando safe area + StatusBar como fallback ---
  const topInset = Math.max((insets?.top ?? 0), (StatusBar.currentHeight ?? 0));
  const bottomInset = insets?.bottom ?? 0;
  // -------------------------------------------------------------------------------

  const logoSize = clamp(Math.round(Math.min(width * 0.56, height * 0.4)), rf(90), 360);

  return (
    <LinearGradient
      colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
      locations={[0.35, 0.85]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}
    >
      <Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        accessibilityLabel="Logo TabTrack"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    resizeMode: 'contain',
  },
});
