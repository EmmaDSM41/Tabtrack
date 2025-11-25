import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar,
  PixelRatio,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const deviceMin = Math.min(width, height);
  const deviceMax = Math.max(width, height);

   const wp = (percent) => (width * percent) / 100;
  const hp = (percent) => (height * percent) / 100;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const round = (v) => Math.round(PixelRatio.roundToNearestPixel(v));

   const topInset = Math.max(insets?.top ?? 0, StatusBar.currentHeight ?? 0);
  const bottomInset = insets?.bottom ?? 0;

   const scaled = {
    paddingVertical: clamp(hp(3.5), 8, 48),  
    logoWidth: clamp(wp(60), 90, Math.min(420, wp(86))),
    logoHeight: clamp(wp(21), 36, Math.min(160, wp(36))),
    titleFont: clamp(Math.round(deviceMin * 0.093), 16, 56),
    titleMarginTop: clamp(hp(1), 2, 36),
    caritaFont: clamp(Math.round(deviceMin * 0.08), 14, 48),
    subtitleFont: clamp(Math.round(deviceMin * 0.045), 12, 26),
    subtitleLineHeight: clamp(Math.round(deviceMin * 0.055), 16, 34),
    buttonVerticalMargin: clamp(hp(1.5), 6, 40),
    buttonPaddingVertical: clamp(hp(1.6), 8, 20),
    buttonPaddingHorizontal: clamp(wp(6), 10, 40),
    buttonRadius: clamp(round(deviceMin * 0.02), 6, 18),
    buttonTextSize: clamp(Math.round(deviceMin * 0.045), 12, 22),
    maxContentWidth: Math.min(width - 32, 540),
  };

  const dynamicStyles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    gradient: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: topInset + scaled.paddingVertical,
      paddingBottom: bottomInset + scaled.paddingVertical,
      paddingHorizontal: Math.round(Math.min(wp(6), 28)),
      minHeight: height,
    },
    topBlock: {
      width: '100%',
      alignItems: 'center',
    },
    logo: {
      width: scaled.logoWidth,
      height: scaled.logoHeight,
      resizeMode: 'contain',
      marginTop: round(hp(0.6)),
      maxHeight: Math.round(Math.min(scaled.logoHeight, hp(22))),
    },

    titleCaritaContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaled.titleMarginTop,
      paddingHorizontal: Math.round(Math.min(wp(8), 28)),
      width: '100%',
    },

    title: {
      fontSize: scaled.titleFont,
      color: '#000',
      textAlign: 'center',
      fontWeight: '800',
      includeFontPadding: false,
    },
    carita: {
      fontSize: scaled.caritaFont,
      color: '#000',
      textAlign: 'center',
      marginTop: Math.round(Math.max(6, scaled.titleFont * 0.03)),
    },
    subtitle: {
      fontSize: scaled.subtitleFont,
      color: '#000',
      textAlign: 'center',
      marginTop: Math.round(Math.max(6, hp(1))),
      lineHeight: scaled.subtitleLineHeight,
      paddingHorizontal: Math.round(Math.min(wp(8), 40)),
    },

    footerBlock: {
      width: '100%',
      maxWidth: scaled.maxContentWidth,
      alignItems: 'center',
    },

    buttonWrapper: {
      width: '100%',
      alignSelf: 'center',
      marginVertical: scaled.buttonVerticalMargin,
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
      color: '#fff',
      fontWeight: '700',
      includeFontPadding: false,
    },
    ghostText: {
      fontSize: scaled.buttonTextSize,
      color: '#fff',
      fontWeight: '700',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <LinearGradient
          colors={['rgb(255, 255, 255)', 'rgb(252, 252, 252)']}
          locations={[0.35, 0.85]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={dynamicStyles.gradient}
        >
          <ScrollView
            contentContainerStyle={dynamicStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={dynamicStyles.topBlock}>
              <Image source={require('../../assets/images/logo.png')} style={dynamicStyles.logo} />

              <View style={dynamicStyles.titleCaritaContainer}>
                <Text
                  style={dynamicStyles.title}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  ¡Hola!
                </Text>
                <Text
                  style={dynamicStyles.carita}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.6}
                >
                  :)
                </Text>
              </View>

              <Text
                style={dynamicStyles.subtitle}
                adjustsFontSizeToFit
                numberOfLines={4}
                minimumFontScale={0.6}
              >
                Bienvenido a{'\n'}Tabtrack{'\n'}¿Que deseas hacer?
              </Text>
            </View>

            <View style={dynamicStyles.footerBlock}>
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
                  <Text
                    style={dynamicStyles.buttonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    Iniciar Sesion
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.buttonWrapper}
                onPress={() => navigation.navigate('Cuenta')}
                activeOpacity={0.85}
              >
                <View style={[dynamicStyles.buttonInner, dynamicStyles.buttonInnerSolid]}>
                  <Text
                    style={dynamicStyles.buttonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    Crear Cuenta
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
