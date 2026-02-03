import React, { useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  PixelRatio,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTER_OPTIONS = ['Todos los avisos', 'Administración', 'Mantenimiento', 'Comunidad', 'Menu'];

const API_URL = 'https://api.residence.tab-track.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';

export default function FeedResicende() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const headerHeight = Math.round(hp(10.5));
  const outerPad = Math.round(wp(6));
  const cardPadding = Math.round(wp(4));
  const cardRadius = Math.round(Math.max(12, wp(3)));
  const iconBoxSize = Math.round(clamp(rf(16), 64, 120));
  const smallText = Math.round(clamp(rf(3.2), 12, 14));
  const GRADIENT_COLORS = ['#9F4CFF', '#6A43FF', '#2C7DFF'];

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Todos los avisos');

  const [notices, setNotices] = useState([]);
  const [restaurants, setRestaurants] = useState([]);

  const getHeaders = () => {
    const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (TOKEN && TOKEN.trim()) h.Authorization = `Bearer ${TOKEN}`;
    return h;
  };

  const normalizeStr = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const extractEdificioId = (json) => {
    if (!json) return null;
    if (json.edificio_id) return json.edificio_id;
    if (json.edificio && (json.edificio.id || json.edificio.edificio_id)) return json.edificio.id ?? json.edificio.edificio_id;
    if (json.data && json.data.edificio_id) return json.data.edificio_id;
    return null;
  };

  const extractArray = (json) => {
    if (!json) return null;
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.restaurantes)) return json.restaurantes;
    if (Array.isArray(json.items)) return json.items;
    if (Array.isArray(json.data)) return json.data;
    return null;
  };

  // helper para formatear fecha como DD/MM/YY HH:MM (sin segundos)
  const formatDateShortWithTime = (dateRaw) => {
    if (!dateRaw) return '';
    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${min}`;
  };

  const mapApiAvisoToNotice = (apiItem) => {
    const id = apiItem.id ?? String(Math.random()).slice(2, 9);
    const title = apiItem.titulo ?? apiItem.title ?? '';
    const categoryRaw = apiItem.categoria ?? apiItem.category ?? '';
    const category = categoryRaw
      ? String(categoryRaw).charAt(0).toUpperCase() + String(categoryRaw).slice(1).toLowerCase()
      : 'Comunidad';
    const dateRaw = apiItem.publicado_en ?? apiItem.publicado ?? apiItem.date ?? null;
    // formato pedido: DD/MM/YY HH:MM (sin segundos)
    const date = dateRaw ? formatDateShortWithTime(dateRaw) : '';
    const body = apiItem.contenido ?? apiItem.body ?? '';
    const priorityRaw = (apiItem.prioridad ?? apiItem.priority ?? '').toString().toLowerCase();
    const priority = priorityRaw === 'urgente' || priorityRaw === 'alta' ? 'urgente' : 'normal';

    const cmap = {
      'Administración': '#2563EB',
      'Mantenimiento': '#F97316',
      'Comunidad': '#10B981',
      'Menu': '#6366F1',
    };
    const color = cmap[category] ?? '#2563EB';

    return { id: String(id), title, category, date, body, priority, color, raw: apiItem };
  };

  const parseTimeTokenToMinutes = (tkn) => {
    if (!tkn) return null;
    let s = String(tkn).trim().toLowerCase();
    s = s.replace(/\s+/g, ' ').trim();
    const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2] ?? 0);
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'am' || ampm === 'pm') {
      if (ampm === 'pm' && hh < 12) hh += 12;
      if (ampm === 'am' && hh === 12) hh = 0;
    }
    if (!ampm && hh === 24) hh = 0;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  };

  const parseHorarioRange = (horario) => {
    if (!horario || typeof horario !== 'string') return null;
    const parts = horario.split(/\s*(?:-|–|—|a|to)\s*/i).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const start = parseTimeTokenToMinutes(parts[0]);
    const end = parseTimeTokenToMinutes(parts[1]);
    if (start === null || end === null) return null;
    return { start, end, raw: horario };
  };

  const isOpenNow = (horario) => {
    const range = parseHorarioRange(horario);
    if (!range) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const { start, end } = range;
    if (start <= end) {
      return currentMinutes >= start && currentMinutes < end;
    } else {
      return currentMinutes >= start || currentMinutes < end;
    }
  };

  const formatHorarioDisplay = (horario) => {
    if (!horario || typeof horario !== 'string') return null;
    return horario.replace(/\s*(?:-|–|—|a|to)\s*/gi, ' - ');
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const deptRaw = await AsyncStorage.getItem('user_residence_departamento_id_actual');
        if (!deptRaw) {
          console.warn('FeedResicende: no department id in AsyncStorage (user_residence_departamento_id_actual)');
          if (mounted) { setNotices([]); setRestaurants([]); }
          return;
        }
        const deptId = String(deptRaw).trim();
        if (!deptId) {
          if (mounted) { setNotices([]); setRestaurants([]); }
          return;
        }

        const base = API_URL.replace(/\/$/, '');
        let edificioId = null;

        try {
          const depUrl = `${base}/api/residence/departamentos/${encodeURIComponent(deptId)}`;
          const depRes = await fetch(depUrl, { method: 'GET', headers: getHeaders() });
          if (!depRes.ok) {
            console.warn('FeedResicende: departamento fetch not ok', depRes.status, depUrl);
          } else {
            const depJson = await depRes.json();
            edificioId = extractEdificioId(depJson);
            if (!edificioId && Array.isArray(depJson) && depJson.length > 0 && depJson[0].edificio_id) edificioId = depJson[0].edificio_id;
          }
        } catch (err) {
          console.warn('FeedResicende: error fetching departamento', err);
        }

        if (!edificioId) {
          console.warn('FeedResicende: no edificioId discovered; leaving notices empty.');
          if (mounted) { setNotices([]); setRestaurants([]); }
          return;
        }

        try {
          const restUrl = `${base}/api/residence/edificios/${encodeURIComponent(edificioId)}/restaurantes`;
          const restRes = await fetch(restUrl, { method: 'GET', headers: getHeaders() });
          if (!restRes.ok) {
            console.warn('FeedResicende: restaurantes fetch not ok', restRes.status, restUrl);
            if (mounted) setRestaurants([]);
          } else {
            const restJson = await restRes.json();
            const arr = extractArray(restJson);
            if (arr && Array.isArray(arr)) {
              const normalized = arr.map((r, idx) => {
                const nombre = r.nombre ?? r.name ?? r.title ?? `Restaurante ${idx + 1}`;
                const edificio_nombre = r.edificio_nombre ?? r.edificioName ?? r.building_name ?? null;
                const horario_atencion = r.horario_atencion ?? r.horario ?? r.horarioAtencion ?? null;
                const imagen_perfil_url = r.imagen_perfil_url ?? r.imagenPerfilUrl ?? r.logo_url ?? r.imagen ?? null;

                const horarioDisplay = horario_atencion ? formatHorarioDisplay(String(horario_atencion)) : null;
                const openNow = horario_atencion ? isOpenNow(String(horario_atencion)) : null;

                return {
                  id: String(r.id ?? r.restaurante_id ?? r.restaurant_id ?? idx),
                  nombre,
                  edificio_nombre,
                  horario_atencion,
                  horarioDisplay,
                  imagen_perfil_url,
                  openNow,
                  raw: r,
                };
              });
              if (mounted) setRestaurants(normalized);
            } else if (restJson && (restJson.nombre || restJson.name)) {
              const r = restJson;
              const nombre = r.nombre ?? r.name;
              const edificio_nombre = r.edificio_nombre ?? r.edificioName ?? r.building_name ?? null;
              const horario_atencion = r.horario_atencion ?? r.horario ?? r.horarioAtencion ?? null;
              const imagen_perfil_url = r.imagen_perfil_url ?? r.imagenPerfilUrl ?? r.logo_url ?? r.imagen ?? null;
              const horarioDisplay = horario_atencion ? formatHorarioDisplay(String(horario_atencion)) : null;
              const openNow = horario_atencion ? isOpenNow(String(horario_atencion)) : null;
              const single = [{ id: String(restJson.id ?? 'r1'), nombre, edificio_nombre, horario_atencion, horarioDisplay, imagen_perfil_url, openNow, raw: restJson }];
              if (mounted) setRestaurants(single);
            } else {
              if (mounted) setRestaurants([]);
            }
          }
        } catch (err) {
          console.warn('FeedResicende: error fetching restaurantes', err);
          if (mounted) setRestaurants([]);
        }

        try {
          const avisosUrl = `${base}/api/residence/mobile/avisos?edificio_id=${encodeURIComponent(edificioId)}`;
          const avisRes = await fetch(avisosUrl, { method: 'GET', headers: getHeaders() });
          if (!avisRes.ok) {
            console.warn('FeedResicende: avisos fetch not ok', avisRes.status, avisosUrl);
            if (mounted) setNotices([]);
          } else {
            const avisJson = await avisRes.json();
            const items = Array.isArray(avisJson.items) ? avisJson.items : (Array.isArray(avisJson) ? avisJson : (Array.isArray(avisJson.data) ? avisJson.data : null));
            if (Array.isArray(items)) {
              const mapped = items.map(mapApiAvisoToNotice);
              if (mounted) setNotices(mapped);
            } else if (Array.isArray(avisJson)) {
              const mapped = avisJson.map(mapApiAvisoToNotice);
              if (mounted) setNotices(mapped);
            } else if (avisJson && (avisJson.titulo || avisJson.title)) {
              const mapped = [mapApiAvisoToNotice(avisJson)];
              if (mounted) setNotices(mapped);
            } else {
              if (mounted) setNotices([]);
            }
          }
        } catch (err) {
          console.warn('FeedResicende: error fetching avisos', err);
          if (mounted) setNotices([]);
        }
      } catch (err) {
        console.warn('FeedResicende: unexpected error in data flow', err);
        if (mounted) {
          setNotices([]);
          setRestaurants([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const effectiveNotices = useMemo(() => notices, [notices]);

  const filteredNotices = useMemo(() => {
    if (!selectedFilter || selectedFilter === 'Todos los avisos') return effectiveNotices;
    const normFilter = normalizeStr(selectedFilter);
    return effectiveNotices.filter((n) => {
      try {
        return normalizeStr(n.category || '') === normFilter;
      } catch {
        return false;
      }
    });
  }, [selectedFilter, effectiveNotices]);

  const onSelectFilter = (opt) => {
    setSelectedFilter(opt);
    setDropdownVisible(false);
  };

  const outerPadNotices = Math.round(wp(4));
  const cardRadiusN = Math.round(Math.max(12, wp(2.6)));
  const iconBoxSizeN = Math.round(clamp(rf(12), 44, 64));
  const titleSize = Math.round(clamp(rf(5.2), 18, 22));
  const bodySize = Math.round(clamp(rf(3.6), 13, 16));
  const smallSize = Math.round(clamp(rf(3.0), 11, 13));
  const filterBtnHeight = Math.round(clamp(rf(11), 44, 56));

  const stylesN = makeStyles({
    outerPad: outerPadNotices,
    cardRadius: cardRadiusN,
    iconBoxSize: iconBoxSizeN,
    titleSize,
    bodySize,
    smallSize,
    wp,
    filterBtnHeight,
    rf,
  });

  const renderItem = ({ item }) => {
    const urgent = item.priority === 'urgente';


    const estimatedUrgentBadgeReserve = Math.round(Math.max(72, wp(22))); 

    return (
      <TouchableOpacity
        activeOpacity={0.92}
/*         onPress={() => {
          if (navigation && navigation.navigate) navigation.navigate('AvisoDetalle', { id: item.id, raw: item.raw });
        }} */
        style={[
          stylesN.card,
          urgent
            ? { borderColor: '#FB7185', borderWidth: 1.4, backgroundColor: '#fff' }
            : { borderColor: '#E6E9EE', borderWidth: 1, backgroundColor: '#fff' },
        ]}
      >
        {urgent && (
          <View style={stylesN.urgentBadgeWrapper}>
            <Text style={stylesN.urgentBadgeText}>Urgente</Text>
          </View>
        )}

        <View style={stylesN.cardInner}>
          <View style={[stylesN.iconWrap, { backgroundColor: item.color + '22' }]}>
            <Ionicons name="megaphone-outline" size={Math.round(iconBoxSizeN * 0.46)} color={item.color} />
          </View>

          <View style={stylesN.cardContent}>
            {/* Title row: reserve marginRight when urgent so the title doesn't touch the badge.
                We allow title to wrap (up to 2 lines) so it does not get cut. */}
            <View style={[stylesN.cardHeaderRow, { marginRight: urgent ? estimatedUrgentBadgeReserve : 0 }]}>
              <Text style={[stylesN.cardTitle, { fontSize: titleSize }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <View style={{ height: 8 }} />

            {/* Tags + date row: add paddingRight when urgent so date doesn't go under the badge */}
            <View style={[stylesN.rowSpaceBetween, { paddingRight: urgent ? estimatedUrgentBadgeReserve : 0 }]}>
              <View style={stylesN.tagsRow}>
                <View style={stylesN.categoryPill}>
                  <Text style={[stylesN.categoryText, { fontSize: smallSize }]}>{item.category}</Text>
                </View>
              </View>

              <Text style={[stylesN.cardDate, { fontSize: smallSize }]}>{item.date}</Text>
            </View>

            <View style={{ height: 10 }} />

            {/* Body: allowed to grow freely (no padding right reserved), so it will be same width as non-urgent cards */}
            <Text style={[stylesN.cardBody, { fontSize: bodySize }]}>
              {item.body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render restaurants strip + filter + heading (estaba en ListHeader anteriormente)
  const HeaderWithFilterAndRestaurants = () => (
    <View>
      <View style={{ paddingHorizontal: outerPad, marginTop: Math.round(hp(2)) }}>
        {(Array.isArray(restaurants) && restaurants.length > 0) ? (
          restaurants.map((r) => (
            <View key={r.id} style={[styles.restaurantCardWrap, { borderRadius: cardRadius, marginBottom: 12 }]}>
              <LinearGradient
                colors={GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.cardStrip, { height: Math.round(hp(7)), borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}
              >
                <View style={styles.stripContent}>
                  <View
                    style={[
                      styles.stripIconWrap,
                      {
                        width: iconBoxSize * 0.72,
                        height: iconBoxSize * 0.72,
                        borderRadius: Math.round((iconBoxSize * 0.72) * 0.18),
                        overflow: 'hidden',
                        backgroundColor: 'transparent',
                      },
                    ]}
                  >
                    {r.imagen_perfil_url && String(r.imagen_perfil_url).startsWith('http') ? (
                      <Image
                        source={{ uri: r.imagen_perfil_url }}
                        style={{ width: '100%', height: '100%', borderRadius: Math.round((iconBoxSize * 0.72) * 0.18) }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="restaurant" size={Math.round((iconBoxSize * 0.72) * 0.44)} color="#fff" />
                    )}
                  </View>

                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.stripTitle, { fontSize: Math.round(clamp(rf(4.0), 16, 18)) }]} numberOfLines={1}>{r.nombre}</Text>
                    <Text style={[styles.stripSubtitle, { fontSize: smallText }]} numberOfLines={1}>
                      {r.edificio_nombre ?? 'Residencia Universitaria'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={[styles.restaurantCardContent, { padding: cardPadding, borderBottomLeftRadius: cardRadius, borderBottomRightRadius: cardRadius }]}>
                <View style={styles.infoContainer}>
                  <View style={styles.labelsCol}>
                    <Text style={[styles.infoLabel, { fontSize: smallText }]}>Horario</Text>
                    <Text style={[styles.infoLabel, { fontSize: smallText, marginTop: 12 }]}>Estado</Text>
                  </View>

                  <View style={styles.valuesCol}>
                    <Text style={[styles.infoValue, { fontSize: smallText }]}>
                      {r.horarioDisplay ?? '7:00 AM - 10:00 PM'}
                    </Text>

                    <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                      {(() => {
                        if (r.openNow === null || r.openNow === undefined) {
                          return (
                            <View style={styles.openPill}>
                              <Text style={[styles.openPillText, { fontSize: Math.round(clamp(rf(2.8), 11, 12)) }]}>Abierto</Text>
                            </View>
                          );
                        }
                        if (r.openNow === true) {
                          return (
                            <View style={styles.openPill}>
                              <Text style={[styles.openPillText, { fontSize: Math.round(clamp(rf(2.8), 11, 12)) }]}>Abierto</Text>
                            </View>
                          );
                        }
                        return (
                          <View style={{ backgroundColor: '#FEE2E2', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16 }}>
                            <Text style={{ color: '#B91C1C', fontWeight: '800', fontSize: Math.round(clamp(rf(2.8), 11, 12)) }}>Cerrado</Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.registerBtn, { borderColor: 'rgba(156, 110, 255, 0.22)' }]}
                  onPress={() => navigation.navigate('QR')}
                >
                  <Text style={styles.registerBtnText}>Registrar consumo</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7C3AED" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.restaurantCardWrap, { borderRadius: cardRadius }]}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cardStrip, { height: Math.round(hp(7)), borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}
            >
              <View style={styles.stripContent}>
                <View
                  style={[
                    styles.stripIconWrap,
                    {
                      width: iconBoxSize * 0.72,
                      height: iconBoxSize * 0.72,
                      borderRadius: Math.round((iconBoxSize * 0.72) * 0.18),
                    },
                  ]}
                >
                  <Ionicons name="restaurant" size={Math.round((iconBoxSize * 0.72) * 0.44)} color="#fff" />
                </View>

                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.stripTitle, { fontSize: Math.round(clamp(rf(4.0), 16, 18)) }]}>Cafetería Central</Text>
                  <Text style={[styles.stripSubtitle, { fontSize: smallText }]}>Residencia Universitaria</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={[styles.restaurantCardContent, { padding: cardPadding, borderBottomLeftRadius: cardRadius, borderBottomRightRadius: cardRadius }]}>
              <View style={styles.infoContainer}>
                <View style={styles.labelsCol}>
                  <Text style={[styles.infoLabel, { fontSize: smallText }]}>Horario</Text>
                  <Text style={[styles.infoLabel, { fontSize: smallText, marginTop: 12 }]}>Estado</Text>
                </View>

                <View style={styles.valuesCol}>
                  <Text style={[styles.infoValue, { fontSize: smallText }]}>7:00 AM - 10:00 PM</Text>

                  <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                    <View style={styles.openPill}>
                      <Text style={[styles.openPillText, { fontSize: Math.round(clamp(rf(2.8), 11, 12)) }]}>Abierto</Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.registerBtn, { borderColor: 'rgba(156, 110, 255, 0.22)' }]}
                onPress={() => navigation.navigate('QR')}
              >
                <Text style={styles.registerBtnText}>Registrar consumo</Text>
                <Ionicons name="chevron-forward" size={16} color="#7C3AED" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ESPACIO */}
      <View style={{ height: Math.round(hp(2)) }} />

      {/* FILTRO y TITULO "Avisos Recientes" */}
      <View style={{ paddingHorizontal: outerPadNotices, zIndex: 9999, elevation: 9999, overflow: 'visible' }}>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setDropdownVisible((s) => !s)}
            style={({ pressed }) => [
              stylesN.filterBtn,
              { height: filterBtnHeight, opacity: pressed ? 0.92 : 1 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="filter-outline" size={18} color="#111827" />
            <Text style={stylesN.filterText}>{selectedFilter}</Text>
            <Ionicons name={dropdownVisible ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
          </Pressable>

          {dropdownVisible && (
            <View
              style={[
                stylesN.dropdown,
                {
                  top: filterBtnHeight + 10,
                  zIndex: 99999,
                  elevation: 99999,
                  overflow: 'visible',
                },
              ]}
            >
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} onPress={() => onSelectFilter(opt)} style={stylesN.dropdownOption}>
                  <Text style={[stylesN.dropdownText, opt === selectedFilter ? { fontWeight: '800' } : {}]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 12 }} />
        <Text style={[stylesN.sectionTitle, { fontSize: Math.round(rf(15)), paddingHorizontal: 4 }]}>Avisos Recientes</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          {
            height: headerHeight,
            paddingBottom: Math.round(hp(1.2)),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: Math.round(clamp(rf(5.0), 18, 26)) }]}>
            Tablero de Avisos
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: Math.round(clamp(rf(3.2), 12, 14)) }]}>
            Mantente informado
          </Text>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredNotices}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: 8 }}
        ListHeaderComponent={HeaderWithFilterAndRestaurants}
        ListHeaderComponentStyle={{ overflow: 'visible', zIndex: 9999, elevation: 9999 }}
        ListEmptyComponent={<Text style={{ color: '#6b7280', padding: 16 }}>No se encontraron avisos para este filtro.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },

  header: {
    width: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  headerContent: { alignItems: 'center', marginBottom: 6 },
  headerTitle: { color: '#fff', fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.92)', marginTop: 4 },

  scroll: { paddingBottom: 24 },

  restaurantCardWrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },

  cardStrip: {
    width: '100%',
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
  },
  stripIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  stripTitle: { color: '#fff', fontWeight: '800' },
  stripSubtitle: { color: 'rgba(255,255,255,0.95)' },

  restaurantCardContent: {
    backgroundColor: '#fff',
    width: '100%',
  },

  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  labelsCol: { flex: 1 },
  valuesCol: { flex: 1, alignItems: 'flex-end' },

  infoLabel: { color: '#6b7280', fontWeight: '700' },
  infoValue: { color: '#111827', fontWeight: '700' },

  openPill: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  openPillText: { color: '#15803d', fontWeight: '800' },

  registerBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.6,
  },
  registerBtnText: { color: '#7C3AED', fontWeight: '800' },

  sectionTitle: { color: '#111827', fontWeight: '700' },

  paymentCardWrap: {},
  paymentCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fde6ca',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentTitle: { color: '#111827', fontWeight: '800' },
  pendingPill: {
    backgroundColor: '#fff2df',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#f3c06b',
  },
  pendingPillText: { color: '#b35700', fontWeight: '700' },

  paymentDue: { color: '#6b7280', marginTop: 8 },

  separatorLine: { height: 1, backgroundColor: '#f1e7db', marginVertical: 12 },

  amountLabel: { color: '#374151', fontSize: 14 },
  amountValue: { color: '#111827', fontWeight: '900', fontSize: 22 },

  payButtonGradient: { marginTop: 6, overflow: 'hidden' },
  payButtonTouchable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  payButtonText: { color: '#fff', fontWeight: '800' },
});

function makeStyles({ outerPad, cardRadius, iconBoxSize, titleSize, bodySize, smallSize, wp, filterBtnHeight, rf }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F8FB' },

    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF2F7',
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    filterText: { marginLeft: 8, marginRight: 8, color: '#374151', fontWeight: '600' },

    dropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 9999,
      elevation: 30,
      backgroundColor: '#fff',
      borderRadius: 10,
      marginTop: 0,
      borderWidth: 1,
      borderColor: '#EEF2F7',
      overflow: 'visible',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
    },
    dropdownOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    dropdownText: { color: '#111827' },

    listWrap: {
      flex: 1,
      marginTop: 12,
    },

    sectionTitle: { color: '#111827', fontWeight: '900', marginBottom: 10 },

    card: {
      backgroundColor: '#fff',
      borderRadius: cardRadius,
      marginBottom: 14,
      overflow: 'hidden',
      paddingVertical: 16,
      paddingHorizontal: Math.round(wp(5)),
      marginHorizontal: outerPad,
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 1,
      position: 'relative',
    },

    urgentBadgeWrapper: {
      position: 'absolute',
      right: Math.round(wp(5)),
      top: 14,
      backgroundColor: '#fff',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: '#FECACA',
      zIndex: 5,
    },
    urgentBadgeText: { color: '#B91C1C', fontWeight: '800', fontSize: Math.round(smallSize * 0.95) },

    cardInner: { flexDirection: 'row', alignItems: 'flex-start' },

    iconWrap: {
      width: iconBoxSize,
      height: iconBoxSize,
      borderRadius: Math.round(iconBoxSize / 4),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    cardContent: {
      flex: 1,
    },

    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    cardTitle: { color: '#0F172A', fontWeight: '800', flexShrink: 1 },

    rowSpaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    tagsRow: { flexDirection: 'row', alignItems: 'center' },
    categoryPill: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    categoryText: { color: '#374151', fontWeight: '700' },

    cardBody: { color: '#374151', lineHeight: 20 },

    cardDate: { color: '#6B7280', marginTop: 6, fontWeight: '600' },
  });
}
