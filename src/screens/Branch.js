// Branch.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
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
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: WIN_WIDTH } = Dimensions.get("window");
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

export default function Branch() {
  const navigation = useNavigation();
  const route = useRoute();

  // Responsive: window dims & insets
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const base = 375; // diseño base
  const s = (value) => Math.round((value * width) / base);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const branchParam =
    route.params?.branch ??
    route.params?.restaurant ??
    route.params?.sucursal ??
    null;

  const idParam = (() => {
    if (route.params?.id) return String(route.params.id);
    if (!branchParam) return null;
    return String(
      branchParam.id ?? 
        branchParam.sucursal_id ??
        branchParam.restaurante_id ??
        branchParam._id ??
        null
    );
  })();

  const [data, setData] = useState(branchParam ?? null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const scrollRef = useRef(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('simple');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const key = await userFavoritesKey();
        const raw = await AsyncStorage.getItem(key);
        let favs = raw ? JSON.parse(raw) : [];

        if ((!Array.isArray(favs) || favs.length === 0)) {
          const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
          const globalFavs = globalRaw ? JSON.parse(globalRaw) : [];
          if (Array.isArray(globalFavs) && globalFavs.length > 0) {
            favs = globalFavs;
          }
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
    return () => { mounted = false; if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [idParam, route.params]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    (async () => {
      try {
        if (route.params?.isFavorite !== undefined) {
          if (mounted) setIsFavorite(Boolean(route.params.isFavorite));
          return;
        }

        const key = await userFavoritesKey();
        const raw = await AsyncStorage.getItem(key);
        let favs = raw ? JSON.parse(raw) : [];

        if ((!Array.isArray(favs) || favs.length === 0)) {
          const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
          const globalFavs = globalRaw ? JSON.parse(globalRaw) : [];
          if (Array.isArray(globalFavs) && globalFavs.length > 0) {
            favs = globalFavs;
          }
        }

        if (!mounted) return;
        setIsFavorite(Array.isArray(favs) && favs.includes(String(idParam)));
      } catch (e) {
        if (mounted) setIsFavorite(false);
      }
    })();
    return () => { mounted = false; };
  }, [idParam, route.params]));

  useEffect(() => {
    if (data) return;
    const params = route.params ?? {};
    const hasUseful =
      params.branch ||
      params.nombre ||
      params.name ||
      params.imagen_logo_url ||
      params.logo ||
      params.imagen_banner_url ||
      params.banner;
    if (!hasUseful) return;

    const baseObj = params.branch ? { ...params.branch } : {};
    Object.keys(params).forEach((k) => {
      if (k === "branch") return;
      if (baseObj[k] === undefined) baseObj[k] = params[k];
    });
    if (!baseObj.imagen_logo_url && (baseObj.logo || params.logo)) {
      baseObj.imagen_logo_url = baseObj.logo ?? params.logo;
    }
    if (!baseObj.imagen_banner_url && (baseObj.banner || params.banner)) {
      baseObj.imagen_banner_url = baseObj.banner ?? params.banner;
    }
    setData(baseObj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params]);

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

  const toggleFavorite = async () => {
    try {
      const sid = String(idParam ?? data?.id ?? data?.restaurante_id ?? '');
      if (!sid) { showToast('No se pudo actualizar favoritos'); return; }

      const favKey = await userFavoritesKey();
      const favObjsKey = await userFavoritesObjsKey();

      const rawIds = await AsyncStorage.getItem(favKey);
      let ids = rawIds ? JSON.parse(rawIds) : null;
      if (!Array.isArray(ids)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
        ids = globalRaw ? JSON.parse(globalRaw) : [];
      }

      const rawObjs = await AsyncStorage.getItem(favObjsKey);
      let objs = rawObjs ? JSON.parse(rawObjs) : null;
      if (!Array.isArray(objs)) {
        const globalObjsRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        objs = globalObjsRaw ? JSON.parse(globalObjsRaw) : [];
      }

      let newIds = Array.isArray(ids) ? [...ids] : [];
      let newObjs = Array.isArray(objs) ? [...objs] : [];

      if (newIds.includes(sid)) {
        newIds = newIds.filter(x => String(x) !== sid);
        newObjs = newObjs.filter(o => String(o.id) !== sid);
        await AsyncStorage.setItem(favKey, JSON.stringify(newIds));
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(newObjs));
        setIsFavorite(false);
        showToastWithAction('Eliminado de favoritos');
      } else {
        const preview = {
          id: String(sid),
          name: data?.nombre ?? data?.name ?? `Sucursal ${sid}`,
          image_url: data?.imagen_logo_url ?? data?.logo ?? null,
          avg_rating: data?.avg_rating ?? null,
          address: data?.direccion ?? '',
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
      showToast('Error al actualizar favoritos');
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
      showToast('No se pudo abrir opciones de compartir');
    }
  };

  const openMap = () => {
    const lat = parseFloat(data?.latitud ?? data?.latitude ?? data?.lat ?? null);
    const lng = parseFloat(data?.longitud ?? data?.longitude ?? data?.lng ?? null);
    if (!lat || !lng) return showToast('Ubicación no disponible');
    const url = Platform.OS === "android" ? `geo:${lat},${lng}?q=${lat},${lng}` : `maps://?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => showToast('No se pudo abrir la app de mapas'));
  };

  const openSocial = async (platform) => {
    if (!data) return showToast('No disponible en esta sucursal');

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

    if (!url) return showToast('No disponible en esta sucursal');

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${String(url)}`;
    }

    try {
      await Linking.openURL(url);
    } catch (err) {
      try {
        const httpsUrl = url.startsWith('http') ? url : `https://${url}`;
        await Linking.openURL(httpsUrl);
      } catch (err2) {
        console.warn('openSocial error', err, err2);
        showToast('No se pudo abrir la red social');
      }
    }
  };

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setSlideIndex(idx);
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
      if (!c) continue;
      let s = String(c).trim();
      if (!s) continue;
      s = s.replace(/\s+/g, '');
      if (/^https?:\/\//i.test(s)) return s;
      if (/^\/\//.test(s)) return 'https:' + s;
      if (s.indexOf('.') !== -1) return (s.startsWith('http') ? s : 'https://' + s);
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
          console.warn('Error opening WhatsApp fallback', e);
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

  const images = (() => {
    try {
      const arr = [];
      if (Array.isArray(data.imagenes) && data.imagenes.length > 0) {
        data.imagenes.forEach((it) => {
          if (!it) return;
          if (typeof it === "string") arr.push(it);
          else if (typeof it === "object") arr.push(it.url ?? it.path ?? it.imagen ?? it.imagen_url ?? it.src ?? it);
        });
      }
      if (arr.length === 0) {
        if (data.imagen_banner_url) arr.push(data.imagen_banner_url);
        else if (data.banner) arr.push(data.banner);
        else if (data.imagenes && typeof data.imagenes === 'string') arr.push(data.imagenes);
      }
      return arr.filter(Boolean);
    } catch (e) {
      return [];
    }
  })();

  const avatarUri = data.imagen_logo_url ?? data.logo ?? route.params?.logo ?? null;

  // Responsive derived sizes
  const SLIDER_HEIGHT = clamp(s(250), 160, Math.round(Math.min(width * 0.7, 420)));
  const AVATAR_SIZE = clamp(s(60), 40, 120);
  const DOT_SIZE = clamp(s(8), 6, 12);

  // topInset robusto para iOS/Android (notch / statusbar)
  const topInset = Math.max(insets.top ?? 0, StatusBar.currentHeight ?? 0);
  const HEADER_TOP = topInset + 8;

  const AVATAR_LEFT = clamp(s(26), 12, Math.round(width * 0.12));
  const CARD_PADDING_H = clamp(s(24), 12, 36);

  const translateY = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const opacity = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const hasWhatsapp = Boolean(data.url_whatsapp || data.whatsapp || data.telefono_sucursal || data.whatsapp_url);
  const hasFacebook = Boolean(data.url_facebook || data.facebook_url || data.facebook || data.fb);
  const hasInstagram = Boolean(data.url_instagram || data.instagram_url || data.instagram);
  const hasTiktok = Boolean(data.url_tik_tok || data.url_tiktok || data.tiktok);

  // toast bottom robusto con safe-area bottom
  const toastBottom = Math.max(12, (insets.bottom ?? 0) + 12);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topInset }]}>
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
            ? images.map((uri, i) => <Image key={i} source={{ uri }} style={[styles.sliderImage, { width, height: SLIDER_HEIGHT }]} />)
            : <Image source={placeholderBanner} style={[styles.sliderImage, { width, height: SLIDER_HEIGHT }]} />
          }
        </ScrollView>

        <View style={[styles.dots, { bottom: Math.max(8, s(10)), right: Math.max(12, s(16)) }]}>
          {(images.length > 0 ? images : [1,2,3]).map((_, i) => (
            <View key={i} style={[
              styles.dot,
              { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, marginHorizontal: Math.max(3, s(4)) },
              i === slideIndex && styles.dotActive
            ]} />
          ))}
        </View>

        <View style={[styles.header, { top: HEADER_TOP }]}>
          <Image source={tabtrackLogo} style={[styles.headerLogo, { width: clamp(s(80), 56, 140), height: clamp(s(24), 18, 40) }]} />
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,left:10,right:10,bottom:10 }}>
              <Ionicons name="arrow-back" size={s(24)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShare}>
              <Ionicons name="share-social-outline" size={s(22)} color="#fff" style={styles.iconSpacing} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={s(22)} color={isFavorite ? "red" : "#fff"} style={styles.iconSpacing} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.avatarContainer, { top: SLIDER_HEIGHT - AVATAR_SIZE / 2, left: AVATAR_LEFT, width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
        { avatarUri
          ? <Image source={{ uri: avatarUri }} style={[styles.avatar, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 }]} />
          : <Image source={placeholderAvatar} style={[styles.avatar, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 }]} />
        }
      </View>

      <ScrollView contentContainerStyle={[styles.card, { paddingTop: AVATAR_SIZE / 2 + 16, paddingHorizontal: CARD_PADDING_H }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { fontSize: clamp(s(24), 16, 28) }]}>{data.nombre || data.name || "—"}</Text>
          <View style={styles.rating}>
            <Text style={[styles.ratingStar, { fontSize: clamp(s(18), 12, 22) }]}>★</Text>
            <Text style={[styles.ratingText, { fontSize: clamp(s(16), 12, 18) }]}>
              {data.avg_rating != null && !Number.isNaN(Number(data.avg_rating)) ? Number(data.avg_rating).toFixed(1) : "4.2"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={[styles.sectionTitle, { fontSize: clamp(s(14), 12, 16) }]}>Descripción breve</Text>
        <Text style={[styles.paragraph, { fontSize: clamp(s(13), 12, 16), lineHeight: clamp(s(18), 16, 22) }]}>{data.descripcion ?? data.short_description ?? "—"}</Text>

        { Array.isArray(data.horarios) && data.horarios.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { fontSize: clamp(s(14), 12, 16) }]}>Horarios</Text>
            {data.horarios.map((h, i) => {
              const dia = (h.dia_semana ?? h.dia) || "";
              const apertura = (h.horario_apertura ?? h.open) || "";
              const cierre = (h.horario_cierre ?? h.close) || "";
              return <Text key={i} style={[styles.paragraph, { fontSize: clamp(s(13), 12, 15) }]}>{`${dia}: ${apertura} - ${cierre}`}</Text>;
            })}
          </>
        ) : null }

        <View style={styles.divider} />
        <Text style={[styles.sectionTitle, { fontSize: clamp(s(14), 12, 16) }]}>Dirección</Text>
        <Text style={[styles.paragraph, { fontSize: clamp(s(13), 12, 16) }]}>{data.direccion || data.address || "—"}</Text>

        { data.telefono_sucursal ? (
          <>
            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { fontSize: clamp(s(14), 12, 16) }]}>Teléfono</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.telefono_sucursal}`).catch(()=>showToast('No se pudo marcar'))}>
              <Text style={[styles.paragraph, { color: "#000", fontSize: clamp(s(13), 12, 15) }]}>{data.telefono_sucursal}</Text>
            </TouchableOpacity>
          </>
        ) : null }

        <View style={styles.divider} />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.btnReserve, { height: clamp(s(40), 36, 48), borderRadius: clamp(s(20), 16, 24), marginRight: s(8) }]} onPress={handleReserve}>
            <Text style={[styles.buttonText, { fontSize: clamp(s(16), 14, 18) }]}>Reservar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.btnRoute, { height: clamp(s(40), 36, 48), borderRadius: clamp(s(20), 16, 24), marginLeft: s(8) }]} onPress={openMap}>
            <Text style={[styles.buttonText, { fontSize: clamp(s(16), 14, 18) }]}>Ir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialIconsRow}>
          <TouchableOpacity
            style={[styles.socialIconWrap, !hasWhatsapp && styles.socialIconDisabled, { width: clamp(s(44), 36, 56), height: clamp(s(44), 36, 56), borderRadius: clamp(s(22), 18, 28) }]}
            onPress={() => hasWhatsapp ? openSocial('whatsapp') : showToast('No disponible en esta sucursal')}
            activeOpacity={hasWhatsapp ? 0.8 : 1}
          >
            <Ionicons name="logo-whatsapp" size={clamp(s(22), 16, 26)} color={hasWhatsapp ? "#25D366" : "#bfc7cc"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialIconWrap, !hasFacebook && styles.socialIconDisabled, { width: clamp(s(44), 36, 56), height: clamp(s(44), 36, 56), borderRadius: clamp(s(22), 18, 28) }]}
            onPress={() => hasFacebook ? openSocial('facebook') : showToast('No disponible en esta sucursal')}
            activeOpacity={hasFacebook ? 0.8 : 1}
          >
            <Ionicons name="logo-facebook" size={clamp(s(22), 16, 26)} color={hasFacebook ? "#1877F2" : "#bfc7cc"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialIconWrap, !hasTiktok && styles.socialIconDisabled, { width: clamp(s(44), 36, 56), height: clamp(s(44), 36, 56), borderRadius: clamp(s(22), 18, 28) }]}
            onPress={() => hasTiktok ? openSocial('tiktok') : showToast('No disponible en esta sucursal')}
            activeOpacity={hasTiktok ? 0.8 : 1}
          >
            <Image source={tiktokIcon} style={{ width: clamp(s(22), 14, 28), height: clamp(s(22), 14, 28), opacity: hasTiktok ? 1 : 0.35 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialIconWrap, !hasInstagram && styles.socialIconDisabled, { width: clamp(s(44), 36, 56), height: clamp(s(44), 36, 56), borderRadius: clamp(s(22), 18, 28) }]}
            onPress={() => hasInstagram ? openSocial('instagram') : showToast('No disponible en esta sucursal')}
            activeOpacity={hasInstagram ? 0.8 : 1}
          >
            <Ionicons name="logo-instagram" size={clamp(s(22), 16, 26)} color={hasInstagram ? "#C13584" : "#bfc7cc"} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {toastVisible && (
        <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { transform: [{ translateY }], opacity, bottom: toastBottom }]}>
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

const BLUE = "#0046ff";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loading: { justifyContent: "center", alignItems: "center" },

  sliderContainer: { backgroundColor: "#000" },
  sliderImage: { resizeMode: "cover" },
  dots: { position: "absolute", flexDirection: "row" },
  dot: { backgroundColor: "#fff70a55" },
  dotActive: { backgroundColor: "#fff" },

  header: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 30 },
  headerLogo: { resizeMode: "contain" },
  headerIcons: { flexDirection: "row" },
  iconSpacing: { marginLeft: 12 },

  avatarContainer: { position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", elevation: 4, justifyContent: "center", alignItems: "center", zIndex: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26 },

  card: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -5 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { color: BLUE, fontWeight: '700' },
  rating: { flexDirection: "row", alignItems: "center" },
  ratingStar: { color: "#FFD700", marginRight: 4 },
  ratingText: { fontWeight: "600", color: "#333" },

  divider: { height: 1, backgroundColor: BLUE, opacity: 0.4, marginVertical: 12 },
  sectionTitle: { color: BLUE, marginBottom: 4, fontWeight: '700' },
  paragraph: { color: "#555", marginBottom: 8 },

  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  button: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnReserve: { backgroundColor: BLUE },
  btnRoute: { backgroundColor: BLUE },
  buttonText: { color: "#fff" },

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
