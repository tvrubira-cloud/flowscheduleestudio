import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ExternalLink, CreditCard, CheckCircle, XCircle, Clock, Loader2, X, ChevronRight, Zap, Link2, Copy, Share2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store/useAppStore"
import { useClientes } from "@/hooks/useClientes"
import { useAgendamentosPublicos } from "@/hooks/useAgendamentosPublicos"
import { agendamentoSchema } from "@/lib/validations"
import type { Cliente, AgendamentoPublico } from "@/types"
import toast from "react-hot-toast"

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

// ─── Memoized client row ──────────────────────────────────────────────────────

interface ClienteRowProps {
  cliente: Cliente
  onAgendar: (c: Cliente) => void
}

const ClienteRow = React.memo(function ClienteRow({ cliente, onAgendar }: ClienteRowProps) {
  return (
    <motion.div
      whileHover={{ x: 5 }}
      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group transition-all hover:bg-white/10"
    >
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold"
        >
          {cliente.nome.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{cliente.nome}</p>
          <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onAgendar(cliente)}
        className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Agendar para ${cliente.nome}`}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Agendar
      </Button>
    </motion.div>
  )
})

// ─── Card: link público ───────────────────────────────────────────────────────

function LinkPublicoCard({ userId }: { userId?: string }) {
  const link = userId ? `${window.location.origin}/booking/${userId}` : ""
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const compartilhar = async () => {
    if (!link) return
    if (navigator.share) {
      await navigator.share({ title: "Agende seu horário", url: link })
    } else {
      await copiar()
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Seu link de agendamento
        </CardTitle>
        <CardDescription className="text-xs">
          Compartilhe com seus clientes para receberem agendamentos 24h por dia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
            {link || "Carregando..."}
          </span>
          <button
            onClick={copiar}
            className="shrink-0 text-muted-foreground hover:text-white transition-colors"
            aria-label="Copiar link"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        {copiado && (
          <p className="text-xs text-green-400 text-center">Link copiado!</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-white/10" onClick={copiar}>
            <Copy className="w-3 h-3" /> Copiar link
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 premium-gradient border-none" onClick={compartilhar}>
            <Share2 className="w-3 h-3" /> Compartilhar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, schedulingDate, schedulingTime, setSchedulingDate, setSchedulingTime, setActiveTab } =
    useAppStore()
  const { clientes } = useClientes()
  const { buscarAgendamentos, atualizarStatus, carregando } = useAgendamentosPublicos()

  const [agendamentos, setAgendamentos] = useState<AgendamentoPublico[]>([])
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [onboardingFechado, setOnboardingFechado] = useState<boolean>(
    () => localStorage.getItem("onboarding_fechado") === "true"
  )

  const linkPublico = `${window.location.origin}/booking/${user?.uid ?? "demo"}`

  useEffect(() => {
    if (!user || user.uid === "demo-user") return
    buscarAgendamentos(user.uid).then(setAgendamentos)
  }, [user])

  const criarAgendamento = (cliente: Cliente) => {
    const result = agendamentoSchema.safeParse({ data: schedulingDate, hora: schedulingTime })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }
    toast.success(`Agendamento registrado para ${cliente.nome} em ${schedulingDate} às ${schedulingTime}.`)
  }

  const handleStatus = async (id: string, status: AgendamentoPublico["status"]) => {
    setAtualizando(id)
    try {
      await atualizarStatus(id, status)
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      )
      toast.success(status === "confirmado" ? "Agendamento confirmado!" : "Agendamento cancelado.")
    } catch {
      toast.error("Erro ao atualizar status.")
    } finally {
      setAtualizando(null)
    }
  }

  const pagarPlano = () => setActiveTab("financeiro")

  // Ordena por data e hora
  const agendamentosOrdenados = [...agendamentos].sort((a, b) => {
    const da = `${a.data} ${a.hora}`
    const db2 = `${b.data} ${b.hora}`
    return da.localeCompare(db2)
  })

  const pendentes = agendamentosOrdenados.filter((a) => a.status === "pendente").length

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* ── Onboarding checklist ─────────────────────────────────────── */}
        {!onboardingFechado && clientes.length === 0 && agendamentos.length === 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-base">Primeiros passos</CardTitle>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Fechar checklist de primeiros passos"
                onClick={() => {
                  localStorage.setItem("onboarding_fechado", "true")
                  setOnboardingFechado(true)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[
                {
                  num: 1,
                  label: "Configure seus horários",
                  action: () => setActiveTab("configuracoes"),
                },
                {
                  num: 2,
                  label: "Compartilhe seu link de agendamento",
                  action: () =>
                    navigator.clipboard
                      .writeText(linkPublico)
                      .then(() => toast.success("Link copiado!"))
                      .catch(() => toast.error("Não foi possível copiar o link.")),
                },
                {
                  num: 3,
                  label: "Adicione seu primeiro cliente",
                  action: () => setActiveTab("clientes"),
                },
              ].map(({ num, label, action }) => (
                <button
                  key={num}
                  onClick={action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left group"
                >
                  <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {num}
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" aria-hidden="true" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Link público ──────────────────────────────────────────────── */}
        <Card className="glass border-white/5 p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">
              Link Público de Agendamento
            </p>
            <p className="text-sm text-blue-400 font-mono truncate">{linkPublico}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => window.open(linkPublico, "_blank", "noopener,noreferrer")}
            aria-label="Abrir link público"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* ── Lista de clientes / agendar ─────────────────────────────── */}
          <Card className="md:col-span-2 border-white/5 bg-zinc-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Novo Agendamento</CardTitle>
                <CardDescription>
                  Selecione o cliente, data e horário para registrar um agendamento
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label htmlFor="sched-date" className="text-xs font-bold text-muted-foreground uppercase">
                    Data
                  </label>
                  <Input
                    id="sched-date"
                    type="date"
                    value={schedulingDate}
                    onChange={(e) => setSchedulingDate(e.target.value)}
                    className="bg-zinc-900/50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sched-time" className="text-xs font-bold text-muted-foreground uppercase">
                    Hora
                  </label>
                  <Input
                    id="sched-time"
                    type="time"
                    value={schedulingTime}
                    onChange={(e) => setSchedulingTime(e.target.value)}
                    className="bg-zinc-900/50"
                  />
                </div>
              </div>

              <div className="space-y-2" role="list" aria-label="Lista de clientes">
                {clientes.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                    Nenhum cliente cadastrado ainda
                  </div>
                ) : (
                  clientes.map((c) => (
                    <div key={c.id} role="listitem">
                      <ClienteRow cliente={c} onAgendar={criarAgendamento} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Sidebar cards ────────────────────────────────────────────── */}
          <div className="space-y-6">
            <LinkPublicoCard userId={user?.uid} />

          </div>
        </div>

        {/* ── Agendamentos pelo link público ────────────────────────────── */}
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                Agendamentos pelo Link Público
                {pendentes > 0 && (
                  <span className="text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                    {pendentes} pendente{pendentes > 1 ? "s" : ""}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Clientes que agendaram pelo seu link público
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : agendamentosOrdenados.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                Nenhum agendamento pelo link público ainda
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentosOrdenados.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        aria-hidden="true"
                        className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0"
                      >
                        {ag.clienteNome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{ag.clienteNome}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{ag.clienteTelefone}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ag.data.split("-").reverse().join("/")} às {ag.hora}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={ag.status} />
                      {ag.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-1"
                          disabled={atualizando === ag.id}
                          onClick={() => handleStatus(ag.id, "confirmado")}
                        >
                          {atualizando === ag.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />
                          }
                          Confirmar
                        </Button>
                      )}
                      {ag.status !== "cancelado" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                          disabled={atualizando === ag.id}
                          onClick={() => handleStatus(ag.id, "cancelado")}
                        >
                          {atualizando === ag.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
