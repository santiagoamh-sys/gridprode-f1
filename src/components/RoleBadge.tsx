import React from "react";
import { UserRole } from "@/types/auth";
import { ShieldCheck, Flag } from "lucide-react";

interface RoleBadgeProps {
  role?: UserRole | null;
  className?: string;
  size?: "sm" | "md";
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role = "Participante",
  className = "",
  size = "md",
}) => {
  const isAdmin = role === "Administrador";

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : "px-3 py-1 text-xs sm:text-sm gap-1.5";

  if (isAdmin) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 tracking-wide uppercase shadow-[0_0_12px_rgba(245,158,11,0.15)] ${sizeClasses} ${className}`}
      >
        <ShieldCheck className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span>Administrador</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border border-red-500/30 bg-red-500/10 text-red-400 tracking-wide uppercase ${sizeClasses} ${className}`}
    >
      <Flag className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      <span>Participante</span>
    </span>
  );
};
