// NoticeBoardScreen.js
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  PixelRatio,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function FeedResicende() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  // helpers responsivos
  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // layout vars
  const headerHeight = Math.round(hp(10.5)); // header reducido un poco
  const outerPad = Math.round(wp(6)); // <-- mayor padding lateral solicitado
  const cardPadding = Math.round(wp(4));
  const cardRadius = Math.round(Math.max(12, wp(3)));
  // aumenté el tamaño del icono/box en la primera tarjeta
  const iconBoxSize = Math.round(clamp(rf(16), 64, 120));
  const smallText = Math.round(clamp(rf(3.2), 12, 14));
  const titleText = Math.round(clamp(rf(4.6), 18, 22));
  const sectionTitleSize = Math.round(clamp(rf(3.8), 14, 18));
  const payButtonHeight = Math.round(clamp(rf(9), 44, 56));

  // color común de degradado (usado en header, strip y botones)
  const GRADIENT_COLORS = ['#9F4CFF', '#6A43FF', '#2C7DFF'];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header: igual degradado (ahora todos usan GRADIENT_COLORS) */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          {
            height: headerHeight,
            paddingBottom: Math.round(hp(1.2)),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: Math.round(clamp(rf(5.0), 18, 26)) }]}>
            Tablero de Avisos
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: Math.round(clamp(rf(3.2), 12, 14)) }]}>
            Mantente informado
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: outerPad, marginTop: Math.round(hp(2)) }}>
          {/* ---------------- TARJETA 1: CAFETERÍA ---------------- */}
          <View style={[styles.restaurantCardWrap, { borderRadius: cardRadius }]}>
            {/* franja degradada superior (cabecera) - ahora usa el mismo degradado que el header */}
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cardStrip, { height: Math.round(hp(7)), borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}
            >
              {/* icono a la izquierda dentro del strip */}
              <View style={styles.stripContent}>
                <View
                  style={[
                    styles.stripIconWrap,
                    {
                      width: iconBoxSize * 0.72,
                      height: iconBoxSize * 0.72,
                      borderRadius: Math.round((iconBoxSize * 0.72) * 0.18),
                    },
                  ]}
                >
                  <Ionicons name="restaurant" size={Math.round((iconBoxSize * 0.72) * 0.44)} color="#fff" />
                </View>

                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.stripTitle, { fontSize: Math.round(clamp(rf(4.0), 16, 18)) }]}>Cafetería Central</Text>
                  <Text style={[styles.stripSubtitle, { fontSize: smallText }]}>Residencia Universitaria</Text>
                </View>
              </View>
            </LinearGradient>

            {/* contenido blanco debajo de la franja */}
            <View style={[styles.restaurantCardContent, { padding: cardPadding, borderBottomLeftRadius: cardRadius, borderBottomRightRadius: cardRadius }]}>
              {/* Info: Horario / Estado en la misma fila con labels left / values right */}
              <View style={styles.infoContainer}>
                <View style={styles.labelsCol}>
                  <Text style={[styles.infoLabel, { fontSize: smallText }]}>Horario</Text>
                  <Text style={[styles.infoLabel, { fontSize: smallText, marginTop: 12 }]}>Estado</Text>
                </View>

                <View style={styles.valuesCol}>
                  <Text style={[styles.infoValue, { fontSize: smallText }]}>7:00 AM - 10:00 PM</Text>

                  <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                    <View style={styles.openPill}>
                      <Text style={[styles.openPillText, { fontSize: Math.round(clamp(rf(2.8), 11, 12)) }]}>Abierto</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Registrar consumo: botón centrado ancho completo (dentro del card blanco) */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.registerBtn,
                  { borderColor: 'rgba(156, 110, 255, 0.22)' }, // tono morado suave (armoniza con el degradado)
                ]}
                onPress={() => navigation.navigate('NoticesResidence')}
              >
                <Text style={styles.registerBtnText}>Registrar consumo</Text>
                <Ionicons name="chevron-forward" size={16} color="#7C3AED" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------------- SECCIÓN: Estado de Pagos ---------------- */}
          <View style={{ marginTop: Math.round(hp(3)), flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={18} color="#111827" style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize }]}>Estado de Pagos</Text>
          </View>

          {/* ---------------- TARJETA DE PAGO ---------------- */}
          <View style={[styles.paymentCardWrap, { marginTop: Math.round(hp(2)) }]}>
            <View style={[styles.paymentCard, { borderRadius: 12 }]}>
              <View style={styles.paymentHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={18} color="#ff7a00" />
                  <Text style={[styles.paymentTitle, { marginLeft: 8 }]}>Consumo de Noviembre 2025</Text>
                </View>

                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>Pendiente</Text>
                </View>
              </View>

              <Text style={styles.paymentDue}>Vence: 30 de noviembre de 2025</Text>

              {/* separador (línea) */}
              <View style={styles.separatorLine} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.amountLabel}>Monto</Text>
                <Text style={styles.amountValue}>$4500.00</Text>
              </View>

              <View style={{ height: 14 }} />

              {/* Botón pagar con el mismo degradado que el header */}
              <LinearGradient
                colors={GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.payButtonGradient, { height: payButtonHeight, borderRadius: Math.round(payButtonHeight / 2) }]}
              >
                <TouchableOpacity
                  style={styles.payButtonTouchable}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('PaymentDetails')}
                >
                  <Text style={[styles.payButtonText, { fontSize: Math.round(clamp(rf(3.8), 14, 16)) }]}>Pagar ahora</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>

          {/* espacio final */}
          <View style={{ height: Math.round(hp(6)) }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },

  header: {
    width: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  headerContent: { alignItems: 'center', marginBottom: 6 },
  headerTitle: { color: '#fff', fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.92)', marginTop: 4 },

  scroll: { paddingBottom: 24 },

  /* TARJETA CAFETERÍA: wrapper + franja degradada superior + contenido blanco */
  restaurantCardWrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },

  cardStrip: {
    width: '100%',
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
  },
  stripIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  stripTitle: { color: '#fff', fontWeight: '800' },
  stripSubtitle: { color: 'rgba(255,255,255,0.95)' },

  restaurantCardContent: {
    backgroundColor: '#fff',
    width: '100%',
  },

  /* info: labels y valores en columnas */
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  labelsCol: { flex: 1 },
  valuesCol: { flex: 1, alignItems: 'flex-end' },

  infoLabel: { color: '#6b7280', fontWeight: '700' },
  infoValue: { color: '#111827', fontWeight: '700' },

  openPill: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  openPillText: { color: '#15803d', fontWeight: '800' },

  registerBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.6,
  },
  registerBtnText: { color: '#7C3AED', fontWeight: '800' },

  sectionTitle: { color: '#111827', fontWeight: '700' },

  /* TARJETA DE PAGO */
  paymentCardWrap: {},
  paymentCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fde6ca',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentTitle: { color: '#111827', fontWeight: '800' },
  pendingPill: {
    backgroundColor: '#fff2df',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#f3c06b',
  },
  pendingPillText: { color: '#b35700', fontWeight: '700' },

  paymentDue: { color: '#6b7280', marginTop: 8 },

  separatorLine: { height: 1, backgroundColor: '#f1e7db', marginVertical: 12 },

  amountLabel: { color: '#374151', fontSize: 14 },
  amountValue: { color: '#111827', fontWeight: '900', fontSize: 22 },

  payButtonGradient: { marginTop: 6, overflow: 'hidden' },
  payButtonTouchable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  payButtonText: { color: '#fff', fontWeight: '800' },
});
