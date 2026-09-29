"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const FirebaseConfigAlert: React.FC = () => {
  const { isConfigured } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isConfigured) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/90 to-amber-900/80 border-b border-amber-600/40 text-amber-200 text-xs sm:text-sm px-4 py-3 shadow-lg backdrop-blur">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start md:items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <span className="font-semibold text-amber-300">
              Firebase no está configurado:
            </span>{" "}
            Para habilitar el inicio de sesión real con Google y sincronizar roles en Firestore, añade tus credenciales en{" "}
            <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-100 font-mono text-xs">
              .env.local
            </code>
            .
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs underline text-amber-300 hover:text-amber-100 font-medium"
          >
            {isExpanded ? "Ocultar pasos" : "¿Cómo configurarlo?"}
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-amber-700/40 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-amber-100/90">
          <div>
            <h4 className="font-semibold text-amber-300 mb-1">
              1. En Firebase Console:
            </h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Crea un proyecto en <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5 text-amber-200 hover:text-white">console.firebase.google.com <ExternalLink className="w-3 h-3" /></a></li>
              <li>Ve a <strong>Authentication</strong> &gt; <strong>Sign-in method</strong> y activa el proveedor <strong>Google</strong>.</li>
              <li>Ve a <strong>Firestore Database</strong> y haz clic en <strong>Crear base de datos</strong> (modo prueba o producción).</li>
              <li>En <strong>Configuración del proyecto</strong> (ícono de engranaje) &gt; <strong>Tus apps</strong>, registra una app Web y copia el objeto <code>firebaseConfig</code>.</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-amber-300 mb-1">
              2. En el archivo .env.local:
            </h4>
            <pre className="bg-black/60 p-2 rounded text-[11px] font-mono text-amber-200 overflow-x-auto">
              NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
              {"\n"}NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-app.firebaseapp.com
              {"\n"}NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-app
              {"\n"}NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-app.appspot.com
              {"\n"}NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
              {"\n"}NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
