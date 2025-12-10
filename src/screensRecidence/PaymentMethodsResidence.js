import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Dimensions,
  PixelRatio,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const STORAGE_KEY = 'saved_cards';
const BLUE = '#0046ff';
const SOFT_BLUE = '#dbe8ff';
const DOT_COLOR = '#ccc';

const initialMethods = [
  { key: 'card1', label: 'Open Pay', icon: 'card-outline' },
  { key: 'card2', label: 'Stripe', icon: 'card-outline' },
  { key: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
];

const PlainInput = React.memo(
  React.forwardRef(function PlainInput(props, ref) {
    const {
      placeholder,
      value,
      onChangeText,
      keyboardType = 'default',
      secureTextEntry = false,
      maxLength,
      autoCapitalize = 'sentences',
      style,
      returnKeyType = 'done',
    } = props;
    return (
      <View style={styles.inputRow}>
        <TextInput
          ref={ref}
          style={[styles.inputPlain, style]}
          placeholder={placeholder}
          placeholderTextColor="#9aa0a6"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          blurOnSubmit={false}
          underlineColorAndroid="transparent"
        />
      </View>
    );
  })
);

/* Small styled toast component (white card) */
function SmallToast({ message, visible, success }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[
        toastStyles.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
          borderColor: success ? '#e6f9ee' : '#f0f0f0',
        },
      ]}
    >
      <Text style={[toastStyles.toastText, success && { color: '#0a6b2b' }]}>{message}</Text>
    </Animated.View>
  );
}

