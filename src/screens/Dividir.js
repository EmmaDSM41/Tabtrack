import React, { useEffect, useState, useMemo } from 'react';
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
  useWindowDimensions,
  PixelRatio,
  Share,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';

const formatMoney = (n) =>
  Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

const round2 = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

export default function Dividir() {
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

  // safe paddings to avoid notch/statusbar overlap
  const topSafe = Math.round(
    Math.max(insets?.top ?? 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0))
  );
  const bottomSafe = Math.round(insets?.bottom ?? 0);
  const sidePad = Math.round(Math.min(Math.max(wp(4), 12), 36)); // lateral padding con límites

  // breakpoints
  const isNarrow = width < 420;
  const contentMaxWidth = Math.round(Math.min(width - Math.round(wp(8)), 960));

  const token = route?.params?.token ?? null;
  const incomingItems = route?.params?.items ?? null;
  const incomingComensales = route?.params?.total_comensales ?? null;
  const incomingTotalConsumo = route?.params?.total_consumo ?? null;

  const allowPaymentsCheck = !!route?.params?.allowPaymentsCheck;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [totalComensales, setTotalComensales] = useState(incomingComensales ?? null);

  const [saleId, setSaleId] = useState(route?.params?.saleId ?? route?.params?.sale_id ?? route?.params?.venta_id ?? null);
  const [restauranteId, setRestauranteId] = useState(route?.params?.restauranteId ?? route?.params?.restaurante_id ?? null);
  const [sucursalId, setSucursalId] = useState(route?.params?.sucursalId ?? route?.params?.sucursal_id ?? null);
  const [mesaId, setMesaId] = useState(route?.params?.mesaId ?? route?.params?.mesa_id ?? null);
  const [mesero, setMesero] = useState(route?.params?.mesero ?? route?.params?.waiter ?? null);
  const [moneda, setMoneda] = useState(route?.params?.moneda ?? 'MXN');
  const [externalTotalConsumo, setExternalTotalConsumo] = useState(incomingTotalConsumo ?? null);

  const [equalsSplitPaid, setEqualsSplitPaid] = useState(false);

  const [styledAlertVisible, setStyledAlertVisible] = useState(false);
  const [styledAlertTitle, setStyledAlertTitle] = useState('');
  const [styledAlertMessage, setStyledAlertMessage] = useState('');

  const showStyledAlert = (title, message) => {
    setStyledAlertTitle(title || 'Aviso');
    setStyledAlertMessage(message || '');
    setStyledAlertVisible(true);
  };
  const hideStyledAlert = () => setStyledAlertVisible(false);

  // CHECK: flag que indica si debemos ocultar el botón "Partes iguales"
  const hideEqualButtonFlag = !!route?.params?.hideEqualButton;

  const parsePrice = (v) => {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    let s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/[^0-9\.\-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeItem = (raw, fallbackId) => {
    const name = raw?.nombre_item ?? raw?.nombre ?? raw?.name ?? raw?.product_name ?? raw?.title ?? '';
    const qty = Number(raw?.cantidad ?? raw?.qty ?? raw?.quantity ?? 1) || 1;

    let priceCandidate = null;
    if (raw === null || raw === undefined) priceCandidate = 0;

    if (priceCandidate === null) {
      if (raw?.precio_item !== undefined) priceCandidate = raw.precio_item;
      else if (raw?.precio !== undefined) priceCandidate = raw.precio;
      else if (raw?.price !== undefined) priceCandidate = raw.price;
    }

    if (priceCandidate === null) {
      if (raw?.lineTotal !== undefined) priceCandidate = raw.lineTotal;
      else if (raw?.line_total !== undefined) priceCandidate = raw.line_total;
      else if (raw?.line_total_price !== undefined) priceCandidate = raw.line_total_price;
    }

    if (priceCandidate === null) {
      if (raw?.unitPrice !== undefined) priceCandidate = Number(raw.unitPrice) * qty;
      else if (raw?.unit_price !== undefined) priceCandidate = Number(raw.unit_price) * qty;
      else if (raw?.unitprice !== undefined) priceCandidate = Number(raw.unitprice) * qty;
    }

    if (priceCandidate === null) priceCandidate = 0;
    const price = parsePrice(priceCandidate);
    const id = raw?.id ?? raw?.codigo ?? raw?.codigo_item ?? fallbackId ?? String(Math.random()).slice(2, 9);

    let locked = false;
    let paidInfo = null;
    try {
      const low = (v) => (v === null || v === undefined) ? '' : String(v).toLowerCase();

      if (raw?.pagado === true || raw?.paid === true || raw?.cobrado === true || raw?.is_paid === true || raw?.pago === true) {
        locked = true; paidInfo = { reason: 'flag_boolean', rawFlag: true };
      }

      if (!locked) {
        const possibilities = [raw?.pagado, raw?.paid, raw?.pago, raw?.estado_pago, raw?.estado];
        for (const p of possibilities) {
          if (p !== undefined && p !== null) {
            const s = low(p);
            if (s === 'true' || s === '1' || s.includes('pag') || s.includes('paid') || s.includes('cob')) {
              locked = true;
              paidInfo = { reason: 'flag_string', sample: String(p) };
              break;
            }
          }
        }
      }

      if (!locked && (Number(raw?.paid_amount || raw?.monto_pagado || raw?.monto_pago || 0) > 0 || Number(raw?.paid_qty || raw?.qty_paid || 0) > 0)) {
        locked = true;
        paidInfo = { reason: 'paid_amount_or_qty', paid_amount: raw?.paid_amount ?? raw?.monto_pagado ?? raw?.monto_pago ?? 0 };
      }

      if (!locked && (raw?.paid_at || raw?.fecha_pago || raw?.cobrado_at)) {
        locked = true;
        paidInfo = { reason: 'paid_date' };
      }

      if (!locked && raw?.status) {
        const s = low(raw.status);
        if (s.includes('paid') || s.includes('pag') || s.includes('cob')) {
          locked = true;
          paidInfo = { reason: 'status_field', status: raw.status };
        }
      }
    } catch (err) {
      console.warn('normalizeItem paid detection error', err);
    }

    return { id: String(id), name, price: +price.toFixed(2), qty, checked: false, locked: !!locked, paidInfo, raw };
  };

  useEffect(() => {
    let mounted = true;

    if (route?.params) {
      if (route.params.saleId) setSaleId(route.params.saleId);
      if (route.params.sale_id) setSaleId(route.params.sale_id);
      if (route.params.venta_id) setSaleId(route.params.venta_id);

      if (route.params.restauranteId) setRestauranteId(route.params.restauranteId);
      if (route.params.restaurante_id) setRestauranteId(route.params.restaurante_id);

      if (route.params.sucursalId) setSucursalId(route.params.sucursalId);
      if (route.params.sucursal_id) setSucursalId(route.params.sucursal_id);

      if (route.params.mesaId) setMesaId(route.params.mesaId);
      if (route.params.mesa_id) setMesaId(route.params.mesa_id);

      if (route.params.mesero) setMesero(route.params.mesero);
      if (route.params.moneda) setMoneda(route.params.moneda);

      if (route.params.total_consumo !== undefined && route.params.total_consumo !== null) {
        setExternalTotalConsumo(Number(route.params.total_consumo) || null);
      }
    }

    const load = async () => {
      if (incomingItems && Array.isArray(incomingItems)) {
        try {
          const mapped = incomingItems.map((it, i) => normalizeItem(it, i));
          if (mounted) {
            setItems(mapped);
          }
          return;
        } catch (err) {
          console.warn('Dividir: error normalizando incoming items', err);
          if (mounted) setItems([]);
          return;
        }
      }

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
          console.warn('Dividir: no se pudo obtener el consumo (HTTP ' + res.status + '). URL:', url);
          setItems([]);
          setLoading(false);
          return;
        }

        const json = await res.json();

        if (json.sale_id ?? json.venta_id ?? json.id) {
          setSaleId(json.sale_id ?? json.venta_id ?? json.id);
        }
        if (json.restaurante_id) setRestauranteId(json.restaurante_id);
        if (json.sucursal_id) setSucursalId(json.sucursal_id);
        if (json.mesa_id) setMesaId(json.mesa_id);
        if (json.mesero) setMesero(json.mesero);
        if (json.moneda) setMoneda(json.moneda ?? 'MXN');
        if (json.total_comensales !== undefined && json.total_comensales !== null) {
          setTotalComensales(Number(json.total_comensales) || null);
        }
        if (json.total_consumo !== undefined && json.total_consumo !== null) {
          setExternalTotalConsumo(Number(json.total_consumo) || null);
        }

        const rawItems = Array.isArray(json.items) ? json.items : (json.data?.items ?? json.result?.items ?? []);
        const mapped = (Array.isArray(rawItems ? rawItems : []) ? rawItems : []).map((it, i) => normalizeItem(it, i));
        if (mounted) {
          setItems(mapped);
          if (allowPaymentsCheck) {
            try {
              applyPaymentsLockIfPossible(mapped, json).catch((e) => console.warn('applyPaymentsLockIfPossible error', e));
            } catch (err) {
              console.warn('applyPaymentsLockIfPossible threw', err);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetch Dividir:', err);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const applyPaymentsLockIfPossible = async (currentItems = [], consumoJson = null) => {
      try {
        const useSale = saleId || (route?.params?.saleId ?? route?.params?.sale_id ?? route?.params?.venta_id ?? (consumoJson && (consumoJson.sale_id ?? consumoJson.venta_id ?? consumoJson.id)));
        const useRest = restauranteId || (route?.params?.restauranteId ?? route?.params?.restaurante_id ?? (consumoJson && consumoJson.restaurante_id));
        const useSuc = sucursalId || (route?.params?.sucursalId ?? route?.params?.sucursal_id ?? (consumoJson && consumoJson.sucursal_id));

        if (!useSale || !useRest || !useSuc) {
          if (consumoJson) {
            const saleState = (consumoJson.sale_state ?? consumoJson.saleState ?? '').toString().toUpperCase();
            const paymentsTotal = consumoJson.payments_total ?? consumoJson.paymentsTotal ?? consumoJson.payments_total_venta ?? null;
            const totalConsumo = consumoJson.total_consumo ?? consumoJson.total ?? externalTotalConsumo ?? null;
            if (saleState === 'CLOSED' && paymentsTotal !== null && Number(paymentsTotal) >= Number(totalConsumo || 0) && Number(totalConsumo || 0) > 0) {
              const allLocked = (currentItems || []).map(it => ({ ...it, locked: true, paidInfo: { reason: 'sale_closed_and_fully_paid' }, checked: false }));
              setItems(allLocked);
            }
          }
          return;
        }

        const hostBase = API_BASE_URL.replace(/\/$/, '');
        const pagosUrl = `${hostBase}/api/restaurantes/${encodeURIComponent(useRest)}/sucursales/${encodeURIComponent(useSuc)}/ventas/${encodeURIComponent(useSale)}/pagos`;

        const res = await fetch(pagosUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
          },
        });

        if (!res.ok) {
          console.warn('Dividir: no se pudo consultar pagos (http ' + res.status + ')', pagosUrl);
          return;
        }

        const payJson = await res.json();

        const paymentsArr = Array.isArray(payJson.payments) ? payJson.payments : (Array.isArray(payJson.data?.payments) ? payJson.data.payments : []);
        const paymentsTotalRaw = payJson.payments_total ?? payJson.paymentsTotal ?? payJson.payments_total_venta ?? null;
        const paymentsTotal = paymentsTotalRaw !== null ? Number(paymentsTotalRaw) : (paymentsArr.length ? paymentsArr.reduce((s, p) => s + (Number(p.amount || 0)), 0) : null);
        const saleState = (payJson.sale_state ?? payJson.saleState ?? '').toString().toUpperCase();

        const totalConsumo = consumoJson?.total_consumo ?? consumoJson?.total ?? externalTotalConsumo ?? null;
        if (saleState === 'CLOSED' && paymentsTotal !== null && Number(paymentsTotal) >= Number(totalConsumo || 0) && Number(totalConsumo || 0) > 0) {
          const allLocked = (currentItems || []).map(it => ({ ...it, locked: true, paidInfo: { reason: 'sale_closed_and_fully_paid_from_payments' }, checked: false }));
          setItems(allLocked);
          return;
        }

        let paidIdsSet = new Set();
        let anyPaidDiscovered = false;
        const possibleArrays = ['paid_items', 'items_paid', 'paid_item_ids', 'paid_ids', 'items_pagados', 'pagados', 'paid'];
        for (const key of possibleArrays) {
          if (Array.isArray(payJson[key]) && payJson[key].length > 0) {
            for (const pi of payJson[key]) {
              if (!pi) continue;
              if (typeof pi === 'object') {
                if (pi.id) paidIdsSet.add(String(pi.id));
                else if (pi.item_id) paidIdsSet.add(String(pi.item_id));
                else if (pi.codigo) paidIdsSet.add(String(pi.codigo));
                else if (pi.name) paidIdsSet.add(String(pi.name).toLowerCase());
              } else {
                paidIdsSet.add(String(pi));
              }
            }
            anyPaidDiscovered = true;
            break;
          }
        }

        if (!anyPaidDiscovered && Array.isArray(paymentsArr) && paymentsArr.length > 0) {
          for (const p of paymentsArr) {
            if (!p) continue;
            const cand = p.items ?? p.paid_items ?? p.applied_items ?? p.items_paid ?? p.itemsPagados ?? null;
            if (Array.isArray(cand) && cand.length > 0) {
              cand.forEach(pi => {
                if (!pi) return;
                if (typeof pi === 'object') {
                  if (pi.id) paidIdsSet.add(String(pi.id));
                  else if (pi.item_id) paidIdsSet.add(String(pi.item_id));
                  else if (pi.codigo) paidIdsSet.add(String(pi.codigo));
                  else if (pi.name) paidIdsSet.add(String(pi.name).toLowerCase());
                } else {
                  paidIdsSet.add(String(pi));
                }
              });
              anyPaidDiscovered = true;
            }
          }
        }

        if (paidIdsSet.size > 0) {
          const mapped = (currentItems || []).map(it => {
            const raw = it.raw ?? {};
            const candidates = [
              it.id,
              raw.id,
              raw.codigo,
              raw.item_id,
              raw.line_id,
              raw.codigo_item,
              raw.code,
              raw.sku,
              (raw.name || '').toLowerCase(),
              (it.name || '').toLowerCase(),
            ].filter(Boolean).map(String);

            const matched = candidates.some(c => paidIdsSet.has(String(c)));
            if (matched) {
              return { ...it, locked: true, checked: false, paidInfo: { reason: 'matched_in_payments_ids' } };
            }
            return it;
          });
          setItems(mapped);
          return;
        }

        if (Array.isArray(paymentsArr) && paymentsArr.length > 0) {
          const eps = 0.01;
          const currentCopy = (currentItems || []).map(it => ({ ...it }));
          let changed = false;

          for (const p of paymentsArr) {
            const amt = Number(p.amount ?? p.monto ?? 0);
            if (!amt || amt <= eps) continue;

            const matchIndex = currentCopy.findIndex(it => !it.locked && Math.abs(Number(it.price || 0) - amt) <= eps);
            if (matchIndex >= 0) {
              currentCopy[matchIndex] = { ...currentCopy[matchIndex], locked: true, checked: false, paidInfo: { reason: 'matched_by_exact_amount' } };
              changed = true;
            } else {
              // no bloquear por heurística combinatoria
            }
          }

          if (changed) {
            setItems(currentCopy);
            return;
          }
        }

        return;
      } catch (err) {
        console.warn('applyPaymentsLockIfPossible error:', err);
      }
    };

    load();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingItems, token, saleId, restauranteId, sucursalId, allowPaymentsCheck]);

  useEffect(() => {
    let mounted = true;
    const checkEqualFlag = async () => {
      try {
        const sid = saleId ?? route?.params?.saleId ?? route?.params?.sale_id ?? route?.params?.venta_id ?? null;
        if (!sid) return;
        const key = `equal_split_paid_${String(sid)}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw === '1' && mounted) {
          setEqualsSplitPaid(true);
        } else if (mounted) {
          setEqualsSplitPaid(false);
        }
      } catch (e) {
        console.warn('Dividir: error reading equal_split flag', e);
      }
    };
    checkEqualFlag();
    return () => { mounted = false; };
  }, [saleId, route?.params]);

  const toggleItem = (index) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      if (it.locked) return it;
      return { ...it, checked: !it.checked };
    }));
  };

  const itemsSum = useMemo(() => {
    const s = (items || []).reduce((acc, it) => acc + Number(it.price || 0), 0);
    return round2(s);
  }, [items]);

  const usesExternalTotal = externalTotalConsumo !== null && externalTotalConsumo !== undefined;
  const total = useMemo(() => (usesExternalTotal ? round2(Number(externalTotalConsumo || 0)) : itemsSum), [usesExternalTotal, externalTotalConsumo, itemsSum]);
  const iva = useMemo(() => round2(total / 1.16 * 0.16), [total]);
  const subtotal = useMemo(() => round2(total - iva), [total, iva]);

  const selectedItems = useMemo(() => (items || []).filter(i => i.checked && !i.locked), [items]);
  const anySelected = selectedItems.length > 0;

  const selectedIdsArray = useMemo(() => (selectedItems || []).map(it => String(it.id)), [selectedItems]);

  const sharedHiddenFields = () => ({
    token,
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
    total_consumo: externalTotalConsumo ?? total,
    selected_item_ids: selectedIdsArray,
  });

  const savePendingLocal = async (saleIdLocal, idsArray = [], amount = 0) => {
    try {
      if (!saleIdLocal || !Array.isArray(idsArray) || idsArray.length === 0) return;
      const pendingKey = `pending_payment_${saleIdLocal}`;
      const obj = { ids: idsArray.map(String), amount: Number(amount) };
      await AsyncStorage.setItem(pendingKey, JSON.stringify(obj));
      console.log('Saved pending local', pendingKey, obj);
    } catch (e) {
      console.warn('savePendingLocal error', e);
    }
  };

  const handlePorConsumo = () => {
    if (equalsSplitPaid) {
      showStyledAlert('Pago por partes iguales', 'Se está procesando un pago por partes iguales para esta venta — no puedes usar "Por consumo".');
      return;
    }

    const selected = selectedItems;
    if (!selected || selected.length === 0) {
      showStyledAlert('Selecciona productos', 'Debes seleccionar al menos un producto para pagar por consumo.', 'Aceptar');
      return;
    }

    const selTotalRaw = selected.reduce((s, it) => s + Number(it.price || 0), 0);
    const selTotal = round2(selTotalRaw);
    const selIva = round2(selTotal / 1.16 * 0.16);
    const selSubtotal = round2(selTotal - selIva);

    if (saleId && selectedIdsArray.length > 0) {
      savePendingLocal(saleId, selectedIdsArray, selTotal).catch(e => console.warn('savePendingLocal error', e));
    }

    navigation.navigate('Consumo', {
      selectedItems: selected,
      fromToken: token,
      subtotal: selSubtotal,
      iva: selIva,
      total: selTotal,
      people: 1,
      ...sharedHiddenFields(),
    });
  };

  const handlePartesIguales = () => {
    if (anySelected) {
      showStyledAlert('No permitido', 'Has seleccionado productos. Para usar "Partes iguales" debes no seleccionar items. Deselecciona los items o utiliza "Por consumo".');
      return;
    }

    const payload = items.filter(it => !it.locked);
    if (!payload || payload.length === 0) {
      console.warn('Dividir.handlePartesIguales: no hay productos para dividir.');
      return;
    }

    const pTotalRaw = (usesExternalTotal && !anySelected) ? Number(total || 0) : payload.reduce((s, it) => s + Number(it.price || 0), 0);
    const pTotal = round2(pTotalRaw);
    const pIva = round2(pTotal / 1.16 * 0.16);
    const pSubtotal = round2(pTotal - pIva);

    // MAPEO DE ITEMS: asegurarnos de enviar campos de precio comunes para evitar 0 en la pantalla objetivo
    const payloadForEqual = payload.map(it => ({
      ...it,
      price: Number(it.price || 0),
      unitPrice: Number(it.price || it.unitPrice || it.lineTotal || 0),
      lineTotal: Number(it.price || it.lineTotal || it.unitPrice || 0),
      precio_item: Number(it.price || 0),
    }));

    navigation.navigate('EqualSplit', {
      ...sharedHiddenFields(),
      items: payloadForEqual,
      total_comensales: totalComensales,
      fromToken: token,
      subtotal: pSubtotal,
      iva: pIva,
      total: pTotal,
      total_consumo: pTotal,
      total_from_dividir: pTotal,
    });
    return;
  };

  const handleOneExhibicion = () => {
    if (equalsSplitPaid) {
      showStyledAlert('Pago por partes iguales', 'Se está procesando un pago por partes iguales para esta venta — no puedes usar este método.');
      return;
    }

    const payloadItems = anySelected ? selectedItems : items.filter(it => !it.locked);

    if (usesExternalTotal && !anySelected) {
      navigation.navigate('OneExhibicion', {
        token,
        items: payloadItems,
        subtotal,
        iva,
        total,
        total_comensales: totalComensales,
        restaurantImage: null,
        ...sharedHiddenFields(),
      });
      return;
    }

    const pTotalRaw = payloadItems.reduce((s, it) => s + Number(it.price || 0), 0);
    const pTotal = round2(pTotalRaw);
    const pIva = round2(pTotal / 1.16 * 0.16);
    const pSubtotal = round2(pTotal - pIva);

    if (anySelected && saleId && selectedIdsArray.length > 0) {
      savePendingLocal(saleId, selectedIdsArray, pTotal).catch(e => console.warn('savePendingLocal error', e));
    }

    navigation.navigate('OneExhibicion', {
      token,
      items: payloadItems,
      subtotal: pSubtotal,
      iva: pIva,
      total: pTotal,
      total_comensales: totalComensales,
      restaurantImage: null,
      ...sharedHiddenFields(),
    });
  };

  const handleBack = () => navigation.canGoBack?.() ? navigation.goBack() : null;

  // New: share via native Share API
  const handleShare = async () => {
    try {
      const fields = sharedHiddenFields();
      const niceTotal = formatMoney(total);
      const shareParts = [];
      shareParts.push(`Cuenta compartida${fields.saleId ? ` (venta ${fields.saleId})` : ''}`);
      shareParts.push(`Total: ${niceTotal} ${moneda}`);
      if (token) shareParts.push(`Token: ${token}`);
      if (fields.total_consumo) shareParts.push(`Consumo: ${formatMoney(fields.total_consumo)} ${moneda}`);
      const message = shareParts.join('\n');

      await Share.share(
        { title: 'Compartir cuenta', message },
        {}
      );
    } catch (err) {
      console.warn('Share error', err);
      Alert.alert('Error', 'No se pudo compartir la cuenta en este momento.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fb' }}>
        <ActivityIndicator size="large" color="#0046ff" />
      </View>
    );
  }

  // computed sizes used inline
  const rightColWidth = Math.round(Math.min(360, width * 0.72));
  const whiteContentWidth = contentMaxWidth;
  const modalBoxWidth = Math.round(Math.min(width - 48, 420));

  // FIX: asegurar que los botones (shareBtnWidth) no sean más anchos que el contenedor blanco
  const whiteContentPad = Math.round(wp(4)) * 2; // paddingHorizontal * 2 (left+right)
  const shareBtnWidth = Math.round(
    Math.max(
      120,
      Math.min(
        (whiteContentWidth || (width - sidePad * 2)) - whiteContentPad,
        width - sidePad * 2 - whiteContentPad,
        420
      )
    )
  );

  // memoize styles (no recreación cada render)
  const styles = useMemo(() => makeStyles({
    wp, hp, rf, clamp, width, height,
    rightColWidth, whiteContentWidth, modalBoxWidth,
    topSafe, bottomSafe, sidePad, isNarrow
  }), [wp, hp, rf, clamp, width, height, rightColWidth, whiteContentWidth, modalBoxWidth, topSafe, bottomSafe, sidePad, isNarrow]);

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={[styles.topBar, { paddingTop: 0 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Tu cuenta</Text>
        <Text style={styles.topDate} />
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.round(hp(3) + bottomSafe), flexGrow: 1 }]}>

        {/* Ajuste: header similar al que me pasaste (logo arriba + imagen, pregunta a la derecha) */}
        <LinearGradient
          colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.0 }}
          locations={[0, 0.45, 1]}
          style={[styles.headerGradient, { paddingHorizontal: Math.max(sidePad, wp(4)), paddingTop: Math.max(12, hp(2)), paddingBottom: Math.max(24, hp(4)), borderBottomRightRadius: Math.max(28, wp(8)) }]}
        >
          <View style={[styles.gradientRow, { alignItems: 'flex-start' }]}>
            <View style={[styles.leftCol]}>
              <Image source={require('../../assets/images/logo2.png')} style={[styles.tabtrackLogo, { width: Math.round(Math.min(120, wp(28))), height: Math.round(Math.min(48, wp(28) * 0.32)), marginBottom: Math.max(8, hp(1)) }]} resizeMode="contain" />
              <View style={[styles.logoWrap, { marginTop: Math.max(6, hp(0.6)), padding: Math.max(6, wp(1.5)), borderRadius: Math.max(8, wp(2)) }]}>
                <Image source={require('../../assets/images/restaurante.jpeg')} style={[styles.restaurantImage, { width: Math.round(Math.min(96, wp(16))), height: Math.round(Math.min(96, wp(16))), borderRadius: Math.round(Math.min(96, wp(16)) * 0.16) }]} />
              </View>
            </View>

            <View style={[styles.rightCol, { maxWidth: rightColWidth, marginRight: Math.max(12, wp(3)) }]}>
              {/* Pregunta: ahora un poco más chica */}
              <Text style={[styles.divideTitle]}>{'Selecciona\ntus productos'}</Text>

              <View style={styles.stackButtons}>
                { !hideEqualButtonFlag && (
                  <TouchableOpacity style={styles.ghostButton} onPress={handlePartesIguales} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.ghostButtonText}>Partes iguales</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.whiteContent, { width: whiteContentWidth }]}>
          <Text style={styles.sectionTitle}>Por consumo</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.itemsList}>
            {items.length === 0 ? (
              <View style={{ padding: 18, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No hay productos disponibles.</Text>
              </View>
            ) : (
              items.map((it, idx) => (
                <TouchableOpacity
                  key={it.id || idx}
                  activeOpacity={it.locked ? 1 : 0.85}
                  style={[styles.itemRow, it.locked && { opacity: 0.5 }]}
                  onPress={() => !it.locked && toggleItem(idx)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: it.checked, disabled: it.locked }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.checkbox, (it.checked && !it.locked) && styles.checkboxChecked]}>
                      {it.checked && !it.locked && <View style={styles.checkboxInner} />}
                      {it.locked && <Ionicons name="lock-closed" size={Math.round(rf(3))} color="#9ca3af" />}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemText, it.locked && { color: '#9ca3af' }]} numberOfLines={1}>{it.name}</Text>
                      {it.qty > 1 && <Text style={{ fontSize: Math.round(clamp(rf(3.2), 10, 14)), color: '#9ca3af' }}>{it.qty} ×</Text>}
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemPrice, it.locked && { color: '#9ca3af' }]}>{formatMoney(Number(it.price || 0))} MXN</Text>
                    {it.locked ? <Text style={{ fontSize: Math.round(clamp(rf(2.8), 10, 12)), color: '#ef4444', marginTop: Math.round(hp(0.3)), fontWeight: '700' }}>Pagado</Text> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.beforeIvaSeparator} />

          <View style={styles.desgloseContainer}>
            <View style={styles.desgloseRow}>
              <Text style={styles.desgloseLabel}>Sub total</Text>
              <Text style={styles.desgloseValue}>{formatMoney(subtotal)} MXN</Text>
            </View>

            <View style={[styles.desgloseRow, styles.ivaRow]}>
              <Text style={[styles.desgloseLabel]}>IVA (estimado)</Text>
              <Text style={[styles.desgloseValue, styles.ivaText]}>{formatMoney(iva)} MXN</Text>
            </View>

            <View style={[styles.desgloseRow, { marginTop: Math.round(hp(0.5)) }]}>
              <Text style={[styles.desgloseLabel, { fontSize: Math.round(clamp(rf(4.6), 16, 20)) }]}>Total</Text>
              <Text style={[styles.desgloseValue, { fontSize: Math.round(clamp(rf(5.2), 18, 24)) }]}>{formatMoney(total)} MXN</Text>
            </View>
          </View>

          <View style={{ height: Math.round(hp(1)) }} />

          {/* Pagar por consumo (estilo igual al botón Compartir) */}
          <LinearGradient
            colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.shareButtonGradient, { width: shareBtnWidth, marginTop: Math.round(hp(1)) }]}
          >
            <TouchableOpacity
              onPress={handlePorConsumo}
              activeOpacity={0.9}
              style={styles.shareButtonTouchable}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.shareButtonText}>Pagar</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Compartir cuenta (Share nativo) */}
          <TouchableOpacity style={[styles.shareButton, { width: shareBtnWidth, marginTop: Math.round(hp(1)) }]} onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.shareButtonText}>Compartir cuenta</Text>
          </TouchableOpacity>

          <View style={styles.socialRow}>
  {/*           <TouchableOpacity style={styles.iconWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="logo-whatsapp" size={Math.round(rf(4))} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="logo-facebook" size={Math.round(rf(4))} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="mail-outline" size={Math.round(rf(4))} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="logo-instagram" size={Math.round(rf(4))} color="#C13584" />
            </TouchableOpacity> */}
          </View>
        </View>

        <View style={{ height: Math.round(hp(4)) }} />
      </ScrollView>

      {styledAlertVisible && (
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#fff', '#fff', '#fff']} style={[styles.modalBox, { width: modalBoxWidth }]}>
            <Ionicons name="alert-circle" size={Math.round(rf(9))} color="#0046ff" style={{ marginBottom: Math.round(hp(1)) }} />
            <Text style={[styles.modalTitle, { color: '#0046ff' }]}>{styledAlertTitle}</Text>
            <Text style={[styles.modalMessage, { color: '#000' }]}>{styledAlertMessage}</Text>

            <View style={{ width: '100%', marginTop: Math.round(hp(1)) }}>
              <TouchableOpacity style={[styles.modalBtnPrimary]} onPress={() => hideStyledAlert()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.modalBtnPrimaryText]}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

/* estilos responsivos generados por makeStyles-like (valores por defecto aquí para fallback) */
function makeStyles({ wp, hp, rf, clamp, width, height, rightColWidth, whiteContentWidth, modalBoxWidth, topSafe, bottomSafe, sidePad, isNarrow }) {
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
      paddingTop: 0,
    },
    backBtn: { width: Math.round(Math.max(44, wp(12))), alignItems: 'flex-start', justifyContent: 'center' },
    backArrow: { fontSize: Math.round(clamp(rf(7.5), 24, 40)), color: '#0b58ff', marginLeft: 2 },
    topTitle: { fontSize: Math.round(clamp(rf(4.2), 14, 18)), fontWeight: '800', color: '#0b58ff' },
    topDate: { fontSize: Math.round(clamp(rf(2.8), 10, 12)), color: '#6b7280' },

    container: { alignItems: 'center', paddingTop: Math.round(hp(1)), paddingBottom: Math.round(hp(3) + bottomSafe) },

    /* headerGradient style taken from your reference layout (Escanear) */
    headerGradient: { width: '100%', borderBottomRightRadius: Math.round(Math.max(28, wp(8))), overflow: 'hidden' },
    gradientRow: { flexDirection: 'row', justifyContent: 'space-between' },

    leftCol: { flexDirection: 'column', alignItems: 'flex-start' },
    tabtrackLogo: { },
    logoWrap: { backgroundColor: 'rgba(255,255,255,0.12)' },
    restaurantImage: { backgroundColor: '#fff' },

    rightCol: { alignItems: isNarrow ? 'flex-start' : 'flex-end', justifyContent: 'flex-start', paddingTop: 2 },
    // Pregunta un poco más pequeña que antes, y alineación responsiva (derecha en pantallas amplias)
    divideTitle: { color: '#fff', fontSize: Math.round(clamp(rf(6.6), 16, 36)), fontWeight: '900', lineHeight: Math.round(clamp(rf(7.8), 20, 42)), marginBottom: Math.round(hp(1)), textAlign: isNarrow ? 'left' : 'right', width: '100%' },

    stackButtons: { width: '100%', alignItems: isNarrow ? 'flex-start' : 'flex-end' },
    ghostButton: { width: isNarrow ? '100%' : Math.round(wp(38)), borderWidth: 1.6, borderColor: 'rgba(255,255,255,0.6)', paddingVertical: Math.round(hp(1.4)), paddingHorizontal: Math.round(wp(4)), borderRadius: Math.round(wp(2)), marginBottom: Math.round(hp(0.8)) },
    ghostButtonText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: Math.round(clamp(rf(3.6), 13, 16)) },

    pinkButton: { width: isNarrow ? '100%' : '70%', backgroundColor: '#7F00FF', paddingVertical: Math.round(hp(1.6)), paddingHorizontal: Math.round(wp(4)), borderRadius: Math.round(wp(2)), alignSelf: isNarrow ? 'stretch' : 'flex-end' },
    pinkButtonText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: Math.round(clamp(rf(3.8), 14, 18)) },

    whiteContent: { width: whiteContentWidth || Math.round(Math.min(width - Math.round(wp(2)), 960)), backgroundColor: '#fff', paddingTop: Math.round(hp(2)), paddingBottom: Math.round(hp(3)), paddingHorizontal: Math.round(wp(4)), marginTop: 0, alignSelf: 'center' },
    sectionTitle: { fontSize: Math.round(clamp(rf(5.2), 16, 22)), fontWeight: '700', color: '#111827', marginBottom: Math.round(hp(0.8)) },
    sectionDivider: { height: 1, backgroundColor: '#e9e9e9', marginBottom: Math.round(hp(1)) },

    itemsList: {},
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Math.round(hp(1.2)), borderBottomWidth: 0.6, borderBottomColor: '#f1f3f5' },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    checkbox: { width: Math.round(clamp(rf(3.6), 16, 22)), height: Math.round(clamp(rf(3.6), 16, 22)), borderRadius: Math.round(wp(0.8)), borderWidth: 1.6, borderColor: '#cbd5e1', marginRight: Math.round(wp(3)), alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { borderColor: '#0b58ff', backgroundColor: '#0b58ff' },
    checkboxInner: { width: Math.round(clamp(rf(1.6), 6, 10)), height: Math.round(clamp(rf(1.6), 6, 10)), backgroundColor: '#fff', borderRadius: Math.round(wp(0.4)) },
    itemText: { fontSize: Math.round(clamp(rf(3.8), 13, 16)), color: '#374151' },
    itemPrice: { width: Math.round(Math.min(140, wp(36))), textAlign: 'right', color: '#111827', fontSize: Math.round(clamp(rf(3.8), 12, 16)) },

    beforeIvaSeparator: { height: 1, backgroundColor: '#e9e9e9', marginTop: Math.round(hp(1)), marginBottom: Math.round(hp(1)) },

    desgloseContainer: { paddingHorizontal: 0, paddingTop: Math.round(hp(0.6)), alignSelf: 'stretch' },
    desgloseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Math.round(hp(0.8)) },
    desgloseLabel: { fontSize: Math.round(clamp(rf(3.8), 14, 18)), color: '#374151', fontWeight: '700' },
    desgloseValue: { fontSize: Math.round(clamp(rf(4.2), 16, 20)), color: '#111827', fontWeight: '900' },
    ivaRow: { paddingTop: 0 },
    ivaText: { fontWeight: '800' },

    // aseguramos que los botones estén centrados dentro del contenedor blanco
    shareButton: { backgroundColor: '#0046ff', paddingVertical: Math.round(hp(1.4)), borderRadius: Math.round(wp(2)), alignItems: 'center', marginTop: Math.round(hp(1)), alignSelf: 'center' },
    shareButtonText: { color: '#fff', fontWeight: '800', fontSize: Math.round(clamp(rf(3.8), 14, 18)) },

    socialRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Math.round(hp(1.2)) },
    iconWrap: { marginHorizontal: Math.round(wp(2.4)), width: Math.round(clamp(rf(8.8), 36, 56)), height: Math.round(clamp(rf(8.8), 36, 56)), borderRadius: Math.round(clamp(rf(8.8), 36, 56) / 2), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, borderWidth: 0.6, borderColor: '#e6eefc' },

    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    modalBox: { width: modalBoxWidth || Math.round(Math.min(width - 48, 420)), borderRadius: Math.round(wp(4)), padding: Math.round(wp(3)), alignItems: 'center' },
    modalTitle: { color: '#fff', fontSize: Math.round(clamp(rf(4.6), 16, 20)), fontWeight: '800', marginBottom: Math.round(hp(1)) },
    modalMessage: { color: '#000', fontSize: Math.round(clamp(rf(3.6), 12, 16)), textAlign: 'center', marginBottom: Math.round(hp(1.4)) },
    modalButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
modalBtnPrimary: {
 
  flex: 1,
  paddingVertical: Math.round(hp(0.4)),
  borderRadius: Math.round(wp(2.2)),
  backgroundColor: '#ffffffff',
  marginRight: Math.round(wp(2)),
  alignItems: 'center',
  justifyContent: 'center',           // centrar verticalmente
  minHeight: Math.round(hp(4)),       // da espacio para el texto
  
},modalBtnPrimaryText: {
  color: '#0046ff',                       // negro sobre rosa claro está bien
  fontWeight: '700',                   // '900' a veces falla con fuentes custom
  fontSize: Math.round(clamp(rf(3.4), 13, 16)) || 14, // fallback seguro
  includeFontPadding: false,
  textAlign: 'center',
},    
    modalBtnGhost: { flex: 1, paddingVertical: Math.round(hp(1.4)), borderRadius: Math.round(wp(2.2)), backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginLeft: Math.round(wp(2)), alignItems: 'center' },
    modalBtnGhostText: { color: '#000', fontWeight: '700', fontSize: Math.round(clamp(rf(3.4), 13, 16)) },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    shareButtonGradient: {
      borderRadius: Math.round(wp(2)),
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      alignSelf: 'center',
    },

    shareButtonTouchable: {
      width: '100%',
      paddingVertical: Math.round(hp(1.4)),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },

  });
}
