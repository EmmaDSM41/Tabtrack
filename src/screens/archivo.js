import React from 'react';
import { View, Text, Image, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function useMetrics() {
  const { width, height } = useWindowDimensions();
  const wp = (p) => Math.round((p / 100) * width);
  const hp = (p) => Math.round((p / 100) * height);
  const logoW = clamp(wp(28), 80, 140);
  const imgSize = clamp(wp(16), 48, 96);
  const totalFont = clamp(wp(7.5), 20, 36);
  return {
    wp, hp,
    padH: Math.max(14, wp(5)),
    padTop: Math.max(12, hp(2)),
    padBottom: Math.max(20, hp(3)),
    radius: Math.max(28, wp(8)),
    logoW,
    logoH: Math.round(logoW * 0.32),
    logoMB: Math.max(8, hp(1)),
    wrapMT: Math.max(6, hp(0.5)),
    wrapPad: Math.max(6, wp(1.5)),
    wrapRadius: Math.max(8, wp(2)),
    imgSize,
    imgRadius: Math.round(imgSize * 0.16),
    rightMaxW: Math.round(Math.min(Math.max(wp(36), 120), 220)),
    rightMR: Math.max(12, wp(3)),
    totalFont,
    totalLH: Math.round(totalFont * 1.05),
    labelFont: clamp(wp(2.6), 12, 16),
    currencyFont: clamp(wp(2.8), 12, 16),
    subFont: clamp(wp(2.8), 10, 14),
  };
}

// Degradado + logo + foto. Lo que pongas dentro (children) va en la columna derecha.
export function AppGradientHeader({ restaurantImage, children }) {
  const m = useMetrics();
  return (
    <LinearGradient
      colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      locations={[0, 0.45, 1]}
      style={{
        width: '100%',
        paddingHorizontal: m.padH,
        paddingTop: m.padTop,
        paddingBottom: m.padBottom,
        borderBottomRightRadius: m.radius,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          <Image
            source={require('../../assets/images/logo2.png')}
            style={{ width: m.logoW, height: m.logoH, marginBottom: m.logoMB }}
            resizeMode="contain"
          />
          <View style={{ marginTop: m.wrapMT, padding: m.wrapPad, borderRadius: m.wrapRadius, backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Image
              source={restaurantImage ? { uri: restaurantImage } : require('../../assets/images/restaurante.jpeg')}
              style={{ width: m.imgSize, height: m.imgSize, borderRadius: m.imgRadius, backgroundColor: '#fff' }}
            />
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2, maxWidth: m.rightMaxW, marginRight: m.rightMR }}>
          {children}
        </View>
      </View>
    </LinearGradient>
  );
}

// Bloque "Total / número / MXN / textos". line2Right = algo a la derecha de line2 (ej. botón Editar)
export function HeaderTotal({ label = 'Total', amountStr, currency = 'MXN', line1, line2, line2Right }) {
  const m = useMetrics();
  return (
    <>
      {!!label && (
        <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: m.labelFont, marginBottom: 6 }}>{label}</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text
          style={{ color: '#fff', fontWeight: '900', letterSpacing: 0.6, fontSize: m.totalFont, lineHeight: m.totalLH, flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {amountStr}
        </Text>
        <Text style={{ color: '#fff', fontSize: m.currencyFont, marginLeft: Math.max(6, m.wp(1.6)), marginBottom: 3, opacity: 0.95 }}>
          {currency}
        </Text>
      </View>

      <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
        {!!line1 && (
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: m.labelFont, textAlign: 'right' }}>{line1}</Text>
        )}
        {(!!line2 || !!line2Right) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            {!!line2 && (
              <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: m.subFont, textAlign: 'right' }}>{line2}</Text>
            )}
            {line2Right}
          </View>
        )}
      </View>
    </>
  );
}


// 