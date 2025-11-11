import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const initialMethods = [
  { key: 'card1', label: 'Servicio de ayuda' },
  { key: 'card2', label: 'Estado de la cuenta' },
  { key: 'paypal', label: 'Buzon de ayuda' },
  { key: 'applepay', label: 'Reportar un problema' },
];

export default function Help({ navigation }) {
  const [methods] = useState(initialMethods);
  const [username, setUsername] = useState('Usuario');
  const [profileUrl, setProfileUrl] = useState(null);

  // Responsiveness hook
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wp = (p) => (width * Number(p)) / 100;
  const hp = (p) => (height * Number(p)) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const iconSize = clamp(Math.round(width * 0.05), 16, 28);
  const headerPaddingV = clamp(Math.round(hp(3)), 8, 36);
  const headerPaddingH = clamp(Math.round(wp(4)), 8, 28);
  const logoW = Math.min(wp(18), 120);

  useEffect(() => {
    (async () => {
      try {
        const nombre = await AsyncStorage.getItem('user_nombre');
        const apellido = await AsyncStorage.getItem('user_apellido');

        let displayName = '';
        if (nombre && apellido) {
          displayName = `${nombre.trim()} ${apellido.trim()}`;
        } else if (nombre) {
          displayName = nombre.trim();
        } else if (apellido) {
          displayName = apellido.trim();
        } else {
          displayName = 'Usuario';
        }

        setUsername(displayName);

        // Leer foto de perfil guardada en AsyncStorage
        const cachedUrl = await AsyncStorage.getItem('user_profile_url');
        if (cachedUrl) setProfileUrl(cachedUrl);
      } catch (err) {
        console.warn('Error leyendo usuario desde AsyncStorage:', err);
        setUsername('Usuario');
      }
    })();
  }, []);

  const getInitials = (name) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // ---------- CONFIGURA AQUÍ ----------
  const WHATSAPP_FULL_URL = 'https://api.whatsapp.com/send?phone=5214611011391&text=%C2%A1Hola!%20Quiero%20m%C3%A1s%20informaci%C3%B3n%20de%20';
  const WHATSAPP_TEXT_FALLBACK = 'Hola, necesito ayuda.';
  const SUPPORT_EMAIL = 'tabtracksupport@gmail.com';
  // ------------------------------------

  const openWhatsApp = async () => {
    try {
      try {
        await Linking.openURL(WHATSAPP_FULL_URL);
        return;
      } catch (webErr) {
        console.warn('No se pudo abrir la URL web de WhatsApp:', webErr);
      }

      const appScheme = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_TEXT_FALLBACK)}`;
      try {
        const canOpen = await Linking.canOpenURL(appScheme);
        if (canOpen) {
          await Linking.openURL(appScheme);
          return;
        }
      } catch (schemeErr) {
        console.warn('Error con esquema whatsapp://', schemeErr);
      }

      Alert.alert(
        'No se pudo abrir WhatsApp',
        'No fue posible abrir WhatsApp ni la URL web asociada. Asegúrate de tener un navegador o la app de WhatsApp instalada.'
      );
    } catch (err) {
      console.warn('Error inesperado al abrir WhatsApp:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar abrir WhatsApp.');
    }
  };

  const openMailClient = async () => {
    try {
      const subject = encodeURIComponent('Soporte / Reporte');
      const body = encodeURIComponent('Hola, quisiera reportar lo siguiente:');
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

      try {
        await Linking.openURL(mailto);
        return;
      } catch (mailtoErr) {
        console.warn('No se pudo abrir mailto:', mailtoErr);
      }

      const gmailWeb = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${subject}&body=${body}`;
      try {
        await Linking.openURL(gmailWeb);
        return;
      } catch (gmailErr) {
        console.warn('No se pudo abrir Gmail web:', gmailErr);
      }

      Alert.alert(
        'No se pudo abrir correo',
        'No fue posible abrir la app de correo ni Gmail en el navegador. Asegúrate de tener una app de correo o un navegador disponible.'
      );
    } catch (err) {
      console.warn('Error inesperado al abrir correo:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar abrir la app de correo.');
    }
  };

  const handlePress = async (key) => {
    try {
      if (key === 'card1') {
        await openWhatsApp();
      } else if (key === 'paypal' || key === 'applepay') {
        await openMailClient();
      } else if (key === 'card2') {
        // Estado de la cuenta — no abre nada. UI muestra "Activo".
      }
    } catch (err) {
      console.warn('Error al manejar la acción:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado al intentar realizar la acción.');
    }
  };

  // padding top to respect safe area + status bar on Android
  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  const bottomSafe = Math.round(insets.bottom || 0);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent={false} />

      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingVertical: headerPaddingV,
            paddingHorizontal: headerPaddingH,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="arrow-back" size={iconSize} color={styles.headerTitle.color} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: clamp(Math.round(width * 0.055), 16, 24) }]}>Perfil</Text>

        <View style={styles.headerRight}>
          {/* Avatar circular */}
          <View
            style={{
              width: clamp(Math.round(width * 0.07), 28, 48),
              height: clamp(Math.round(width * 0.07), 28, 48),
              borderRadius: Math.round(clamp(Math.round(width * 0.07), 28, 48) / 2),
              overflow: 'hidden',
              backgroundColor: '#f3f6ff',
              marginHorizontal: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {profileUrl ? (
              <Image
                source={{ uri: profileUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  color: '#0046ff',
                  fontWeight: '700',
                  fontSize: Math.round(clamp(Math.round(width * 0.07), 28, 48) * 0.36),
                  includeFontPadding: false,
                  textAlign: 'center',
                }}
              >
                {getInitials(username) || '👤'}
              </Text>
            )}
          </View>

          {/* Nombre del usuario */}
          <Text
            style={[
              styles.username,
              {
                fontSize: clamp(Math.round(width * 0.036), 12, 18),
                marginRight: clamp(Math.round(width * 0.03), 8, 20),
                maxWidth: Math.round(width * 0.36),
              },
            ]}
            numberOfLines={1}
          >
            {username}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: Math.min(36, Math.round(wp(6))), paddingBottom: 16 + bottomSafe },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtítulo */}
        <View style={styles.sectionHeader}>
          <Ionicons name="help-outline" size={Math.max(18, iconSize)} color={styles.sectionTitle.color} />
          <Text style={[styles.sectionTitle, { fontSize: clamp(Math.round(width * 0.044), 14, 18), marginLeft: 10 }]}>Ayuda</Text>
        </View>

        {/* Lista de métodos */}
        <View style={[styles.methodsContainer, { paddingHorizontal: Math.max(6, Math.round(wp(1.5))) }]}>
          {methods.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodRow, { paddingVertical: clamp(Math.round(hp(1.2)), 10, 18) }]}
              activeOpacity={0.7}
              onPress={() => handlePress(m.key)}
            >
              <View style={styles.methodLeft}>
                <Ionicons name={m.icon || 'chevron-forward-outline'} size={Math.max(18, iconSize - 2)} color={styles.methodText.color} />
                <Text style={[styles.methodText, { fontSize: clamp(Math.round(width * 0.038), 12, 16), marginLeft: 10 }]}>{m.label}</Text>
              </View>

              {m.key === 'card2' ? (
                <Text style={[styles.editText, { fontSize: clamp(Math.round(width * 0.036), 12, 16) }]}>Activo</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const BLUE = '#0046ff';
const DOT_COLOR = '#ccc';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: BLUE,
    fontFamily: 'Montserrat-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  username: {
    fontSize: 16,
    color: '#000',
    marginRight: 16,
    fontFamily: 'Montserrat-Regular',
  },
  backButton: { marginRight: 12 },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BLUE,
    marginLeft: 8,
    fontFamily: 'Montserrat-Bold',
  },
  methodsContainer: { paddingHorizontal: 8 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DOT_COLOR,
  },
  methodLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  methodText: { fontSize: 14, color: '#000', marginLeft: 8, fontFamily: 'Montserrat-Regular', flexShrink: 1 },
  editText: { fontSize: 14, color: BLUE, fontFamily: 'Montserrat-Regular' },
  saveButton: {
    alignSelf: 'flex-start',
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 80,
    marginLeft: 16,
  },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Montserrat-Bold' },
  avatarInitials: { color: '#0046ff', fontWeight: '700' },
});
