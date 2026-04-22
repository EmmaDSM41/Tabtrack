import React, { useState } from 'react';
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

const DEFAULT_HOME_KEY = 'user_default_home';

// Cambia estas rutas por tus logos reales
const PRINCIPAL_LOGO = require('../../assets/images/logo.png');
const RESIDENCE_LOGO = require('../../assets/images/LogoRes.jpeg');

export default function SelectDefaultHome({ navigation }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);

  const BASE_WIDTH = 375;
  const rf = (size) => Math.round((size * width) / BASE_WIDTH);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const circleSize = clamp(Math.round(width * 0.18), 68, 92);
  const titleSize = clamp(rf(26), 20, 34);
  const subtitleSize = clamp(rf(14), 12, 18);
  const optionTitleSize = clamp(rf(18), 16, 24);
  const optionDescSize = clamp(rf(12), 11, 14);

  const chooseHome = async (value) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(DEFAULT_HOME_KEY, value);

      const targetRoute = value === 'residence' ? 'HomeResidence' : 'Home';

      navigation.reset({
        index: 0,
        routes: [{ name: targetRoute }],
      });
    } catch (error) {
      console.warn('Error guardando la app principal:', error);
    } finally {
      setLoading(false);
    }
  };

  const OptionRow = ({ value, title, desc, imageSource }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => chooseHome(value)}
      disabled={loading}
      style={styles.optionRow}
    >
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
        ]}
      >
        <Image source={imageSource} style={styles.circleImage} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.optionTitle, { fontSize: optionTitleSize }]}>{title}</Text>
        <Text style={[styles.optionDesc, { fontSize: optionDescSize }]}>{desc}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

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
          Cada vez que abras la sesión, la app entrará automáticamente en la opción que elijas aquí.
        </Text>

        <View style={styles.list}>
          <OptionRow
            value="home"
            title="Tabtrack"
            desc="Abrirá la pantalla principal normal de la app."
            imageSource={PRINCIPAL_LOGO}
          />

          <OptionRow
            value="residence"
            title="Tabtrack Residence"
            desc="Abrirá la versión de residencia como app principal."
            imageSource={RESIDENCE_LOGO}
          />
        </View>

        <Text style={styles.footer}>
          Puedes cambiarlo después volviendo a esta pantalla.
        </Text>

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
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexShrink: 0,
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
  optionTitle: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  optionDesc: {
    color: '#000',
    fontFamily: 'Montserrat-Regular',
    opacity: 0.72,
    marginTop: 4,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 30,
    color: '#9ca3af',
    marginLeft: 8,
    marginTop: -2,
  },
  footer: {
    marginTop: 10,
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
    opacity: 0.68,
    paddingHorizontal: 10,
  },
  loadingWrap: {
    marginTop: 14,
  },
});