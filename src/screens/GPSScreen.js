import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  Text,
  Dimensions,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKEN, ensureToken } from '../auth/tokenManager';
import { useBackHandler } from '../hooks/useBackHandler';

const { width } = Dimensions.get('window');

// ─── Mismas constantes que en el feed ────────────────────────────────────────
const API_URL_2 = 'https://api.tab-track.com/api/encuestas';
const SURVEY_ID = '8916180a-95fd-46af-bde4-60635cc7e1ab';
// ─────────────────────────────────────────────────────────────────────────────
let API_URL = 'https://api.tab-track.com/api/restaurantes'; 
const MARKER_BASE64 = 'data:image/png;base64,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';
const INCLUDE_ZERO_COORDINATES = false;
const USER_ENVIRONMENT_KEY = 'user_environment';

const normalizeEnvironment = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const warn = (...args) => console.warn(...args);

async function fetchWithRetry(url, options = {}, retries = 1) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const getAuthHeaders = (extra = {}) => {
  const base = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
  if (TOKEN && TOKEN.trim()) base.Authorization = `Bearer ${TOKEN}`;
  return base;
};

const fetchSurveyAvgForSucursal = async (sucursalId) => {
  if (!sucursalId) return 0.0;
  try {
    await ensureToken();
    const url = `${API_URL_2.replace(/\/$/, '')}/${encodeURIComponent(SURVEY_ID)}/reportes?sucursal_id=${encodeURIComponent(sucursalId)}`;
    const res = await fetchWithRetry(url, { method: 'GET', headers: getAuthHeaders() }, 1);
    if (!res.ok) {
      warn('fetchSurveyAvgForSucursal - http status', res.status, url);
      return 0.0;
    }
    const json = await res.json().catch(() => null);
    if (!json) return 0.0;
    const resumen = Array.isArray(json.resumen_por_sucursal) ? json.resumen_por_sucursal : [];
    const block   = resumen.find(r => String(r.sucursal_id) === String(sucursalId)) || resumen[0] || null;
    if (!block || !Array.isArray(block.preguntas)) return 0.0;
    const starQs  = block.preguntas.filter(p => (p.tipo || '').toUpperCase() === 'ESTRELLAS' && p.promedio != null);
    if (!starQs.length) return 0.0;
    const avg = starQs.reduce((acc, p) => acc + (Number(p.promedio) || 0), 0) / starQs.length;
    return Number(avg.toFixed(1));
  } catch (e) {
    warn('fetchSurveyAvgForSucursal exception', e);
    return 0.0;
  }
};

const isMostrarRatingOn = (obj) => {
  if (!obj) return false;
  const check = (v) => v === true || (v != null && String(v).trim().toLowerCase() === 'true');
  return check(obj.mostrar_rating) || check(obj.raw?.mostrar_rating);
};

async function hasLocationPermission() {
  if (Platform.OS === 'android') {
    const status = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    return status === RESULTS.GRANTED;
  } else {
    const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    if (status === RESULTS.GRANTED) return true;
    const res = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return res === RESULTS.GRANTED;
  }
}

function makeAbsoluteUrl(url) {
  if (!url) return null;
  try {
    new URL(url);
    return url;
  } catch (e) {
    try {
      if (typeof API_URL === 'string' && API_URL.trim()) {
        const u = new URL(API_URL);
        return u.origin + '/' + String(url).replace(/^\/+/, '');
      }
    } catch (e2) { return url; }
    return url;
  }
}

