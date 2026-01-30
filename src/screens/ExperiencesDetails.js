import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Button,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VISITS_STORAGE_KEY = 'user_visits';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc';

const WHATSAPP_URL_DIRECT = 'https://api.whatsapp.com/send?phone=5214611011391&text=%C2%A1Hola!%20Quiero%20m%C3%A1s%20informaci%C3%B3n%20de%20';

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const normalize = (v) => {
  try {
    if (v === undefined || v === null) return '';
    return String(v).trim();
  } catch (e) {
    return '';
  }
};

function matchUserIds(a, b) {
  if (!a || !b) return false;
  const A = normalize(a).toLowerCase();
  const B = normalize(b).toLowerCase();
  if (!A || !B) return false;
  if (A === B) return true;
  if (A.includes(B) || B.includes(A)) return true;
  const A_local = A.split('@')[0];
  const B_local = B.split('@')[0];
  if (A_local && B_local && A_local === B_local) return true;
  return false;
}

function numericEquals(a, b) {
  if (a === undefined || b === undefined || a === null || b === null) return false;
  try {
    if (String(a) === String(b)) return true;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true;
    return false;
  } catch (e) {
    return false;
  }
}

function candidateMatchesCodigo(candidateRaw, codigoRaw) {
  const candidate = normalize(candidateRaw).toLowerCase();
  const codigo = normalize(codigoRaw).toLowerCase();
  if (!candidate || !codigo) return false;
  if (candidate === codigo) return true;
  const codigoBase = codigo.split('#')[0];
  if (codigoBase && (candidate === codigoBase)) return true;
  if (candidate.includes(codigoBase) || codigoBase.includes(candidate)) return true;
  if (candidate.includes(codigo)) return true;
  if (numericEquals(candidate, codigo)) return true;
  const candLocal = candidate.split('@')[0];
  const codeLocal = codigo.split('@')[0];
  if (candLocal && codeLocal && candLocal === codeLocal) return true;
  return false;
}

