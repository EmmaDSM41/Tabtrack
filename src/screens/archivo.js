// ESTE ES EL CODIGO QUE VAS A COPIAR PARA EL NUEVO ARCHIVO QUE TE DIJE QUE CREARAS EN LA SIGUIENTE RUTA: src/components/AppGradientHeader.js
//AppGradientHeader.js es el nombre que le vas a poner al archivo

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


// HASTA AQUI TERMINA EL CODIGO
// LUEGO VAS A HACER LO SIGUIENTE

// EN TODOS LOS ARCHIVOS VAS A IMPORTAR LO SIGUIENTE, HASTA ARRIBA JUNTO A LOS DEMAS INPORTS, EN LAS PANTALLAS DE CONSUMO, ESCANEAR, DIVIDIR, EQUALSPLIT, PROPINA Y PAYMENT

import { AppGradientHeader, HeaderTotal } from '../components/AppGradientHeader';

//1) PANTALLA DE CONSUMO

//Busca el bloque que empieza con:

<LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
{/* // y termina con el  */}
</LinearGradient> 
 // justo antes de View style={styles.content}>

//Bórralo completo y pon:

jsx
<AppGradientHeader restaurantImage={restaurantImage}>
  <HeaderTotal
    amountStr={totalStr}
    line1="Items seleccionados"
    line2={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
  />
</AppGradientHeader>

//Un cambio extra: en makeStyles, dentro de container, quita paddingTop: Math.round(hp(1)):

js
// ANTES
container: { alignItems: 'center', paddingBottom: Math.round(hp(3) + (insets?.bottom ?? 0)), paddingTop: Math.round(hp(1)) },
// DESPUÉS
container: { alignItems: 'center', paddingBottom: Math.round(hp(3) + (insets?.bottom ?? 0)) },

//Escanear no tiene ese espacio, y si lo dejas el degradado queda más abajo que en Escanear.

//2) PANTALLA DE DIVIDIR

//Busca el bloque que empieza con:

jsx
<LinearGradient
  colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
  start={{ x: 0, y: 0.5 }}
  end={{ x: 1, y: 0.0 }}
  locations={[0, 0.45, 1]}
  style={[styles.headerGradient, { paddingHorizontal: Math.max(sidePad, wp(4)), ...

//y termina con el 
</LinearGradient> 
//justo antes de <View style={[styles.whiteContent, { width: whiteContentWidth }]}>.
//
//Bórralo completo y pon:

jsx
<AppGradientHeader restaurantImage={restaurantImage}>
  <Text style={styles.divideTitle}>{'Selecciona\ntus productos'}</Text>
  {!hideEqualButtonFlag && (
    <TouchableOpacity
      style={styles.ghostButton}
      onPress={handlePartesIguales}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.ghostButtonText}>Partes iguales</Text>
    </TouchableOpacity>
  )}
</AppGradientHeader>

//En makeStyles cambia solo estos dos estilos (para que se alineen a la derecha dentro de la columna):

divideTitle:

js
divideTitle: { color: '#fff', fontSize: Math.round(clamp(rf(6.6), 16, 28)), fontWeight: '900', lineHeight: Math.round(clamp(rf(7.8), 20, 34)), marginBottom: Math.round(hp(1)), textAlign: 'right' },

ghostButton:

js
ghostButton: { alignSelf: 'flex-end', borderWidth: 1.6, borderColor: 'rgba(255,255,255,0.6)', paddingVertical: Math.round(hp(1.2)), paddingHorizontal: Math.round(wp(4)), borderRadius: Math.round(wp(2)) },

//Un cambio extra: en container quita paddingTop: Math.round(hp(1)):

js
// ANTES
container: { alignItems: 'center', paddingTop: Math.round(hp(1)), paddingBottom: Math.round(hp(3) + bottomSafe) },
// DESPUÉS
container: { alignItems: 'center', paddingBottom: Math.round(hp(3) + bottomSafe) },


//3) PANTALLA DE EQUALSPLIT

//Busca el bloque que empieza con:

jsx
<LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} locations={[0, 0.45, 1]} style={[styles.headerGradient, { paddingHorizontal: headerGradientPaddingH }]}>

//y termina con el 
</LinearGradient> 
//justo antes de <View style={[styles.content, { width: contentWidth }]}>.

//Bórralo completo y pon:

jsx
<AppGradientHeader restaurantImage={restaurantImage}>
  <HeaderTotal
    amountStr={totalStr}
    line1="Se divide entre"
    line2={`${people} ${people === 1 ? 'persona' : 'personas'}`}
    line2Right={
      <TouchableOpacity
        onPress={handleEditPeoplePress}
        activeOpacity={0.9}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.editPeopleButton, equalsSplitPaid && styles.editPeopleButtonDisabled]}
      >
        <Text style={[styles.editPeopleButtonText, equalsSplitPaid && styles.editPeopleButtonTextDisabled]}>
          Editar
        </Text>
      </TouchableOpacity>
    }
  />
