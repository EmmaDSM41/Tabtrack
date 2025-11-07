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
 
        {/* Main app con barra */}
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
