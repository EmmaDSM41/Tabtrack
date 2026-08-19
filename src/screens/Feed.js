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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { TOKEN, ensureToken } from '../auth/tokenManager';

const logo = require('../../assets/images/logo.png');
const defaultImage = require('../../assets/images/restaurante.jpeg');

const API_URL = 'https://api.tab-track.com/api/restaurantes';
const API_URL_2 = 'https://api.tab-track.com/api/encuestas';
const SURVEY_ID = '8916180a-95fd-46af-bde4-60635cc7e1ab';
const FAVORITES_OBJS_KEY = 'favorites_objs';
const GLOBAL_FAVORITES_OBJS_KEY = 'favorites_objs';
const USER_ENVIRONMENT_KEY = 'user_environment';

const STAR_COLOR = '#ffbf00';
const BLUE = '#0046ff';

// NUEVO: valores por defecto de los filtros de precio. Representan el
// estado "sin filtro" (todo el rango posible), para que al entrar a la
// pantalla se muestren todos los restaurantes sin que el filtro de precio
// excluya nada.
const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 2000;
// NUEVO: radio de búsqueda por defecto en 0 (filtro inactivo). Solo tiene
// efecto una vez que la ubicación está activada (useLocation === true).
const DEFAULT_SEARCH_RADIUS_KM = 0;

const normalizeEnvironment = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

// NUEVO: determina si un restaurante viene marcado como activo en el
// listado de la API (campo 'activo'). Si el restaurante trae
// explícitamente activo === false (o "false" como string), se descarta
// junto con todas sus sucursales. Si el campo no viene en la respuesta,
// se asume activo para no ocultar restaurantes por falta de dato.
const isRestaurantActive = (rest) => {
  if (!rest) return false;
  const raw = rest.activo ?? rest.active ?? rest?.raw?.activo ?? rest?.raw?.active;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === 'false' || s === '0' || s === 'no') return false;
  if (s === 'true' || s === '1' || s === 'si' || s === 'sí') return true;
  return true;
};

const getAuthHeaders = (extra = {}) => {
  const base = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
  if (TOKEN && TOKEN.trim()) base.Authorization = `Bearer ${TOKEN}`;
  return base;
};

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

/* ------------------ Permisos / Geolocalización ------------------ */
async function hasLocationPermission() {
  try {
    if (Platform.OS === 'android') {
      const status = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      return status === RESULTS.GRANTED;
    } else {
      const cur = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (cur === RESULTS.GRANTED) return true;
      const res = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return res === RESULTS.GRANTED;
    }
  } catch (e) {
    return false;
  }
}

/* Haversine — distancia en km entre dos coordenadas */
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ------------------ NUEVO: utilidades de red robustas ------------------ */

// Ejecuta 'asyncFn' sobre 'items' con un límite de tareas concurrentes,
// en vez de disparar todas las peticiones al mismo tiempo (esto evita
// saturar el servidor local y que algunas peticiones fallen "al azar").
async function mapWithConcurrencyLimit(items, limit, asyncFn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      try {
        results[current] = await asyncFn(items[current], current);
      } catch (e) {
        console.warn('mapWithConcurrencyLimit - tarea falló', e);
        results[current] = undefined;
      }
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

// fetch con un reintento simple para peticiones que fallan por red/timeout
// intermitente (común al pegarle muy seguido a un servidor local).
async function fetchWithRetry(url, options = {}, retries = 1) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/* ------------------ fetchSurveyAvgForSucursal ------------------ */
const fetchSurveyAvgForSucursal = async (sucursalId) => {
  if (!sucursalId) return 0.0;
  try {
    await ensureToken();
    const url = `${API_URL_2.replace(/\/$/, '')}/${encodeURIComponent(SURVEY_ID)}/reportes?sucursal_id=${encodeURIComponent(sucursalId)}`;
    const res = await fetchWithRetry(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    }, 1);
    if (!res.ok) {
      console.warn('fetchSurveyAvgForSucursal - http status', res.status, url);
      return 0.0;
    }
    const json = await res.json().catch(() => null);
    if (!json) return 0.0;
    const resumen = Array.isArray(json.resumen_por_sucursal) ? json.resumen_por_sucursal : [];
    const block = resumen.find(r => String(r.sucursal_id) === String(sucursalId)) || resumen[0] || null;
    if (!block || !Array.isArray(block.preguntas)) return 0.0;
    const starQuestions = block.preguntas.filter(p => (p.tipo || '').toString().toUpperCase() === 'ESTRELLAS' && p.promedio != null);
    if (!starQuestions.length) return 0.0;
    const sum = starQuestions.reduce((acc, p) => acc + (Number(p.promedio) || 0), 0);
    const avg = sum / starQuestions.length;
    return Number(avg.toFixed(1));
  } catch (e) {
    console.warn('fetchSurveyAvgForSucursal exception', e);
    return 0.0;
  }
};

