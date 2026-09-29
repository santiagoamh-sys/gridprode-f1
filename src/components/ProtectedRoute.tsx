"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Trophy, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowIncompleteProfile?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteProfile = false,
}) => {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (
        !allowIncompleteProfile &&
        (!profile?.piloto_favorito_id || !profile?.escuderia_favorita_id)
      ) {
        // Redirigir obligatoriamente a completar perfil antes de acceder al Dashboard
        router.replace("/completar-perfil");
      }
    }
  }, [user, profile, loading, router, allowIncompleteProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#15151E] flex flex-col items-center justify-center text-[#D0D0D2]">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E10600] shadow-[0_0_30px_rgba(225,6,0,0.4)] mb-4 animate-pulse">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-[#8E8E93] text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#E10600]" />
          <span>Verificando sesión y perfil...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (
    !allowIncompleteProfile &&
    (!profile?.piloto_favorito_id || !profile?.escuderia_favorita_id)
  ) {
    return null;
  }

  return <>{children}</>;
};
