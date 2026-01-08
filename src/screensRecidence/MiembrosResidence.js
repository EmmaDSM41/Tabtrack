import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

 const RESIDENTS = [
  {
    id: '1',
    name: 'Juan Pérez Gómez',
    relation: 'Titular del contrato',
    phone: '+52 555 123 4567',
    email: 'juan.perez@email.com',
    badge: 'Titular',
  },
  {
    id: '2',
    name: 'María González de Pérez',
    relation: 'Cónyuge',
    phone: '+52 555 987 6543',
    email: 'maria.gonzalez@email.com',
  },
  {
    id: '3',
    name: 'Carlos Pérez González',
    relation: 'Hijo',
    phone: '+52 555 456 7890',
    email: 'carlos.perez@email.com',
  },
  {
    id: '4',
    name: 'Ana Pérez González',
    relation: 'Hija',
    phone: '+52 555 321 0987',
    email: 'ana.perez@email.com',
  },
];

const AVATAR_GRADIENTS = [
  ['#8E5CFF', '#5B8BFF'],
  ['#8E5CFF', '#E65BFF'],
  ['#6C5CE7', '#00C2FF'],
  ['#FF7AC6', '#6C5CE7'],
];

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MiembrosResidence() {
  const { width } = useWindowDimensions();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));

  const renderItem = ({ item, index }) => {
    const initials = getInitials(item.name);
    const grad = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
    return (
      <View style={styles.rowWrap}>
        <View style={styles.rowInner}>
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, { width: rf(56), height: rf(56), borderRadius: Math.round(rf(56) / 2) }]}
          >
            <Text style={[styles.avatarInitials, { fontSize: Math.round(rf(18)) }]}>{initials}</Text>
          </LinearGradient>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { fontSize: Math.round(rf(16)) }]} numberOfLines={2}>
                {item.name}
              </Text>

              {item.badge ? (
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badgeText, { fontSize: Math.round(rf(11)) }]}>{item.badge}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.relationText, { fontSize: Math.round(rf(13)) }]}>{item.relation}</Text>

            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={Math.round(rf(14))} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={[styles.contactText, { fontSize: Math.round(rf(13)) }]}>{item.phone}</Text>
            </View>

            <View style={[styles.contactRow, { marginTop: 6 }]}>
              <Ionicons name="mail-outline" size={Math.round(rf(14))} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={[styles.contactText, { fontSize: Math.round(rf(13)) }]}>{item.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={[styles.title, { fontSize: rf(18) }]}>Habitación 203</Text>
        <Text style={[styles.subtitle, { fontSize: rf(12) }]}>4 residentes registrados</Text>
      </LinearGradient>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={RESIDENTS}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingTop: 30,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  title: { color: '#fff', fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 36,
    backgroundColor: '#fff',
  },

  rowWrap: { backgroundColor: '#fff' },
  rowInner: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14 },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  avatarInitials: { color: '#fff', fontWeight: '800' },

  info: { flex: 1, paddingRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameText: { color: '#111827', fontWeight: '700', flex: 1 },

  badgeWrap: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderColor: 'rgba(124,58,237,0.2)',
    borderWidth: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#6D28D9', fontWeight: '700' },

  relationText: { color: '#6b7280', marginTop: 6 },

  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { color: '#374151' },

  divider: { height: 1, backgroundColor: '#f1f3f5', marginTop: 12 },
});
