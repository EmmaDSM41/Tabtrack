import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Easing,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ToastLib from 'react-native-root-toast';

const BLUE = '#0046ff';
const DOT_COLOR = '#ccc';
const API_BASE_URL = 'https://api.tab-track.com/api/mobileapp/usuarios';
const API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MjE4NzAyOCwianRpIjoiMTdlYTVjYTAtZTE3MC00ZjIzLTllMTgtZmZiZWYyMzg4OTE0IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjIxODcwMjgsImV4cCI6MTc2NDc3OTAyOCwicm9sIjoiRWRpdG9yIn0.W_zoGW2YpqCyaxpE1c_hnRXdtw5ty0DDd8jqvDbi6G0';

export default function InfoPersonal({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // responsive helpers
  const wp = (p) => (width * Number(p)) / 100;
  const hp = (p) => (height * Number(p)) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // responsive values
  const iconSize = clamp(Math.round(width * 0.055), 18, 28);
  const headerPadV = clamp(Math.round(hp(3)), 8, 36);
  const headerPadH = clamp(Math.round(wp(4)), 8, 30);
  const avatarSize = clamp(Math.round(wp(6.5)), 32, 56);
  const fieldFont = clamp(Math.round(width * 0.036), 13, 16);
  const labelFont = clamp(Math.round(width * 0.038), 13, 18);
  const modalWidth = Math.min(Math.round(width * 0.9), 720);
  const titleFont = clamp(Math.round(width * 0.038), 20, 22);

  // state
  const [user, setUser] = useState({
    nombre: '',
    apellido: '',
    cumpleanos: '',
    direccion: '',
    mail: '',
    telefono: '',
    tipo_comida: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldValue, setFieldValue] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [toastStyle, setToastStyle] = useState(styles.successToast);
  const [toastDuration, setToastDuration] = useState(2000);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [profileUrl, setProfileUrl] = useState(null);

  const [editingKey, setEditingKey] = useState(null);
  const currentInputRef = useRef(null);
  const keyboardListenerRef = useRef(null);

  // combine safe area top with StatusBar height for Android
  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  // bottom safe for toast placement
  const bottomSafe = Math.round(insets.bottom || 0);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem('user_usuario_app_id');
      if (!id) return navigation.replace('Login');

      try {
        const nombre = await AsyncStorage.getItem('user_nombre') || '';
        const apellido = await AsyncStorage.getItem('user_apellido') || '';
        const cumpleanos = await AsyncStorage.getItem('user_cumpleanos') || '';
        const direccion = await AsyncStorage.getItem('user_direccion') || '';
        const mail = await AsyncStorage.getItem('user_mail') || '';
        const telefono = await AsyncStorage.getItem('user_telefono') || '';
        const tipo_comida = await AsyncStorage.getItem('user_tipo_comida') || '';

        setUser({ nombre, apellido, cumpleanos, direccion, mail, telefono, tipo_comida });

        try {
          const cachedUrl = await AsyncStorage.getItem('user_profile_url');
          if (cachedUrl) setProfileUrl(cachedUrl);
        } catch (e) {
          console.warn('Error leyendo user_profile_url desde AsyncStorage', e);
        }

        // fetch official user info by email if available
        try {
          const mailToQuery = mail || '';
          if (mailToQuery) {
            const endpoint = `${API_BASE_URL}?mail=${encodeURIComponent(mailToQuery)}&presign_ttl=30`;
            const headers = { Accept: 'application/json' };
            if (API_AUTH_TOKEN && API_AUTH_TOKEN.trim()) headers.Authorization = `Bearer ${API_AUTH_TOKEN}`;

            let resp;
            try {
              resp = await fetch(endpoint, { method: 'GET', headers });
            } catch (networkErr) {
              console.warn('InfoPersonal: error network fetching usuario', networkErr);
            }

            if (resp && resp.ok) {
              try {
                const body = await resp.json();
                const apiUser = Array.isArray(body.usuarios) && body.usuarios.length > 0
                  ? body.usuarios[0]
                  : (Array.isArray(body.data) && body.data.length > 0 ? body.data[0] : null);

                if (apiUser) {
                  const normalized = {
                    nombre: apiUser.nombre ?? '',
                    apellido: apiUser.apellido ?? '',
                    cumpleanos: apiUser.cumpleanos ?? '',
                    direccion: apiUser.direccion ?? '',
                    mail: apiUser.mail ?? '',
                    telefono: apiUser.telefono ?? '',
                    tipo_comida: apiUser.tipo_comida ?? ''
                  };

                  setUser(normalized);
                  try {
                    for (const k of Object.keys(normalized)) {
                      await AsyncStorage.setItem(`user_${k}`, normalized[k] ?? '');
                    }
                    if (apiUser.foto_perfil_url) {
                      await AsyncStorage.setItem('user_profile_url', apiUser.foto_perfil_url);
                      setProfileUrl(apiUser.foto_perfil_url);
                    }
                  } catch (e) {
                    console.warn('InfoPersonal: error guardando campos desde API en AsyncStorage', e);
                  }
                } else {
                  console.warn('InfoPersonal: la respuesta API no contiene usuarios para el mail dado');
                }
              } catch (parseErr) {
                console.warn('InfoPersonal: error parsing user api response', parseErr);
              }
            } else if (resp) {
              const txt = await (async () => { try { return await resp.text(); } catch (_) { return null; } })();
              console.warn('InfoPersonal: fetch usuarios returned not-ok', resp.status, txt);
            }
          }
        } catch (errApi) {
          console.warn('InfoPersonal: error fetching usuarios by mail', errApi);
        }
      } catch (e) {
        ToastLib.show('Error al cargar datos', { duration: 2000 });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  // Keyboard listener: when keyboard hides finish inline edit
  useEffect(() => {
    const onHide = () => {
      if (editingKey) {
        finishInlineEdit(editingKey);
      }
    };
    const sub = Keyboard.addListener('keyboardDidHide', onHide);
    keyboardListenerRef.current = sub;
    return () => {
      try { keyboardListenerRef.current && keyboardListenerRef.current.remove(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingKey, user]);

  const showToast = (message, cb, customStyle = styles.successToast, duration = 2000) => {
    setToastMsg(message);
    setToastStyle(customStyle);
    setToastDuration(duration);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true
        }).start(() => cb && cb());
      }, duration);
    });
  };

  // openModal (kept for compatibility)
  const openModal = (key, label) => {
    setFieldKey(key);
    setFieldLabel(label);
    setFieldValue(user[key]);
    setModalVisible(true);
  };

  const saveField = () => {
    const updatedUser = { ...user, [fieldKey]: fieldValue };
    setUser(updatedUser);
    setModalVisible(false);
    AsyncStorage.setItem(`user_${fieldKey}`, fieldValue);
  };

  // finish inline edit: blur + save to AsyncStorage
  const finishInlineEdit = async (key) => {
    if (!key) {
      setEditingKey(null);
      return;
    }
    try {
      try { currentInputRef.current && currentInputRef.current.blur(); } catch (_) { Keyboard.dismiss(); }
      const val = user[key] ?? '';
      await AsyncStorage.setItem(`user_${key}`, val);
      setEditingKey(null);
    } catch (e) {
      console.warn('Error guardando campo inline', e);
      showToast('No se pudo guardar localmente', null, styles.toast, 1500);
      setEditingKey(null);
    }
  };

  const enterInlineEdit = (key) => {
    setEditingKey(key);
    requestAnimationFrame(() => {
      try {
        if (currentInputRef.current && typeof currentInputRef.current.focus === 'function') {
          currentInputRef.current.focus();
        }
      } catch (e) {
        // noop
      }
    });
  };

  const handleSave = async () => {
    if (editingKey) {
      await finishInlineEdit(editingKey);
    }

    setSaving(true);
    const id = await AsyncStorage.getItem('user_usuario_app_id');
    try {
      const apiUrl = `${API_BASE_URL}/${id}`;

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_AUTH_TOKEN}`,
        },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en la solicitud: ${response.status} - ${errorText}`);
      }

      const json = await response.json();

      if (json) {
        showToast('Cambios guardados');
        for (const key in user) {
          await AsyncStorage.setItem(`user_${key}`, user[key] ?? '');
        }
      } else {
        showToast(`Error: Respuesta inesperada del servidor`, null, styles.toast, 3000);
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, null, styles.toast, 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: topSafe }]}>
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  const getInitials = (name) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const fields = [
    ['nombre', 'Nombre'],
    ['apellido', 'Apellido'],
    ['cumpleanos', 'Cumpleaños'],
    ['direccion', 'Dirección'],
    ['mail', 'Correo electrónico'],
    ['telefono', 'Teléfono'],
    ['tipo_comida', 'Tipo de comida']
  ];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingVertical: headerPadV, paddingHorizontal: headerPadH }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel="Regresar"
        >
          <Ionicons name="arrow-back" size={iconSize} color={BLUE} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: titleFont }]}>Perfil</Text>

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
              <Image source={{ uri: profileUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[styles.avatarInitials, { fontSize: Math.round(avatarSize * 0.36) }]}>
                  {getInitials(user.nombre || 'Usuario') || '👤'}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.username, { fontSize: clamp(Math.round(width * 0.036), 13, 18), maxWidth: Math.round(width * 0.32) }]} numberOfLines={1}>
            {user.nombre || 'Usuario'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.min(36, Math.round(wp(6))) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={Math.max(18, iconSize)} color={BLUE} />
          <Text style={[styles.sectionTitle, { fontSize: labelFont }]}>Información Personal</Text>
        </View>

        {fields.map(([key, label], idx) => (
          <View key={key}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => enterInlineEdit(key)}
              style={[styles.fieldRow, { marginVertical: clamp(Math.round(hp(1.5)), 8, 16) }]}
            >
              <Text style={[styles.fieldLabel, { fontSize: fieldFont }]}>{label}</Text>

              <View style={styles.fieldValueRow}>
                {editingKey === key ? (
                  <TextInput
                    ref={(r) => { currentInputRef.current = r; }}
                    value={user[key] ?? ''}
                    onChangeText={(t) => setUser(prev => ({ ...prev, [key]: t }))}
                    onBlur={() => finishInlineEdit(key)}
                    onSubmitEditing={() => finishInlineEdit(key)}
                    autoFocus
                    style={[
                      styles.fieldValue,
                      { fontSize: fieldFont, paddingVertical: 6, borderWidth: 1, borderColor: '#e6eefc', borderRadius: 6, backgroundColor: '#fff' }
                    ]}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                ) : (
                  <Text style={[styles.fieldValue, { fontSize: fieldFont }]}>{user[key] || 'No especificado'}</Text>
                )}
                <View style={{ width: 8 }} />
              </View>
            </TouchableOpacity>

            {idx < fields.length - 1 && <View style={styles.separator} />}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, { marginLeft: Math.min(35, Math.round(wp(6))), marginTop: clamp(Math.round(hp(4)), 18, 40) }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { width: modalWidth, padding: Math.max(12, Math.round(wp(3))) }]}>
            <Text style={[styles.modalTitle, { fontSize: clamp(Math.round(width * 0.044), 14, 18) }]}>Editar {fieldLabel}</Text>
            <TextInput
              style={[styles.modalInput, { fontSize: fieldFont, padding: Math.max(8, Math.round(wp(2))) }]}
              value={fieldValue}
              onChangeText={setFieldValue}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalButton}>
                <Text style={[styles.modalButtonText, { fontSize: fieldFont }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={saveField} style={[styles.modalButton, { backgroundColor: BLUE, paddingHorizontal: 12, borderRadius: 6 }]}>
                <Text style={[styles.modalButtonText, { color: '#fff', fontSize: fieldFont }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Animated toast - respect bottom safe area */}
      <Animated.View
        pointerEvents="none"
        style={[
          toastStyle,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            bottom: (Platform.OS === 'ios' ? Math.max(70, bottomSafe + 10) : Math.max(40, bottomSafe + 6))
          }
        ]}
      >
        <Text style={[styles.toastText, toastStyle === styles.successToast && styles.successToastText]}>
          {toastMsg}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BLUE },
  headerTitle: { fontWeight: '700', color: '#0046ff', textAlign: 'center', flex: 1, fontFamily: 'Montserrat-Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  profileAvatar: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 8 },
  username: { fontSize: 16, color: '#000', marginRight: 16, fontFamily: 'Montserrat-Regular' },
  backButton: { marginRight: -5 },
  scrollContent: { paddingTop: 16, paddingBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: BLUE, marginLeft: 8, fontFamily: 'Montserrat-Bold' },
  fieldRow: {},
  fieldLabel: { fontSize: 15, color: '#333', marginBottom: 4, fontFamily: 'Montserrat-Regular' },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldValue: { fontSize: 13, color: '#000', flex: 1, marginRight: 12, fontFamily: 'Montserrat-Regular' },
  editButton: { padding: 4 },
  editText: { fontSize: 14, color: BLUE, fontFamily: 'Montserrat-Regular' },
  separator: { height: 1, backgroundColor: DOT_COLOR, marginVertical: -5 },
  saveButton: { alignSelf: 'flex-start', backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Montserrat-Bold' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: 320, backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, fontFamily: 'Montserrat-Regular', color: '#000' },
  modalInput: { borderWidth: 1, borderColor: DOT_COLOR, borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 16, fontFamily: 'Montserrat-Regular', color: '#000', width: '100%' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 8, marginLeft: 8 },
  modalButtonText: { fontSize: 14, color: '#000', fontFamily: 'Montserrat-Regular' },
  toast: { position: 'absolute', bottom: Platform.OS === 'ios' ? 80 : 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, maxWidth: '85%' },
  toastText: { color: '#fff', fontSize: 14, textAlign: 'center', fontFamily: 'Montserrat-Regular' },
  successToast: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 60, alignSelf: 'center', backgroundColor: BLUE, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, maxWidth: '90%' },
  successToastText: { fontSize: 16, fontFamily: 'Montserrat-Bold' },
  avatarInitials: { color: '#0046ff', fontWeight: '700' },
});
