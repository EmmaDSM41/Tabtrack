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
  Platform,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SesionAndSecurity({ navigation }) {
  const [username, setUsername] = useState('Usuario');
  const [profileUrl, setProfileUrl] = useState(null);

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

        // <-- AÑADIDO: leer url de foto de perfil cacheada y guardarla en el estado local
        try {
          const cachedUrl = await AsyncStorage.getItem('user_profile_url');
          if (cachedUrl) setProfileUrl(cachedUrl);
        } catch (e) {
          console.warn('Error leyendo user_profile_url desde AsyncStorage', e);
        }
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

  // -------- responsive helpers (patrón usado en tus otros componentes) ----------
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375)); // base 375
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // responsive values
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 8);
  const contentMaxWidth = Math.min(width - 32, 760); // permitir tarjetas anchas en tablet pero con límite
  const headerHorizontalPadding = Math.max(12, Math.round(width * 0.04));
  const headerVerticalPadding = clamp(rf(18), 8, 36);
  const avatarSize = clamp(rf(44), 28, 96);
  const logoWidth = clamp(Math.round(width * 0.18), 56, 140);
  const titleFont = clamp(rf(20), 16, 28);
  const sectionTitleFont = clamp(rf(18), 14, 22);
  const bodyFont = clamp(rf(14), 12, 18);
  const rightNameMaxWidth = Math.round(Math.max(90, width * 0.36));
  // ----------------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: headerHorizontalPadding,
            paddingVertical: headerVerticalPadding,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={Math.max(18, Math.round(titleFont * 0.9))} color={styles.headerTitle.color} />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { fontSize: titleFont },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Perfil
        </Text>

        <View style={styles.headerRight}>
          {/* AVATAR: muestra foto si existe profileUrl, si no muestra iniciales centradas */}
          <View style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            overflow: 'hidden',
            backgroundColor: '#f3f6ff',
            marginHorizontal: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {profileUrl ? (
              <Image
                source={{ uri: profileUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.avatarInitials ? styles.avatarInitials : { color: '#0046ff', fontWeight: '700' },
                    { fontSize: Math.round(avatarSize * 0.36), includeFontPadding: false, textAlign: 'center' }
                  ]}
                >
                  {getInitials(username) || '👤'}
                </Text>
              </View>
            )}
          </View>

          {/* NOMBRE (se mantiene intacto) */}
          <Text
            style={[
              styles.username,
              { fontSize: clamp(bodyFont, 12, 18), marginRight: Math.round(Math.max(8, width * 0.02)), maxWidth: rightNameMaxWidth },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {username}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: Math.max(12, Math.round(width * 0.03)) }]}>
        <View style={[styles.innerWrap, { width: contentMaxWidth }]}>
          {/* Nuevo encabezado de sección (limpio) */}
          <View style={styles.topHeading}>
            <Ionicons name="shield-checkmark-outline" size={Math.max(18, Math.round(sectionTitleFont * 0.9))} color={styles.title.color} />
            <Text style={[styles.title, { fontSize: sectionTitleFont, marginLeft: 10 }]} numberOfLines={2} ellipsizeMode="tail">
              Política de Seguridad de Pagos TabTrack
            </Text>
          </View>

          {/* Contenido con estilo profesional */}
          <View style={[styles.policyContainer, { marginTop: Math.round(rf(6)) }]}>
            <View style={styles.accentBar} />

            <View style={[styles.policyContent, { paddingVertical: Math.round(rf(14)), paddingHorizontal: Math.round(rf(14)) }]}>
              <Text style={[styles.intro, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                TabTrack garantiza la protección y confidencialidad de los datos de pago de sus usuarios a través de un modelo seguro y conforme a los más altos estándares internacionales.
              </Text>

              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>Procesamiento por terceros certificados</Text>
                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                  TabTrack no almacena información sensible de tarjetas ni datos financieros de los usuarios. Todas las transacciones se procesan mediante proveedores externos certificados bajo el estándar PCI DSS, tales como OpenPay, Stripe, PayPal y Apple Pay, quienes son responsables del manejo, cifrado y resguardo de la información.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>Gestión de tokens cifrados</Text>
                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                  TabTrack únicamente conserva identificadores y tokens cifrados que permiten reconocer un método de pago autorizado, sin acceder a los números completos de tarjeta, códigos de seguridad u otros datos confidenciales.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>Canales y autenticación segura</Text>
                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                  Todas las operaciones se realizan mediante canales HTTPS seguros y sistemas de autenticación reforzada (como 3D Secure o equivalentes) para prevenir accesos no autorizados o fraudes.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>Responsabilidad y atención de incidencias</Text>
                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                  Cualquier eventualidad, disputa o incidente relacionado con el procesamiento de pagos será gestionado conforme a las políticas y protocolos de los proveedores de pago utilizados. TabTrack brindará acompañamiento al usuario para la correcta canalización y seguimiento del caso.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>Cumplimiento normativo</Text>
                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                  TabTrack cumple con la legislación mexicana en materia de protección de datos personales y las disposiciones aplicables a la seguridad de la información y medios de pago electrónicos.
                </Text>
              </View>
            </View>
          </View>

          {/* Espacio inferior para respirar */}
          <View style={{ height: Math.max(24, Math.round(rf(18))) }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Estilos base (no se toca la semántica, solo valores por defecto) */
const BLUE = '#0046ff';
const NEUTRAL = '#0b1220';
const BG = '#f8fafc';
const ACCENT = '#0f172a';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    // conserved fontFamily (user-provided)
    fontFamily: 'Montserrat-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  username: {
    fontSize: 16,
    color: '#000',
    marginRight: 12,
    fontFamily: 'Montserrat-Regular',
    maxWidth: 220,
  },
  backButton: { marginRight: 8 },
  logo: {
    width: 80,
    height: 24,
    resizeMode: 'contain',
    marginLeft: 8,
  },

  scrollContent: {
    paddingTop: 18,
    paddingBottom: 36,
    backgroundColor: '#fff',
  },

  innerWrap: {
    // wrapper alrededor del contenido para centrar y limitar ancho
    alignSelf: 'stretch',
  },

  topHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    color: BLUE,
    fontFamily: 'Montserrat-Bold',
    flexShrink: 1,
  },

  /* Contenedor profesional: barra lateral + contenido */
  policyContainer: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderRadius: 10,
    overflow: 'hidden',
    // sombra ligera
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accentBar: {
    width: 6,
    backgroundColor: ACCENT,
  },
  policyContent: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },

  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: NEUTRAL,
    marginBottom: 14,
    fontFamily: 'Montserrat-Regular',
  },

  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    fontFamily: 'Montserrat-Bold',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: NEUTRAL,
    fontFamily: 'Montserrat-Regular',
  },

  avatarInitials: { color: '#0046ff', fontWeight: '700' },

});
