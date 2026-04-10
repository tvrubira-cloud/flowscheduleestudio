import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { useClientes } from "@/hooks/useClientes"
import { LoginForm } from "@/components/auth/LoginForm"
import { AppShell } from "@/components/layout/AppShell"

export default function App() {
  const { user, authLoading } = useAppStore()
  const { entrarDemo } = useAuth()
  const { carregarClientes } = useClientes()

  useEffect(() => {
    if (user && user.uid !== "demo-user") {
      carregarClientes(user.uid)
    }
  }, [user, carregarClientes])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-primary font-bold animate-pulse">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <LoginForm onDemoLogin={entrarDemo} />
  }

  return <AppShell />
}
