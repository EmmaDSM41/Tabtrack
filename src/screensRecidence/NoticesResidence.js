import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  PixelRatio,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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

export default function NoticesResidence({ navigation }) {
  const { width } = useWindowDimensions();

  const wp = (p) => (p * width) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const outerPad = Math.round(wp(4));
  const cardRadius = Math.round(Math.max(12, wp(2.6)));
  const iconBoxSize = Math.round(clamp(rf(12), 44, 64));
  const titleSize = Math.round(clamp(rf(5.2), 18, 22));
  const bodySize = Math.round(clamp(rf(3.6), 13, 16));
  const smallSize = Math.round(clamp(rf(3.0), 11, 13));
  const filterBtnHeight = Math.round(clamp(rf(11), 44, 56));

  const styles = makeStyles({ outerPad, cardRadius, iconBoxSize, titleSize, bodySize, smallSize, wp, filterBtnHeight, rf });

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
          styles.card,
          urgent
            ? { borderColor: '#FB7185', borderWidth: 1.4, backgroundColor: '#fff' }
            : { borderColor: '#E6E9EE', borderWidth: 1, backgroundColor: '#fff' },
        ]}
      >
        {urgent && (
          <View style={styles.urgentBadgeWrapper}>
            <Text style={styles.urgentBadgeText}>Urgente</Text>
          </View>
        )}

        <View style={styles.cardInner}>
          <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
            <Ionicons name="megaphone-outline" size={Math.round(iconBoxSize * 0.46)} color={item.color} />
          </View>

          <View style={[styles.cardContent, { paddingRight: contentPaddingRight }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { fontSize: titleSize }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <View style={{ height: 8 }} />

            <View style={styles.rowSpaceBetween}>
              <View style={styles.tagsRow}>
                <View style={styles.categoryPill}>
                  <Text style={[styles.categoryText, { fontSize: smallSize }]}>{item.category}</Text>
                </View>
              </View>

              <Text style={[styles.cardDate, { fontSize: smallSize }]}>{item.date}</Text>
            </View>

            <View style={{ height: 10 }} />

            <Text style={[styles.cardBody, { fontSize: bodySize }]} numberOfLines={4}>
              {item.body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ paddingHorizontal: outerPad, marginTop: Math.round(wp(10)), zIndex: 1 }}>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setDropdownVisible((s) => !s)}
            style={({ pressed }) => [
              styles.filterBtn,
              { height: filterBtnHeight, opacity: pressed ? 0.92 : 1 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="filter-outline" size={18} color="#111827" />
            <Text style={styles.filterText}>{selectedFilter}</Text>
            <Ionicons name={dropdownVisible ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
          </Pressable>

          {dropdownVisible && (
            <View style={[styles.dropdown, { top: filterBtnHeight + 10 }]}>
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} onPress={() => onSelectFilter(opt)} style={styles.dropdownOption}>
                  <Text style={[styles.dropdownText, opt === selectedFilter ? { fontWeight: '800' } : {}]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.listWrap, { paddingHorizontal: outerPad }]}>
        <Text style={[styles.sectionTitle, { fontSize: Math.round(rf(15)) }]}>Avisos Recientes</Text>

        <FlatList
          data={filteredNotices}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28, paddingTop: 8 }}
          ListEmptyComponent={<Text style={{ color: '#6b7280', paddingTop: 24 }}>No se encontraron avisos para este filtro.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

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
      overflow: 'hidden',
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
