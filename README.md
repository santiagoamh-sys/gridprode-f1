# 🏎️ GridProde F1 — Aplicación Web

Estructura inicial de la plataforma de predicciones para Fórmula 1 desarrollada con **Next.js (App Router, TypeScript, Tailwind CSS)** y **Firebase (Authentication & Cloud Firestore)**.

---

## 🚀 Características Principales

- **Autenticación Exclusiva con Google**: Los usuarios inician sesión rápida y seguramente a través del botón oficial de Google Sign-In (`signInWithPopup`).
- **Gestión de Roles**:
  - **`Participante`**: Rol predeterminado otorgado de forma automática a todo nuevo usuario.
  - **`Administrador`**: Rol especial con privilegios para administrar carreras, cargar resultados oficiales y auditar la tabla de puntos.
- **Redirección y Protección de Rutas**:
  - `/login`: Vista de inicio de sesión temática con diseño de carreras F1.
  - `/dashboard`: Panel de control protegido con visualización del perfil, badge de rol y tarjetas modulares vacías preparadas para los próximos componentes.
  - Rutas automáticas: Si el usuario ya está autenticado, `/login` y `/` redirigen a `/dashboard`; si no tiene sesión activa, `/dashboard` redirige a `/login`.
- **Diseño Responsivo y Temático**: Estética oscura con paleta inspirada en la Fórmula 1 (carbono, acentos rojo carrera y dorado).

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Clonar / Navegar al proyecto e instalar dependencias

```bash
cd GridProde_F1
npm install
```

### 2. Configuración de Firebase

1. Ingresa a [Firebase Console](https://console.firebase.google.com/) y crea un nuevo proyecto (ej. `GridProde-F1`).
2. **Habilitar Autenticación con Google**:
   - Ve a **Authentication** > pestaña **Sign-in method**.
   - Haz clic en **Google**, actívalo y guarda.
3. **Habilitar Cloud Firestore**:
   - Ve a **Firestore Database** y haz clic en **Crear base de datos**.
   - Puedes comenzar en modo de prueba (`test mode`) para desarrollo.
4. **Obtener las credenciales web**:
   - En la configuración del proyecto (ícono de engranaje ⚙️) > **General** > **Tus apps**, haz clic en el icono Web `</>`.
   - Registra tu aplicación y copia los valores del objeto `firebaseConfig`.
5. **Configurar el archivo `.env.local`**:
   - Duplica o edita `.env.local` y completa los valores:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Lista opcional de correos que recibirán automáticamente el rol de Administrador al loguearse:
NEXT_PUBLIC_INITIAL_ADMIN_EMAILS=tu-email@gmail.com,otro-admin@gridprode.com
```

### 3. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 👥 Cómo Asignar el Rol de Administrador

Existen dos métodos para convertir a un usuario en **Administrador**:

1. **Vía Variable de Entorno**:
   Añade su correo en `NEXT_PUBLIC_INITIAL_ADMIN_EMAILS` dentro de `.env.local`:
   ```env
   NEXT_PUBLIC_INITIAL_ADMIN_EMAILS=tu-email@gmail.com
   ```
   Al iniciar sesión con Google por primera vez, el sistema le asignará el rol de `'Administrador'`.

2. **Vía Firebase Firestore Console**:
   - Ve a la colección `users` en tu base de datos Firestore.
   - Selecciona el documento del usuario (su `uid`).
   - Modifica el campo `role` de `"Participante"` a `"Administrador"`.
   - Al recargar el Dashboard, el usuario verá actualizado su badge y el panel administrativo.

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── layout.tsx              # Proveedor de autenticación y alertas globales
│   ├── page.tsx                # Redirección inteligente raíz (/login o /dashboard)
│   ├── globals.css             # Estilos de Tailwind con tema oscuro F1
│   ├── login/
│   │   └── page.tsx            # Vista de login con Google Sign-In
│   └── dashboard/
│       └── page.tsx            # Panel de control protegido
├── components/
│   ├── Navbar.tsx              # Barra de navegación con usuario y logout
│   ├── RoleBadge.tsx           # Badge distintivo de rol
│   ├── ProtectedRoute.tsx      # Envoltorio de protección de rutas privadas
│   └── FirebaseConfigAlert.tsx # Banner informativo de configuración de Firebase
├── context/
│   └── AuthContext.tsx         # Contexto de autenticación en React
├── lib/
│   └── firebase/
│       ├── config.ts           # Inicialización de Firebase App, Auth y Firestore
│       └── authService.ts      # Lógica de Google Sign-In y sincronización de Firestore
└── types/
    └── auth.ts                 # Tipos TypeScript (UserProfile, UserRole)
```
