import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  useWindowDimensions,
  PixelRatio,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function OpinionSuccessScreen() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wp = (p) => (p / 100) * width;
  const hp = (p) => (p / 100) * height;
  const rf = (p) => {
    // responsive font-ish helper based on width
    const size = (p / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };

  const styles = makeStyles({ width, height, clamp, wp, hp, rf });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={styles.iconSize} color="#0033cc" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Experiencias</Text>

        <View style={styles.headerRight}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
          />
          <TouchableOpacity onPress={() => {}} style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={styles.iconSize} color="#0033cc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <LinearGradient
        colors={['#8E2DE2', '#4A00E0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.emoticon}>:)</Text>
          <Text style={styles.thanks}>¡Gracias por tu comentario!</Text>
          <Text style={styles.sub}>haz obtenido...</Text>
          <Text style={styles.points}>24</Text>
          <Text style={styles.pointsLabel}>Track Points</Text>
          <Text style={styles.info}>
            Califica los lugares que visitas para seguir obteniendo Track Points y
            conseguir promociones en nuestros restaurantes afiliados
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function makeStyles({ width, height, clamp, wp, hp, rf }) {
  const basePad = Math.round(clamp(wp(3.5), 10, 24));
  const headerH = Math.round(clamp(hp(8), 56, 96));
  const iconSize = Math.round(clamp(rf(3.6), 18, 28));
  const headerLogoW = Math.round(clamp(wp(22), 72, 120));

  const contentTop = Math.round(clamp(hp(8), 40, 100));
  const emoticonSize = Math.round(clamp(rf(9), 28, 56));
  const thanksSize = Math.round(clamp(rf(7.8), 20, 36));
  const pointsSize = Math.round(clamp(rf(20), 40, 96));
  const pointsLabelSize = Math.round(clamp(rf(6.8), 16, 28));
  const infoSize = Math.round(clamp(rf(3.6), 12, 16));
  const buttonPadV = Math.round(clamp(hp(1.6), 8, 16));
  const buttonPadH = Math.round(clamp(wp(6), 16, 40));
  const contentHPad = Math.round(clamp(wp(5), 12, 36));

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      height: headerH,
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: basePad,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: '#eee',
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    },
    headerBtn: {
      padding: Math.round(clamp(wp(1.2), 6, 12)),
    },
    headerTitle: {
      fontSize: Math.round(clamp(rf(4.6), 16, 22)),
      fontFamily: 'Montserrat-SemiBold',
      color: '#0033cc',
      textAlign: 'center',
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerLogo: {
      width: headerLogoW,
      height: Math.round(headerLogoW * 0.32),
      resizeMode: 'contain',
      marginRight: Math.round(clamp(wp(1), 6, 12)),
    },

    iconSize,

    gradient: {
      flex: 1,
    },
    content: {
      alignItems: 'center',
      paddingHorizontal: contentHPad,
      paddingTop: contentTop,
      width: '100%',
    },
    emoticon: {
      fontSize: emoticonSize,
      fontFamily: 'Montserrat-Bold',
      color: '#fff',
      marginBottom: Math.round(clamp(hp(0.5), 0, 8)),
      textAlign: 'center',
      alignSelf: 'center',
    },
    thanks: {
      fontSize: thanksSize,
      fontFamily: 'Montserrat-Bold',
      color: '#fff',
      textAlign: 'center',
      marginBottom: Math.round(clamp(hp(0.6), 6, 12)),
    },
    sub: {
      fontSize: Math.round(clamp(rf(3.6), 12, 18)),
      fontFamily: 'Montserrat-Regular',
      color: 'rgba(255,255,255,0.9)',
      marginBottom: Math.round(clamp(hp(1), 8, 18)),
      textAlign: 'center',
    },
    points: {
      fontSize: pointsSize,
      fontFamily: 'Montserrat-Black',
      color: '#fff',
      lineHeight: Math.round(pointsSize * 1.05),
      marginBottom: Math.round(clamp(hp(0.3), 4, 8)),
    },
    pointsLabel: {
      fontSize: pointsLabelSize,
      fontFamily: 'Montserrat-SemiBold',
      color: '#fff',
      marginBottom: Math.round(clamp(hp(1.8), 12, 28)),
    },
    info: {
      fontSize: infoSize,
      fontFamily: 'Montserrat-Regular',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      lineHeight: Math.round(infoSize * 1.6),
      marginBottom: Math.round(clamp(hp(3), 12, 36)),
      maxWidth: Math.min(720, Math.round(wp(88))),
    },
    button: {
      backgroundColor: '#fff',
      borderRadius: Math.round(clamp(wp(6), 16, 28)),
      paddingVertical: buttonPadV,
      paddingHorizontal: buttonPadH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: Math.round(clamp(rf(3.8), 12, 16)),
      fontFamily: 'Montserrat-Bold',
      color: '#0046ff',
    },
  });
}