/* ------------------ fetchAllRestaurants ------------------ */
const fetchAllRestaurants = async () => {
  try {
    await ensureToken();
    const perPage = 100;
    let page = 1;
    const maxPages = 20;
    let accumulated = [];

    while (page <= maxPages) {
      const sep = API_URL.includes('?') ? '&' : '?';
      const url = `${API_URL}${sep}page=${page}&per_page=${perPage}`;

      const res = await fetchWithRetry(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      }, 1);

      if (!res.ok) {
        if (page === 1) {
          const res2 = await fetchWithRetry(API_URL, {
            method: 'GET',
            headers: getAuthHeaders(),
          }, 1);
          if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
          const json2 = await res2.json().catch(() => null);
          let itemsFallback = [];
          if (Array.isArray(json2)) itemsFallback = json2;
          else if (Array.isArray(json2.restaurantes)) itemsFallback = json2.restaurantes;
          else if (Array.isArray(json2.data)) itemsFallback = json2.data;
          return itemsFallback;
        } else {
          break;
        }
      }

      const json = await res.json().catch(() => null);
      if (!json) break;

      let items = [];
      if (Array.isArray(json.restaurantes)) items = json.restaurantes;
      else if (Array.isArray(json.data)) items = json.data;
      else if (Array.isArray(json.results)) items = json.results;
      else if (Array.isArray(json)) items = json;
      else items = [];

      if ((!items || items.length === 0) && accumulated.length > 0) break;

      if ((!items || items.length === 0) && accumulated.length === 0) {
        if (json && Array.isArray(json.restaurantes)) {
          accumulated.push(...json.restaurantes);
        } else {
          break;
        }
      } else {
        accumulated.push(...items);
      }

      const totalPages = json.total_pages || (json.meta && json.meta.total_pages) || null;
      const nextPageUrl = json.next_page_url || json.next || null;

      // CORREGIDO: antes se hacía `if (nextPageUrl) break;`, lo cual detenía
      // la paginación justo cuando la API indicaba que SÍ había más páginas
      // (truncando el listado a la primera página, ej. 100 restaurantes).
      // La lógica correcta es: seguir pidiendo páginas mientras haya
      // 'total_pages' pendientes o un 'next_page_url', y parar solo cuando
      // ya no queden más páginas o la página vino incompleta.
      if (totalPages) {
        if (page >= Number(totalPages)) break;
      } else if (!nextPageUrl) {
        if (items.length < perPage) break;
      }

      page += 1;
    }

    const map = new Map();
    accumulated.forEach((it) => {
      const key = String(it?.id ?? Math.random());
      if (!map.has(key)) map.set(key, it);
    });

    return Array.from(map.values());
  } catch (e) {
    console.warn('fetchAllRestaurants exception', e);
    return [];
  }
};

