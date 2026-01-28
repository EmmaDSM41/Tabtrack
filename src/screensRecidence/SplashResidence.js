import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const SPLASH_DURATION_MS = 6500; 

let FastImage = null;
try {
  FastImage = require('react-native-fast-image');
} catch (e) {
  FastImage = null;
}

export default function SplashResidence() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width, height } = useWindowDimensions();

  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const logoSize = clamp(Math.round(width * 0.38), 84, 160);
  const gifCandidate = Math.min(width * 0.75, height * 0.48);
  const gifSize = clamp(Math.round(gifCandidate), 120, Math.round(height * 0.3));
  const smallTextSize = Math.round(clamp(rf(3.2), 12, 16));

  const logoTopMargin = Math.round(hp(12)); 
  const titleTopGap = Math.round(hp(-16.2)); 
  const gifTitleGap = Math.round(hp(12)); 
  const gifLoadingGap = Math.round(hp(3));
  const bottomSafeGap = Math.round(hp(3.5)); 

  const [remountKey, setRemountKey] = useState(0);
  const remountTimerRef = useRef(null);
  const splashTimerRef = useRef(null);

  useEffect(() => {
    splashTimerRef.current = setTimeout(() => {
      try {
        navigation.replace('HomeResidence', { residenceCode: route.params?.residenceCode ?? null });
      } catch (e) {
        console.warn('ResidenceSplash: navigation.replace Home failed', e);
      }
    }, SPLASH_DURATION_MS);

    if (!FastImage) {
      const intervalMs = 1200;
      remountTimerRef.current = setInterval(() => {
        setRemountKey((k) => k + 1);
      }, intervalMs);
    }

    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
        splashTimerRef.current = null;
      }
      if (remountTimerRef.current) {
        clearInterval(remountTimerRef.current);
        remountTimerRef.current = null;
      }
    };
  }, [navigation, route.params]);

  const AnimatedGif = ({ source, style, resizeMode }) => {
    if (FastImage) {

      const Resize = FastImage.resizeMode || {};
      return (
        <FastImage
          source={source}
          style={style}
          resizeMode={Resize.contain ?? 'contain'}
        />
      );
    }

    return (
      <Image
        key={remountKey}
        source={source}
        style={style}
        resizeMode={resizeMode ?? 'contain'}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ alignItems: 'center', marginTop: logoTopMargin }}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: logoSize, height: Math.round(logoSize * 0.58), resizeMode: 'contain' }}
          />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text
            style={[
              styles.topText,
              { fontSize: Math.round(clamp(rf(4.2), 16, 20)), marginTop: titleTopGap },
            ]}
          >
            Bienvenido a Tabtrack Residence
          </Text>

          <View style={{ height: gifTitleGap }} />

          <AnimatedGif
            source={require('../../assets/images/Carga1.gif')}
            style={{
              width: gifSize,
              height: gifSize,
              resizeMode: 'contain',
            }}
            resizeMode="contain"
          />

          <View style={{ height: gifLoadingGap }} />

          <Text style={[styles.loadingText, { fontSize: smallTextSize }]}>Cargando...</Text>
        </View>

        <View style={{ height: bottomSafeGap }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, alignItems: 'center', width: '100%' },
  topText: { color: '#111827', fontWeight: '700', textAlign: 'center' },
  loadingText: { color: '#444', textAlign: 'center' },
});