</AppGradientHeader>


//4) PANTALLA DE ESCANEAR

//Busca el bloque dentro del ScrollView que empieza con:

jsx
<LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} locations={[0, 0.45, 1]} style={[styles.headerGradient, { paddingHorizontal: Math.max(14, wp(5)), ...


//y termina con el 
// 
</LinearGradient> 
//justo antes de <View style={[styles.contentPlain, ....

//Bórralo completo y pon:

jsx
<AppGradientHeader restaurantImage={restaurantImageUri}>
  <HeaderTotal
    amountStr={formatMoney(totalConsumo, moneda)}
    currency={moneda ?? 'MXN'}
    line1="¡Gracias por tu visita!"
  />
</AppGradientHeader>


//5) PANTALLA DE PROPINA

//Busca el bloque que empieza con:

jsx
<LinearGradient
  colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
  start={{ x: 0, y: 1 }}
  end={{ x: 1, y: 0 }}
  style={[styles.headerGradient, { paddingHorizontal: Math.max(14, basePadding), ...

//y termina con el 
// 
</LinearGradient> 
//justo antes de <View style={[styles.content, { width: contentMaxWidth, .... Dentro de ese bloque hay una línea comentada con totalLabel, que se va con el bloque.

//Bórralo completo y pon:

jsx
<AppGradientHeader restaurantImage={restaurantImage}>
  <HeaderTotal
    amountStr={formatMoney(effectiveTotalWithTip)}
    currency={moneda ?? 'MXN'}
    line1="¡Gracias por tu propina!"
    line2={`${normalizedItems.length} ${normalizedItems.length === 1 ? 'item' : 'items'}`}
  />
</AppGradientHeader>



//PANTALLA DE PAYMENTSCREEN

//2) Busca este bloque dentro de renderCheckoutScreen

//Empieza con:

jsx
<LinearGradient
  colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
  start={{ x: 0, y: 1 }}
  end={{ x: 1, y: 0 }}
  locations={[0, 0.45, 1]}
  style={[styles.headerGradient, { paddingHorizontal: Math.max(14, wp(5)), ...

//Termina con el 
// 
</LinearGradient>
//que está justo antes de:

jsx
<View style={{ paddingHorizontal: pagePadding }}>
  <View style={styles.securityLine}>

//</View>Bórralo completo (de <LinearGradient a </LinearGradient>) y pon en su lugar:

jsx
<AppGradientHeader restaurantImage={restaurantImage}>
  <HeaderTotal
    amountStr={formatMoney(displayAmount)}
    currency={moneda ?? 'MXN'}
    line1="¡Gracias por tu visita!"
    line2={`${items.length} ${items.length === 1 ? 'item' : 'items'} · Propina ${formatMoney(displayCharge.tipAmount)} ${moneda}`}
  />
</AppGradientHeader>

No toques el otro <LinearGradient> que está más abajo (el del botón, con styles.primaryButtonGradient).




