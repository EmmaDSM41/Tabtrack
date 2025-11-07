import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';


const { width, height } = Dimensions.get('window');


const LOGO_SRC = require('../../assets/images/logo.png');

export default function Loading() {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
       navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'Welcome' }, { name: 'Login' }],
        })
      );
    }, 6000);

    return () => clearTimeout(timer);
  }, [navigation]);

 
  const GIF_LOOP_MS = 5010;
  const [gifKey, setGifKey] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
       setGifKey(k => k + 1);
    }, GIF_LOOP_MS);

    return () => clearInterval(iv);
  }, [GIF_LOOP_MS]);
 
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        translucent={false}
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={['#ffffff', '#ffffff', '#ffffff']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Logo superior */}
          <View style={styles.logoWrap}>
            <Image source={LOGO_SRC} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Texto central */}
          <View style={styles.textWrap}>
            <Text style={styles.title}>Generando perfil ;)</Text>
            <Text style={styles.subtitle}>
              Termina de configurar tu perfil más tarde en la configuración de tu cuenta.
            </Text>
          </View>

          {/* Icono / tag inferior */}
          <FastImage
            key={gifKey}
            source={require('../../assets/images/Carga1.gif')}
            style={{ width: 200, height: 200,     marginBottom: 60 }}
            resizeMode={FastImage.resizeMode.contain}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#7C3AED' },

  gradient: {
    flex: 1,
  },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 28 : 36,
    paddingBottom: 24,
  },

  // Logo arriba
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 120,
  },
  logo: {
    width: Math.min(320, width * 0.82),
    height: Math.min(110, height * 0.16),
  },

  textWrap: {
    width: '86%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#000',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 25, // aumentado para separar título y subtítulo
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    color: 'rgba(0, 0, 0, 0.92)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
    paddingHorizontal: 6,
    fontFamily: 'Montserrat-SemiBold',
  },

  // Icono inferior (tag)
  iconWrap: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 60,
  },
  tagIcon: {
    width: Math.min(260, width * 0.7),
    height: Math.min(260, width * 0.7),
    opacity: 0.98,
  },
});
