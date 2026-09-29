"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Trophy,
  Flag,
  ShieldCheck,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const { user, profile, loading, isConfigured, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirigir según el estado del perfil
  useEffect(() => {
    if (!loading && user) {
      if (!profile?.piloto_favorito_id || !profile?.escuderia_favorita_id) {
        router.replace("/completar-perfil");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, profile, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null);
      setSigningIn(true);
      await loginWithGoogle();
      // AuthContext actualizará el perfil y useEffect se encargará de la redirección
    } catch (err: any) {
      console.error("Error al iniciar sesión:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMessage("La ventana de inicio de sesión de Google se cerró antes de completar la autenticación.");
      } else if (err.code === "auth/popup-blocked") {
        setErrorMessage("Tu navegador bloqueó la ventana emergente. Por favor, permítela e intenta de nuevo.");
      } else if (err.code === "auth/unauthorized-domain") {
        setErrorMessage("El dominio actual no está autorizado en la consola de Firebase. Agrégalo en Authentication > Settings > Authorized domains.");
      } else if (!isConfigured) {
        setErrorMessage("Firebase no está configurado. Por favor, añade tus credenciales en el archivo .env.local.");
      } else {
        setErrorMessage(
          err.message || "Ocurrió un error al iniciar sesión con Google. Inténtalo de nuevo."
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#15151E] flex flex-col items-center justify-center text-[#D0D0D2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E10600]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15151E] racing-grid relative flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Sutil halo decorativo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E10600]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Tarjeta Principal Dark Racing */}
        <div className="bg-[#1F1F27] border border-[#2D2D38] rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Cabecera / Identidad F1 */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E10600] text-white shadow-[0_0_25px_rgba(225,6,0,0.4)] mb-4">
              <Trophy className="w-8 h-8 text-white" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#1F1F27] flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-black fill-current" />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                GRID<span className="text-[#E10600]">PRODE</span>
              </h1>
              <span className="bg-[#E10600]/20 border border-[#E10600]/40 text-[#E10600] text-xs font-bold px-2 py-0.5 rounded tracking-wider">
                F1
              </span>
            </div>
            <p className="text-xs text-[#8E8E93] max-w-xs">
              Tu plataforma minimalista de predicciones para cada Gran Premio del campeonato mundial.
            </p>
          </div>

          {/* Mensaje de Error si ocurre */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-[#E10600]/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Sección de Autenticación Exclusiva con Google */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="w-full relative flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-semibold text-sm text-[#15151E] bg-[#F5F5F7] hover:bg-white active:scale-[0.99] transition-all duration-150 shadow-md disabled:opacity-60 disabled:pointer-events-none"
            >
              {signingIn ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>
                {signingIn ? "Autenticando..." : "Continuar con Google"}
              </span>
            </button>

            <p className="text-[11px] text-center text-[#8E8E93]">
              Acceso exclusivo mediante tu cuenta oficial de Google.
            </p>
          </div>

          {/* Roles en estética Dark Racing */}
          <div className="mt-8 pt-6 border-t border-[#2D2D38] space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-[#D0D0D2]">
              <div className="w-5 h-5 rounded-md bg-[#E10600]/10 border border-[#E10600]/30 flex items-center justify-center shrink-0">
                <Flag className="w-3 h-3 text-[#E10600]" />
              </div>
              <span>
                <strong className="text-white">Rol Participante:</strong> Carga tus pronósticos y compite en el ranking.
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-[#D0D0D2]">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
              </div>
              <span>
                <strong className="text-white">Rol Administrador:</strong> Gestiona carreras y resultados oficiales.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#8E8E93]">
          GridProde F1 &bull; Dark Racing Minimalista
        </div>
      </div>
    </div>
  );
}
