import {
  Calendar, LayoutDashboard, Users, CreditCard,
  LogOut, BadgeCheck, Zap, ShieldCheck, Settings,
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

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", Icon: Users },
  { id: "financeiro", label: "Financeiro", Icon: CreditCard },
  { id: "configuracoes", label: "Configurações", Icon: Settings },
]

export function Sidebar() {
  const { activeTab, setActiveTab, user } = useAppStore()
  const { sair } = useAuth()
  const { isPro } = useAssinatura()

  const isAdmin = !!user?.email && user.email === ADMIN_EMAIL

  return (
    <aside
      aria-label="Navegação principal"
      className="w-64 border-r border-white/5 bg-zinc-950/50 p-6 hidden md:flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-2 text-primary">
        <Calendar className="w-6 h-6" aria-hidden="true" />
        <span className="font-bold text-xl tracking-tight text-foreground">FlowSchedule</span>
      </div>

      {/* Navegação */}
      <nav className="space-y-2 flex-grow" aria-label="Menu">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "ghost"}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? "page" : undefined}
            className="w-full justify-start gap-3 h-11"
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </Button>
        ))}

        {isAdmin && (
          <Button
            variant={activeTab === "admin" ? "default" : "ghost"}
            onClick={() => setActiveTab("admin")}
            aria-current={activeTab === "admin" ? "page" : undefined}
            className="w-full justify-start gap-3 h-11 text-amber-400 hover:text-amber-300"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Admin
          </Button>
        )}
      </nav>

      {/* Badge de plano */}
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
          <button
            onClick={() => setActiveTab("financeiro")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-left"
          >
            <Zap className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-primary">Upgrade Pro</p>
              <p className="text-xs text-muted-foreground">R$ 49.90/mês</p>
            </div>
          </button>
        )}
      </div>

      {/* Sair */}
      <div className="pt-3 border-t border-white/5">
        <Button
          variant="ghost"
          onClick={sair}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive h-11"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
