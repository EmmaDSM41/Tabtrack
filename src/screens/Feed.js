import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logo = require('../../assets/images/logo.png');
const defaultImage = require('../../assets/images/restaurante.jpeg');

const API_URL = 'https://api.tab-track.com/api/restaurantes';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MjE4NzAyOCwianRpIjoiMTdlYTVjYTAtZTE3MC00ZjIzLTllMTgtZmZiZWYyMzg4OTE0IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjIxODcwMjgsImV4cCI6MTc2NDc3OTAyOCwicm9sIjoiRWRpdG9yIn0.W_zoGW2YpqCyaxpE1c_hnRXdtw5ty0DDd8jqvDbi6G0';
const FAVORITES_OBJS_KEY = 'favorites_objs';
const GLOBAL_FAVORITES_OBJS_KEY = 'favorites_objs';

const getUserIdentifier = async () => {
  try {
    const uid = await AsyncStorage.getItem('user_usuario_app_id');
    if (uid) return String(uid);
    const email = await AsyncStorage.getItem('user_email');
    if (email) return String(email);
    return 'guest';
  } catch (e) {
    return 'guest';
  }
};
const userFavoritesObjsKey = async () => `favorites_objs_${await getUserIdentifier()}`;

/* ------------------ Responsive helper (no deps) ------------------ */
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const wp = (p) => Math.round((Number(p) / 100) * width);
  const hp = (p) => Math.round((Number(p) / 100) * height);
  const rf = (p) => Math.round((Number(p) / 100) * width);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return { width, height, wp, hp, rf, clamp };
}
/* ---------------------------------------------------------------- */

/* ------------------ parsePriceRange (sin tocar) ------------------ */
const parsePriceRange = (raw) => {
  if (raw === null || raw === undefined) return null;
  try {
    const s = String(raw).trim();
    if (!s) return null;
    const numbers = s.match(/[\d]+(?:\.\d+)?/g);
    if (numbers && numbers.length > 0) {
      const nnums = numbers.map(n => Number(n));
      if (nnums.length === 1) return { min: nnums[0], max: nnums[0], symbol: null };
      return { min: Math.min(nnums[0], nnums[1]), max: Math.max(nnums[0], nnums[1]), symbol: null };
    }
    const dollarMatch = s.match(/\${1,}/);
    if (dollarMatch) {
      const count = dollarMatch[0].length;
      const map = {
        1: { min: 0, max: 50 },
        2: { min: 50, max: 150 },
        3: { min: 150, max: 400 },
        4: { min: 400, max: 1000000 },
      };
      const bucket = map[count] || map[4];
      return { min: bucket.min, max: bucket.max, symbol: '$'.repeat(count) };
    }
    return null;
  } catch (e) {
    return null;
  }
};
/* ---------------------------------------------------------------- */

