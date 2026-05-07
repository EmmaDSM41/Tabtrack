// App.tsx
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Token manager
import { ensureToken } from './src/auth/tokenManager';

// Pantallas sin barra (Auth)
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateAccount from './src/screens/CreateAccount';
import Login from './src/screens/Login';
import Cuenta from './src/screens/Cuenta';
import Loading from './src/screens/Loading';
import ForgotPassword from './src/screens/ForgotPassword';

// Pantalla principal con tabs
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

const linking = {
  prefixes: ['tabtrack://'],
  config: {
    screens: {
      Home: 'home',
    },
  },
};

export default function App() {
  useEffect(() => {
    const validateToken = async () => {
      try {
        await ensureToken();
      } catch (error) {
        console.log('Error asegurando token:', error);
      }
    };

    // Al abrir la app
    validateToken();

    // Cuando la app regresa al frente
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        validateToken();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer linking={linking}>
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