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
  Home,
  Ticket,
  Medal,
  Award,
  Gamepad2,
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
      href: "/inicio",
      label: "Inicio",
      mobileLabel: "Inicio",
      icon: Home,
    },
    {
      href: "/mis-pronosticos",
      label: "Pronósticos",
      mobileLabel: "Pronósticos",
      icon: Ticket,
    },
    {
      href: "/ranking",
      label: "Leaderboard",
      mobileLabel: "Leaderboard",
      icon: Medal,
    },
    {
      href: "/premios",
      label: "Premios",
      mobileLabel: "Premios",
      icon: Award,
    },
    {
      href: "/minijuegos",
      label: "Minijuegos",
      mobileLabel: "Juegos",
      icon: Gamepad2,
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Admin",
            mobileLabel: "Admin",
            icon: ShieldAlert,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* ================================================================= */}
      {/* 1. BARRA SUPERIOR (TOP BAR) MINIMALISTA EN MÓVIL Y EXPANDIDA EN PC */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#15151E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Extremo Izquierdo: Marca / Logo */}
          <Link href="/inicio" className="flex items-center gap-3 shrink-0 group">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.35)] group-hover:scale-105 transition-transform">
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

          {/* Centro (Solo PC - hidden md:flex): Enlaces de Navegación con gap amplio */}
          {user && (
            <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`) ||
                  (item.href === "/inicio" && pathname === "/dashboard");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative inline-flex items-center gap-2 py-2 text-sm font-bold transition-all whitespace-nowrap group ${
                      isActive
                        ? "text-white"
                        : "text-[#8E8E93] hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-[#E10600] drop-shadow-[0_0_8px_rgba(225,6,0,0.6)]"
                          : "text-[#8E8E93] group-hover:text-[#E10600]"
                      }`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#E10600] shadow-[0_0_10px_rgba(225,6,0,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Extremo Derecho: Avatar del usuario y botón de cerrar sesión */}
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden lg:block">
                <RoleBadge
                  role={isAdmin ? "Administrador" : profile?.role}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-2.5 pl-0 sm:pl-3 sm:border-l border-[#2D2D38]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Usuario"}
                    className="w-8 h-8 rounded-full ring-2 ring-[#E10600]/50 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1F1F27] ring-1 ring-white/15 flex items-center justify-center text-[#D0D0D2]">
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

      {/* ================================================================= */}
      {/* 2. NAVEGACIÓN MÓVIL (BOTTOM TAB BAR - Solo visible en < md)       */}
      {/* ================================================================= */}
      {user && (
        <nav
          aria-label="Navegación principal móvil"
          className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-[#15151E]/85 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.65)]"
        >
          <div className="flex items-center justify-around h-16 px-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/inicio" && pathname === "/dashboard");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                    isActive
                      ? "text-[#E10600]"
                      : "text-[#8E8E93] hover:text-[#D0D0D2]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 w-8 h-0.5 rounded-b-full bg-[#E10600] shadow-[0_0_10px_rgba(225,6,0,0.9)]" />
                  )}
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive
                        ? "text-[#E10600] scale-110 drop-shadow-[0_0_8px_rgba(225,6,0,0.6)]"
                        : "text-[#8E8E93]"
                    }`}
                  />
                  <span
                    className={`text-xs leading-none tracking-tight ${
                      isActive ? "font-bold text-white" : "font-medium text-[#8E8E93]"
                    }`}
                  >
                    {item.mobileLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
