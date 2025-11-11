// src/auth/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext({
  isLoading: true,
  userToken: null,
  signIn: async () => {},
  signOut: async () => {},
  restoreToken: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // Key que usa tu Login para guardar user id / valid
  const TOKEN_KEY = 'user_usuario_app_id';
  const VALID_KEY = 'user_valid';

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        // intentamos recuperar el id de usuario
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!mounted) return;
        if (token) {
          setUserToken(String(token));
          return;
        }

        // fallback: si guardas `user_valid` como flag
        const valid = await AsyncStorage.getItem(VALID_KEY);
        if (!mounted) return;
        if (valid === 'true' || valid === '1') {
          // valor simbólico: hay sesión "válida"
          setUserToken('valid');
          return;
        }

        // no hay token -> userToken quedará null
        setUserToken(null);
      } catch (err) {
        console.warn('Auth bootstrap error', err);
        setUserToken(null);
      } finally {
        // asegurar que siempre salimos del loading (evita splash bloqueado)
        if (mounted) setIsLoading(false);
      }
    };

    // Si por alguna razón AsyncStorage falla o tarda demasiado, forzamos salida en 6s
    const safety = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 6000);

    bootstrap().finally(() => {
      clearTimeout(safety);
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, []);

  const signIn = async (payload = {}) => {
    try {
      if (payload.usuario_app_id) {
        await AsyncStorage.setItem(TOKEN_KEY, String(payload.usuario_app_id));
        setUserToken(String(payload.usuario_app_id));
      } else if (payload.token) {
        await AsyncStorage.setItem(TOKEN_KEY, String(payload.token));
        setUserToken(String(payload.token));
      } else {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        setUserToken(t);
      }
    } catch (e) {
      console.warn('signIn error', e);
    }
  };

  const signOut = async () => {
    try {
      // elimina keys comunes de sesión (no borres cosas importantes que quieras conservar)
      const allKeys = await AsyncStorage.getAllKeys();
      const tokenNames = [TOKEN_KEY, 'auth_token', 'access_token', 'refresh_token', 'token', VALID_KEY, 'user_valid'];
      const keysToRemove = allKeys.filter(k => tokenNames.includes(k));
      if (keysToRemove.length) await AsyncStorage.multiRemove(keysToRemove);

      setUserToken(null);
      return true;
    } catch (e) {
      console.warn('signOut error', e);
      setUserToken(null);
      return false;
    }
  };

  const restoreToken = async () => {
    try {
      const t = await AsyncStorage.getItem(TOKEN_KEY);
      setUserToken(t);
      return t;
    } catch (e) {
      setUserToken(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, userToken, signIn, signOut, restoreToken }}>
      {children}
    </AuthContext.Provider>
  );
};
