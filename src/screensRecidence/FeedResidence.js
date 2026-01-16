import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  PixelRatio,
  FlatList,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const sampleNotices = [
  {
    id: '1',
    title: 'Mantenimiento de entrada principal',
    category: 'Administración',
    date: '12 de noviembre de 2025',
    body:
      'Se realizará mantenimiento en la reja principal este viernes 15 de noviembre de 8:00 AM a 2:00 PM. Por favor usar entrada secundaria.',
    priority: 'urgente',
    color: '#2563EB',
  },
  {
    id: '2',
    title: 'Poda de pasto programada',
    category: 'Mantenimiento',
    date: '11 de noviembre de 2025',
    body:
      'Se realizará la poda del pasto en las calles A, B y C el día sábado. Favor de no estacionar vehículos en estas áreas.',
    priority: 'normal',
    color: '#F97316',
  },
  {
    id: '3',
    title: 'Menú Especial Navideño',
    category: 'Comunidad',
    date: '08 de noviembre de 2025',
    body:
      'Se realiza menú para las fechas decembrinas solo bajo pedido, revisa las opciones en la cafetería y aparta con tiempo.',
    priority: 'normal',
    color: '#10B981',
  },
  {
    id: '4',
    title: 'Encuesta de satisfacción - servicios',
    category: 'Encuestas',
    date: '05 de noviembre de 2025',
    body:
      'Ayúdanos contestando una breve encuesta sobre la limpieza y atención del personal. Tu opinión mejora el servicio.',
    priority: 'normal',
    color: '#6366F1',
  },
];

const FILTER_OPTIONS = ['Todos los avisos', 'Administración', 'Mantenimiento', 'Comunidad', 'Encuestas'];

export default function FeedResicende() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const headerHeight = Math.round(hp(10.5));
  const outerPad = Math.round(wp(6)); 
  const cardPadding = Math.round(wp(4));
  const cardRadius = Math.round(Math.max(12, wp(3)));
  const iconBoxSize = Math.round(clamp(rf(16), 64, 120));
  const smallText = Math.round(clamp(rf(3.2), 12, 14));
  const GRADIENT_COLORS = ['#9F4CFF', '#6A43FF', '#2C7DFF'];

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Todos los avisos');

  const filteredNotices = useMemo(() => {
    if (!selectedFilter || selectedFilter === 'Todos los avisos') return sampleNotices;
    return sampleNotices.filter((n) => n.category === selectedFilter);
  }, [selectedFilter]);

  const onSelectFilter = (opt) => {
    setSelectedFilter(opt);
    setDropdownVisible(false);
  };

  const outerPadNotices = Math.round(wp(4)); 
  const cardRadiusN = Math.round(Math.max(12, wp(2.6)));
  const iconBoxSizeN = Math.round(clamp(rf(12), 44, 64));
  const titleSize = Math.round(clamp(rf(5.2), 18, 22));
  const bodySize = Math.round(clamp(rf(3.6), 13, 16));
  const smallSize = Math.round(clamp(rf(3.0), 11, 13));
  const filterBtnHeight = Math.round(clamp(rf(11), 44, 56));

  const stylesN = makeStyles({
    outerPad: outerPadNotices,
    cardRadius: cardRadiusN,
    iconBoxSize: iconBoxSizeN,
    titleSize,
    bodySize,
    smallSize,
    wp,
    filterBtnHeight,
    rf,
  });

  const renderItem = ({ item }) => {
    const urgent = item.priority === 'urgente';
    const contentPaddingRight = urgent ? 100 : 16;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          if (navigation && navigation.navigate) navigation.navigate('AvisoDetalle', { id: item.id });
        }}
        style={[
          stylesN.card,
          urgent
            ? { borderColor: '#FB7185', borderWidth: 1.4, backgroundColor: '#fff' }
            : { borderColor: '#E6E9EE', borderWidth: 1, backgroundColor: '#fff' },
        ]}
      >
        {urgent && (
          <View style={stylesN.urgentBadgeWrapper}>
            <Text style={stylesN.urgentBadgeText}>Urgente</Text>
          </View>
        )}

        <View style={stylesN.cardInner}>
          <View style={[stylesN.iconWrap, { backgroundColor: item.color + '22' }]}>
            <Ionicons name="megaphone-outline" size={Math.round(iconBoxSizeN * 0.46)} color={item.color} />
          </View>

          <View style={[stylesN.cardContent, { paddingRight: contentPaddingRight }]}>
            <View style={stylesN.cardHeaderRow}>
              <Text style={[stylesN.cardTitle, { fontSize: titleSize }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <View style={{ height: 8 }} />

            <View style={stylesN.rowSpaceBetween}>
              <View style={stylesN.tagsRow}>
                <View style={stylesN.categoryPill}>
                  <Text style={[stylesN.categoryText, { fontSize: smallSize }]}>{item.category}</Text>
                </View>
              </View>

              <Text style={[stylesN.cardDate, { fontSize: smallSize }]}>{item.date}</Text>
            </View>

            <View style={{ height: 10 }} />

            <Text style={[stylesN.cardBody, { fontSize: bodySize }]} numberOfLines={4}>
              {item.body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={{ overflow: 'visible' }}>
      <View style={{ paddingHorizontal: outerPad, marginTop: Math.round(hp(2)) }}>
        <View style={[styles.restaurantCardWrap, { borderRadius: cardRadius }]}>
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardStrip, { height: Math.round(hp(7)), borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}
          >
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

          <View style={[styles.restaurantCardContent, { padding: cardPadding, borderBottomLeftRadius: cardRadius, borderBottomRightRadius: cardRadius }]}>
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

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.registerBtn,
                { borderColor: 'rgba(156, 110, 255, 0.22)' },
              ]}
              onPress={() => navigation.navigate('QR')}
            >
              <Text style={styles.registerBtnText}>Registrar consumo</Text>
              <Ionicons name="chevron-forward" size={16} color="#7C3AED" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ height: Math.round(hp(2)) }} />

      {/* Filtro — dentro del header, pero con overflow visible y zIndex/elevation altos */}
      <View style={{ paddingHorizontal: outerPadNotices, zIndex: 9999, elevation: 9999, overflow: 'visible' }}>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setDropdownVisible((s) => !s)}
            style={({ pressed }) => [
              stylesN.filterBtn,
              { height: filterBtnHeight, opacity: pressed ? 0.92 : 1 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="filter-outline" size={18} color="#111827" />
            <Text style={stylesN.filterText}>{selectedFilter}</Text>
            <Ionicons name={dropdownVisible ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
          </Pressable>

          {dropdownVisible && (
            <View
              style={[
                stylesN.dropdown,
                {
                  top: filterBtnHeight + 10,
                  zIndex: 99999,
                  elevation: 99999,
                  overflow: 'visible',
                },
              ]}
            >
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} onPress={() => onSelectFilter(opt)} style={stylesN.dropdownOption}>
                  <Text style={[stylesN.dropdownText, opt === selectedFilter ? { fontWeight: '800' } : {}]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 12 }} />
        <Text style={[stylesN.sectionTitle, { fontSize: Math.round(rf(15)), paddingHorizontal: 4 }]}>Avisos Recientes</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
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

      <FlatList
        data={filteredNotices}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: 8 }}
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={{ overflow: 'visible', zIndex: 9999, elevation: 9999 }}
        ListEmptyComponent={<Text style={{ color: '#6b7280', padding: 16 }}>No se encontraron avisos para este filtro.</Text>}
      />
    </SafeAreaView>
  );
}

