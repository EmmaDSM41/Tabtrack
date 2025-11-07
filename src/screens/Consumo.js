import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, StatusBar, ActivityIndicator, Image, useWindowDimensions, PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MjE4NzAyOCwianRpIjoiMTdlYTVjYTAtZTE3MC00ZjIzLTllMTgtZmZiZWYyMzg4OTE0IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjIxODcwMjgsImV4cCI6MTc2NDc3OTAyOCwicm9sIjoiRWRpdG9yIn0.W_zoGW2YpqCyaxpE1c_hnRXdtw5ty0DDd8jqvDbi6G0';
const formatMoney = (n) => Number.isFinite(n) ? n.toLocaleString('es-MX',{ minimumFractionDigits:2, maximumFractionDigits:2 }) : '0.00';

const totalFontSizeFor = (str) => {
  const len = String(str).length;
  if (len > 14) return 12;
  if (len > 12) return 14;
  if (len > 9) return 16;
  if (len > 7) return 20;
  return 28;
};

const parseNumberSafe = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const round2 = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

export default function Consumo() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width, height } = useWindowDimensions();

  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const token = route?.params?.fromToken ?? route?.params?.token ?? null;
  const passedSelected = route?.params?.selectedItems ?? route?.params?.items ?? null;

  const incomingSubtotalRaw = route?.params?.subtotal ?? route?.params?.sub_total ?? undefined;
  const incomingIvaRaw = route?.params?.iva ?? undefined;
  const incomingTotalRaw = route?.params?.total ?? route?.params?.total_consumo ?? undefined;

  const incomingSubtotal = parseNumberSafe(incomingSubtotalRaw);
  const incomingIva = parseNumberSafe(incomingIvaRaw);
  const incomingTotal = parseNumberSafe(incomingTotalRaw);

  const [items, setItems] = useState(Array.isArray(passedSelected) ? passedSelected : null);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  const openError = (title, message) => setErrorModal({ visible: true, title: title || 'Error', message: message || '' });
  const closeError = () => setErrorModal({ visible: false, title: '', message: '' });

  const normalizeItem = (raw, fallbackId) => {
    const name = raw.nombre_item ?? raw.nombre ?? raw.name ?? raw.product_name ?? '';
    const price = Number(raw.precio_item ?? raw.precio ?? raw.price ?? raw.amount ?? 0) || 0;
    const qty = Number(raw.cantidad ?? raw.qty ?? raw.quantity ?? 1) || 1;
    const id = raw.id ?? raw.codigo ?? fallbackId ?? String(Math.random()).slice(2, 9);
    return { id: String(id), name, price, qty, raw };
  };

  useEffect(() => {
    let mounted = true;
    const fetchIfNeeded = async () => {
      if (items && Array.isArray(items)) return;
      if (!token) {
        openError('Error', 'No hay items ni token para obtener la información.');
        return;
      }
      setLoading(true);
      try {
        const url = `${API_BASE_URL.replace(/\/$/, '')}/api/mesas/r/${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
          },
        });
        if (!mounted) return;
        if (!res.ok) {
          openError('Error', `No se pudo obtener el consumo (HTTP ${res.status}).`);
          return;
        }
        const json = await res.json();
        const rawItems = Array.isArray(json.items) ? json.items : (json.data?.items ?? json.result?.items ?? []);
        const mapped = (Array.isArray(rawItems) ? rawItems : []).map((it, i) => normalizeItem(it, i));
        if (mounted) setItems(mapped);
      } catch (err) {
        console.warn('PorConsumo fetch error:', err);
        openError('Error', 'No se pudo recuperar la cuenta. Revisa tu conexión.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchIfNeeded();
    return () => { mounted = false; };
  }, [token]);

  const itemsSum = useMemo(() => {
    if (!items || !Array.isArray(items)) return 0;
    const s = items.reduce((acc, it) => acc + Number(it.price || 0), 0);
    return round2(s);
  }, [items]);

  const { iva, subtotal, total } = useMemo(() => {
    if (incomingSubtotal !== null && incomingIva !== null && incomingTotal !== null) {
      return { subtotal: round2(incomingSubtotal), iva: round2(incomingIva), total: round2(incomingTotal) };
    }
    if (incomingTotal !== null) {
      const t = round2(incomingTotal);
      const i = round2(t /1.16 * 0.16);
      const s = round2(t - i);
      return { iva: i, subtotal: s, total: t };
    }
    const t = round2(itemsSum);
    const i = round2(t /1.16 * 0.16);
    const s = round2(t - i);
    return { iva: i, subtotal: s, total: t };
  }, [incomingSubtotal, incomingIva, incomingTotal, itemsSum]);

  const totalStr = formatMoney(total);
  const baseTotalFont = totalFontSizeFor(totalStr);
  const scaleFactor = Math.max(0.9, Math.min(1.4, width / 360)); 
  const totalFont = Math.round(baseTotalFont * scaleFactor);

  if (loading || !items) {
    return (<View style={[stylesBase.loaderWrap, { backgroundColor: '#f5f7fb' }]}><ActivityIndicator size="large" color="#0046ff" /></View>);
  }

  const saleId = route?.params?.saleId ?? route?.params?.sale_id ?? route?.params?.venta_id ?? null;
  const restauranteId = route?.params?.restauranteId ?? route?.params?.restaurante_id ?? null;
  const sucursalId = route?.params?.sucursalId ?? route?.params?.sucursal_id ?? null;
  const mesaId = route?.params?.mesaId ?? route?.params?.mesa_id ?? null;
  const mesero = route?.params?.mesero ?? null;
  const moneda = route?.params?.moneda ?? 'MXN';

  const payloadCommon = { token, items, subtotal, iva, total };

  const attachMetaDup = (base) => ({
    ...base,
    sale_id: saleId, saleId,
    restaurante_id: restauranteId, restauranteId,
    sucursal_id: sucursalId, sucursalId,
    mesa_id: mesaId, mesaId,
    mesero, moneda,
  });

  const [tipApplied, setTipApplied] = useState(null);
  useEffect(() => {
    const tipFromParams = route?.params?.tipApplied ?? null;
    if (tipFromParams) {
      setTipApplied(tipFromParams);
      return;
    }
    const tAmt = route?.params?.tipAmount ?? route?.params?.monto_propina ?? null;
    const tTotalWithTip = route?.params?.totalWithTip ?? route?.params?.total_with_tip ?? null;
    const tPercent = route?.params?.tipPercent ?? route?.params?.tip_percent ?? null;
    if (tAmt !== null || tTotalWithTip !== null) {
      setTipApplied({
        tipAmount: Number(tAmt ?? 0),
        totalWithTip: Number(tTotalWithTip ?? (total + (Number(tAmt ?? 0)))),
        percent: Number(tPercent ?? 0),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.tipApplied, route?.params?.tipAmount, route?.params?.totalWithTip, route?.params]);

  const addTipLabel = tipApplied ? 'Añadir/editar propina' : 'Añadir propina';

  const styles = makeStyles({ wp, hp, rf, clamp, width, height, totalFont });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backArrow}>{'‹'}</Text></TouchableOpacity>
        <Text style={styles.title}>Por consumo</Text>
        <View style={{ width: Math.round(Math.max(44, wp(12))) }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient colors={['#FF2FA0', '#7C3AED', '#0046ff']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.gradientRow}>
            <View style={styles.leftCol}>
              <Image source={require('../../assets/images/logo2.png')} style={styles.tabtrackLogo} resizeMode="contain" />
              <View style={styles.logoWrap}><Image source={require('../../assets/images/restaurante.jpeg')} style={styles.restaurantImage} /></View>
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={styles.totalRow}>
                <Text style={[styles.totalNumber, { fontSize: totalFont }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{totalStr}</Text>
                <Text style={styles.totalCurrency}> MXN</Text>
              </View>
              <View style={styles.rightThanks}><Text style={styles.thanksText}>Items seleccionados</Text><Text style={styles.thanksSub}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text></View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitleLarge}>Por Consumo</Text>

          {items.length === 0 ? (<View style={styles.emptyBox}><Text style={styles.emptyText}>No hay productos seleccionados.</Text></View>) : items.map((it, i) => (
            <View key={it.id ?? i} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</Text>
              <Text style={styles.itemPrice}>{formatMoney(Number(it.price || 0))} MXN</Text>
            </View>
          ))}

          <View style={styles.separator} />

          <View style={styles.desgloseContainer}>
            <View style={styles.desgloseRow}><Text style={styles.desgloseLabel}>Sub total</Text><Text style={styles.desgloseValue}>{formatMoney(subtotal)} MXN</Text></View>
            <View style={[styles.desgloseRow, styles.ivaRow]}><Text style={styles.desgloseLabel}>IVA (estimado)</Text><Text style={[styles.desgloseValue, styles.ivaText]}>{formatMoney(iva)} MXN</Text></View>
            <View style={[styles.desgloseRow, { marginTop: hp(0.5) }]}><Text style={[styles.desgloseLabel, { fontSize: Math.round(clamp(rf(3.8), 16, 20)) }]}>Total</Text><Text style={[styles.desgloseValue, { fontSize: Math.round(clamp(rf(4.2), 18, 22)) }]}>{formatMoney(total)} MXN</Text></View>
          </View>

          {tipApplied && (
            <>
              <View style={{ height: hp(1) }} />
              <View style={styles.desgloseContainer}>
                <View style={styles.desgloseRow}><Text style={styles.desgloseLabel}>Propina</Text><Text style={styles.desgloseValue}>{formatMoney(Number(tipApplied.tipAmount || 0))} MXN</Text></View>
                <View style={[styles.desgloseRow, { marginTop: hp(0.5) }]}><Text style={[styles.desgloseLabel, { fontSize: Math.round(clamp(rf(3.8), 16, 20)) }]}>Total con propina</Text><Text style={[styles.desgloseValue, { fontSize: Math.round(clamp(rf(4.2), 18, 22)) }]}>{formatMoney(Number(tipApplied.totalWithTip || (total + Number(tipApplied.tipAmount || 0))))} MXN</Text></View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              const payload = attachMetaDup({ ...payloadCommon, returnScreen: 'Consumo' });
              navigation.navigate('Propina', payload);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>{addTipLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              const payload = attachMetaDup({
                token,
                items,
                subtotal,
                iva,
                total,
                ...(tipApplied ? { tipAmount: Number(tipApplied.tipAmount || 0), totalWithTip: Number(tipApplied.totalWithTip || (total + Number(tipApplied.tipAmount || 0))), tipPercent: Number(tipApplied.percent || 0) } : {}),
              });
              navigation.navigate('Payment', payload);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Proceder a pagar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.ghostButton]} onPress={() => navigation.goBack()} activeOpacity={0.9}><Text style={styles.ghostButtonText}>Volver</Text></TouchableOpacity>
        </View>
      </ScrollView>

      {errorModal.visible && (
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#FF2FA0', '#6B2CFF', '#0046ff']} style={styles.modalBox}>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => { closeError(); }}><Text style={styles.modalBtnPrimaryText}>Aceptar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={() => { closeError(); navigation.goBack(); }}><Text style={styles.modalBtnGhostText}>Volver</Text></TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

/* base styles that are not dimension-dependent */
const stylesBase = StyleSheet.create({
  loaderWrap: { flex:1, justifyContent:'center', alignItems:'center' },
});

/* responsive styles generator */
function makeStyles({ wp, hp, rf, clamp, width, height, totalFont }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f7fb' },
    loaderWrap: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#f5f7fb' },

    topBar: {
      width: '100%',
      height: Math.round(hp(9.6)), // ~88 on 915 height
      paddingHorizontal: Math.round(wp(3.5)),
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : Math.round(hp(1)),
    },
    backBtn: { width: Math.round(Math.max(44, wp(12))), alignItems: 'flex-start', justifyContent: 'center' },
    backArrow: { fontSize: Math.round(clamp(rf(7.5), 24, 40)), color: '#0b58ff', marginLeft: 2 },
    title: { fontSize: Math.round(clamp(rf(4.2), 14, 18)), fontWeight: '800', color: '#0b58ff' },

    container: { alignItems: 'center', paddingBottom: Math.round(hp(3)), paddingTop: Math.round(hp(1)) },

    headerGradient: {
      width: '100%',
      paddingHorizontal: Math.round(wp(4)),
      paddingTop: Math.round(hp(2.2)),
      paddingBottom: Math.round(hp(3.2)),
      borderBottomRightRadius: Math.round(wp(10)),
      overflow: 'hidden',
    },
    gradientRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    leftCol: { flexDirection: 'column', alignItems: 'flex-start' },

    tabtrackLogo: { width: Math.round(clamp(wp(28), 80, 160)), height: Math.round(clamp(rf(5.5), 28, 48)), marginBottom: Math.round(hp(0.6)) },
    logoWrap: { marginTop: Math.round(hp(0.6)), backgroundColor: 'rgba(255,255,255,0.12)', padding: Math.round(wp(2)), borderRadius: Math.round(wp(2)) },
    restaurantImage: { width: Math.round(clamp(wp(14), 48, 96)), height: Math.round(clamp(wp(14), 48, 96)), borderRadius: Math.round(clamp(wp(14), 48, 96)/8), backgroundColor: '#fff' },

    rightCol: {
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      paddingTop: Math.round(hp(0.4)),
      maxWidth: Math.round(Math.min(420, width * 0.6)),
      marginRight: Math.round(wp(2)),
    },
    totalLabel: { color: 'rgba(255,255,255,0.95)', fontSize: Math.round(clamp(rf(3.2), 12, 16)), marginBottom: Math.round(hp(0.6)) },
    totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
    totalNumber: { color: '#fff', fontWeight: '900' /* fontSize set dynamically */ },
    totalCurrency: { color: '#fff', fontSize: Math.round(clamp(rf(3.2), 12, 16)), marginLeft: Math.round(wp(1)), marginBottom: Math.round(hp(0.2)), opacity: 0.95 },
    rightThanks: { marginTop: Math.round(hp(1)), alignItems: 'flex-end' },
    thanksText: { color: '#fff', fontWeight: '700', fontSize: Math.round(clamp(rf(3.2), 12, 16)) },
    thanksSub: { color: 'rgba(255,255,255,0.95)', fontSize: Math.round(clamp(rf(2.8), 10, 14)), marginTop: Math.round(hp(0.6)), textAlign: 'right' },

    content: { width: Math.round(Math.min(width - Math.round(wp(8)), 520)), backgroundColor: '#fff', padding: Math.round(wp(4)), marginTop: 0 },

    sectionTitleLarge: { fontSize: Math.round(clamp(rf(6.6), 18, 32)), fontWeight: '700', marginBottom: Math.round(hp(1)), color: '#000' },

    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(1.2)), borderBottomWidth: 0.6, borderBottomColor: '#f1f3f5' },
    itemName: { fontSize: Math.round(clamp(rf(3.6), 13, 16)), color: '#333', flex: 1 },
    itemPrice: { width: Math.round(Math.min(140, wp(36))), textAlign: 'right', color: '#111', fontSize: Math.round(clamp(rf(3.4), 12, 16)) },

    separator: { height: 1, backgroundColor: '#e9e9e9', marginVertical: Math.round(hp(1.6)) },

    desgloseContainer: { paddingHorizontal: 0, paddingTop: Math.round(hp(0.6)), alignSelf: 'stretch' },
    desgloseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(0.8)) },
    desgloseLabel: { fontSize: Math.round(clamp(rf(3.8), 14, 18)), color: '#374151', fontWeight: '700' },
    desgloseValue: { fontSize: Math.round(clamp(rf(4.2), 16, 20)), color: '#111827', fontWeight: '900' },
    ivaRow: { paddingTop: 0 },
    ivaText: { fontWeight: '800' },

    primaryButton: { width: '100%', backgroundColor: '#0046ff', borderRadius: Math.round(wp(2.5)), paddingVertical: Math.round(hp(1.8)), alignItems: 'center', marginTop: Math.round(hp(1.6)) },
    primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: Math.round(clamp(rf(3.6), 14, 18)) },
    secondaryButton: { width: '100%', backgroundColor: '#fff', borderRadius: Math.round(wp(2.5)), paddingVertical: Math.round(hp(1.6)), alignItems: 'center', marginTop: Math.round(hp(1.2)), borderWidth: 1.2, borderColor: '#0046ff' },
    secondaryButtonText: { color: '#0046ff', fontWeight: '800', fontSize: Math.round(clamp(rf(3.4), 13, 16)) },
    ghostButton: { width: '100%', backgroundColor: '#fff', borderRadius: Math.round(wp(2.5)), paddingVertical: Math.round(hp(1.6)), alignItems: 'center', marginTop: Math.round(hp(1.2)), borderWidth: 1, borderColor: '#ddd' },
    ghostButtonText: { color: '#444', fontWeight: '700', fontSize: Math.round(clamp(rf(3.4), 13, 16)) },

    emptyBox: { padding: Math.round(hp(2.4)), alignItems: 'center' },
    emptyText: { color: '#666', fontSize: Math.round(clamp(rf(3.2), 12, 14)) },

    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    modalBox: { width: Math.round(Math.min(width - Math.round(wp(12)), 520)), borderRadius: Math.round(wp(3)), padding: Math.round(wp(4)), alignItems: 'center' },
    modalTitle: { color: '#fff', fontSize: Math.round(clamp(rf(4.6), 16, 20)), fontWeight: '800', marginBottom: Math.round(hp(1)) },
    modalMessage: { color: '#fff', fontSize: Math.round(clamp(rf(3.6), 12, 16)), textAlign: 'center', marginBottom: Math.round(hp(1.4)) },
    modalButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalBtnPrimary: { flex: 1, paddingVertical: Math.round(hp(1.6)), borderRadius: Math.round(wp(2.2)), backgroundColor: '#fff', marginRight: Math.round(wp(2)), alignItems: 'center' },
    modalBtnPrimaryText: { color: '#0046ff', fontWeight: '800', fontSize: Math.round(clamp(rf(3.4), 13, 16)) },
    modalBtnGhost: { flex: 1, paddingVertical: Math.round(hp(1.6)), borderRadius: Math.round(wp(2.2)), backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginLeft: Math.round(wp(2)), alignItems: 'center' },
    modalBtnGhostText: { color: '#fff', fontWeight: '700', fontSize: Math.round(clamp(rf(3.4), 13, 16)) },
  });
}
