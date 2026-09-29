"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import {
  signInWithGoogle as authSignInWithGoogle,
  logOut as authLogOut,
  getUserProfile,
  syncUserProfile,
} from "@/lib/firebase/authService";
import { actualizarFavoritosUsuario } from "@/lib/firebase/f1Service";
import { UserProfile, UserRole } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateFavorites: (
    pilotoId: string | null,
    escuderiaId: string | null
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  isConfigured: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  updateFavorites: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      const p = await getUserProfile(user.uid);
      if (p) {
        setProfile(p);
      } else {
        const synced = await syncUserProfile(user);
        setProfile(synced);
      }
    } catch (err) {
      console.error("Error al refrescar perfil:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          let p = await getUserProfile(currentUser.uid);
          if (!p) {
            p = await syncUserProfile(currentUser);
          }
          setProfile(p);
        } catch (err) {
          console.error("Error al cargar perfil tras cambio de estado auth:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const { user: loggedInUser, profile: loggedInProfile } =
        await authSignInWithGoogle();
      setUser(loggedInUser);
      setProfile(loggedInProfile);
    } catch (error) {
      console.error("Error en Google Sign-In:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authLogOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateFavorites = async (
    pilotoId: string | null,
    escuderiaId: string | null
  ) => {
    if (!user) return;
    await actualizarFavoritosUsuario(user.uid, pilotoId, escuderiaId);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            piloto_favorito_id: pilotoId,
            escuderia_favorita_id: escuderiaId,
          }
        : null
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        isConfigured: isFirebaseConfigured,
        loginWithGoogle,
        logout,
        refreshProfile,
        updateFavorites,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
