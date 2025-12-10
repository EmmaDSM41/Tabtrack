import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FeedResidence from './FeedResidence';
import QrResidence from './QrResidence';
import ExperiencesResidence from './ExperiencesResidence';
import ProfileResidence from './ProfileResidence';
import QRScreen from '../screens/QRScreen';
import NoticesResidence from './NoticesResidence';
import PaymentMethods from '../screens/PaymentMethods';
import InfoPersonal from '../screens/InfoPersonal';
import Facturacion from '../screens/Facturacion';
import SesionAndSecurity from '../screens/SesionAndSecurity';
import Help from '../screens/Help';
import TermsAndConditions from '../screens/TermsAndConditions';
import ChangePassword from '../screens/ChangePassword';
import PaymentMethodsResidence from './PaymentMethodsResidence';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function FeedResidenceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
       <Stack.Screen name="FeedResicende" component={FeedResidence} />
       <Stack.Screen name="NoticesResidence" component={NoticesResidence} />

 
    </Stack.Navigator>
  );
}

function QrResidenceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
       <Stack.Screen name="QrResidence" component={QrResidence} />
 
    </Stack.Navigator>
  );
}

function ExperiencesResidenceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
       <Stack.Screen name="ExperiencesResidence" component={ExperiencesResidence} />
 
     </Stack.Navigator>
  );
}

function ProfileResidenceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
       <Stack.Screen name="ProfileResidence" component={ProfileResidence} />
       <Stack.Screen name="QRMain" component={QRScreen} />
       <Stack.Screen name="Payments" component={PaymentMethodsResidence} />
       <Stack.Screen name="InfoPersonal" component={InfoPersonal} />
       <Stack.Screen name="Facturacion" component={Facturacion} />
       <Stack.Screen name="Security" component={SesionAndSecurity} />
       <Stack.Screen name="Help" component={Help} />
       <Stack.Screen name="Terms" component={TermsAndConditions} />
       <Stack.Screen name="ChangePassword" component={ChangePassword} />
 
    </Stack.Navigator>
  );
}

export default function HomeResidence() {
  return (
    <Tab.Navigator
      initialRouteName="QR" 
      lazy={true}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Feed':
              iconName = 'restaurant-outline';
              break;
            case 'QR':
              iconName = 'scan-circle-outline';
               break;
            case 'Experiences':
              iconName = 'sparkles-outline';
              break;
            case 'Perfil':
              iconName = 'person-circle-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007aff',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingVertical: 5, height: 60 },
      })}
    >
      <Tab.Screen name="Feed" component={FeedResidenceStack} />
      <Tab.Screen name="QR" component={QrResidenceStack} />
      <Tab.Screen name="Experiences" component={ExperiencesResidenceStack} />
      <Tab.Screen name="Perfil" component={ProfileResidenceStack} />
    </Tab.Navigator>
  );
}