export default function RestaurantsScreen() {
  const navigation = useNavigation();
  const { width, wp, hp, rf, clamp } = useResponsive();
  const insets = useSafeAreaInsets();

  const [restaurants, setRestaurants]         = useState([]); // ahora contendrá sucursales
  const [filteredData, setFilteredData]       = useState([]);
  const [cities, setCities]                   = useState(['Todos']);
  const [favorites, setFavorites]             = useState([]);

  const [searchQuery, setSearchQuery]         = useState('');
  const [minRating, setMinRating]             = useState(0);
  const [city, setCity]                       = useState('Todos');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const sampleTypes = [
    { id: 'todos', label: 'Todos' },
    { id: 'hamburguesas', label: '🍔 Hamburguesas' },
    { id: 'pizza', label: '🍕 Pizza' },
    { id: 'tacos', label: '🌮 Tacos' },
    { id: 'sushi', label: '🍣 Sushi' },
    { id: 'asiatica', label: '🍜 Asiática' },
    { id: 'italiana', label: '🍝 Italiana' },
    { id: 'mexicana', label: '🌯 Mexicana' },
    { id: 'india', label: '🍛 India' },
    { id: 'mediterranea', label: '🥙 Mediterránea' },
    { id: 'sandwiches', label: '🥪 Sandwiches' },
    { id: 'china', label: '🥟 China' },
    { id: 'saludable', label: '🥗 Saludable' },
    { id: 'vegana', label: '🥬 Vegana' },
    { id: 'postres', label: '🍩 Postres' },
    { id: 'helados', label: '🍦 Helados' },
    { id: 'cafe', label: '☕ Café y Té' },
    { id: 'bebidas', label: '🍹 Bebidas' },
    { id: 'desayunos', label: '🍳 Desayunos' },
  ];
  const [cuisine, setCuisine] = useState('todos');

  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);

  const [loading, setLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  const runShowToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => runHideToast(), 3500);
  };
  const runHideToast = () => {
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => { setToastVisible(false); setToastMessage(''); });
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
  };

  // FETCH restaurantes + sucursales (mantuve toda la lógica)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL, {
          headers: {
            'Authorization': TOKEN ? `Bearer ${TOKEN}` : undefined,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data.restaurantes) ? data.restaurantes : (Array.isArray(data) ? data : []);
        if (!mounted) return;

        const restNameMap = {};
        const restDetailPromises = list.map(async (rest) => {
          try {
            if (!rest || (rest.id === undefined || rest.id === null)) return;
            const restUrl = `${API_URL.replace(/\/$/, '')}/${encodeURIComponent(rest.id)}`;
            const rr = await fetch(restUrl, {
              headers: {
                'Authorization': TOKEN ? `Bearer ${TOKEN}` : undefined,
                'Content-Type': 'application/json'
              }
            });
            if (!rr.ok) return;
            const rjson = await rr.json();
            const nombre = rjson?.nombre ?? rjson?.name ?? null;
            if (nombre) restNameMap[String(rest.id)] = String(nombre);
          } catch (e) { console.warn('Error fetching restaurant detail for id', rest?.id, e); }
        });
        await Promise.allSettled(restDetailPromises);

        const branchPromises = list.map(async (rest) => {
          try {
            const url = `${API_URL.replace(/\/$/, '')}/${encodeURIComponent(rest.id)}/sucursales`;
            const r = await fetch(url, {
              headers: {
                'Authorization': TOKEN ? `Bearer ${TOKEN}` : undefined,
                'Content-Type': 'application/json'
              }
            });
            if (!r.ok) return [];
            const j = await r.json();
            const branches = Array.isArray(j.sucursales) ? j.sucursales : (Array.isArray(j) ? j : []);
            const mapped = branches.map((b) => {
              const rangoRaw = b.rango_precios ?? b.price_range ?? b.price_range_raw ?? null;
              const parsedRange = parsePriceRange(rangoRaw);

              let priceMin = null;
              let priceMax = null;
              const avgPrice = Number(b.avg_price ?? b.price ?? b.average_price ?? 0) || 0;
              if (Number.isFinite(avgPrice) && avgPrice > 0) {
                priceMin = avgPrice;
                priceMax = avgPrice;
              } else if (parsedRange) {
                priceMin = parsedRange.min;
                priceMax = parsedRange.max;
              } else {
                priceMin = null;
                priceMax = null;
              }

              const tipo_comida_raw = b.tipo_comida ?? b.tipo ?? b.category ?? b.cuisine ?? '';
              const imagen_banner_url = b.imagen_banner_url ?? b.imagen_banner ?? b.banner_url ?? b.banner ?? null;
              const imagen_logo_url = b.imagen_logo_url ?? b.imagen_logo ?? b.logo ?? null;
              const imagenes_array = Array.isArray(b.imagenes) ? b.imagenes : (Array.isArray(b.images) ? b.images : null);
              const cardImage = imagen_banner_url ?? imagen_logo_url ?? b.imagen ?? b.image ?? null;
              const url_opentable = b.url_opentable ?? b.opentable_url ?? b.url_reservation ?? b.booking_url ?? null;
              const restName = restNameMap[String(rest.id)] ?? (rest.nombre ?? rest.name ?? '');
              const branchNamePart = (b.nombre ?? b.name ?? '').toString().trim();
              const combinedName = restName ? (branchNamePart ? `${restName} - ${branchNamePart}` : restName) : (branchNamePart || '');

              return {
                id: b.id ?? `${rest.id}-${Math.random().toString(36).slice(2,8)}`,
                name: combinedName,
                city: b.city ?? b.ciudad ?? null,
                avg_rating: (b.avg_rating ?? b.rating ?? null) !== null ? Number(b.avg_rating ?? b.rating) : null,
                address: b.direccion ?? b.address ?? null,
                short_description: b.descripcion ?? b.short_description ?? null,
                full_description: b.descripcion ?? b.full_description ?? null,
                latitude: b.latitud ?? b.latitude ?? b.lat ?? null,
                longitude: b.longitud ?? b.longitude ?? b.lng ?? null,
                image: cardImage,
                imagen_banner_url: imagen_banner_url,
                imagen_logo_url: imagen_logo_url,
                imagenes: imagenes_array,
                cuisine: b.tipo_comida ?? b.tipo ?? b.cuisine ?? null,
                avg_price: Number(b.avg_price ?? b.price ?? 0) || 0,
                price_min: priceMin,
                price_max: priceMax,
                price_range_raw: rangoRaw ?? null,
                price_symbol: parsedRange?.symbol ?? null,
                tipo_comida_raw: tipo_comida_raw,
                telefono_sucursal: b.telefono_sucursal ?? null,
                horarios: Array.isArray(b.horarios) ? b.horarios : (b.horario ? [b.horario] : []),
                url_facebook: b.url_facebook ?? b.facebook_url ?? null,
                url_instagram: b.url_instagram ?? b.instagram_url ?? null,
                url_tiktok: b.url_tiktok ?? b.tiktok ?? null,
                url_whatsapp: b.url_whatsapp ?? b.whatsapp ?? null,
                url_opentable: url_opentable,
                raw: b,
              };
            });
            return mapped;
          } catch (err) {
            console.warn('Error fetching branches for restaurant', rest.id, err);
            return [];
          }
        });

        const settled = await Promise.allSettled(branchPromises);
        const branchesArrays = settled
          .filter(s => s.status === 'fulfilled')
          .map(s => s.value)
          .flat();

        if (!mounted) return;

        setRestaurants(branchesArrays);
        setFilteredData(branchesArrays);

        const uniqueCitiesFromApi = Array.from(new Set(branchesArrays.map(i => i.city).filter(Boolean)));
        const sampleCities = ['Ciudad de México', 'Polanco', 'Roma'];
        const mergedCities = Array.from(new Set(['Todos', ...sampleCities, ...uniqueCitiesFromApi]));
        setCities(mergedCities);
      } catch (err) {
        console.warn('Error al cargar restaurantes/sucursales:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const loadFavoritesFromStorage = async () => {
    try {
      const favObjsKey = await userFavoritesObjsKey();
      const raw = await AsyncStorage.getItem(favObjsKey);
      let objs = raw ? JSON.parse(raw) : [];
      if ((!Array.isArray(objs) || objs.length === 0)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        const globalObjs = globalRaw ? JSON.parse(globalRaw) : [];
        if (Array.isArray(globalObjs) && globalObjs.length > 0) objs = globalObjs;
      }
      setFavorites(Array.isArray(objs) ? objs : []);
    } catch (e) {
      console.warn('loadFavoritesFromStorage error', e);
    }
  };

  useEffect(() => {
    loadFavoritesFromStorage();
    const unsub = navigation.addListener('focus', () => loadFavoritesFromStorage());
    return unsub;
  }, [navigation]);

  const applyFilters = () => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = restaurants.filter(item => {
      const matchSearch = q.length === 0 || (item.name || '').toLowerCase().includes(q);
      const matchRating = (item.avg_rating ?? 0) >= minRating;
      const matchCity = city === 'Todos' || (item.city ?? '').toString() === city;

      let matchCuisine = true;
      if (cuisine && cuisine !== 'todos') {
        const cuisineFieldParts = [
          (item.cuisine ?? ''),
          (item.raw?.cuisine ?? ''),
          (item.raw?.tipo ?? ''),
          (item.raw?.tipo_comida ?? ''),
          (item.tipo_comida_raw ?? '')
        ].filter(Boolean);
        const cuisineField = cuisineFieldParts.join(',').toString().toLowerCase();
        const needle = cuisine.toString().toLowerCase();
        matchCuisine = cuisineField.includes(needle) || (item.name ?? '').toLowerCase().includes(needle);
      }

      let matchPrice = true;
      let pMin = null;
      let pMax = null;
      if (item.price_min != null && item.price_max != null && Number.isFinite(Number(item.price_min)) && Number.isFinite(Number(item.price_max))) {
        pMin = Number(item.price_min);
        pMax = Number(item.price_max);
      } else if (Number.isFinite(Number(item.avg_price)) && Number(item.avg_price) > 0) {
        pMin = Number(item.avg_price);
        pMax = Number(item.avg_price);
      } else if (item.price_symbol) {
        const parsed = parsePriceRange(item.price_symbol);
        if (parsed) { pMin = parsed.min; pMax = parsed.max; }
      } else if (item.price_range_raw) {
        const parsed = parsePriceRange(item.price_range_raw);
        if (parsed) { pMin = parsed.min; pMax = parsed.max; }
      } else if (item.raw && item.raw.rango_precios) {
        const parsed = parsePriceRange(item.raw.rango_precios);
        if (parsed) { pMin = parsed.min; pMax = parsed.max; }
      }

      if (pMin != null && pMax != null && Number.isFinite(pMin) && Number.isFinite(pMax)) {
        if (pMax < minPrice || pMin > maxPrice) matchPrice = false;
        else matchPrice = true;
      } else {
        if (minPrice === 0 && maxPrice === 500) matchPrice = true;
        else matchPrice = false;
      }

      return matchSearch && matchRating && matchCity && matchCuisine && matchPrice;
    });

    setFilteredData(filtered);
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, minRating, city, restaurants, cuisine, minPrice, maxPrice]);

  // --- MODIFICACIÓN: ahora guardamos el objeto completo 'item' en favoritos (no solo preview)
  const toggleFavorite = async (item) => {
    try {
      const favObjsKey = await userFavoritesObjsKey();
      const raw = await AsyncStorage.getItem(favObjsKey);
      let current = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(current)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        current = globalRaw ? JSON.parse(globalRaw) : [];
      }
      const sid = String(item.id);
      let updated;
      if (Array.isArray(current) && current.some(c => String(c.id) === sid)) {
        // si ya existe -> eliminar
        updated = current.filter(c => String(c.id) !== sid);
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(updated));
        setFavorites(updated);
        runShowToast('Eliminado de favoritos');
      } else {
        // Agregar: guardamos el objeto completo para conservar logo, descripcion, telefono, etc.
        // Evitamos funciones o referencias extra; clonamos lo esencial.
        const toSave = {
          ...item,
          // asegurarnos de que id está como string
          id: sid,
          _saved_at: Date.now(),
        };
        updated = [...(Array.isArray(current) ? current : []), toSave];
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(updated));
        setFavorites(updated);
        runShowToast('Agregado a favoritos');
      }
    } catch (e) {
      console.warn('toggleFavorite error', e);
      runShowToast('Error al actualizar favoritos');
    }
  };
  // --- FIN MODIFICACIÓN

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* responsive computed values used for inline styles */
  const horizPad = Math.max(10, wp(3.5));
  const headerHeight = clamp(hp(7.5), 58, 92);
  const logoW = clamp(wp(23), 72, 140);
  const searchHeight = clamp(hp(5.2), 40, 56);
  const iconSize = clamp(rf(2.4), 18, 26);
  const cardImageH = clamp(Math.round(width * 0.48), 140, 300);
  const cardRadius = Math.round(clamp(wp(2), 8, 16));
  const modalWidth = Math.min(Math.round(width * 0.94), 920);

  // NUEVO: navegar a Favorites desde el header pasando toda la info
  const openFavoritesFromHeader = async () => {
    try {
      const favObjsKey = await userFavoritesObjsKey();
      const raw = await AsyncStorage.getItem(favObjsKey);
      let objs = raw ? JSON.parse(raw) : [];
      if ((!Array.isArray(objs) || objs.length === 0)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        const globalObjs = globalRaw ? JSON.parse(globalRaw) : [];
        if (Array.isArray(globalObjs) && globalObjs.length > 0) objs = globalObjs;
      }
      navigation.navigate('Favorites', { favorites: Array.isArray(objs) ? objs : [] });
    } catch (e) {
      console.warn('openFavoritesFromHeader error', e);
      navigation.navigate('Favorites', { favorites: [] });
    }
  };

  // safe area adjustments
  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  const bottomSafe = Math.round(insets.bottom || 0);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe }]}>
      <View style={[styles.header, { paddingHorizontal: horizPad, height: headerHeight }]}>
        {/* logo left removed as requested */}
        <Text style={{ width: 6 }} />

        <TextInput
          style={[styles.searchInput, { height: searchHeight, marginHorizontal: 8 }]}
          placeholder="¿Qué se te antoja hoy?"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
          <Ionicons name="filter-outline" size={iconSize} color="#333" />
        </TouchableOpacity>

        {/* NUEVO: corazón en la derecha que lleva a Favoritos y pasa toda la info */}
        <TouchableOpacity onPress={openFavoritesFromHeader} style={{ marginLeft: 10, padding: 6 }}>
          <Ionicons name="heart-outline" size={iconSize + 2} color={favorites && favorites.length > 0 ? '#e0245e' : '#444'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(16, hp(3)) + bottomSafe }]}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            imageSource={ item.image ? { uri: item.image } : defaultImage }
            onPress={() => navigation.navigate('Restaurant', { restaurant: item, id: item.id })}
            isFavorite={favorites.some(f => String(f.id) === String(item.id))}
            onToggleFavorite={() => toggleFavorite(item)}
            cardImageH={cardImageH}
            cardRadius={cardRadius}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron restaurantes</Text>
          </View>
        )}
      />

      {showFilterModal && (
        <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
          <SafeAreaView style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { width: modalWidth, maxHeight: '88%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtros Avanzados</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close-circle" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalLabel}>Ciudad</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={city} style={styles.picker} onValueChange={value => setCity(value)}>
                    {cities.map(c => <Picker.Item key={c} label={c} value={c} />)}
                  </Picker>
                </View>

                <Text style={styles.modalLabel}>Rating</Text>
                <View style={styles.sliderWrapper}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={5}
                    step={0.5}
                    value={minRating}
                    onValueChange={setMinRating}
                    minimumTrackTintColor="#ffbf00"
                    maximumTrackTintColor="#ccc"
                    thumbTintColor="#ffbf00"
                  />
                  <Text style={styles.sliderValue}>{minRating.toFixed(1)}★</Text>
                </View>

                <Text style={styles.modalLabel}>Tipo de comida</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={cuisine} style={styles.picker} onValueChange={val => setCuisine(val)}>
                    {Array.isArray(sampleTypes) ? sampleTypes.map(t => <Picker.Item key={t.id} label={t.label} value={t.id} />) : null}
                  </Picker>
                </View>

                <Text style={styles.modalLabel}>Rango de precios (MXN)</Text>
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#444', marginBottom: 6 }}>Mín: {minPrice} MXN</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={2000}
                    step={10}
                    value={minPrice}
                    onValueChange={val => setMinPrice(Math.min(val, maxPrice))}
                    minimumTrackTintColor="#00b894"
                    maximumTrackTintColor="#ddd"
                  />
                  <Text style={{ color: '#444', marginTop: 12, marginBottom: 6 }}>Máx: {maxPrice} MXN</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={2000}
                    step={10}
                    value={maxPrice}
                    onValueChange={val => setMaxPrice(Math.max(val, minPrice))}
                    minimumTrackTintColor="#ff7675"
                    maximumTrackTintColor="#ddd"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => {
                  setCity('Todos'); setMinRating(0); setCuisine('todos'); setMinPrice(0); setMaxPrice(500);
                }} style={styles.clearButton}>
                  <Text style={styles.clearText}>Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { applyFilters(); setShowFilterModal(false); }} style={styles.applyButton}>
                  <Text style={styles.applyText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {toastVisible && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            {
              bottom: 18 + bottomSafe,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
              opacity: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            }
          ]}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
            <TouchableOpacity onPress={() => { runHideToast(); navigation.navigate('Favorites'); }}>
              <Text style={styles.toastLink}>Ver todo</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/* RestaurantCard: no cambia la lógica, solo recibe tamaños desde props */
function RestaurantCard({
  restaurant,
  imageSource,
  onPress,
  isFavorite,
  onToggleFavorite,
  cardImageH = 200,
  cardRadius = 12,
}) {
  // split name by hyphen into two lines (if present)
  const fullName = restaurant.name || '';
  const nameParts = fullName.split(/\s*-\s*/);
  const mainName = nameParts[0] || '';
  const secondName = nameParts.length > 1 ? nameParts.slice(1).join(' - ') : '';

  return (
    <View style={[styles.card, { borderRadius: cardRadius }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Image source={imageSource} style={[styles.cardImage, { height: cardImageH }]} />
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={styles.heartOverlayContainer}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? '#e0245e' : 'white'}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* make the entire white info row clickable so any part navigates */}
      <TouchableOpacity onPress={onPress} style={styles.infoRow} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{mainName}</Text>
          {secondName ? <Text style={styles.name} numberOfLines={1}>{secondName}</Text> : null}
          {restaurant.city ? <Text style={styles.sub}>{restaurant.city}</Text> : null}
          {restaurant.tipo_comida_raw ? <Text style={styles.shortDesc}>{restaurant.tipo_comida_raw}</Text> : (restaurant.short_description ? <Text style={styles.shortDesc}>{restaurant.short_description}</Text> : null)}
        </View>

        <View style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
          <Text style={styles.price}>{restaurant.avg_price ? `${restaurant.avg_price} MXN` : (restaurant.price_range_raw ? restaurant.price_range_raw : '')}</Text>
          <View style={{ height: 6 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- estilos estáticos (los valores dinámicos se inyectan inline) ---------- */
const AVATAR_SIZE = 60;
const SLIDER_HEIGHT = 250;
const BLUE = '#0046ff';
const OVERLAY = 'rgba(0,0,0,0.36)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    width: '100%',
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    zIndex: 10,
  },
  logo: { width: 92, height: 28, resizeMode: 'contain' },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f7fb',
    fontSize: 13,
    color: '#333',
  },
  filterBtn: { marginLeft: 10, padding: 6 },

  list: { paddingBottom: 16, paddingTop: 12 },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  cardImage: { width: '100%' },
  heartOverlayContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 12,
    padding: 6,
  },
  infoRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: BLUE,
  },
  sub: { color: '#6b7280', marginTop: 4 },
  shortDesc: { color: '#666', marginTop: 6, fontSize: 13 },

  price: { fontSize: 14, color: '#222', fontWeight: '700' },

  ratingBox: { backgroundColor: '#eef4ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: BLUE, fontWeight: '700' },

  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#777' },

  modalOverlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderColor: '#ececec',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  modalBody: { padding: 16 },

  modalLabel: { fontSize: 15, fontWeight: '600', marginTop: 6, color: '#333' },
  pickerWrapper: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: { height: 42, width: '100%', color: '#000' },

  sliderWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  slider: { flex: 1, height: 36 },
  sliderValue: { width: 54, textAlign: 'center', color: '#333', fontWeight: '500' },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  clearButton: { marginRight: 12, justifyContent: 'center' },
  clearText: { color: '#555', fontWeight: '600' },
  applyButton: {
    backgroundColor: '#0046ff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontWeight: '700' },

  toastWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 60,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.95,
  },
  toastText: { color: '#fff', flex: 1, marginRight: 12 },
  toastLink: { color: '#4EA1FF', fontWeight: '700', marginLeft: 8 },
});