// ------------------------ estilos originales de Feed (sin cambios) ------------------------
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

// ------------------------ makeStyles original de Notices (ajustada variable outerPad) ------------------------
function makeStyles({ outerPad, cardRadius, iconBoxSize, titleSize, bodySize, smallSize, wp, filterBtnHeight, rf }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F8FB' },

    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF2F7',
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    filterText: { marginLeft: 8, marginRight: 8, color: '#374151', fontWeight: '600' },

    dropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 9999,
      elevation: 30,
      backgroundColor: '#fff',
      borderRadius: 10,
      marginTop: 0,
      borderWidth: 1,
      borderColor: '#EEF2F7',
      overflow: 'visible',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
    },
    dropdownOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    dropdownText: { color: '#111827' },

    listWrap: {
      flex: 1,
      marginTop: 12,
    },

    sectionTitle: { color: '#111827', fontWeight: '900', marginBottom: 10 },

    card: {
      backgroundColor: '#fff',
      borderRadius: cardRadius,
      marginBottom: 14,
      overflow: 'hidden',
      paddingVertical: 16,
      paddingHorizontal: Math.round(wp(5)),
      marginHorizontal: outerPad,  
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 1,
      position: 'relative',
    },

    urgentBadgeWrapper: {
      position: 'absolute',
      right: Math.round(wp(5)),
      top: 14,
      backgroundColor: '#fff',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: '#FECACA',
      zIndex: 5,
    },
    urgentBadgeText: { color: '#B91C1C', fontWeight: '800', fontSize: Math.round(smallSize * 0.95) },

    cardInner: { flexDirection: 'row', alignItems: 'flex-start' },

    iconWrap: {
      width: iconBoxSize,
      height: iconBoxSize,
      borderRadius: Math.round(iconBoxSize / 4),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    cardContent: {
      flex: 1,
    },

    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    cardTitle: { color: '#0F172A', fontWeight: '800', flexShrink: 1 },

    rowSpaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    tagsRow: { flexDirection: 'row', alignItems: 'center' },
    categoryPill: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    categoryText: { color: '#374151', fontWeight: '700' },

    cardBody: { color: '#374151', lineHeight: 20 },

    cardDate: { color: '#6B7280', marginTop: 6, fontWeight: '600' },
  });
}
