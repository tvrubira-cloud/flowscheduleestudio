import {
  Calendar, LayoutDashboard, Users, CreditCard,
  LogOut, BadgeCheck, Zap, ShieldCheck, Settings, BarChart2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { useAssinatura } from "@/hooks/useAssinatura"
import type { ActiveTab } from "@/types"

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? ""

interface NavItem {
  id: ActiveTab
  label: string
  Icon: typeof Calendar
}

const BASE_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", Icon: Users },
  { id: "financeiro", label: "Financeiro", Icon: CreditCard },
  { id: "configuracoes", label: "Config", Icon: Settings },
]

const RELATORIOS_ITEM: NavItem = { id: "relatorios", label: "Relatórios", Icon: BarChart2 }

export function Sidebar() {
  const { activeTab, setActiveTab, user } = useAppStore()
  const { sair } = useAuth()
  const { isPro, isTrialing } = useAssinatura()

  const hasFullAccess = isPro || isTrialing
  const NAV_ITEMS = hasFullAccess
    ? [...BASE_NAV_ITEMS, RELATORIOS_ITEM]
    : BASE_NAV_ITEMS

  const isAdmin = !!user?.email && user.email === ADMIN_EMAIL
  const ALL_ITEMS = isAdmin ? [...NAV_ITEMS, { id: "admin" as ActiveTab, label: "Admin", Icon: ShieldCheck }] : NAV_ITEMS

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        aria-label="Navegação principal"
        className="w-64 border-r border-white/[0.06] bg-black/40 backdrop-blur-xl p-6 hidden md:flex flex-col shrink-0"
      >
        <div className="flex items-center gap-3 mb-10 px-2 text-primary">
          <Calendar className="w-6 h-6" aria-hidden="true" />
          <span className="font-bold text-xl tracking-tight text-foreground">FlowSchedule</span>
        </div>

        <nav className="space-y-2 flex-grow" aria-label="Menu">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <Button key={id} variant={activeTab === id ? "default" : "ghost"}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className="w-full justify-start gap-3 h-11">
              <Icon className="w-4 h-4" aria-hidden="true" />{label}
            </Button>
          ))}
          {isAdmin && (
            <Button variant={activeTab === "admin" ? "default" : "ghost"}
              onClick={() => setActiveTab("admin")}
              aria-current={activeTab === "admin" ? "page" : undefined}
              className="w-full justify-start gap-3 h-11 text-amber-400 hover:text-amber-300">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />Admin
            </Button>
          )}
        </nav>

        <div className="mt-4 mb-3">
          {isPro ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <BadgeCheck className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-green-400">Plano Pro</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setActiveTab("financeiro")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-left">
              <Zap className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-primary">Upgrade Pro</p>
                <p className="text-xs text-muted-foreground">R$ 49.90/mês</p>
              </div>
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-white/5">
          <Button variant="ghost" onClick={sair}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive h-11">
            <LogOut className="w-4 h-4" aria-hidden="true" />Sair
          </Button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav aria-label="Navegação mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2 py-1 safe-area-pb">
        {ALL_ITEMS.slice(0, 5).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as ActiveTab)}
            aria-current={activeTab === id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0 flex-1 ${
              activeTab === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none truncate w-full text-center">{label}</span>
          </button>
        ))}
        <button onClick={sair}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-muted-foreground hover:text-destructive transition-colors min-w-0 flex-1">
          <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">Sair</span>
        </button>
      </nav>
    </>
  )
}
