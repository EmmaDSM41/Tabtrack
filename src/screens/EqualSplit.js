import React, { useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NDc4MTQ5MiwianRpIjoiYTFjMDUzMzUtYzI4Mi00NDY2LTllYzYtMjhlZTlkZjYxZDA2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjQ3ODE0OTIsImV4cCI6MTc2NzM3MzQ5Miwicm9sIjoiRWRpdG9yIn0.O8mIWbMyVGZ1bVv9y5KdohrTdWFtaehOFwdJhwV8RuU';
const formatMoney = (n) =>
  Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

const totalFontSizeFor = (str) => {
  const len = String(str).length;
  if (len > 18) return 10;
  if (len > 14) return 12;
  if (len > 11) return 14;
  if (len > 8) return 18;
  if (len > 6) return 22;
  return 28;
};

const parseNumberSafe = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/\s/g, '').replace(/[^0-9\.,\-]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized = s;

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) {
      normalized = s.replace(/,/g, '');
    } else {
      normalized = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    if (after === 2) normalized = s.replace(',', '.');
    else normalized = s.replace(/,/g, '');
  } else {
    const parts = s.split('.');
    if (parts.length > 2) {
      normalized = s.replace(/\./g, '');
    } else {
      normalized = s;
    }
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
};

const round2 = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

