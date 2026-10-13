"use client";

import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Premios } from "@/components/Premios";

export default function PremiosPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#15151E] racing-grid text-[#D0D0D2] flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Premios />
        </main>
      </div>
    </ProtectedRoute>
  );
}
