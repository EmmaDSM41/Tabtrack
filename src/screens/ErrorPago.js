import React, { useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mensaje genérico que verá el cliente, sin importar el error real del back
const GENERIC_ERROR_MESSAGE =
  'No pudimos procesar tu pago. Por favor verifica tus datos e intenta nuevamente.';

export default function ErrorPago() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const {
    title = 'Error de pago',
    message = 'Ocurrió un problema procesando el pago.',
    transactionId = null,
  } = (route && route.params) || {};

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };

  const styles = makeStyles({ width, height, clamp, wp, hp, rf, insets });

  // Mensaje real que vino del API, solo para logging interno (no se muestra al usuario)
  const rawMessage = String(message || 'Ocurrió un problema procesando el pago.');

  // Mensaje genérico que sí ve el cliente
  const displayedMessage = GENERIC_ERROR_MESSAGE;

  useEffect(() => {
    // Aquí se loguea el error real del back para diagnóstico interno.
    // Se puede reemplazar console.error por el logger/Sentry/Crashlytics que usen.
    console.error('[ErrorPago] Detalle interno del error de pago:', {
      rawMessage,
      title,
      transactionId,
      timestamp: new Date().toISOString(),
    });
  }, [rawMessage, title, transactionId]);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={styles.iconSize} color="#B91C1C" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>Error de pago</Text>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <LinearGradient
        colors={['#fff6f6', '#fff0f0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topGradient, { paddingTop: styles.topContentPaddingTop }]}
        pointerEvents="box-none"
      >
        <View style={styles.topContent}>
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="close-circle" size={styles.iconInnerSize} color="#B91C1C" />
            </View>
          </View>

          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.subtitle}>{displayedMessage}</Text>
        </View>
      </LinearGradient>

      <View
        style={[
          styles.absoluteDetailsWrap,
          {
            top: styles.detailsAbsoluteTop,
            left: styles.basePad,
            right: styles.basePad,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.detailsCard}>
{/*           <Text style={styles.sectionTitle}>Mensaje</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageBoxText}>{displayedMessage}</Text>
          </View> */}

          {/* Helpers */}
          <View style={styles.helperRow}>
            <View style={styles.helperItem}>
              <Ionicons name="card" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Revisa CVV y fecha</Text>
            </View>

            <View style={styles.helperItem}>
              <Ionicons name="swap-horizontal" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Prueba otra tarjeta</Text>
            </View>

            <View style={styles.helperItem}>
              <Ionicons name="wallet" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Verifica fondos</Text>
            </View>

            <View style={styles.helperItem}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#B91C1C" />
              <Text style={styles.helperText}>Contacta soporte</Text>
            </View>
          </View>

          <View style={styles.sep} />

          {transactionId ? (
            <Text style={styles.subtleText}>ID transacción: {String(transactionId)}</Text>
          ) : (
            <Text style={styles.subtleText}>Si el problema persiste, pide ayuda al soporte.</Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#B91C1C' }]}
              onPress={() => navigation.navigate('QRMain', { transactionId })}
              activeOpacity={0.92}
            >
              <Text style={styles.primaryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: styles.basePad,
          paddingTop: styles.scrollTopPadding,
          paddingBottom: styles.scrollBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ minHeight: 24 }} />

        <View style={{ marginTop: 8, marginBottom: 12 }} />

      </ScrollView>

      <View
        style={[
          styles.fixedBottomWrap,
          {
            left: styles.basePad,
            right: styles.basePad,
            bottom: styles.fixedBottomBottom,
          },
        ]}
      >
        <View style={styles.cardAccent}>
          <Text style={styles.accentTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.accentSubtitle}>El personal de tu banco puede confirmar el estado de tu pago y ayudarte a resolver incidencias.</Text>

          <View style={styles.extraRow}>
            <View style={styles.extraItem}>
              <Ionicons name="shield-checkmark" size={16} color="#B91C1C" />
              <Text style={styles.extraText}>Pago seguro</Text>
            </View>
            <View style={styles.extraItem}>
              <Ionicons name="help-circle" size={16} color="#B91C1C" />
              <Text style={styles.extraText}>Soporte disponible</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles({ width, height, clamp, wp, hp, rf, insets }) {
  const basePad = Math.round(clamp(wp(4), 12, 28));
  const headerH = Math.round(clamp(hp(8), 56, 96));
  const iconSize = Math.round(clamp(rf(3.6), 18, 28));
  const topHeight = Math.round(clamp(hp(32), 150, 340)); 

  const iconCircleSize = Math.round(clamp(rf(12.6), 82, 120)); 
  const iconInnerSize = Math.round(iconCircleSize * 0.98); 

  const titleSize = Math.round(clamp(rf(5.2), 18, 28));
  const subtitleSize = Math.round(clamp(rf(3.2), 13, 18));

  const detailsPad = Math.round(clamp(wp(4), 12, 20));
  const topHeightAdjusted = topHeight + headerH;

  const topContentPaddingTop = Math.round(hp(5.2)) + Math.round(headerH * 0.32) + Math.max(0, Math.round((insets.top || 0) / 2));

  const maxDesiredOverlap = Math.round(Math.min(110, topHeightAdjusted * 0.28));
  const minDesiredOverlap = 18;
  const desiredOverlap = Math.round(Math.max(minDesiredOverlap, Math.min(maxDesiredOverlap, Math.round(topHeightAdjusted * 0.2))));

  const detailsAbsoluteTop = Math.round(topHeightAdjusted - desiredOverlap);

  const detailsCardEstimatedHeight = Math.round(clamp(hp(34), 150, 320));

  const scrollTopPadding = detailsAbsoluteTop + detailsCardEstimatedHeight + 12;

  const navBarEstimate = Math.round(Math.min(Math.max(Math.round(hp(6)), 48), 88)); 
  const fixedBottomHeight = Math.round(clamp(hp(14), 78, 140));

  const extraBottomOffset = Math.round(clamp(hp(5), 88, 64)); 

  const fixedBottomBottom = (insets.bottom || 0) + navBarEstimate + 8 + extraBottomOffset;

  const scrollBottomPadding = fixedBottomHeight + navBarEstimate + Math.max(12, (insets.bottom || 0) + 12) + extraBottomOffset;

  const helperItemFlexBasis = width > 420 ? '48%' : width > 340 ? '48%' : '100%';

  const s = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF', overflow: 'visible' },

    basePad,

    header: {
      height: headerH,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: basePad,
      zIndex: 4,
    },
    headerBtn: {
      padding: Math.round(clamp(wp(1.2), 6, 12)),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: Math.round(clamp(rf(3.4), 14, 18)),
      fontWeight: '800',
      color: '#1f2937',
      textAlign: 'center',
      flex: 1,
    },
    headerRightPlaceholder: { width: 44 },

    iconSize,

    topGradient: {
      marginTop: -headerH,
      height: topHeightAdjusted,
      width: '100%',
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      overflow: 'hidden',
      zIndex: 1,
      elevation: 0,
    },
    topContent: {
      alignItems: 'center',
      paddingHorizontal: basePad,
      paddingBottom: Math.round(hp(2)),
    },
    topContentPaddingTop,

    iconWrap: { marginTop: 6 },
    iconCircle: {
      width: iconCircleSize,
      height: iconCircleSize,
      borderRadius: Math.round(iconCircleSize / 2),
      backgroundColor: 'rgba(185,28,28,0.02)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(185,28,28,0.03)',
      shadowColor: '#B91C1C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.01,
      shadowRadius: 1,
      elevation: 0,
    },
    iconInnerSize,

    title: {
      marginTop: 12,
      fontSize: titleSize,
      color: '#1f2937',
      fontWeight: '900',
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: subtitleSize,
      color: '#374151',
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: Math.round(basePad / 2),
    },

    absoluteDetailsWrap: {
      position: 'absolute',
      zIndex: 9999,
      elevation: 40,
    },

    detailsCard: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: detailsPad,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 22,
      elevation: 40,
      minHeight: 140,
      maxHeight: Math.round(clamp(hp(46), 380, 520)),
      position: 'relative',
      zIndex: 10000,
    },

    sectionTitle: {
      fontSize: Math.round(clamp(rf(3.2), 14, 16)),
      fontWeight: '800',
      color: '#0b1220',
      marginBottom: 8,
    },

    messageBox: {
      backgroundColor: '#FFF7F7',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: '#FFEFEF',
      marginBottom: 12,
    },
    messageBoxText: {
      color: '#7F1D1D',
      fontSize: Math.round(clamp(rf(2.6), 13, 15)),
      lineHeight: 20,
    },

    helperRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 6,
      marginBottom: 10,
    },
    helperItem: {
      flexBasis: helperItemFlexBasis,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingRight: 8,
    },
    helperText: {
      marginLeft: 10,
      color: '#374151',
      fontWeight: '700',
      fontSize: Math.round(clamp(rf(2.2), 11, 13)),
    },

    sep: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10, borderRadius: 2 },

    subtleText: {
      color: '#6B7280',
      fontSize: Math.round(clamp(rf(2.2), 11, 13)),
      marginBottom: 10,
    },

    actionsRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryBtn: {
      paddingHorizontal: Math.round(clamp(wp(6), 18, 28)),
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      width: '90%',
      maxWidth: 520,
      flexDirection: 'row',
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: Math.round(clamp(rf(2.8), 14, 18)),
    },

    fixedBottomWrap: {
      position: 'absolute',
      zIndex: 10001,
      elevation: 40,
    },

    bottomArea: {
      paddingHorizontal: basePad,
      paddingTop: 12,
    },

    cardAccent: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 12,
      minHeight: fixedBottomHeight,
      justifyContent: 'center',
    },
    accentTitle: { fontSize: 15, fontWeight: '800', color: '#0b1220', marginBottom: 6 },
    accentSubtitle: { fontSize: 13, color: '#475569', marginBottom: 12, textAlign: 'center' },

    extraRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
    extraItem: { flexDirection: 'row', alignItems: 'center' },
    extraText: { marginLeft: 8, color: '#334155', fontWeight: '700', fontSize: 13 },
  });

  s.basePad = basePad;
  s.topContentPaddingTop = topContentPaddingTop;
  s.iconInnerSize = iconInnerSize;
  s.iconSize = iconSize;
  s.detailsAbsoluteTop = detailsAbsoluteTop;
  s.scrollTopPadding = scrollTopPadding;
  s.scrollBottomPadding = scrollBottomPadding;
  s.fixedBottomBottom = fixedBottomBottom;

  return s;
}