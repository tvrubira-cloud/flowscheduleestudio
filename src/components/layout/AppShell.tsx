import { Suspense, lazy } from "react"
import { Sidebar } from "./Sidebar"
import { useAppStore } from "@/store/useAppStore"
import { useAssinatura } from "@/hooks/useAssinatura"
import { Zap, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const ClientesPage = lazy(() => import("@/pages/ClientesPage"))
const FinanceiroPage = lazy(() => import("@/pages/FinanceiroPage"))
const ConfiguracoesPage = lazy(() => import("@/pages/ConfiguracoesPage"))
const AdminPage = lazy(() => import("@/pages/AdminPage"))
const RelatoriosPage = lazy(() => import("@/pages/RelatoriosPage"))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
      Carregando...
    </div>
  )
}

function TrialBanner() {
  const { isAdmin, isTrialing, trialDaysLeft, isPro, loadingAssinatura, hasFullAccess } = useAssinatura()
  const { setActiveTab } = useAppStore()

  if (loadingAssinatura) return null
  if (isAdmin) return null

  // Trial ativo — mostra countdown
  if (isTrialing) {
    const urgent = trialDaysLeft <= 2
    return (
      <div className={`px-4 py-2 flex items-center justify-between gap-4 text-sm
        ${urgent ? "bg-orange-500/15 border-b border-orange-500/20" : "bg-primary/10 border-b border-primary/20"}`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 shrink-0 ${urgent ? "text-orange-400" : "text-primary"}`} />
          <span className={urgent ? "text-orange-300" : "text-primary/90"}>
            {urgent
              ? `⚠️ Seu trial expira em ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"}!`
              : `Trial gratuito: ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restantes`
            }
          </span>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs shrink-0 premium-gradient border-none"
          onClick={() => setActiveTab("financeiro")}
        >
          <Zap className="w-3 h-3 mr-1" /> Assinar Pro
        </Button>
      </div>
    )
  }

  // Trial expirado e sem Pro — banner de bloqueio
  if (!hasFullAccess && !isPro) {
    return (
      <div className="px-4 py-2 flex items-center justify-between gap-4 text-sm bg-red-500/10 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0 text-red-400" />
          <span className="text-red-300">
            Trial expirado — agendamentos limitados a 3/mês no plano gratuito.
          </span>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs shrink-0 bg-red-600 hover:bg-red-700 text-white border-none"
          onClick={() => setActiveTab("financeiro")}
        >
          Assinar Pro
        </Button>
      </div>
    )
  }

  return null
}

export function AppShell() {
  const { activeTab, user } = useAppStore()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <TrialBanner />

      <div className="flex flex-grow overflow-hidden">
        <Sidebar />

        <main id="main-content" className="flex-grow p-4 md:p-10 overflow-y-auto pb-24 md:pb-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Bem-vindo, {user?.email?.split("@")[0] ?? "usuário"}
                </h1>
                <p className="text-muted-foreground">Gerencie seus clientes e agendamentos com IA.</p>
              </div>
            </div>

            <Suspense fallback={<PageLoader />}>
              {activeTab === "dashboard" && <DashboardPage />}
              {activeTab === "clientes" && <ClientesPage />}
              {activeTab === "financeiro" && <FinanceiroPage />}
              {activeTab === "configuracoes" && <ConfiguracoesPage />}
              {activeTab === "relatorios" && <RelatoriosPage />}
              {activeTab === "admin" && <AdminPage />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
