import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions, PixelRatio, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import googleIcon from '../../assets/images/google.jpg';
import facebookIcon from '../../assets/images/facebook.jpg';
import appleIcon from '../../assets/images/apple.jpg';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CreateAccount() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  // helpers responsivos
  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const styles = makeStyles({ wp, hp, rf, clamp, width, height, Platform });

  return (
    <LinearGradient
      colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
      locations={[0.35, .85]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
      />

      <View style={styles.titleWrap}>
        <Text style={styles.title}>Creando</Text>
        <Text style={styles.carita}>tu cuenta</Text>
      </View>

      <Text style={styles.subtitle}>
        ¡Gracias por elegir{'\n'}
        Tabtrack! selecciona{'\n'}
        una opcion para{'\n'}
        continuar
      </Text>

      <View style={styles.buttonContainer}>
        {/* Mantengo sólo el botón que usas en producción */}
        <TouchableOpacity style={[styles.button, styles.googleButton]}
          onPress={() => navigation.navigate('Cuenta')}>
          <Text style={styles.buttonText}>Continuar con tu correo</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function makeStyles({ wp, hp, rf, clamp, width, height, Platform }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: Math.round(hp(4)),
      paddingHorizontal: Math.round(wp(6)),
      backgroundColor: 'transparent',
      paddingTop: Platform.OS === 'android' ? (Math.round(hp(2)) + (Platform.OS === 'android' ? 0 : 0)) : Math.round(hp(2)),
    },
    logo: {
      width: Math.round(clamp(wp(60), 120, 320)), 
      height: Math.round(clamp(rf(12), 36, 140)),
      resizeMode: 'contain',
      marginTop: Math.round(hp(2)),
    },
    titleWrap: {
      alignItems: 'flex-start',
      width: '100%',
      paddingHorizontal: Math.round(wp(6)),
     },
    title: {
      fontSize: Math.round(clamp(rf(9), 22, 44)), 
      color: '#000',
      textAlign: 'left',
      marginTop: 0,
      fontFamily: 'Montserrat-Bold',
      marginRight: 0,
      lineHeight: Math.round(clamp(rf(10.5), 26, 52)),
    },
    carita: {
      fontSize: Math.round(clamp(rf(9), 22, 44)),
      color: '#000',
      textAlign: 'left',
      marginTop: -Math.round(hp(1.2)), 
      fontFamily: 'Montserrat-Bold',
      marginRight: 0,
      lineHeight: Math.round(clamp(rf(10.5), 26, 52)),
    },
    subtitle: {
      fontSize: Math.round(clamp(rf(4.2), 14, 20)),
      color: '#000',
      textAlign: 'left',
      marginTop: Math.round(hp(0.5)),
      fontFamily: 'Montserrat-Regular',
      width: '100%',
      paddingHorizontal: Math.round(wp(6)),
      lineHeight: Math.round(clamp(rf(5.6), 18, 28)),
    },

    buttonContainer: {
      width: '100%',
      marginTop: Math.round(hp(2.4)),
      paddingHorizontal: Math.round(wp(6)),
    },
    button: {
      backgroundColor: '#ffffff',
      paddingVertical: Math.max(8, Math.round(hp(1.6))),
      borderRadius: Math.round(wp(3)),
      marginVertical: Math.round(hp(0.6)),
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#000',
    },
    googleButton: {
     },
    registerButton: {
      backgroundColor: '#ffffff',
    },
    buttonText: {
      color: '#000',
      fontSize: Math.round(clamp(rf(4.2), 14, 18)),
      fontFamily: 'Montserrat-Regular',
    },
    icon: {
      width: Math.round(clamp(rf(3.6), 16, 28)),
      height: Math.round(clamp(rf(3.6), 16, 28)),
      marginRight: Math.round(wp(3)),
      tintColor: '#000',
    },
  });
}
