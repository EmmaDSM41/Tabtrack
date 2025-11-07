import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BLUE = '#0046ff';
const logo = require('../../assets/images/logo.png');

const GLOBAL_FAVORITES_KEY = 'favorites';
const GLOBAL_FAVORITES_OBJS_KEY = 'favorites_objs';

const API_BASE_URL = 'https://127.0.0.1';

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
const userFavoritesKey = async () => `favorites_${await getUserIdentifier()}`;
const userFavoritesObjsKey = async () => `favorites_objs_${await getUserIdentifier()}`;

/* ---------------- RESPONSIVE helper (no depende de librerías) ---------------- */
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const wp = (percent) => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * width);
  };
  const hp = (percent) => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * height);
  };
  const rf = (percent) => {
    const p = Number(percent);
    if (!p && p !== 0) return 0;
    return Math.round((p / 100) * width);
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return { width, height, wp, hp, rf, clamp };
}
/* --------------------------------------------------------------------------- */

/**
 * Normaliza una URL para que Image pueda cargarla.
 * - si ya empieza con http(s) devuelve tal cual
 * - si empieza con '//' la convierte a 'https://...'
 * - si empieza con '/' la convierte a `${API_BASE_URL.replace(/\/$/, '')}${ruta}`
 * - si parece ser solo host/path (sin esquema) le pone https://
 */
