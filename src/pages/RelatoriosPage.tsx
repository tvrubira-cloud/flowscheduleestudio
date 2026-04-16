import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart2, Calendar, Users, XCircle, TrendingUp, Zap, Loader2, Clock } from "lucide-react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { useAssinatura } from "@/hooks/useAssinatura"
import { useClientes } from "@/hooks/useClientes"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { AgendamentoPublico } from "@/types"

// ─── Day-of-week labels ───────────────────────────────────────────────────────

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgendamentoPublico["status"] }) {
  const map = {
    pendente: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    confirmado: "bg-green-500/15 text-green-400 border-green-500/20",
    cancelado: "bg-red-500/15 text-red-400 border-red-500/20",
  }
  const label = { pendente: "Pendente", confirmado: "Confirmado", cancelado: "Cancelado" }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[status]}`}>
      {label[status]}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  index: number
}

function StatCard({ icon, label, value, sub, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
    >
      <Card className="border-white/5 bg-zinc-900/20 h-full">
        <CardContent className="pt-5 pb-4 px-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Paywall ─────────────────────────────────────────────────────────────────

function Paywall() {
  const { setActiveTab } = useAppStore()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="border-white/5 bg-zinc-900/20 max-w-md w-full text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <BarChart2 className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Relatórios disponíveis apenas no Plano Pro</CardTitle>
          <CardDescription className="mt-2">
            Acesse métricas detalhadas sobre seus agendamentos, clientes e dias mais movimentados
            fazendo upgrade para o Plano Pro.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <ul className="text-sm text-muted-foreground space-y-2 text-left mb-4">
            {[
              "Agendamentos por mês",
              "Total e histórico de clientes",
              "Taxa de cancelamentos",
              "Dia mais movimentado da semana",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            className="w-full gap-2"
            onClick={() => setActiveTab("financeiro")}
          >
            <Zap className="w-4 h-4" aria-hidden="true" />
            Ver Planos
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const { user } = useAppStore()
  const { isPro, isTrialing, loadingAssinatura } = useAssinatura()
  const { clientes } = useClientes()

  const [agendamentos, setAgendamentos] = useState<AgendamentoPublico[]>([])
  const [carregando, setCarregando] = useState(false)

  const hasFullAccess = isPro || isTrialing

  // ── Derived metrics ────────────────────────────────────────────────────────

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const inicioMesStr = inicioMes.toISOString().slice(0, 10) // "YYYY-MM-DD"

  const agendamentosDoMes = agendamentos.filter((a) => a.data >= inicioMesStr)
  const totalMes = agendamentosDoMes.length
  const canceladosMes = agendamentosDoMes.filter((a) => a.status === "cancelado").length

  // Group by day-of-week (0=Sun..6=Sat)
  const contagemDia = Array<number>(7).fill(0)
  agendamentosDoMes.forEach((a) => {
    const [year, month, day] = a.data.split("-").map(Number)
    const dow = new Date(year, month - 1, day).getDay()
    contagemDia[dow]++
  })
  const maxDia = Math.max(...contagemDia)
  const diaMaisMovimentado = maxDia > 0 ? DIAS[contagemDia.indexOf(maxDia)] : "—"

  // Sorted appointments for table
  const agendamentosOrdenados = [...agendamentosDoMes].sort((a, b) =>
    `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)
  )

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasFullAccess || !user || user.uid === "demo-user" || !isFirebaseConfigured || !db) return

    const buscar = async () => {
      setCarregando(true)
      try {
        const q = query(
          collection(db!, "agendamentos_publicos"),
          where("userId", "==", user.uid),
          where("data", ">=", inicioMesStr),
        )
        const snap = await getDocs(q)
        const lista: AgendamentoPublico[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<AgendamentoPublico, "id">),
        }))
        setAgendamentos(lista)
      } catch (err) {
        console.error("[RelatoriosPage] buscar:", err)
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [user, hasFullAccess])

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loadingAssinatura) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Carregando...
      </div>
    )
  }

  // ── Paywall ────────────────────────────────────────────────────────────────

  if (!hasFullAccess) {
    return <Paywall />
  }

  // ── Pro view ───────────────────────────────────────────────────────────────

  const mesAtual = agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <motion.div
      key="relatorios"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-bold capitalize">Relatórios — {mesAtual}</h2>
          <p className="text-sm text-muted-foreground">Métricas do mês atual</p>
        </div>
      </div>

      {/* Stat cards — 2 cols mobile, 4 cols desktop */}
      {carregando ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Buscando dados...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              index={0}
              icon={<Calendar className="w-5 h-5" />}
              label="Agendamentos"
              value={totalMes}
              sub="este mês"
            />
            <StatCard
              index={1}
              icon={<Users className="w-5 h-5" />}
              label="Clientes"
              value={clientes.length}
              sub="total cadastrado"
            />
            <StatCard
              index={2}
              icon={<XCircle className="w-5 h-5" />}
              label="Cancelamentos"
              value={canceladosMes}
              sub="este mês"
            />
            <StatCard
              index={3}
              icon={<TrendingUp className="w-5 h-5" />}
              label="Dia mais ativo"
              value={diaMaisMovimentado}
              sub={maxDia > 0 ? `${maxDia} agendamento${maxDia === 1 ? "" : "s"}` : undefined}
            />
          </div>

          {/* Appointments table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.35 }}
          >
            <Card className="border-white/5 bg-zinc-900/20">
              <CardHeader>
                <CardTitle>Agendamentos do mês</CardTitle>
                <CardDescription>
                  {agendamentosOrdenados.length === 0
                    ? "Nenhum agendamento registrado este mês."
                    : `${agendamentosOrdenados.length} agendamento${agendamentosOrdenados.length === 1 ? "" : "s"} ordenados por data`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agendamentosOrdenados.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                    Nenhum agendamento este mês
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agendamentosOrdenados.map((ag) => (
                      <div
                        key={ag.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            aria-hidden="true"
                            className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 text-sm"
                          >
                            {ag.clienteNome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{ag.clienteNome}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                              {ag.data.split("-").reverse().join("/")} às {ag.hora}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={ag.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
