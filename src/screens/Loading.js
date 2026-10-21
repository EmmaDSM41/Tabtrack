import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO_SRC = require('../../assets/images/logo.png');

export default function Loading() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  const bottomSafe = Math.round(insets.bottom || 0);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const containerPaddingTop = Math.round(topSafe + Math.max(8, width * 0.03));
  const containerPaddingBottom = Math.round(Math.max(16, Math.min(80, height * 0.04)) + bottomSafe);

  const logoWidth = Math.round(Math.min(320, width * 0.82));
  const logoHeight = Math.round(Math.min(110, height * 0.16));

  const titleFontSize = Math.round(clamp(Math.round(width * 0.09), 22, 40));
  const subtitleFontSize = Math.round(clamp(Math.round(width * 0.042), 12, 18));

  const gifSize = Math.round(Math.min(260, width * 0.6));
  const gifMarginBottom = Math.round(Math.max(28, Math.min(80, height * 0.06)));

  // Navegación reset después de 6s
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

  // GIF loop ajustado a duración real del archivo (2.15s)
  const GIF_LOOP_MS = 2150;
  const [gifKey, setGifKey] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setGifKey((k) => k + 1);
    }, GIF_LOOP_MS);

    return () => clearInterval(iv);
  }, [GIF_LOOP_MS]);

  const styles = makeStyles({
    containerPaddingTop,
    containerPaddingBottom,
    logoWidth,
    logoHeight,
    titleFontSize,
    subtitleFontSize,
    gifSize,
    gifMarginBottom,
  });

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
            <Image
              source={LOGO_SRC}
              style={styles.logo}
              resizeMode="contain"
              accessible
              accessibilityLabel="Logo"
            />
          </View>

          {/* Texto central */}
          <View style={styles.textWrap}>
            <Text style={styles.title}>Generando perfil ;)</Text>
            <Text style={styles.subtitle}>
              Termina de configurar tu perfil más tarde en la configuración de tu cuenta.
            </Text>
          </View>

          {/* GIF con loop sincronizado a su duración real */}
          <FastImage
            key={gifKey}
            source={require('../../assets/images/Carga1.gif')}
            style={styles.gif}
            resizeMode={FastImage.resizeMode.contain}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function makeStyles({
  containerPaddingTop,
  containerPaddingBottom,
  logoWidth,
  logoHeight,
  titleFontSize,
  subtitleFontSize,
  gifSize,
  gifMarginBottom,
}) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#7C3AED' },

    gradient: {
      flex: 1,
    },

    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: containerPaddingTop,
      paddingBottom: containerPaddingBottom,
      paddingHorizontal: 20,
    },

    logoWrap: {
      width: '100%',
      alignItems: 'center',
      paddingTop: Math.round(8),
    },
    logo: {
      width: logoWidth,
      height: logoHeight,
    },

    textWrap: {
      width: '86%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: '#000',
      fontSize: titleFontSize,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: Math.round(titleFontSize * 1.05),
      marginBottom: Math.round(Math.max(12, titleFontSize * 0.6)),
      fontFamily: 'Montserrat-Bold',
    },
    subtitle: {
      color: 'rgba(0, 0, 0, 0.92)',
      fontSize: subtitleFontSize,
      textAlign: 'center',
      lineHeight: Math.round(subtitleFontSize * 1.4),
      opacity: 0.95,
      paddingHorizontal: 6,
      fontFamily: 'Montserrat-SemiBold',
    },

    gif: {
      width: gifSize,
      height: gifSize,
      marginBottom: gifMarginBottom,
      opacity: 0.98,
    },
  });
}