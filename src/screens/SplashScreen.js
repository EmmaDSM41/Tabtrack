import React, { useEffect } from 'react';
import { Image, StyleSheet, Platform, PixelRatio, useWindowDimensions, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const DEFAULT_HOME_KEY = 'user_default_home';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let mounted = true;
    let timer = null;

    const decideAndNavigate = async () => {
      try {
        const uid = await AsyncStorage.getItem('user_usuario_app_id');
        const valid = await AsyncStorage.getItem('user_valid');
        const email = await AsyncStorage.getItem('user_email');
        const pendingVerification = await AsyncStorage.getItem('pendingVerification');

        // Sin ninguna señal de sesión → Welcome
        const hasSession = !!(uid || (valid && (valid === 'true' || valid === '1')) || email);

        if (!hasSession) {
          timer = setTimeout(() => {
            if (!mounted) return;
            navigation.replace('Welcome');
          }, 3000);
          return;
        }

        // ─── REFUERZO: si hay sesión, siempre consulta la API para ver doble_verificacion ───
        // Esto cubre el caso donde pendingVerification se perdió del storage
        let targetRoute = null;

if (email) {
  try {
    await ensureToken();
    const token = (typeof TOKEN === 'string' && TOKEN.trim()) ? TOKEN.trim() : null;

    const res = await fetch(
      `https://api.tab-track.com/api/mobileapp/usuarios?mail=${encodeURIComponent(email.trim())}&presign_ttl=30`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
 
            if (res.ok) {
              const json = await res.json();
              const usuario = json?.usuarios?.[0] ?? null;

              if (usuario && usuario.doble_verificacion === false) {
                // No hizo la doble verificación → forzar a pantalla de verificación
                await AsyncStorage.setItem(
                  'pendingVerification',
                  JSON.stringify({ email: email.trim(), createdAt: Date.now() })
                );
                targetRoute = 'Verificacion';
              }
            }
          } catch (apiErr) {
            // Si la API falla, caemos al comportamiento por flags locales abajo
            console.warn('SplashScreen: API check failed, falling back to local flags', apiErr);
          }
        }

        // Si la API no resolvió nada, usar los flags locales como fallback
        if (targetRoute === null) {
          if (pendingVerification) {
            targetRoute = 'Verificacion';
          } else {
            // Tiene sesión y no hay nada pendiente → Home
            const defaultHome = await AsyncStorage.getItem(DEFAULT_HOME_KEY);
            const residenceRaw = await AsyncStorage.getItem('user_residence_activo');
            const residenceActive = ['true', '1'].includes(
              String(residenceRaw ?? '').toLowerCase()
            );

            if (defaultHome === 'residence' && residenceActive) {
              targetRoute = 'HomeResidence';
            } else {
              targetRoute = 'Home';
            }
          }
        }

        timer = setTimeout(() => {
          if (!mounted) return;
          navigation.replace(targetRoute);
        }, 3000);
      } catch (err) {
        timer = setTimeout(() => {
          if (!mounted) return;
          navigation.replace('Welcome');
        }, 3000);
      }
    };

    decideAndNavigate();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [navigation]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const topInset = Math.max((insets?.top ?? 0), (StatusBar.currentHeight ?? 0));
  const bottomInset = insets?.bottom ?? 0;
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