export default function EqualSplit() {
  const navigation = useNavigation();
  const route = useRoute();

  // responsive helpers
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const wp = (p) => (Number(p) / 100) * width;
  const hp = (p) => (Number(p) / 100) * height;
  const rf = (p) => {
    const size = (Number(p) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // safe paddings
  const topSafe = Math.round(Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0)));
  const bottomSafe = Math.round(insets?.bottom ?? 0);
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 36));
  const isNarrow = width < 420;

  const token = route?.params?.fromToken ?? route?.params?.token ?? null;
  const passedItems = route?.params?.items ?? null;

  const incomingSubtotalRaw = route?.params?.subtotal ?? route?.params?.sub_total ?? undefined;
  const incomingIvaRaw = route?.params?.iva ?? undefined;
  const incomingTotalRaw = route?.params?.total ?? route?.params?.total_consumo ?? undefined;

  const incomingSubtotal = parseNumberSafe(incomingSubtotalRaw);
  const incomingIva = parseNumberSafe(incomingIvaRaw);
  const incomingTotal = parseNumberSafe(incomingTotalRaw);

  const [items, setItems] = useState(passedItems ?? null);
  const [totalComensales, setTotalComensales] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleInput, setPeopleInput] = useState('');
  const [modalConfirmLoading, setModalConfirmLoading] = useState(false);

  const saleId = route?.params?.saleId ?? route?.params?.sale_id ?? route?.params?.venta_id ?? null;
  const restauranteId = route?.params?.restauranteId ?? route?.params?.restaurante_id ?? null;
  const sucursalId = route?.params?.sucursalId ?? route?.params?.sucursal_id ?? null;
  const mesaId = route?.params?.mesaId ?? route?.params?.mesa_id ?? null;
  const mesero = route?.params?.mesero ?? route?.params?.waiter ?? null;
  const moneda = route?.params?.moneda ?? 'MXN';
  const total_consumo_param = route?.params?.total ?? route?.params?.total_consumo ?? null;

  const normalizeItem = (raw, fallbackId) => {
    const name = raw?.nombre_item ?? raw?.nombre ?? raw?.name ?? '';
    const price = Number(raw?.precio_item ?? raw?.precio ?? raw?.price ?? 0) || 0;
    const qty = Number(raw?.cantidad ?? raw?.qty ?? raw?.quantity ?? 1) || 1;
    const id = raw?.id ?? raw?.codigo ?? fallbackId ?? String(Math.random()).slice(2, 9);
    return { id: String(id), name, price, qty, raw };
  };

  useEffect(() => {
    let mounted = true;

    const savedKey = saleId ? `equal_split_people_sale_${saleId}` : (token ? `equal_split_people_token_${token}` : null);

    const fetchSavedPeopleThenItems = async () => {
      let savedN = null;

      // NEW: If saleId exists, try server first to get the authoritative (global) number.
      if (saleId) {
        try {
          const base = API_BASE_URL.replace(/\/$/, '');
          const url = `${base}/api/mesas/comensales/${encodeURIComponent(saleId)}`;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
            },
          });
          if (res.ok) {
            const json = await res.json();
            const num = json?.numero_comensales ?? json?.numero_comensales ?? null;
            const parsedNum = Number(num);
            if (!Number.isNaN(parsedNum) && parsedNum > 0) {
              savedN = parsedNum;
              if (mounted) {
                setTotalComensales(parsedNum);
                setPeopleInput(String(parsedNum));
                if (savedKey) {
                  try { await AsyncStorage.setItem(savedKey, String(parsedNum)); } catch (e) { /* ignore */ }
                }
              }
            }
          }
        } catch (err) {
          // fallthrough to local fallback
          console.warn('EqualSplit: error fetching saved comensales from server (fallback to local)', err);
        }
      }

      // If we didn't get a valid number from server, try local AsyncStorage (fallback / offline)
      if (savedN == null) {
        try {
          if (savedKey) {
            const raw = await AsyncStorage.getItem(savedKey);
            if (raw) {
              const n = Number(raw);
              if (!Number.isNaN(n) && n > 0) {
                savedN = n;
                if (mounted) {
                  setTotalComensales(n);
                  setPeopleInput(String(n));
                }
              }
            }
          }
        } catch (e) {
          console.warn('EqualSplit: error reading saved people from AsyncStorage', e);
        }
      }

      // Now load items if needed (same logic as before)
      if (items && Array.isArray(items) && items.length > 0) {
        // nothing
      } else {
        if (!token) {
          if (mounted) setItems([]);
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
            console.warn('Error fetch EqualSplit HTTP', res.status);
            setLoading(false);
            return;
          }
          const json = await res.json();
          const rawItems = Array.isArray(json.items) ? json.items : (json.data?.items ?? json.result?.items ?? []);
          const mapped = (Array.isArray(rawItems ? rawItems : []) ? rawItems : []).map((it, i) => normalizeItem(it, i));
          if (mounted && (!items || items.length === 0)) setItems(mapped);
        } catch (err) {
          console.warn('EqualSplit fetch error:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      }

      setTimeout(() => {
        if (!mounted) return;
        if (savedN == null && (totalComensales === null || totalComensales === undefined)) {
          setShowPeopleModal(true);
        }
      }, 120);
    };

    fetchSavedPeopleThenItems();

    return () => { mounted = false; };
   }, [token, saleId]);

  const itemsSum = useMemo(() => {
    if (!items || !Array.isArray(items)) return 0;
    const s = items.reduce((acc, it) => acc + Number(it.price || 0), 0);
    return round2(s);
  }, [items]);

  const total = Number.isFinite(incomingTotal) ? round2(incomingTotal) : itemsSum;
  const iva = round2(total / 1.16 * 0.16);
  const subtotal = round2(total - iva);

  const incomingTipApplied = route?.params?.tipApplied ?? route?.params?.tip_applied ?? null;
  const incomingTipPercent = incomingTipApplied && Number(incomingTipApplied.percent) ? Number(incomingTipApplied.percent) : (
    route?.params?.tipPercent ?? route?.params?.tip_percent ?? 0
  );
  const tipPercent = Number(incomingTipPercent || 0);

  const tipAmount = round2(total * (tipPercent / 100));
  const totalWithTip = round2(total + tipAmount);

  const people = (typeof totalComensales === 'number' && totalComensales > 0) ? totalComensales : 1;

  const perPersonSubtotal = round2(subtotal / Math.max(1, people));
  const perPersonIva = round2(iva / Math.max(1, people));
  const perPersonBaseTotal = round2(total / Math.max(1, people));
  const perPersonTip = round2(tipAmount / Math.max(1, people));
  const perPersonTotalWithTip = round2(perPersonBaseTotal + perPersonTip);

  const perPersonStr = formatMoney(perPersonTotalWithTip);
  const totalStr = formatMoney(total);
  const totalFont = totalFontSizeFor(totalStr);

  if (loading || !items) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#f5f7fb' }}>
        <ActivityIndicator size="large" color="#0046ff" />
      </View>
    );
  }

  const payloadCommon = {
    token,
    items,
    subtotal,
    iva,
    total,
    people,
    saleId,
    sale_id: saleId,
    venta_id: saleId,
    restauranteId,
    restaurante_id: restauranteId,
    sucursalId,
    sucursal_id: sucursalId,
    mesaId,
    mesa_id: mesaId,
    mesero,
    waiter: mesero,
    moneda,
    total_comensales: totalComensales,
    total_consumo: total_consumo_param ?? total,
    tipApplied: tipPercent > 0 ? { percent: tipPercent, tipAmount } : null,
  };

  const goToPropina = () => {
    navigation.navigate('Propina', {
      ...payloadCommon,
      subtotal,
      iva,
      total,
      items,
      people,
      returnScreen: 'EqualSplit',
      tipApplied: payloadCommon.tipApplied,
    });
  };

  const handlePay = () => {
    const itemsToPay = (items || []).map((it) => {
      const line = Number(it.lineTotal || it.price || 0);
      if (it.canceled) return null;
      if (it.paid) return null;
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

     const totalToCharge = itemsToPay.reduce((s, it) => s + Number(it.lineTotal || 0), 0);
    const ivaToCharge = +(totalToCharge / 1.16 * 0.16).toFixed(2);
    const subtotalToCharge = +(totalToCharge - ivaToCharge).toFixed(2);


    const payPayload = {
      ...payloadCommon,
       subtotal: perPersonSubtotal,
      iva: perPersonIva,
      tipAmount: perPersonTip,
      tipPercent: tipPercent,
      total: perPersonBaseTotal,
      totalWithTip: perPersonTotalWithTip,
      perPersonAmount: perPersonTotalWithTip,
      per_person_amount: perPersonTotalWithTip,
      total_persona: perPersonTotalWithTip,
      people,
      groupPeople: totalComensales,
       items: itemsToPay,
      originalItems: items,
    };

     console.log('EqualSplit -> navegando a Payment con payPayload:', JSON.stringify(payPayload, null, 2));
    navigation.navigate('Payment', payPayload);
  };

  const hasTipApplied = tipPercent > 0;

  const savedKey = saleId ? `equal_split_people_sale_${saleId}` : (token ? `equal_split_people_token_${token}` : null);

  const postComensalesToServer = async (idVenta, numero) => {
    try {
      if (!idVenta) {
        return { ok: false, message: 'saleId no disponible' };
      }
      const base = API_BASE_URL.replace(/\/$/, '');
      const url = `${base}/api/mesas/comensales`;
      const body = { id_venta: idVenta, numero_comensales: Number(numero) };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
        },
        body: JSON.stringify(body),
      });
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }
      if (!res.ok) {
        const msg = json && (json.error || json.message) ? (json.error || json.message) : `HTTP ${res.status}`;
        return { ok: false, message: msg, raw: json };
      }
      return { ok: true, raw: json };
    } catch (err) {
      console.warn('postComensalesToServer error', err);
      return { ok: false, message: String(err) };
    }
  };

  const handleConfirmPeople = async () => {
    const n = Number(peopleInput);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      Alert.alert('Valor inválido', 'Por favor ingresa un número entero mayor a 0.');
      return;
    }

    setModalConfirmLoading(true);

    try {
      let serverOk = false;
      let serverResult = null;

      if (saleId) {
        const result = await postComensalesToServer(saleId, n);
        serverResult = result;
        if (result.ok) serverOk = true;
        else {
          console.warn('EqualSplit: no se pudo guardar comensales en servidor:', result);
        }
      } else {
        console.warn('EqualSplit: saleId no disponible; no se intentará POST a /api/mesas/comensales');
      }

      try {
        if (savedKey) {
          await AsyncStorage.setItem(savedKey, String(n));
        }
      } catch (e) {
        console.warn('Error saving equal split people to AsyncStorage', e);
      }

      setTotalComensales(n);
      setShowPeopleModal(false);

      if (serverOk) {
        // success
      } else {
        if (saleId) {
          Alert.alert(
            'Guardado localmente',
            'El número de comensales se guardó localmente pero no se pudo guardar en el servidor. Intenta de nuevo más tarde.'
          );
        }
      }
    } catch (e) {
      console.warn('handleConfirmPeople error', e);
      Alert.alert('Error', 'Ocurrió un error al guardar el número de comensales.');
    } finally {
      setModalConfirmLoading(false);
    }
  };

  const handleCancelPeople = () => {
    setShowPeopleModal(false);
    setTotalComensales(1);
  };

  const headerGradientPaddingH = Math.round(sidePad);
  const contentWidth = Math.round(Math.min(width - Math.round(wp(8)), 720));
  const modalWidth = Math.round(Math.min(width - 48, 360));
  const logoSize = Math.round(clamp(rf(12), 64, 140));

  const styles = useMemo(() => makeStyles({ wp, hp, rf, clamp, width, height, contentWidth, modalWidth, logoSize, sidePad, isNarrow }), [wp, hp, rf, clamp, width, height, contentWidth, modalWidth, logoSize, sidePad, isNarrow]);

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { paddingHorizontal: sidePad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Partes iguales</Text>
        <View style={{ width: Math.round(wp(12)) }} />
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.round(hp(3) + bottomSafe), flexGrow: 1 }]}>
         <LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{x:0,y:1}} end={{x:1,y:0}} locations={[0,0.45,1]} style={[styles.headerGradient, { paddingHorizontal: headerGradientPaddingH }]}>
           <View style={[styles.gradientRow, { flexDirection: 'row' }]}>
            <View style={[styles.leftCol, { flex: 0, maxWidth: Math.round(Math.min(logoSize + wp(6), wp(40))) }]}>
              <Image source={require('../../assets/images/logo2.png')} style={[styles.tabtrackLogo, { width: logoSize, height: Math.round(logoSize * 0.4) }]} resizeMode="contain" />
              <View style={styles.logoWrap}>
                <Image source={require('../../assets/images/restaurante.jpeg')} style={styles.restaurantImage} />
              </View>
            </View>


            <View style={[styles.rightCol, isNarrow ? { alignItems: 'flex-start', marginLeft: Math.round(wp(42)) } : { marginLeft: Math.round(wp(30)) }]}>
              <Text style={styles.totalLabel}>Total</Text>

              <View style={styles.totalRow}>
                <Text style={[styles.totalNumber, { fontSize: totalFont }]} numberOfLines={1} ellipsizeMode="clip">
                  {totalStr}
                </Text>
                <Text style={styles.totalCurrency}> MXN</Text>
              </View>

              <View style={styles.rightThanks}>
                <Text style={styles.thanksText}>Se divide entre</Text>

                {/* Aquí agregué el lapicito para editar el número de personas */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.thanksSub}>{people} {people === 1 ? 'persona' : 'personas'}</Text>

                  <TouchableOpacity
                    onPress={() => {
                      // abrir modal pre-llenado para editar
                      const curr = totalComensales ?? people;
                      setPeopleInput(String(curr));
                      setShowPeopleModal(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginLeft: 8 }}
                  >
                    <Text style={{ fontSize: Math.round(clamp(rf(3.4), 14, 18)), color: 'rgba(255,255,255,0.95)' }}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.content, { width: contentWidth }]}>
          <Text style={{ fontSize: Math.round(clamp(rf(7.2), 20, 28)), fontWeight:'700', marginBottom: Math.round(hp(1)), color: '#000' }}>Resumen</Text>

          {items.length === 0 ? (
            <View style={{ padding:18, alignItems:'center' }}>
              <Text style={{ color:'#666' }}>No hay productos en la cuenta.</Text>
            </View>
          ) : (
            items.map((it, idx) => (
              <View key={it.id ?? idx} style={styles.itemRow}>
                <Text style={styles.itemName}>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</Text>
                <Text style={styles.itemPrice}>{formatMoney(Number(it.price || 0))} MXN</Text>
              </View>
            ))
          )}

          <View style={styles.separator} />

          <View style={styles.totalsRow}>
            <Text style={styles.totLabel}>Sub total</Text>
            <Text style={styles.totValue}>{formatMoney(subtotal)} MXN</Text>
          </View>

          <View style={styles.totalsRow}>
            <Text style={styles.totLabel}>IVA (estimado)</Text>
            <Text style={styles.totValue}>{formatMoney(iva)} MXN</Text>
          </View>

          <View style={[styles.totalsRow, { marginTop: Math.round(hp(0.6)) }]}>
            <Text style={[styles.totLabel, { fontWeight: '800' }]}>Total</Text>
            <Text style={[styles.totValue, { fontWeight: '900', fontSize: Math.round(clamp(rf(5.2), 16, 22)) }]}>{formatMoney(total)} MXN</Text>
          </View>

          <View style={[styles.totalsRow, { marginTop: Math.round(hp(0.6)) }]}>
            <Text style={styles.totLabel}>Propina</Text>
            <Text style={styles.totValue}>{formatMoney(tipAmount)} MXN</Text>
          </View>

          <View style={[styles.totalsRow, { marginTop: Math.round(hp(0.4)) }]}>
            <Text style={[styles.totLabel, { fontWeight:'800' }]}>Total con propina</Text>
            <Text style={[styles.totValue, { fontWeight:'900', fontSize: Math.round(clamp(rf(4.6), 14, 20)) }]}>{formatMoney(totalWithTip)} MXN</Text>
          </View>

          <View style={[styles.totalsRow, { marginTop: Math.round(hp(0.8)), backgroundColor: '#fff', paddingVertical: Math.round(hp(1)) }]}>
            <Text style={[styles.totLabel, { fontSize: Math.round(clamp(rf(4.4), 14, 18)) }]}>A pagar por persona</Text>
            <Text style={[styles.totValue, { fontSize: Math.round(clamp(rf(4.8), 16, 20)), fontWeight: '900' }]}>{perPersonStr} MXN</Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={goToPropina}
            activeOpacity={0.9}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.secondaryButtonText}>{hasTipApplied ? 'Añadir/editar propina' : 'Añadir propina'}</Text>
          </TouchableOpacity>

          <View style={styles.buttonsWrap}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePay}
              activeOpacity={0.9}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.primaryButtonText}>Pagar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.navigate('Escanear', { token })} activeOpacity={0.9} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.ghostButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showPeopleModal} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width: modalWidth, backgroundColor:'#fff', borderRadius:12, padding: Math.round(sidePad) }}>
            <Text style={{ fontSize: Math.round(clamp(rf(4.6), 16, 20)), fontWeight:'800', color:'#000', marginBottom: Math.round(hp(0.6)) }}>¿Entre cuántas personas?</Text>
            <Text style={{ color:'#444', marginBottom: Math.round(hp(1)) }}>Ingresa el número de personas para dividir la cuenta. Esto se guardará para esta cuenta y no se volverá a preguntar.</Text>

            <TextInput
              keyboardType="number-pad"
              value={peopleInput}
              onChangeText={t => setPeopleInput(t.replace(/[^0-9]/g,''))}
              placeholder="Ej. 3"
              style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding: Math.round(wp(3)),color:'#000', marginBottom: Math.round(hp(1)), fontSize: Math.round(clamp(rf(4), 14, 18)) }}
              editable={!modalConfirmLoading}
            />

            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <TouchableOpacity onPress={handleCancelPeople} disabled={modalConfirmLoading} style={{ flex:1, marginRight:8, paddingVertical: Math.round(hp(1.4)), borderRadius:8, backgroundColor:'#f3f4f6', alignItems:'center' }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color:'#374151', fontWeight:'700' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleConfirmPeople} disabled={modalConfirmLoading} style={{ flex:1, marginLeft:8, paddingVertical: Math.round(hp(1.4)), borderRadius:8, backgroundColor: modalConfirmLoading ? '#9bb3ff' : '#0046ff', alignItems:'center' }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {modalConfirmLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800' }}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles({ wp, hp, rf, clamp, width, height, contentWidth, modalWidth, logoSize, sidePad, isNarrow }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f7fb' },
    topBar: {
      width: '100%',
      height: Math.round(hp(9.6)),
      paddingHorizontal: Math.round(sidePad || wp(3.5)),
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      paddingTop: 0, // topSafe aplicado en SafeAreaView
    },
    backBtn: { width: Math.round(Math.max(44, wp(12))), alignItems: 'flex-start', justifyContent: 'center' },
    backArrow: { fontSize: Math.round(clamp(rf(6.6), 22, 36)), color: '#0b58ff', marginLeft: 2 },
    title: { fontSize: Math.round(clamp(rf(4.2), 14, 18)), fontWeight: '800', color: '#0b58ff' },

    container: { alignItems: 'center', paddingBottom: Math.round(hp(3)) },

    headerGradient: {
      width: '100%',
      paddingTop: Math.round(hp(2)),
      paddingBottom: Math.round(hp(3.2)),
      borderBottomRightRadius: Math.round(wp(10)),
      overflow: 'hidden',
    },

    gradientRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },

    leftCol: { flexDirection: 'column', alignItems: 'flex-start' },
    tabtrackLogo: { marginBottom: Math.round(hp(0.6)) },
    logoWrap: { marginTop: Math.round(hp(0.8)), backgroundColor: 'rgba(255,255,255,0.12)', padding: Math.round(wp(2)), borderRadius: Math.round(wp(2)) },
    restaurantImage: { width: Math.round(clamp(wp(14), 48, 96)), height: Math.round(clamp(wp(14), 48, 96)), borderRadius: Math.round(clamp(wp(14), 48, 96) / 8), backgroundColor: '#fff' },

    rightCol: {
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      paddingTop: Math.round(hp(0.6)),
      marginRight: Math.round(wp(2)),
      minWidth: Math.round(wp(24)),
    },
    totalLabel: { color: 'rgba(255,255,255,0.95)', fontSize: Math.round(clamp(rf(3.6), 12, 16)), marginBottom: Math.round(hp(0.4)) },
    totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' },
    totalNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.6, lineHeight: Math.round(clamp(rf(7), 24, 36)), minWidth: 0, flexShrink: 1, textAlign: 'right' },
    totalCurrency: { color: '#fff', fontSize: Math.round(clamp(rf(3.6), 12, 16)), marginLeft: Math.round(wp(2)), marginBottom: 0, opacity: 0.95 },

    rightThanks: { marginTop: Math.round(hp(1)), alignItems: 'flex-end' },
    thanksText: { color: '#fff', fontWeight: '700', fontSize: Math.round(clamp(rf(3.8), 12, 16)) },
    thanksSub: { color: 'rgba(255,255,255,0.95)', fontSize: Math.round(clamp(rf(3.2), 10, 14)), marginTop: Math.round(hp(0.6)), textAlign: 'right' },

    content: { width: contentWidth || Math.round(Math.min(width - Math.round(wp(8)), 720)), backgroundColor: '#fff', padding: Math.round(wp(4)), marginTop: 0 },

    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(1)), borderBottomWidth: 0.6, borderBottomColor: '#f1f3f5' },
    itemName: { fontSize: Math.round(clamp(rf(3.8), 13, 16)), color: '#333', flex: 1 },
    itemPrice: { width: Math.round(Math.min(140, wp(36))), textAlign: 'right', color: '#111', fontSize: Math.round(clamp(rf(3.8), 12, 16)) },

    separator: { height: 1, backgroundColor: '#e9e9e9', marginVertical: Math.round(hp(1)) },

    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(0.6)) },
    totLabel: { color: '#6b7280', fontSize: Math.round(clamp(rf(3.6), 12, 16)) },
    totValue: { color: '#111827', fontSize: Math.round(clamp(rf(3.8), 13, 18)) },

    secondaryButton: { width: '100%', backgroundColor: '#fff', borderRadius: Math.round(wp(2)), paddingVertical: Math.round(hp(1.2)), alignItems: 'center', marginTop: Math.round(hp(1)), borderWidth: 1.2, borderColor: '#0046ff' },
    secondaryButtonText: { color: '#0046ff', fontWeight: '800', fontSize: Math.round(clamp(rf(3.8), 14, 18)) },

    buttonsWrap: { width: '100%', marginTop: Math.round(hp(1.4)), alignItems: 'center' },
    primaryButton: { width: '100%', backgroundColor: '#0046ff', borderRadius: Math.round(wp(2)), paddingVertical: Math.round(hp(1.6)), alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: Math.round(clamp(rf(4.0), 14, 18)) },

    ghostButton: { width: '100%', backgroundColor: '#fff', borderRadius: Math.round(wp(2)), paddingVertical: Math.round(hp(1.2)), alignItems: 'center', marginTop: Math.round(hp(1)), borderWidth: 1, borderColor: '#ddd' },
    ghostButtonText: { color: '#444', fontWeight: '700', fontSize: Math.round(clamp(rf(3.6), 13, 16)) },

    emptyBox: { padding: Math.round(hp(2)), alignItems: 'center' },
    emptyText: { color: '#666' },
  });
}