function useResponsive() {
  const { width, height } = useWindowDimensions();

  const wp = (percent) => {
    const p = Number(percent);
    if (!p) return 0;
    return Math.round((p / 100) * width);
  };
  const hp = (percent) => {
    const p = Number(percent);
    if (!p) return 0;
    return Math.round((p / 100) * height);
  };

  const rf = (percent) => {
    const p = Number(percent);
    if (!p) return 0;
    return Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  return { width, height, wp, hp, rf, clamp };
}

export default function DetailScreen({ navigation, route }) {
  const { width, wp, hp, rf, clamp } = useResponsive();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const emailRef = useRef(null);
  const MAX_STORE = 100;

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [filteredItems, setFilteredItems] = useState(null);
  const [isSplitsLoading, setIsSplitsLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const [fullItems, setFullItems] = useState(null);
  const [isFullLoading, setIsFullLoading] = useState(false);

  const [userPropinaTotal, setUserPropinaTotal] = useState(0);

  async function loadSeenIds(email) {
    if (!email) return new Set();
    try {
      const raw = await AsyncStorage.getItem(`notifications_seen_${email}`);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.warn('loadSeenIds err', e);
      return new Set();
    }
  }
  async function saveSeenIds(email, setOfIds) {
    if (!email) return;
    try {
      await AsyncStorage.setItem(`notifications_seen_${email}`, JSON.stringify(Array.from(setOfIds)));
    } catch (e) { console.warn('saveSeenIds err', e); }
  }
  async function loadStoredNotifications(email) {
    if (!email) return [];
    try {
      const raw = await AsyncStorage.getItem(`notifications_store_${email}`);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('loadStoredNotifications err', e);
      return [];
    }
  }
  async function saveStoredNotifications(email, arr) {
    if (!email) return;
    try {
      await AsyncStorage.setItem(`notifications_store_${email}`, JSON.stringify(arr.slice(0, MAX_STORE)));
    } catch (e) { console.warn('saveStoredNotifications err', e); }
  }

  function paymentUniqueId(saleId, payment, idx) {
    const part = payment?.payment_transaction_id ?? payment?.payment_id ?? payment?.fecha_creacion ?? payment?.fecha_pago ?? String(payment?.amount ?? '') + `_${idx}`;
    return `${String(saleId)}_${String(part)}`;
  }

  function todayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatMoney(n) {
    return Number.isFinite(n) ? n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  }

  function buildNotificationText({ branch, amount, date, saleId }) {
    try {
      const dt = new Date(date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      return `Pago confirmado — ${formatMoney(Number(amount || 0))} — ${dt}`;
    } catch (e) {
      return `Pago confirmado — ${formatMoney(Number(amount || 0))}`;
    }
  }

  async function fetchTodayNotificationsOnce() {
    try {
      const email = emailRef.current ?? await AsyncStorage.getItem('user_email');
      if (!email) return;
      emailRef.current = email;

      const base = API_BASE_URL.replace(/\/$/, '');
      const day = todayIso();
      const url = `${base}/api/mobileapp/usuarios/consumos?email=${encodeURIComponent(email)}&desde=${day}&hasta=${day}`;

      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (API_AUTH_TOKEN && API_AUTH_TOKEN.trim()) headers['Authorization'] = `Bearer ${API_AUTH_TOKEN}`;

      let res = null;
      try {
        res = await fetch(url, { method: 'GET', headers });
      } catch (err) {
        return;
      }
      if (!res || !res.ok) return;
      const json = await res.json();
      const ventas = Array.isArray(json?.venta_id) ? json.venta_id : (Array.isArray(json?.ventas) ? json.ventas : []);
      if (!Array.isArray(ventas) || ventas.length === 0) return;

      const seenSet = await loadSeenIds(email);
      const stored = await loadStoredNotifications(email);
      const storedById = new Map(stored.map(n => [n.id, n]));

      let added = false;

      for (const venta of ventas) {
        const saleId = venta?.venta_id ?? venta?.sale_id ?? venta?.ventaId ?? null;
        const pagos = Array.isArray(venta?.pagos) ? venta.pagos : [];
        if ((!Array.isArray(pagos) || pagos.length === 0) && Array.isArray(venta?.items_consumidos)) {
          const items = venta.items_consumidos;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const state = String(item?.estado ?? '').toLowerCase();
            if (state === 'paid' || state === 'confirmed') {
              const unique = paymentUniqueId(saleId, item, i);
              if (seenSet.has(unique) || storedById.has(unique)) continue;
              const amount = item?.precio_unitario ?? item?.subtotal ?? item?.precio ?? item?.amount ?? 0;
              const date = item?.fecha_pago ?? item?.fecha_creacion ?? venta?.fecha_cierre_venta ?? new Date().toISOString();
              const branch = venta?.nombre_sucursal ?? venta?.nombre_restaurante ?? item?.nombre_sucursal ?? '';
              const notif = {
                id: unique,
                text: buildNotificationText({ branch, amount, date, saleId }),
                amount: Number(amount || 0),
                branch: branch || '',
                date,
                saleId,
                read: false,
              };
              stored.unshift(notif);
              storedById.set(unique, notif);
              seenSet.add(unique);
              added = true;
            }
          }
          continue;
        }

        for (let i = 0; i < pagos.length; i++) {
          const pago = pagos[i];
          const status = String(pago?.status ?? pago?.estado ?? '').toLowerCase();
          if (status !== 'confirmed' && status !== 'paid') continue;
          const unique = paymentUniqueId(saleId, pago, i);
          if (seenSet.has(unique) || storedById.has(unique)) continue;
          const amount = pago?.amount ?? pago?.precio_unitario ?? pago?.subtotal ?? pago?.monto_propina ?? 0;
          const date = pago?.fecha_creacion ?? pago?.fecha_pago ?? venta?.fecha_cierre_venta ?? new Date().toISOString();
          const branch = venta?.nombre_sucursal ?? venta?.nombre_restaurante ?? pago?.nombre_sucursal ?? '';
          const notif = {
            id: unique,
            text: buildNotificationText({ branch, amount, date, saleId }),
            amount: Number(amount || 0),
            branch: branch || '',
            date,
            saleId,
            read: false,
          };
          stored.unshift(notif);
          storedById.set(unique, notif);
          seenSet.add(unique);
          added = true;
        }
      }

      if (added) {
        const uniq = Array.from(storedById.values()).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, MAX_STORE);
        await saveSeenIds(email, seenSet);
        await saveStoredNotifications(email, uniq);
        if (isMountedRef.current) setNotifications(uniq);
      } else {
        if (isMountedRef.current) {
          const sorted = stored.slice().sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, MAX_STORE);
          setNotifications(sorted);
        }
      }
    } catch (err) {
      console.warn('fetchTodayNotificationsOnce error', err);
    }
  }

  const markAllRead = async () => {
    try {
      const email = emailRef.current ?? await AsyncStorage.getItem('user_email');
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
      if (email) {
        await saveStoredNotifications(email, updated);
      }
    } catch (e) {
      console.warn('markAllRead err', e);
    }
  };

  function parseVisitsRaw(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && raw !== null) {
      try {
        return Object.values(raw);
      } catch (e) { return []; }
    }
    const str = String(raw).trim();
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed);
      }
    } catch (e) {
      const recovered = [];
      try {
        const matches = str.match(/\{[^}]*\}/g);
        if (matches && matches.length > 0) {
          for (const m of matches) {
            try { recovered.push(JSON.parse(m)); } catch (err) { /* ignore */ }
          }
          if (recovered.length > 0) return recovered;
        }
      } catch (er) { /* ignore */ }
      try {
        const lines = str.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const l of lines) {
          try { recovered.push(JSON.parse(l)); } catch (er) { /* ignore */ }
        }
        if (recovered.length > 0) return recovered;
      } catch (_) { }
      if (str.startsWith('{') && str.includes(':')) {
        try {
          const alt = str.replace(/'/g, '"');
          const p = JSON.parse(alt);
          if (p) return [p];
        } catch (err) { /* ignore */ }
      }
      return [];
    }
    return [];
  }

  const resolveCurrentUserId = async () => {
    try {
      const keys = [
        'user_email',
        'user_usuario_app_id',
        'user_usuario',
        'email',
        'user_id',
        'userId',
        'user_name',
        'usuario_app_id',
        'usuario',
      ];
      for (const k of keys) {
        try {
          const raw = await AsyncStorage.getItem(k);
          if (!raw) continue;
          const trimmed = raw.trim();
          if (!trimmed) continue;
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              const parsed = JSON.parse(trimmed);
              const candidateFields = [
                'usuario_app_id', 'user_usuario_app_id', 'user_usuario', 'usuario', 'user_email', 'email', 'id', 'user_id',
              ];
              for (const f of candidateFields) {
                if (parsed && parsed[f]) return String(parsed[f]).trim();
              }
            } catch (e) { /* ignore */ }
          }
          return trimmed;
        } catch (e) { /* ignore */ }
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const itemCandidatesFromVisitItem = (it) => {
    const raw = it.raw ?? {};
    return [
      normalize(it.id),
      normalize(it.original_line_id),
      normalize(raw.id),
      normalize(raw.item_id),
      normalize(raw.codigo),
      normalize(raw.codigo_item),
      normalize(raw.line_id),
      normalize(raw.code),
      normalize(raw.sku),
      normalize(raw.name),
      normalize(it.name),
    ].filter(Boolean);
  };

  const tryFetchSplits = async (theVisit) => {
    if (!theVisit) return;
    const saleId = theVisit.sale_id ?? theVisit.venta_id ?? theVisit.id ?? theVisit.saleId ?? theVisit.ventaId ?? null;
    const sucursalId = theVisit.sucursal_id ?? theVisit.sucursalId ?? theVisit.sucursal ?? theVisit.branchId ?? null;

    if (!saleId || !sucursalId) {
      setFilteredItems(null);
      setUserPropinaTotal(0);
      return;
    }

    setIsSplitsLoading(true);

    const curUser = normalize(await resolveCurrentUserId());
    setCurrentUserId(curUser || null);

    try {
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/transacciones-pago/sucursal/${encodeURIComponent(sucursalId)}/ventas/${encodeURIComponent(saleId)}/splits`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
        },
      });
      if (!res.ok) {
        console.warn('DetailScreen splits http', res.status);
        setFilteredItems(null);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      const json = await res.json();

      const splitsArr = Array.isArray(json.splits) ? json.splits : (Array.isArray(json.data?.splits) ? json.data.splits : []);
      const propinasArr = Array.isArray(json.propinas_por_tx)
        ? json.propinas_por_tx
        : (Array.isArray(json.data?.propinas_por_tx) ? json.data.propinas_por_tx : []);

      if (!Array.isArray(splitsArr) || splitsArr.length === 0) {
        setFilteredItems([]);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
      if (paidSplits.length === 0) {
        setFilteredItems([]);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      const visitCandidateUsers = [
        normalize(theVisit.user_email),
        normalize(theVisit.usuario_app_id),
        normalize(theVisit.user_usuario_app_id),
        normalize(theVisit.user_usuario),
        normalize(theVisit.user_email),
        normalize(theVisit.user),
        normalize(theVisit.usuario),
      ].filter(Boolean);

      const matchIdToUse = curUser || visitCandidateUsers[0] || null;

      if (!matchIdToUse) {
        setFilteredItems(null);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      const userPaidSplits = paidSplits.filter(p => {
        const uid = normalize(p.usuario_app_id ?? p.usuario ?? p.user ?? p.user_id ?? p.user_email);
        return matchUserIds(uid, matchIdToUse);
      });

      if (!userPaidSplits || userPaidSplits.length === 0) {
        setFilteredItems([]);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      const txIdSet = new Set();
      for (const s of userPaidSplits) {
        const tx = s.payment_transaction_id ?? s.paymentTransactionId ?? s.payment_transactionId ?? s.transaction_id ?? s.transactionId ?? null;
        if (tx !== undefined && tx !== null && String(tx).trim()) txIdSet.add(String(tx));
      }

      let userTipSum = 0;
      if (Array.isArray(propinasArr) && propinasArr.length > 0 && txIdSet.size > 0) {
        for (const p of propinasArr) {
          const ptx = p.payment_transaction_id ?? p.paymentTransactionId ?? p.payment_transactionId ?? p.transaction_id ?? p.transactionId ?? null;
          if (!ptx) continue;
          if (txIdSet.has(String(ptx))) {
            userTipSum += safeNum(p.monto_propina ?? p.montoPropina ?? p.amount ?? 0);
          }
        }
      }
      userTipSum = +userTipSum.toFixed(2);
      setUserPropinaTotal(userTipSum);

      const visitItems = Array.isArray(theVisit.items) ? theVisit.items : [];
      const built = [];

      for (const s of userPaidSplits) {
        const codigoRaw = normalize(s.codigo_item ?? s.codigo ?? s.item_code ?? s.item_id ?? s.codigoItem ?? null);
        const cantidad = safeNum(s.cantidad ?? s.quantity ?? 1) || 1;
        const precio = safeNum(s.precio_unitario ?? s.precio ?? s.price ?? s.subtotal ?? 0);
        const nombre = s.nombre_item ?? s.nombre ?? s.item_name ?? s.title ?? `Item ${codigoRaw || ''}`;

        let matched = null;
        if (visitItems && visitItems.length > 0) {
          for (const it of visitItems) {
            const cands = itemCandidatesFromVisitItem(it);
            const anyMatch = cands.some(c => candidateMatchesCodigo(c, codigoRaw));
            if (anyMatch) {
              matched = it;
              break;
            }
            if (codigoRaw) {
              const anyBaseMatch = cands.some(c => {
                const cand = normalize(c).toLowerCase();
                if (!cand) return false;
                const codigoBase = String(codigoRaw).split('#')[0];
                if (cand === codigoBase) return true;
                if (cand.includes(codigoBase) || codigoBase.includes(cand)) return true;
                return false;
              });
              if (anyBaseMatch) {
                matched = it;
                break;
              }
            }
          }
        }

        const thisTx = s.payment_transaction_id ?? s.paymentTransactionId ?? null;
        let thisSplitTip = 0;
        if (thisTx && Array.isArray(propinasArr)) {
          for (const p of propinasArr) {
            const ptx = p.payment_transaction_id ?? p.paymentTransactionId ?? null;
            if (ptx && String(ptx) === String(thisTx)) {
              thisSplitTip += safeNum(p.monto_propina ?? p.montoPropina ?? 0);
            }
          }
        }
        thisSplitTip = +thisSplitTip.toFixed(2);

        if (matched) {
          const unitPrice = safeNum(matched.unitPrice ?? matched.price ?? matched.lineTotal ?? precio) || precio;
          const lineTotal = +(unitPrice * cantidad);
          built.push({
            name: matched.name ?? nombre,
            qty: cantidad,
            unitPrice,
            lineTotal: +lineTotal.toFixed(2),
            matchedOriginal: matched,
            payment_transaction_id: thisTx,
            splitTip: thisSplitTip,
          });
        } else {
          const lineTotal = +(precio * cantidad);
          built.push({
            name: nombre ?? `Item ${codigoRaw || '—'}`,
            qty: cantidad,
            unitPrice: precio,
            lineTotal: +lineTotal.toFixed(2),
            matchedOriginal: null,
            codigo: codigoRaw,
            payment_transaction_id: thisTx,
            splitTip: thisSplitTip,
          });
        }
      }

      const aggregated = [];
      for (const it of built) {
        const key = `${it.name}||${it.unitPrice}`;
        const foundIdx = aggregated.findIndex(a => a.key === key);
        if (foundIdx >= 0) {
          aggregated[foundIdx].qty += it.qty;
          aggregated[foundIdx].lineTotal = +(aggregated[foundIdx].lineTotal + safeNum(it.lineTotal)).toFixed(2);
          aggregated[foundIdx].splitTip = +(aggregated[foundIdx].splitTip + safeNum(it.splitTip)).toFixed(2);
        } else {
          aggregated.push({ key, name: it.name, qty: it.qty, unitPrice: it.unitPrice, lineTotal: +safeNum(it.lineTotal).toFixed(2), splitTip: +safeNum(it.splitTip).toFixed(2) });
        }
      }

      setFilteredItems(aggregated);
    } catch (err) {
      console.warn('DetailScreen fetch splits error', err);
      setFilteredItems(null);
      setUserPropinaTotal(0);
    } finally {
      setIsSplitsLoading(false);
    }
  };

  const formatDateYMD = (d) => {
    if (!d) return '';
    const dt = (d instanceof Date) ? d : new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchFullAccount = async (saleId, sucursalId, dateForRange) => {
    if (!saleId || !sucursalId) {
      setFullItems([]);
      return;
    }
    setIsFullLoading(true);
    try {
      const desde = formatDateYMD(new Date(dateForRange));
      const hasta = formatDateYMD(new Date(dateForRange));
      const url = `${API_BASE_URL.replace(/\/$/, '')}/api/mobileapp/usuarios/consumos?venta_id=${encodeURIComponent(saleId)}&sucursal_id=${encodeURIComponent(sucursalId)}&desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
        },
      });
      if (!res.ok) {
        console.warn('fetchFullAccount http', res.status);
        setFullItems([]);
        setIsFullLoading(false);
        return;
      }
      const json = await res.json().catch(() => null);
      if (!json) {
        setFullItems([]);
        setIsFullLoading(false);
        return;
      }

      const gathered = [];
      const emailsObj = json.emails;
      if (emailsObj && typeof emailsObj === 'object') {
        for (const k of Object.keys(emailsObj)) {
          const arr = Array.isArray(emailsObj[k]) ? emailsObj[k] : [];
          for (const saleEntry of arr) {
            const items = Array.isArray(saleEntry.items_consumidos) ? saleEntry.items_consumidos : (Array.isArray(saleEntry.items) ? saleEntry.items : []);
            for (const it of items) {
              const qty = safeNum(it.cantidad ?? it.quantity ?? 1) || 1;
              const name = it.nombre_item ?? it.nombre ?? it.name ?? it.item_name ?? 'Item';
              const unit = safeNum(it.precio_unitario ?? it.precio ?? it.price ?? it.unit_price ?? 0) || 0;
              gathered.push({ name: String(name).trim(), qty, unit, lineTotal: +(qty * unit) });
            }
          }
        }
      } else {
        const candidateArrays = [];
        if (Array.isArray(json.data)) candidateArrays.push(...json.data);
        if (Array.isArray(json.ventas)) candidateArrays.push(...json.ventas);
        if (Array.isArray(json)) candidateArrays.push(...json);
        if (candidateArrays.length === 0) {
          for (const key of Object.keys(json)) {
            try {
              const val = json[key];
              if (Array.isArray(val)) {
                candidateArrays.push(...val);
              }
            } catch (e) { /* ignore */ }
          }
        }

        if (candidateArrays.length > 0) {
          for (const saleEntry of candidateArrays) {
            const items = Array.isArray(saleEntry.items_consumidos) ? saleEntry.items_consumidos : (Array.isArray(saleEntry.items) ? saleEntry.items : []);
            for (const it of items) {
              const qty = safeNum(it.cantidad ?? it.quantity ?? 1) || 1;
              const name = it.nombre_item ?? it.nombre ?? it.name ?? it.item_name ?? 'Item';
              const unit = safeNum(it.precio_unitario ?? it.precio ?? it.price ?? it.unit_price ?? 0) || 0;
              gathered.push({ name: String(name).trim(), qty, unit, lineTotal: +(qty * unit) });
            }
          }
        }
      }

      if (gathered.length === 0) {
        const stack = [json];
        while (stack.length > 0) {
          const node = stack.pop();
          if (!node || typeof node !== 'object') continue;
          if (Array.isArray(node)) {
            for (const entry of node) stack.push(entry);
            continue;
          }
          if (Array.isArray(node.items_consumidos)) {
            for (const it of node.items_consumidos) {
              const qty = safeNum(it.cantidad ?? it.quantity ?? 1) || 1;
              const name = it.nombre_item ?? it.nombre ?? it.name ?? it.item_name ?? 'Item';
              const unit = safeNum(it.precio_unitario ?? it.precio ?? it.price ?? it.unit_price ?? 0) || 0;
              gathered.push({ name: String(name).trim(), qty, unit, lineTotal: +(qty * unit) });
            }
          }
          for (const k of Object.keys(node)) {
            try { stack.push(node[k]); } catch (e) { /* ignore */ }
          }
        }
      }

      const aggregated = [];
      for (const it of gathered) {
        const key = `${it.name}||${it.unit}`;
        const idx = aggregated.findIndex(a => a.key === key);
        if (idx >= 0) {
          aggregated[idx].qty += safeNum(it.qty);
          aggregated[idx].lineTotal = +(aggregated[idx].lineTotal + safeNum(it.lineTotal)).toFixed(2);
        } else {
          aggregated.push({ key, name: it.name, qty: safeNum(it.qty), unitPrice: safeNum(it.unit), lineTotal: +safeNum(it.lineTotal).toFixed(2) });
        }
      }

      setFullItems(aggregated);
    } catch (err) {
      console.warn('fetchFullAccount error', err);
      setFullItems([]);
    } finally {
      setIsFullLoading(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    try {
      const paramUrl = route?.params?.whatsapp_url ?? route?.params?.whatsappUrl ?? null;
      const visitUrl = (visit && (visit.whatsapp_url ?? visit.whatsappUrl ?? visit.whatsapp)) ?? null;
      const urlToOpen = paramUrl || visitUrl || WHATSAPP_URL_DIRECT;

      if (!urlToOpen || String(urlToOpen).trim().length === 0) {
        Alert.alert('URL no disponible', 'No se encontró la URL de WhatsApp para abrir.');
        return;
      }

      const cleaned = String(urlToOpen).trim().replace(/^"+|"+$/g, '').replace(/^\'+|\'+$/g, '');

      const can = await Linking.canOpenURL(cleaned);
      if (!can) {
        try {
          const enc = encodeURI(cleaned);
          const can2 = await Linking.canOpenURL(enc);
          if (!can2) {
            Alert.alert('No se puede abrir', 'No pude abrir la URL de WhatsApp en este dispositivo.');
            return;
          }
          await Linking.openURL(enc);
          return;
        } catch (e) {
          Alert.alert('Error', 'No se pudo abrir WhatsApp.');
          console.warn('handleOpenWhatsApp fallback error', e);
          return;
        }
      }

      await Linking.openURL(cleaned);
    } catch (err) {
      console.warn('handleOpenWhatsApp error', err);
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Revisa la URL.');
    }
  };

  useEffect(() => {
    (async () => {
      if (route?.params?.visit) {
        setVisit(route.params.visit);
        setLoading(false);
        try { await tryFetchSplits(route.params.visit); } catch (e) { /* noop */ }
        return;
      }

      const id = route?.params?.visitId ?? route?.params?.id ?? null;
      if (id) {
        try {
          const raw = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
          const arr = parseVisitsRaw(raw);
          const found = arr.find(a => {
            try {
              return String(a?.id) === String(id) || String(a?.sale_id) === String(id) || String(a?.saleId) === String(id);
            } catch (e) { return false; }
          });
          if (found) {
            setVisit(found);
            try { await tryFetchSplits(found); } catch (e) { /* noop */ }
          }
        } catch (e) {
          console.warn('DetailScreen load visit err', e);
        }
      }
      setLoading(false);
    })();

    isMountedRef.current = true;
    (async () => {
      const e = await AsyncStorage.getItem('user_email');
      emailRef.current = e ?? null;
      if (emailRef.current) {
        const stored = await loadStoredNotifications(emailRef.current);
        if (isMountedRef.current && Array.isArray(stored) && stored.length > 0) {
          const sorted = stored.slice().sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
          setNotifications(sorted);
        }
      }

      await fetchTodayNotificationsOnce();
      const pollSeconds = 12;
      pollIntervalRef.current = setInterval(() => {
        fetchTodayNotificationsOnce().catch(err => console.warn('poll fetch error', err));
      }, pollSeconds * 1000);
    })();

    const focusUnsub = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchTodayNotificationsOnce().catch(()=>{});
    }) : null;

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (focusUnsub && typeof focusUnsub === 'function') focusUnsub();
    };
  }, [route]);

  const unreadCount = notifications.filter(n => !n.read).length;

  function NotificationRow({ n }) {
    const dateLabel = n.date ? new Date(n.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return (
      <View style={[styles.notificationItemLarge, n.read ? styles.readCard : styles.unreadCard]}>
        <View style={styles.notLeft}>
          <Text style={styles.notBranch} numberOfLines={1}>{n.branch || `Venta ${n.saleId || ''}`}</Text>
          {/* <Text style={styles.notSale}>Venta: {n.saleId ?? '-'}</Text> */}
          <Text style={styles.notDate}>{dateLabel}</Text>
        </View>

        <View style={styles.notRight}>
          <Text style={styles.notAmount}>{formatMoney(n.amount ?? 0)}</Text>
          <Text style={styles.notCurrency}>MXN</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0046ff" />
        <Text style={{ marginTop: 8 }}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingHorizontal: Math.max(12, wp(4)), paddingVertical: Math.max(10, hp(1.6)) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={clamp(rf(3.6), 20, 30)} color={styles.headerTitle.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: clamp(rf(4.0), 18, 24) }]}>Experiencias</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => setShowNotifications(true)} style={[styles.headerButton, { marginLeft: 16 }]}>
              <Ionicons name="notifications-outline" size={clamp(rf(2.6), 19, 32)} color="#0051c9" />
              {unreadCount > 0 && (<View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>)}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ padding: Math.max(12, wp(4)) }}>
          <Text>No se encontró la visita seleccionada.</Text>
          <Button title="Volver" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const total = safeNum(visit.total ?? visit.amount ?? visit.sale_total ?? visit.monto_subtotal ?? 0);

  const visitPropina = safeNum(
    visit.monto_propina ??
    visit.propina ??
    visit.tip ??
    visit.monto_tip ??
    visit.montoPropina ??
    visit.tip_amount ??
    0
  );

  const taxableTotal = Math.max(0, total - visitPropina);
  const ivaTotal = +(taxableTotal / 1.16 * 0.16).toFixed(2);
  const subtotalTotal = +(taxableTotal - ivaTotal).toFixed(2);

  const computeFullTotals = () => {
    if (!Array.isArray(fullItems) || fullItems.length === 0) return { subtotal: 0, iva: 0, total: 0 };
    const totalFromItems = fullItems.reduce((s, it) => s + safeNum(it.lineTotal ?? (it.qty * (it.unitPrice ?? 0))), 0);
    const iva = +( (totalFromItems / 1.16) * 0.16 ).toFixed(2);
    const subtotal = +(totalFromItems - iva).toFixed(2);
    return { subtotal, iva, total: +( (subtotal + iva) ).toFixed(2) };
  };
  const fullTotals = computeFullTotals();

  const shouldShowFiltered = !showFull && Array.isArray(filteredItems) && filteredItems.length > 0;
  const showNoPaidMessage = !showFull && Array.isArray(filteredItems) && filteredItems.length === 0 && filteredItems !== null;

  const computeFilteredTotals = () => {
    const totalPaid = shouldShowFiltered ? filteredItems.reduce((s, it) => s + safeNum(it.lineTotal ?? 0), 0) : 0;
    const ivaFiltered = +(totalPaid / 1.16 * 0.16).toFixed(2);
    const subtotalFiltered = +(totalPaid - ivaFiltered).toFixed(2);

    let propinaFiltered = 0;
    if (userPropinaTotal && userPropinaTotal > 0) {
      propinaFiltered = +userPropinaTotal.toFixed(2);
    } else {
      if (subtotalTotal > 0) {
        const share = subtotalFiltered / subtotalTotal;
        propinaFiltered = +(visitPropina * share).toFixed(2);
      } else {
        propinaFiltered = 0;
      }
    }

    const totalDisplayed = +((totalPaid || 0) + (propinaFiltered || 0)).toFixed(2);

    return { subtotal: subtotalFiltered, iva: ivaFiltered, propina: propinaFiltered, total: totalDisplayed };
  };

  const filteredTotals = shouldShowFiltered ? computeFilteredTotals() : null;

  const contentPadding = Math.max(12, wp(4));
  const totalLogoWrapperSize = clamp(Math.round(wp(20)), 48, 90);
  const totalAmountFont = clamp(rf(7), 18, 34);
  const sectionHeadingFont = clamp(rf(3.6), 16, 22);
  const itemFont = clamp(rf(2.8), 12, 16);
  const itemPriceFont = clamp(rf(3), 12, 16);
  const btnPaddingVert = Math.max(8, hp(1.2));
  const modalWidth = Math.min(Math.max(wp(90), 300), 920);

  const handleToggleFull = async () => {
    const newShow = !showFull;
    setShowFull(newShow);

    if (newShow) {
      if (fullItems === null) {
        const saleId = visit.sale_id ?? visit.venta_id ?? visit.id ?? visit.saleId ?? visit.ventaId ?? null;
        const sucursalId = visit.sucursal_id ?? visit.sucursalId ?? visit.sucursal ?? visit.branchId ?? null;
        const dateForRange = visit.fecha ?? new Date();
        await fetchFullAccount(saleId, sucursalId, dateForRange);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }]}>
      <StatusBar barStyle="dark-content" />

      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: clamp(rf(3.6), 16, 20) }]}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name="close" size={clamp(rf(3), 16, 22)} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalListHeader}>
              <Text style={styles.modalListHeaderText}>Últimas notificaciones</Text>
              <TouchableOpacity onPress={markAllRead}>
{/*                 <Text style={styles.markAllText}>Marcar todo leído</Text>*/}
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalList, { maxHeight: Math.round(Math.min(hp(60), 420)) }]}>
              {notifications && notifications.length > 0 ? (
                notifications.map(n => <NotificationRow key={n.id} n={n} />)
              ) : (
                <View style={styles.noNotifications}>
                  <Text style={styles.noNotificationsText}>No hay notificaciones nuevas.</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.markReadButton, { margin: Math.round(Math.min(Math.max(wp(4), 10), 28)) }]} onPress={markAllRead}>
              <Text style={[styles.markReadText, { fontSize: clamp(rf(3.6), 13, 16) }]}>Marcar todo como leído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { paddingHorizontal: Math.max(12, wp(4)), paddingVertical: Math.max(10, hp(1.6)) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={clamp(rf(3.6), 20, 30)} color={styles.headerTitle.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: clamp(rf(4.0), 18, 24) }]}>Experiencias</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setShowNotifications(true)} style={[styles.headerButton, { marginLeft: 16 }]}>
            <Ionicons name="notifications-outline" size={clamp(rf(3.6), 20, 28)} color="#0051c9" />
            {unreadCount > 0 && (<View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>)}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: contentPadding }]}>
        <Text style={[styles.sectionHeading, { fontSize: sectionHeadingFont }]}>Detalle</Text>

        <View style={styles.totalRow}>
          <View style={[styles.totalLogoWrapper, {
            width: totalLogoWrapperSize,
            height: totalLogoWrapperSize,
            borderRadius: Math.round(totalLogoWrapperSize / 2),
            marginRight: Math.max(8, wp(3)),
            overflow: 'hidden',
          }]}>
            {visit.restaurantImage ? (
              <Image
                source={{ uri: visit.restaurantImage }}
                style={{
                  width: '100%',
                  height: '100%',
                  resizeMode: 'cover',
                  borderRadius: Math.round(totalLogoWrapperSize / 2),
                }}
              />
            ) : (
              <Image
                source={require('../../assets/images/restaurante.jpeg')}
                style={{
                  width: '100%',
                  height: '100%',
                  resizeMode: 'cover',
                  borderRadius: Math.round(totalLogoWrapperSize / 2),
                }}
              />
            )}
          </View>
          <View style={styles.totalTextWrapper}>
            <Text style={[styles.totalLabel, { fontSize: clamp(rf(3.2), 14, 18) }]}>{visit.restaurantName ?? 'Restaurante'}</Text>
            <Text style={[styles.totalAmount, { fontSize: totalAmountFont, lineHeight: Math.round(totalAmountFont * 1.05) }]}>${total.toFixed(2)} {visit.moneda ?? 'MXN'}</Text>
            <Text style={[styles.totalSubtitle, { fontSize: clamp(rf(2.4), 11, 14) }]}>
              {showFull ? 'Cuenta completa' : (shouldShowFiltered ? 'Detalle - lo que pagaste' : 'Cuenta completa')}
            </Text>
          </View>
        </View>

        <View style={styles.dottedDivider} />

        <Text style={[styles.tableInfo, { fontSize: clamp(rf(2.8), 12, 16) }]}>Mesa {visit.mesa ?? '—'} / {visit.fecha ? new Date(visit.fecha).toLocaleString() : '—'}</Text>

        {isSplitsLoading ? (
          <View style={{ padding: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0046ff" />
            <Text style={{ marginTop: 8, color: '#444' }}>Obteniendo tu parte…</Text>
          </View>
        ) : null}

        {shouldShowFiltered ? (
          <>
            {filteredItems.map((it, i) => (
              <View key={it.key ?? i} style={styles.itemRow}>
                <Text style={[styles.itemName, { fontSize: itemFont }]}>{it.name}</Text>
                <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>
                  {(Number(it.lineTotal ?? 0)).toFixed(2)} {visit.moneda ?? 'MXN'}
                </Text>
              </View>
            ))}

            <View style={styles.dottedDivider} />

            <View style={styles.itemRow}>
              <Text style={[styles.itemName, { fontSize: itemFont }]}>Subtotal </Text>
              <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${filteredTotals ? filteredTotals.subtotal.toFixed(2) : '0.00'} {visit.moneda ?? 'MXN'}</Text>
            </View>

            <View style={styles.itemRow}>
              <Text style={[styles.itemName, { fontSize: itemFont }]}>IVA </Text>
              <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${filteredTotals ? filteredTotals.iva.toFixed(2) : '0.00'} {visit.moneda ?? 'MXN'}</Text>
            </View>

            <View style={styles.itemRow}>
              <Text style={[styles.itemName, { fontSize: itemFont }]}>Propina</Text>
              <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${filteredTotals ? filteredTotals.propina.toFixed(2) : '0.00'} {visit.moneda ?? 'MXN'}</Text>
            </View>

            <View style={[styles.itemRow, { marginTop: 6 }]}>
              <Text style={[styles.itemName, { fontWeight: '800', fontSize: itemFont }]}>Total tu parte</Text>
              <Text style={[styles.itemPrice, { fontWeight: '900', fontSize: itemPriceFont }]}>${filteredTotals ? filteredTotals.total.toFixed(2) : '0.00'} {visit.moneda ?? 'MXN'}</Text>
            </View>
          </>
        ) : showNoPaidMessage ? (
          <View style={{ padding: 12 }}>
            <Text style={{ color: '#666' }}>No se encontraron items pagados por este usuario en la transacción.</Text>
            <Text style={{ color: '#666', marginTop: 6 }}>Pulsa "Ver cuenta completa" para ver la cuenta completa.</Text>
          </View>
        ) : (
          <>
            {showFull ? (
              <>
                {isFullLoading ? (
                  <View style={{ padding: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0046ff" />
                    <Text style={{ marginTop: 8, color: '#444' }}>Obteniendo cuenta completa…</Text>
                  </View>
                ) : (
                  <>
                    {Array.isArray(fullItems) && fullItems.length > 0 ? (
                      fullItems.map((it, idx) => (
                        <View key={it.key ?? `full_${idx}`} style={styles.itemRow}>
                          <Text style={[styles.itemName, { fontSize: itemFont }]}>{it.name}</Text>
                          <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>
                            {(Number(it.lineTotal ?? 0)).toFixed(2)} {visit.moneda ?? 'MXN'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={{ padding: 8 }}><Text style={{ color: '#666' }}>No se encontraron items en la cuenta completa.</Text></View>
                    )}

                    <View style={styles.dottedDivider} />

                    <View style={styles.itemRow}>
                      <Text style={[styles.itemName, { fontSize: itemFont }]}>Subtotal</Text>
                      <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${fullTotals.subtotal.toFixed(2)} {visit.moneda ?? 'MXN'}</Text>
                    </View>

                    <View style={styles.itemRow}>
                      <Text style={[styles.itemName, { fontSize: itemFont }]}>IVA</Text>
                      <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${fullTotals.iva.toFixed(2)} {visit.moneda ?? 'MXN'}</Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                {Array.isArray(visit.items) && visit.items.length > 0 ? visit.items.map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={[styles.itemName, { fontSize: itemFont }]}>{it.name ?? it.nombre ?? `Item ${i + 1}`}</Text>
                    <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>
                      {(Number(it.lineTotal ?? it.unitPrice ?? it.price ?? it.amount ?? 0)).toFixed(2)} {visit.moneda ?? 'MXN'}
                    </Text>
                  </View>
                )) : (
                  <View style={{ padding: 8 }}><Text style={{ color: '#666' }}>No hay items grabados.</Text></View>
                )}

                <View style={styles.dottedDivider} />

                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { fontSize: itemFont }]}>Subtotal</Text>
                  <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${subtotalTotal.toFixed(2)} {visit.moneda ?? 'MXN'}</Text>
                </View>

                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { fontSize: itemFont }]}>IVA</Text>
                  <Text style={[styles.itemPrice, { fontSize: itemPriceFont }]}>${ivaTotal.toFixed(2)} {visit.moneda ?? 'MXN'}</Text>
                </View>
              </>
            )}
          </>
        )}

        <View style={[styles.pointsRow, { marginTop: Math.max(18, hp(2.5)) }]}>
          <TouchableOpacity
            style={[styles.verCuentaBtn, { paddingVertical: btnPaddingVert, paddingHorizontal: Math.max(10, wp(3)) }]}
            onPress={handleToggleFull}
          >
            <Text style={[styles.verCuentaBtnText, { fontSize: clamp(rf(2.8), 12, 16) }]}>
              {showFull ? 'Ver tu consumo' : 'Ver cuenta completa'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.invoiceBtn, { paddingVertical: btnPaddingVert, paddingHorizontal: Math.max(12, wp(4)) }]} onPress={handleOpenWhatsApp} activeOpacity={0.85}>
            <Text style={[styles.invoiceBtnText, { fontSize: clamp(rf(2.8), 12, 16) }]}>Pedir Factura</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomButtons, { marginTop: Math.max(20, hp(3)), marginBottom: Math.max(18, hp(3)) }]}>
          <TouchableOpacity style={[styles.bottomBtn, { paddingVertical: btnPaddingVert }]} onPress={() => navigation.navigate('Opinion', { visit, sale_id: visit.sale_id ?? visit.venta_id, sucursal_id: visit.sucursal_id })}>
            <Text style={[styles.bottomBtnText, { fontSize: clamp(rf(2.8), 12, 16) }]}>Calificar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const BLUE = '#0046ff';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BLUE, justifyContent: 'space-between' },
  headerTitle: { fontWeight: '600', color: BLUE },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  logo: { resizeMode: 'contain' },
  scrollContent: { /* padding dinamico desde JSX */ },
  sectionHeading: { fontWeight: '600', color: BLUE, marginBottom: 16 },
  totalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  totalLogoWrapper: { borderWidth: 1, borderColor: BLUE, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  totalLogo: { resizeMode: 'contain' },
  totalTextWrapper: { flex: 1 },
  totalLabel: { color: BLUE },
  totalAmount: { fontWeight: '700', color: BLUE },
  totalSubtitle: { color: '#555' },
  dottedDivider: { borderBottomWidth: 1, borderStyle: 'dotted', borderColor: '#aaa', marginVertical: 12 },
  tableInfo: { fontWeight: '600', marginBottom: 12, color:'#000000' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { color: '#000' },
  itemPrice: { color: '#000', fontWeight: '700' },
  pointsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  invoiceBtn: { marginLeft: 'auto', backgroundColor: BLUE, borderRadius: 10 },
  invoiceBtnText: { color: '#fff', fontWeight: '600' },
  verCuentaBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: BLUE, borderRadius: 10 },
  verCuentaBtnText: { color: BLUE, fontWeight: '700' },

  bottomButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  bottomBtn: { flex: 1, backgroundColor: BLUE, marginHorizontal: 4, borderRadius: 10 },
  bottomBtnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },

  headerButton: { padding: 8 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 8, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontWeight: '600', color: '#333' },

  modalListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f1f1' },
  modalListHeaderText: { fontWeight: '700', color: '#222' },
  markAllText: { color: '#0066FF', fontWeight: '700' },

  modalList: { paddingHorizontal: 12 },

  notificationItemLarge: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eef3ff',
    backgroundColor: '#fff'
  },
  unreadCard: { backgroundColor: '#f2f8ff', borderColor: '#d7e8ff' },
  readCard: { backgroundColor: '#ffffff', borderColor: '#f0f0f0' },

  notLeft: { flex: 1, paddingRight: 8 },
  notRight: { alignItems: 'flex-end', justifyContent: 'center' },

  notBranch: { fontWeight: '800', fontSize: 14, color: '#111', marginBottom: 2 },
  notSale: { color: '#666', fontSize: 12, marginBottom: 2 },
  notDate: { color: '#888', fontSize: 11 },

  notAmount: { fontWeight: '900', fontSize: 16, color: '#0b58ff' },
  notCurrency: { color: '#666', fontSize: 11 },

  noNotifications: { padding: 28, alignItems: 'center', justifyContent: 'center' },
  noNotificationsText: { color: '#666' },

  markReadButton: { padding: 12, backgroundColor: '#0046ff', alignItems: 'center', margin: 16, borderRadius: 8 },
  markReadText: { color: '#fff', fontWeight: '600' },

});
