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

  // responsive helpers
  const { width, height } = useWindowDimensions();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375)); // base 375
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // responsive measurements
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 8);
  const contentMaxWidth = Math.min(width - 32, 720); // allow wider cards on tablets
  const AVATAR_SIZE = clamp(rf(60), 44, 140);
  const SLIDER_HEIGHT = clamp(Math.round(height * 0.32), 160, Math.round(height * 0.6));
  const HEADER_LEFT = Math.max(8, Math.round(width * 0.03));
  const HEADER_RIGHT = Math.max(8, Math.round(width * 0.03));
  const DOT_BOTTOM = Math.max(8, Math.round(SLIDER_HEIGHT * 0.04));
  const DOT_RIGHT = Math.max(12, Math.round(width * 0.04));
  const ICON_SIZE = clamp(rf(20), 16, 34);
  const DOT_SIZE = Math.max(6, Math.round(8 * (width / 375)));
  const DOT_MARGIN = Math.max(3, Math.round(4 * (width / 375)));
  const TITLE_FONT = clamp(rf(20), 16, 30);
  const PARAGRAPH_FONT = clamp(rf(13), 12, 18);
  const BUTTON_HEIGHT = clamp(rf(44), 40, 56);
  const BUTTON_RADIUS = Math.round(BUTTON_HEIGHT / 2);
  const SOCIAL_ICON_SIZE = clamp(rf(22), 18, 36);
  const CARD_PADDING_H = Math.max(14, Math.round(width * 0.06));
  const CARD_PADDING_TOP = Math.round(AVATAR_SIZE / 2 + 16);
  const CARD_WIDTH = Math.min(contentMaxWidth, Math.round(width - 24));

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

  const cleanUrl = (raw) => {
    if (!raw && raw !== 0) return null;
    try {
      let s = String(raw).trim();
      if (!s) return null;
      s = s.replace(/^[`'"]+|[`'"]+$/g, '');
      s = s.replace(/[,\s]+$/g, '');
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

  const handleReserve = async () => {
    try {
      const url = getReservationUrl();
      if (url) {
        try {
          await Linking.openURL(url);
        } catch (err) {
          try {
            const httpsUrl = url.startsWith('http') ? url : `https://${url}`;
            await Linking.openURL(httpsUrl);
          } catch (err2) {
            console.warn('open reservation url error', err, err2);
            showToast('No se pudo abrir la URL de reserva');
          }
        }
      } else {
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

  const avatarUri = (() => {
    const prefs = [
      data.imagen_logo_url,
      data.imagen_logo,
      data.logo,
      data.image_url,
      data.image,
      data.imagen,
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

  const images = (() => {
    try {
      const arr = [];
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
      bannerCandidates.forEach(c => {
        if (!c) return;
        if (Array.isArray(c)) {
          c.forEach(x => { const n = cleanUrl(x); if (n) arr.unshift(n); });
        } else {
          const n = cleanUrl(c);
          if (n) arr.unshift(n);
        }
      });

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
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: Math.max(3, Math.round(DOT_SIZE / 2)),
                  marginHorizontal: DOT_MARGIN,
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
            <TouchableOpacity onPress={onShare} style={{ marginLeft: Math.round(width * 0.02) }}>
              <Ionicons name="share-social-outline" size={ICON_SIZE} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={{ marginLeft: Math.round(width * 0.02) }}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={ICON_SIZE} color={isFavorite ? "red" : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.avatarContainer, {
        top: SLIDER_HEIGHT - AVATAR_SIZE / 2,
        left: Math.max(12, Math.round(width * 0.06)),
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
      }]}>
        { avatarUri
          ? <Image source={{ uri: avatarUri }} style={[styles.avatar, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 }]} />
          : <Image source={placeholderAvatar} style={[styles.avatar, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 }]} />
        }
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: Math.max(32, insets.bottom + 8) }}>
        <View style={[styles.card, { width: CARD_WIDTH, paddingTop: CARD_PADDING_TOP, paddingHorizontal: CARD_PADDING_H }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { fontSize: TITLE_FONT }]} numberOfLines={2}>{data.nombre || data.name || "—"}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={[styles.sectionTitle, { fontSize: Math.max(12, Math.round(TITLE_FONT * 0.45)) }]}>Descripción breve</Text>
          <Text style={[styles.paragraph, { fontSize: PARAGRAPH_FONT }]}>{data.descripcion ?? data.short_description ?? "—"}</Text>

          { Array.isArray(data.horarios) && data.horarios.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { fontSize: Math.max(12, Math.round(TITLE_FONT * 0.45)) }]}>Horarios</Text>
              {data.horarios.map((h, i) => {
                const dia = (h.dia_semana ?? h.dia) || "";
                const apertura = (h.horario_apertura ?? h.open) || "";
                const cierre = (h.horario_cierre ?? h.close) || "";
                return <Text key={i} style={[styles.paragraph, { fontSize: PARAGRAPH_FONT }]}>{`${dia}: ${apertura} - ${cierre}`}</Text>;
              })}
            </>
          ) : null }

          <View style={styles.divider} />
          <Text style={[styles.sectionTitle, { fontSize: Math.max(12, Math.round(TITLE_FONT * 0.45)) }]}>Dirección</Text>
          <Text style={[styles.paragraph, { fontSize: PARAGRAPH_FONT }]}>{data.direccion || data.address || "—"}</Text>

          { data.telefono_sucursal ? (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { fontSize: Math.max(12, Math.round(TITLE_FONT * 0.45)) }]}>Teléfono</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.telefono_sucursal}`).catch(()=>_showToast('No se pudo marcar'))}>
                <Text style={[styles.paragraph, { color: BLUE, fontSize: PARAGRAPH_FONT }]}>{data.telefono_sucursal}</Text>
              </TouchableOpacity>
            </>
          ) : null }

          <View style={styles.divider} />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.btnReserve, { height: BUTTON_HEIGHT, borderRadius: BUTTON_RADIUS, marginRight: 8 }]} onPress={handleReserve}>
              <Text style={[styles.buttonText, { fontSize: Math.max(14, Math.round(PARAGRAPH_FONT * 0.95)) }]}>Reservar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.btnRoute, { height: BUTTON_HEIGHT, borderRadius: BUTTON_RADIUS, marginLeft: 8 }]} onPress={openMap}>
              <Text style={[styles.buttonText, { fontSize: Math.max(14, Math.round(PARAGRAPH_FONT * 0.95)) }]}>Ir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          <View style={styles.socialIconsRow}>
            <TouchableOpacity
              style={[
                styles.socialIconWrap,
                !hasWhatsapp && styles.socialIconDisabled,
                { width: SOCIAL_ICON_SIZE * 1.8, height: SOCIAL_ICON_SIZE * 1.8, borderRadius: Math.round((SOCIAL_ICON_SIZE * 1.8) / 2) }
              ]}
              onPress={() => hasWhatsapp ? openSocial('whatsapp') : _showToast('No disponible en esta sucursal')}
              activeOpacity={hasWhatsapp ? 0.8 : 1}
            >
              <Ionicons name="logo-whatsapp" size={SOCIAL_ICON_SIZE} color={hasWhatsapp ? "#25D366" : "#bfc7cc"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialIconWrap,
                !hasFacebook && styles.socialIconDisabled,
                { width: SOCIAL_ICON_SIZE * 1.8, height: SOCIAL_ICON_SIZE * 1.8, borderRadius: Math.round((SOCIAL_ICON_SIZE * 1.8) / 2) }
              ]}
              onPress={() => hasFacebook ? openSocial('facebook') : _showToast('No disponible en esta sucursal')}
              activeOpacity={hasFacebook ? 0.8 : 1}
            >
              <Ionicons name="logo-facebook" size={SOCIAL_ICON_SIZE} color={hasFacebook ? "#1877F2" : "#bfc7cc"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialIconWrap,
                !hasTiktok && styles.socialIconDisabled,
                { width: SOCIAL_ICON_SIZE * 1.8, height: SOCIAL_ICON_SIZE * 1.8, borderRadius: Math.round((SOCIAL_ICON_SIZE * 1.8) / 2) }
              ]}
              onPress={() => hasTiktok ? openSocial('tiktok') : _showToast('No disponible en esta sucursal')}
              activeOpacity={hasTiktok ? 0.8 : 1}
            >
              <Image source={tiktokIcon} style={{ width: SOCIAL_ICON_SIZE, height: SOCIAL_ICON_SIZE, opacity: hasTiktok ? 1 : 0.35 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialIconWrap,
                !hasInstagram && styles.socialIconDisabled,
                { width: SOCIAL_ICON_SIZE * 1.8, height: SOCIAL_ICON_SIZE * 1.8, borderRadius: Math.round((SOCIAL_ICON_SIZE * 1.8) / 2) }
              ]}
              onPress={() => hasInstagram ? openSocial('instagram') : _showToast('No disponible en esta sucursal')}
              activeOpacity={hasInstagram ? 0.8 : 1}
            >
              <Ionicons name="logo-instagram" size={SOCIAL_ICON_SIZE} color={hasInstagram ? "#C13584" : "#bfc7cc"} />
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

/* estilos base (no cambian la lógica) */
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
  },
  headerLogo: { resizeMode: "contain" },
  headerIcons: { flexDirection: "row", alignItems: "center" },

  avatarContainer: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#fff",
    elevation: 6,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    overflow: 'hidden'
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
    alignSelf: 'center',
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: BLUE, fontWeight: '700', flexShrink: 1 },
  rating: { flexDirection: "row", alignItems: "center" },
  ratingStar: { color: "#FFD700", marginRight: 4, fontSize: 18, },
  ratingText: { fontSize: 16, fontWeight: "600", color: "#333" },

  divider: {
    height: 1,
    backgroundColor: BLUE,
    opacity: 0.18,
    marginVertical: 12,
  },

  sectionTitle: {
    fontSize: 14,
    color: BLUE,
    marginBottom: 4,
    fontWeight: '700'
  },
  paragraph: { color: "#555", lineHeight: 20, marginBottom: 8 },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  btnReserve: { backgroundColor: BLUE },
  btnRoute: { backgroundColor: BLUE },
  buttonText: { color: "#fff", fontSize: 16 },

  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  socialIconWrap: {
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
