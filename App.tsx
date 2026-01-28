// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
import OpenPay from './src/screens/OpenPay';
import RecentAccounts from './src/screens/RecentAccount';
import QuickLogin from './src/screens/QuickLogin';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth screens (sin barra) */}
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

       
        {/* Auth screens Recidence */}
        <Stack.Screen name="CodeResidence" component={CodeResidence} />
        <Stack.Screen name="SplashResidence" component={SplashResidence} />

 
 
        {/* Main app con barra */}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="HomeResidence" component={HomeResidence} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
