import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const SLIDER_HEIGHT = 250;
const AVATAR_DIAMETER = 60;
const BLUE = '#0046ff';
const OVERLAY = 'rgba(0,0,0,0.4)';

const sliderImages = [
  require('../../assets/images/restaurante.jpeg'),
  require('../../assets/images/restaurante.jpeg'),
  require('../../assets/images/restaurante.jpeg'),
];
const tabtrackLogo = require('../../assets/images/logo.png');
const avatarImg = require('../../assets/images/restaurante.jpeg');
const heartIcon = require('../../assets/images/logo.png');
const shareIcon = require('../../assets/images/logo.png');

export default function Reservation({ navigation }) {
  // --- Fecha ---
  const initialDate = new Date(2024, 11, 30);
  const [date, setDate] = useState(initialDate);
  const formatDate = d => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };
  const [dateStr, setDateStr] = useState(formatDate(initialDate));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Contadores ---
  const [guests, setGuests] = useState('8');
  const [babies, setBabies] = useState('2');
  const [disabled, setDisabled] = useState('1');

  // --- Modal de edición ---
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  const openEdit = field => {
    setEditingField(field);
    if (field === 'guests') {
      setTempValue(guests);
    } else {
      setTempValue(`${babies},${disabled}`);
    }
    setEditModalVisible(true);
  };
  const saveEdit = () => {
    if (editingField === 'guests') {
      setGuests(tempValue);
    } else {
      const [b, d] = tempValue.split(',');
      setBabies(b || '0');
      setDisabled(d || '0');
    }
    setEditModalVisible(false);
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDateStr(formatDate(selectedDate));
    }
  };

  // --- Slider ---
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollRef = useRef(null);

  // --- Compartir por email ---
  const onShare = () => {
    const msg = `Reservación para el ${dateStr}\nComensales: ${guests}`;
    Linking.openURL(`mailto:?subject=Mi reservación&body=${msg}`).catch(() => {});
  };

  // --- Favoritos ---
  const [isFavorite, setIsFavorite] = useState(false);
  const [favModalVisible, setFavModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('favorites')
      .then(raw => {
        const favs = raw ? JSON.parse(raw) : [];
        // Usamos la clave 'reservation' para este ejemplo
        setIsFavorite(favs.includes('reservation'));
      })
      .catch(() => {});
  }, []);

  const toggleFavorite = async () => {
    const raw = (await AsyncStorage.getItem('favorites')) || '[]';
    const favs = JSON.parse(raw);
    let updated;
    if (isFavorite) {
      updated = favs.filter(f => f !== 'reservation');
    } else {
      updated = [...favs, 'reservation'];
    }
    await AsyncStorage.setItem('favorites', JSON.stringify(updated));
    setIsFavorite(!isFavorite);
    setFavModalVisible(true);
  };

  if (slideIndex == null) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modal favorito */}
      <Modal
        visible={favModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFavModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Image source={tabtrackLogo} style={styles.modalLogo} />
            <Text style={styles.modalText}>
              {isFavorite ? 'Agregado a favoritos' : 'Eliminado de favoritos'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setFavModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Ok</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView>
        {/* Slider con header */}
        <View style={styles.sliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={e =>
              setSlideIndex(
                Math.round(e.nativeEvent.contentOffset.x / width)
              )
            }
            scrollEventThrottle={16}
            ref={scrollRef}
          >
            {sliderImages.map((src, i) => (
              <Image key={i} source={src} style={styles.sliderImage} />
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {sliderImages.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === slideIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Encabezado */}
          <View style={styles.topOverlay}>
           
            <Image source={tabtrackLogo} style={styles.topLogo} />
            <View style={styles.topIconsRight}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
              <TouchableOpacity onPress={onShare}>
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color="#fff"
                  style={styles.iconSpacing}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleFavorite}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? 'red' : '#fff'}
                  style={styles.iconSpacing}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image source={avatarImg} style={styles.avatar} />
        </View>

        {/* Tarjeta de detalles */}
        <View style={styles.card}>
          <Text style={styles.heading}>Tu reservación</Text>

          {/* Fecha */}
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.value}>{dateStr}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.edit}>Editar</Text>
            </TouchableOpacity>
          </View>

          {/* Comensales */}
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.label}>Comensales</Text>
              <Text style={styles.value}>
                <Text style={styles.valueBold}>{guests}</Text> comensales
              </Text>
            </View>
            <TouchableOpacity onPress={() => openEdit('guests')}>
              <Text style={styles.edit}>Editar</Text>
            </TouchableOpacity>
          </View>

          {/* Servicios */}
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.label}>Servicios adicionales</Text>
              <Text style={styles.value}>
                <Text style={styles.valueBold}>{babies}</Text> bebés /{' '}
                <Text style={styles.valueBold}>{disabled}</Text> discapacitado
              </Text>
            </View>
            <TouchableOpacity onPress={() => openEdit('services')}>
              <Text style={styles.edit}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.subheading}>Cancelación gratuita</Text>
          <Text style={styles.paragraph}>
            Con 6 horas de anticipación
          </Text>

          <Text style={[styles.subheading, { marginTop: 12 }]}>
            Políticas de cancelación.
          </Text>
          <Text style={styles.paragraph}>
             
          </Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Confirmar Reservación</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DatePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
        />
      )}

      {/* Modal de edición */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {editingField === 'guests' ? (
              <>
                <Text style={styles.modalLabel}>Comensales</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={tempValue}
                  onChangeText={setTempValue}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Bebés</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={tempValue.split(',')[0]}
                  onChangeText={val =>
                    setTempValue(`${val},${tempValue.split(',')[1] || ''}`)
                  }
                />
                <Text style={[styles.modalLabel, { marginTop: 12 }]}>
                  Discapacitado
                </Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={tempValue.split(',')[1]}
                  onChangeText={val =>
                    setTempValue(`${tempValue.split(',')[0] || ''},${val}`)
                  }
                />
              </>
            )}
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveEdit}
              >
                <Text style={{ color: '#fff' }}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2',     paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
 },
  loading: { justifyContent: 'center', alignItems: 'center' },

  // Slider + header
  sliderContainer: { width, height: SLIDER_HEIGHT, backgroundColor: '#000' },
  sliderImage: { width, height: SLIDER_HEIGHT, resizeMode: 'cover' },
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff66',
    margin: 4,
  },
  dotActive: { backgroundColor: BLUE },
  topOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLogo: { width: 80, height: 24, resizeMode: 'contain', tintColor: '#fff' },
  topIconsRight: { flexDirection: 'row' },
  iconSpacing: { marginLeft: 12 },

  // Avatar
  avatarContainer: {
    position: 'absolute',
    top: SLIDER_HEIGHT - AVATAR_DIAMETER / 2 - 24,
    left: 26,
    width: AVATAR_DIAMETER,
    height: AVATAR_DIAMETER,
    borderRadius: AVATAR_DIAMETER / 2,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  avatar: {
    width: AVATAR_DIAMETER - 6,
    height: AVATAR_DIAMETER - 8,
    borderRadius: (AVATAR_DIAMETER - 8) / 2,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    marginTop: -24,
    paddingTop: AVATAR_DIAMETER / 2 + 16,
    paddingHorizontal: 40,
    paddingBottom: 24,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  heading: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: BLUE, marginBottom: 16, textAlign: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  label: { fontSize: 14, color: '#000', fontFamily: 'Montserrat-Bold' },
  value: { fontSize: 16, color: '#000', marginTop: 4, fontFamily: 'Montserrat-Regular' },
  valueBold: { fontFamily: 'Montserrat-Bold', color: '#000' },
  edit: { fontSize: 14, color: BLUE, fontFamily: 'Montserrat-Regular' },

  divider: { borderBottomWidth: 1, borderColor: BLUE, opacity: 0.4, marginVertical: 16 },
  subheading: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: BLUE, marginBottom: 4 },
  paragraph: { fontSize: 13, color: '#000', lineHeight: 18, fontFamily: 'Montserrat-Regular' },

  button: { marginTop: 24, backgroundColor: BLUE, borderRadius: 4, height: 48, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat-Bold' },

  // Modales
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: OVERLAY, justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '80%', backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  modalLogo: { width: 60, height: 24, resizeMode: 'contain', marginBottom: 12 },
  modalText: { fontSize: 16, color: '#000', marginBottom: 16, fontFamily: 'Montserrat-Regular' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: BLUE, marginLeft: 8, },
  modalBtnText: { color: BLUE, fontFamily: 'Montserrat-Bold' },
  modalBtnSave: { backgroundColor: BLUE, borderColor: BLUE },

  // Modal de edición
  modalLabel: { fontSize: 14, marginBottom: 4, fontFamily: 'Montserrat-Bold', color: '#000' },
  modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, height: 40, paddingHorizontal: 8, color: '#000' },
  
});
