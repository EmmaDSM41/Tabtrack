import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  PixelRatio,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://api.residence.tab-track.com';
const BASE2 = 'https://api.tab-track.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NzM4MjQyNiwianRpIjoiODQyODVmZmUtZDVjYi00OGUxLTk1MDItMmY3NWY2NDI2NmE1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjMiLCJuYmYiOjE3NjczODI0MjYsImV4cCI6MTc2OTk3NDQyNiwicm9sIjoiRWRpdG9yIn0.tx84js9-CPGmjLKVPtPeVhVMsQiRtCeNcfw4J4Q2hyc'; 


const AVATAR_GRADIENTS = [
  ['#8E5CFF', '#5B8BFF'],
  ['#8E5CFF', '#E65BFF'],
  ['#6C5CE7', '#00C2FF'],
  ['#FF7AC6', '#6C5CE7'],
];

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MiembrosResidence() {
  const { width } = useWindowDimensions();
  const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));

  const route = useRoute();
  const { qr: qrFromParams } = (route && route.params) || {};

  const [residents, setResidents] = useState([]);
  const [departmentLabel, setDepartmentLabel] = useState('Habitación');
  const [residentCount, setResidentCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAndResolve() {
      setLoading(true);
      try {
        const storedUsuarioAppId = await AsyncStorage.getItem('user_usuario_app_id');
        const usuario_app_id = storedUsuarioAppId || null;
        const qr = qrFromParams || null;

        if (!qr) {
          console.warn('MiembrosResidence: falta parámetro qr en route.params');
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }
        if (!TOKEN || TOKEN.length === 0) {
          console.warn('MiembrosResidence: TOKEN no está configurado o está vacío. Pon tu token en la constante TOKEN si es necesario.');
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }
        if (!usuario_app_id) {
          console.warn('MiembrosResidence: falta user_usuario_app_id en AsyncStorage (key: "user_usuario_app_id"). No se realizarán las consultas.');
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }

        const fetchWithAuth = async (url, opts = {}) => {
          const method = (opts.method || 'GET').toUpperCase();
          let body = opts.body;

          const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
            ...(opts.headers || {}),
          };

          const fetchOptions = { method, headers };

          if (body !== undefined && body !== null) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          }

          const res = await fetch(url, fetchOptions);
          const text = await res.text().catch(() => '');
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }

          if (!res.ok) {
            const errText = (json && (json.error || json.message)) ? (json.error || json.message) : text || `HTTP ${res.status}`;
            const err = new Error(`HTTP ${res.status} - ${errText}`);
            err.status = res.status;
            err.bodyText = text;
            err.bodyJson = json;
            throw err;
          }
          return json;
        };

        const resolveUrl = `${BASE}/api/mobileapp/residence/qr/resolve`;
        let resolveResp = null;
        try {
          resolveResp = await fetchWithAuth(resolveUrl, {
            method: 'POST',
            body: { qr, usuario_app_id },
          });
        } catch (errResolve) {
          console.warn('MiembrosResidence: error al resolver QR', errResolve.message || errResolve, {
            status: errResolve.status,
            bodyText: errResolve.bodyText,
            bodyJson: errResolve.bodyJson,
            resolveUrl,
            payload: { qr, usuario_app_id },
          });
          throw errResolve;
        }

        const departamento_id =
          resolveResp?.departamento_id ?? resolveResp?.data?.departamento_id ?? null;

        if (!departamento_id) {
          console.warn('MiembrosResidence: no se encontró departamento_id en resolve QR', resolveResp);
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }

        const deptUrl = `${BASE}/api/residence/departamentos/${encodeURIComponent(departamento_id)}`;
        let deptResp = null;
        try {
          deptResp = await fetchWithAuth(deptUrl, { method: 'GET' });
        } catch (errDept) {
          console.warn('MiembrosResidence: error al consultar departamento', errDept.message || errDept, {
            status: errDept.status,
            bodyText: errDept.bodyText,
            bodyJson: errDept.bodyJson,
            deptUrl,
          });
          throw errDept;
        }

        if (mounted) {
          const numeroDepto = deptResp?.numero_departamento ?? `${departamento_id}`;
          setDepartmentLabel(`Habitación ${numeroDepto}`);
        }

        const usuariosVinculados = Array.isArray(deptResp?.usuarios_vinculados)
          ? deptResp.usuarios_vinculados
          : [];

        const mails = usuariosVinculados
          .map((u) => (u && typeof u.mail === 'string' ? u.mail.trim() : ''))
          .filter((m) => m && m.length > 0);

        if (mails.length === 0) {
          if (mounted) {
            setResidents([]);
            setResidentCount(0);
            setLoading(false);
          }
          return;
        }

        const fetchedResidents = [];
        for (const mail of mails) {
          try {
            const usuariosUrl = `${BASE2}/api/mobileapp/usuarios?mail=${encodeURIComponent(
              mail
            )}&presign_ttl=30`;
            const usuariosResp = await fetchWithAuth(usuariosUrl, { method: 'GET' });
            const usuarioObj = Array.isArray(usuariosResp?.usuarios) && usuariosResp.usuarios.length > 0
              ? usuariosResp.usuarios[0]
              : null;

            if (usuarioObj) {
              const nombre = usuarioObj.nombre ?? '';
              const apellido = usuarioObj.apellido ?? '';
              const phone = usuarioObj.telefono ?? '';
              const rol = usuarioObj.residence_rol_actual ?? usuarioObj.rol ?? '';
              const foto = usuarioObj.foto_perfil_url ?? '';
              const mailResp = usuarioObj.mail ?? mail;
              const usuario_app_id_resp = usuarioObj.usuario_app_id ?? '';

              fetchedResidents.push({
                id: usuario_app_id_resp || mailResp || `${mail}-${Math.random()}`,
                name: `${nombre} ${apellido}`.trim() || mailResp,
                relation: rol || '',
                phone: phone || '',
                email: mailResp || mail,
                badge: rol || '',
                photo: foto || null,
                raw: usuarioObj,
              });
            } else {
              fetchedResidents.push({
                id: mail,
                name: mail,
                relation: '',
                phone: '',
                email: mail,
                badge: '',
                photo: null,
                raw: null,
              });
            }
          } catch (errMail) {
            console.warn('Error buscando usuario por mail', mail, errMail.message || errMail, {
              status: errMail.status,
              bodyText: errMail.bodyText,
              bodyJson: errMail.bodyJson,
            });
            fetchedResidents.push({
              id: mail,
              name: mail,
              relation: '',
              phone: '',
              email: mail,
              badge: '',
              photo: null,
              raw: null,
            });
          }
        }

        const isOwner = (it) => {
          const test = ((it.badge || it.relation || '') + '').toLowerCase();
          return test.includes('propiet');
        };

        fetchedResidents.sort((a, b) => {
          const aOwner = isOwner(a) ? 0 : 1;
          const bOwner = isOwner(b) ? 0 : 1;
          if (aOwner !== bOwner) return aOwner - bOwner; 
          return 0; 
        });

        if (mounted) {
          setResidents(fetchedResidents);
          setResidentCount(fetchedResidents.length);
        }
      } catch (err) {
        console.warn('MiembrosResidence: error en flujo de integracion', err.message || err, {
          status: err.status,
          bodyText: err.bodyText,
          bodyJson: err.bodyJson,
        });
        if (mounted) {
          setResidents([]);
          setResidentCount(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAndResolve();

    return () => {
      mounted = false;
    };
  }, [qrFromParams]);

  const renderItem = ({ item, index }) => {
    const initials = getInitials(item.name);
    const grad = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
    const avatarSize = rf(56);
    const borderRadius = Math.round(avatarSize / 2);

    return (
      <View style={styles.rowWrap}>
        <View style={styles.rowInner}>
          {item.photo ? (
            <Image
              source={{ uri: item.photo }}
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius },
              ]}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius },
              ]}
            >
              <Text style={[styles.avatarInitials, { fontSize: Math.round(rf(18)) }]}>
                {initials}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { fontSize: Math.round(rf(16)) }]} numberOfLines={2}>
                {item.name}
              </Text>

              {item.badge ? (
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badgeText, { fontSize: Math.round(rf(11)) }]}>{item.badge}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.relationText, { fontSize: Math.round(rf(13)) }]}>
              {item.relation}
            </Text>

            <View style={styles.contactRow}>
              <Ionicons
                name="call-outline"
                size={Math.round(rf(14))}
                color="#6b7280"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.contactText, { fontSize: Math.round(rf(13)) }]}>{item.phone}</Text>
            </View>

            <View style={[styles.contactRow, { marginTop: 6 }]}>
              <Ionicons
                name="mail-outline"
                size={Math.round(rf(14))}
                color="#6b7280"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.contactText, { fontSize: Math.round(rf(13)) }]}>{item.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#9F4CFF', '#6A43FF', '#2C7DFF']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={[styles.title, { fontSize: rf(18) }]}>{departmentLabel}</Text>
        <Text style={[styles.subtitle, { fontSize: rf(12) }]}>
          {loading ? 'Cargando residentes...' : `${residentCount} residentes registrados`}
        </Text>
      </LinearGradient>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={residents}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ color: '#374151' }}>
              {loading ? 'Cargando...' : 'No se encontraron residentes.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingTop: 30,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  title: { color: '#fff', fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 36,
    backgroundColor: '#fff',
  },

  rowWrap: { backgroundColor: '#fff' },
  rowInner: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14 },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  avatarInitials: { color: '#fff', fontWeight: '800' },

  info: { flex: 1, paddingRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameText: { color: '#111827', fontWeight: '700', flex: 1 },

  badgeWrap: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderColor: 'rgba(124,58,237,0.2)',
    borderWidth: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#6D28D9', fontWeight: '700' },

  relationText: { color: '#6b7280', marginTop: 6 },

  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { color: '#374151' },

  divider: { height: 1, backgroundColor: '#f1f3f5', marginTop: 12 },
});
