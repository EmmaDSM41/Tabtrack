import React, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  FlatList,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatMoney = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

export default function OneExhibicion() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params ?? {};
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const styles = makeStyles({ width, height, wp, hp, rf, clamp, insets });

  const {
    token = null,
    items: incomingItems = [],
    subtotal: pSubtotal = null,
    iva: pIva = null,
    total: pTotal = null,
    totalWithTip: pTotalWithTip = null,
    saleId: saleIdFromParams = null,
    totalComensales: totalComensalesFromParams = null,
    fechaApertura: fechaAperturaFromParams = null,
    restaurantImage = null,
  } = params;

  const tipApplied = params.tipApplied ?? null;

  const sale_id =
    params.sale_id ??
    params.saleId ??
    tipApplied?.sale_id ??
    tipApplied?.saleId ??
    saleIdFromParams ??
    null;
  const sucursal_id =
    params.sucursal_id ??
    params.sucursalId ??
    params.sucursal ??
    tipApplied?.sucursal_id ??
    tipApplied?.sucursalId ??
    null;
  const restaurante_id =
    params.restaurante_id ??
    params.restauranteId ??
    params.restaurante ??
    tipApplied?.restaurante_id ??
    tipApplied?.restauranteId ??
    null;
  const mesa_id =
    params.mesa_id ??
    params.mesaId ??
    params.mesa ??
    tipApplied?.mesa_id ??
    tipApplied?.mesaId ??
    null;
  const total_comensales =
    params.total_comensales ??
    params.totalComensales ??
    params.groupPeople ??
    tipApplied?.total_comensales ??
    tipApplied?.totalComensales ??
    totalComensalesFromParams ??
    null;
  const fechaApertura =
    params.fecha_apertura ??
    params.fechaApertura ??
    tipApplied?.fecha_apertura ??
    fechaAperturaFromParams ??
    null;
  const moneda = params.moneda ?? tipApplied?.moneda ?? 'MXN';
  const mesero = params.mesero ?? tipApplied?.mesero ?? null;

  // Normalizar items
  const normalizeItems = (rawItems) => {
    if (!Array.isArray(rawItems)) return [];
    return rawItems.map((it, idx) => {
      const qty = Number(it.qty ?? it.cantidad ?? it.quantity ?? 1) || 1;
      const unit =
        Number(
          it.unitPrice ??
            it.precio_item ??
            it.precio ??
            it.price ??
            it.unit_price ??
            0
        ) || 0;
      const line =
        Number(it.lineTotal ?? it.line_total ?? it.total ?? +(unit * qty).toFixed(2)) ||
        +(unit * qty).toFixed(2);
      const name = it.name ?? it.nombre ?? it.nombre_item ?? it.title ?? `Item ${idx + 1}`;
      const paid = !!(it.paid === true || it.pagado === true);
      const paidPartial = !!(it.paidPartial === true || it.paid_partial === true);
      const paidAmount = Number(it.paidAmount ?? it.paid_amount ?? it.monto_pagado ?? it.monto_pago ?? 0) || 0;
      const canceled = !!(it.canceled === true || it.cancelado === true);
      const id = it.id ?? it.item_id ?? it.codigo ?? `item-${idx}`;
      return {
        ...it,
        id: String(id),
        name,
        qty,
        price: unit,
        unitPrice: unit,
        lineTotal: Number(line),
        paid,
        paidPartial,
        paidAmount: Number(paidAmount),
        canceled,
        raw: it,
      };
    });
  };

  const items = useMemo(() => normalizeItems(params.items ?? incomingItems ?? []), [
    params.items,
    incomingItems,
  ]);

  const originalTotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.lineTotal || 0), 0),
    [items]
  );

  const paidSum = useMemo(() => items.reduce((s, it) => s + Number(it.paidAmount || 0), 0), [items]);

  // ------------------ Nuevo: detectar descuento (varias formas comunes) ------------------
  const discountAmount = Number(
    params.descuentos_venta?.monto_total ??
    params.totales_venta?.total_descuentos ??
    params.total_descuentos ??
    params.total_descuento ??
    params.descuento ??
    params.discount_amount ??
    params.monto_descuento ??
    0
  ) || 0;
  // ----------------------------------------------------------------------------------------

  const pendingFromParams = Number(params.total_pending ?? params.totalPending ?? params.total_pending_amount ?? NaN);
  const hasPendingFromParams = !Number.isNaN(pendingFromParams);

  // Si no viene pending desde params, tomamos la suma de items - paidSum - descuento
  const pendingTotalFromItems = +((originalTotal - paidSum - discountAmount)).toFixed(2);
  const pendingTotal = hasPendingFromParams ? Number(pendingFromParams) : (pendingTotalFromItems >= 0 ? pendingTotalFromItems : 0);

  // IVA y subtotal (estimados) se calculan sobre pendingTotal (ya con descuento aplicado arriba)
  const iva = +(pendingTotal / 1.16 * 0.16).toFixed(2);
  const subtotal = +(pendingTotal - iva).toFixed(2);

  // shownTotal (si hay propina aplicada o totalWithTip en params, lo respetamos)
  const shownTotal = tipApplied?.totalWithTip ?? pTotalWithTip ?? pendingTotal;

  const people = (typeof total_comensales === 'number' && total_comensales > 0) ? total_comensales : 1;

  const todayText = fechaApertura ? (new Date(fechaApertura)).toLocaleString('es-MX') : new Date().toLocaleString('es-MX');

  const renderItem = ({ item }) => {
    const qty = Number(item.qty ?? 1);
    const unit = Number(item.price ?? item.unitPrice ?? 0);
    const line = Number(item.lineTotal ?? (unit * qty));
    const remainingForItem = item.paid ? 0 : (item.paidPartial ? +(line - Number(item.paidAmount || 0)).toFixed(2) : line);

    return (
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.itemName,
              item.canceled && styles.itemCanceled,
              item.paid && { color: '#10b981', fontWeight: '800' },
            ]}
          >
            {(qty > 1 ? `${qty}× ` : '') + (item.name ?? '—')}
          </Text>

          {item.paid ? (
            <Text style={styles.metaPaid}>Pagado • {formatMoney(item.paidAmount)} {moneda}</Text>
          ) : item.paidPartial ? (
            <Text style={styles.metaPaid}>Parcial: {formatMoney(item.paidAmount)} pagado — Falta {formatMoney(remainingForItem)} {moneda}</Text>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.itemPrice,
              item.canceled && styles.itemCanceled,
              item.paid && { color: '#10b981', fontWeight: '800' },
            ]}
          >
            {formatMoney(line)} {moneda}
          </Text>
          {!item.paid && item.paidPartial ? (
            <Text style={styles.metaPending}>Pendiente: {formatMoney(remainingForItem)} {moneda}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const goToPropina = () => {
    navigation.navigate('Propina', {
      subtotal: subtotal ?? 0,
      iva: iva ?? 0,
      total: pendingTotal,
      token,
      items,
      people,
      returnScreen: 'OneExhibicion',
      restaurantImage,
      sale_id,
      saleId: sale_id,
      sucursal_id,
      sucursalId: sucursal_id,
      restaurante_id,
      restauranteId: restaurante_id,
      mesa_id,
      mesaId: mesa_id,
      total_comensales,
      totalComensales: total_comensales,
      fecha_apertura: fechaApertura,
      fechaApertura,
      moneda,
      mesero,
    });
  };

  const handlePay = () => {
    // --- mantengo el cálculo de itemsToPay por compatibilidad y trazabilidad,
    // pero NO lo envío en el payload hacia Payment para evitar que el backend
    // vuelva a sumar items y genere el error "suma de items excede adeudo".
    const itemsToPay = (items || []).map((it) => {
      const line = Number(it.lineTotal || 0);
      if (it.canceled) return null;
      if (it.paid) {
        return null;
      }
      if (it.paidPartial) {
        const remaining = +(line - Number(it.paidAmount || 0)).toFixed(2);
        return {
          ...it,
          lineTotal: remaining,
          price: remaining,
          qty: 1,
        };
      }
      return {
        ...it,
        lineTotal: line,
        price: line,
        qty: 1,
      };
    }).filter(Boolean);

    // Suma de items (sin descuento)
    const totalToCharge = itemsToPay.reduce((s, it) => s + Number(it.lineTotal || 0), 0);

    // aplicamos descuento sobre la suma de items si no hay params que lo indiquen
    const computedTotalAfterDiscount = +((totalToCharge - discountAmount)).toFixed(2);
    const safeComputedTotalAfterDiscount = computedTotalAfterDiscount >= 0 ? computedTotalAfterDiscount : 0;

    // IVA/subtotal calculados sobre el total con descuento
    const ivaToCharge = +(safeComputedTotalAfterDiscount / 1.16 * 0.16).toFixed(2);
    const subtotalToCharge = +(safeComputedTotalAfterDiscount - ivaToCharge).toFixed(2);

    const tipObj = tipApplied ?? params.tipApplied ?? null;
    const tipAmount = tipObj ? Number(tipObj.tipAmount || tipObj.tip_amount || 0) : 0;
    const tipPercent = tipObj ? Number(tipObj.percent || tipObj.tipPercent || 0) : 0;
    const totalWithTip = tipObj ? Number(tipObj.totalWithTip || tipObj.total_with_tip || (safeComputedTotalAfterDiscount + tipAmount)) : (safeComputedTotalAfterDiscount + tipAmount);

    // Preferir valores explicitados en params (si vienen de Escanear/Propina), si no, usar los calculados (que incluyen descuento)
    const finalSubtotal = Number(params.subtotal ?? pSubtotal ?? subtotalToCharge ?? subtotal);
    const finalIva = Number(params.iva ?? pIva ?? ivaToCharge ?? iva);
    const finalTotal = Number(params.total ?? pTotal ?? safeComputedTotalAfterDiscount ?? pendingTotal);
    const finalTotalWithTip = Number(params.totalWithTip ?? pTotalWithTip ?? (finalTotal + (tipAmount || 0)) ?? totalWithTip);

    // --- AQUI: construyo payload SIN items ni originalItems ---
    const payload = {
      token,
      // NOT sending items to avoid backend re-summing them
      subtotal: finalSubtotal,
      iva: finalIva,
      total: finalTotal,
      tipAmount: tipAmount,
      tipPercent: tipPercent,
      totalWithTip: finalTotalWithTip,
      people,
      sale_id,
      saleId: sale_id,
      sucursal_id,
      sucursalId: sucursal_id,
      restaurante_id,
      restauranteId: restaurante_id,
      mesa_id,
      mesaId: mesa_id,
      total_comensales,
      totalComensales: total_comensales,
      moneda,
      mesero,
      restaurantImage,
      total_pending: pendingTotal,
      monto_descuento: discountAmount,
      descuento: discountAmount,
    };

    // ayuda a Payment a mostrar exactamente lo mismo
    payload.displayTotal = finalTotalWithTip;

    console.log('OneExhibicion -> navegando a Payment con payload (SIN items):', JSON.stringify(payload, null, 2));
    navigation.navigate('Payment', payload);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Tu Cuenta</Text>
        <Text style={styles.topSmall}>{todayText}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient colors={['#FF2FA0', '#7C3AED', '#0046ff']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.gradientRow}>
            <View style={styles.leftCol}>
              <Image source={require('../../assets/images/logo2.png')} style={styles.tabtrackLogo} resizeMode="contain" />
              <View style={styles.logoWrap}>
                <Image source={restaurantImage ? { uri: restaurantImage } : require('../../assets/images/restaurante.jpeg')} style={styles.restaurantImage} />
              </View>
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.totalLabel}>Total pendiente</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalNumber} numberOfLines={1} ellipsizeMode="tail">{formatMoney(shownTotal)}</Text>
                <Text style={styles.totalCurrency}>{moneda ?? 'MXN'}</Text>
              </View>

              <View style={styles.rightThanks}>
                <Text style={styles.thanksText}>Detalle</Text>
                <Text style={styles.thanksSub}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Desglose</Text>

          <FlatList
            data={items}
            keyExtractor={(it, i) => (it.id ? String(it.id) : String(i))}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay productos seleccionados.</Text>}
          />

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.label}>Sub total</Text>
            <Text style={styles.value}>{formatMoney(subtotal)} MXN</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>IVA (estimado)</Text>
            <Text style={styles.value}>{formatMoney(iva)} MXN</Text>
          </View>

          {/* Mostrar descuento SOLO si existe */}
          {discountAmount > 0 ? (
            <View style={styles.row}>
              <Text style={styles.label}>Descuento</Text>
              <Text style={styles.value}>-{formatMoney(discountAmount)} MXN</Text>
            </View>
          ) : null}

          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={[styles.label, styles.bold]}>Total pendiente</Text>
            <Text style={[styles.value, styles.boldValue]}>{formatMoney(pendingTotal)} MXN</Text>
          </View>

          {tipApplied && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Propina ({tipApplied.percent ?? tipApplied.tipPercent ?? 0}%)</Text>
                <Text style={styles.value}>{formatMoney(tipApplied.tipAmount ?? tipApplied.tip_amount ?? 0)} MXN</Text>
              </View>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={[styles.label, styles.bold]}>Total con propina</Text>
                <Text style={[styles.value, styles.boldValue, { fontSize: styles.totalNumber.fontSize * 0.65 }]}>{formatMoney(tipApplied.totalWithTip ?? tipApplied.total_with_tip ?? shownTotal)} MXN</Text>
              </View>
            </>
          )}

          <View style={{ height: 12 }} />

          <TouchableOpacity style={styles.primaryButton} onPress={goToPropina} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Añadir/editar propina</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostButton} onPress={handlePay} activeOpacity={0.9}>
            <Text style={styles.ghostButtonText}>Pagar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({ width, height, wp, hp, rf, clamp, insets }) {
  const safeTop = Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 8) : (insets?.top ?? 8));
  const topBarHeight = Math.round(clamp(hp(10) + (safeTop / 100), 64, 110));
  const headerPaddingV = Math.round(hp(2.2));
  const logoW = Math.round(Math.min(140, width * 0.28));
  const restaurantImageSize = Math.round(clamp(rf(6.5), 48, Math.max(64, Math.min(96, width * 0.18))));
  const contentMaxWidth = Math.min(width - 32, 720);
  const totalNumberSize = Math.round(clamp(rf(8.5), 20, Math.max(28, Math.min(42, width * 0.09))));
  const sectionTitleSize = Math.round(clamp(rf(5.6), 18, 26));

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f7fb' },
    topBar: {
      width: '100%',
      height: topBarHeight,
      paddingHorizontal: Math.round(wp(4)),
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 8) : 8,
    },
    backBtn: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
    backArrow: { fontSize: Math.round(clamp(rf(8), 24, 38)), color: '#0b58ff', marginLeft: 2 },
    title: { fontSize: Math.round(clamp(rf(4.5), 14, 18)), fontWeight: '800', color: '#0b58ff' },
    topSmall: { fontSize: Math.round(clamp(rf(3), 10, 12)), color: '#6b7280' },

    container: { alignItems: 'center', paddingBottom: Math.round(hp(3)) },

    headerGradient: { width: '100%', paddingHorizontal: Math.round(wp(4)), paddingTop: headerPaddingV, paddingBottom: Math.round(hp(3.2)), borderBottomRightRadius: Math.round(Math.min(56, width * 0.12)), overflow: 'hidden' },
    gradientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },

    leftCol: { flexDirection: 'column', alignItems: 'flex-start' },
    tabtrackLogo: { width: logoW, height: Math.round(logoW * 0.32), marginBottom: Math.round(hp(0.6)) },
    logoWrap: { marginTop: Math.round(hp(1)), backgroundColor: 'rgba(255,255,255,0.12)', padding: Math.round(wp(2)), borderRadius: 10 },
    restaurantImage: { width: restaurantImageSize, height: restaurantImageSize, borderRadius: Math.round(Math.min(16, restaurantImageSize * 0.18)), backgroundColor: '#fff' },

    rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2, maxWidth: Math.round(Math.min(width * 0.45, 320)), marginRight: Math.round(wp(2)) },
    totalLabel: { color: 'rgba(255,255,255,0.95)', fontSize: Math.round(clamp(rf(3.6), 12, 16)), marginBottom: 6 },
    totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
    totalNumber: { color: '#fff', fontSize: totalNumberSize, fontWeight: '900', letterSpacing: 0.6, lineHeight: Math.round(totalNumberSize * 1.05) },
    totalCurrency: { color: '#fff', fontSize: Math.round(clamp(rf(3.2), 10, 14)), marginLeft: 6, marginBottom: 0, opacity: 0.95 },

    rightThanks: { marginTop: 10, alignItems: 'flex-end' },
    thanksText: { color: '#fff', fontWeight: '700', fontSize: Math.round(clamp(rf(3.4), 12, 14)) },
    thanksSub: { color: 'rgba(255,255,255,0.95)', fontSize: Math.round(clamp(rf(3), 10, 13)), marginTop: 6 },

    content: { width: contentMaxWidth, backgroundColor: '#fff', padding: Math.round(wp(4)), marginTop: 8, borderRadius: 8 },
    sectionTitle: { fontSize: sectionTitleSize, fontWeight: '700', marginBottom: 8, color: '#000' },

    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(1.2)), borderBottomWidth: 0.6, borderBottomColor: '#f1f3f5' },
    itemName: { fontSize: Math.round(clamp(rf(3.6), 12, 16)), color: '#333', flex: 1 },
    itemPrice: { width: Math.round(Math.min(140, contentMaxWidth * 0.34)), textAlign: 'right', color: '#111827', fontSize: Math.round(clamp(rf(3.6), 12, 16)) },

    metaPaid: { color: '#0b8f56', fontWeight: '700', fontSize: Math.round(clamp(rf(2.8), 11, 13)), marginTop: 6 },
    metaPending: { fontSize: Math.round(clamp(rf(2.8), 11, 13)), color: '#6b7280', marginTop: 6 },

    separator: { height: 1, backgroundColor: '#e9e9e9', marginVertical: Math.round(hp(1.2)) },

    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(0.6)) },
    label: { color: '#6b7280', fontSize: Math.round(clamp(rf(3.2), 12, 14)) },
    value: { color: '#111827', fontSize: Math.round(clamp(rf(3.2), 12, 14)) },
    bold: { fontWeight: '800' },
    boldValue: { fontWeight: '900', fontSize: Math.round(clamp(rf(4.5), 14, 20)) },

    primaryButton: { width: '100%', backgroundColor: '#0046ff', borderRadius: 10, paddingVertical: Math.round(hp(1.6)), alignItems: 'center', marginTop: Math.round(hp(2.4)) },
    primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: Math.round(clamp(rf(3.8), 13, 16)) },

    ghostButton: { width: '100%', backgroundColor: '#fff', borderRadius: 10, paddingVertical: Math.round(hp(1.2)), alignItems: 'center', marginTop: Math.round(hp(1.2)), borderWidth: 1, borderColor: '#ddd' },
    ghostButtonText: { color: '#444', fontWeight: '700', fontSize: Math.round(clamp(rf(3.6), 12, 15)) },

    itemCanceled: { textDecorationLine: 'line-through', color: '#9ca3af' },
    emptyText: { color: '#666', fontSize: Math.round(clamp(rf(3.4), 12, 14)) },
  });
}
