import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  FlatList,
  Alert,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatMoney = (n) =>
  Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

export default function ResumenPago() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // responsive helpers (patrón Propina.js)
  const { width, height } = useWindowDimensions();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 8);
  const headerHeight = clamp(rf(88), 64, 120);
  const contentMaxWidth = Math.min(width - 32, 420);
  const logoWidth = clamp(Math.round(width * 0.32), 90, 160);
  const restImageSize = clamp(Math.round(width * 0.18), 56, 96);
  // NEW: price width (responsive, max cap)
  const priceWidth = Math.round(Math.min(140, Math.max(88, width * 0.32)));

  const params = route?.params ?? {};
  const tipApplied = params.tipApplied ?? null;

  const pSubtotal = Number(tipApplied?.subtotal ?? params.subtotal ?? 0);
  const pIvaRaw = tipApplied?.iva ?? params.iva ?? null;
  const pTotalRaw = tipApplied?.total ?? params.total ?? null;
  const token = tipApplied?.token ?? params.token ?? null;
  const itemsFromParams = tipApplied?.items ?? params.items ?? [];
  const peopleFromParams = tipApplied?.people ?? params.people ?? 1;
  const restaurantImage = tipApplied?.restaurantImage ?? params.restaurantImage ?? null;

  const initialTipAmount = tipApplied?.tipAmount ?? params.tipAmount ?? 0;
  const initialTipPercent = tipApplied?.percent ?? params.tipPercent ?? 0;

  const [tip, setTip] = useState(Number(initialTipAmount || 0));
  const [tipPercent, setTipPercent] = useState(Number(initialTipPercent || 0));
  const [items, setItems] = useState(Array.isArray(itemsFromParams) ? itemsFromParams : []);
  const [subtotal, setSubtotal] = useState(Number(pSubtotal || 0));
  const [iva, setIva] = useState(pIvaRaw !== null ? Number(pIvaRaw) : null);
  const [totalNoTip, setTotalNoTip] = useState(pTotalRaw !== null ? Number(pTotalRaw) : null);
  const [people, setPeople] = useState(Number(peopleFromParams && peopleFromParams > 0 ? peopleFromParams : 1));

  useEffect(() => {
    const newTipApplied = route?.params?.tipApplied ?? null;
    if (newTipApplied && typeof newTipApplied === 'object') {
      setTip(Number(newTipApplied.tipAmount || 0));
      setTipPercent(Number(newTipApplied.percent || 0));

      if (newTipApplied.subtotal !== undefined) setSubtotal(Number(newTipApplied.subtotal || 0));
      if (newTipApplied.iva !== undefined) setIva(Number(newTipApplied.iva || 0));
      if (newTipApplied.total !== undefined) setTotalNoTip(Number(newTipApplied.total || 0));
      if (newTipApplied.items !== undefined) setItems(Array.isArray(newTipApplied.items) ? newTipApplied.items : []);
      if (newTipApplied.people !== undefined) setPeople(Number(newTipApplied.people || 1));
    } else {
      const p = route?.params ?? {};
      if (p.subtotal !== undefined) setSubtotal(Number(p.subtotal || 0));
      if (p.iva !== undefined) setIva(p.iva !== null ? Number(p.iva) : null);
      if (p.total !== undefined) setTotalNoTip(p.total !== null ? Number(p.total) : null);
      if (p.items !== undefined) setItems(Array.isArray(p.items) ? p.items : []);
      if (p.people !== undefined) setPeople(Number(p.people || 1));
      if (p.tipAmount !== undefined) setTip(Number(p.tipAmount || 0));
      if (p.tipPercent !== undefined) setTipPercent(Number(p.tipPercent || 0));
    }
  }, [route?.params?.tipApplied, route?.params]);

  const ivaRate = 0.16;
  const computedIva = iva !== null && iva !== undefined ? Number(iva) : Number((subtotal * ivaRate).toFixed(2));
  const computedTotalNoTip =
    totalNoTip !== null && totalNoTip !== undefined ? Number(totalNoTip) : Number((subtotal + computedIva).toFixed(2));

  const totalWithTip = useMemo(() => {
    const t = Number(computedTotalNoTip) + Number(tip || 0);
    return Number(isFinite(t) ? Number(t.toFixed(2)) : 0);
  }, [computedTotalNoTip, tip]);

  const peopleCount = Number(people && people > 0 ? people : 1);
  const perPerson = Number((totalWithTip / peopleCount).toFixed(2));

  const todayString = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

  const fromParam = params.from ?? params.source ?? params.mode ?? null;
  const isOneExhibicion =
    (typeof fromParam === 'string' && fromParam.toLowerCase() === 'oneexhibicion') ||
    params.oneExhibicion === true ||
    params.oneExhibition === true;

  const goToPropina = () => {
    navigation.navigate('Propina', {
      subtotal,
      iva: computedIva,
      total: computedTotalNoTip,
      token,
      items,
      people: peopleCount,
      returnScreen: 'ResumenPago',
      restaurantImage,
    });
  };

  // Enviamos items como JSON string + primitivos (prevenimos render directo de objetos)
  const handlePay = () => {
    try {
      const payload = {
        token: token ?? null,
        itemsJson: JSON.stringify(Array.isArray(items) ? items : []),
        subtotal,
        iva: computedIva,
        total: computedTotalNoTip,
        tipAmount: tip,
        tipPercent,
        totalWithTip,
        people: peopleCount,
        restaurantImage: restaurantImage ?? null,
      };
      navigation.navigate('Payment', payload);
    } catch (err) {
      Alert.alert('Error', 'No se pudo preparar el pago.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.itemRow, { paddingVertical: Math.max(8, rf(8)) }]}>
      <Text
        style={[
          styles.itemName,
          { fontSize: clamp(rf(14), 12, 16), marginRight: 8, flexShrink: 1, flexWrap: 'wrap' },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {(Number(item.qty || item.cantidad || 0) > 1 ? `${item.qty ?? item.cantidad}× ` : '') +
          (item.name ?? item.nombre ?? '—')}
      </Text>
      <Text
        style={[
          styles.itemPrice,
          {
            width: priceWidth,
            fontSize: clamp(rf(14), 12, 16),
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {formatMoney(Number(item.price ?? item.precio ?? 0) * Number(item.qty ?? item.cantidad ?? 1))} MXN
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* topBar responsive inline styles */}
      <View style={[styles.topBar, { height: headerHeight, paddingTop: topPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backArrow, { fontSize: rf(32) }]}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: clamp(rf(15), 13, 18) }]}>Tu cuenta</Text>
        <Text style={[styles.topSmall, { fontSize: clamp(rf(10), 10, 13) }]}>{todayString}</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: Math.max(24, rf(20)) }}>
        <LinearGradient
          colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[styles.headerGradient, { paddingTop: rf(18), paddingBottom: rf(18) }]}
        >
          <View style={[styles.gradientRow, { width: contentMaxWidth }]}>
            <View style={styles.leftCol}>
              <Image source={require('../../assets/images/logo2.png')} style={[styles.tabtrackLogo, { width: logoWidth, height: Math.round(logoWidth * 0.32) }]} resizeMode="contain" />
              <View style={[styles.logoWrap, { marginTop: rf(6), padding: Math.round(rf(6)) }]}>
                <Image
                  source={restaurantImage ? { uri: restaurantImage } : require('../../assets/images/restaurante.jpeg')}
                  style={[styles.restaurantImage, { width: restImageSize, height: restImageSize, borderRadius: Math.round(restImageSize * 0.14) }]}
                />
              </View>
            </View>

            <View style={[styles.rightCol, { maxWidth: Math.round(width * 0.42) }]}>
              <Text style={[styles.totalLabel, { fontSize: clamp(rf(13), 12, 16) }]}>Total</Text>
              <View style={styles.totalRow}>
                <Text style={[styles.totalNumber, { fontSize: clamp(rf(28), 20, 36) }]} numberOfLines={1} ellipsizeMode="tail">
                  {formatMoney(totalWithTip)}
                </Text>
                <Text style={[styles.totalCurrency, { fontSize: clamp(rf(12), 11, 14) }]}>MXN</Text>
              </View>
              <View style={styles.rightThanks}>
                <Text style={[styles.thanksText, { fontSize: clamp(rf(14), 12, 16) }]}>Detalle</Text>
                <Text style={[styles.thanksSub, { fontSize: clamp(rf(11), 10, 14) }]}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.content, { width: contentMaxWidth, padding: clamp(16, 12, 20), marginTop: Math.round(rf(8)) }]}>
          <Text style={[styles.sectionTitle, { fontSize: clamp(rf(18), 16, 24) }]}>Resumen de pago</Text>

          <View style={styles.sectionCard}>
            <FlatList
              data={items}
              keyExtractor={(it, i) => (it.id ? String(it.id) : String(i))}
              renderItem={renderItem}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No hay productos seleccionados.</Text>}
            />

            <View style={styles.separator} />

            <View style={styles.row}>
              <Text style={[styles.label, { fontSize: clamp(rf(13), 12, 16) }]}>Sub total</Text>
              <Text style={[styles.value, { fontSize: clamp(rf(13), 12, 16) }]}>{formatMoney(subtotal)} MXN</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { fontSize: clamp(rf(13), 12, 16) }]}>IVA (estimado)</Text>
              <Text style={[styles.value, { fontSize: clamp(rf(13), 12, 16) }]}>{formatMoney(computedIva)} MXN</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { fontSize: clamp(rf(13), 12, 16) }]}>Propina {tipPercent ? `(${tipPercent}%)` : ''}</Text>
              <Text style={[styles.value, { fontSize: clamp(rf(13), 12, 16) }]}>{formatMoney(tip)} MXN</Text>
            </View>

            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={[styles.label, { fontWeight: '800', fontSize: clamp(rf(14), 13, 18) }]}>Total con propina</Text>
              <Text style={[styles.value, { fontWeight: '900', fontSize: clamp(rf(20), 16, 28) }]}>{formatMoney(totalWithTip)} MXN</Text>
            </View>

            {!isOneExhibicion && peopleCount > 1 && (
              <View style={[styles.row, { marginTop: 10 }]}>
                <Text style={[styles.label, { fontSize: clamp(rf(13), 12, 16) }]}>Pago por persona</Text>
                <Text style={[styles.value, { fontSize: clamp(rf(13), 12, 16) }]}>{formatMoney(perPerson)} MXN</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={[styles.primaryButton, { paddingVertical: clamp(rf(12), 10, 16) }]} onPress={goToPropina} activeOpacity={0.9}>
            <Text style={[styles.primaryButtonText, { fontSize: clamp(rf(15), 14, 18) }]}>Añadir/editar propina</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.ghostButton, { paddingVertical: clamp(rf(10), 8, 14) }]} onPress={handlePay} activeOpacity={0.9}>
            <Text style={[styles.ghostButtonText, { fontSize: clamp(rf(14), 13, 16) }]}>Pagar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* estilos base (estructura similar a tu original, tamaños dinámicos aplicados inline arriba) */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fb' },
  topBar: {
    width: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: '#0b58ff', marginLeft: 2 },
  title: { fontWeight: '800', color: '#0b58ff' },
  topSmall: { color: '#6b7280' },
  container: { alignItems: 'center', paddingBottom: 24 },
  headerGradient: {
    width: '100%',
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  gradientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftCol: { flex: 1, flexDirection: 'column', alignItems: 'flex-start' },
  tabtrackLogo: { marginBottom: 8 },
  logoWrap: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10 },
  restaurantImage: { backgroundColor: '#fff' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  totalLabel: { color: 'rgba(255,255,255,0.95)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  totalNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.6, flexShrink: 1 },
  totalCurrency: { color: '#fff', marginLeft: 6, marginBottom: 3, opacity: 0.95 },
  rightThanks: { marginTop: 10, alignItems: 'flex-end' },
  thanksText: { color: '#fff', fontWeight: '700' },
  thanksSub: { color: 'rgba(255,255,255,0.95)', marginTop: 6 },
  content: { backgroundColor: '#fff', marginTop: 8 },
  sectionTitle: { fontWeight: '800', marginBottom: 8, color: '#111827' },
  sectionCard: { borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 4 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.6,
    borderBottomColor: '#f1f3f5',
  },
  itemName: { color: '#333' },
  itemPrice: { textAlign: 'right', color: '#111' },
  separator: { height: 1, backgroundColor: '#e9e9e9', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#6b7280' },
  value: { color: '#111827' },
  emptyText: { color: '#666', paddingVertical: 12 },
  primaryButton: {
    width: '100%',
    backgroundColor: '#0046ff',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  ghostButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ghostButtonText: { color: '#444', fontWeight: '700' },
});
