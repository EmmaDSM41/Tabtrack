import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const SAMPLE_PAYMENTS = [
  {
    id: 'p1',
    title: 'Consumos Cafetería - Noviembre 2025',
    date: '1 de noviembre de 2025',
    transactions: 5,
    amount: 2847.5,
    status: 'Pendiente',
    statusKey: 'pending',
    details: [
      {
        id: 't1',
        name: 'Juan Pérez Gómez',
        initials: 'JP',
        timestamp: '13 nov · 14:30',
        amount: 125.0,
        items: [
          { id: 'i1', label: 'Pizza x1', price: 85.0 },
          { id: 'i2', label: 'Refresco x2', price: 40.0 },
        ],
      },
      {
        id: 't2',
        name: 'Carlos Pérez González',
        initials: 'CP',
        timestamp: '12 nov · 08:15',
        amount: 95.0,
        items: [
          { id: 'i3', label: 'Café x2', price: 50.0 },
          { id: 'i4', label: 'Sandwich x1', price: 45.0 },
        ],
      },
    ],
  },
  {
    id: 'p2',
    title: 'Consumos Cafetería - Octubre 2025',
    date: '31 de octubre de 2025',
    transactions: 4,
    amount: 3125.8,
    status: 'Pagado',
    statusKey: 'paid',
    details: [
      {
        id: 't3',
        name: 'María López',
        initials: 'ML',
        timestamp: '31 oct · 20:10',
        amount: 150,
        items: [{ id: 'i5', label: 'Combo x1', price: 150 }],
      },
    ],
  },
  {
    id: 'p3',
    title: 'Consumos Cafetería - Septiembre 2025',
    date: '30 de septiembre de 2025',
    transactions: 3,
    amount: 2890.0,
    status: 'Pagado',
    statusKey: 'paid',
    details: [
      {
        id: 't4',
        name: 'Luis Martínez',
        initials: 'LM',
        timestamp: '30 sept · 13:20',
        amount: 120,
        items: [{ id: 'i6', label: 'Ensalada x1', price: 120 }],
      },
    ],
  },
  {
    id: 'p4',
    title: 'Consumos Cafetería - Agosto 2025',
    date: '31 de agosto de 2025',
    transactions: 2,
    amount: 2150.0,
    status: 'Pendiente',
    statusKey: 'pending',
    details: [
      {
        id: 't5',
        name: 'Ana Ruiz',
        initials: 'AR',
        timestamp: '29 ago · 11:00',
        amount: 75,
        items: [{ id: 'i7', label: 'Café x1', price: 25 }, { id: 'i8', label: 'Pan x2', price: 50 }],
      },
    ],
  },
];

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

  const assignedBalance = 3500.0;
  const consumed = 425.0;
  const available = assignedBalance - consumed;
  const utilization = Math.round((consumed / Math.max(1, assignedBalance)) * 1000) / 10;

  const gradientColors = ['#9F4CFF', '#6A43FF', '#2C7DFF'];

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const animY = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    animY.setValue(0);
  }, [animY]);

  const openSheetFor = (payment) => {
    setSelectedPayment(payment);
    setSheetVisible(true);
    Animated.timing(animY, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(animY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelectedPayment(null);
    });
  };

  const sheetTranslateY = animY.interpolate({
    inputRange: [0, 1],
    outputRange: [height, Math.max(120, height * 0.12)],
  });

  const renderPayment = ({ item }) => {
    const isPending = item.statusKey === 'pending';
    const isPaid = item.statusKey === 'paid';

    return (
      <View style={{ marginBottom: 12 }}>
        <View
          style={[
            styles.paymentCard,
            isPending ? styles.paymentCardPending : styles.paymentCardDefault,
          ]}
        >
          <View style={styles.paymentTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
              <View style={[styles.paymentIconWrap, { width: 52, height: 52, borderRadius: 12 }]}>
                <Ionicons name="time-outline" size={20} color={isPending ? '#FF7A54' : '#7C3AED'} />
              </View>

              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.paymentTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.paymentDate}>{item.date}</Text>
                <TouchableOpacity onPress={() => openSheetFor(item)}>
                  <Text style={styles.linkText}>{item.transactions} transacciones</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={styles.paymentAmount}>${Number(item.amount).toFixed(2)}</Text>

              {isPending && (
                <View style={[styles.badge, styles.badgePending]}>
                  <Ionicons name="time-outline" size={14} color="#B65713" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgeText, { color: '#B65713' }]}>{item.status}</Text>
                </View>
              )}

              {isPaid && (
                <View style={[styles.badge, styles.badgePaid]}>
                  <Ionicons name="checkmark" size={14} color="#0A6F3A" style={{ marginRight: 6 }} />
                  <Text style={[styles.badgeText, { color: '#0A6F3A' }]}>{item.status}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sepLine} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openSheetFor(item)}
            activeOpacity={0.9}
          >
            <Ionicons name="eye-outline" size={16} color="#6B21A8" />
            <Text style={styles.actionBtnText}>Ver detalle de consumos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTransaction = (tx) => {
    return (
      <View key={tx.id} style={sheetStyles.txRow}>
        <View style={sheetStyles.txLeft}>
          <View style={[sheetStyles.avatar, { backgroundColor: '#6B21A8' }]}>
            <Text style={sheetStyles.avatarText}>{tx.initials}</Text>
          </View>
        </View>

        <View style={sheetStyles.txCenter}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.txName}>{tx.name}</Text>
              <Text style={sheetStyles.txTime}>{tx.timestamp}</Text>
            </View>
            <Text style={sheetStyles.txAmountTop}>${Number(tx.amount).toFixed(2)}</Text>
          </View>

          <View style={sheetStyles.itemSeparator} />

          {tx.items.map((it) => (
            <View key={it.id} style={sheetStyles.txItemRow}>
              <Text style={sheetStyles.txItemLabel}>{it.label}</Text>
              <Text style={sheetStyles.txItemPrice}>${Number(it.price).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

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
                  <Text style={[styles.gradientTitle, { marginLeft: 12 }]}>Noviembre De 2025</Text>
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
                    <Text style={[styles.whiteSmallValue, { fontWeight: '800' }]}>
                      ${Number(available).toFixed(2)}
                    </Text>
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
                <TouchableOpacity onPress={() => navigation.navigate('InfoSaldo')}>
                  <Text style={styles.infoLink}>Saldo no utilizado no se acumula</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: horizontalPad,
            marginTop: 18,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={[styles.sectionTitle, { fontSize: headingFont }]}>Pagos al Restaurante</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={() => { /* export */ }}>
            <Ionicons name="download-outline" size={16} color="#111" />
            <Text style={styles.exportText}>Exportar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: horizontalPad, marginTop: 12 }}>
          <View style={styles.purpleNotice}>
            <Text style={styles.purpleNoticeText}>
              💡 Los consumos del mes se cobran automáticamente el último día
            </Text>
            <Text style={styles.purpleNoticeAmount}>
              Tu saldo mensual es de <Text style={{ fontWeight: '900', color: '#7C3AED' }}>${Number(assignedBalance).toFixed(2)}</Text>
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPad, marginTop: 12 }}>
          <FlatList
            data={SAMPLE_PAYMENTS}
            keyExtractor={(i) => i.id}
            renderItem={renderPayment}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            scrollEnabled={false}
          />
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
              {selectedPayment?.title ?? 'Detalle de consumos'}
            </Text>

            <View style={sheetStyles.totalBox}>
              <View style={{ flex: 1 }}>
                <Text style={sheetStyles.totalLabel}>Total del periodo</Text>
                <Text style={sheetStyles.totalSubs}>{selectedPayment?.transactions ?? 0} transacciones realizadas</Text>
              </View>
              <Text style={sheetStyles.totalAmount}>${Number(selectedPayment?.amount ?? 0).toFixed(2)}</Text>
            </View>

            <Text style={sheetStyles.sectionHeading}>Detalle de consumos</Text>

            <View style={{ marginTop: 10 }}>
              {(selectedPayment?.details || []).map((tx) => renderTransaction(tx))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </Modal>
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

  txRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 },
  txLeft: { width: 48, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  txCenter: { flex: 1, paddingLeft: 10 },
  txName: { fontWeight: '800', color: '#111827' },
  txTime: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  itemSeparator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  txItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  txItemLabel: { color: '#4B5563' },
  txItemPrice: { color: '#111827', fontWeight: '700' },
  txAmountTop: { fontWeight: '900', color: '#111827', marginLeft: 8 },
});
