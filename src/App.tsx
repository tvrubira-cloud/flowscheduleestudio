import { lazy, Suspense, useEffect } from "react"
import { Routes, Route } from "react-router-dom"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { useClientes } from "@/hooks/useClientes"
import { LoginForm } from "@/components/auth/LoginForm"
import { AppShell } from "@/components/layout/AppShell"

const BookingPage = lazy(() => import("@/pages/BookingPage"))
const ClientePainelPage = lazy(() => import("@/pages/ClientePainelPage"))

function AuthedApp() {
  const { user, authLoading } = useAppStore()
  useAuth()
  useClientes()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-primary font-bold animate-pulse">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <AppShell />
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/booking/:userId"
        element={
          <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-primary font-bold animate-pulse">
              Carregando...
            </div>
          }>
            <BookingPage />
          </Suspense>
        }
      />
      <Route
        path="/booking/:salonId/painel"
        element={
          <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-primary font-bold animate-pulse">
              Carregando...
            </div>
          }>
            <ClientePainelPage />
          </Suspense>
        }
      />
      <Route path="/*" element={<AuthedApp />} />
    </Routes>
  )
}
