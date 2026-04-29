import {
  Calendar, LayoutDashboard, Users, CreditCard,
  LogOut, BadgeCheck, Zap, ShieldCheck, Settings, BarChart2, Mail, Megaphone,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { useAssinatura } from "@/hooks/useAssinatura"
import { ThemeToggle } from "./ThemeToggle"
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
  { id: "promocoes", label: "Promoções", Icon: Megaphone },
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
        className="w-72 border-r border-white/[0.08] bg-card/20 backdrop-blur-3xl p-8 hidden md:flex flex-col shrink-0 sticky top-0 h-screen"
      >
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <img src="/logo.jpg" alt="" className="w-full h-full rounded-xl object-cover" />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter text-foreground italic uppercase">FlowSchedule</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <nav className="space-y-1.5 flex-grow" aria-label="Menu">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative w-full flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-medium transition-all group ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/20 border border-primary/30 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : ""}`} />
                <span className="relative z-10">{label}</span>
              </button>
            )
          })}
          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`relative w-full flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-medium transition-all group ${
                activeTab === "admin" ? "text-amber-400" : "text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/5"
              }`}
            >
              {activeTab === "admin" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-amber-400/10 border border-amber-400/20 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="relative z-10">Admin</span>
            </button>
          )}
        </nav>

        <div className="mt-8 mb-6">
          {isPro ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass border-primary/20">
              <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground uppercase tracking-widest">Plano Pro</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setActiveTab("financeiro")}
              className="w-full group relative overflow-hidden flex items-center gap-3 px-4 py-4 rounded-2xl premium-gradient text-white shadow-lg glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Zap className="w-5 h-5 shrink-0 animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Evolua seu negócio</p>
                <p className="text-sm font-bold">Assinar Plano PRO</p>
              </div>
            </button>
          )}
        </div>

        <div className="pt-6 border-t border-white/5 space-y-2">
          <a
            href="mailto:suporteflowschedule@gmail.com"
            className="w-full flex items-center gap-4 px-4 h-11 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <Mail className="w-5 h-5" />
            <span>Suporte</span>
          </a>
          <button onClick={sair}
            className="w-full flex items-center gap-4 px-4 h-11 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all">
            <LogOut className="w-5 h-5" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile floating nav ────────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <nav aria-label="Navegação mobile"
          className="glass-card rounded-3xl flex items-center justify-around p-2 shadow-2xl border-white/10">
          {ALL_ITEMS.slice(0, 5).map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id as ActiveTab)}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all flex-1 ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                }`}>
                {isActive && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                  />
                )}
                <Icon className={`w-6 h-6 shrink-0 relative z-10 ${isActive ? "drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : ""}`} />
                <span className="text-[9px] font-bold uppercase tracking-tighter relative z-10">{label}</span>
              </button>
            )
          })}
          <button onClick={sair}
            className="flex flex-col items-center gap-1 p-2 rounded-2xl text-muted-foreground hover:text-destructive transition-all flex-1">
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Sair</span>
          </button>
          <div className="flex items-center px-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </>
  )
}

