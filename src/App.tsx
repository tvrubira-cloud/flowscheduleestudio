import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { useClientes } from "@/hooks/useClientes"
import { LoginForm } from "@/components/auth/LoginForm"
import { AppShell } from "@/components/layout/AppShell"

const BookingPage = lazy(() => import("@/pages/BookingPage"))
const ClientePainelPage = lazy(() => import("@/pages/ClientePainelPage"))
const LandingPage = lazy(() => import("@/pages/LandingPage"))

const LoadingScreen = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-primary font-bold animate-pulse">
    Carregando...
  </div>
)

/** Smart root: show app if authenticated, landing page otherwise */
function RootRoute() {
  const { user, authLoading } = useAppStore()
  useAuth()
  useClientes()

  if (authLoading) return <LoadingScreen />
  if (user) return <AppShell />
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LandingPage />
    </Suspense>
  )
}

/** Smart /entrar: redirect to app if already authenticated */
function EntrarRoute() {
  const { user, authLoading } = useAppStore()

  if (authLoading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return <LoginForm />
}

/** Fallback authenticated app (legacy /*) */
function AuthedApp() {
  const { user, authLoading } = useAppStore()
  useAuth()
  useClientes()

  if (authLoading) return <LoadingScreen />
  if (!user) return <LoginForm />
  return <AppShell />
}

export default function App() {
  return (
    <Routes>
      {/* Smart root */}
      <Route path="/" element={<RootRoute />} />

      {/* Auth */}
      <Route path="/entrar" element={<EntrarRoute />} />

      {/* Public booking pages */}
      <Route
        path="/booking/:userId"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <BookingPage />
          </Suspense>
        }
      />
      <Route
        path="/booking/:salonId/painel"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ClientePainelPage />
          </Suspense>
        }
      />

      {/* Fallback authenticated app */}
      <Route path="/*" element={<AuthedApp />} />
    </Routes>
  )
}
