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
  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };

  const styles = makeStyles({ width, height, clamp, wp, hp, rf });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={styles.iconSize} color="#0033cc" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>Experiencias</Text>

        <View style={styles.headerRight}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
            accessibilityLabel="Logo"
          />
          <TouchableOpacity onPress={() => {}} style={styles.headerBtn} accessibilityLabel="Notificaciones">
            <Ionicons name="notifications-outline" size={styles.iconSize} color="#0033cc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <LinearGradient
        colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.emoticon} accessible accessibilityLabel="Emoticon">:)</Text>
          <Text style={styles.thanks}>¡Gracias por tu comentario!</Text>
          <Text style={styles.sub}>haz obtenido...</Text>

          <View style={styles.pointsWrap}>
            <Text style={styles.points} accessibilityLabel="Puntos obtenidos">24</Text>
            <Text style={styles.pointsLabel}>Track Points</Text>
          </View>

          <Text style={styles.info}>
            Califica los lugares que visitas para seguir obteniendo Track Points y
            conseguir promociones en nuestros restaurantes afiliados
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function makeStyles({ width, height, clamp, wp, hp, rf }) {
  // base paddings and sizes
  const basePad = Math.round(clamp(wp(3.5), 10, 24));
  const headerH = Math.round(clamp(hp(8), 56, 96));
  const iconSize = Math.round(clamp(rf(3.6), 18, 28));
  const headerLogoW = Math.round(clamp(wp(22), 72, 120));

  // content sizes
  const contentTop = Math.round(clamp(hp(8), 36, 100));
  const emoticonSize = Math.round(clamp(rf(9), 28, 56));
  const thanksSize = Math.round(clamp(rf(7.2), 20, 34));
  const pointsSize = Math.round(clamp(rf(18), 36, 88));
  const pointsLabelSize = Math.round(clamp(rf(6.2), 14, 26));
  const infoSize = Math.round(clamp(rf(3.6), 12, 16));
  const buttonPadV = Math.round(clamp(hp(1.6), 8, 16));
  const buttonPadH = Math.round(clamp(wp(6), 16, 40));
  const contentHPad = Math.round(clamp(wp(5), 12, 36));

  // keep max width for long lines
  const maxTextWidth = Math.min(720, Math.round(wp(88)));

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
      alignItems: 'center',
      justifyContent: 'center',
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

    iconSize, // number (for convenience)

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

    pointsWrap: {
      alignItems: 'center',
      marginBottom: Math.round(clamp(hp(1.2), 8, 18)),
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
    },

    info: {
      fontSize: infoSize,
      fontFamily: 'Montserrat-Regular',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      lineHeight: Math.round(infoSize * 1.6),
      marginBottom: Math.round(clamp(hp(3), 12, 36)),
      maxWidth: maxTextWidth,
    },
    button: {
      backgroundColor: '#fff',
      borderRadius: Math.round(clamp(wp(6), 16, 28)),
      paddingVertical: buttonPadV,
      paddingHorizontal: buttonPadH,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: Math.round(clamp(wp(40), 140, 260)),
    },
    buttonText: {
      fontSize: Math.round(clamp(rf(3.8), 12, 16)),
      fontFamily: 'Montserrat-Bold',
      color: '#0046ff',
    },
  });
}