/* ------------------ Componente principal ------------------ */
export default function RestaurantsScreen() {
  const navigation = useNavigation();
  const { width, wp, hp, rf, clamp } = useResponsive();
  const insets = useSafeAreaInsets();

  const [restaurants, setRestaurants] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [cities, setCities] = useState(['Todos']);
  const [favorites, setFavorites] = useState([]);
  const [environment, setEnvironment] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [city, setCity] = useState('Todos');
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

  // CAMBIADO: rango de precios por defecto ahora cubre todo el rango
  // posible (0 - 2000) para que, sin tocar el filtro, no se excluya a
  // ningún restaurante.
  const [minPrice, setMinPrice] = useState(DEFAULT_MIN_PRICE);
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX_PRICE);

  const [loading, setLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  const [useLocation, setUseLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  // CAMBIADO: radio de búsqueda inicia en 0 (filtro inactivo por defecto).
  const [searchRadiusKm, setSearchRadiusKm] = useState(DEFAULT_SEARCH_RADIUS_KM);

  // NUEVO: estado para el aviso de confirmación al mover el radio de
  // búsqueda sin tener la ubicación activada todavía.
  const [showRadiusConfirm, setShowRadiusConfirm] = useState(false);
  const [pendingRadius, setPendingRadius] = useState(null);

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
    }).start(() => {
      setToastVisible(false);
      setToastMessage('');
    });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  // CAMBIADO: ahora devuelve un booleano (true = ubicación obtenida con
  // éxito, false = no se pudo activar), para poder encadenar acciones
  // (como aplicar el radio de búsqueda pendiente) solo si tuvo éxito.
  // También se quitó el toast de "Ubicación obtenida" que ya no se
  // necesita mostrar.
  const requestLocationAndActivate = async () => {
    try {
      const ok = await hasLocationPermission();
      if (!ok) {
        runShowToast('Permiso de ubicación denegado');
        setUseLocation(false);
        return false;
      }

      return await new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords || {};
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              setUserLocation({ latitude, longitude });
              setUseLocation(true);
              resolve(true);
            } else {
              setUserLocation(null);
              setUseLocation(false);
              runShowToast('No se pudo obtener ubicación válida');
              resolve(false);
            }
          },
          (error) => {
            console.warn('requestLocationAndActivate - geolocation error', error);
            setUserLocation(null);
            setUseLocation(false);
            if (error && error.code === 1) {
              runShowToast('Permiso de ubicación denegado');
            } else if (error && error.code === 2) {
              runShowToast('No se encontró la ubicación del dispositivo');
            } else {
              runShowToast(error?.message ? String(error.message) : 'Error obteniendo ubicación');
            }
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      });
    } catch (e) {
      console.warn('requestLocationAndActivate exception', e);
      setUserLocation(null);
      setUseLocation(false);
      runShowToast('Error solicitando permiso de ubicación');
      return false;
    }
  };

  // NUEVO: se dispara cuando el usuario suelta el slider de radio de
  // búsqueda sin tener la ubicación activada. Guarda el valor que quería
  // poner y muestra el aviso de confirmación.
  const handleRadiusSlidingComplete = (val) => {
    if (useLocation) return;
    setPendingRadius(val);
    setShowRadiusConfirm(true);
  };

  // NUEVO: el usuario aceptó activar la ubicación desde el aviso del radio
  // de búsqueda. Si se obtiene la ubicación con éxito, se aplica el radio
  // que había intentado poner.
  const handleAcceptRadiusConfirm = async () => {
    setShowRadiusConfirm(false);
    const ok = await requestLocationAndActivate();
    if (ok && pendingRadius != null) {
      setSearchRadiusKm(pendingRadius);
    }
    setPendingRadius(null);
  };

  // NUEVO: el usuario canceló el aviso; el radio de búsqueda se mantiene
  // desactivado (vuelve a su valor anterior porque nunca se actualizó el
  // estado real del filtro).
  const handleCancelRadiusConfirm = () => {
    setShowRadiusConfirm(false);
    setPendingRadius(null);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        await ensureToken();

        const rawEnvironment = await AsyncStorage.getItem(USER_ENVIRONMENT_KEY);
        const normalizedEnvironment = normalizeEnvironment(rawEnvironment);
        setEnvironment(normalizedEnvironment);

        console.warn('[RestaurantsScreen] user_environment desde AsyncStorage:', {
          rawEnvironment,
          normalizedEnvironment,
        });

        const list = await fetchAllRestaurants();
        console.warn('[RestaurantsScreen] restaurantes recibidos desde API:', Array.isArray(list) ? list.length : list);

        if (!Array.isArray(list)) {
          console.warn('[RestaurantsScreen] fetchAllRestaurants no devolvió un array:', list);
        }
        if (!mounted) return;

        const allRestaurantsRaw = Array.isArray(list) ? list : [];

        // NUEVO: solo se procesan (y por lo tanto solo se listan sus
        // sucursales) los restaurantes que vienen marcados como activos.
        // Los que traen activo === false quedan fuera desde aquí, así no
        // se gastan peticiones de detalle/sucursales en restaurantes que
        // no deben mostrarse.
        const allRestaurants = allRestaurantsRaw.filter(isRestaurantActive);

        console.warn('[RestaurantsScreen] restaurantes activos vs total recibido:', {
          activos: allRestaurants.length,
          total: allRestaurantsRaw.length,
        });

        const restNameMap = {};
        const restEnvironmentMap = {};

        // NUEVO: concurrencia limitada (antes se disparaban TODAS las
        // peticiones de detalle al mismo tiempo, lo que podía saturar el
        // servidor local y hacer fallar peticiones al azar).
        await mapWithConcurrencyLimit(allRestaurants, 6, async (rest) => {
          try {
            if (!rest || rest.id === undefined || rest.id === null) return;

            await ensureToken();
            const restUrl = `${API_URL.replace(/\/$/, '')}/${encodeURIComponent(rest.id)}`;
            const rr = await fetchWithRetry(restUrl, {
              headers: getAuthHeaders(),
            }, 1);

            if (!rr.ok) {
              console.warn('[RestaurantsScreen] detalle de restaurante falló:', {
                id: rest.id,
                status: rr.status,
              });
              return;
            }

            const rjson = await rr.json().catch(() => null);

            const nombre = rjson?.nombre ?? rjson?.name ?? rest?.nombre ?? rest?.name ?? null;
            if (nombre) restNameMap[String(rest.id)] = String(nombre);

            const restEnv = normalizeEnvironment(
              rjson?.environment ??
              rest?.environment ??
              rest?.raw?.environment ??
              rest?.environment_type ??
              ''
            );

            if (restEnv) {
              restEnvironmentMap[String(rest.id)] = restEnv;
            } else {
              console.warn('[RestaurantsScreen] restaurante sin environment detectable:', {
                id: rest?.id,
                nombre: nombre || rest?.nombre || rest?.name,
                apiListEnvironment: rest?.environment,
                detailEnvironment: rjson?.environment,
              });
            }
          } catch (e) {
            console.warn('[RestaurantsScreen] Error fetching restaurant detail for id:', rest?.id, e);
          }
        });

        const branchesArraysRaw = await mapWithConcurrencyLimit(allRestaurants, 6, async (rest) => {
          try {
            if (!rest || rest.id === undefined || rest.id === null) return [];

            await ensureToken();
            const url = `${API_URL.replace(/\/$/, '')}/${encodeURIComponent(rest.id)}/sucursales`;
            const r = await fetchWithRetry(url, {
              headers: getAuthHeaders(),
            }, 1);

            if (!r.ok) {
              console.warn(`[RestaurantsScreen] sucursales request failed para rest ${rest.id}`, {
                status: r.status,
                url,
              });
              return [];
            }

            const j = await r.json().catch(() => null);
            if (!j) {
              console.warn('[RestaurantsScreen] respuesta vacía en sucursales para rest:', rest.id);
              return [];
            }

            // Un objeto "parece una sucursal" si trae al menos un identificador
            // o nombre/dirección reconocible (heurística para el caso de que
            // el backend devuelva un objeto suelto en vez de un arreglo).
            const looksLikeSucursal = (obj) =>
              obj && typeof obj === 'object' && !Array.isArray(obj) &&
              (obj.id !== undefined || obj.nombre !== undefined || obj.name !== undefined || obj.direccion !== undefined || obj.address !== undefined);

            let branches = [];
            if (Array.isArray(j.sucursales)) branches = j.sucursales;
            else if (Array.isArray(j.data) && Array.isArray(j.data.sucursales)) branches = j.data.sucursales;
            else if (Array.isArray(j.data)) branches = j.data;
            else if (Array.isArray(j.results)) branches = j.results;
            else if (Array.isArray(j.items)) branches = j.items;
            else if (Array.isArray(j)) branches = j;
            // NUEVO: casos donde el backend devuelve UNA sola sucursal sin
            // envolverla en arreglo (frecuente cuando el restaurante solo
            // tiene una sucursal). Antes esto se interpretaba como "0
            // sucursales" y la sucursal desaparecía del listado.
            else if (looksLikeSucursal(j.sucursal)) branches = [j.sucursal];
            else if (looksLikeSucursal(j.data)) branches = [j.data];
            else if (looksLikeSucursal(j)) branches = [j];
            else branches = [];

            if (!branches || branches.length === 0) {
              // Log detallado: si esto se repite para el mismo restaurante,
              // copia esta salida para ver la forma exacta que regresa la API
              // y así ajustar el parseo si sigue sin coincidir con nada.
              let rawPreview = '';
              try {
                rawPreview = JSON.stringify(j).slice(0, 500);
              } catch (e) {
                rawPreview = '(no se pudo serializar)';
              }
              console.warn('[RestaurantsScreen] sin sucursales para restaurant (revisa la forma de la respuesta):', {
                restaurantId: rest.id,
                url,
                rawPreview,
              });
              return [];
            }

            const parentEnv = normalizeEnvironment(
              restEnvironmentMap[String(rest.id)] ??
              rest?.environment ??
              rest?.raw?.environment ??
              ''
            );

            const mappedPromises = branches.map(async (b) => {
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

              // CORREGIDO: antes se usaba SIEMPRE el environment del restaurante
              // padre para todas sus sucursales, ignorando si la sucursal trae
              // su propio campo 'environment'. Ahora se prioriza el dato de la
              // sucursal (más específico) y solo se usa el del padre como respaldo.
              const branchEnvRaw = b.environment ?? b.ambiente ?? b?.raw?.environment ?? null;
              const normalizedBranchEnv = normalizeEnvironment(branchEnvRaw);
              const finalEnv = normalizedBranchEnv || parentEnv;

              const mapped = {
                id: b.id ?? `${rest.id}-${Math.random().toString(36).slice(2, 8)}`,
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
                telefono_sucursal: b.telefono_sucursal ?? b.telefono ?? null,
                horarios: Array.isArray(b.horarios) ? b.horarios : (b.horario ? [b.horario] : []),
                url_facebook: b.url_facebook ?? b.facebook_url ?? null,
                url_instagram: b.url_instagram ?? b.instagram_url ?? null,
                url_tiktok: b.url_tiktok ?? b.tiktok ?? null,
                url_whatsapp: b.url_whatsapp ?? b.whatsapp ?? null,
                url_opentable: url_opentable,
                environment: finalEnv,
                raw: b,
              };

              const itemEnv = normalizeEnvironment(mapped.environment);

              if (normalizedEnvironment && itemEnv && itemEnv !== normalizedEnvironment) {
                console.warn('[RestaurantsScreen] sucursal con environment distinto al esperado:', {
                  restaurantId: rest.id,
                  branchId: mapped.id,
                  branchName: mapped.name,
                  itemEnv,
                  expected: normalizedEnvironment,
                });
              }

              try {
                const mostrarFlag =
                  !!(
                    b.mostrar_rating === true ||
                    (b.mostrar_rating && String(b.mostrar_rating).toLowerCase() === 'true') ||
                    (mapped.raw && (mapped.raw.mostrar_rating === true || (String(mapped.raw.mostrar_rating || '').toLowerCase() === 'true'))) ||
                    mapped.mostrar_rating === true ||
                    (mapped.mostrar_rating && String(mapped.mostrar_rating).toLowerCase() === 'true')
                  );

                if (mostrarFlag) {
                  const surveyAvg = await fetchSurveyAvgForSucursal(mapped.id);
                  mapped.avg_rating = surveyAvg;
                }
              } catch (e) {
                console.warn('[RestaurantsScreen] Error calculando surveyAvg para sucursal:', b.id, e);
              }

              return mapped;
            });

            const resolved = await Promise.allSettled(mappedPromises);
            const values = resolved.filter(s => s.status === 'fulfilled').map(s => s.value);
            return values;
          } catch (err) {
            console.warn('[RestaurantsScreen] Error fetching branches for restaurant:', rest.id, err);
            return [];
          }
        });

        const branchesArrays = branchesArraysRaw
          .filter(Boolean)
          .flat();

        console.warn('[RestaurantsScreen] sucursales total antes de filtrar environment:', branchesArrays.length);

        const filteredByEnvironment = branchesArrays.filter((item) => {
          if (!normalizedEnvironment) return true;

          const itemEnv = normalizeEnvironment(
            item?.environment ??
            item?.raw?.environment ??
            ''
          );

          // CORREGIDO: si no se pudo determinar el environment de la sucursal
          // (por ejemplo porque falló la petición de detalle del restaurante
          // padre), antes se ocultaba silenciosamente. Ahora, ante la duda,
          // se muestra la sucursal en vez de perderla sin explicación.
          if (!itemEnv) {
            console.warn('[RestaurantsScreen] sucursal sin environment detectable, se muestra por defecto:', {
              id: item?.id,
              name: item?.name,
              expected: normalizedEnvironment,
            });
            return true;
          }

          const ok = itemEnv === normalizedEnvironment;

          if (!ok) {
            console.warn('[RestaurantsScreen] sucursal descartada por environment:', {
              id: item?.id,
              name: item?.name,
              itemEnv,
              expected: normalizedEnvironment,
            });
          }

          return ok;
        });

        console.warn('[RestaurantsScreen] sucursales después del filtro environment:', filteredByEnvironment.length);

        if (normalizedEnvironment && allRestaurants.length > 0 && filteredByEnvironment.length === 0) {
          console.warn('[RestaurantsScreen] No quedó ninguna sucursal visible. Revisa:', {
            asyncEnvironment: rawEnvironment,
            normalizedEnvironment,
            restaurantsReceived: allRestaurants.length,
            restaurantsWithEnvSample: allRestaurants.slice(0, 5).map(r => ({
              id: r?.id,
              nombre: r?.nombre ?? r?.name,
              environment: r?.environment,
            })),
          });
        }

        if (!mounted) return;

        setRestaurants(filteredByEnvironment);
        setFilteredData(filteredByEnvironment);

        const uniqueCitiesFromApi = Array.from(new Set(filteredByEnvironment.map(i => i.city).filter(Boolean)));
        const sampleCities = ['Ciudad de México', 'Polanco', 'Roma'];
        const mergedCities = Array.from(new Set(['Todos', ...sampleCities, ...uniqueCitiesFromApi]));
        setCities(mergedCities);
      } catch (err) {
        console.warn('[RestaurantsScreen] Error al cargar restaurantes/sucursales:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { };
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

      const visibleOnly = Array.isArray(objs)
        ? objs.filter(f => restaurants.some(r => String(r.id) === String(f.id)))
        : [];

      setFavorites(visibleOnly);
    } catch (e) {
      console.warn('loadFavoritesFromStorage error', e);
    }
  };

  useEffect(() => {
    loadFavoritesFromStorage();
    const unsub = navigation.addListener('focus', () => loadFavoritesFromStorage());
    return unsub;
  }, [navigation, restaurants]);

  const applyFilters = () => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = restaurants.filter(item => {
      const itemEnv = normalizeEnvironment(item?.environment ?? item?.raw?.environment ?? '');
      const matchEnvironment = !environment || itemEnv === environment;

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
        // CAMBIADO: el estado "sin filtro de precio" ahora es
        // minPrice === DEFAULT_MIN_PRICE && maxPrice === DEFAULT_MAX_PRICE
        // (antes era 0-500), para que coincida con los nuevos valores por
        // defecto del filtro y no oculte restaurantes sin datos de precio
        // cuando el usuario no ha tocado el filtro.
        if (minPrice === DEFAULT_MIN_PRICE && maxPrice === DEFAULT_MAX_PRICE) matchPrice = true;
        else matchPrice = false;
      }

      let matchLocation = true;
      if (useLocation) {
        if (!userLocation || userLocation.latitude == null || userLocation.longitude == null) {
          matchLocation = false;
        } else {
          const latA = Number(userLocation.latitude);
          const lonA = Number(userLocation.longitude);
          const latB = Number(item.latitude ?? item.latitud ?? item.raw?.latitud ?? item.raw?.latitude ?? 0);
          const lonB = Number(item.longitude ?? item.longitud ?? item.raw?.longitud ?? item.raw?.longitude ?? 0);

          if (!isFinite(latB) || !isFinite(lonB) || (latB === 0 && lonB === 0)) {
            matchLocation = false;
          } else {
            const distKm = haversineKm(latA, lonA, latB, lonB);
            matchLocation = distKm <= Number(searchRadiusKm);
          }
        }
      }

      return matchEnvironment && matchSearch && matchRating && matchCity && matchCuisine && matchPrice && matchLocation;
    });

    setFilteredData(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, minRating, city, restaurants, cuisine, minPrice, maxPrice, useLocation, userLocation, searchRadiusKm, environment]);

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
        updated = current.filter(c => String(c.id) !== sid);
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(updated));
        setFavorites(updated.filter(f => restaurants.some(r => String(r.id) === String(f.id))));
        runShowToast('Eliminado de favoritos');
      } else {
        const toSave = {
          ...item,
          id: sid,
          environment: item.environment ?? environment ?? null,
          _saved_at: Date.now(),
        };
        updated = [...(Array.isArray(current) ? current : []), toSave];
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(updated));
        setFavorites(updated.filter(f => restaurants.some(r => String(r.id) === String(f.id))));
        runShowToast('Agregado a favoritos');
      }
    } catch (e) {
      console.warn('toggleFavorite error', e);
      runShowToast('Error al actualizar favoritos');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const visibleFavorites = favorites.filter(f => restaurants.some(r => String(r.id) === String(f.id)));
  const horizPad = Math.max(10, wp(3.5));
  const headerHeight = clamp(hp(7.5), 58, 92);
  const logoW = clamp(wp(23), 72, 140);
  const searchHeight = clamp(hp(5.2), 40, 56);
  const iconSize = clamp(rf(2.4), 18, 26);
  const cardImageH = clamp(Math.round(width * 0.48), 140, 300);
  const cardRadius = Math.round(clamp(wp(2), 8, 16));
  const modalWidth = Math.min(Math.round(width * 0.94), 920);

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

      const visibleOnly = Array.isArray(objs)
        ? objs.filter(f => restaurants.some(r => String(r.id) === String(f.id)))
        : [];

      navigation.navigate('Favorites', { favorites: visibleOnly });
    } catch (e) {
      console.warn('openFavoritesFromHeader error', e);
      navigation.navigate('Favorites', { favorites: [] });
    }
  };

  const topSafe = Math.round(Math.max(insets.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0)));
  const bottomSafe = Math.round(insets.bottom || 0);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topSafe + 8 }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={[styles.header, { paddingHorizontal: horizPad, height: headerHeight }]}>
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

        <TouchableOpacity onPress={openFavoritesFromHeader} style={{ marginLeft: 10, padding: 6 }}>
          <Ionicons name="heart-outline" size={iconSize + 2} color={visibleFavorites && visibleFavorites.length > 0 ? '#e0245e' : '#444'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(16, hp(3)) + bottomSafe }]}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            imageSource={item.image ? { uri: item.image } : defaultImage}
            onPress={() =>
              navigation.navigate('Restaurant', {
                restaurant: item,
                id: item.id,
                isFavorite: visibleFavorites.some(f => String(f.id) === String(item.id)),
              })
            }
            isFavorite={visibleFavorites.some(f => String(f.id) === String(item.id))}
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
                <Text style={styles.modalLabel}>Usar tu ubicación</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: '#333', fontWeight: '600' }}>
                    {useLocation ? 'Activa' : 'Desactivada'}
                  </Text>
                  <Switch
                    value={useLocation}
                    onValueChange={async (val) => {
                      if (val) {
                        await requestLocationAndActivate();
                      } else {
                        setUseLocation(false);
                        setUserLocation(null);
                      }
                    }}
                  />
                </View>

                <Text style={[styles.modalLabel, { marginTop: 14 }]}>Radio de búsqueda ({searchRadiusKm} km)</Text>
                <View style={{ marginTop: 8, paddingHorizontal: 6 }}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={50}
                    step={1}
                    value={searchRadiusKm}
                    onValueChange={(val) => {
                      // CAMBIADO: si la ubicación no está activada todavía,
                      // el filtro de radio no se aplica en vivo; se espera a
                      // que el usuario suelte el slider para pedir
                      // confirmación (ver onSlidingComplete).
                      if (useLocation) {
                        setSearchRadiusKm(val);
                      }
                    }}
                    onSlidingComplete={handleRadiusSlidingComplete}
                    minimumTrackTintColor={STAR_COLOR}
                    maximumTrackTintColor="#ddd"
                  />
                  <Text style={{ color: '#444', marginTop: 6 }}>
                    {useLocation
                      ? `Mostrando restaurantes dentro de ${searchRadiusKm} km`
                      : 'Actívala para usar el radio de búsqueda'}
                  </Text>
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
                    minimumTrackTintColor={STAR_COLOR}
                    maximumTrackTintColor="#ccc"
                    thumbTintColor={STAR_COLOR}
                  />
                  <Text style={styles.sliderValue}>{minRating.toFixed(1)}★</Text>
                </View>

                <Text style={styles.modalLabel}>Tipo de comida</Text>
                <View style={styles.pickerWrapper}>
                  <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 6 }} showsHorizontalScrollIndicator={false}>
                    {sampleTypes.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setCuisine(t.id)}
                        style={{
                          marginRight: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: cuisine === t.id ? '#eef7ff' : '#fff',
                          borderWidth: 1,
                          borderColor: '#eee',
                        }}
                      >
                        <Text style={{ color: '#333', fontWeight: cuisine === t.id ? '800' : '600' }}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
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
                <TouchableOpacity
                  onPress={() => {
                    setCity('Todos');
                    setMinRating(0);
                    setCuisine('todos');
                    setMinPrice(DEFAULT_MIN_PRICE);
                    setMaxPrice(DEFAULT_MAX_PRICE);
                    setUseLocation(false);
                    setUserLocation(null);
                    setSearchRadiusKm(DEFAULT_SEARCH_RADIUS_KM);
                  }}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearText}>Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    applyFilters();
                    setShowFilterModal(false);
                  }}
                  style={styles.applyButton}
                >
                  <Text style={styles.applyText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* NUEVO: aviso de confirmación al mover el radio de búsqueda sin
          tener la ubicación activada. Chico, centrado, no invasivo. */}
      {showRadiusConfirm && (
        <Modal visible={showRadiusConfirm} transparent animationType="fade" onRequestClose={handleCancelRadiusConfirm}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Activar ubicación</Text>
              <Text style={styles.confirmText}>
                Para usar el radio de búsqueda necesitamos activar tu ubicación precisa. ¿Deseas activarla?
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity onPress={handleCancelRadiusConfirm} style={styles.confirmCancelBtn}>
                  <Text style={styles.confirmCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAcceptRadiusConfirm} style={styles.confirmAcceptBtn}>
                  <Text style={styles.confirmAcceptText}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
          ]}
        >
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

