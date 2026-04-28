import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DEFAULT_HOME_KEY = 'user_default_home';
const RESIDENCE_ACTIVE_KEY = 'user_residence_activo';

const PRINCIPAL_LOGO = require('../../assets/images/logo.png');
const RESIDENCE_LOGO = require('../../assets/images/LogoRes.jpeg');

export default function SelectDefaultHome({ navigation }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showResidence, setShowResidence] = useState(false);
  const [selectedHome, setSelectedHome] = useState('home');

  const BASE_WIDTH = 375;
  const rf = (size) => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const circleSize = clamp(Math.round(width * 0.18), 68, 92);
  const titleSize = clamp(rf(26), 20, 34);
  const subtitleSize = clamp(rf(14), 12, 18);
  const optionTitleSize = clamp(rf(18), 16, 24);
  const optionDescSize = clamp(rf(12), 11, 14);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [residenceRaw, defaultHomeRaw] = await Promise.all([
          AsyncStorage.getItem(RESIDENCE_ACTIVE_KEY),
          AsyncStorage.getItem(DEFAULT_HOME_KEY),
        ]);

        const residenceNormalized = String(residenceRaw ?? '').trim().toLowerCase();
        const residenceActive = residenceNormalized === 'true' || residenceNormalized === '1';
        setShowResidence(residenceActive);

        const savedHome = String(defaultHomeRaw ?? '').trim().toLowerCase();
        if (savedHome === 'residence' && residenceActive) {
          setSelectedHome('residence');
        } else {
          setSelectedHome('home');
        }
      } catch (error) {
        console.warn('Error cargando preferencias de home:', error);
        setShowResidence(false);
        setSelectedHome('home');
      } finally {
        setChecking(false);
      }
    };

    loadSettings();
  }, []);

  const chooseHome = async (value) => {
    try {
      setLoading(true);

      const finalValue = value === 'residence' && !showResidence ? 'home' : value;
      await AsyncStorage.setItem(DEFAULT_HOME_KEY, finalValue);
      setSelectedHome(finalValue);
    } catch (error) {
      console.warn('Error guardando la app principal:', error);
    } finally {
      setLoading(false);
    }
  };

  const OptionRow = ({ value, title, desc, imageSource }) => {
    const selected = selectedHome === value;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => chooseHome(value)}
        disabled={loading}
        style={[
          styles.optionRow,
          selected && styles.optionRowSelected,
        ]}
      >
        <View
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderColor: selected ? '#2f6eff' : 'rgba(0,0,0,0.08)',
            },
            selected && styles.circleSelected,
          ]}
        >
          <Image source={imageSource} style={styles.circleImage} />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={[styles.optionTitle, { fontSize: optionTitleSize }]}>
              {title}
            </Text>
            {selected && (
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillText}>Seleccionado</Text>
              </View>
            )}
          </View>

          <Text style={[styles.optionDesc, { fontSize: optionDescSize }]}>
            {desc}
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'chevron-forward'}
            size={selected ? 22 : 26}
            color={selected ? '#2f6eff' : '#9ca3af'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.container,
          {
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 34 : 54,
            paddingHorizontal: clamp(rf(20), 16, 28),
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <Image
          source={require('../../assets/images/logo.png')}
          style={[
            styles.topLogo,
            {
              width: clamp(rf(150), 120, 210),
              height: clamp(rf(66), 48, 90),
              marginTop: 10,
              marginBottom: 18,
            },
          ]}
        />

        <Text style={[styles.title, { fontSize: titleSize }]}>
          Selecciona tu app principal
        </Text>

        <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
          La app entrará automáticamente en la opción que elijas aquí.
        </Text>

        <View style={styles.list}>
          {checking ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#0046ff" />
            </View>
          ) : (
            <>
              <OptionRow
                value="home"
                title="Tabtrack"
                desc="Abrirá la pantalla principal normal de la app."
                imageSource={PRINCIPAL_LOGO}
              />

              {showResidence && (
                <OptionRow
                  value="residence"
                  title="Tabtrack Residence"
                  desc="Abrirá la versión de residencia como app principal."
                  imageSource={RESIDENCE_LOGO}
                />
              )}
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Puedes cambiarlo después volviendo a esta pantalla.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#0046ff" />
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  topLogo: {
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  title: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
    marginTop: 12,
  },
  subtitle: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
    opacity: 0.76,
    lineHeight: 20,
    marginTop: 10,
    paddingHorizontal: 6,
  },
  list: {
    width: '100%',
    marginTop: 28,
  },
  optionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  optionRowSelected: {
    transform: [{ scale: 1.01 }],
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexShrink: 0,
  },
  circleSelected: {
    shadowColor: '#2f6eff',
    shadowOpacity: 0.14,
    elevation: 4,
  },
  circleImage: {
    width: '84%',
    height: '84%',
    resizeMode: 'contain',
  },
  textWrap: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionTitle: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  selectedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(47,110,255,0.10)',
  },
  selectedPillText: {
    color: '#2f6eff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
  },
  optionDesc: {
    color: '#000',
    fontFamily: 'Montserrat-Regular',
    opacity: 0.72,
    marginTop: 4,
    lineHeight: 18,
  },
  chevronWrap: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 10,
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
    opacity: 0.68,
    paddingHorizontal: 10,
  },
  backButton: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: '#0046ff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0046ff',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  backButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },
  loadingWrap: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});