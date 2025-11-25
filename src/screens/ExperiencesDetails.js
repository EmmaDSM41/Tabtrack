import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VISITS_STORAGE_KEY = 'user_visits';

const API_BASE_URL = 'https://api.tab-track.com';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MjE4NzAyOCwianRpIjoiMTdlYTVjYTAtZTE3MC00ZjIzLTllMTgtZmZiZWYyMzg4OTE0IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjIxODcwMjgsImV4cCI6MTc2NDc3OTAyOCwicm9sIjoiRWRpdG9yIn0.W_zoGW2YpqCyaxpE1c_hnRXdtw5ty0DDd8jqvDbi6G0';  

const WHATSAPP_URL_DIRECT = 'https://api.whatsapp.com/send?phone=5214611011391&text=%C2%A1Hola!%20Quiero%20m%C3%A1s%20informaci%C3%B3n%20de%20';

const sampleNotifications = [
  { id: 'n1', text: 'Tu reserva en La Pizzería fue confirmada.', read: false },
  { id: 'n2', text: 'Nueva oferta: 20% de descuento en Sushi Place.', read: false },
  { id: 'n3', text: 'Recuerda calificar tu última visita a Café Central.', read: true },
];

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

/* -------------------------------------------------------------------- */
/* RESPONSIVE: pequeño hook utilitario (sin dependencias externas)       */
/* -------------------------------------------------------------------- */
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
    return Math.round((p / 100) * width);
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  return { width, height, wp, hp, rf, clamp };
}
/* -------------------------------------------------------------------- */

