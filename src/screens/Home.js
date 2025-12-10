import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import QRScreen from './QRScreen';
import ProfileScreen from './ProfileScreen';
import GPSScreen from './GPSScreen';
import Feed from './Feed';
import ExperiencesScreen from './ExperiencesScreen';

import RestaurantDetailScreen from './RestaurantDetailScreen';
import Reservation from './Reservation';
import Calificar from './Calificar';
import PaymentMethods from './PaymentMethods';
import InfoPersonal from './InfoPersonal';
import Facturacion from './Facturacion';
import RatingSuccessScreen from './RatingSuccesScreen';
import OpinionScreen from './Opinion';
import OpinionSuccessScreen from './OpinionSuccesScreen';
import FavoritesScreen from './FavoritesScreen';
import SesionAndSecurity from './SesionAndSecurity';
import Help from './Help';
import TermsAndConditions from './TermsAndConditions';
import ChangePassword from './ChangePassword';
import Escanear from './Escanear';
import Consumo from './Consumo';
import Dividir from './Dividir';
import ExperiencesDetails from './ExperiencesDetails';
import EqualSplit from './EqualSplit';
import Branch from './Branch';
import Propina from './Propina';
import ResumenPago from './ResumenPago';
import OneExhibicion from './OneExhibicion';
import PaymentScreen from './PaymentScreen';
  

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* Stacks por cada tab para mantener la barra siempre */
function QRStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="QRMain" component={QRScreen} />
      <Stack.Screen name="Escanear" component={Escanear} />
      <Stack.Screen name="Consumo" component={Consumo} />
      <Stack.Screen name="Dividir" component={Dividir} />
      <Stack.Screen name="EqualSplit" component={EqualSplit} />
      <Stack.Screen name="Propina" component={Propina} />
      <Stack.Screen name="ResumenPago" component={ResumenPago} />
      <Stack.Screen name="OneExhibicion" component={OneExhibicion} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

function FeedStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeedMain" component={Feed} />
      <Stack.Screen name="Restaurant" component={RestaurantDetailScreen} />
      <Stack.Screen name="Reservation" component={Reservation} />
      <Stack.Screen name="Calificar" component={Calificar} />
      <Stack.Screen name="Opinion" component={OpinionScreen} />
      <Stack.Screen name="OpinionSucces" component={OpinionSuccessScreen} />
      <Stack.Screen name="Rating" component={RatingSuccessScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
    </Stack.Navigator>
  );
}

function GPSStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GPSMain" component={GPSScreen} />
      <Stack.Screen name="Branch" component={Branch} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Reservation" component={Reservation} />
    </Stack.Navigator>
  );
}

function ExperiencesStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExperiencesMain" component={ExperiencesScreen} />
      <Stack.Screen name="ExperiencesDetails" component={ExperiencesDetails} />
      <Stack.Screen name="Rating" component={RatingSuccessScreen} />
      <Stack.Screen name="Calificar" component={Calificar} />
      <Stack.Screen name="Opinion" component={OpinionScreen} />
      <Stack.Screen name="OpinionSucces" component={OpinionSuccessScreen} />
     </Stack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Payments" component={PaymentMethods} />
      <Stack.Screen name="InfoPersonal" component={InfoPersonal} />
      <Stack.Screen name="Facturacion" component={Facturacion} />
      <Stack.Screen name="Security" component={SesionAndSecurity} />
      <Stack.Screen name="Help" component={Help} />
      <Stack.Screen name="Terms" component={TermsAndConditions} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="Escanear" component={Escanear} />
      <Stack.Screen name="Dividir" component={Dividir} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Restaurant" component={RestaurantDetailScreen} />
    </Stack.Navigator>
  );
}

export default function Home() {
  return (
    <Tab.Navigator
      initialRouteName="QR" 
      lazy={true}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'GPS':
              iconName = 'location-outline';
              break;
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
      <Tab.Screen name="GPS" component={GPSStackScreen} />
      <Tab.Screen name="Feed" component={FeedStackScreen} />
      <Tab.Screen name="QR" component={QRStackScreen} />
      <Tab.Screen name="Experiences" component={ExperiencesStackScreen} />
      <Tab.Screen name="Perfil" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}
