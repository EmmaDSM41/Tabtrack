import React, { useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Platform, StatusBar, TextInput, ScrollView, Image, PixelRatio, useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatMoney = (n) => Number.isFinite(n) ? n.toLocaleString('es-MX',{ minimumFractionDigits:2, maximumFractionDigits:2 }) : '0.00';
const round2 = (v) => { const n = Number(v || 0); return Number.isFinite(n) ? Number(n.toFixed(2)) : 0; };

export default function Propina() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params ?? {};

  const {
    subtotal = 0, iva = 0, total = 0, token = null, items = [], people = 1,
    restaurantImage = null, returnScreen = null,
  } = params;

  const mesa_id = params.mesa_id ?? params.mesaId ?? params.mesa ?? null;
  const mesa_numero = params.mesa_numero ?? params.mesaNumero ?? null;
  const sucursal_id = params.sucursal_id ?? params.sucursalId ?? params.sucursal ?? null;
  const restaurante_id = params.restaurante_id ?? params.restauranteId ?? params.restaurante ?? null;
  const sale_id = params.sale_id ?? params.saleId ?? params.venta_id ?? null;
  const total_comensales = params.total_comensales ?? params.totalComensales ?? null;
  const fecha_apertura = params.fecha_apertura ?? params.fechaApertura ?? null;
  const moneda = params.moneda ?? params.currency ?? 'MXN';
  const mesero = params.mesero ?? params.waiter ?? null;

  const normalizeItems = (rawItems) => {
    if (!Array.isArray(rawItems)) return [];
    return rawItems.map((it, idx) => {
      const qty = Number(it.qty ?? it.cantidad ?? it.quantity ?? 1) || 1;
      const unit = Number(it.unitPrice ?? it.precio_item ?? it.precio ?? it.price ?? it.unit_price ?? 0) || 0;
      const line = Number(it.lineTotal ?? it.line_total ?? it.total ?? (unit * qty)) || Number((unit * qty).toFixed(2));
      const name = it.name ?? it.nombre ?? it.nombre_item ?? it.title ?? `Item ${idx + 1}`;
      return { ...it, name, qty, price: unit, unitPrice: unit, lineTotal: line };
    });
  };

  const normalizedItems = normalizeItems(items);
  const presetPercentages = [10, 15, 20, 25];

  // Si nos pasaron tipApplied (viniendo de EqualSplit u otra), úsalo como estado inicial.
  const incomingTipApplied = params.tipApplied ?? params.tip_applied ?? null;
  const initialPercent = incomingTipApplied ? Number(incomingTipApplied.percent || 0) : null;
  const initialOther = incomingTipApplied && ![10,15,20,25].includes(initialPercent) ? String(initialPercent) : '';

  const [selectedPercent, setSelectedPercent] = useState(initialPercent);
  const [otherPercent, setOtherPercent] = useState(initialOther);
  const [customActive, setCustomActive] = useState(Boolean(initialOther));
  const [hasAppliedBefore, setHasAppliedBefore] = useState(Boolean(incomingTipApplied));

  // Si cambian los params.tipApplied (al volver desde otra pantalla), sincronizamos el estado
  useEffect(() => {
    const tip = route?.params?.tipApplied ?? route?.params?.tip_applied ?? null;
    if (tip) {
      setHasAppliedBefore(true);
      const p = Number(tip.percent || 0);
      if ([10,15,20,25].includes(p)) {
        setSelectedPercent(p); setOtherPercent(''); setCustomActive(false);
      } else {
        setSelectedPercent(null); setOtherPercent(String(p || '')); setCustomActive(true);
      }
    } else {
      // si no hay tipApplied en params (usuario abrió por primera vez), mantenemos estado inicial
    }
  }, [route?.params?.tipApplied, route?.params?.tip_applied]);

  const percent = useMemo(() => {
    if (customActive) {
      const p = parseFloat(String(otherPercent).replace(',', '.')) || 0;
      return p;
    }
    return selectedPercent || 0;
  }, [selectedPercent, otherPercent, customActive]);

 
  const peopleCount = (typeof people === 'number' && people > 0) ? people : 1;

   const groupSubtotal = Number(subtotal || 0);
  const groupIva = Number(iva || 0);
  const groupTotal = Number(total || 0);

 
  const perPersonSubtotal = round2(params.perPersonSubtotal ?? (peopleCount > 0 ? (groupSubtotal / peopleCount) : groupSubtotal));
  const perPersonIva = round2(params.perPersonIva ?? (peopleCount > 0 ? (groupIva / peopleCount) : groupIva));
  const perPersonTotal = round2(params.perPersonTotal ?? (peopleCount > 0 ? (groupTotal / peopleCount) : groupTotal));

   const comingFromEqualSplit = returnScreen === 'EqualSplit' || params.from === 'EqualSplit';
  const comingFromConsumo = returnScreen === 'Consumo' || params.from === 'Consumo';

  // Calculamos tanto la propina del grupo (basada en groupTotal) como la propina por persona
  const groupTipAmount = useMemo(() => {
    const t = +(groupTotal * (Number(percent || 0) / 100));
    return Number(t.toFixed(2));
  }, [groupTotal, percent]);

  const perPersonTipAmount = useMemo(() => {
    const t = +(perPersonTotal * (Number(percent || 0) / 100));
    return Number(t.toFixed(2));
  }, [perPersonTotal, percent]);

  const groupTotalWithTip = useMemo(() => Number((groupTotal + groupTipAmount).toFixed(2)), [groupTotal, groupTipAmount]);
  const perPersonTotalWithTip = useMemo(() => Number((perPersonTotal + perPersonTipAmount).toFixed(2)), [perPersonTotal, perPersonTipAmount]);

  // ------------------------------
  // Variables que mostramos/uso para cálculos en UI según contexto
  // Si venimos de EqualSplit y hay más de 1 persona, mostramos/calculeamos POR PERSONA.
  // En otro caso usamos valores de grupo (original).
  // ------------------------------
  const effectiveTotal = (comingFromEqualSplit && peopleCount > 1) ? perPersonTotal : groupTotal;
  const effectiveSubtotal = (comingFromEqualSplit && peopleCount > 1) ? perPersonSubtotal : groupSubtotal;
  const effectiveIva = (comingFromEqualSplit && peopleCount > 1) ? perPersonIva : groupIva;
  const effectiveTipAmount = (comingFromEqualSplit && peopleCount > 1) ? perPersonTipAmount : groupTipAmount;
  const effectiveTotalWithTip = (comingFromEqualSplit && peopleCount > 1) ? perPersonTotalWithTip : groupTotalWithTip;

  const todayString = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

  const extraMeta = {
    mesa_id, mesa_numero, sucursal_id, restaurante_id, sale_id, total_comensales, fecha_apertura, moneda, mesero,
  };

  const attachMetaDup = (base) => ({
    ...base,
    mesa_id: extraMeta.mesa_id, mesaId: extraMeta.mesa_id,
    mesa_numero: extraMeta.mesa_numero, mesaNumero: extraMeta.mesa_numero,
    sucursal_id: extraMeta.sucursal_id, sucursalId: extraMeta.sucursal_id,
    restaurante_id: extraMeta.restaurante_id, restauranteId: extraMeta.restaurante_id,
    sale_id: extraMeta.sale_id, saleId: extraMeta.sale_id,
    total_comensales: extraMeta.total_comensales, totalComensales: extraMeta.total_comensales,
    fecha_apertura: extraMeta.fecha_apertura, fechaApertura: extraMeta.fecha_apertura,
    moneda: extraMeta.moneda, mesero: extraMeta.mesero,
  });

  const applyAndReturn = () => {
    // payload que se pasa como tipApplied (group-level) -> lo dejamos como **group-level**
    const payloadTipApplied = {
      percent: Number(percent || 0),
      tipAmount: round2(groupTipAmount),
      totalWithTip: round2(groupTotalWithTip),
      subtotal: round2(groupSubtotal),
      iva: round2(groupIva),
      total: round2(groupTotal), // total SIN propina (grupo)
      items: normalizedItems,
      people,
    };

    // si venimos de EqualSplit y es grupo dividido (peopleCount > 1) hacemos payload por persona además
    if (comingFromEqualSplit && peopleCount > 1) {
      const payloadPerPerson = {
        percent: Number(percent || 0),
        tipAmount: perPersonTipAmount,
        totalWithTip: perPersonTotalWithTip,
        subtotal: perPersonSubtotal,
        iva: perPersonIva,
        total: perPersonTotal, // per-person total SIN propina
        token,
        items: normalizedItems,
        people: 1,
        groupSubtotal: groupSubtotal,
        groupIva: groupIva,
        groupTipAmount: groupTipAmount,
        groupTotalWithTip: groupTotalWithTip,
        groupPeople: peopleCount,
        tipPercent: percent,
        ...extraMeta,
        restaurantImage,
      };

      const target = returnScreen || 'ResumenPago';
      navigation.navigate(target, attachMetaDup({
        // Enviamos **group totals** y **tipApplied** (por compatibilidad)
        subtotal: round2(groupSubtotal),
        iva: round2(groupIva),
        tipAmount: round2(groupTipAmount),
        total: round2(groupTotal), // grupo SIN propina
        totalWithTip: round2(groupTotalWithTip),
        // además enviamos campos por persona para que el destino los use
        perPersonSubtotal, perPersonIva, perPersonTipAmount, perPersonTotalWithTip,
        tipApplied: payloadPerPerson,
        groupPeople: peopleCount,
        tipPercent: percent,
        token,
        items: normalizedItems,
        restaurantImage,
      }));
      return;
    }

 
    const payloadToReturn = attachMetaDup({
      percent: Number(percent || 0),
      tipAmount: round2(groupTipAmount),
      totalWithTip: round2(groupTotalWithTip),
      subtotal: round2(groupSubtotal),
      iva: round2(groupIva),
      total: round2(groupTotal), 
      token,
      items: normalizedItems,
      people,
      perPersonSubtotal, perPersonIva, perPersonTipAmount, perPersonTotalWithTip,
      groupPeople: peopleCount,
      tipPercent: percent,
      restaurantImage,
    });

    if (returnScreen) {
      // enviamos tambien tipApplied en top-level para compatibilidad (group-level)
      navigation.navigate(returnScreen, {
        ...payloadToReturn,
        tipApplied: payloadTipApplied,
      });
      return;
    }

    navigation.navigate('ResumenPago', { tipApplied: payloadTipApplied });
  };

  const payNow = () => {
    if (comingFromEqualSplit && peopleCount > 1) {
      const payPayload = attachMetaDup({
        token,
        items: normalizedItems,
        subtotal: perPersonSubtotal,
        iva: perPersonIva,
        tipAmount: perPersonTipAmount,
        // Nota: mantener comportamiento original: "total" que se enviaba en el branch EqualSplit
        total: perPersonTotalWithTip,
        totalWithTip: perPersonTotalWithTip,
        people: 1,
        groupPeople: peopleCount,
        tipPercent: percent,
        restaurantImage,
      });
      navigation.navigate('Payment', payPayload);
      return;
    }

    const payload = attachMetaDup({
      token,
      items: normalizedItems,
      subtotal: groupSubtotal,
      iva: groupIva,
      tipAmount: round2(groupTipAmount),
      totalWithTip: round2(groupTotalWithTip),
      total: groupTotal, // total SIN propina
      people,
      tipPercent: percent,
      restaurantImage,
    });
    navigation.navigate('Payment', payload);
  };

  const buttonLabel = (hasAppliedBefore || percent > 0) ? 'Añadir/editar propina' : 'Añadir propina';

  // ---------------- Responsive calculations ----------------
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375)); // responsive font/size
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const headerHeight = clamp(rf(48), 64, 120);
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 8);
  const logoWidth = clamp(Math.round(width * 0.32), 90, 160);
  const restImageSize = clamp(Math.round(width * 0.18), 56, 96);
  const contentMaxWidth = Math.min(width - 32, 520);
  const totalFontSize = clamp(rf(24), 18, 36);
  const smallFont = clamp(rf(12), 11, 16);
  const sectionTitleFont = clamp(rf(16), 14, 20);
  const optionFont = clamp(rf(14), 13, 18);
  const inputHeight = clamp(36, 34, 48);
  const checkboxSize = clamp(18, 16, 22);
  // --------------------------------------------------------

  // --------------------------------------------------------
  // NUEVO: evitar que el tab bar del padre se "levante" con el teclado.
  // Forzamos estilo del tab bar del parent para que sea posición absoluta (fixed)
  // y desactivamos el comportamiento de ocultado por teclado.
  useEffect(() => {
    const parent = navigation.getParent?.();
    if (!parent) return undefined;
    try {
      parent.setOptions?.({
        tabBarStyle: { position: 'absolute', left: 0, right: 0, bottom: 0, elevation: 8 },
        tabBarHideOnKeyboard: false,
      });
    } catch (e) {
      // no hacemos nada si falla (compatibilidad)
      // console.warn('No se pudo ajustar opciones del parent tab bar', e);
    }
    return () => {
      try {
        // restaurar opciones a undefined (dejar que el parent use sus defaults)
        parent.setOptions?.({
          tabBarStyle: undefined,
          tabBarHideOnKeyboard: undefined,
        });
      } catch (e) {
        // ignore
      }
    };
  }, [navigation]);
  // --------------------------------------------------------

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topPadding, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { height: headerHeight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={[styles.backArrow, { fontSize: rf(32) }]}>{'‹'}</Text></TouchableOpacity>
        <Text style={[styles.title, { fontSize: clamp(rf(15), 13, 18) }]}>Tu cuenta</Text>
        <Text style={[styles.topSmall, { fontSize: clamp(rf(10), 10, 13) }]}>{todayString}</Text>
      </View>

      {/* Ajuste clave: contentContainerStyle incluye flexGrow:1 y paddingBottom que suma insets.bottom
          para garantizar que el último contenido (botones) no quede oculto por la barra inferior. */}
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(24, rf(20)) + (insets.bottom || 0), flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={['#FF2FA0', '#7C3AED', '#0046ff']} style={[styles.headerGradient, { paddingTop: rf(18), paddingBottom: rf(18) }]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
          <View style={styles.headerInner}>
            <View style={[styles.leftCol, { flex: 1 }]}>
              <Image source={require('../../assets/images/logo2.png')} style={[styles.tabtrackLogo, { width: logoWidth, height: Math.round(logoWidth * 0.32) }]} resizeMode="contain" />
              <View style={[styles.logoWrap, { marginTop: rf(6), padding: Math.round(rf(6)) }]}>
                <Image source={restaurantImage ? { uri: restaurantImage } : require('../../assets/images/restaurante.jpeg')} style={[styles.restaurantImage, { width: restImageSize, height: restImageSize, borderRadius: Math.round(restImageSize * 0.14) }]} resizeMode="cover" />
              </View>
            </View>

            <View style={[styles.rightCol, { alignItems: 'flex-end', maxWidth: Math.round(width * 0.42) }]}>
              <Text style={[styles.totalLabel, { fontSize: clamp(rf(13), 12, 16) }]}>{comingFromEqualSplit && peopleCount > 1 ? 'Total (por persona)' : 'Total'}</Text>
              <View style={styles.totalRow}>
                <Text style={[styles.totalNumber, { fontSize: totalFontSize }]} numberOfLines={1}>{formatMoney(effectiveTotalWithTip)}</Text>
                <Text style={[styles.totalCurrency, { fontSize: clamp(rf(12), 11, 14) }]}>MXN</Text>
              </View>
              <View style={styles.rightThanks}>
                <Text style={[styles.thanksText, { fontSize: clamp(rf(14), 12, 16) }]}>¡Gracias por tu propina!</Text>
                <Text style={[styles.thanksSub, { fontSize: clamp(rf(11), 10, 14) }]}>{normalizedItems.length} {normalizedItems.length === 1 ? 'item' : 'items'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.content, { width: contentMaxWidth, padding: clamp(12, 10, 20) }]}>
          <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { fontSize: sectionTitleFont }]}>Selecciona el porcentaje que deseas añadir a tu cuenta.</Text></View>

          <View style={styles.optionsWrap}>
            {presetPercentages.map((p) => {
              const checked = !customActive && selectedPercent === p;
              // monto de propina mostrado según contexto (por persona o total grupo)
              const rightValueBase = (comingFromEqualSplit && peopleCount > 1) ? perPersonTotal : groupTotal;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.optionRow, { paddingVertical: clamp(12, 10, 16) }]}
                  onPress={() => { setCustomActive(false); setOtherPercent(''); setSelectedPercent(p); setHasAppliedBefore(true); }}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked, { width: checkboxSize, height: checkboxSize, borderRadius: Math.round(checkboxSize * 0.14) }]} >
                    {checked && <View style={[styles.checkboxInner, { width: Math.round(checkboxSize * 0.44), height: Math.round(checkboxSize * 0.44) }]} />}
                  </View>
                  <Text style={[styles.optionText, { fontSize: optionFont }]}>{p}%</Text>
                  <Text style={[styles.optionRight, { fontSize: optionFont }]}>{formatMoney((rightValueBase * p / 100))} MXN</Text>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.optionRow, { paddingVertical: clamp(12, 10, 16) }]}>
              <TouchableOpacity onPress={() => { setCustomActive(true); setSelectedPercent(null); }} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.checkbox, customActive && styles.checkboxChecked, { width: checkboxSize, height: checkboxSize, borderRadius: Math.round(checkboxSize * 0.14) }]}>{customActive && <View style={[styles.checkboxInner, { width: Math.round(checkboxSize * 0.44), height: Math.round(checkboxSize * 0.44) }]} />}</View>
                <Text style={[styles.optionText, { fontSize: optionFont }]}>Otro</Text>
              </TouchableOpacity>

              <View style={[styles.otherInputWrap, { width: clamp(100, 80, 140), height: inputHeight }]}>
                <TextInput
                  placeholder=""
                  keyboardType="numeric"
                  value={otherPercent}
                  onChangeText={(t) => {
                    const cleaned = t.replace(/[^0-9,.\-]/g, '');
                    setOtherPercent(cleaned); setCustomActive(true); setSelectedPercent(null); setHasAppliedBefore(true);
                  }}
                  style={[styles.otherInput, { height: inputHeight, fontSize: clamp(rf(14), 13, 16) }]}
                />
                <Text style={[styles.percentSuffix, { fontSize: clamp(rf(12), 11, 14) }]}>%</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />
          <View style={styles.totalsRow}><Text style={[styles.totLabel, { fontSize: smallFont }]}>{comingFromEqualSplit && peopleCount > 1 ? 'Total (por persona)' : 'Total'}</Text><Text style={[styles.totValue, { fontSize: smallFont }]}>{formatMoney(effectiveTotal)} MXN</Text></View>
          <View style={styles.totalsRow}><Text style={[styles.totLabel, { fontSize: smallFont }]}>Propina</Text><Text style={[styles.totValue, { fontSize: smallFont }]}>{formatMoney(effectiveTipAmount)} MXN</Text></View>
          <View style={[styles.totalsRow, { marginTop: 8 }]}><Text style={[styles.totLabel, { fontWeight:'800', fontSize: clamp(rf(14), 13, 18) }]}>Total con propina</Text><Text style={[styles.totValue, { fontWeight:'900', fontSize: clamp(rf(20), 16, 24) }]}>{formatMoney(effectiveTotalWithTip)} MXN</Text></View>

          <View style={styles.buttonsWrap}>
{/*             <TouchableOpacity style={[styles.primaryButton, { paddingVertical: clamp(12, 10, 16) }]} onPress={applyAndReturn} activeOpacity={0.9}><Text style={[styles.primaryButtonText, { fontSize: clamp(rf(15), 14, 18) }]}>{buttonLabel}</Text></TouchableOpacity>*/}
            <TouchableOpacity style={[styles.ghostButton, { paddingVertical: clamp(10, 8, 14) }]} onPress={payNow} activeOpacity={0.9}><Text style={[styles.ghostButtonText, { fontSize: clamp(rf(14), 13, 16) }]}>Pagar</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width: staticWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fb' },
  topBar: { width: '100%', paddingHorizontal: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: '#0b58ff', marginLeft: 2 },
  title: { fontWeight: '800', color: '#0b58ff' },
  topSmall: { color: '#6b7280' },
  container: { alignItems: 'center' }, 
  headerGradient: { width: '100%', paddingHorizontal: 20, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftCol: { flexDirection: 'column', alignItems: 'flex-start' },
  tabtrackLogo: { width: Math.min(staticWidth * 0.32, 160), height: Math.min(staticWidth * 0.32 * 0.32, 60), marginBottom: 8 },
  logoWrap: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.12)', padding: 8, borderRadius: 10 },
  restaurantImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#fff' },
  rightCol: { alignItems: 'flex-end' },
  totalLabel: { color: 'rgba(255,255,255,0.95)' },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  totalNumber: { color: '#fff', fontWeight: '900', flexShrink: 1 },
  totalCurrency: { color: '#fff', marginLeft: 6, marginBottom: 2 },
  rightThanks: { marginTop: 10, alignItems: 'flex-end' },
  thanksText: { color: '#fff', fontWeight: '800' },
  thanksSub: { color: 'rgba(255,255,255,0.95)' },
  content: { width: Math.min(staticWidth - 32, 420), backgroundColor: '#fff', padding: 16, marginTop: 8 },
  sectionRow: { marginBottom: 6 },
  sectionTitle: { fontSize: 16, color: '#374151' },
  optionsWrap: { marginTop: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.6, borderColor: '#f1f3f5' },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.6, borderColor: '#cbd5e1', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#0b58ff', borderColor: '#0b58ff' },
  checkboxInner: { width: 8, height: 8, backgroundColor: '#fff', borderRadius: 1 },
  optionText: { flex: 1, color: '#374151' },
  optionRight: { color: '#374151' },
  otherInputWrap: { width: 80, height: 36, position: 'relative', justifyContent: 'center' },
  otherInput: { width: '100%', height: 36, borderWidth: 1, borderColor: '#e6eefc', borderRadius: 8, paddingHorizontal: 8, textAlign: 'center', color:'#000' },
  percentSuffix: { position: 'absolute', right: 8, top: '50%', transform: [{ translateY: -8 }], color: '#6b7280' },
  divider: { height: 1, backgroundColor: '#e9e9e9', marginVertical: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totLabel: { color: '#6b7280' },
  totValue: { color: '#111827' },
  buttonsWrap: { width: '100%', alignItems: 'center', marginTop: 12, marginBottom: 8 }, 
  primaryButton: { width: '100%', backgroundColor: '#0046ff', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  ghostButton: { width: '100%', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#ddd' },
  ghostButtonText: { color: '#444', fontWeight: '700' },
});