export default function DetailScreen({ navigation, route }) {
  const { width, wp, hp, rf, clamp } = useResponsive(); // RESPONSIVE hook

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [filteredItems, setFilteredItems] = useState(null); // null = not attempted, [] = attempted but none found
  const [isSplitsLoading, setIsSplitsLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Nuevo estado: total de propina atribuible al usuario según propinas_por_tx
  const [userPropinaTotal, setUserPropinaTotal] = useState(0);

  useEffect(() => {
    setNotifications(sampleNotifications);
    (async () => {
      // si nos pasan la visita en params, la usamos directamente
      if (route?.params?.visit) {
        setVisit(route.params.visit);
        setLoading(false);
        try { await tryFetchSplits(route.params.visit); } catch (e) { /* noop */ }
        return;
      }

      // si nos pasan un id, buscar en storage
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // función tolerantísima para parsear lo que haya en storage bajo VISITS_STORAGE_KEY
  function parseVisitsRaw(raw) {
    if (!raw) return [];
    // si ya es un array (p. ej. en algunos entornos AsyncStorage puede devolver objeto), manejarlo
    if (Array.isArray(raw)) return raw;
    // Si raw ya es un objeto serializable (caso raro), convertir a array
    if (typeof raw === 'object' && raw !== null) {
      try {
        return Object.values(raw);
      } catch (e) { return []; }
    }

    const str = String(raw).trim();
    if (!str) return [];

    // intento normal JSON.parse
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed);
      }
    } catch (e) {
      // intentar recuperar múltiples objetos JSON pegados o líneas con JSON
      const recovered = [];
      try {
        // buscar bloques JSON con regex (bastante tolerante)
        const matches = str.match(/\{[^}]*\}/g);
        if (matches && matches.length > 0) {
          for (const m of matches) {
            try { recovered.push(JSON.parse(m)); } catch (err) { /* ignore */ }
          }
          if (recovered.length > 0) return recovered;
        }
      } catch (er) { /* ignore */ }

      // intentar separar por líneas y parsear cada línea
      try {
        const lines = str.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const l of lines) {
          try { recovered.push(JSON.parse(l)); } catch (er) { /* ignore */ }
        }
        if (recovered.length > 0) return recovered;
      } catch (_) { }

      // como último recurso, si la cadena parece un objeto con comillas simples intentar reemplazar comillas simples por dobles
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

  // resolveCurrentUserId: lee múltiples keys y soporta casos donde la key contiene JSON
  const resolveCurrentUserId = async () => {
    try {
      const keys = [
        'user_email',
        'user_usuario_app_id', // <-- prioridad (según tu login)
        'user_usuario',
        'email',
        'user_id',
        'userId',
        'user_name',
        'usuario_app_id',
        'usuario', // por si en storage quedó otro nombre
      ];
      for (const k of keys) {
        try {
          const raw = await AsyncStorage.getItem(k);
          if (!raw) continue;
          const trimmed = raw.trim();
          if (!trimmed) continue;
          // si es JSON con campo usuario_app_id u otros, parsearlo
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              const parsed = JSON.parse(trimmed);
              // buscar variantes dentro del objeto
              const candidateFields = [
                'usuario_app_id', 'user_usuario_app_id', 'user_usuario', 'usuario', 'user_email', 'email', 'id', 'user_id',
              ];
              for (const f of candidateFields) {
                if (parsed && parsed[f]) return String(parsed[f]).trim();
              }
            } catch (e) {
              // no JSON válido, seguir
            }
          }
          // si no es JSON, devolver el valor directamente
          return trimmed;
        } catch (e) {
          // ignore key read error
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // construir lista de candidatos para emparejar items (codigo, id, sku, nombre)
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

  // fetch splits y construir filteredItems (lo pagado por el usuario actual)
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

    // resolver current user id
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

      // extraer splits y propinas_por_tx (compatibilidad con distintas formas del endpoint)
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

      // quedarnos solo con paid
      const paidSplits = splitsArr.filter(s => String(s.estado ?? '').toLowerCase() === 'paid');
      if (paidSplits.length === 0) {
        setFilteredItems([]);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      // match usuario: usar current user id si lo tenemos, sino fallback a posibles properties en la visita
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

      // si no tenemos matchIdToUse, no podemos filtrar por usuario: devolvemos null (no filtrar)
      if (!matchIdToUse) {
        setFilteredItems(null);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      // filtrar paid splits por usuario (tolerante)
      const userPaidSplits = paidSplits.filter(p => {
        const uid = normalize(p.usuario_app_id ?? p.usuario ?? p.user ?? p.user_id ?? p.user_email);
        return matchUserIds(uid, matchIdToUse);
      });

      if (!userPaidSplits || userPaidSplits.length === 0) {
        // no hay paid splits para este usuario -> indicar vacío
        setFilteredItems([]);
        setUserPropinaTotal(0);
        setIsSplitsLoading(false);
        return;
      }

      // Construir lista de payment_transaction_id asociados a lo que pagó el usuario
      const txIdSet = new Set();
      for (const s of userPaidSplits) {
        const tx = s.payment_transaction_id ?? s.paymentTransactionId ?? s.payment_transactionId ?? s.transaction_id ?? s.transactionId ?? null;
        if (tx !== undefined && tx !== null && String(tx).trim()) txIdSet.add(String(tx));
      }

      // sumar propinas_por_tx que correspondan a esos transaction ids
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

      // construir items desde los splits pagados por el usuario
      const visitItems = Array.isArray(theVisit.items) ? theVisit.items : [];
      const built = [];

      for (const s of userPaidSplits) {
        const codigoRaw = normalize(s.codigo_item ?? s.codigo ?? s.item_code ?? s.item_id ?? s.codigoItem ?? null);
        const codigoBase = codigoRaw ? String(codigoRaw).split('#')[0] : '';
        const cantidad = safeNum(s.cantidad ?? s.quantity ?? 1) || 1;
        const precio = safeNum(s.precio_unitario ?? s.precio ?? s.price ?? s.subtotal ?? 0);
        const nombre = s.nombre_item ?? s.nombre ?? s.item_name ?? s.title ?? `Item ${codigoBase || ''}`;

        // intentar hacer match con un item de la visita usando matching robusto
        let matched = null;
        if (visitItems && visitItems.length > 0) {
          for (const it of visitItems) {
            const cands = itemCandidatesFromVisitItem(it);
            const anyMatch = cands.some(c => candidateMatchesCodigo(c, codigoRaw));
            if (anyMatch) {
              matched = it;
              break;
            }
            if (codigoBase) {
              const anyBaseMatch = cands.some(c => {
                const cand = normalize(c).toLowerCase();
                if (!cand) return false;
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

        // identificar la propina específica de este split (si existe) -> para info detallada
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

      // Agrupar items con mismo name/lineTotal (si se repiten) sumando cantidades y lineTotal y sumando splitTip
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

  // ----- aquí colocamos handleOpenWhatsApp dentro del componente para que tenga acceso a `route` y `visit` -----
  const handleOpenWhatsApp = async () => {
    try {
      // Prioridad: url pasada en params -> url en la visita -> constante por defecto
      const paramUrl = route?.params?.whatsapp_url ?? route?.params?.whatsappUrl ?? null;
      const visitUrl = (visit && (visit.whatsapp_url ?? visit.whatsappUrl ?? visit.whatsapp)) ?? null;
      const urlToOpen = paramUrl || visitUrl || WHATSAPP_URL_DIRECT;

      if (!urlToOpen || String(urlToOpen).trim().length === 0) {
        Alert.alert('URL no disponible', 'No se encontró la URL de WhatsApp para abrir.');
        return;
      }

      // limpiar/normalizar un poco la URL
      const cleaned = String(urlToOpen).trim().replace(/^"+|"+$/g, '').replace(/^\'+|\'+$/g, '');

      // Intentar abrir (primero canOpenURL por robustez)
      const can = await Linking.canOpenURL(cleaned);
      if (!can) {
        // fallback: intentar con encodeURI (algunos caracteres podrían romper)
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

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
              {unreadCount > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
              )}
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

  // Normalización / lectura de valores numéricos para la visita completa
  const total = safeNum(visit.total ?? visit.amount ?? visit.sale_total ?? visit.monto_subtotal ?? 0);

  // propina de la visita (si existe)
  const visitPropina = safeNum(
    visit.monto_propina ??
    visit.propina ??
    visit.tip ??
    visit.monto_tip ??
    visit.montoPropina ??
    visit.tip_amount ??
    0
  );

  // Para CUENTA COMPLETA: calculamos subtotal y iva a partir de visit.total y visitPropina
  const taxableTotal = Math.max(0, total - visitPropina); // total sin propina
  const ivaTotal = +(taxableTotal /1.16 * 0.16).toFixed(2); // IVA incluido => IVA = taxableTotal * rate/(1+rate)
  const subtotalTotal = +(taxableTotal - ivaTotal).toFixed(2); // subtotal = taxableTotal - IVA

  const shouldShowFiltered = !showFull && Array.isArray(filteredItems) && filteredItems.length > 0;
  const showNoPaidMessage = !showFull && Array.isArray(filteredItems) && filteredItems.length === 0 && filteredItems !== null;

  const computeFilteredTotals = () => {
    const totalPaid = shouldShowFiltered ? filteredItems.reduce((s, it) => s + safeNum(it.lineTotal ?? 0), 0) : 0;
    const ivaFiltered = +(totalPaid /1.16 * 0.16).toFixed(2);
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

  /* RESPONSIVE computed values */
  const contentPadding = Math.max(12, wp(4));
  const logoSize = clamp(Math.round(wp(18)), 40, 100);
  const totalLogoWrapperSize = clamp(Math.round(wp(20)), 48, 90);
  const totalAmountFont = clamp(rf(7), 18, 34);
  const sectionHeadingFont = clamp(rf(3.6), 16, 22);
  const itemFont = clamp(rf(2.8), 12, 16);
  const itemPriceFont = clamp(rf(3), 12, 16);
  const btnPaddingVert = Math.max(8, hp(1.2));
  const modalWidth = Math.min(Math.max(wp(90), 300), 920);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }]}>
      <StatusBar barStyle="dark-content" />

      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeaderText, { fontSize: clamp(rf(3.6), 16, 20) }]}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={clamp(rf(3), 16, 22)} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalList, { maxHeight: Math.round(hp(40)) }]}>
              {notifications.map(n => (
                <View key={n.id} style={[styles.notificationItem, n.read ? styles.read : styles.unread]}>
                  <Text style={[styles.notificationText, { fontSize: clamp(rf(2.8), 12, 16) }]}>{n.text}</Text>
                </View>
              ))}
            </ScrollView>
            <Button title="Marcar todo como leído" onPress={markAllRead} color={'#0046ff'} />
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
            overflow: 'hidden', // <<--- important: clip image to circle
          }]}>
            {visit.restaurantImage ? (
              <Image
                source={{ uri: visit.restaurantImage }}
                // fill the wrapper circle exactly
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
              {shouldShowFiltered ? 'Detalle - lo que pagaste' : 'Cuenta completa'}
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
              <View key={i} style={styles.itemRow}>
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
          // Vista completa (comportamiento original)
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

        <View style={[styles.pointsRow, { marginTop: Math.max(18, hp(2.5)) }]}>
          <TouchableOpacity
            style={[styles.verCuentaBtn, { paddingVertical: btnPaddingVert, paddingHorizontal: Math.max(10, wp(3)) }]}
            onPress={() => setShowFull(prev => !prev)}
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
{/*           <TouchableOpacity style={[styles.bottomBtn, { paddingVertical: btnPaddingVert }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.bottomBtnText, { fontSize: clamp(rf(2.8), 12, 16) }]}>Volver</Text>
          </TouchableOpacity> */}
{/*           <TouchableOpacity style={[styles.bottomBtn, { paddingVertical: btnPaddingVert }]} onPress={() => navigation.navigate('Calificar', { visit })}>
            <Text style={[styles.bottomBtnText, { fontSize: clamp(rf(2.8), 12, 16) }]}>Calificar</Text>
          </TouchableOpacity> */}
          <TouchableOpacity style={[styles.bottomBtn, { paddingVertical: btnPaddingVert }]} onPress={() => navigation.navigate('Opinion', { visit })}>
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
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ff3b30', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalHeaderText: { fontSize: 18, color:'#000000' },
  modalList: { paddingHorizontal: 16 },
  notificationItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  notificationText: { color: '#333' },
  unread: { backgroundColor: '#eef5ff' },
  read: { backgroundColor: '#fff' },
});
