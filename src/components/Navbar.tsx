"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import {
  LogOut,
  User as UserIcon,
  Loader2,
  Trophy,
  LayoutDashboard,
  Ticket,
  Medal,
  ShieldAlert,
} from "lucide-react";

export function isEmailInInitialAdmins(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAILS || "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin =
    profile?.role === "Administrador" || isEmailInInitialAdmins(user?.email);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const navLinks = [
    {
      href: "/dashboard",
      label: "Calendario",
      icon: LayoutDashboard,
    },
    {
      href: "/mis-pronosticos",
      label: "Mis Pronósticos",
      icon: Ticket,
    },
    {
      href: "/ranking",
      label: "Ranking",
      icon: Medal,
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Admin",
            icon: ShieldAlert,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2D2D38] bg-[#15151E]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Marca / Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-white text-base">
                GRID<span className="text-[#E10600]">PRODE</span>
              </span>
              <span className="bg-[#E10600]/20 border border-[#E10600]/30 text-[#E10600] text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                F1
              </span>
            </div>
            <p className="text-[10px] text-[#8E8E93] tracking-wider uppercase font-medium hidden sm:block">
              Predicciones de Fórmula 1
            </p>
          </div>
        </Link>

        {/* Enlaces de Navegación */}
        {user && (
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.35)]"
                      : "text-[#D0D0D2] hover:text-white hover:bg-[#1F1F27] border border-transparent hover:border-[#2D2D38]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Panel de usuario y acciones */}
        {user && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:block">
              <RoleBadge role={isAdmin ? "Administrador" : profile?.role} size="sm" />
            </div>

            <div className="flex items-center gap-2.5 pl-3 border-l border-[#2D2D38]">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Usuario"}
                  className="w-8 h-8 rounded-full ring-2 ring-[#E10600]/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1F1F27] ring-1 ring-white/10 flex items-center justify-center text-[#D0D0D2]">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}

              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">
                  {profile?.nombre || user.displayName || "Usuario"}
                </p>
                <p className="text-[10px] text-[#8E8E93] truncate max-w-[130px]">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Cerrar sesión"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#D0D0D2] bg-[#1F1F27] hover:bg-red-950/40 hover:text-[#E10600] border border-[#2D2D38] hover:border-[#E10600]/40 transition-colors disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