function generateMapHtml(userLat, userLng, locations, markerSrc, markerCount) {
  const safe        = JSON.stringify(locations).replace(/</g, '\\u003c');
  const fallbackImg = markerSrc || '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html,body,#map{height:100%;margin:0;padding:0}
  .marker-badge{
    position:absolute;top:8px;right:8px;z-index:9999;
    background:rgba(0,0,0,0.6);color:#fff;
    padding:6px 10px;border-radius:12px;font-weight:700;font-size:13px;
  }
  .user-dot{
    width:16px;height:16px;border-radius:50%;background:#007AFF;
    border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,122,255,0.4);
  }
  .branch-pin{
    width:32px;height:32px;background-size:contain;
    background-repeat:no-repeat;background-position:center;cursor:pointer;
  }

  /* Popup: volvemos al ancho fijo 240px que funcionaba bien antes */
  .custom-popup{
    width:240px;
    max-width:60vw;
    background:#fff;border-radius:10px;
    padding:10px 12px 12px 12px;
    box-shadow:0 6px 18px rgba(0,0,0,0.12);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;
    font-size:13px;color:#222;overflow:hidden;box-sizing:border-box;
  }

  /* Fila principal: columna-izq (foto+rating) a la izquierda, info a la derecha */
  .custom-row{
    display:flex;
    align-items:flex-start;
    margin-bottom:8px;
    gap:8px;
  }
  /* Columna izquierda: foto arriba, rating centrado abajo */
  .custom-left{
    display:flex;flex-direction:column;align-items:center;
    flex-shrink:0;gap:4px;
  }
  .custom-thumb{
    width:56px;height:56px;border-radius:8px;
    object-fit:cover;background:#f3f4f6;
  }

  /* Rating debajo de la foto */
  .rating-row{
    display:flex;align-items:center;justify-content:center;gap:2px;
  }
  .rating-star{color:#FFD700;font-size:13px;line-height:1;}
  .rating-num{font-size:12px;font-weight:700;color:#333;}

  /* Columna derecha: nombre, sucursal, descripción */
  .custom-info{
    flex:1;min-width:0;
    display:flex;flex-direction:column;gap:2px;
  }
  .custom-name{
    font-weight:800;font-size:14px;color:#111;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .custom-branch{
    font-size:11px;color:#777;font-weight:500;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .custom-desc{
    font-size:11px;color:#555;line-height:1.3;
    overflow:hidden;text-overflow:ellipsis;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  }

  /* Botones: mismo fix que ya funcionaba — flex:1 + box-sizing */
  .btn-row{
    display:flex;gap:8px;
    width:100%;box-sizing:border-box;
  }
  .btn{
    flex:1;min-width:0;
    padding:9px 4px;
    border-radius:8px;text-align:center;
    font-weight:700;cursor:pointer;border:none;
    font-size:13px;box-sizing:border-box;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .btn-primary{background:#0066FF;color:#fff;}
  .btn-ghost{background:transparent;color:#0066FF;border:1px solid rgba(0,102,255,0.22);}

  .maplibregl-popup-content{padding:0;border-radius:10px;overflow:hidden;}
  .maplibregl-popup-tip{display:none;}
</style>
</head>
<body>
  <div id="map"></div>
  <div class="marker-badge">Pines: ${markerCount}</div>
  <script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
  <script>
    (function(){
      try {
        var locations = ${safe};

        var map = new maplibregl.Map({
          container: 'map',
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: [${userLng}, ${userLat}],
          zoom: 13
        });

        var userEl = document.createElement('div');
        userEl.className = 'user-dot';
        new maplibregl.Marker({ element: userEl })
          .setLngLat([${userLng}, ${userLat}])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText('Tú estás aquí'))
          .addTo(map);

        window._openBranch = function(i){
          try {
            var payload = { action: 'viewProfile', branch: locations[i] };
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          } catch(e){ console.error('openBranch error', e); }
        };

        window._navigateTo = function(i){
          try {
            var loc = locations[i];
            var lat = Number(loc.latitud || loc.latitude || loc.lat || 0);
            var lng = Number(loc.longitud || loc.longitude || loc.lng || 0);
            var payload = { action: 'navigate', lat: lat, lng: lng };
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          } catch(e){ console.error('navigateTo error', e); }
        };

        function makePopupHtml(idx, loc) {
          var restaurantName = loc.restaurantName || loc.restaurant_name || '';
          var branchName     = loc.nombre || loc.name || '';
          var desc = loc.descripcion || loc.short_description || loc.direccion || loc.description || '';
          var img  = loc.imagen_logo_url || loc.image || loc.logo || '${fallbackImg}';

          // mostrar_rating: si está en true se muestra el rating (aunque sea 0.0).
          // Si está en false, no se muestra nada — igual que en el feed.
          var mostrar = loc.mostrar_rating === true
                     || String(loc.mostrar_rating || '').toLowerCase() === 'true';

          // Rating inline junto a la info, no debajo de todo
          var ratingHtml = mostrar
            ? '<div class="rating-row">' +
                '<span class="rating-star">★</span>' +
                '<span class="rating-num">' + Number(loc.avg_rating || 0).toFixed(1) + '</span>' +
              '</div>'
            : '';

          // Estructura: [foto + rating debajo] | [nombre + sucursal + desc]
          return '<div class="custom-popup">' +
            '<div class="custom-row">' +
              '<div class="custom-left">' +
                (img
                  ? '<img class="custom-thumb" src="' + img + '" onerror="this.style.display=\\'none\\'"/>'
                  : '') +
                ratingHtml +
              '</div>' +
              '<div class="custom-info">' +
                (restaurantName ? '<div class="custom-name">'   + restaurantName + '</div>' : '') +
                (branchName     ? '<div class="custom-branch">' + branchName     + '</div>' : '') +
                (desc           ? '<div class="custom-desc">'   + desc           + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<div class="btn-row">' +
              '<button class="btn btn-ghost"   onclick="_openBranch('   + idx + ');">Ver perfil</button>' +
              '<button class="btn btn-primary" onclick="_navigateTo(' + idx + ');">Ir</button>' +
            '</div>' +
          '</div>';
        }

        locations.forEach(function(loc, idx){
          try {
            var lat = Number(loc.latitud || loc.latitude || loc.lat || 0);
            var lng = Number(loc.longitud || loc.longitude || loc.lng || 0);
            if (!isFinite(lat) || !isFinite(lng)) return;
            if (lat === 0 && lng === 0) return;

            var el = document.createElement('div');
            el.className = 'branch-pin';
            el.style.backgroundImage = "url('" + ('${fallbackImg}' && '${fallbackImg}'.length > 10
              ? '${fallbackImg}'
              : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png') + "')";

            var popup = new maplibregl.Popup({ offset: 20, closeButton: false })
              .setHTML(makePopupHtml(idx, loc));

            new maplibregl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([lng, lat])
              .setPopup(popup)
              .addTo(map);
          } catch(e){
            console.error('marker error', e);
          }
        });

      } catch(err) {
        console.error('map error', err);
      }
    })();
  </script>
</body>
</html>`;
}

export default function GPSScreen() {
  useBackHandler();
  const navigation = useNavigation();
  const route      = useRoute();
  const webviewRef = useRef(null);

  const insets  = useSafeAreaInsets();
  const topSafe = Math.round(Math.max(
    insets?.top ?? 0,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets?.top ?? 0)
  ));

  const [mapHtml, setMapHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const getAuthToken = async () => {
    await ensureToken();
    if (typeof TOKEN === 'string' && TOKEN && TOKEN.trim().length > 0) return TOKEN.trim();
    if (route?.params?.token) return route.params.token;
    try {
      const t = await AsyncStorage.getItem('API_TOKEN');
      if (t && t.trim().length > 0) return t.trim();
    } catch (e) {}
    return null;
  };

  const pushLocation = (locationsArr, obj, fallbackName, fallbackEnvironment) => {
    if (!obj) return;

    const lat = Number(obj.latitude ?? obj.latitud ?? obj.lat ?? 0);
    const lng = Number(obj.longitude ?? obj.longitud ?? obj.lng ?? 0);
    if (!isFinite(lat) || !isFinite(lng)) return;

    const INCLUDE_ZERO = typeof INCLUDE_ZERO_COORDINATES !== 'undefined' ? !!INCLUDE_ZERO_COORDINATES : false;
    if (!INCLUDE_ZERO && lat === 0 && lng === 0) return;

    const imagen_logo     = makeAbsoluteUrl(obj.imagen_logo_url ?? obj.image ?? obj.logo ?? null);
    const imagen_banner   = makeAbsoluteUrl(obj.imagen_banner_url ?? obj.banner ?? null);
    const itemEnvironment = normalizeEnvironment(obj.environment ?? obj.raw?.environment ?? fallbackEnvironment ?? '');
    const mostrar_rating  = obj.mostrar_rating ?? obj.raw?.mostrar_rating ?? false;

    locationsArr.push({
      id:                obj.id ?? obj.restaurante_id ?? null,
      name:              obj.name ?? obj.nombre ?? fallbackName ?? '',
      restaurantName:    fallbackName || null,
      short_description: obj.short_description ?? obj.direccion ?? obj.descripcion ?? obj.description ?? '',
      latitude:          lat,
      longitude:         lng,
      avg_rating:        null, // se rellena después si mostrar_rating === true
      mostrar_rating:    mostrar_rating,
      image:             imagen_logo ?? null,
      logo:              imagen_logo ?? null,
      banner:            imagen_banner ?? null,
      environment:       itemEnvironment || null,
      raw:               obj,
      latitud:           obj.latitud ?? obj.latitude ?? obj.lat ?? null,
      longitud:          obj.longitud ?? obj.longitude ?? obj.lng ?? null,
      nombre:            obj.nombre ?? obj.name ?? null,
      direccion:         obj.direccion ?? obj.address ?? null,
      imagen_logo_url:   imagen_logo ?? null,
      imagen_banner_url: imagen_banner ?? null,
      telefono_sucursal: obj.telefono_sucursal ?? null,
      tipo_comida:       obj.tipo_comida ?? null,
      horarios:          obj.horarios ?? null,
      url_whatsapp:      obj.url_whatsapp ?? null,
      url_opentable:     obj.url_opentable ?? null,
      url_instagram:     obj.url_instagram ?? null,
      url_facebook:      obj.url_facebook ?? null,
      url_tik_tok:       obj.url_tiktok ?? null,
      rango_precios:     obj.rango_precios ?? null,
      codigo:            obj.codigo ?? null,
      descripcion:       obj.descripcion ?? null,
    });
  };

  const fetchSucursalesForRestaurant = async (baseUrl, token, restaurantId, headers) => {
    if (!restaurantId) return [];
    try {
      const base = (baseUrl || '').replace(/\/$/, '');
      const url  = base + '/' + encodeURIComponent(restaurantId) + '/sucursales';
      const r    = await fetch(url, { method: 'GET', headers });
      if (!r.ok) return [];
      const j = await r.json();
      if (Array.isArray(j)) return j;
      if (j && Array.isArray(j.sucursales)) return j.sucursales;
      for (const k in j) { if (Array.isArray(j[k])) return j[k]; }
      return [];
    } catch (e) {
      warn('fetchSucursalesForRestaurant error', e);
      return [];
    }
  };

  // Enriquece con el rating de encuesta solo las sucursales con mostrar_rating=true,
  // igual que hace el feed. Procesa de 6 en 6 para no saturar el servidor.
  const enrichWithSurveyRatings = async (locations) => {
    const needRating = locations.filter(loc => isMostrarRatingOn(loc));
    if (!needRating.length) return;
    warn('[GPS] sucursales con mostrar_rating activado:', needRating.length);
    const CONCURRENCY = 6;
    for (let i = 0; i < needRating.length; i += CONCURRENCY) {
      const batch = needRating.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (loc) => {
          try {
            loc.avg_rating    = await fetchSurveyAvgForSucursal(loc.id);
            loc.mostrar_rating = true;
            warn('[GPS] rating cargado para', loc.name, '→', loc.avg_rating);
          } catch (e) {
            warn('[GPS] error obteniendo rating para', loc.id, e);
          }
        })
      );
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);

      const ok = await hasLocationPermission();
      if (!mountedRef.current) return;

      if (!ok) {
        Alert.alert('Permiso requerido', 'Sin permiso no podemos mostrar el mapa.');
        setLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          if (!mountedRef.current) return;

          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const token   = await getAuthToken();
          if (!mountedRef.current) return;

          const rawEnvironment        = await AsyncStorage.getItem(USER_ENVIRONMENT_KEY);
          const normalizedEnvironment = normalizeEnvironment(rawEnvironment);

          warn('GPSScreen environment loaded from AsyncStorage:', { rawEnvironment, normalizedEnvironment });

          if (!token) {
            warn('No token found - showing only user location');
            const solo = generateMapHtml(userLat, userLng, [], MARKER_BASE64 || null, 0);
            if (!mountedRef.current) return;
            setMapHtml(solo);
            setLoading(false);
            return;
          }

          try {
            if (!API_URL || !API_URL.trim()) {
              const solo = generateMapHtml(userLat, userLng, [], MARKER_BASE64 || null, 0);
              if (!mountedRef.current) return;
              setMapHtml(solo);
              setLoading(false);
              return;
            }

            warn('Fetching API_URL (restaurantes list):', API_URL);

            const headers = {
              Accept:         'application/json',
              'Content-Type': 'application/json',
              Authorization:  `Bearer ${token}`,
            };

            const res = await fetch(API_URL, { method: 'GET', headers });
            if (!mountedRef.current) return;

            if (res.status === 401 || res.status === 403) {
              Alert.alert('Autenticación', 'Token inválido o expirado (HTTP ' + res.status + ').');
              const solo = generateMapHtml(userLat, userLng, [], MARKER_BASE64 || null, 0);
              if (!mountedRef.current) return;
              setMapHtml(solo);
              setLoading(false);
              return;
            }

            let json = null;
            try { json = await res.json(); } catch (e) { warn('no json body'); }

            warn('server response preview:', (json && JSON.stringify(json).slice(0, 400)) || 'empty');

            let restaurants = [];
            if (Array.isArray(json))                                               restaurants = json;
            else if (json && Array.isArray(json.restaurantes))                     restaurants = json.restaurantes;
            else if (json && Array.isArray(json.restaurants))                      restaurants = json.restaurants;
            else if (json && json.data && Array.isArray(json.data))                restaurants = json.data;
            else if (json && typeof json === 'object' && (json.id || json.nombre)) restaurants = [json];
            else { for (const k in json || {}) { if (Array.isArray(json[k])) { restaurants = json[k]; break; } } }

            warn('restaurants received:', restaurants.length);

            const restaurantsFilteredByEnvironment = restaurants.filter((item) => {
              if (!normalizedEnvironment) return true;
              const itemEnv = normalizeEnvironment(item?.environment ?? item?.raw?.environment ?? item?.environment_type ?? '');
              const okEnv   = itemEnv === normalizedEnvironment;
              if (!okEnv) warn('restaurant discarded by environment:', { id: item?.id, nombre: item?.nombre ?? item?.name, itemEnv, expected: normalizedEnvironment });
              return okEnv;
            });

            warn('restaurants after environment filter:', restaurantsFilteredByEnvironment.length);

            const locations = [];

            for (const item of restaurantsFilteredByEnvironment) {
              const itemEnvironment = normalizeEnvironment(item?.environment ?? item?.raw?.environment ?? item?.environment_type ?? '');

              if (item && Array.isArray(item.sucursales) && item.sucursales.length > 0) {
                item.sucursales.forEach(s => pushLocation(locations, s, item.nombre || item.name, itemEnvironment));
              } else if (item && Array.isArray(item.branches) && item.branches.length > 0) {
                item.branches.forEach(s => pushLocation(locations, s, item.nombre || item.name, itemEnvironment));
              } else {
                const maybeLat = item ? (item.latitude ?? item.latitud ?? item.lat ?? null) : null;
                const maybeLng = item ? (item.longitude ?? item.longitud ?? item.lng ?? null) : null;
                if (maybeLat != null || maybeLng != null) {
                  pushLocation(locations, item, item.nombre || item.name, itemEnvironment);
                }
              }
            }

            const restaurantsNeedingFetch = restaurantsFilteredByEnvironment.filter(r => {
              const hasSuc      = r && Array.isArray(r.sucursales) && r.sucursales.length > 0;
              const hasBranches = r && Array.isArray(r.branches)   && r.branches.length   > 0;
              return !(hasSuc || hasBranches);
            });

            if (restaurantsNeedingFetch.length > 0) {
              try {
                const fetchPromises = restaurantsNeedingFetch.map(r => {
                  const id        = r.id ?? r.restaurante_id ?? r._id ?? r.id_restaurante;
                  const parentEnv = normalizeEnvironment(r?.environment ?? r?.raw?.environment ?? r?.environment_type ?? '');
                  return fetchSucursalesForRestaurant(API_URL, token, id, headers)
                    .then(arr => ({ restaurant: r, branches: arr, parentEnv }))
                    .catch(()  => ({ restaurant: r, branches: [],  parentEnv }));
                });

                const results = await Promise.all(fetchPromises);
                results.forEach(resItem => {
                  const parentName = (resItem.restaurant && (resItem.restaurant.nombre || resItem.restaurant.name)) || '';
                  const parentEnv  = resItem.parentEnv || normalizeEnvironment(resItem.restaurant?.environment ?? '');
                  if (Array.isArray(resItem.branches)) {
                    resItem.branches.forEach(b => pushLocation(locations, b, parentName, parentEnv));
                  }
                });
              } catch (e) {
                warn('Error fetching branches in parallel', e);
              }
            }

            const filteredLocations = locations.filter((loc) => {
              if (!normalizedEnvironment) return true;
              const locEnv = normalizeEnvironment(loc?.environment ?? loc?.raw?.environment ?? '');
              const okEnv  = locEnv === normalizedEnvironment;
              if (!okEnv) warn('location discarded by environment:', { id: loc?.id, name: loc?.name, locEnv, expected: normalizedEnvironment });
              return okEnv;
            });

            warn('locations processed before env filter:', locations.length);
            warn('locations after env filter:', filteredLocations.length);

            // Enriquecer ratings de encuesta igual que el feed
            await enrichWithSurveyRatings(filteredLocations);
            if (!mountedRef.current) return;

            const markerToUse = (typeof MARKER_BASE64 === 'string' && MARKER_BASE64.length > 50) ? MARKER_BASE64 : null;
            const html = generateMapHtml(userLat, userLng, filteredLocations, markerToUse, filteredLocations.length);
            if (!mountedRef.current) return;
            setMapHtml(html);

          } catch (err) {
            console.error('Error cargando restaurantes:', err);
            if (!mountedRef.current) return;
            Alert.alert('Error', 'No se pudo cargar los restaurantes.');
            const solo = generateMapHtml(userLat, userLng, [], MARKER_BASE64 || null, 0);
            setMapHtml(solo);
          } finally {
            if (!mountedRef.current) return;
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error al obtener ubicación:', err);
          if (!mountedRef.current) return;
          Alert.alert('Ubicación', 'No se pudo obtener la ubicación actual.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    })();
  }, []);

  const onMessage = async (event) => {
    try {
      console.log('WEBVIEW onMessage raw:', event.nativeEvent.data);
      const payload = JSON.parse(event.nativeEvent.data);
      if (!payload || !payload.action) return;

      if (payload.action === 'viewProfile') {
        const branchObj = payload.branch ?? null;

        let rid = branchObj
          ? (branchObj.id ?? branchObj.restaurante_id ?? branchObj._id ?? null)
          : null;
        if (rid == null && payload.id != null) rid = payload.id;

        const restaurantName = branchObj?.restaurantName ?? branchObj?.raw?.nombre ?? '';
        const branchName     = branchObj?.nombre ?? branchObj?.name ?? '';

        let isFavorite = false;
        if (rid != null) {
          try {
            const uid        = await AsyncStorage.getItem('user_usuario_app_id')
                            ?? await AsyncStorage.getItem('user_email')
                            ?? 'guest';
            const perUserKey = `favorites_objs_${uid}`;
            const rawPerUser = await AsyncStorage.getItem(perUserKey);
            let favObjs      = rawPerUser ? JSON.parse(rawPerUser) : null;
            if (!Array.isArray(favObjs) || favObjs.length === 0) {
              const rawGlobal = await AsyncStorage.getItem('favorites_objs');
              favObjs = rawGlobal ? JSON.parse(rawGlobal) : [];
            }
            if (Array.isArray(favObjs)) {
              isFavorite = favObjs.some(f => String(f.id) === String(rid));
            }
          } catch (e) {
            console.warn('GPSScreen - error leyendo favoritos:', e);
          }
        }

        navigation.navigate('Restaurant', {
          id: rid,
          branch: branchObj,
          restaurantName,
          branchName,
          logo:       branchObj?.logo ?? branchObj?.imagen_logo_url ?? null,
          banner:     branchObj?.banner ?? branchObj?.imagen_banner_url ?? null,
          raw:        branchObj?.raw ?? null,
          isFavorite,
        });

      } else if (payload.action === 'navigate') {
        const { lat, lng } = payload;
        if (lat && lng) {
          const url = Platform.OS === 'android'
            ? `geo:${lat},${lng}?q=${lat},${lng}`
            : `maps://?q=${lat},${lng}`;
          Linking.openURL(url).catch(() => Alert.alert('Abrir mapas', 'No se pudo abrir la app de mapas'));
        } else {
          Alert.alert('Navegar', 'Coordenadas no disponibles para esta sucursal.');
        }
      }
    } catch (e) {
      console.error('onMessage parse error', e);
    }
  };

  if (loading || !mapHtml) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, color: '#666' }}>Cargando mapa…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: topSafe }}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map:     { flex: 1, width: Dimensions.get('window').width },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});