export default function PaymentMethodsResidence({ navigation }) {
  // responsive helpers using current window (better for orientation changes)
  const { width: dimWidth, height: dimHeight } = Dimensions.get('window');
  const wp = p => Math.round((Number(p) / 100) * dimWidth);
  const hp = p => Math.round((Number(p) / 100) * dimHeight);
  const rf = p => {
    const scale = (Number(p) / 100) * dimWidth;
    return Math.round(PixelRatio.roundToNearestPixel(scale));
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const headerPaddingVertical = useMemo(() => clamp(hp(3.5), 12, 36), [dimHeight]);
  const headerPaddingHorizontal = useMemo(() => clamp(wp(4), 12, 28), [dimWidth]);
  const avatarSize = useMemo(() => clamp(Math.round(Math.min(dimWidth * 0.08, 40)), 28, 48), [dimWidth]);
  const modalWidth = useMemo(() => Math.min(Math.round(dimWidth * 0.88), 520), [dimWidth]);
  const iconSize = useMemo(() => clamp(Math.round(rf(2.6)), 16, 26), [dimWidth]);

  // app state
  const [methods, setMethods] = useState(initialMethods);
  const [username, setUsername] = useState('Usuario');
  const [profileUrl, setProfileUrl] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  // card form
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [address, setAddress] = useState('');

  // saved cards local
  const [savedCards, setSavedCards] = useState([]);

  // toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastSuccess, setToastSuccess] = useState(false);
  const toastTimeoutRef = useRef(null);

  // refs
  const cardHolderRef = useRef(null);
  const cardNumberRef = useRef(null);
  const expiryRef = useRef(null);
  const cvvRef = useRef(null);
  const addressRef = useRef(null);

  // load profile and saved cards
  useEffect(() => {
    (async () => {
      try {
        const nombre = await AsyncStorage.getItem('user_nombre');
        const apellido = await AsyncStorage.getItem('user_apellido');

        let displayName = '';
        if (nombre && apellido) displayName = `${nombre.trim()} ${apellido.trim()}`;
        else if (nombre) displayName = nombre.trim();
        else if (apellido) displayName = apellido.trim();
        else displayName = 'Usuario';

        setUsername(displayName);

        const cachedUrl = await AsyncStorage.getItem('user_profile_url');
        if (cachedUrl) setProfileUrl(cachedUrl);
      } catch (e) {
        console.warn('Error leyendo AsyncStorage', e);
      }

      // load saved cards
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSavedCards(parsed);
        }
      } catch (e) {
        console.warn('Error cargando tarjetas guardadas', e);
      }
    })();
  }, []);

  // helpers: toast (small white card)
  const showToast = useCallback((message, success = false, duration = 1600) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToastMsg(message);
    setToastSuccess(success);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  // formatters
  const formatCardNumber = useCallback((text) => {
    const digits = String(text).replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  }, []);
  const onChangeCardNumber = useCallback((t) => setCardNumber(formatCardNumber(t)), [formatCardNumber]);

  const formatExpiry = useCallback((text) => {
    const digits = String(text).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }, []);
  const onChangeExpiry = useCallback((t) => setExpiryDate(formatExpiry(t)), [formatExpiry]);

  // save card locally
  const persistCards = useCallback(async (cards) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.warn('Error guardando tarjetas en AsyncStorage', e);
    }
  }, []);

  const saveCard = useCallback(() => {
    const rawCard = String(cardNumber).replace(/\s/g, '');
    if (!cardHolderName.trim()) {
      showToast('Ingresa el nombre del titular', false);
      return;
    }
    if (rawCard.length < 13) {
      showToast('Número de tarjeta inválido', false);
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      showToast('Fecha inválida (MM/AA)', false);
      return;
    }
    if (cvv.length < 3) {
      showToast('CVV inválido', false);
      return;
    }

    const newCard = {
      id: `${Date.now()}`,
      holder: cardHolderName.trim(),
      number_masked: rawCard.length >= 4 ? `•••• •••• •••• ${rawCard.slice(-4)}` : formatCardNumber(rawCard),
      last4: rawCard.slice(-4),
      expiry: expiryDate,
      address: address.trim(),
      raw: rawCard, // local only
    };

    const updated = [newCard, ...savedCards];
    setSavedCards(updated);
    persistCards(updated);

    // clear form and close modal
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardHolderName('');
    setAddress('');
    setModalVisible(false);
    showToast('Tarjeta guardada', true);
  }, [cardNumber, cardHolderName, expiryDate, cvv, address, savedCards, persistCards, formatCardNumber, showToast]);

  // remove card by id (long press)
  const removeCard = useCallback((id) => {
    const filtered = savedCards.filter(c => c.id !== id);
    setSavedCards(filtered);
    persistCards(filtered);
    showToast('Tarjeta eliminada', true);
  }, [savedCards, persistCards, showToast]);

  // open modal
  const openAddCardModal = () => {
    setSelectedMethod(null);
    setModalVisible(true);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardHolderName('');
    setAddress('');
    if (Platform.OS === 'ios') {
      setTimeout(() => cardHolderRef.current && cardHolderRef.current.focus && cardHolderRef.current.focus(), 220);
    }
  };

  // helpers UI: display brand-ish icon from last4 (simple)
  const CardItem = ({ card }) => (
    <View style={styles.cardItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{card.number_masked}</Text>
        <Text style={styles.cardMeta}>{card.holder} · {card.expiry}</Text>
      </View>
      <TouchableOpacity
        onPress={() => { showToast('Tarjeta seleccionada', true); }}
        onLongPress={() => {
          Alert.alert(
            'Eliminar tarjeta',
            '¿Deseas eliminar esta tarjeta?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => removeCard(card.id) },
            ]
          );
        }}
        style={styles.cardAction}
      >
        <Text style={{ color: BLUE, fontWeight: '700' }}>Usar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingVertical: headerPaddingVertical, paddingHorizontal: headerPaddingHorizontal }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={Math.round(clamp(iconSize, 20, 28))} color={BLUE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: clamp(Math.round(rf(2.6)), 20, 22) }]}>Perfil</Text>

        <View style={styles.headerRight}>
          <View style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: Math.round(avatarSize / 2),
            overflow: 'hidden',
            backgroundColor: '#f3f6ff',
            marginHorizontal: 8
          }}>
            {profileUrl ? (
              <Image
                source={{ uri: profileUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={[styles.avatarInitials, { fontSize: Math.round(avatarSize * 0.36) }]}>
                  {getInitials(username) || '👤'}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.username, { fontSize: clamp(Math.round(rf(1.8)), 14, 18), marginRight: Math.round(Math.max(8, dimWidth * 0.02)) }]} numberOfLines={1}>
            {username}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.max(16, Math.round(dimWidth * 0.06)) }]} keyboardShouldPersistTaps="always">
        <View style={[styles.sectionHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="card-outline" size={20} color={BLUE} />
            <Text style={[styles.sectionTitle, { fontSize: clamp(Math.round(rf(1.9)), 14, 18), marginLeft: 8 }]}>Métodos de Pago</Text>
          </View>

          <TouchableOpacity
            onPress={openAddCardModal}
            style={styles.addButton}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Agregar tarjeta"
          >
            <Ionicons name="add" size={18} color={BLUE} style={{ marginRight: 6 }} />
            <Text style={{ color: BLUE, fontWeight: '700' }}>Agregar tarjeta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 18 }}>
          {savedCards.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ color: '#333', marginBottom: 8 }}>No existe métodos de pago vigentes para esta
                aplicación se harán a través de Nube house
              </Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {savedCards.map(card => (
                <CardItem key={card.id} card={card} />
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.saveButton, { alignSelf: dimWidth > 420 ? 'flex-end' : 'flex-start' }]} onPress={() => Alert.alert('Guardar', 'Función no implementada aún.')}>
          <Text style={[styles.saveButtonText, { fontSize: clamp(Math.round(rf(1.6)), 13, 16) }]}>Guardar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal para agregar tarjeta (fade) */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)} presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrapper}>
            <View style={[styles.modalContainer, { width: modalWidth }]}>
              <LinearGradient colors={['#ffffff', '#fbfbff']} style={styles.modalGradient}>
                <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)} accessibilityLabel="Cerrar">
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>

                <Text style={[styles.modalTitle, { fontSize: clamp(Math.round(rf(2.1)), 16, 20) }]}>Agregar tarjeta</Text>

                <View style={{
                  width: '100%',
                  borderRadius: 12,
                  padding: 14,
                  marginVertical: 8,
                  backgroundColor: '#fff',
                  borderWidth: 1.6,
                  borderColor: SOFT_BLUE,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 10,
                  elevation: 4,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ color: '#222', fontWeight: '700', fontSize: 13 }}>Tarjeta</Text>

                      <Text
                        style={styles.cardNumber}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.68}
                      >
                        {cardNumber ? cardNumber : '•••• •••• •••• ••••'}
                      </Text>

                      <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#666', marginRight: 12 }}>Titular</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={styles.cardHolder}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.68}
                          >
                            {cardHolderName ? cardHolderName : 'NOMBRE APELLIDO'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ width: 110, alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: '#f0f6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e6eefc' }}>
                        <Text
                          style={styles.expiryText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.68}
                        >
                          {expiryDate ? expiryDate : 'MM/AA'}
                        </Text>
                      </View>
                      <Image source={require('../../assets/images/logo.png')} style={{ width: 64, height: 18, marginTop: 16 }} resizeMode="contain" />
                    </View>
                  </View>
                </View>

                {/* Inputs planos */}
                <PlainInput
                  ref={cardHolderRef}
                  placeholder="Nombre del titular"
                  value={cardHolderName}
                  onChangeText={setCardHolderName}
                  autoCapitalize="words"
                />

                <PlainInput
                  ref={cardNumberRef}
                  placeholder="Número de tarjeta"
                  value={cardNumber}
                  onChangeText={onChangeCardNumber}
                  keyboardType="number-pad"
                  maxLength={19}
                  autoCapitalize="none"
                />

                <View style={styles.row}>
                  <View style={{ width: '58%' }}>
                    <PlainInput
                      ref={expiryRef}
                      placeholder="MM/AA"
                      value={expiryDate}
                      onChangeText={onChangeExpiry}
                      keyboardType="number-pad"
                      maxLength={5}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={{ width: '38%' }}>
                    <PlainInput
                      ref={cvvRef}
                      placeholder="CVV"
                      value={cvv}
                      onChangeText={(t) => setCvv(String(t).replace(/\D/g, '').slice(0, 4))}
                      keyboardType="number-pad"
                      secureTextEntry={true}
                      maxLength={4}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <PlainInput
                  ref={addressRef}
                  placeholder="Dirección (opcional)"
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="words"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButtonModal} onPress={saveCard}>
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>

                {/* small toast inside modal */}
                <SmallToast message={toastMsg} visible={toastVisible} success={toastSuccess} />
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* small toast at screen level too (for deletes/others) */}
      <View style={toastStyles.container} pointerEvents="box-none">
        <SmallToast message={toastMsg} visible={toastVisible} success={toastSuccess} />
      </View>
    </SafeAreaView>
  );
}

