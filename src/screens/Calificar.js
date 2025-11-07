import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Button,
  useWindowDimensions,
  PixelRatio,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const sampleNotifications = [
  { id: 'n1', text: 'Tu reserva en La Pizzería fue confirmada.', read: false },
  { id: 'n2', text: 'Nueva oferta: 20% de descuento en Sushi Place.', read: false },
  { id: 'n3', text: 'Recuerda calificar tu última visita a Café Central.', read: true },
];

export default function CalificarScreen({ navigation }) {
  const { width, height } = useWindowDimensions();

  const wp = (percent) => (Number(percent) / 100) * width;
  const hp = (percent) => (Number(percent) / 100) * height;
  const rf = (percent) => {
    const size = (Number(percent) / 100) * width;
    return Math.round(PixelRatio.roundToNearestPixel(size));
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

   const LEFT_COL = Math.round(clamp(wp(18), 56, 120));  
  const SLIDE_HEIGHT = Math.round(clamp(hp(14), 80, 140));  

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setNotifications(sampleNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const questions = [
    '¿Qué te parecio la calidad de los alimentos?',
    '¿Qué te parecio la calidad del servicio?',
    '¿Cómo calificarias la relacion precio/calidad?',
    '¿Qué tan comodo y agradable te parecio el ambiente del restaurante (limpieza/música/iluminación/temperatura/mobiliario?',
    '¿Cómo calificarias tu experiencia en general en el restaurante?',
    '¿Qué tanto recomendarias este lugar con algun conocido?',
  ];
  const [ratings, setRatings] = useState(Array(questions.length).fill(0));
  const setRating = (qIndex, star) => {
    const newRatings = [...ratings];
    newRatings[qIndex] = star;
    setRatings(newRatings);
  };

  const styles = makeStyles({ wp, hp, rf, clamp, width, height, LEFT_COL, SLIDE_HEIGHT });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Modal de Notificaciones */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={Math.round(rf(3.2))} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {notifications.map(n => (
                <View
                  key={n.id}
                  style={[
                    styles.notificationItem,
                    n.read ? styles.read : styles.unread,
                  ]}
                >
                  <Text style={styles.notificationText}>{n.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ padding: Math.round(hp(1)) }}>
              <Button title="Marcar todo como leído" onPress={markAllRead} color={'#0046ff'} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={Math.round(rf(5.2))} color={styles.headerTitle.color} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Calificar</Text>

        <View style={styles.headerIcons}>
{/*           <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          /> */}
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={styles.notificationButton}
          >
            <Ionicons
              name="notifications-outline"
              size={Math.round(rf(5.2))}
              color={styles.headerTitle.color}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeading}>Detalle</Text>

        <View style={styles.topSection}>
          <View style={styles.logoColumn}>
            <View style={styles.avatarWrapper}>
              <Image
                source={require('../../assets/images/barra.png')}
                style={styles.avatar}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.slider}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {[1, 2, 3].map(i => (
              <Image
                key={i}
                source={require('../../assets/images/restaurante.jpeg')}
                style={styles.slideImage}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.rightColumn}>
          <Text style={styles.instruction}>
            Por favor,{' '}
            <Text style={styles.bold}>califica tu experiencia en el Japonéz</Text>{' '}
            con base en las siguientes preguntas:
          </Text>

          {questions.map((q, i) => (
            <View key={i} style={styles.questionBlock}>
              <Text style={styles.questionText}>{`${i + 1}. ${q}`}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRating(i, star)}>
                    <Ionicons
                      name={star <= ratings[i] ? 'star' : 'star-outline'}
                      size={Math.round(rf(3.5))}
                      color="#0033cc"
                      style={{ marginRight: Math.round(wp(1)) }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('Rating')}
            >
              <Text style={styles.btnText}>Enviar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.btnText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const BLUE = '#0046ff';

function makeStyles({ wp, hp, rf, clamp, width, height, LEFT_COL, SLIDE_HEIGHT }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Math.round(hp(1.2)),
      paddingHorizontal: Math.round(wp(3.5)),
      borderBottomWidth: 1,
      borderBottomColor: BLUE,
      justifyContent: 'space-between',
    },
    headerButton: { padding: Math.round(wp(1.5)) },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: clamp(rf(4.8), 16, 26),
      fontWeight: '600',
      color: BLUE,
      fontFamily: 'Montserrat-Bold' // deja descomentada si la tienes
    },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    logo: { width: Math.round(wp(20)), height: Math.round(rf(3.6)), resizeMode: 'contain' },
    notificationButton: { marginLeft: Math.round(wp(3)) },

    badge: {
      position: 'absolute',
      top: -Math.round(hp(0.8)),
      right: -Math.round(wp(1.2)),
      backgroundColor: '#ff3b30',
      borderRadius: Math.round(wp(3)),
      paddingHorizontal: Math.round(wp(1.5)),
      paddingVertical: Math.round(hp(0.2)),
      minWidth: Math.round(wp(5)),
      alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: Math.round(rf(2.6)), textAlign: 'center' },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBox: {
      width: Math.round(wp(90)),
      maxHeight: Math.round(hp(70)),
      backgroundColor: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Math.round(hp(1.6)),
      borderBottomWidth: 1,
      borderColor: '#eee',
    },
    modalTitle: { fontSize: Math.round(rf(3.6)), color: '#000000' },
    modalList: { maxHeight: Math.round(hp(35)), paddingHorizontal: Math.round(wp(4)) },
    notificationItem: { paddingVertical: Math.round(hp(1.2)), borderBottomWidth: 1, borderColor: '#f0f0f0' },
    notificationText: { fontSize: Math.round(rf(3.2)), color: '#333' },
    unread: { backgroundColor: '#eef5ff' },
    read: { backgroundColor: '#fff' },

    scrollContent: { paddingVertical: Math.round(hp(2)) },

    sectionHeading: {
      fontSize: clamp(rf(6.6), 18, 34),
      fontWeight: '600',
      color: BLUE,
      marginBottom: Math.round(hp(2)),
      paddingHorizontal: Math.round(wp(4)),
      fontFamily: 'Montserrat-Bold'
    },

    topSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Math.round(hp(2)),
      paddingHorizontal: Math.round(wp(4)),
    },
    logoColumn: { width: LEFT_COL, alignItems: 'center' },
    avatarWrapper: {
      width: Math.round(clamp(LEFT_COL * 0.7, 44, 86)),
      height: Math.round(clamp(LEFT_COL * 0.7, 44, 86)),
      borderRadius: Math.round(clamp(LEFT_COL * 0.7, 44, 86) / 2),
      borderWidth: 1,
      borderColor: BLUE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatar: {
      width: Math.round(clamp(LEFT_COL * 0.6, 40, 78)),
      height: Math.round(clamp(LEFT_COL * 0.6, 40, 78)),
      borderRadius: Math.round(clamp(LEFT_COL * 0.6, 40, 78) / 2),
    },

    slider: {
      marginLeft: Math.round(wp(4)),
      width: Math.round(width - LEFT_COL - Math.round(wp(8))),
      height: SLIDE_HEIGHT,
    },
    slideImage: {
      width: Math.round(width - LEFT_COL - Math.round(wp(8))),
      height: SLIDE_HEIGHT,
      borderRadius: 8,
      resizeMode: 'cover',
      marginRight: Math.round(wp(2)),
    },

    rightColumn: {
      marginLeft: LEFT_COL + Math.round(wp(3)),
      paddingHorizontal: Math.round(wp(4)),
      paddingBottom: Math.round(hp(4)),
    },
    instruction: {
      fontSize: Math.round(clamp(rf(3.2), 12, 16)),
      color: '#333',
      marginBottom: Math.round(hp(1.4)),
      lineHeight: Math.round(clamp(rf(4.8), 18, 26)),
      fontFamily: 'Montserrat-Bold'
    },
    bold: { fontWeight: '600' },

    questionBlock: { marginBottom: Math.round(hp(2)) },
    questionText: {
      fontSize: Math.round(clamp(rf(3.2), 12, 16)),
      color: '#333',
      marginBottom: Math.round(hp(1)),
      lineHeight: Math.round(clamp(rf(4.2), 16, 24)),
      fontFamily: 'Montserrat-Regular'
    },
    starsRow: { flexDirection: 'row' },

    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Math.round(hp(2)),
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: BLUE,
      paddingVertical: Math.max(10, Math.round(hp(1.6))),
      borderRadius: Math.round(wp(2.5)),
      marginRight: Math.round(wp(2)),
      alignItems: 'center',
    },
    btnSecondary: {
      flex: 1,
      backgroundColor: BLUE,
      paddingVertical: Math.max(10, Math.round(hp(1.6))),
      borderRadius: Math.round(wp(2.5)),
      marginLeft: Math.round(wp(2)),
      alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: Math.round(clamp(rf(3.6), 12, 16)), fontWeight: '700' },
  });
}