function RestaurantCard({
  restaurant,
  imageSource,
  onPress,
  isFavorite,
  onToggleFavorite,
  cardImageH = 200,
  cardRadius = 12,
}) {
  const fullName = restaurant.name || '';
  const nameParts = fullName.split(/\s*-\s*/);
  const mainName = nameParts[0] || '';
  const secondName = nameParts.length > 1 ? nameParts.slice(1).join(' - ') : '';

  const shouldShowSurveyRating = !!(
    restaurant?.raw &&
    (
      restaurant.raw.mostrar_rating === true ||
      (restaurant.raw.mostrar_rating && String(restaurant.raw.mostrar_rating).toLowerCase() === 'true') ||
      restaurant.mostrar_rating === true ||
      (restaurant.mostrar_rating && String(restaurant.mostrar_rating).toLowerCase() === 'true')
    )
  );

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

      <TouchableOpacity onPress={onPress} style={styles.infoRow} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{mainName}</Text>
          {secondName ? <Text style={styles.name} numberOfLines={1}>{secondName}</Text> : null}
          {(restaurant.short_description || restaurant.full_description) ? (
            <Text style={styles.sub} numberOfLines={1}>{restaurant.short_description || restaurant.full_description}</Text>
          ) : null}
          {restaurant.tipo_comida_raw ? (
            <Text style={styles.shortDesc}>{restaurant.tipo_comida_raw}</Text>
          ) : null}
        </View>

        <View style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
          {shouldShowSurveyRating && (restaurant.avg_rating != null && !Number.isNaN(Number(restaurant.avg_rating))) ? (
            <View style={styles.ratingBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="star" size={14} color={STAR_COLOR} />
                <Text style={[styles.ratingText, { marginLeft: 6 }]}>{Number(restaurant.avg_rating).toFixed(1)}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: 8 }} />
          <Text style={styles.price}>
            {restaurant.avg_price ? `${restaurant.avg_price} MXN` : (restaurant.price_range_raw ? restaurant.price_range_raw : '')}
          </Text>
          <View style={{ height: 6 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const AVATAR_SIZE = 60;
const SLIDER_HEIGHT = 250;
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

  // NUEVO: estilos para el aviso de confirmación del radio de búsqueda.
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 8 },
  confirmText: { fontSize: 14, color: '#555', lineHeight: 20 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  confirmCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, justifyContent: 'center' },
  confirmCancelText: { color: '#555', fontWeight: '600' },
  confirmAcceptBtn: { backgroundColor: '#0046ff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  confirmAcceptText: { color: '#fff', fontWeight: '700' },
});