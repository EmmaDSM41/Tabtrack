import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY'; 

const VISITS_STORAGE_KEY = 'user_visits';
const PENDING_VISITS_KEY = 'pending_visits';

const PENDING_POLL_INTERVAL_MS = 8000; 

const formatMoney = (n, currency = 'MXN') =>
  Number.isFinite(n) ? `${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00';

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function useResponsive() {
  const { width, height } = useWindowDimensions();
  const wp = (percent) => Math.round(((Number(percent) || 0) / 100) * width);
  const hp = (percent) => Math.round(((Number(percent) || 0) / 100) * height);
  const rf = (percent) => Math.round(((Number(percent) || 0) / 100) * width);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  return { width, height, wp, hp, rf, clamp };
}


async function saveVisitToStorage(visit) {
  try {
    if (!visit) return false;
    const normalized = {
      id: visit.id ?? visit.sale_id ?? `visit_${Date.now()}`,
      sale_id: visit.sale_id ?? null,
      restaurantName: visit.restaurantName ?? visit.name ?? visit.restaurante ?? visit.restaurant ?? 'Restaurante',
      restaurantImage: visit.restaurantImage ?? visit.restaurantImageUri ?? null,
      mesa: visit.mesa ?? visit.mesa_id ?? null,
      fecha: visit.fecha ?? new Date().toISOString(),
      total: Number(visit.total ?? visit.amount ?? 0) || 0,
      moneda: visit.moneda ?? visit.currency ?? 'MXN',
      items: Array.isArray(visit.items) ? visit.items : [],
      restaurante_id: visit.restaurante_id ?? null,
      sucursal_id: visit.sucursal_id ?? null,
      monto_propina: Number(visit.monto_propina ?? visit.propina ?? visit.tip ?? 0) || 0,
      propina: Number(visit.propina ?? visit.monto_propina ?? 0) || 0,
    };

    const raw = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) || []) : [];
    const existingIndex = arr.findIndex(a =>
      (normalized.sale_id && a.sale_id && String(a.sale_id) === String(normalized.sale_id)) ||
      a.id === normalized.id
    );
    if (existingIndex >= 0) arr.splice(existingIndex, 1);
    arr.unshift(normalized);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(arr.slice(0, 50)));
    // borrar pending relacionado si existe
    try {
      if (normalized.sale_id) {
        const rawPend = await AsyncStorage.getItem(PENDING_VISITS_KEY);
        let pend = rawPend ? (JSON.parse(rawPend) || []) : [];
        pend = pend.filter(p => String(p.sale_id) !== String(normalized.sale_id));
        await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(pend));
        try { await AsyncStorage.removeItem(`pending_payment_${String(normalized.sale_id)}`); } catch (e) {}
      }
    } catch (e) {}
    return true;
  } catch (err) {
    console.warn('saveVisitToStorage error', err);
    return false;
  }
}

async function savePendingVisit(visit) {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    const arr = raw ? (JSON.parse(raw) || []) : [];
    const idKey = visit.sale_id ? String(visit.sale_id) : visit.id ? String(visit.id) : null;
    let filtered = arr;
    if (idKey) filtered = arr.filter(a => String(a.sale_id || a.id || '') !== idKey);
    filtered.unshift(visit);
    await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.warn('savePendingVisit error', e);
    return false;
  }
}

async function readLocalPaidIds(sale) {
  try {
    const localKey = `local_paid_items_${sale}`;
    const raw = await AsyncStorage.getItem(localKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.map(String));
    if (parsed && Array.isArray(parsed.ids)) return new Set(parsed.ids.map(String));
    return new Set();
  } catch (e) {
    console.warn('readLocalPaidIds error', e);
    return new Set();
  }
}
async function mergePersistLocalPaidIds(sale, ids) {
  try {
    const localKey = `local_paid_items_${sale}`;
    const existingRaw = await AsyncStorage.getItem(localKey);
    let existingArr = [];
    if (existingRaw) {
      try {
        const p = JSON.parse(existingRaw);
        if (Array.isArray(p)) existingArr = p;
        else if (p && Array.isArray(p.ids)) existingArr = p.ids;
      } catch (e) { existingArr = []; }
    }
    const set = new Set([...(existingArr || []).map(String), ...(Array.isArray(ids) ? ids.map(String) : [])]);
    await AsyncStorage.setItem(localKey, JSON.stringify(Array.from(set)));
    return true;
  } catch (e) {
    console.warn('mergePersistLocalPaidIds error', e);
    return false;
  }
}

function looksClosedOrPaidFlag(v) {
  if (!v && v !== 0) return false;
  try {
    const s = String(v).toUpperCase();
    return s.includes('CLOS') || s.includes('CERR') || s.includes('CLOSE') || s.includes('CLOSED') ||
           s.includes('PAG') || s.includes('PAID') || s.includes('COMPLET') || s.includes('FINAL');
  } catch (e) { return false; }
}

export default function Escanear() {
  const navigation = useNavigation();
  const route = useRoute();
  const token = route?.params?.token ?? null;

  const { width, height, wp, hp, rf, clamp } = useResponsive();
  const insets = useSafeAreaInsets();

  // safe paddings (usar insets correctamente para iOS/Android)
  const topSafe = Math.round(Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0)));
  const bottomSafe = Math.round(insets?.bottom ?? 0);
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 36));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [originalTotalConsumo, setOriginalTotalConsumo] = useState(0);
  const [totalConsumo, setTotalConsumo] = useState(0);
  const [saleId, setSaleId] = useState(null);
  const [totalComensales, setTotalComensales] = useState(null);
  const [fechaApertura, setFechaApertura] = useState(null);
  const [fechaCierre, setFechaCierre] = useState(null);
  const [mesaId, setMesaId] = useState(null);
  const [mesero, setMesero] = useState(null);
  const [moneda, setMoneda] = useState('MXN');
  const [restauranteId, setRestauranteId] = useState(null);
  const [sucursalId, setSucursalId] = useState(null);
  const [restaurantImageUri, setRestaurantImageUri] = useState(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const [equalsSplitPaid, setEqualsSplitPaid] = useState(false);

  const [styledAlertVisible, setStyledAlertVisible] = useState(false);
  const [styledAlertTitle, setStyledAlertTitle] = useState('');
  const [styledAlertMessage, setStyledAlertMessage] = useState('');

  // Nuevo modal blanco para alertas de conflicto
  const [conflictAlertVisible, setConflictAlertVisible] = useState(false);
  const [conflictAlertTitle, setConflictAlertTitle] = useState('');
  const [conflictAlertMessage, setConflictAlertMessage] = useState('');

  const showStyledAlert = (t, m) => { setStyledAlertTitle(t || 'Aviso'); setStyledAlertMessage(m || ''); setStyledAlertVisible(true); };
  const hideStyledAlert = () => setStyledAlertVisible(false);

  const showConflictAlert = (t, m) => { setConflictAlertTitle(t || 'Aviso'); setConflictAlertMessage(m || ''); setConflictAlertVisible(true); };
  const hideConflictAlert = () => setConflictAlertVisible(false);

  const openErrorModal = (m) => { setErrorModalMessage(m || 'Ocurrió un error'); setErrorModalVisible(true); };
  const closeErrorModal = () => setErrorModalVisible(false);

  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  
  const [discountAmount, setDiscountAmount] = useState(0);

  const checkPendingPromotions = useCallback(async (log = false) => {
    try {
      const rawPend = await AsyncStorage.getItem(PENDING_VISITS_KEY);
      const pend = rawPend ? (JSON.parse(rawPend) || []) : [];
      if (!Array.isArray(pend) || pend.length === 0) { if (log) console.log('checkPendingPromotions: no pendings'); return; }

      const keep = [];
      for (const p of pend) {
        try {
          const sale = p.sale_id ?? null;
          const rest = p.restaurante_id ?? null;
          const suc = p.sucursal_id ?? null;
          const totalPending = safeNum(p.total ?? p.amount ?? 0);
          if (!sale || !rest || !suc) { keep.push(p); continue; }

          const splitsBySaleUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/transacciones-pago/sucursal/${encodeURIComponent(String(suc))}/ventas/${encodeURIComponent(String(sale))}/splits`;
          try {
            const sr = await fetch(splitsBySaleUrl, {
              method: 'GET',
              headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: API_AUTH_TOKEN ? `Bearer ${API_AUTH_TOKEN}` : undefined },
            });
            if (!sr || !sr.ok) { keep.push(p); continue; }
            const sjson = await sr.json();
            const splitsArr = Array.isArray(sjson.splits) ? sjson.splits : [];
            const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
            if (paidSplits.length > 0) {
              const visitToSave = {
                sale_id: sale,
                restaurante_id: rest,
                sucursal_id: suc,
                restaurantName: p.restaurantName ?? p.restaurant ?? null,
                restaurantImage: p.restaurantImage ?? null,
                mesa: p.mesa ?? null,
                fecha: paidSplits[0].fecha_pago ?? new Date().toISOString(),
                total: totalPending || 0,
                moneda: p.moneda ?? 'MXN',
                items: p.items ?? [],
                monto_propina: Number(p.monto_propina ?? 0) || 0,
                propina: Number(p.propina ?? 0) || 0,
              };
              await saveVisitToStorage(visitToSave);
              try { await AsyncStorage.removeItem(`pending_payment_${String(sale)}`); } catch(e) {}
              continue;
            } else {
              keep.push(p);
            }
          } catch (e) {
            if (log) console.warn('checkPendingPromotions: error fetching splits', e);
            keep.push(p);
          }
        } catch (inner) {
          console.warn('checkPendingPromotions inner error', inner);
          keep.push(p);
        }
      }
      try { await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(keep)); } catch (e) { console.warn('error saving pendings', e); }
    } catch (err) { console.warn('checkPendingPromotions error', err); }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => { if (!mounted) return; try { await checkPendingPromotions(true); } catch (e) {} })();
    const id = setInterval(() => { if (!mounted) return; checkPendingPromotions(false).catch(() => {}); }, PENDING_POLL_INTERVAL_MS);
    return () => { mounted = false; clearInterval(id); };
  }, [checkPendingPromotions]);

  const buildPendingPaymentObj = (saleKey, itemsArr, amount) => {
    try {
      const idsSet = new Set();
      if (Array.isArray(itemsArr)) {
        itemsArr.forEach(it => {
          if (!it) return;
          const raw = it.raw ?? {};
          const candidates = [
            it.id,
            it.original_line_id,
            raw.id,
            raw.item_id,
            raw.codigo,
            raw.codigo_item,
            raw.line_id,
            raw.code,
            raw.sku,
            (raw.name || '').toLowerCase(),
            (it.name || '').toLowerCase(),
          ].filter(Boolean).map(String);
          candidates.forEach(c => idsSet.add(String(c)));
        });
      }
      return { ids: Array.from(idsSet), amount: Number(amount || 0) || 0, created_at: new Date().toISOString(), sale: saleKey };
    } catch (e) {
      return { ids: [], amount: Number(amount || 0) || 0, created_at: new Date().toISOString(), sale: saleKey };
    }
  };

  const fetchConsumo = useCallback(async (opts = { showLoading: true }) => {
    if (!token) { openErrorModal('Token no encontrado. Vuelve a escanear.'); if (isMountedRef.current) setLoading(false); return; }
    if (opts.showLoading && isMountedRef.current) setLoading(true);

    try {
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/mesas/r/${encodeURIComponent(token)}`;
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: API_AUTH_TOKEN ? `Bearer ${API_AUTH_TOKEN}` : undefined }}); 
      if (!isMountedRef.current) return;
      if (!res.ok) { openErrorModal(`No se pudo obtener el consumo (HTTP ${res.status}).`); if (isMountedRef.current) setLoading(false); return; }

      const json = await res.json();

      if (isMountedRef.current) {
        setMesaId(json.mesa_id ?? json.mesa ?? null);
        setMesero(json.mesero ?? json.cajero ?? null);
        setMoneda(json.moneda ?? 'MXN');
        setRestauranteId(json.restaurante_id ?? json.restaurante ?? null);
        setSucursalId(json.sucursal_id ?? json.sucursal ?? null);
        setSaleId(json.sale_id ?? json.venta_id ?? json.id ?? null);
        setTotalComensales(safeNum(json.total_comensales ?? 0));
        setFechaApertura(json.fecha_apertura ?? null);
        setFechaCierre(json.fecha_cierre ?? null);
      }

      const possibleImage = json.imagen_banner_url ?? json.imagen_url ?? json.imagen ?? json.image_url ?? json.image ?? null;
      if (possibleImage && String(possibleImage).trim()) setRestaurantImageUri(String(possibleImage).trim());
      else setRestaurantImageUri(null);

      const rawItems = Array.isArray(json.items) ? json.items : [];

      // --- NUEVA LÓGICA: detectar si precio_item es precio UNITARIO o TOTAL DE LÍNEA ---
      const reportedTotalFromJson = safeNum(json.total_consumo ?? json.total ?? json.totales_venta?.total_neto ?? json.totales_venta?.total_neto ?? 0);
      const sumPrecioFieldNoQty = rawItems.reduce((s, it) => {
        return s + safeNum(it.precio_item ?? it.precio ?? it.price ?? it.precio_unitario ?? 0);
      }, 0);

      // Si reportedTotal está presente y coincide (aprox.) con la suma de los campos precio_item **sin** multiplicar por cantidad,
      // entonces asumimos que esos campos representan el TOTAL de la línea (y por tanto hay que dividir entre cantidad).
      const EPS = 0.5; // tolerancia en MXN (pequeña)
      const precioItemRepresentaTotalDeLinea = (reportedTotalFromJson > 0) && (Math.abs(sumPrecioFieldNoQty - reportedTotalFromJson) <= EPS);

      const expandedItems = [];
      rawItems.forEach((it, idx) => {
        const rawQty = Math.max(1, safeNum(it.cantidad ?? it.qty ?? 1));
        const rawPrecioField = safeNum(it.precio_item ?? it.precio ?? it.price ?? it.precio_unitario ?? 0);

        // si detectamos que precio_item = total de la línea -> dividir entre cantidad
        let unitPrice;
        if (rawQty > 1 && precioItemRepresentaTotalDeLinea && rawPrecioField !== 0) {
          unitPrice = +(rawPrecioField / rawQty).toFixed(2);
        } else {
          // caso por defecto: precio_field es precio unitario (o qty==1), usarlo directamente
          unitPrice = +Number(rawPrecioField || 0).toFixed(2);
        }

        const originalId = it.codigo_item ?? it.codigo ?? it.id ?? it.item_id ?? `item-${idx}`;
        for (let k = 0; k < rawQty; k++) {
          const unitId = `${String(originalId)}#${idx}#${k+1}`;
          expandedItems.push({
            id: String(unitId),
            name: it.nombre_item ?? it.nombre ?? it.name ?? `Item ${idx+1}`,
            qty: 1,
            unitPrice: unitPrice,
            lineTotal: unitPrice,
            canceled: !!it.canceled || !!it.cancelado,
            raw: it,
            original_line_id: String(originalId),
            codigo_item: String(it.codigo_item ?? it.codigo ?? '').trim(),
          });
        }
      });

      // reportedTotal: preferimos el total mandado por el servidor si está disponible, sino sumamos
      const reportedTotal = safeNum(json.total_consumo ?? json.total ?? 0);
      const computedTotal = reportedTotal > 0 ? reportedTotal : expandedItems.reduce((s,x)=> s + safeNum(x.lineTotal), 0);
      if (isMountedRef.current) setOriginalTotalConsumo(+computedTotal.toFixed(2));

      const neutralItems = expandedItems.map(it => ({ ...it, paid: false, paidPartial: false, paidAmount: 0 }));
      if (isMountedRef.current) { setItems(neutralItems); setTotalConsumo(+computedTotal.toFixed(2)); }


      try {
        const montoDesc = safeNum(json?.descuentos_venta?.monto_total ?? json?.totales_venta?.total_descuentos ?? 0);
        if (isMountedRef.current) setDiscountAmount(+montoDesc.toFixed(2));
      } catch (e) {
        if (isMountedRef.current) setDiscountAmount(0);
      }

      const sale = json.sale_id ?? json.venta_id ?? json.id ?? null;
      const suc = json.sucursal_id ?? json.sucursal ?? null;

      if (!sale) {
        if (isMountedRef.current) setLoading(false);
        return;
      }

      let eqPreviously = false;
      try {
        const eqKey = `equal_split_paid_${String(sale)}`;
        const eqRaw = await AsyncStorage.getItem(eqKey);
        if (eqRaw === '1') {
          eqPreviously = true;
          if (isMountedRef.current) {
            setEqualsSplitPaid(true);
            setItems(neutralItems);
            setTotalConsumo(+computedTotal.toFixed(2));
          }
        }
      } catch (e) { console.warn('Error reading equal_split_paid flag', e); }

      let localPaidSet = new Set();
      try { localPaidSet = await readLocalPaidIds(sale); } catch (e) { localPaidSet = new Set(); }

      if (!eqPreviously) {
        try {
          const allocatedFromLocal = expandedItems.map(it => ({ ...it, paid: false, paidPartial: false, paidAmount: 0 }));
          if (localPaidSet && localPaidSet.size > 0) {
            for (let ui=0; ui<allocatedFromLocal.length; ui++) {
              const e = allocatedFromLocal[ui];
              const raw = e.raw ?? {};
              const candidates = [
                e.id,
                e.original_line_id,
                raw.id,
                raw.item_id,
                raw.codigo,
                raw.codigo_item,
                raw.line_id,
                raw.code,
                raw.sku,
                (raw.name || '').toLowerCase(),
                (e.name || '').toLowerCase(),
              ].filter(Boolean).map(String);
              if (candidates.some(c => localPaidSet.has(String(c)))) {
                const price = safeNum(e.lineTotal || e.unitPrice || 0);
                allocatedFromLocal[ui].paidAmount = +price.toFixed(2);
                allocatedFromLocal[ui].paid = price > 0;
                allocatedFromLocal[ui].paidPartial = false;
              }
            }
          }
          const paidSumLocal = allocatedFromLocal.reduce((s,it) => s + safeNum(it.paidAmount || 0), 0);
          const outstandingLocal = +(computedTotal - paidSumLocal).toFixed(2);
          if (isMountedRef.current) { setItems(allocatedFromLocal); setTotalConsumo(outstandingLocal >=0 ? outstandingLocal : 0); }
        } catch (e) { console.warn('Error applying local paid set', e); }
      }

      try {
        const txKey = `last_transaction_${sale}`;
        const rawTx = await AsyncStorage.getItem(txKey);
        let splitsHandled = false;

        if (rawTx) {
          const tx = String(rawTx).trim();
          if (tx) {
            const splitsUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/transacciones-pago/${encodeURIComponent(tx)}/splits`;
            try {
              const splitsRes = await fetch(splitsUrl, {
                method: 'GET',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: API_AUTH_TOKEN ? `Bearer ${API_AUTH_TOKEN}` : undefined },
              });
              if (splitsRes && splitsRes.ok) {
                const splitsJson = await splitsRes.json();
                const splitsArr = Array.isArray(splitsJson.splits) ? splitsJson.splits : [];
                const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
                if (paidSplits.length > 0) {
                  splitsHandled = true;

                  const hasEqualSplitPaid = paidSplits.some(s => {
                    const code = String(s.codigo_item ?? '').trim();
                    const name = String(s.nombre_item ?? s.nombre ?? '').toLowerCase();
                    return code === '1' || /partes iguales|pago por partes iguales|pago por partes/i.test(name);
                  });

                  if (hasEqualSplitPaid) {
                    try { await AsyncStorage.setItem(`equal_split_paid_${String(sale)}`, '1'); } catch(e) {}
                    if (isMountedRef.current) { setEqualsSplitPaid(true); setItems(neutralItems); setTotalConsumo(+computedTotal.toFixed(2)); }
                    const paidCodesRaw = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
                    const paidCodesFiltered = paidCodesRaw.filter(c => c !== '1');
                    if (paidCodesFiltered.length > 0) {
                      await mergePersistLocalPaidIds(sale, paidCodesFiltered);
                    }
                  } else {
                    const paidCodes = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
                    const paidSet = new Set(paidCodes.map(String));
                    const allocated = expandedItems.map(it => ({ ...it, paid: false, paidPartial: false, paidAmount: 0 }));
                    for (let ui=0; ui<allocated.length; ui++) {
                      const e = allocated[ui];
                      const raw = e.raw ?? {};
                      const candidates = [
                        e.id,
                        e.original_line_id,
                        raw.id,
                        raw.item_id,
                        raw.codigo,
                        raw.codigo_item,
                        raw.line_id,
                        raw.code,
                        raw.sku,
                        (raw.name || '').toLowerCase(),
                        (e.name || '').toLowerCase(),
                      ].filter(Boolean).map(String);
                      if (candidates.some(c => paidSet.has(String(c)))) {
                        const price = safeNum(e.lineTotal || e.unitPrice || 0);
                        allocated[ui].paidAmount = +price.toFixed(2);
                        allocated[ui].paid = price > 0;
                      }
                    }
                    const localSet2 = await readLocalPaidIds(sale);
                    for (let ui=0; ui<allocated.length; ui++) {
                      const e = allocated[ui];
                      if (e.paid) continue;
                      const raw = e.raw ?? {};
                      const candidates = [
                        e.id,
                        e.original_line_id,
                        raw.codigo_item,
                        raw.codigo,
                        raw.id,
                        raw.item_id,
                        raw.code,
                        raw.sku,
                        (raw.name || '').toLowerCase(),
                        (e.name || '').toLowerCase(),
                      ].filter(Boolean).map(String);
                      if (candidates.some(c => localSet2.has(String(c)))) {
                        const price = safeNum(e.lineTotal || e.unitPrice || 0);
                        allocated[ui].paidAmount = +price.toFixed(2);
                        allocated[ui].paid = price > 0;
                      }
                    }
                    const paidSum = allocated.reduce((s,it) => s + safeNum(it.paidAmount || 0), 0);
                    const outstanding = +(computedTotal - paidSum).toFixed(2);
                    if (isMountedRef.current) { setItems(allocated); setTotalConsumo(outstanding >= 0 ? outstanding : 0); }
                    const unionArr = Array.from(new Set([...(Array.from(localSet2 || []).map(String)), ...paidCodes.map(String)])).filter(Boolean);
                    if (unionArr.length > 0) await mergePersistLocalPaidIds(sale, unionArr);
                  }
                }
              }
            } catch (e) {
              console.warn('Error fetching splits by tx', e);
            }
          }
        }

        if (!splitsHandled && suc) {
          try {
            const splitsBySaleUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/transacciones-pago/sucursal/${encodeURIComponent(String(suc))}/ventas/${encodeURIComponent(String(sale))}/splits`;
            const sr = await fetch(splitsBySaleUrl, {
              method: 'GET',
              headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: API_AUTH_TOKEN ? `Bearer ${API_AUTH_TOKEN}` : undefined },
            });
            if (sr && sr.ok) {
              const sj = await sr.json();
              const splitsArr = Array.isArray(sj.splits) ? sj.splits : [];
              const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
              if (paidSplits.length > 0) {
                const hasEqualSplitPaid = paidSplits.some(s => {
                  const code = String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim();
                  const name = String(s.nombre_item ?? s.nombre ?? '').toLowerCase();
                  return code === '1' || /partes iguales|pago por partes iguales|pago por partes/i.test(name);
                });

                if (hasEqualSplitPaid) {
                  try { await AsyncStorage.setItem(`equal_split_paid_${String(sale)}`, '1'); } catch(e) {}
                  if (isMountedRef.current) { setEqualsSplitPaid(true); setItems(neutralItems); setTotalConsumo(+computedTotal.toFixed(2)); }
                  const paidCodesRaw = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
                  const paidCodesFiltered = paidCodesRaw.filter(c => c !== '1');
                  if (paidCodesFiltered.length > 0) await mergePersistLocalPaidIds(sale, paidCodesFiltered);
                } else {
                  const paidCodes = paidSplits.map(s => String(s.codigo_item ?? s.codigo ?? s.code ?? '').trim()).filter(Boolean);
                  const paidSet = new Set(paidCodes.map(String));
                  const allocated = expandedItems.map(it => ({ ...it, paid: false, paidPartial: false, paidAmount: 0 }));
                  for (let ui=0; ui<allocated.length; ui++) {
                    const e = allocated[ui];
                    const raw = e.raw ?? {};
                    const candidates = [
                      e.id,
                      e.original_line_id,
                      raw.codigo_item,
                      raw.codigo,
                      raw.id,
                      raw.item_id,
                      raw.code,
                      raw.sku,
                      (raw.name || '').toLowerCase(),
                      (e.name || '').toLowerCase(),
                    ].filter(Boolean).map(String);
                    if (candidates.some(c => paidSet.has(String(c)))) {
                      const price = safeNum(e.lineTotal || e.unitPrice || 0);
                      allocated[ui].paidAmount = +price.toFixed(2);
                      allocated[ui].paid = price > 0;
                    }
                  }
                  const localSet3 = await readLocalPaidIds(sale);
                  for (let ui=0; ui<allocated.length; ui++) {
                    const e = allocated[ui];
                    if (e.paid) continue;
                    const raw = e.raw ?? {};
                    const candidates = [
                      e.id,
                      e.original_line_id,
                      raw.codigo_item,
                      raw.codigo,
                      raw.id,
                      raw.item_id,
                      raw.code,
                      raw.sku,
                      (raw.name || '').toLowerCase(),
                      (e.name || '').toLowerCase(),
                    ].filter(Boolean).map(String);
                    if (candidates.some(c => localSet3.has(String(c)))) {
                      const price = safeNum(e.lineTotal || e.unitPrice || 0);
                      allocated[ui].paidAmount = +price.toFixed(2);
                      allocated[ui].paid = price > 0;
                    }
                  }
                  const paidSum = allocated.reduce((s,it) => s + safeNum(it.paidAmount || 0), 0);
                  const outstanding = +(computedTotal - paidSum).toFixed(2);
                  if (isMountedRef.current) { setItems(allocated); setTotalConsumo(outstanding >= 0 ? outstanding : 0); }
                  const unionArr = Array.from(new Set([...(Array.from(localSet3 || []).map(String)), ...paidCodes.map(String)])).filter(Boolean);
                  if (unionArr.length > 0) await mergePersistLocalPaidIds(sale, unionArr);
                }
              } else {
                console.log('No paid splits found in splitsBySale.');
              }
            } else {
              console.log('splitsBySale http error', sr ? sr.status : 'no res');
            }
          } catch (e) { console.warn('Error fetching splitsBySale', e); }
        }

      } catch (e) {
        console.warn('Error reading last_transaction for sale', e);
      }

    } catch (err) {
      console.warn('fetchConsumo error', err);
      openErrorModal('No se pudo consultar el consumo. Revisa tu conexión.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConsumo({ showLoading: true }); }, [token]);

  useFocusEffect(useCallback(() => { fetchConsumo({ showLoading: false }); }, [fetchConsumo]));

  const iva = +(totalConsumo / 1.16 * 0.16).toFixed(2);
  const subtotal = +(totalConsumo - iva).toFixed(2);
  const fechaTexto = fechaApertura ? new Date(fechaApertura).toLocaleString('es-MX') : '';
  const fechaCierreTexto = fechaCierre ? new Date(fechaCierre).toLocaleString('es-MX') : '';

  // --- cálculo para saber si hay pagos por consumo ---
  const consumoPaid = useMemo(() => {
    try {
      const anyItemPaid = Array.isArray(items) && items.some(it => !!it.paid || safeNum(it.paidAmount) > 0);
      const diff = Number(originalTotalConsumo) - Number(totalConsumo);
      const hasDiff = Number.isFinite(diff) && diff > 0.005;
      return anyItemPaid || hasDiff;
    } catch (e) {
      return false;
    }
  }, [items, originalTotalConsumo, totalConsumo]);

  const layoutWidth = Math.min(width - (sidePad * 2), 420);
  const headerPaddingHorizontal = Math.max(sidePad, wp(4));
  const topBarBaseHeight = Math.max(64, hp(8));
  const logoWidth = clamp(Math.round(wp(28)), 80, 140);
  const restaurantImgSize = clamp(Math.round(wp(16)), 48, 96);
  const rightColMaxWidth = Math.round(Math.min(Math.max(wp(36), 120), 220));
  const totalNumberFont = clamp(rf(7.5), 20, 36);
  const totalCurrencyFont = clamp(rf(2.8), 12, 16);
  const desgloseTitleFont = clamp(rf(5.6), 18, 30);
  const mesaFont = clamp(rf(3.6), 14, 20);
  const itemNameFont = clamp(rf(3.6), 12, 16);
  const itemPriceWidth = Math.min(Math.max(wp(28), 90), 140);
  const subtotalValueFont = clamp(rf(3.8), 16, 22);
  const primaryBtnPadding = Math.max(12, hp(1.6));

  // botones deshabilitados (para feedback visual)
  const primaryDisabled = consumoPaid || equalsSplitPaid; // Pago en una sola: bloquear si consumoPaid o equal paid
  const pagarConsumoDisabled = equalsSplitPaid; // Pagar por consumo: bloquear si equal paid
  const equalSplitDisabled = consumoPaid; // Pago por partes iguales: bloquear si consumoPaid

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { paddingHorizontal: headerPaddingHorizontal, height: topBarBaseHeight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backArrow, { fontSize: clamp(rf(4.2), 22, 36) }]}>{'‹'}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: clamp(rf(3.6), 14, 18) }]}>Tu cuenta</Text>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>{fechaTexto}</Text>
          {fechaCierreTexto ? <Text style={[styles.topSmall, { marginTop: 4, fontSize: clamp(rf(1.6), 10, 12) }]}>Cierre: {fechaCierreTexto}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>Mesa: {mesaId ?? '—'}</Text>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>Comensales: {totalComensales ?? '—'}</Text>
          <Text style={[styles.topSmall, { fontSize: clamp(rf(1.6), 10, 12) }]}>Mesero: {mesero ?? '—'}</Text>
        </View>
      </View>

      <Modal visible={errorModalVisible} transparent animationType="fade" onRequestClose={closeErrorModal}>
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} style={[styles.modalBox, { width: Math.min(layoutWidth - 8, wp(94)) }]}>
            <Text style={styles.modalTitle}>Aviso</Text>
            <Text style={styles.modalMessage}>{errorModalMessage}</Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalBtnPrimary]} onPress={() => { setErrorModalVisible(false); navigation.navigate('QRMain'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalBtnPrimaryText}>Volver a escanear</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtnGhost]} onPress={() => setErrorModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalBtnGhostText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f6ff' }}>
          <ActivityIndicator size="large" color="#0046ff" />
          <Text style={{ marginTop: 12, color: '#666' }}>Cargando consumo…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1, paddingBottom: Math.max(20, hp(3)) + bottomSafe }]} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#9F4CFF', '#6A43FF', '#2C7DFF']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} locations={[0, 0.45, 1]} style={[styles.headerGradient, { paddingHorizontal: Math.max(14, wp(5)), paddingTop: Math.max(12, hp(2)), paddingBottom: Math.max(24, hp(4)), borderBottomRightRadius: Math.max(28, wp(8)) }]}>

            <View style={[styles.gradientRow, { alignItems: 'flex-start' }]}>
              <View style={[styles.leftCol]}>
                <Image source={require('../../assets/images/logo2.png')} style={[styles.tabtrackLogo, { width: logoWidth, height: Math.round(logoWidth * 0.32), marginBottom: Math.max(8, hp(1)) }]} resizeMode="contain" />
                <View style={[styles.logoWrap, { marginTop: Math.max(6, hp(0.5)), padding: Math.max(6, wp(1.5)), borderRadius: Math.max(8, wp(2)) }]}>
                  {restaurantImageUri ? (
                    <Image source={{ uri: restaurantImageUri }} style={[styles.restaurantImage, { width: restaurantImgSize, height: restaurantImgSize, borderRadius: Math.round(restaurantImgSize * 0.16) }]} />
                  ) : (
                    <Image source={require('../../assets/images/restaurante.jpeg')} style={[styles.restaurantImage, { width: restaurantImgSize, height: restaurantImgSize, borderRadius: Math.round(restaurantImgSize * 0.16) }]} />
                  )}
                </View>
              </View>

              <View style={[styles.rightCol, { maxWidth: rightColMaxWidth, marginRight: Math.max(12, wp(3)) }]}>
                <Text style={[styles.totalLabel, { fontSize: clamp(rf(2.6), 12, 16) }]}>Total</Text>
                <View style={[styles.totalRow, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.totalNumber, { fontSize: totalNumberFont, lineHeight: Math.round(totalNumberFont * 1.05) }]}>{formatMoney(totalConsumo, moneda)}</Text>
                  <Text style={[styles.totalCurrency, { fontSize: totalCurrencyFont, marginLeft: Math.max(6, wp(1.6)) }]}>{moneda ?? 'MXN'}</Text>
                </View>
                <View style={styles.rightThanks}>
                  <Text style={[styles.thanksText, { fontSize: clamp(rf(2.6), 12, 16) }]}>¡Gracias por tu visita!</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.contentPlain, { width: layoutWidth, paddingVertical: Math.max(12, hp(1.6)), paddingHorizontal: Math.max(12, wp(3)), marginTop: Math.max(8, hp(1)) }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.mesaText, { fontSize: mesaFont }]}>Mesa: {mesaId ?? '—'}</Text>
              <View style={{ width: wp(10) }} />
            </View>

            <Text style={[styles.desgloseTitle, { fontSize: desgloseTitleFont }]}>Desglose</Text>
            <View style={styles.desgloseSeparator} />

            <View style={styles.items}>
              {items.length === 0 && <Text style={{ color: '#666', marginVertical: 8 }}>No hay items registrados.</Text>}
              {items.map((it, i) => (
                <View key={it.id ?? i} style={styles.itemBlock}>
                  <View style={styles.itemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={[styles.itemName, it.canceled && styles.itemCanceled, (it.paid || it.paidPartial) && { color: '#10b981', fontWeight: '800' }, { fontSize: itemNameFont }]} numberOfLines={1}>
                        {it.name}
                      </Text>
                    </View>

                    <Text style={[styles.itemPrice, it.canceled && styles.itemCanceled, (it.paid || it.paidPartial) && { color: '#10b981', fontWeight: '800' }, { width: itemPriceWidth, fontSize: clamp(rf(2.8), 12, 16) }]}>
                      {formatMoney(it.lineTotal)} {moneda ?? 'MXN'}
                    </Text>
                  </View>

                  {it.canceled ? <Text style={[styles.canceledTag, { fontSize: clamp(rf(2.6), 11, 14) }]}>Cancelado</Text> : null}
                  {it.paid && !it.canceled ? <Text style={{ color: '#0b8f56', fontWeight: '800', marginTop: 6, fontSize: clamp(rf(2.6), 12, 14) }}>Pagado</Text> : it.paidPartial && !it.canceled ? <Text style={{ color: '#0b8f56', fontWeight: '700', marginTop: 6, fontSize: clamp(rf(2.6), 12, 14) }}>Parcial: {formatMoney(it.paidAmount)} pagado</Text> : null}
                </View>
              ))}

              <View style={styles.beforeIvaSeparator} />

              <View style={[styles.itemRow, { paddingTop: 6 }]}>
                <Text style={[styles.subtotalLabel, { fontSize: clamp(rf(3.4), 14, 18) }]}>Sub total</Text>
                <Text style={[styles.subtotalValue, { fontSize: clamp(rf(3.4), 14, 18) }]}>{formatMoney(subtotal)} {moneda ?? 'MXN'}</Text>
              </View>

              <View style={[styles.itemRow, styles.ivaRow]}>
                <Text style={[styles.itemName, styles.ivaText, { fontSize: clamp(rf(3), 12, 16) }]}>IVA (estimado)</Text>
                <Text style={[styles.itemPrice, styles.ivaText, { fontSize: clamp(rf(3), 12, 16), width: itemPriceWidth }]}>{formatMoney(iva)} {moneda ?? 'MXN'}</Text>
              </View>


              {discountAmount > 0 && (
                <View style={[styles.itemRow, { paddingTop: 6 }]}>
                  <Text style={[styles.subtotalLabel, { fontSize: subtotalValueFont }]}>Descuento</Text>
                  <Text style={[styles.subtotalValue, { fontSize: subtotalValueFont }]}>
                    -{formatMoney(discountAmount)} {moneda ?? 'MXN'}
                  </Text>
                </View>
              )}

              <View style={[styles.itemRow, { paddingTop: 6 }]}>
                <Text style={[styles.subtotalLabel, { fontSize: subtotalValueFont }]}>Total</Text>
                <Text style={[styles.subtotalValue, { fontSize: subtotalValueFont }]}>{formatMoney(totalConsumo)} {moneda ?? 'MXN'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { width: layoutWidth, paddingVertical: primaryBtnPadding },
              primaryDisabled ? { opacity: 0.6 } : null
            ]}
            activeOpacity={0.85}
            onPress={async () => {
              // Bloqueos: si hay pago por consumo o pago por partes iguales -> bloquear
              if (consumoPaid) {
                showConflictAlert('Pago por consumo en curso', 'Se está procesando un pago por consumo — no puedes proceder con este método ahora.');
                return;
              }
              if (equalsSplitPaid) {
                showConflictAlert('Pago por partes iguales', 'Se está procesando un pago por partes iguales — no puedes proceder con este método.');
                return;
              }

              const paramsToSend = {
                token,
                items,
                subtotal,
                iva,
                total: originalTotalConsumo,
                total_pending: totalConsumo,
                sale_id: saleId ?? null,
                total_comensales: totalComensales ?? null,
                fecha_apertura: fechaApertura ?? null,
                fecha_cierre: fechaCierre ?? null,
                restaurantImage: restaurantImageUri ?? null,
                mesa_id: mesaId ?? null,
                mesero: mesero ?? null,
                moneda: moneda ?? 'MXN',
                restaurante_id: restauranteId ?? null,
                sucursal_id: sucursalId ?? null,
                saleId: saleId ?? null,
                totalComensales: totalComensales ?? null,
                fechaApertura: fechaApertura ?? null,
                descuentos_venta: { monto_total: Number(discountAmount || 0) },
                totales_venta: { total_descuentos: Number(discountAmount || 0) },
                total_descuentos: Number(discountAmount || 0),
                descuento: Number(discountAmount || 0),
                discount_amount: Number(discountAmount || 0),
                discountAmount: Number(discountAmount || 0),
                monto_descuento: Number(discountAmount || 0),
              };

              try {
                const pending = {
                  sale_id: saleId ?? null,
                  restaurante_id: restauranteId ?? null,
                  sucursal_id: sucursalId ?? null,
                  restaurantImage: restaurantImageUri ?? null,
                  mesa: mesaId ?? null,
                  fecha_iniciado: new Date().toISOString(),
                  total: originalTotalConsumo,
                  moneda,
                  items,
                  monto_descuento: Number(discountAmount || 0),
                };
                await savePendingVisit(pending);
                const keySale = String(saleId ?? '');
                if (keySale) {
                  const pendingPaymentObj = buildPendingPaymentObj(keySale, items, originalTotalConsumo);
                  try { await AsyncStorage.setItem(`pending_payment_${keySale}`, JSON.stringify(pendingPaymentObj)); } catch(e) { console.warn('Error saving pending_payment', e); }
                }
              } catch (e) { console.warn('Error saving pending visit before navigate', e); }

              navigation.navigate('OneExhibicion', paramsToSend);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={primaryDisabled}
          >
            <Text style={[styles.primaryButtonText, { fontSize: clamp(rf(3.4), 14, 18) }]}>Pago en una sola exhibición</Text>
          </TouchableOpacity>

      
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { width: layoutWidth, paddingVertical: primaryBtnPadding },
              pagarConsumoDisabled ? { opacity: 0.6 } : null
            ]}
            activeOpacity={0.85}
            onPress={async () => {
              // Bloqueo si equal split ya pagado
              if (equalsSplitPaid) {
                showConflictAlert('Pago por partes iguales en curso', 'Se está procesando un pago por partes iguales — no puedes proceder con el pago por consumo.');
                return;
              }

              const paramsDividir = {
                token,
                items,
                total_consumo: originalTotalConsumo,
                total_comensales: totalComensales ?? null,
                sale_id: saleId ?? null,
                sucursal_id: sucursalId ?? null,
                mesa_id: mesaId ?? null,
                restaurante_id: restauranteId ?? null,
                saleId: saleId ?? null,
                hideEqualButton: true, 
              };
              try {
                const pending = { sale_id: saleId ?? null, restaurante_id: restauranteId ?? null, sucursal_id: sucursalId ?? null, restaurantImage: restaurantImageUri ?? null, mesa: mesaId ?? null, fecha_iniciado: new Date().toISOString(), total: originalTotalConsumo, moneda, items };
                await savePendingVisit(pending);
                const keySale = String(saleId ?? '');
                if (keySale) {
                  const pendingPaymentObj = buildPendingPaymentObj(keySale, items, originalTotalConsumo);
                  try { await AsyncStorage.setItem(`pending_payment_${keySale}`, JSON.stringify(pendingPaymentObj)); } catch(e) { console.warn('Error saving pending_payment', e); }
                }
              } catch (e) { console.warn('Error saving pending visit before navigate', e); }
              navigation.navigate('Dividir', paramsDividir);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={pagarConsumoDisabled}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: clamp(rf(3.4), 14, 18) }]}>Pagar por consumo</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { width: layoutWidth, marginTop: 12, paddingVertical: primaryBtnPadding },
              equalSplitDisabled ? { opacity: 0.6 } : null
            ]}
            activeOpacity={0.85}
            onPress={async () => {
              // Bloqueo si hay pago por consumo detectado
              if (consumoPaid) {
                showConflictAlert('Pago por consumo en curso', 'Se está procesando un pago por consumo — no puedes proceder con el pago por partes iguales.');
                return;
              }

              const normalizedItemsForEqual = (items || []).map(it => {
                const computedPrice = Number(it.unitPrice ?? it.lineTotal ?? it.price ?? 0) || 0;
                return {
                  ...it,
                  price: Number(it.price ?? computedPrice),
                  unitPrice: Number(it.unitPrice ?? computedPrice),
                  lineTotal: Number(it.lineTotal ?? computedPrice),
                  precio_item: Number(it.precio_item ?? computedPrice),
                };
              });

              const paramsEqual = {
                token,
                items: normalizedItemsForEqual,
                total_consumo: originalTotalConsumo,
                total_comensales: totalComensales ?? null,
                sale_id: saleId ?? null,
                sucursal_id: sucursalId ?? null,
                mesa_id: mesaId ?? null,
                restaurante_id: restauranteId ?? null,
                saleId: saleId ?? null,
              };
              try {
                const pending = { sale_id: saleId ?? null, restaurante_id: restauranteId ?? null, sucursal_id: sucursalId ?? null, restaurantImage: restaurantImageUri ?? null, mesa: mesaId ?? null, fecha_iniciado: new Date().toISOString(), total: originalTotalConsumo, moneda, items: normalizedItemsForEqual };
                await savePendingVisit(pending);
                const keySale = String(saleId ?? '');
                if (keySale) {
                  const pendingPaymentObj = buildPendingPaymentObj(keySale, normalizedItemsForEqual, originalTotalConsumo);
                  try { await AsyncStorage.setItem(`pending_payment_${keySale}`, JSON.stringify(pendingPaymentObj)); } catch(e) { console.warn('Error saving pending_payment', e); }
                }
              } catch (e) { console.warn('Error saving pending visit before navigate', e); }
              navigation.navigate('EqualSplit', paramsEqual);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={equalSplitDisabled}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: clamp(rf(3.4), 14, 18) }]}>Pago por partes iguales</Text>
          </TouchableOpacity>

          <View style={{ height: Math.max(12, hp(1.2)) }} />

          <TouchableOpacity style={[styles.secondaryButton, { width: layoutWidth, backgroundColor: '#fff', borderColor: '#ddd', paddingVertical: Math.max(12, hp(1.4)) }]} onPress={() => navigation.navigate('QRMain')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.secondaryButtonText, { color: '#444', fontSize: clamp(rf(3.2), 13, 16) }]}>Volver a escanear</Text>
          </TouchableOpacity>

          <View style={{ height: Math.max(28, hp(3.6)) }} />
        </ScrollView>
      )}

      {styledAlertVisible && (
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#FF2FA0', '#6B2CFF', '#0046ff']} style={[styles.gatewayModalBox, { width: Math.min(layoutWidth - 48, Math.max(wp(72), 320)) }]}>
            <Ionicons name="alert-circle" size={44} color="#fff" style={{ marginBottom: 8 }} />
            <Text style={[styles.gatewayModalTitle, { color: '#fff', fontSize: clamp(rf(3.6), 16, 20) }]}>{styledAlertTitle}</Text>
            <Text style={[styles.gatewayModalMessage, { color: '#fff', fontSize: clamp(rf(2.8), 13, 16) }]}>{styledAlertMessage}</Text>

            <TouchableOpacity style={[styles.gatewayModalButton]} onPress={() => setStyledAlertVisible(false)} activeOpacity={0.9} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.gatewayModalButtonText]}>Aceptar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Modal blanco con texto negro para alertas de conflicto */}
      {conflictAlertVisible && (
        <View style={styles.conflictBackdrop}>
          <View style={[styles.conflictBox, { width: Math.min(layoutWidth - 48, Math.max(wp(72), 300)) }]}>
            <Text style={styles.conflictTitle}>{conflictAlertTitle}</Text>
            <Text style={styles.conflictMessage}>{conflictAlertMessage}</Text>

            <View style={{ height: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => hideConflictAlert()} style={styles.conflictBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.conflictBtnText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f6ff' },

  topBar: {
    width: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 20,
  },
  backBtn: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { fontSize: 32, color: '#222', marginLeft: 2 },
  title: { fontWeight: '800', color: '#111' },
  topSmall: { color: '#666' },

  container: { alignItems: 'center' },

  headerGradient: { width: '100%', borderBottomRightRadius: 42, overflow: 'hidden' },
  gradientRow: { flexDirection: 'row', justifyContent: 'space-between' },
  leftCol: { flexDirection: 'column', alignItems: 'flex-start' },
  tabtrackLogo: { },
  logoWrap: { backgroundColor: 'rgba(255,255,255,0.12)' },
  restaurantImage: { backgroundColor: '#fff' },

  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 },
  totalLabel: { color: 'rgba(255,255,255,0.95)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  totalNumber: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
  totalCurrency: { color: '#fff', marginLeft: 6, marginBottom: 3, opacity: 0.95 },

  rightThanks: { marginTop: 10, alignItems: 'flex-end' },
  thanksText: { color: '#fff', fontWeight: '700' },

  contentPlain: { backgroundColor: '#fff', borderRadius: 0, paddingVertical: 16, paddingHorizontal: 16, marginTop: 0, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mesaText: { fontWeight: '900', color: '#222' },
  desgloseTitle: { marginTop: 6, fontWeight: '700', color: '#333' },
  desgloseSeparator: { height: 1, backgroundColor: '#e9e9e9', marginTop: 10, marginBottom: 12 },

  items: {} ,
  itemBlock: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 0 },
  itemName: { color: '#333', flex: 1 },
  itemQty: { marginLeft: 8, color: '#9ca3af' },
  itemPrice: { color: '#333', textAlign: 'right', marginLeft: 12 },

  canceledTag: { marginTop: 6, color: '#ef4444', fontWeight: '700' },

  itemCanceled: { textDecorationLine: 'line-through', color: '#9ca3af' },

  beforeIvaSeparator: { height: 1, backgroundColor: '#e9e9e9', marginTop: 12, marginBottom: 8 },

  ivaRow: { paddingTop: 0 },
  ivaText: { fontWeight: '800' },

  subtotalLabel: { color: '#374151', fontWeight: '700' },
  subtotalValue: { color: '#111827', fontWeight: '900' },

  primaryButton: { backgroundColor: '#0046ff', borderRadius: 10, alignItems: 'center', marginTop: 18, shadowColor: '#085bff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },

  secondaryButton: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1.2, borderColor: '#0046ff' },
  secondaryButtonText: { color: '#085bff', fontWeight: '800' },

  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: { borderRadius: 12, padding: 18, alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalMessage: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 14 },

  modalButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff', marginRight: 8, alignItems: 'center' },
  modalBtnPrimaryText: { color: '#0046ff', fontWeight: '800' },
  modalBtnGhost: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginLeft: 8, alignItems: 'center' },
  modalBtnGhostText: { color: '#fff', fontWeight: '700' },

  gatewayModalBox: { borderRadius: 12, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12, overflow: 'hidden' },
  gatewayModalTitle: { color: '#fff', fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  gatewayModalMessage: { color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  gatewayModalButton: { marginTop: 12, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, minWidth: 120, alignItems: 'center', justifyContent: 'center' },
  gatewayModalButtonText: { color: '#0046ff', fontWeight: '800', fontSize: 15 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // estilos nuevos para modal blanco (alertas de conflicto)
  conflictBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.35)' },
  conflictBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'flex-start', elevation: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 12 },
  conflictTitle: { fontWeight: '800', color: '#111', fontSize: 16, marginBottom: 6, textAlign: 'left' },
  conflictMessage: { color: '#111', fontSize: 14, lineHeight: 20 },
  conflictBtn: { backgroundColor: '#0046ff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  conflictBtnText: { color: '#fff', fontWeight: '800' },
});
