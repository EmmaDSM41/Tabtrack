import React, { useEffect } from 'react';
import { Image, StyleSheet, Platform, PixelRatio, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('Welcome');
    }, 3000);
  }, [navigation]);

   const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

   const logoSize = clamp(Math.round(Math.min(width * 0.56, height * 0.4)), rf(90), 360);
   const verticalPadding = Math.max(insets.top, insets.bottom, Platform.OS === 'android' ? 0 : 0);

  return (
    <LinearGradient
      colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
      locations={[0.35, 0.85]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { paddingTop: verticalPadding, paddingBottom: verticalPadding }]}
    >
      <Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        accessibilityLabel="Logo TabTrack"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    resizeMode: 'contain',
   },
});
