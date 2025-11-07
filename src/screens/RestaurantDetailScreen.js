import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
  Share,
  PixelRatio,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabtrackLogo = require("../../assets/images/logo2.png");
const placeholderBanner = require("../../assets/images/restaurante.jpeg");
const placeholderAvatar = require("../../assets/images/restaurante.jpeg");
const tiktokIcon = require("../../assets/images/tik_tok.jpg");

 const GLOBAL_FAVORITES_KEY = 'favorites';
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
const userFavoritesKey = async () => `favorites_${await getUserIdentifier()}`;
const userFavoritesObjsKey = async () => `favorites_objs_${await getUserIdentifier()}`;

export default function RestaurantDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

   const { width, height } = useWindowDimensions();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 8);
  const contentMaxWidth = Math.min(width - 32, 520);
   const AVATAR_SIZE = clamp(rf(60), 44, 110);
  const SLIDER_HEIGHT = clamp(Math.round(height * 0.32), 180, 420);
  const HEADER_LEFT = Math.max(12, Math.round(width * 0.04));
  const HEADER_RIGHT = Math.max(12, Math.round(width * 0.04));
  const DOT_BOTTOM = Math.max(8, Math.round(SLIDER_HEIGHT * 0.04));
  const DOT_RIGHT = Math.max(12, Math.round(width * 0.04));
  const ICON_SIZE = Math.round(Math.max(18, rf(20)));

  const branchParam =
    route.params?.branch ??
    route.params?.restaurant ??
    route.params?.sucursal ??
    null;

  const idParam = (() => {
    if (route.params?.id) return String(route.params.id);
    if (!branchParam) return null;
    return String(
      branchParam.id ?? branchParam.sucursal_id ?? branchParam.restaurante_id ?? branchParam._id ?? null
    );
  })();

  const [data, setData] = useState(branchParam ?? null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const scrollRef = useRef(null);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('simple'); // 'simple' | 'action'
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (data) return;
      // si no vino el objeto, podrías cargarlo por id aquí (opcional)
    })();
    return () => { mounted = false; if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [data]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    (async () => {
      try {
        const key = await userFavoritesKey();
        const raw = await AsyncStorage.getItem(key);
        let favs = raw ? JSON.parse(raw) : [];

        // fallback global
        if ((!Array.isArray(favs) || favs.length === 0)) {
          const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
          const globalFavs = globalRaw ? JSON.parse(globalRaw) : [];
          if (Array.isArray(globalFavs) && globalFavs.length > 0) favs = globalFavs;
        }

        if (!mounted) return;
        if (route.params?.isFavorite !== undefined) {
          setIsFavorite(Boolean(route.params.isFavorite));
          return;
        }
        setIsFavorite(Array.isArray(favs) && favs.includes(String(idParam)));
      } catch (e) {
        if (mounted) setIsFavorite(false);
      }
    })();
    return () => { mounted = false; };
  }, [idParam, route.params]));

  // Toast helpers
  const _showToast = (message, type = 'simple') => {
    setToastMessage(message || '');
    setToastType(type);
    setToastVisible(true);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => _hideToast(), 3500);
  };
  const _hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setToastVisible(false);
      setToastMessage('');
      setToastType('simple');
    });
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
  };

  const showToast = (message) => _showToast(message, 'simple');
  const showToastWithAction = (message) => _showToast(message, 'action');

  // Toggle favorito
  const toggleFavorite = async () => {
    try {
      const sid = String(idParam ?? data?.id ?? data?.restaurante_id ?? '');
      if (!sid) { showToast('No se pudo actualizar favoritos'); return; }

      const favKey = await userFavoritesKey();
      const favObjsKey = await userFavoritesObjsKey();

      // lee ids por usuario (fallback global)
      const rawIds = await AsyncStorage.getItem(favKey);
      let ids = rawIds ? JSON.parse(rawIds) : null;
      if (!Array.isArray(ids)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
        ids = globalRaw ? JSON.parse(globalRaw) : [];
      }

      // lee objs por usuario (fallback global)
      const rawObjs = await AsyncStorage.getItem(favObjsKey);
      let objs = rawObjs ? JSON.parse(rawObjs) : null;
      if (!Array.isArray(objs)) {
        const globalObjsRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        objs = globalObjsRaw ? JSON.parse(globalObjsRaw) : [];
      }

      let newIds = Array.isArray(ids) ? [...ids] : [];
      let newObjs = Array.isArray(objs) ? [...objs] : [];

      if (newIds.includes(sid)) {
        // remover
        newIds = newIds.filter(x => String(x) !== sid);
        newObjs = newObjs.filter(o => String(o.id) !== sid);
        await AsyncStorage.setItem(favKey, JSON.stringify(newIds));
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(newObjs));
        setIsFavorite(false);
        showToastWithAction('Eliminado de favoritos');
      } else {
        // agregar
        const preview = {
          id: String(sid),
          name: data?.nombre ?? data?.name ?? `Sucursal ${sid}`,
          image_url: data?.imagen_logo_url ?? data?.imagen_banner_url ?? data?.image_url ?? null,
          avg_rating: data?.avg_rating ?? null,
          address: data?.direccion ?? data?.address ?? '',
          type: 'branch',
          raw: data ?? {},
        };
        newObjs = [...newObjs.filter(o => String(o.id) !== sid), preview];
        newIds = [...newIds.filter(x => String(x) !== sid), sid];

        await AsyncStorage.setItem(favKey, JSON.stringify(newIds));
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(newObjs));
        setIsFavorite(true);
        showToastWithAction('Agregado a favoritos');
      }
    } catch (e) {
      console.warn("toggleFavorite error", e);
      _showToast('Error al actualizar favoritos', 'simple');
    }
  };

  const onShare = async () => {
    if (!data) return;
    const title = data.nombre || data.name || "Sucursal";
    const address = data.direccion || data.address || "";
    const phone = data.telefono_sucursal ? `Tel: ${data.telefono_sucursal}` : "";
    const message = `${title}\n${address}\n${phone}`;
    try {
      await Share.share({ message, title });
    } catch (err) {
      console.warn("Share error", err);
      _showToast('No se pudo abrir opciones de compartir');
    }
  };

  const openMap = () => {
    const lat = parseFloat(data?.latitud ?? data?.latitude ?? data?.lat ?? null);
    const lng = parseFloat(data?.longitud ?? data?.longitude ?? data?.lng ?? null);
    if (!lat || !lng) return _showToast('Ubicación no disponible');
    const url = Platform.OS === "android" ? `geo:${lat},${lng}?q=${lat},${lng}` : `maps://?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => _showToast('No se pudo abrir la app de mapas'));
  };

  const openSocial = async (platform) => {
    if (!data) return _showToast('No disponible en esta sucursal');

    let url = null;

    if (platform === 'whatsapp') {
      url = data.url_whatsapp || data.whatsapp || data.whatsapp_url || null;
      if (!url) {
        const phone = data.telefono_sucursal || data.telefono || data.phone || null;
        if (phone) {
          const digits = String(phone).replace(/[^\d+]/g, '');
          if (digits) url = `https://wa.me/${digits.replace(/^\+/, '')}`;
        }
      }
    }

    if (platform === 'facebook') {
      url = data.url_facebook || data.facebook_url || data.facebook || data.fb || null;
    }

    if (platform === 'instagram') {
      url = data.url_instagram || data.instagram_url || data.instagram || null;
    }

    if (platform === 'tiktok') {
      url = data.url_tik_tok || data.url_tiktok || data.tiktok || null;
    }

    if (!url) return _showToast('No disponible en esta sucursal');

    if (!/^https?:\/\//i.test(url)) url = `https://${String(url)}`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      try {
        const httpsUrl = url.startsWith('http') ? url : `https://${url}`;
        await Linking.openURL(httpsUrl);
      } catch (err2) {
        console.warn('openSocial error', err, err2);
        _showToast('No se pudo abrir la red social');
      }
    }
  };

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setSlideIndex(idx);
  };

  // ---------- NUEVO: helper que limpia/normaliza URLs (permite "https: ," "https: //", etc.)
  const cleanUrl = (raw) => {
    if (!raw && raw !== 0) return null;
    try {
      let s = String(raw).trim();
      if (!s) return null;
      // eliminar comillas y comas sobrantes al final/principio
      s = s.replace(/^[`'"]+|[`'"]+$/g, '');
      s = s.replace(/[,\s]+$/g, '');
      // eliminar espacios internos (casos "https: //dominio")
      s = s.replace(/\s+/g, '');
      if (!s) return null;
      if (/^\/\//.test(s)) return 'https:' + s;
      if (/^https?:\/\//i.test(s)) return s;
      if (/^\//.test(s)) return 'https://' + s.replace(/^\/+/, '');
      if (s.indexOf('.') !== -1) return (s.startsWith('http') ? s : 'https://' + s);
      return null;
    } catch (e) {
      return null;
    }
  };

  // ---------- NUEVO: buscar URL de reserva (url_opentable u otras variantes)
  const getReservationUrl = () => {
    if (!data) return null;
    const candidates = [
      data.url_opentable,
      data.opentable_url,
      data.url_reservation,
      data.url_reservas,
      data.url_reserve,
      data.url_booking,
      data.booking_url,
      data.url_book,
      data.reservation_url,
      data.reserve_url,
      data?.raw?.url_opentable,
      data?.raw?.opentable_url,
      data?.raw?.booking_url,
      data?.raw?.url_reservas,
      data?.raw?.reservation_url,
    ];
    for (let c of candidates) {
      const u = cleanUrl(c);
      if (u) return u;
    }
    return null;
  };

  // ---------- NUEVO: handler para el botón Reservar
  const handleReserve = async () => {
    try {
      const url = getReservationUrl();
      if (url) {
        try {
          await Linking.openURL(url);
        } catch (err) {
          // fallback: intentar forzar https si no lo tiene
          try {
            const httpsUrl = url.startsWith('http') ? url : `https://${url}`;
            await Linking.openURL(httpsUrl);
          } catch (err2) {
            console.warn('open reservation url error', err, err2);
            showToast('No se pudo abrir la URL de reserva');
          }
        }
      } else {
        // <-- MODIFICACIÓN: Si no hay URL de reserva, abrir WhatsApp (si existe)
        // Intentamos abrir WhatsApp vía openSocial que ya implementa wa.me y url_whatsapp
        try {
          await openSocial('whatsapp');
        } catch (e) {
          console.warn('Error abriendo WhatsApp fallback', e);
          showToast('No se pudo abrir WhatsApp ni la reserva interna');
        }
      }
    } catch (e) {
      console.warn('handleReserve error', e);
      showToast('No se pudo procesar la reserva');
    }
  };

  if (!data) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  // --- avatarUri: preferir campos de logo/imagen pequeña --- (ahora también mira data.raw.*)
  const avatarUri = (() => {
    const prefs = [
      data.imagen_logo_url,
      data.imagen_logo,
      data.logo,
      data.image_url,
      data.image,
      data.imagen,
      // buscar en raw si no está en raíz
      data?.raw?.imagen_logo_url,
      data?.raw?.imagen_logo,
      data?.raw?.logo,
      data?.raw?.image_url,
      data?.raw?.image,
      data?.raw?.imagen,
      route.params?.logo
    ];
    for (let p of prefs) {
      const n = cleanUrl(p);
      if (n) return n;
    }
    return null;
  })();

  // --- images (BANNER) : priorizar campos de banner y luego fallback a otras imágenes, buscando también en data.raw.*
  const images = (() => {
    try {
      const arr = [];

      // 1) imagenes array en data o data.raw
      const imgsFromData = Array.isArray(data.imagenes) && data.imagenes.length > 0 ? data.imagenes : null;
      const imgsFromRaw = Array.isArray(data?.raw?.imagenes) && data.raw.imagenes.length > 0 ? data.raw.imagenes : null;
      const imgsFromDataImages = Array.isArray(data.images) && data.images.length > 0 ? data.images : null;
      const imgsFromRawImages = Array.isArray(data?.raw?.images) && data.raw.images.length > 0 ? data.raw.images : null;

      const pushImageCandidate = (it) => {
        if (!it) return;
        if (typeof it === 'string') {
          const u = cleanUrl(it);
          if (u) arr.push(u);
        } else if (typeof it === 'object') {
          const candidate = it.url ?? it.path ?? it.imagen ?? it.imagen_url ?? it.src ?? it;
          const u = cleanUrl(candidate);
          if (u) arr.push(u);
        }
      };

      if (imgsFromData) imgsFromData.forEach(pushImageCandidate);
      if (imgsFromDataImages) imgsFromDataImages.forEach(pushImageCandidate);
      if (imgsFromRaw) imgsFromRaw.forEach(pushImageCandidate);
      if (imgsFromRawImages) imgsFromRawImages.forEach(pushImageCandidate);

      // 2) Campos explícitos de banner (mayor prioridad) - buscar en raíz y en raw
      const bannerCandidates = [
        data.imagen_banner_url,
        data.imagen_banner,
        data.banner,
        data.banner_url,
        data.bannerImage,
        data?.raw?.imagen_banner_url,
        data?.raw?.imagen_banner,
        data?.raw?.banner,
        data?.raw?.banner_url,
        data?.raw?.bannerImage,
      ];
      // pushear estos candidatos al inicio (si aún no hay arr o incluso si hay, mantener prioridad)
      bannerCandidates.forEach(c => {
        if (!c) return;
        if (Array.isArray(c)) {
          c.forEach(x => { const n = cleanUrl(x); if (n) arr.unshift(n); });
        } else {
          const n = cleanUrl(c);
          if (n) arr.unshift(n);
        }
      });

      // 3) Si no hay nada, mirar campos generales (imagen_banner_url ya intentado)
      if (arr.length === 0) {
        const candList = [
          data.image_url,
          data.image,
          data.imagen,
          data.imagen_logo_url,
          data.logo,
          data?.raw?.image_url,
          data?.raw?.image,
          data?.raw?.imagen,
          data?.raw?.imagen_logo_url,
          data?.raw?.logo
        ];
        for (let c of candList) {
          if (!c) continue;
          if (Array.isArray(c)) {
            c.forEach(x => { const n = cleanUrl(x); if (n) arr.push(n); });
          } else {
            const n = cleanUrl(c);
            if (n) arr.push(n);
          }
        }
      }

       const uniq = Array.from(new Set(arr.filter(Boolean)));
      if (avatarUri) {
        return uniq.filter(u => String(u) !== String(avatarUri));
      }
      return uniq;
    } catch (e) {
      return [];
    }
  })();

  const translateY = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const opacity = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const hasWhatsapp = Boolean(data.url_whatsapp || data.whatsapp || data.telefono_sucursal || data.whatsapp_url);
  const hasFacebook = Boolean(data.url_facebook || data.facebook_url || data.facebook || data.fb);
  const hasInstagram = Boolean(data.url_instagram || data.instagram_url || data.instagram);
  const hasTiktok = Boolean(data.url_tik_tok || data.url_tiktok || data.tiktok);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
      <View style={[styles.sliderContainer, { height: SLIDER_HEIGHT }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          ref={scrollRef}
        >
          { images.length > 0
            ? images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.sliderImage, { width: width, height: SLIDER_HEIGHT }]}
                />
              ))
            : <Image source={placeholderBanner} style={[styles.sliderImage, { width: width, height: SLIDER_HEIGHT }]} />
          }
        </ScrollView>

        <View style={[styles.dots, { bottom: DOT_BOTTOM, right: DOT_RIGHT }]}>
          {(images.length > 0 ? images : [1,2,3]).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === slideIndex && styles.dotActive,
                {
                  width: Math.max(6, Math.round(8 * (width / 375))),
                  height: Math.max(6, Math.round(8 * (width / 375))),
                  borderRadius: Math.max(3, Math.round(4 * (width / 375))),
                  marginHorizontal: Math.max(3, Math.round(4 * (width / 375))),
                }
              ]}
            />
          ))}
        </View>

        <View style={[styles.header, { top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 12, left: HEADER_LEFT, right: HEADER_RIGHT }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,left:10,right:10,bottom:10 }}>
              <Ionicons name="arrow-back" size={ICON_SIZE} color="#fff" />
            </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={onShare} style={{ marginLeft: 10 }}>
              <Ionicons name="share-social-outline" size={ICON_SIZE} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={{ marginLeft: 10 }}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={ICON_SIZE} color={isFavorite ? "red" : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.avatarContainer, {
        top: SLIDER_HEIGHT - AVATAR_SIZE / 2,
        left: Math.max(18, Math.round(width * 0.07)),
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
      }]}>
        { avatarUri
          ? <Image source={{ uri: avatarUri }} style={[styles.avatar, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 }]} />
          : <Image source={placeholderAvatar} style={[styles.avatar, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 }]} />
        }
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 32 }}>
        <View style={[styles.card, { width: contentMaxWidth, paddingTop: AVATAR_SIZE / 2 + 16, paddingHorizontal: Math.max(18, Math.round(width * 0.06)) }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { fontSize: Math.max(18, Math.round(24 * (width / 375))) }]} numberOfLines={2}>{data.nombre || data.name || "—"}</Text>
{/*             <View style={styles.rating}>
              <Text style={[styles.ratingStar, { fontSize: Math.max(14, Math.round(18 * (width / 375))), marginRight: Math.round(4 * (width / 375)) }]}>★</Text>
              <Text style={[styles.ratingText, { fontSize: Math.max(13, Math.round(16 * (width / 375))) }]}>
                {data.avg_rating != null && !Number.isNaN(Number(data.avg_rating)) ? Number(data.avg_rating).toFixed(1) : "4.2"}
              </Text>
            </View> */}
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Descripción breve</Text>
          <Text style={styles.paragraph}>{data.descripcion ?? data.short_description ?? "—"}</Text>

          { Array.isArray(data.horarios) && data.horarios.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Horarios</Text>
              {data.horarios.map((h, i) => {
                const dia = (h.dia_semana ?? h.dia) || "";
                const apertura = (h.horario_apertura ?? h.open) || "";
                const cierre = (h.horario_cierre ?? h.close) || "";
                return <Text key={i} style={styles.paragraph}>{`${dia}: ${apertura} - ${cierre}`}</Text>;
              })}
            </>
          ) : null }

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Dirección</Text>
          <Text style={styles.paragraph}>{data.direccion || data.address || "—"}</Text>

          { data.telefono_sucursal ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Teléfono</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.telefono_sucursal}`).catch(()=>_showToast('No se pudo marcar'))}>
                <Text style={[styles.paragraph, { color: BLUE }]}>{data.telefono_sucursal}</Text>
              </TouchableOpacity>
            </>
          ) : null }

          <View style={styles.divider} />
          <View style={styles.buttonRow}>
            {/* <-- modificado: ahora usa handleReserve */} 
            <TouchableOpacity style={[styles.button, styles.btnReserve]} onPress={handleReserve}>
              <Text style={styles.buttonText}>Reservar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.btnRoute]} onPress={openMap}>
              <Text style={styles.buttonText}>Ir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          <View style={styles.socialIconsRow}>
            <TouchableOpacity style={[styles.socialIconWrap, !hasWhatsapp && styles.socialIconDisabled]} onPress={() => hasWhatsapp ? openSocial('whatsapp') : _showToast('No disponible en esta sucursal')} activeOpacity={hasWhatsapp ? 0.8 : 1}>
              <Ionicons name="logo-whatsapp" size={22} color={hasWhatsapp ? "#25D366" : "#bfc7cc"} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialIconWrap, !hasFacebook && styles.socialIconDisabled]} onPress={() => hasFacebook ? openSocial('facebook') : _showToast('No disponible en esta sucursal')} activeOpacity={hasFacebook ? 0.8 : 1}>
              <Ionicons name="logo-facebook" size={22} color={hasFacebook ? "#1877F2" : "#bfc7cc"} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialIconWrap, !hasTiktok && styles.socialIconDisabled]} onPress={() => hasTiktok ? openSocial('tiktok') : _showToast('No disponible en esta sucursal')} activeOpacity={hasTiktok ? 0.8 : 1}>
              <Image source={tiktokIcon} style={{ width: 22, height: 22, opacity: hasTiktok ? 1 : 0.35 }} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialIconWrap, !hasInstagram && styles.socialIconDisabled]} onPress={() => hasInstagram ? openSocial('instagram') : _showToast('No disponible en esta sucursal')} activeOpacity={hasInstagram ? 0.8 : 1}>
              <Ionicons name="logo-instagram" size={22} color={hasInstagram ? "#C13584" : "#bfc7cc"} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {toastVisible && (
        <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { transform: [{ translateY }], opacity }]}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
            {toastType === 'action' && (
              <TouchableOpacity onPress={() => { _hideToast(); navigation.navigate('Favorites'); }}>
                <Text style={styles.toastLink}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/* estilos (estructura similar, pero layout responsive manejado arriba) */
const BLUE = "#0046ff";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#000" },
  loading: { justifyContent: "center", alignItems: "center" },

  sliderContainer: { backgroundColor: "#000" },
  sliderImage: { resizeMode: "cover" },
  dots: {
    position: "absolute",
    flexDirection: "row",
  },
  dot: {
    backgroundColor: "#fff70a55",
  },
  dotActive: { backgroundColor: "#fff" },

  header: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 30,
    marginTop: -20
  },
  headerLogo: { resizeMode: "contain" },
  headerIcons: { flexDirection: "row", alignItems: "center" },

  avatarContainer: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#fff",
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  avatar: {
    borderRadius: 999,
    backgroundColor: '#fff'
  },

  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -5,
    paddingBottom: 32,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 24, color: BLUE, fontWeight: '700', flexShrink: 1 },
  rating: { flexDirection: "row", alignItems: "center" },
  ratingStar: { color: "#FFD700", marginRight: 4, fontSize: 18, },
  ratingText: { fontSize: 16, fontWeight: "600", color: "#333" },

  divider: {
    height: 1,
    backgroundColor: BLUE,
    opacity: 0.4,
    marginVertical: 12,
  },

  sectionTitle: {
    fontSize: 14,
    color: BLUE,
    marginBottom: 4,
    fontWeight: '700'
  },
  paragraph: { fontSize: 13, color: "#555", lineHeight: 18, marginBottom: 8 },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  btnReserve: { backgroundColor: BLUE, marginRight: 8 },
  btnRoute: { backgroundColor: BLUE, marginLeft: 8 },
  buttonText: { color: "#fff", fontSize: 16 },

  /* social icons centered */
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  socialIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    borderWidth: 0.6,
    borderColor: '#e6eefc',
  },
  socialIconDisabled: {
    backgroundColor: '#f4f6f8',
  },

  /* toast */
  toastWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
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
    justifyContent: 'center',
    opacity: 0.95,
  },
  toastText: { color: '#fff', textAlign: 'center', flex: 1 },
  toastLink: { color: '#4EA1FF', fontWeight: '700', marginLeft: 12 },
});
