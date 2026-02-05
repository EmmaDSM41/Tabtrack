import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  PixelRatio,
  FlatList,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';


import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const API_BASE_FALLBACK = 'https://api.residence.tab-track.com';
const API_TOKEN_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function ExperiencesScreen() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const horizontalPad = Math.round(Math.max(10, wp(2)));
  const gradientHeight = Math.round(clamp(hp(34), 180, 320));
  const cardRadius = Math.round(clamp(rf(3.6), 12, 20));
  const iconSize = Math.round(clamp(rf(4.8), 22, 36));
  const titleFont = Math.round(clamp(rf(5.6), 20, 26));
  const headingFont = Math.round(clamp(rf(4.6), 16, 20));
  const bigAmountFont = Math.round(clamp(rf(8.6), 28, 40));
  const smallFont = Math.round(clamp(rf(3.4), 12, 16));
  const progressHeight = Math.max(10, Math.round(hp(1.1)));

  const gradientColors = ['#9F4CFF', '#6A43FF', '#2C7DFF'];

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null); 
  const animY = useRef(new Animated.Value(0)).current;
  const [expandedTxIds, setExpandedTxIds] = useState([]);

  const [deptId, setDeptId] = useState(null);
  const [monthsData, setMonthsData] = useState([]); 
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => { animY.setValue(0); }, [animY]);

  const sheetTranslateY = animY.interpolate({
    inputRange: [0, 1],
    outputRange: [height, Math.max(120, height * 0.12)],
  });

  const fetchYearHistory = useCallback(async () => {
    try {
      setLoadingMonths(true);
      setMonthsData([]);

      let rawDept = null;
      try {
        rawDept = await AsyncStorage.getItem('user_residence_departamento_id_actual');
      } catch (e) {
        console.warn('[dept-history] error leyendo AsyncStorage', e);
      }

      if (!rawDept) {
        Alert.alert('Departamento no encontrado', 'No se encontró el departamento en AsyncStorage (user_residence_departamento_id_actual).');
        setLoadingMonths(false);
        return;
      }
      const dept = String(rawDept).trim();
      setDeptId(dept);

      const now = new Date();
      const year = now.getFullYear();
      const periodo_desde = `${year}01`;
      const periodo_hasta = `${year}12`;
      const tzOffset = -360; 

      const base = API_BASE_FALLBACK.replace(/\/$/, '');
      const path = `/api/residence/departamentos/${encodeURIComponent(String(dept))}/consumptions/history?periodo_desde=${encodeURIComponent(periodo_desde)}&periodo_hasta=${encodeURIComponent(periodo_hasta)}&detalle=false&tz_offset_minutes=${encodeURIComponent(String(tzOffset))}`;
      const url = `${base}${path}`;

      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (API_TOKEN_FALLBACK && String(API_TOKEN_FALLBACK).trim()) headers.Authorization = `Bearer ${API_TOKEN_FALLBACK}`;

      const res = await fetch(url, { method: 'GET', headers });
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      if (!res.ok) {
        console.warn('[dept-history] http', res.status, json);
        if (res.status === 404) {
          Alert.alert('Historial no encontrado', 'Ruta 404: departamento no existe o ruta no disponible para este host / periodo.');
        } else {
          Alert.alert('Error', `HTTP ${res.status} consultando historial del departamento.`);
        }
        setLoadingMonths(false);
        return;
      }

      const months = [];
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const periodo = `${year}${mm}`; 
        months.push({
          periodo,
          month: m,
          year,
          title: `${MONTH_NAMES[m-1]} ${year}`,
          billing: null,
          counts: { closed_count: 0, open_count: 0 },
          amount: 0,
          transactions: 0,
          consumptions: [],
        });
      }

      if (json && Array.isArray(json.periodos)) {
        json.periodos.forEach((p) => {
          const idx = months.findIndex(m => m.periodo === String(p.periodo));
          if (idx >= 0) {
            months[idx].billing = p.billing ?? null;
            months[idx].counts = p.counts ?? { closed_count: 0, open_count: 0 };
            // amount debe reflejar el monto usado (0 también es válido)
            const monto = (p.billing && (p.billing.monto_mensual_usado !== undefined && p.billing.monto_mensual_usado !== null))
              ? Number(p.billing.monto_mensual_usado)
              : 0;
            months[idx].amount = Number.isNaN(Number(monto)) ? 0 : monto;
            months[idx].transactions = ((p.counts && (Number(p.counts.closed_count) || 0)) + (p.counts && (Number(p.counts.open_count) || 0))) || 0;
          }
        });
      }

      try {
        const currentPeriodo = `${year}${String(now.getMonth() + 1).padStart(2,'0')}`;
        const idxCur = months.findIndex(m => m.periodo === currentPeriodo);
        if (idxCur >= 0) {
          const detailPath = `/api/residence/departamentos/${encodeURIComponent(String(dept))}/consumptions/history?periodo_desde=${encodeURIComponent(currentPeriodo)}&periodo_hasta=${encodeURIComponent(currentPeriodo)}&detalle=true&tz_offset_minutes=${encodeURIComponent(String(tzOffset))}`;
          const detailUrl = `${base}${detailPath}`;
          const resDet = await fetch(detailUrl, { method: 'GET', headers });
          if (resDet && resDet.ok) {
            let jsonDet = null;
            try { jsonDet = await resDet.json(); } catch (e) { jsonDet = null; }
            let billingDet = null;
            let countsDet = null;
            if (jsonDet) {
              if (jsonDet.periodos && Array.isArray(jsonDet.periodos) && jsonDet.periodos.length > 0) {
                billingDet = jsonDet.periodos[0].billing ?? billingDet;
                countsDet = jsonDet.periodos[0].counts ?? countsDet;
              }
              if (!billingDet && jsonDet.billing) billingDet = jsonDet.billing;
              if (!billingDet) {
                for (const k of Object.keys(jsonDet)) {
                  if (k.toLowerCase().includes('billing') && jsonDet[k]) { billingDet = jsonDet[k]; break; }
                }
              }
            }
            if (billingDet) {
              months[idxCur].billing = billingDet;
              if (billingDet.monto_mensual_usado !== undefined && billingDet.monto_mensual_usado !== null) {
                const mmu = Number(billingDet.monto_mensual_usado);
                months[idxCur].amount = Number.isNaN(mmu) ? 0 : mmu;
              } else {
                months[idxCur].amount = months[idxCur].amount || 0;
              }
              if (countsDet) {
                months[idxCur].transactions = ((countsDet.closed_count && Number(countsDet.closed_count)) || 0) + ((countsDet.open_count && Number(countsDet.open_count)) || 0);
              } else if (billingDet && billingDet.transactions !== undefined && billingDet.transactions !== null) {
                const t = Number(billingDet.transactions);
                months[idxCur].transactions = Number.isNaN(t) ? months[idxCur].transactions : t;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[dept-history] detalle fetch error', e);
      }

      try {
        const rotateIndex = new Date().getMonth(); 
        if (rotateIndex > 0 && months.length === 12) {
          const rotated = months.slice(rotateIndex).concat(months.slice(0, rotateIndex));

          months.length = 0;
          months.push(...rotated);
        }
      } catch (e) {
        console.warn('[dept-history] rotate months error', e);
      }

      setMonthsData(months);
    } catch (err) {
      console.warn('fetchYearHistory error', err);
      Alert.alert('Error', 'No fue posible consultar el historial anual del departamento. Revisa conexión / host.');
    } finally {
      setLoadingMonths(false);
    }
  }, []);


  const fetchMonthDetail = useCallback(async (periodo) => {
    if (!deptId) {
      Alert.alert('Departamento no encontrado', 'No se encontró departamento. Intenta de nuevo.');
      return null;
    }
    try {
      setLoadingDetail(true);

      const base = API_BASE_FALLBACK.replace(/\/$/, '');
      const path = `/api/residence/departamentos/${encodeURIComponent(String(deptId))}/consumptions/history?periodo_desde=${encodeURIComponent(periodo)}&periodo_hasta=${encodeURIComponent(periodo)}&detalle=true&tz_offset_minutes=${encodeURIComponent(String(-360))}`;
      const url = `${base}${path}`;
      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (API_TOKEN_FALLBACK && String(API_TOKEN_FALLBACK).trim()) headers.Authorization = `Bearer ${API_TOKEN_FALLBACK}`;

      const res = await fetch(url, { method: 'GET', headers });
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }

      if (!res.ok) {
        console.warn('[month-detail] http', res.status, json);
        if (res.status === 404) {
          Alert.alert('Detalle no encontrado', 'Ruta 404: detalle no disponible para este mes.');
        } else {
          Alert.alert('Error', `HTTP ${res.status} al consultar detalle.`);
        }
        setLoadingDetail(false);
        return null;
      }


      let rawConsumptions = null;
      if (json && Array.isArray(json.consumptions)) {
        rawConsumptions = json.consumptions;
      } else if (json && Array.isArray(json.periodos) && json.periodos.length > 0 && Array.isArray(json.periodos[0].consumptions)) {
        rawConsumptions = json.periodos[0].consumptions;
      } else if (json && Array.isArray(json.periodos) && json.periodos.length > 0) {
        const found = json.periodos.flatMap(p => Array.isArray(p.consumptions) ? p.consumptions : []);
        if (found.length) rawConsumptions = found;
      }

      if (!rawConsumptions && json) {
        for (const k of Object.keys(json)) {
          if (k.toLowerCase().includes('consum') && Array.isArray(json[k])) { rawConsumptions = json[k]; break; }
        }
      }

      const consumptions = [];

      if (Array.isArray(rawConsumptions)) {
        rawConsumptions.forEach((c, idx) => {
          const detail = c.detail_consumption ?? c.detail ?? c.detailConsumption ?? null;
          const itemsRaw = (detail && Array.isArray(detail.items)) ? detail.items :
                           (Array.isArray(c.items) ? c.items : []);

          const items = itemsRaw.map((it, i) => ({
            id: `${c.sale_id ?? idx}-item-${i}`,
            label: it.nombre_item ?? it.nombre ?? it.name ?? it.label ?? `Item ${i+1}`,
            qty: Number(it.cantidad ?? it.qty ?? 1) || 1,
            price: Number(it.precio_item ?? it.price ?? it.precio ?? 0) || 0,
            raw: it,
          }));

          const aprovedBy = (c.approved_by_usuario && (c.approved_by_usuario.nombre || c.approved_by_usuario.name)) ? (c.approved_by_usuario.nombre || c.approved_by_usuario.name) : null;
          const openedBy = (c.opened_by_usuario && (c.opened_by_usuario.nombre || c.opened_by_usuario.name)) ? (c.opened_by_usuario.nombre || c.opened_by_usuario.name) : null;

          const restaurantName = (c.restaurante && (c.restaurante.nombre || c.restaurante.name)) ? (c.restaurante.nombre || c.restaurante.name) : null;
          const fallbackName = aprovedBy || openedBy || restaurantName || `Transacción ${c.sale_id ?? (idx + 1)}`;

          const initials = String((aprovedBy || openedBy || restaurantName || '').split(' ').map(x => x[0] || '').slice(0,2).join('')).toUpperCase() || '—';

          const fechaA = (c.fechas && (c.fechas.fecha_apertura || c.fechas.fechaApertura)) || c.fecha_apertura || c.fechaApertura || null;
          const fechaC = (c.fechas && (c.fechas.fecha_cierre || c.fechas.fechaCierre)) || c.fecha_cierre || c.fechaCierre || null;

          let timestamp = '';
          if (fechaA) {
            const d = new Date(fechaA);
            const day = d.getDate();
            const monthShort = MONTH_NAMES[d.getMonth()].slice(0,3).toLowerCase();
            const hours = String(d.getHours()).padStart(2,'0');
            const mins = String(d.getMinutes()).padStart(2,'0');
            timestamp = `${day} ${monthShort} · ${hours}:${mins}`;
          }

          const total = Number((detail && (detail.total_consumo ?? detail.total)) || c.total || c.total_consumo || 0);

          consumptions.push({
            id: c.sale_id ?? `c-${idx}`,
            sale_id: c.sale_id ?? null,
            estado: c.estado ?? c.status ?? null,
            approved_by: aprovedBy ? { nombre: aprovedBy, raw: c.approved_by_usuario } : null,
            opened_by: openedBy ? { nombre: openedBy, raw: c.opened_by_usuario } : null,
            restaurant: restaurantName,
            name: fallbackName,
            initials,
            timestamp,
            amount: total,
            items,
            raw: c,
            fecha_apertura: fechaA,
            fecha_cierre: fechaC,
          });
        });
      }

      setLoadingDetail(false);
      return consumptions;
    } catch (err) {
      console.warn('fetchMonthDetail error', err);
      Alert.alert('Error', 'No fue posible obtener detalle del mes.');
      setLoadingDetail(false);
      return null;
    }
  }, [deptId]);

  useFocusEffect(useCallback(() => {
    fetchYearHistory();
  }, [fetchYearHistory]));

  useEffect(() => {
    fetchYearHistory();
  }, [fetchYearHistory]);

  const openSheetFor = async (monthObj) => {
    setExpandedTxIds([]);
    setSelectedMonth({ ...monthObj, consumptions: [], loading: true });
    setSheetVisible(true);
    Animated.timing(animY, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    const periodo = monthObj.periodo;
    const consumptions = await fetchMonthDetail(periodo);
    setSelectedMonth((prev) => ({ ...(prev || {}), consumptions: consumptions || [], loading: false, title: monthObj.title, amount: monthObj.amount, transactions: monthObj.transactions }));
  };

  const closeSheet = () => {
    Animated.timing(animY, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
      setSelectedMonth(null);
      setExpandedTxIds([]);
    });
  };

  const exportPayment = async (payment) => {
    setExportMessage('Generando PDF...');
    setExporting(true);

    try {
      const consumptions = await fetchMonthDetail(payment.periodo) || [];

      const fmtCurrency = (v) => (Number(v) || 0).toFixed(2);
      const fmtDate = (dStr) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        return d.toLocaleString();
      };

      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pageSize = [612, 792]; 
      let page = pdfDoc.addPage(pageSize);
      let { width: pW, height: pH } = page.getSize();

      const marginLeft = 40;
      let y = pH - 60;

      page.drawRectangle({
        x: marginLeft,
        y: y - 18,
        width: 120,
        height: 36,
        color: rgb(0.42, 0.13, 0.66),
        borderRadius: 6,
      });
      page.drawText('TABTRACK', {
        x: marginLeft + 36,
        y: y - 10,
        size: 18,
        font: helvetica,
        color: rgb(1,1,1),
      });

      page.drawText('Detalle de consumos', {
        x: marginLeft + 150,
        y: y - 6,
        size: 18,
        font: helvetica,
        color: rgb(0.07, 0.07, 0.07),
      });

      page.drawText(payment.title || payment.periodo || '', {
        x: marginLeft + 150,
        y: y - 26,
        size: 10,
        font: helvetica,
        color: rgb(0.42,0.42,0.42),
      });

      y -= 60;

      for (let idx = 0; idx < consumptions.length; idx++) {
        const tx = consumptions[idx];

        if (y < 120) {
          page = pdfDoc.addPage(pageSize);
          ({ width: pW, height: pH } = page.getSize());
          y = pH - 60;
        }

        page.drawText(tx.name || 'Transacción', { x: marginLeft, y: y, size: 12, font: helvetica, color: rgb(0.07,0.07,0.07), });
        page.drawText(tx.timestamp || fmtDate(tx.fecha_apertura) || '', { x: pW - marginLeft - 160, y: y, size: 9, font: helvetica, color: rgb(0.45,0.45,0.45) });
        y -= 18;

        let subtotal = 0;
        for (let it of (tx.items || [])) {
          const label = `${it.label}${(it.qty && it.qty > 1) ? ` x${it.qty}` : ''}`;
          const totalItem = (Number(it.price) || 0) * (Number(it.qty) || 1);
          subtotal += totalItem;

          if (y < 80) {
            page = pdfDoc.addPage(pageSize);
            ({ width: pW, height: pH } = page.getSize());
            y = pH - 60;
          }

          page.drawText(label, { x: marginLeft + 8, y: y, size: 10, font: helvetica, color: rgb(0.2,0.2,0.2) });
          const priceText = `$${fmtCurrency(totalItem)}`;
          const textWidth = helvetica.widthOfTextAtSize(priceText, 10);
          page.drawText(priceText, { x: pW - marginLeft - textWidth, y: y, size: 10, font: helvetica, color: rgb(0.07,0.07,0.07) });
          y -= 14;
        }

        page.drawText('Subtotal:', { x: marginLeft + 8, y: y - 6, size: 10, font: helvetica, color: rgb(0.42,0.13,0.66) });
        const subtotalText = `$${fmtCurrency(subtotal)}`;
        const subW = helvetica.widthOfTextAtSize(subtotalText, 10);
        page.drawText(subtotalText, { x: pW - marginLeft - subW, y: y - 6, size: 10, font: helvetica, color: rgb(0.07,0.07,0.07) });
        y -= 24;

        page.drawLine({ start: { x: marginLeft, y }, end: { x: pW - marginLeft, y }, thickness: 0.5, color: rgb(0.92,0.92,0.92) });
        y -= 12;
      }

      if ((consumptions || []).length === 0) {
        page.drawText('No hay consumos registrados en este periodo.', { x: marginLeft, y: y, size: 12, font: helvetica, color: rgb(0.45,0.45,0.45) });
      }

      const genText = `Generado el ${new Date().toLocaleString()}`;
      page.drawText(genText, { x: marginLeft, y: 36, size: 9, font: helvetica, color: rgb(0.45,0.45,0.45) });

      const base64 = await pdfDoc.saveAsBase64({ dataUri: false });

      const fileName = `consumos_${payment.periodo || String(Date.now())}.pdf`;
      const dirPath = Platform.OS === 'android' ? RNFS.CachesDirectoryPath : RNFS.DocumentDirectoryPath;
      const filePath = `${dirPath}/${fileName}`;

      await RNFS.writeFile(filePath, base64, 'base64');

      await Share.open({
        title: `Consumos ${payment.title || payment.periodo}`,
        url: `file://${filePath}`,
        type: 'application/pdf',
        failOnCancel: false,
      });

    } catch (err) {
      console.warn('exportPayment error:', err);
      Alert.alert('Error', 'No fue posible generar/compartir el PDF. Asegúrate de instalar: pdf-lib, react-native-fs y react-native-share y recompilar la app. ' + (err?.message || ''));
    } finally {
      setExporting(false);
      setExportMessage('');
    }
  };

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const toggleTxExpand = (txId) => {
    setExpandedTxIds((prev) => {
      if (prev.includes(txId)) return prev.filter((x) => x !== txId);
      return [...prev, txId];
    });
  };

  const renderTransaction = (tx) => {
    const expanded = expandedTxIds.includes(tx.id);
    const computedSubtotal = (Array.isArray(tx.items) ? tx.items.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.qty)||1)), 0) : 0).toFixed(2);

    return (
      <View key={tx.id} style={sheetStyles.personCard}>
        <TouchableOpacity onPress={() => toggleTxExpand(tx.id)} activeOpacity={0.85} style={sheetStyles.personHeader}>
          <View style={sheetStyles.personLeft}>
            <View style={[sheetStyles.avatar, { backgroundColor: '#6B21A8' }]}>
              <Text style={sheetStyles.avatarText}>{(tx.initials || '??').slice(0,2)}</Text>
            </View>
          </View>

          <View style={sheetStyles.personMiddle}>
            <Text numberOfLines={1} style={sheetStyles.personName}>{tx.name}</Text>
            <Text style={sheetStyles.personTime}>{tx.timestamp}</Text>
            <Text style={sheetStyles.personMeta}>{tx.items.length} artículo{tx.items.length === 1 ? '' : 's'}</Text>

            {tx.approved_by ? <Text style={{ color: '#6b7280', marginTop: 4 }}>Aprobado por: {tx.approved_by.nombre}</Text> : null}
            {(!tx.approved_by && tx.opened_by) ? <Text style={{ color: '#6b7280', marginTop: 4 }}>Abierto por: {tx.opened_by.nombre}</Text> : null}
          </View>

          <View style={sheetStyles.personRight}>
            <Text style={sheetStyles.personAmount}>${Number(tx.amount).toFixed(2)}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6B21A8" />
            {tx.sale_id ? <Text style={{ color: '#94A3B8', marginTop: 6, fontSize: 12 }}>#{tx.sale_id}</Text> : null}
            {tx.estado ? <Text style={{ color: '#94A3B8', marginTop: 2, fontSize: 12 }}>{tx.estado}</Text> : null}
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={sheetStyles.personBody}>
            {tx.items.map((it) => (
              <View key={it.id} style={sheetStyles.personItemRow}>
                <Text style={sheetStyles.personItemLabel}>{it.label} {it.qty && it.qty > 1 ? `x${it.qty}` : ''}</Text>
                <Text style={sheetStyles.personItemPrice}>${Number((it.price || 0) * (it.qty || 1)).toFixed(2)}</Text>
              </View>
            ))}

            <View style={sheetStyles.personDivider} />

            <View style={sheetStyles.personSummaryRow}>
              <Text style={sheetStyles.personSummaryLabel}>Subtotal</Text>
              <Text style={sheetStyles.personSummaryValue}>${computedSubtotal}</Text>
            </View>

            {tx.fecha_apertura ? <Text style={{ color: '#6b7280', marginTop: 8 }}>Apertura: {new Date(tx.fecha_apertura).toLocaleString()}</Text> : null}
            {tx.fecha_cierre ? <Text style={{ color: '#6b7280', marginTop: 4 }}>Cierre: {new Date(tx.fecha_cierre).toLocaleString()}</Text> : null}
          </View>
        )}
      </View>
    );
  };

  const listData = monthsData.length ? monthsData : [
    {
      periodo: `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2,'0')}`,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      title: `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`,
      billing: null,
      counts: { closed_count: 0, open_count: 0 },
      amount: 0,
      transactions: 0,
      consumptions: [],
    }
  ];

  const renderPayment = ({ item }) => {
    const isPending = (item.transactions || 0) > 0 && (item.amount || 0) === 0;
    const isHasMov = (item.transactions || 0) > 0;
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={[ styles.paymentCard, isPending ? styles.paymentCardPending : styles.paymentCardDefault ]}>
          <View style={styles.paymentTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
              <View style={[styles.paymentIconWrap, { width: 52, height: 52, borderRadius: 12 }]}>
                <Ionicons name="time-outline" size={20} color={isHasMov ? '#7C3AED' : '#94A3B8'} />
              </View>

              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.paymentTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.paymentDate}>{ `${item.year}-${String(item.month).padStart(2,'0')}-01`}</Text>
                <TouchableOpacity onPress={() => openSheetFor(item)}>
                  <Text style={styles.linkText}>{item.transactions} transacciones</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={styles.paymentAmount}>${Number(item.amount).toFixed(2)}</Text>

              {item.transactions > 0 ? (
                <View style={[styles.badge, styles.badgePending]}>
                  <Ionicons name="time-outline" size={14} color="#B65713" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgeText, { color: '#B65713' }]}>{item.transactions} trans.</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgePaid]}>
                  <Ionicons name="checkmark" size={14} color="#0A6F3A" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgeText, { color: '#0A6F3A' }]}>Sin movimientos</Text>
                </View>
              )}

              <TouchableOpacity style={styles.exportSmallBtn} onPress={() => exportPayment(item)} activeOpacity={0.8}>
                <Ionicons name="download-outline" size={14} color="#111" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sepLine} />

          <TouchableOpacity style={styles.actionBtn} onPress={() => openSheetFor(item)} activeOpacity={0.9}>
            <Ionicons name="eye-outline" size={16} color="#6B21A8" />
            <Text style={styles.actionBtnText}>Ver detalle de consumos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  let assignedBalance = 3500.0; 
  let consumed = 425.0;
  let available = assignedBalance - consumed;

  if (Array.isArray(monthsData) && monthsData.length) {
    const cur = monthsData.find(m => m.periodo === `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`);
    if (cur && cur.billing) {
      if (cur.billing.saldo_mensual !== undefined && cur.billing.saldo_mensual !== null) {
        const n = Number(cur.billing.saldo_mensual);
        if (!Number.isNaN(n)) assignedBalance = n;
      }
      if (cur.billing.monto_mensual_usado !== undefined && cur.billing.monto_mensual_usado !== null) {
        const n2 = Number(cur.billing.monto_mensual_usado);
        if (!Number.isNaN(n2)) consumed = n2;
      }
      if (cur.billing.saldo_disponible !== undefined && cur.billing.saldo_disponible !== null) {
        const n3 = Number(cur.billing.saldo_disponible);
        if (!Number.isNaN(n3)) {
          available = n3;
        } else {
          available = assignedBalance - consumed;
        }
      } else {
        available = assignedBalance - consumed;
      }
    } else {
      const firstWithSaldo = monthsData.find(m => m.billing && (m.billing.saldo_mensual !== undefined && m.billing.saldo_mensual !== null));
      if (firstWithSaldo && firstWithSaldo.billing) {
        const n = Number(firstWithSaldo.billing.saldo_mensual);
        if (!Number.isNaN(n)) assignedBalance = n;
      }
    }
  }

  const availableNumber = Number(available) || 0;
  const availableIsNegative = availableNumber < 0;
  const formattedAvailableForDisplay = `${availableIsNegative ? '-' : ''}$${Math.abs(availableNumber).toFixed(2)}`;

  let utilization = 0;
  if (typeof assignedBalance === 'number' && assignedBalance > 0) {
    utilization = Math.round((consumed / assignedBalance) * 1000) / 10;
  } else {
    utilization = 0;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 36 }}>
        <View style={{ height: Math.round(hp(5)) }} />

        <View style={{ paddingHorizontal: horizontalPad }}>
          <Text style={[styles.pageTitle, { fontSize: titleFont }]}>Experiences</Text>
        </View>

        <View style={{ height: 12 }} />

        <View style={{ paddingHorizontal: horizontalPad }}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientCard, { borderRadius: cardRadius, height: gradientHeight }]}
          >
            <View style={{ padding: Math.round(horizontalPad * 0.9), flex: 1, justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.gradientIcon}>
                    <MaterialIcons name="event" size={iconSize} color="#fff" />
                  </View>
                  <Text style={[styles.gradientTitle, { marginLeft: 12 }]}>{`${MONTH_NAMES[currentMonthIdx]} De ${now.getFullYear()}`}</Text>
                </View>

                <View style={{ height: 14 }} />

                <Text style={styles.smallWhite}>Saldo asignado</Text>
                <Text style={[styles.bigWhiteAmount, { fontSize: bigAmountFont }]}>
                  ${Number(assignedBalance).toFixed(2)}
                </Text>
              </View>

              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.whiteSmallLabel}>Consumido</Text>
                    <Text style={styles.whiteSmallValue}>${Number(consumed).toFixed(2)}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.whiteSmallLabel}>Disponible</Text>

                    {/* ---------- UPDATED DISPLAY: show negative and color red when available < 0 ---------- */}
                    <Text style={[styles.whiteSmallValue, { fontWeight: '800', color: availableIsNegative ? '#FF3B30' : '#fff' }]}>
                      {formattedAvailableForDisplay}
                    </Text>
                    {/* ------------------------------------------------------------------------------- */}

                  </View>
                </View>

                <View style={{ height: 12 }} />

                <View style={{ width: '100%' }}>
                  <View style={[styles.progressTrack, { height: progressHeight }]}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, utilization))}%` }]} />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Text style={styles.progressLabel}>{utilization}% utilizado</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ paddingHorizontal: horizontalPad, marginTop: 14 }}>
          <View style={styles.infoBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.infoIcon}>
                <Ionicons name="card-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.infoTitle}>Tu saldo se renueva el primer día de cada mes</Text>
                <TouchableOpacity  >
                  <Text style={styles.infoLink}>Saldo no utilizado no se acumula</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={{
          paddingHorizontal: horizontalPad,
          marginTop: 18,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={[styles.sectionTitle, { fontSize: headingFont }]}>Pagos al Restaurante</Text>
        </View>

        <View style={{ paddingHorizontal: horizontalPad, marginTop: 12 }}>
          {loadingMonths ? (
            <View style={{ padding: 14, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={{ marginTop: 8 }}>Cargando consumos del año…</Text>
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(i) => i.periodo}
              renderItem={renderPayment}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>

      <Modal visible={sheetVisible} animationType="none" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={sheetStyles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          pointerEvents="box-none"
          style={[
            sheetStyles.sheetContainer,
            {
              transform: [{ translateY: sheetTranslateY }],
              height: Math.round(Math.min(height * 0.88, 760)),
              zIndex: 9999,
            },
          ]}
        >
          <View style={sheetStyles.handleRow}>
            <View style={sheetStyles.handle} />
            <TouchableOpacity
              onPress={closeSheet}
              style={sheetStyles.closeBtnTouchable}
              hitSlop={{ top: 18, left: 18, right: 18, bottom: 18 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle"
            >
              <Ionicons name="close" size={20} color="#111" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={sheetStyles.sheetContent}>
            <Text style={sheetStyles.sheetTitle} numberOfLines={2}>
              {selectedMonth?.title ?? 'Detalle de consumos'}
            </Text>

            <View style={sheetStyles.totalBox}>
              <View style={{ flex: 1 }}>
                <Text style={sheetStyles.totalLabel}>Total del periodo</Text>
                <Text style={sheetStyles.totalSubs}>{selectedMonth?.transactions ?? 0} transacciones realizadas</Text>
              </View>
              <Text style={sheetStyles.totalAmount}>${Number(selectedMonth?.amount ?? 0).toFixed(2)}</Text>
            </View>

            <Text style={sheetStyles.sectionHeading}>Detalle de consumos</Text>

            <View style={{ marginTop: 10 }}>
              {(selectedMonth?.loading) ? (
                <View style={sheetStyles.emptyNotice}>
                  <ActivityIndicator size="small" color="#6B21A8" />
                  <Text style={{ marginTop: 8 }}>Cargando detalle…</Text>
                </View>
              ) : (selectedMonth && (selectedMonth?.consumptions || []).length === 0) ? (
                <View style={sheetStyles.emptyNotice}>
                  <Text style={sheetStyles.emptyText}>No hay consumos registrados en este periodo.</Text>
                </View>
              ) : (
                (selectedMonth?.consumptions || []).map((tx) => renderTransaction(tx))
              )}
            </View>

            <View style={sheetStyles.footerSummary}>
{/*               <View style={sheetStyles.footerLeft}>
                <Text style={sheetStyles.footerLabel}>Personas</Text>
                <Text style={sheetStyles.footerValue}>{(selectedMonth?.consumptions || []).length}</Text>
              </View>
              <View style={sheetStyles.footerRight}>
                <Text style={sheetStyles.footerLabel}>Total</Text>
                <Text style={sheetStyles.footerValue}>${Number(selectedMonth?.amount ?? 0).toFixed(2)}</Text>
              </View> */}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </Modal>

      {exporting && (
        <View style={overlayStyles.container} pointerEvents="none">
          <View style={overlayStyles.box}>
            <Text style={overlayStyles.text}>{exportMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FBFBFD' },
  pageTitle: { textAlign: 'center', color: '#0B61FF', fontWeight: '800' },

  gradientCard: {
    width: '100%',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  gradientIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  smallWhite: { color: 'rgba(255,255,255,0.95)', fontWeight: '600', marginTop: 6 },
  bigWhiteAmount: { color: '#fff', fontWeight: '900' },
  whiteSmallLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 13 },
  whiteSmallValue: { color: '#fff', fontSize: 15, fontWeight: '700' },

  progressTrack: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, overflow: 'hidden' },
  progressFill: { backgroundColor: '#fff', height: '100%' },
  progressLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 12 },

  infoBox: {
    backgroundColor: '#EEF7FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6F0FF',
    elevation: 1,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  infoTitle: { fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  infoLink: { color: '#6D28D9', fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  exportText: { marginLeft: 8, color: '#111827', fontWeight: '600' },

  exportSmallBtn: {
    marginTop: 8,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },

  purpleNotice: {
    backgroundColor: '#FBF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0E6FF',
  },
  purpleNoticeText: { color: '#6B21A8', marginBottom: 8 },
  purpleNoticeAmount: { color: '#7C3AED', fontWeight: '700' },

  paymentCard: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
  },
  paymentCardDefault: {
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  paymentCardPending: {
    borderWidth: 1.6,
    borderColor: '#FFD7C6',
  },
  paymentTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F5F9',
  },
  paymentTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  paymentDate: { color: '#6b7280', marginTop: 6, fontSize: 12 },
  linkText: { color: '#7C3AED', marginTop: 8, fontWeight: '700' },
  paymentAmount: { fontSize: 20, fontWeight: '900', color: '#111827' },

  badge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  badgePending: { backgroundColor: '#FFF3EB', borderWidth: 1, borderColor: '#FFD7C6' },
  badgePaid: { backgroundColor: '#EBFFEF', borderWidth: 1, borderColor: '#CFF3D6' },

  sepLine: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: '#EBDFFF',
    backgroundColor: '#fff',
  },
  actionBtnText: { color: '#6B21A8', marginLeft: 8, fontWeight: '700' },
});

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingHorizontal: 12 },
  handle: { width: 64, height: 6, borderRadius: 6, backgroundColor: '#E5E7EB' },
  closeBtnTouchable: { position: 'absolute', right: 8, top: -6, padding: 12, borderRadius: 22 },

  sheetContent: { paddingHorizontal: 18, paddingBottom: 36 },
  sheetTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 30, color: '#111827' },

  totalBox: {
    marginTop: 14,
    backgroundColor: '#FBF6FF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0E6FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: { color: '#6B21A8', fontWeight: '700', marginBottom: 6 },
  totalSubs: { color: '#6B7280', fontSize: 12 },

  totalAmount: { color: '#7C3AED', fontWeight: '900', fontSize: 22 },

  sectionHeading: { fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 6, color: '#111827' },

  personCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    elevation: 2,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  personLeft: { width: 52, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  personMiddle: { flex: 1, paddingHorizontal: 10 },
  personName: { fontWeight: '800', color: '#111827' },
  personTime: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  personMeta: { color: '#94A3B8', fontSize: 12, marginTop: 6 },

  personRight: { alignItems: 'flex-end', justifyContent: 'center' },
  personAmount: { fontWeight: '900', color: '#111827' },

  personBody: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 6, backgroundColor: '#FBFBFD' },

  personItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  personItemLabel: { color: '#374151' },
  personItemPrice: { color: '#111827', fontWeight: '700' },

  personDivider: { height: 1, backgroundColor: '#EEF2FF', marginVertical: 10 },

  personSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personSummaryLabel: { color: '#6B7280', fontWeight: '700' },
  personSummaryValue: { fontWeight: '900', color: '#111827' },

  emptyNotice: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#6b7280' },

  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  footerLeft: {},
  footerRight: {},
  footerLabel: { color: '#6b7280', fontWeight: '700' },
  footerValue: { fontWeight: '900', fontSize: 16 },
});

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20000,
  },
  box: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  text: {
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
});