/* helper initials */
function getInitials(name) {
  if (!name) return '👤';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '👤';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BLUE },
  headerTitle: { fontSize: 22, fontWeight: '600', color: BLUE },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  avatarInitials: { color: '#0046ff', fontWeight: '700' },
  username: { fontSize: 16, color: '#000', marginRight: 16, maxWidth: 160 },
  backButton: { marginRight: 12 },
  scrollContent: { paddingTop: 16, paddingBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: BLUE, marginLeft: 8 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6eefc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#0046ff',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  saveButton: { alignSelf: 'flex-start', backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 18 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  /* empty state / cards list */
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fbfbff',
    borderWidth: 1,
    borderColor: '#eef1ff',
  },
  cardsList: {
    marginTop: 8,
    paddingVertical: 4,
  },
  cardItem: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef1ff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  cardLabel: { fontSize: 16, color: '#222', fontWeight: '700' },
  cardMeta: { fontSize: 13, color: '#666', marginTop: 6 },
  cardAction: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e6eefc', backgroundColor: '#fff' },

  /* modal original look restored */
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,10,20,0.6)' },
  modalWrapper: { width: '100%', alignItems: 'center', paddingHorizontal: 18 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10 },
  modalGradient: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  modalClose: { position: 'absolute', top: 6, right: 6, zIndex: 10, padding: 6 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: BLUE, marginBottom: 8 },

  cardPreview: { width: '100%', borderRadius: 12, padding: 14, marginVertical: 8, backgroundColor: '#fff', borderWidth: 1.6, borderColor: SOFT_BLUE, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  cardNumber: {
    color: '#222',
    marginTop: 10,
    fontSize: 18,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  cardHolder: {
    color: '#222',
    fontWeight: '700',
    fontSize: 14,
  },
  expiryText: {
    color: '#0046ff',
    fontWeight: '700',
    fontSize: 14,
  },

  inputRow: {
    width: '100%',
    backgroundColor: '#fbfbfd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eef1f6',
    paddingHorizontal: 9,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 8,
  },
  inputPlain: { fontSize: 13, color: '#222', padding: 0 },

  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ff', paddingVertical: 8, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: BLUE, fontWeight: '700', fontSize: 13 },
  saveButtonModal: { flex: 1, backgroundColor: BLUE, paddingVertical: 8, borderRadius: 8, marginLeft: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

/* toast styles */
const toastStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    minWidth: 140,
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 13,
    color: '#222',
    textAlign: 'center',
  },
});
