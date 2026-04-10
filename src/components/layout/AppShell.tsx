import { Suspense, lazy } from "react"
import { Sidebar } from "./Sidebar"
import { useAppStore } from "@/store/useAppStore"

const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const ClientesPage = lazy(() => import("@/pages/ClientesPage"))
const FinanceiroPage = lazy(() => import("@/pages/FinanceiroPage"))
const AdminPage = lazy(() => import("@/pages/AdminPage"))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
      Carregando...
    </div>
  )
}

export function AppShell() {
  const { activeTab, user } = useAppStore()

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <Sidebar />

      <main id="main-content" className="flex-grow p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Bem-vindo, {user?.email?.split("@")[0] ?? "usuário"}
              </h1>
              <p className="text-muted-foreground">Gerencie seus clientes e agendamentos com IA.</p>
            </div>
          </div>

          {/* Pages */}
          <Suspense fallback={<PageLoader />}>
            {activeTab === "dashboard" && <DashboardPage />}
            {activeTab === "clientes" && <ClientesPage />}
            {activeTab === "financeiro" && <FinanceiroPage />}
            {activeTab === "admin" && <AdminPage />}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
