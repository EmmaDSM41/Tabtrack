// SelectUnits.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://127.0.0.1';
const API_AUTH_TOKEN = '';

const round2 = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const PENDING_VISITS_KEY = 'pending_visits';

export default function SelectUnits(props) {
  const {
    saleId = null,
    token = null,
    items = [],
    total = 0,
    people = 1,
    tipPercent = 0,
    perPersonBaseTotal = null,
    perPersonTip = null,
    perPersonTotalWithTip = null,
    paidUnits = 0,
    paidAmount = 0,
    onCancel = () => {},
    onConfirm = (parts, persistResult) => {},
  } = props;

  const [saving, setSaving] = useState(false);
  const [partsToPay, setPartsToPay] = useState(1);
  const [groupPeople, setGroupPeople] = useState((typeof people === 'number' && people > 0) ? people : 1);
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  // determine per-part amounts (prefer props if provided)
  const unitBase = perPersonBaseTotal != null ? Number(perPersonBaseTotal) : (Number(total || 0) / Math.max(1, groupPeople));
  const unitTipAmount = perPersonTip != null ? Number(perPersonTip) : (unitBase * (Number(tipPercent || 0) / 100));
  const unitTotalWithTip = round2(unitBase + unitTipAmount);

  // keys for local fallback
  const paidUnitsKey = saleId ? `equal_split_paid_sale_${saleId}` : (token ? `equal_split_paid_token_${token}` : null);
  const peopleSavedKey = saleId ? `equal_split_people_sale_${saleId}` : (token ? `equal_split_people_token_${token}` : null);

  // read existing paid units to set max/select
  useEffect(() => {
    (async () => {
      try {
        // prioridad: prop paidUnits (ya venido desde servidor). Si no existe, tomar de AsyncStorage
        let paidN = Number(paidUnits || 0);
        if (!paidN && paidUnitsKey) {
          const raw = await AsyncStorage.getItem(paidUnitsKey);
          paidN = raw ? (Number(raw) || 0) : 0;
        }

        // total people from saved key or prop
        const totalPeopleRaw = peopleSavedKey ? await AsyncStorage.getItem(peopleSavedKey) : null;
        const totalPeople = totalPeopleRaw ? (Number(totalPeopleRaw) || groupPeople) : groupPeople;

        const remaining = Math.max(0, (Number(totalPeople) || groupPeople) - paidN);
        setGroupPeople(Number(totalPeople) || groupPeople);

        if (remaining === 0) {
          Alert.alert('Cuenta cubierta', 'Todas las partes ya se han pagado para esta cuenta.');
          onCancel();
          return;
        }

        if (partsToPay > remaining) setPartsToPay(remaining);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const inc = () => setPartsToPay(p => Math.min(p + 1, groupPeople));
  const dec = () => setPartsToPay(p => Math.max(1, p - 1));

  const setToMax = async () => {
    try {
      const cur = paidUnitsKey ? await AsyncStorage.getItem(paidUnitsKey) : null;
      const curN = cur ? (Number(cur) || 0) : Number(paidUnits || 0);
      const remaining = Math.max(1, groupPeople - curN);
      setPartsToPay(remaining);
    } catch (e) {
      setPartsToPay(groupPeople);
    }
  };

  // persistir paid units (local + push en pendings). Devuelve resultado.
  const persistPaidUnits = async (addUnits) => {
    setSaving(true);
    try {
      // 1) persist local cumulative
      if (paidUnitsKey) {
        try {
          const cur = await AsyncStorage.getItem(paidUnitsKey);
          const curN = cur ? (Number(cur) || 0) : 0;
          const newN = Math.max(0, curN + Number(addUnits || 0));
          await AsyncStorage.setItem(paidUnitsKey, String(newN));
        } catch (e) {
          console.warn('SelectUnits: error guardando local equal_split_paid', e);
        }
      }

      // 2) add a pending entry to PENDING_VISITS_KEY so other logic / server jobs can process it later
      try {
        const rawPend = await AsyncStorage.getItem(PENDING_VISITS_KEY);
        let pend = rawPend ? (JSON.parse(rawPend) || []) : [];
        const pendingEntry = {
          type: 'equal_split_paid',
          sale_id: saleId ?? null,
          token: token ?? null,
          paid_units_added: Number(addUnits || 0),
          amount_paid: round2(unitTotalWithTip * Number(addUnits || 0)),
          created_at: new Date().toISOString(),
        };
        pend.unshift(pendingEntry);
        await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(pend.slice(0, 50)));
      } catch (e) {
        console.warn('SelectUnits: error guardando en pending_visits', e);
      }

      // 3) OPTIONAL: server call (lo dejé comentado por seguridad)
      /*
      if (saleId) {
        try {
          const url = `${API_BASE_URL.replace(/\/$/, '')}/api/mesas/paid-units`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}) },
            body: JSON.stringify({ id_venta: saleId, paid_units: Number(addUnits || 0) }),
          });
          if (!res.ok) {
            console.warn('SelectUnits: server returned error saving paid-units', res.status);
            return { ok: false, server: false };
          }
          return { ok: true, server: true };
        } catch (e) {
          console.warn('SelectUnits: error saving paid-units to server', e);
          return { ok: false, server: false };
        }
      }
      */

      return { ok: true, server: false };
    } catch (err) {
      console.warn('SelectUnits persistPaidUnits error', err);
      return { ok: false, server: false };
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const onPressConfirm = async () => {
    setSaving(true);
    try {
      const res = await persistPaidUnits(partsToPay);
      onConfirm(partsToPay, res);
    } catch (e) {
      Alert.alert('Error', 'No se pudo confirmar la selección. Intenta otra vez.');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  // UI: representamos a cada persona con un iconito; se pueden seleccionar tocando
  const renderPersonGrid = () => {
    const arr = Array.from({ length: groupPeople }, (_, i) => i + 1);
    const alreadyPaid = Number(paidUnits || 0);
    return (
      <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center' }}>
        {arr.map((num) => {
          const paid = num <= alreadyPaid;
          // calculamos selected relativo: queremos que 'partsToPay' represente cuántas partes pagar, so mark last 'partsToPay' non-paid ones
          const nonPaidIndex = num - alreadyPaid; // 1..remaining
          const selected = nonPaidIndex > 0 && nonPaidIndex <= partsToPay;
          const bg = paid ? '#9ca3af' : (selected ? '#10b981' : '#f1f5f9');
          return (
            <TouchableOpacity
              key={num}
              onPress={() => {
                if (num <= alreadyPaid) return;
                // set partsToPay to the number of non-paid persons up to this selection
                const newParts = num - alreadyPaid;
                setPartsToPay(newParts <= 0 ? 1 : newParts);
              }}
              style={{
                width: 64,
                height: 64,
                margin: 6,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bg,
                borderWidth: paid ? 0 : 1,
                borderColor: paid ? 'transparent' : '#e6eefc',
                opacity: paid ? 0.8 : 1,
              }}
            >
              <Text style={{ color: paid ? '#fff' : (selected ? '#fff' : '#111'), fontWeight: '800', fontSize: 20 }}>👤</Text>
              <Text style={{ color: paid ? '#fff' : (selected ? '#fff' : '#374151'), fontSize: 12, marginTop: 4 }}>
                {paid ? `${num}✓` : num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const existingPaid = Number(paidUnits || 0);
  const remainingCount = Math.max(0, groupPeople - existingPaid);
  const amountNow = round2(unitTotalWithTip * partsToPay);

  return (
    <View style={{ padding: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 18 }}>Seleccionar partes a pagar</Text>
        <TouchableOpacity onPress={onCancel}><Text style={{ color: '#0b58ff' }}>Cerrar</Text></TouchableOpacity>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{ color:'#374151', fontWeight:'700' }}>Total de la cuenta</Text>
        <Text style={{ fontWeight:'900', fontSize:18, marginTop:4 }}>{round2(Number(total || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>

        <View style={{ height: 12 }} />

        <Text style={{ color:'#374151', fontWeight:'700' }}>Personas en el grupo</Text>
        <Text style={{ color:'#6b7280', marginTop:4 }}>{groupPeople} {groupPeople===1 ? 'persona' : 'personas'}</Text>

        <View style={{ height: 8 }} />

        <Text style={{ color:'#374151', fontWeight:'700' }}>Pagado (ya registrado)</Text>
        <Text style={{ color:'#6b7280', marginTop:4 }}>{existingPaid} {existingPaid===1 ? 'parte' : 'partes'} — {(round2(Number(paidAmount || 0))).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>

        <View style={{ height: 12 }} />

        <Text style={{ color:'#374151', fontWeight:'700' }}>Monto por parte (estimado, con propina)</Text>
        <Text style={{ color:'#111', fontWeight:'800', marginTop:4 }}>{unitTotalWithTip.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>

        <View style={{ height: 12 }} />

        <View style={{ marginTop: 6, alignItems:'center' }}>
          {renderPersonGrid()}
        </View>

        <View style={{ height: 12 }} />

        <View style={{ flexDirection:'row', justifyContent:'center', alignItems:'center', marginTop: 8 }}>
          <TouchableOpacity onPress={dec} disabled={partsToPay <= 1} style={{ width:56, height:56, borderRadius:10, backgroundColor:'#f3f4f6', alignItems:'center', justifyContent:'center', marginRight:12 }}>
            <Text style={{ fontSize:24, fontWeight:'800' }}>−</Text>
          </TouchableOpacity>

          <View style={{ alignItems:'center' }}>
            <Text style={{ fontSize:28, fontWeight:'900' }}>{partsToPay}</Text>
            <Text style={{ color:'#6b7280' }}>parte{partsToPay>1 ? 's' : ''}</Text>
          </View>

          <TouchableOpacity onPress={inc} disabled={partsToPay >= remainingCount} style={{ width:56, height:56, borderRadius:10, backgroundColor:'#f3f4f6', alignItems:'center', justifyContent:'center', marginLeft:12 }}>
            <Text style={{ fontSize:24, fontWeight:'800' }}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={setToMax} style={{ marginTop:8 }}>
          <Text style={{ color:'#0b58ff' }}>Pagar todas las partes restantes</Text>
        </TouchableOpacity>

        <View style={{ height: 18 }} />
        <Text style={{ fontWeight:'700' }}>A pagar ahora</Text>
        <Text style={{ fontSize:20, fontWeight:'900', marginTop:6 }}>{amountNow.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>

        <View style={{ height: 18 }} />

        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
          <TouchableOpacity onPress={onCancel} style={{ flex:1, marginRight:8, paddingVertical:12, borderRadius:8, backgroundColor:'#f3f4f6', alignItems:'center' }}>
            <Text style={{ color:'#374151', fontWeight:'700' }}>Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onPressConfirm} style={{ flex:1, marginLeft:8, paddingVertical:12, borderRadius:8, backgroundColor:'#0046ff', alignItems:'center' }} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800' }}>Confirmar y pagar {amountNow.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
