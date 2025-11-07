import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions, Platform, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

   const BASE_WIDTH = 375;

   const rf = (size) => Math.round((size * width) / BASE_WIDTH);

   const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const scaled = {
    paddingVertical: clamp(rf(60), 12, 120),
    logoWidth: clamp(rf(250), 120, Math.round(width * 0.86)),
    logoHeight: clamp(rf(100), 48, Math.round(width * 0.36)),
    titleFont: clamp(rf(34), 18, 44),
    titleMarginTop: clamp(rf(20), 4, 60),  
    caritaFont: clamp(rf(34), 18, 44),
    subtitleFont: clamp(rf(18), 12, 22),
    subtitleLineHeight: clamp(rf(20), 16, 28),
    buttonContainerMarginTop: clamp(rf(200), 12, Math.round(height * 0.45)),
    buttonVertical: clamp(rf(7), 4, 12),
    buttonPaddingVertical: clamp(rf(12), 8, 18),
    buttonPaddingHorizontal: clamp(rf(18), 10, 28),
    buttonRadius: clamp(rf(8), 6, 14),
    buttonTextSize: clamp(rf(16), 12, 20),
  };

   const titleCaritaSpacing = clamp(Math.round(scaled.titleFont * 0.5), 8, 48);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical:
        scaled.paddingVertical +
        (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : insets.top || 0),
    },
    logo: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
      resizeMode: 'contain',
      marginTop: rf(5),
    },

     titleCaritaContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaled.titleMarginTop,
      marginBottom: titleCaritaSpacing,
       paddingHorizontal: Math.round(Math.min(width * 0.08, 28)),
      width: '100%',
    },

    title: {
      fontSize: scaled.titleFont,
      color: '#000',
      textAlign: 'center',
      fontFamily: 'Montserrat-Bold',
     },
    carita: {
      fontSize: scaled.caritaFont,
      color: '#000',
      textAlign: 'center',
      fontFamily: 'Montserrat-Bold',
      marginTop: Math.round(Math.max(6, scaled.titleFont * 0.05)), 
    },
    subtitle: {
      fontSize: scaled.subtitleFont,
      color: '#000',
      textAlign: 'center',
      marginTop: 0,
      fontFamily: 'Montserrat-Regular',
      lineHeight: scaled.subtitleLineHeight,
      paddingHorizontal: Math.round(Math.min(width * 0.08, 40)),
    },
    buttonContainer: {
      width: '100%',
      marginTop: scaled.buttonContainerMarginTop,
      alignItems: 'center',
      paddingHorizontal: rf(20),
    },
    buttonWrapper: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      marginVertical: scaled.buttonVertical,
      borderRadius: scaled.buttonRadius,
      overflow: 'hidden',
    },
    buttonInner: {
      width: '100%',
      paddingVertical: scaled.buttonPaddingVertical,
      paddingHorizontal: scaled.buttonPaddingHorizontal,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: scaled.buttonRadius,
    },
    buttonInnerSolid: {
      backgroundColor: '#0046ff',
    },
    buttonText: {
      fontSize: scaled.buttonTextSize,
      fontFamily: 'Montserrat-Regular',
    },
    buttonTextWhite: {
      color: '#fff',
      fontFamily: 'Montserrat-Bold',
    },
  });

  return (
    <LinearGradient
      colors={['rgb(255, 255, 255)', 'rgb(252, 252, 252)']}
      locations={[0.35, 0.85]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={dynamicStyles.container}
    >
      <Image source={require('../../assets/images/logo.png')} style={dynamicStyles.logo} />

       <View style={dynamicStyles.titleCaritaContainer}>
        <Text style={dynamicStyles.title}>¡Hola!</Text>
        <Text style={dynamicStyles.carita}>:)</Text>
      </View>

      <Text style={dynamicStyles.subtitle}>
        Bienvenido a{'\n'}Tabtrack{'\n'}¿Que deseas hacer?
      </Text>

      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity
          style={dynamicStyles.buttonWrapper}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['rgb(148, 2, 220)', 'rgb(4, 60, 216)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={dynamicStyles.buttonInner}
          >
            <Text style={[dynamicStyles.buttonText, dynamicStyles.buttonTextWhite]}>Iniciar Sesion</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.buttonWrapper}
          onPress={() => navigation.navigate('Cuenta')}
          activeOpacity={0.85}
        >
          <View style={[dynamicStyles.buttonInner, dynamicStyles.buttonInnerSolid]}>
            <Text style={[dynamicStyles.buttonText, dynamicStyles.buttonTextWhite]}>Crear Cuenta</Text>
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
