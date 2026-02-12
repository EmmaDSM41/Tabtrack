import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  useWindowDimensions,
  PixelRatio,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPLASH_DURATION_MS = 6500;

const DEFAULT_API_BASE = 'https://api.tab-track.com';
const DEFAULT_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3MDEzNjkxMCwianRpIjoiMzM3YjlkY2YtYjlkMi00NjFjLTkxMDItYzlkZjFkNDFlYmFjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NzAxMzY5MTAsImV4cCI6MTc3MjcyODkxMCwicm9sIjoiRWRpdG9yIn0.GVPx2mKxkE7qZQ9AozQnldLlkogOOLksbetncQ8BgmY';               

let FastImage = null;
try {
  FastImage = require('react-native-fast-image');
} catch (e) {
  FastImage = null;
}

export default function SplashResidence() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width, height } = useWindowDimensions();

  const wp = (p) => (p * width) / 100;
  const hp = (p) => (p * height) / 100;
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const logoSize = clamp(Math.round(width * 0.38), 84, 160);
  const gifCandidate = Math.min(width * 0.75, height * 0.48);
  const gifSize = clamp(Math.round(gifCandidate), 120, Math.round(height * 0.3));
  const smallTextSize = Math.round(clamp(rf(3.2), 12, 16));

  const logoTopMargin = Math.round(hp(12));
  const titleTopGap = Math.round(hp(-16.2));
  const gifTitleGap = Math.round(hp(12));
  const gifLoadingGap = Math.round(hp(3));
  const bottomSafeGap = Math.round(hp(3.5));

  const [remountKey, setRemountKey] = useState(0);
  const remountTimerRef = useRef(null);
  const splashTimerRef = useRef(null);

  useEffect(() => {
    splashTimerRef.current = setTimeout(() => {
      try {
        navigation.replace('HomeResidence', { residenceCode: route.params?.residenceCode ?? null });
      } catch (e) {
        console.warn('ResidenceSplash: navigation.replace Home failed', e);
      }
    }, SPLASH_DURATION_MS);

    if (!FastImage) {
      const intervalMs = 1200;
      remountTimerRef.current = setInterval(() => {
        setRemountKey((k) => k + 1);
      }, intervalMs);
    }

    (async () => {
      try {
        const startMs = Date.now();
        await clearThenFetchAndPersistResidence(startMs);
      } catch (e) {
        console.warn('clearThenFetchAndPersistResidence failed', e);
      }
    })();

    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
        splashTimerRef.current = null;
      }
      if (remountTimerRef.current) {
        clearInterval(remountTimerRef.current);
        remountTimerRef.current = null;
      }
    };
  }, []);

  const getApiHost = () => String(DEFAULT_API_BASE).replace(/\/$/, '');

  const getStoredEmail = async () => {
    const keys = ['user_email', 'user_mail', 'userEmail', 'email'];
    try {
      for (const k of keys) {
        const v = await AsyncStorage.getItem(k);
        if (v && String(v).trim()) return String(v).trim();
      }
    } catch (e) {
      console.warn('getStoredEmail error', e);
    }
    return null;
  };

  const backupResidenceKeys = async () => {
    try {
      const keys = [
        'user_residence_activo',
        'user_residence_departamento_id_actual',
        'user_residence_rol_actual',
        'user_residence_fetchedAt',
      ];
      const pairs = await AsyncStorage.multiGet(keys);
      const backup = {};
      pairs.forEach(([k, v]) => {
        backup[k] = v;
      });
      return backup;
    } catch (e) {
      console.warn('backupResidenceKeys error', e);
      return {};
    }
  };

  const clearResidenceKeys = async () => {
    try {
      const keys = [
        'user_residence_activo',
        'user_residence_departamento_id_actual',
        'user_residence_rol_actual',
        'user_residence_fetchedAt',
      ];
      await AsyncStorage.multiRemove(keys);
      console.warn('clearResidenceKeys: removed residence keys');
    } catch (e) {
      console.warn('clearResidenceKeys error', e);
    }
  };

  const fetchUserFromApi = async (mail) => {
    try {
      if (!mail) return null;
      let base = getApiHost();
      if (Platform.OS === 'android' && base.includes('127.0.0.1')) {
        base = base.replace('127.0.0.1', '10.0.2.2');
      }
      const url = `${base}/api/mobileapp/usuarios?mail=${encodeURIComponent(mail)}&presign_ttl=30`;
      console.warn('Splash fetch ->', url);

      const token = DEFAULT_API_TOKEN;
      const headers = { Accept: 'application/json' };
      if (token && token.length > 0) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        console.warn('Splash fetch not ok, status=', res.status);
        return null;
      }

      const json = await res.json();

      if (json && Array.isArray(json.usuarios) && json.usuarios.length > 0) {
        return json.usuarios[0];
      }

      if (json && (json.user || json.data)) {
        return json.user || json.data;
      }

      if (json && typeof json === 'object' && !Array.isArray(json) && Object.keys(json).length > 0) {
        if (!json.page && !json.pages && !json.per_page) {
          return json;
        }
      }

      console.warn('Splash fetch: no usable user in response', json);
      return null;
    } catch (e) {
      console.warn('fetchUserFromApi error', e);
      return null;
    }
  };

  const persistResidenceFromUser = async (user) => {
    try {
      const activo = (typeof user.residence_activo !== 'undefined') ? user.residence_activo
                    : (typeof user.activo !== 'undefined' ? user.activo : null);
      const departamentoId = (typeof user.residence_departamento_id_actual !== 'undefined') ? user.residence_departamento_id_actual
                         : (typeof user.departamento_id_actual !== 'undefined' ? user.departamento_id_actual : null);
      const rol = (typeof user.residence_rol_actual !== 'undefined') ? user.residence_rol_actual
                : (typeof user.residence_rol !== 'undefined') ? user.residence_rol : (user.rol_actual ?? null);

      const toSet = [];
      if (typeof activo !== 'undefined' && activo !== null) toSet.push(['user_residence_activo', String(!!activo)]);
      if (typeof departamentoId !== 'undefined' && departamentoId !== null) toSet.push(['user_residence_departamento_id_actual', String(departamentoId)]);
      if (rol !== null && typeof rol !== 'undefined') toSet.push(['user_residence_rol_actual', String(rol)]);
      toSet.push(['user_residence_fetchedAt', new Date().toISOString()]);

      if (toSet.length > 0) {
        await AsyncStorage.multiSet(toSet);
        console.warn('persistResidenceFromUser -> saved keys:', toSet.map(p => p[0]).join(', '));
        return true;
      }
      console.warn('persistResidenceFromUser -> nothing to save from user object');
      return false;
    } catch (e) {
      console.warn('persistResidenceFromUser error', e);
      return false;
    }
  };


  const clearThenFetchAndPersistResidence = async (startMs) => {
    let backup = {};
    try {
      const mail = await getStoredEmail();
      if (!mail) {
        console.warn('clearThenFetchAndPersistResidence: no email found — skipping fetch');
        return;
      }

      backup = await backupResidenceKeys();
      await clearResidenceKeys();
      const user = await fetchUserFromApi(mail);

      if (user) {
        const ok = await persistResidenceFromUser(user);
        if (ok) {
          const elapsed = Date.now() - (startMs || Date.now());
          const remaining = Math.max(0, SPLASH_DURATION_MS - elapsed);

          if (splashTimerRef.current) {
            clearTimeout(splashTimerRef.current);
            splashTimerRef.current = null;
          }

          if (remaining > 0) {
            await new Promise((res) => setTimeout(res, remaining));
          }

          try {
            navigation.replace('HomeResidence', { residenceCode: route.params?.residenceCode ?? null });
          } catch (e) {
            console.warn('Navigation replace after persist failed', e);
          }
          return;
        } else {
          console.warn('persistResidenceFromUser failed — restoring backup');
          const toRestore = Object.entries(backup).filter(([, v]) => v !== null && typeof v !== 'undefined');
          if (toRestore.length) {
            await AsyncStorage.multiSet(toRestore);
          }
          return;
        }
      } else {
        console.warn('fetch returned no user — restoring backup');
        const toRestore = Object.entries(backup).filter(([, v]) => v !== null && typeof v !== 'undefined');
        if (toRestore.length) {
          await AsyncStorage.multiSet(toRestore);
        }
        return;
      }
    } catch (err) {
      console.warn('clearThenFetchAndPersistResidence unexpected error', err);
      try {
        const toRestore = Object.entries(backup).filter(([, v]) => v !== null && typeof v !== 'undefined');
        if (toRestore.length) await AsyncStorage.multiSet(toRestore);
      } catch (_) {  }
      return;
    }
  };

  const AnimatedGif = ({ source, style, resizeMode }) => {
    if (FastImage) {
      const Resize = FastImage.resizeMode || {};
      return (
        <FastImage
          source={source}
          style={style}
          resizeMode={Resize.contain ?? 'contain'}
        />
      );
    }

    return (
      <Image
        key={remountKey}
        source={source}
        style={style}
        resizeMode={resizeMode ?? 'contain'}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ alignItems: 'center', marginTop: logoTopMargin }}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: logoSize, height: Math.round(logoSize * 0.58), resizeMode: 'contain' }}
          />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text
            style={[
              styles.topText,
              { fontSize: Math.round(clamp(rf(4.2), 16, 20)), marginTop: titleTopGap },
            ]}
          >
            Bienvenido a Tabtrack Residence
          </Text>

          <View style={{ height: gifTitleGap }} />

          <AnimatedGif
            source={require('../../assets/images/Carga1.gif')}
            style={{
              width: gifSize,
              height: gifSize,
              resizeMode: 'contain',
            }}
            resizeMode="contain"
          />

          <View style={{ height: gifLoadingGap }} />

          <Text style={[styles.loadingText, { fontSize: smallTextSize }]}>Cargando...</Text>
        </View>

        <View style={{ height: bottomSafeGap }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, alignItems: 'center', width: '100%' },
  topText: { color: '#111827', fontWeight: '700', textAlign: 'center' },
  loadingText: { color: '#444', textAlign: 'center' },
});
