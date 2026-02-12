import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://api.tab-track.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY'; 

function getAuthHeaders(extra = {}) {
  const base = { 'Content-Type': 'application/json', ...extra };
  if (TOKEN && TOKEN.trim().length > 0) base['Authorization'] = `Bearer ${TOKEN}`;
  return base;
}

export default function SaleDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scale = Math.max(0.82, Math.min(1.4, width / 375));
  const s = (v) => Math.round(v * scale);

  const {
    saleId: routeSaleId = null,
    branchId: routeBranchId = null,
    restaurantId: routeRestaurantId = null,
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [branchInfo, setBranchInfo] = useState(null);
  const [branchLogo, setBranchLogo] = useState(null);

  useEffect(() => {
    if (!routeSaleId || !routeBranchId) {
      setError('Faltan parámetros de venta o sucursal.');
      setLoading(false);
      return;
    }
    fetchSplits(routeBranchId, routeSaleId);
  }, [routeSaleId, routeBranchId]);


  useEffect(() => {
    const restaurantFromData = data?.restaurante_id ?? data?.restauranteId ?? null;
    const restaurantToUse = routeRestaurantId ?? restaurantFromData;

    if (restaurantToUse && routeBranchId) {
      fetchBranchInfo(restaurantToUse, routeBranchId);
    } else {
      setBranchInfo((prev) => prev || null);
      setBranchLogo((prev) => prev || null);
    }
  }, [data, routeRestaurantId, routeBranchId]);

  const fetchSplits = async (branchId, saleId) => {
    try {
      setLoading(true);
      setError(null);
      const base = API_URL.replace(/\/$/, '');
      const url = `${base}/api/transacciones-pago/sucursal/${encodeURIComponent(branchId)}/ventas/${encodeURIComponent(saleId)}/splits`;
      const headers = getAuthHeaders();
      const res = await fetch(url, { method: 'GET', headers });
      if (!res || !res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(`Error fetching splits: ${res?.status ?? 'no-res'} ${txt || ''}`);
      }
      const json = await res.json();
      setData(json || null);
    } catch (err) {
      console.warn('fetchSplits err', err);
      setError(err.message || 'Error al obtener detalles de la venta.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchInfo = async (restaurantId, branchId) => {
    try {
      setBranchLoading(true);
      const base = API_URL.replace(/\/$/, '');
      const url = `${base}/api/restaurantes/${encodeURIComponent(restaurantId)}/sucursales`;
      const headers = getAuthHeaders();
      const res = await fetch(url, { method: 'GET', headers });
      if (!res || !res.ok) {
        const txt = await res.text().catch(() => null);
        console.warn('fetchBranchInfo failed', res?.status, txt);
        setBranchLoading(false);
        return;
      }
      const json = await res.json();

      const list =
        Array.isArray(json?.sucursales) ? json.sucursales :
        Array.isArray(json) ? json :
        Array.isArray(json?.data) ? json.data :
        null;

      let found = null;
      if (Array.isArray(list)) {
        found = list.find((s) => String(s?.id ?? s?.sucursal_id ?? s?.sucursalId) === String(branchId));
      } else {
        if (json && String(json?.id ?? json?.sucursal_id) === String(branchId)) found = json;
      }

      if (found) {
        const img = found.imagen_logo_url ?? null;
        const name = found.nombre ?? null;

        setBranchInfo((prev) => ({ ...(prev || {}), ...found, nombre: name || prev?.nombre || '' }));
        if (img) setBranchLogo(img);
      } else {
        console.warn('Sucursal no encontrada en respuesta de restaurantes', branchId, restaurantId);
      }
    } catch (err) {
      console.warn('fetchBranchInfo err', err);
    } finally {
      setBranchLoading(false);
    }
  };

  const sumArray = (arr = [], key = 'subtotal') => {
    try {
      return arr.reduce((acc, it) => acc + (Number(it?.[key] ?? it?.precio_unitario ?? 0) || 0), 0);
    } catch {
      return 0;
    }
  };

  const groupedTransactions = useMemo(() => {
    const splits = Array.isArray(data?.splits) ? data.splits : [];
    const tips = Array.isArray(data?.propinas_por_tx) ? data.propinas_por_tx : [];
    const map = new Map();

    for (const s of splits) {
      const tx = String(s?.payment_transaction_id ?? 'unknown');
      if (!map.has(tx)) map.set(tx, { txId: tx, items: [], tip: 0, payer: s?.usuario_app_id ?? null });
      map.get(tx).items.push(s);
      if (!map.get(tx).payer && s?.usuario_app_id) map.get(tx).payer = s.usuario_app_id;
    }
    for (const t of tips) {
      const tx = String(t?.payment_transaction_id ?? 'unknown');
      if (!map.has(tx)) map.set(tx, { txId: tx, items: [], tip: 0, payer: null });
      map.get(tx).tip += Number(t?.monto_propina ?? 0) || 0;
    }

    const arr = Array.from(map.values()).map((g) => {
      const firstDate = g.items && g.items.length > 0 ? new Date(g.items[0]?.fecha_pago ?? g.items[0]?.fecha_actualizacion ?? 0).getTime() : 0;
      const subtotal = sumArray(g.items, 'subtotal');
      return { ...g, firstDate, subtotal };
    });

    arr.sort((a, b) => b.firstDate - a.firstDate);
    return arr;
  }, [data]);

  const totalSubtotal = sumArray(Array.isArray(data?.splits) ? data.splits : [], 'subtotal');
  const totalTips = (Array.isArray(data?.propinas_por_tx) ? data.propinas_por_tx : []).reduce((acc, p) => acc + (Number(p?.monto_propina ?? 0) || 0), 0);

  const formatMoney = (n) => {
    const val = Number(n || 0);
    return val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderTransactionCard = ({ item }) => (
    <View style={[styles.txCard, { padding: s(12), borderRadius: s(12) }]}>
      <View style={styles.txHeader}>
        <View style={styles.txHeaderLeft}>
          <Text style={[styles.txTitle, { fontSize: s(14) }]}>{branchInfo?.nombre ?? `Sucursal ${routeBranchId ?? ''}`}</Text>

          {item.payer ? (
            <Text style={[styles.payerText, { fontSize: s(12) }]}>
              Pagó: <Text style={[styles.payerBold, { fontSize: s(12) }]}>{item.payer}</Text>
            </Text>
          ) : null}

        </View>

        <View style={styles.txHeaderRight}>
          <Text style={[styles.txAmount, { fontSize: s(16) }]}>{formatMoney(item.subtotal || 0)} MXN</Text>
        </View>
      </View>

      <View style={{ height: s(8) }} />

      {Array.isArray(item.items) && item.items.map((it, idx) => (
        <View key={idx} style={[styles.itemRow, { paddingVertical: s(6) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, { fontSize: s(14) }]}>{it?.nombre_item ?? `Item ${it?.id ?? ''}`}</Text>
            <Text style={[styles.itemSmallMeta, { fontSize: s(12) }]}>{it?.cantidad ?? '1'} × {formatMoney(it?.precio_unitario ?? it?.subtotal ?? 0)}</Text>
          </View>

          <View style={{ justifyContent: 'center' }}>
            <Text style={[styles.itemPrice, { fontSize: s(14) }]}>{formatMoney(it?.subtotal ?? it?.precio_unitario ?? 0)}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: s(10) }} />

      <View style={[styles.totalsRow, { marginTop: 0 }]}>
        <Text style={[styles.totalsLabel, { fontSize: s(13) }]}>Propina</Text>
        <Text style={[styles.totalsValue, { fontSize: s(13) }]}>{formatMoney(item.tip ?? 0)} MXN</Text>
      </View>
    </View>
  );

  const headerPaddingTop = (insets?.top || 0) + s(10);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop, paddingBottom: s(12) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconWrap}>
          <Text style={[styles.backIcon, { fontSize: s(28) }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: s(20) }]}>Detalle de venta</Text>

        <View style={{ width: s(44) }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0046ff" />
          <Text style={{ marginTop: s(10) }}>Cargando...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: '#b00', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => fetchSplits(routeBranchId, routeSaleId)} style={[styles.retryBtn, { padding: s(10), borderRadius: s(8) }]}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: s(16), paddingBottom: s(40) }}>
          <View style={[styles.topCard, { padding: s(12), borderRadius: s(12) }]}>
            <View style={{ marginRight: s(12) }}>
              {branchLogo ? (
                <Image source={{ uri: branchLogo }} style={{ width: s(72), height: s(72), borderRadius: s(10) }} resizeMode="cover" />
              ) : (
                <View style={[styles.logoPlaceholder, { width: s(72), height: s(72), borderRadius: s(10) }]}>
                  <Text style={[styles.logoInitial, { fontSize: s(20) }]}>{(branchInfo?.nombre ?? 'SUC').slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.branchName, { fontSize: s(16) }]}>{branchInfo?.nombre ?? `Sucursal ${routeBranchId ?? ''}`}</Text>

              <View style={{ marginTop: s(8) }}>
                <Text style={[styles.smallMeta, { fontSize: s(13) }]}>Pago: <Text style={[styles.boldText, { fontSize: s(13) }]}>{formatMoney(totalSubtotal)} MXN</Text></Text>
                <Text style={[styles.smallMeta, { marginTop: s(6), fontSize: s(13) }]}>Propinas: <Text style={[styles.boldText, { fontSize: s(13) }]}>{formatMoney(totalTips)} MXN</Text></Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: s(14) }}>
            <Text style={[styles.sectionTitle, { fontSize: s(15) }]}>Transacciones</Text>

            {groupedTransactions.length > 0 ? (
              <FlatList
                data={groupedTransactions}
                renderItem={renderTransactionCard}
                keyExtractor={(it) => String(it.txId ?? Math.random())}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: s(12) }} />}
              />
            ) : (
              <Text style={{ color: '#666', marginTop: s(6) }}>No hay detalles de transacciones disponibles.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backIconWrap: { width: 44, alignItems: 'flex-start' },
  backIcon: { color: '#0046ff', fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', fontWeight: '900', color: '#0046ff' },

  topCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#eef6ff',
    alignItems: 'center',
  },
  logoPlaceholder: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoInitial: { color: '#0046ff', fontWeight: '900' },
  branchName: { fontWeight: '900', color: '#111' },
  smallMeta: { color: '#444' },
  boldText: { fontWeight: '900' },

  sectionTitle: { fontWeight: '800', marginBottom: 8, color: '#111' },

  txCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eef6ff',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  txHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txHeaderLeft: { flex: 1 },
  txTitle: { fontWeight: '900', color: '#111' },
  payerText: { color: '#666', marginTop: 4 },
  payerBold: { fontWeight: '800', color: '#333' },
  txHeaderRight: { alignItems: 'flex-end' },
  txAmount: { fontWeight: '900', color: '#0b58ff' },

  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontWeight: '800', color: '#111' },
  itemSmallMeta: { color: '#777', marginTop: 4 },
  itemPrice: { fontWeight: '800', color: '#0b58ff', marginLeft: 8 },

  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  totalsLabel: { color: '#666', fontWeight: '700' },
  totalsValue: { color: '#111', fontWeight: '800' },

  retryBtn: { marginTop: 12, backgroundColor: '#0046ff', borderRadius: 8, alignItems: 'center' },
  retryText: { color: '#fff', fontWeight: '700', paddingVertical: 10, paddingHorizontal: 16 },
});