function normalizeUrl(raw) {
  try {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    // si ya tiene http(s)
    if (/^https?:\/\//i.test(s)) return s;
    // protocolo esquemático (//host/path)
    if (/^\/\//.test(s)) return `https:${s}`;
    // ruta absoluta en el servidor (/uploads/...)
    if (/^\//.test(s)) return `${API_BASE_URL.replace(/\/$/, '')}${s}`;
    // si solo es host/path sin esquema, prefijar https://
    return /^.+\..+/.test(s) ? `https://${s}` : null;
  } catch (e) {
    return null;
  }
}

/**
 * Normalizer helper:
 * crea un objeto 'visit' limpio (solo campos serializables y útiles para DetailScreen)
 * convierte y normaliza URLs para logo/banner
 */
function buildVisitFromFav(item) {
  try {
    if (!item || typeof item !== 'object') {
      return {
        id: null,
        sucursal_id: null,
        restaurante_id: null,
        restaurantName: 'Restaurante',
        restaurantImage: null,
        bannerImage: null,
        telefono: null,
        descripcion: null,
        short_description: null,
        avg_rating: null,
        address: null,
        city: null,
        horarios: null,
        url_whatsapp: null,
        url_facebook: null,
        url_instagram: null,
        imagenes: null,
        avg_price: null,
        price_min: null,
        price_max: null,
        price_range_raw: null,
        items: [],
        total: null,
        moneda: 'MXN',
      };
    }

    // intentar múltiples campos
    const rawRestaurantImage =
      item.restaurantImage ??
      item.restaurant_image ??
      item.imagen_logo_url ??
      item.imagen_logo ??
      item.logo ??
      item.logo_url ??
      item.image_logo ??
      item.image_url ?? // preview from toggleFavorite
      item.image ??
      item.imagen ??
      null;

    const rawBannerImage =
      item.bannerImage ??
      item.imagen_banner_url ??
      item.imagen_banner ??
      item.banner_url ??
      item.banner ??
      item.image_url ??
      item.image ??
      null;

    const restaurantImage = normalizeUrl(rawRestaurantImage) || null;
    const bannerImage = normalizeUrl(rawBannerImage) || null;

    const restaurantName =
      item.restaurantName ??
      item.name ??
      item.nombre ??
      item.title ??
      item.restaurant ??
      null;

    const telefono =
      item.telefono ??
      item.telefono_sucursal ??
      item.phone ??
      item.contact_phone ??
      null;

    const descripcion =
      item.full_description ??
      item.descripcion ??
      item.short_description ??
      item.description ??
      item.info ??
      null;

    const sucursal_id = (item.sucursal_id ?? item.id ?? item.branchId ?? item.branch_id ?? item._id ?? null);
    const restaurante_id = (item.restaurante_id ?? item.restaurante ?? item.restaurant_id ?? null);

    const avg_rating = (item.avg_rating ?? item.rating ?? item.avgRating ?? null);

    const idVal = item.id ?? item._id ?? sucursal_id ?? null;
    const id = idVal !== undefined && idVal !== null ? String(idVal) : null;

    const visit = {
      id,
      sale_id: item.sale_id ?? null,
      sucursal_id: sucursal_id !== undefined && sucursal_id !== null ? String(sucursal_id) : null,
      restaurante_id: restaurante_id !== undefined && restaurante_id !== null ? String(restaurante_id) : null,

      restaurantName: restaurantName || (item.name ?? 'Restaurante') || 'Restaurante',
      restaurantImage: restaurantImage,
      bannerImage: bannerImage,

      telefono: telefono || null,
      telefono_sucursal: telefono || null,
      descripcion: descripcion || null,
      short_description: (item.short_description ?? item.descripcion) || null,
      avg_rating: avg_rating != null ? (Number.isFinite(Number(avg_rating)) ? Number(avg_rating) : null) : null,

      address: item.address ?? item.direccion ?? item.street ?? null,
      city: item.city ?? item.ciudad ?? null,
      horarios: Array.isArray(item.horarios) ? item.horarios : (item.horario ? [item.horario] : null),
      url_whatsapp: item.url_whatsapp ?? item.whatsapp ?? item.whatsapp_url ?? null,
      url_facebook: item.url_facebook ?? item.facebook_url ?? null,
      url_instagram: item.url_instagram ?? item.instagram_url ?? null,
      imagenes: Array.isArray(item.imagenes) ? item.imagenes : (Array.isArray(item.images) ? item.images : null),

      avg_price: item.avg_price ?? item.avgPrice ?? item.price ?? null,
      price_min: item.price_min ?? item.min_price ?? null,
      price_max: item.price_max ?? item.max_price ?? null,
      price_range_raw: item.price_range_raw ?? item.price_range ?? item.price_symbol ?? null,

      items: Array.isArray(item.items) ? item.items : (Array.isArray(item.menu_items) ? item.menu_items : []),
      total: item.total ?? item.amount ?? null,
      moneda: item.moneda ?? 'MXN',

      // incluimos el preview original por compatibilidad ligera (no es el raw completo)
      preview: {
        id: item.id ?? null,
        name: item.name ?? item.restaurantName ?? null,
        image_url: normalizeUrl(item.image_url) ?? null,
      },
    };

    return visit;
  } catch (e) {
    console.warn('buildVisitFromFav error', e);
    return {
      id: null,
      sucursal_id: null,
      restaurante_id: null,
      restaurantName: item?.name ?? 'Restaurante',
      restaurantImage: normalizeUrl(item?.image_url) || null,
      bannerImage: normalizeUrl(item?.banner) || null,
      telefono: null,
      descripcion: null,
      short_description: null,
      avg_rating: null,
      address: null,
      city: null,
      horarios: null,
      url_whatsapp: null,
      url_facebook: null,
      url_instagram: null,
      imagenes: null,
      avg_price: null,
      price_min: null,
      price_max: null,
      price_range_raw: null,
      items: [],
      total: null,
      moneda: 'MXN',
    };
  }
}

export default function FavoritesScreen({ route, navigation }) {
  const { width, wp, hp, rf, clamp } = useResponsive(); /* RESPONSIVE */

  const { favorites: initialFavorites } = route.params ?? {};
  const [favorites, setFavorites] = useState(initialFavorites ?? []);
  const [search, setSearch] = useState('');
  const [displayed, setDisplayed] = useState(initialFavorites ?? []);

  // responsive computed values
  const horizPadding = Math.max(12, wp(4)); // padding horizontal de la pantalla
  const headerPaddingV = clamp(hp(3.5), 10, 28);
  const logoSize = clamp(wp(10), 28, 48);
  const headerTitleSize = clamp(rf(4), 16, 22);
  const searchIconSize = clamp(rf(3), 14, 20);
  const searchHeight = clamp(hp(5), 42, 56);
  const cardRadius = Math.round(Math.max(10, wp(2.2)));
  const cardImageHeight = clamp(Math.round(width * 0.45), 140, 260); // proporcional al ancho
  const cardNameSize = clamp(rf(3.6), 14, 20);
  const metaFontSize = clamp(rf(3), 12, 16);
  const emptyIconSize = clamp(rf(7.2), 40, 68);
  const listPaddingBottom = Math.max(16, hp(4));

  useEffect(() => {
    (async () => {
      if (initialFavorites && Array.isArray(initialFavorites)) {
        setFavorites(initialFavorites);
        setDisplayed(initialFavorites);
        return;
      }
      try {
        const favObjsKey = await userFavoritesObjsKey();
        const rawObjs = await AsyncStorage.getItem(favObjsKey);
        let objs = rawObjs ? JSON.parse(rawObjs) : [];

        if ((!Array.isArray(objs) || objs.length === 0)) {
          const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
          const globalObjs = globalRaw ? JSON.parse(globalRaw) : [];
          if (Array.isArray(globalObjs) && globalObjs.length > 0) {
            objs = globalObjs;
          }
        }

        setFavorites(objs);
        setDisplayed(objs);
      } catch (e) {
        setFavorites([]);
        setDisplayed([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setDisplayed(
      favorites.filter(item =>
        ( (item.name ?? item.restaurantName ?? item.restaurant ?? '') + '' ).toLowerCase().includes(q)
      )
    );
  }, [search, favorites]);

  // remover favorito: lógica intacta
  const removeFavorite = async id => {
    try {
      const favKey = await userFavoritesKey();
      const favObjsKey = await userFavoritesObjsKey();

      const rawIds = await AsyncStorage.getItem(favKey);
      let ids = rawIds ? JSON.parse(rawIds) : null;
      if (!Array.isArray(ids)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
        ids = globalRaw ? JSON.parse(globalRaw) : [];
      }
      const newIds = (Array.isArray(ids) ? ids.filter(i => String(i) !== String(id)) : []);
      await AsyncStorage.setItem(favKey, JSON.stringify(newIds));

      const rawObjs = await AsyncStorage.getItem(favObjsKey);
      let objs = rawObjs ? JSON.parse(rawObjs) : null;
      if (!Array.isArray(objs)) {
        const globalObjsRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        objs = globalObjsRaw ? JSON.parse(globalObjsRaw) : [];
      }
      const newObjs = (Array.isArray(objs) ? objs.filter(o => String(o.id) !== String(id)) : []);
      await AsyncStorage.setItem(favObjsKey, JSON.stringify(newObjs));

      setFavorites(prev => prev.filter(f => String(f.id) !== String(id)));
      setDisplayed(prev => prev.filter(f => String(f.id) !== String(id)));
    } catch (e) {
      console.warn('removeFavorite error', e);
    }
  };

  // Navegar a pant. Restaurant / Detail con objeto normalizado 'visit'
  const onPressNavigateToRestaurant = (item) => {
    try {
      const visit = buildVisitFromFav(item);
      // ENVIAR varias formas por compatibilidad con DetailScreen:
      navigation.navigate('Restaurant', { visit, id: visit.id, restaurant: visit });
    } catch (e) {
      console.warn('onPressNavigateToRestaurant error', e);
      navigation.navigate('Restaurant', { visit: { restaurantName: item?.name ?? 'Restaurante' }, id: item?.id ?? null });
    }
  };

  const renderCard = ({ item }) => {
    // resolver imagen para la tarjeta (normalizada)
    const bannerRaw = item.bannerImage ?? item.imagen_banner_url ?? item.image_url ?? item.image ?? item.banner ?? null;
    const bannerUri = normalizeUrl(bannerRaw);

    return (
      <View style={[styles.card, { borderRadius: cardRadius, marginHorizontal: horizPadding / 2 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPressNavigateToRestaurant(item)}
        >
          <Image
            source={
              bannerUri
                ? { uri: bannerUri }
                : require('../../assets/images/restaurante.jpeg')
            }
            style={[styles.cardImage, { height: cardImageHeight }]}
          />
        </TouchableOpacity>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { fontSize: cardNameSize }]} numberOfLines={2}>
            {item.restaurantName ?? item.name ?? item.nombre ?? 'Restaurante'}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.ratingRow}>
              <Text style={[styles.ratingText, { fontSize: metaFontSize }]}>
                { ((Number(item.avg_rating ?? item.rating ?? 0)) || 0).toFixed(1) }
              </Text>
              <Text style={[styles.ratingStar, { fontSize: metaFontSize }]}>★</Text>
            </View>

            <TouchableOpacity onPress={() => removeFavorite(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={clamp(rf(4.2), 18, 26)} color="#e0245e" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }]}>
      <View style={[styles.header, { paddingHorizontal: horizPadding, paddingVertical: headerPaddingV }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={clamp(rf(5.2), 20, 30)} color={BLUE} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>Favoritos</Text>

        <Image source={logo} style={{ width: logoSize, height: logoSize, resizeMode: 'contain' }} />
      </View>

      <View style={[styles.searchBar, { marginHorizontal: horizPadding, height: searchHeight }]}>
        <Ionicons name="search-outline" size={searchIconSize} color="#666" />
        <TextInput
          style={[styles.searchInput, { fontSize: metaFontSize }]}
          placeholder="Buscar favoritos..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {(!displayed || displayed.length === 0) ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="heart-dislike-outline"
            size={emptyIconSize}
            color="#ccc"
          />
          <Text style={[styles.emptyText, { fontSize: clamp(rf(3.6), 14, 18) }]}>
            No tienes favoritos que coincidan.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom, paddingHorizontal: horizPadding / 2 }]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    color: BLUE,
    fontFamily: 'Montserrat-Bold'
  },
  logo: {
    resizeMode: 'contain',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#333',
    fontFamily: 'Montserrat-Regular'
  },

  list: {
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 8,
    color: '#777',
    fontFamily: 'Montserrat-Regular'
  },

  card: {
    backgroundColor: '#fff',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  cardImage: {
    width: '100%',
  },
  cardInfo: {
    padding: 12,
  },
  cardName: {
    color: BLUE,
    marginBottom: 6,
    fontFamily: 'Montserrat-Bold'
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginRight: 4,
    color:'#000000',
  },
  ratingStar: {
    color: '#FFD700',
  },
});
