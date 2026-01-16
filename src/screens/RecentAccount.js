import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const RECENT_KEY = 'recent_accounts_v1';
const DEFAULT_AVATAR = require('../../assets/images/logo2.png'); 

export default function RecentAccounts() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (mounted) setAccounts(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.warn('RecentAccounts load error', e);
        if (mounted) setAccounts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onSelect = (acc) => {
    navigation.navigate('QuickLogin', { email: acc.email, avatarUrl: acc.avatarUrl ?? null });
  };

  const onUseOther = () => navigation.navigate('Login');

  const avatarSize = Math.round(Math.min(width * 0.18, 72));
  const logoWidth = Math.round(Math.min(width * 0.62, 260));
  const headerTopPad = Platform.OS === 'android' ? 10 : 6;

  const renderItem = ({ item }) => {
    const avatar = item.avatarUrl ? { uri: item.avatarUrl } : DEFAULT_AVATAR;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 }]}
        onPress={() => onSelect(item)}
      >
        <Image source={avatar} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: Math.round(avatarSize / 2) }]} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
          <Text style={styles.tap}>Toca para continuar</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color="#64748b" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingTop: headerTopPad }]}>
        <TouchableOpacity onPress={()=> navigation.navigate('Welcome')} style={styles.backBtnTouchable}>
          <Ionicons name="chevron-back" size={28} color="#0b58ff" />
        </TouchableOpacity>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.container}>
        <Image source={require('../../assets/images/logo.png')} style={[styles.logo, { width: logoWidth, height: Math.round(logoWidth * 0.42) }]} resizeMode="contain" />

        <View style={{ height: 20 }} />

        <Text style={styles.hi}>¡Hola!</Text>
        <Text style={styles.hi}>:)</Text>

        <View style={{ height: 20 }} />

        <View style={{ width: '100%', paddingHorizontal: Math.round(Math.min(width * 0.06, 28)) }}>
          {accounts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay cuentas recientes guardadas.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onUseOther}>
                <Text style={styles.primaryBtnText}>Usar otra cuenta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={accounts}
                keyExtractor={(i) => i.email}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              />

              <TouchableOpacity style={styles.outlineBtn} onPress={onUseOther} activeOpacity={0.9}>
                <Text style={styles.outlineText}>Usar otra cuenta</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    width: '100%',
    height: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  backBtnTouchable: { padding: 8 },

  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: '#fff',
  },

  logo: {
    height: 80,
    marginTop: 6,
    marginBottom: 14,
  },

  hi: { textAlign: 'center', fontSize: 30, fontWeight: '500', color: '#111', marginTop: 6 },
  subtitle: { textAlign: 'center', color: '#6b7280', marginTop: 6, fontSize: 15 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f3ff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    backgroundColor: '#eee',
  },
  email: { fontWeight: '700', fontSize: 16, color: '#111' },
  tap: { color: '#2b6be6', marginTop: 4, fontWeight: '700' },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#0b58ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: '70%',
    alignSelf: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  outlineBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e6edff',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  outlineText: { color: '#0b58ff', fontWeight: '800', fontSize: 16 },

  empty: { alignItems: 'center', padding: 20 },
  emptyText: { color: '#6b7280', marginBottom: 12, fontSize: 15 },
});
