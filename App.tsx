import React, { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initOneSignal } from './src/services/oneSignalService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureToken } from './src/auth/tokenManager';

import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateAccount from './src/screens/CreateAccount';
import Login from './src/screens/Login';
import Cuenta from './src/screens/Cuenta';
import Loading from './src/screens/Loading';
import ForgotPassword from './src/screens/ForgotPassword';

import Home from './src/screens/Home';
import TermsAndConditions from './src/screens/TermsAndConditions';
import VerificationScreen from './src/screens/VerificacionScreen';
import CodeResidence from './src/screensRecidence/CodeResidence';
import HomeResidence from './src/screensRecidence/HomeResidence';
import SplashResidence from './src/screensRecidence/SplashResidence';
import SendEmail from './src/screens/SendEmail';
import ResetPassword from './src/screens/ResetPassword';
import RecentAccounts from './src/screens/RecentAccount';
import QuickLogin from './src/screens/QuickLogin';
import SelectDefaultHome from './src/screens/SelectDefaultHome';

const Stack = createNativeStackNavigator();

const DEEP_LINK_TOKEN_KEY = 'pending_deep_link_token';

const linking = {
  prefixes: ['tabtrack://'],
  config: {
    screens: {
      Home: 'home',
    },
  },
};

function extractTokenFromDeepLink(url: string): string | null {
  if (!url) return null;
  // Soporta tanto tabtrack://r/TOKEN como tabtrack://r/TOKEN%20encodedado
  const match = url.match(/\/r\/([^\/?#]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function App() {
  const navigationRef = useRef<any>(null);

  const handleDeepLink = async (url: string | null) => {
    if (!url) return;
    const token = extractTokenFromDeepLink(url);
    if (!token) return;

    console.log('[DeepLink] Token recibido:', token);

    // Guardamos el token para que QRScreen lo consuma si la nav no está lista
    await AsyncStorage.setItem(DEEP_LINK_TOKEN_KEY, token);

    // Si la navegación ya está lista intentamos navegar directo
    try {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('Home', {
          screen: 'QR',
          params: {
            screen: 'Escanear',
            params: { token },
          },
        });
      }
    } catch (e) {
      console.warn('[DeepLink] Error navegando directo, QRScreen lo tomará del storage', e);
    }
  };

  useEffect(() => {
    const validateToken = async () => {
      try {
        await ensureToken();
      } catch (error) {
        console.log('Error asegurando token:', error);
      }
    };

    initOneSignal();
    validateToken();

    // Deep link cuando la app estaba CERRADA
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        handleDeepLink(url);
      }
    });

    // Deep link cuando la app está en BACKGROUND
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] URL recibida en background:', url);
      handleDeepLink(url);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        validateToken();
      }
    });

    return () => {
      linkingSub.remove();
      appStateSub.remove();
    };
  }, []);

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Cuenta" component={Cuenta} />
        <Stack.Screen name="Loading" component={Loading} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="Terms" component={TermsAndConditions} />
        <Stack.Screen name="Verificacion" component={VerificationScreen} />
        <Stack.Screen name="SendEmail" component={SendEmail} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="Recent" component={RecentAccounts} />
        <Stack.Screen name="QuickLogin" component={QuickLogin} />
        <Stack.Screen name="SelectDefaultHome" component={SelectDefaultHome} />
        <Stack.Screen name="CodeResidence" component={CodeResidence} />
        <Stack.Screen name="SplashResidence" component={SplashResidence} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="HomeResidence" component={HomeResidence} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}