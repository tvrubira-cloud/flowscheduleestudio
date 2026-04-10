import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ExternalLink, MessageSquare, CreditCard, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"
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

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, schedulingDate, schedulingTime, setSchedulingDate, setSchedulingTime } =
    useAppStore()
  const { clientes } = useClientes()
  const { buscarAgendamentos, atualizarStatus, carregando } = useAgendamentosPublicos()

  const [agendamentos, setAgendamentos] = useState<AgendamentoPublico[]>([])
  const [atualizando, setAtualizando] = useState<string | null>(null)

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
    const msg = `Olá ${cliente.nome}, seu agendamento está confirmado para ${schedulingDate} às ${schedulingTime}.`
    const url = `https://wa.me/55${cliente.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank", "noopener,noreferrer")
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

  const pagarPlano = () => {
    window.open("https://pag.ae/81FCjY2jo", "_blank", "noopener,noreferrer")
  }

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
                <CardTitle>Agendar via WhatsApp</CardTitle>
                <CardDescription>
                  Escolha data e hora, depois clique em Agendar para abrir o WhatsApp com a mensagem pronta
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
            <Card className="border-white/5 bg-zinc-900/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Plano Pro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">R$ 49.90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Desbloqueie agendamentos ilimitados e integração total com CRM.
                </p>
                <Button onClick={pagarPlano} className="w-full gap-2">
                  <CreditCard className="w-4 h-4" aria-hidden="true" />
                  Assinar Agora
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-zinc-900/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" aria-hidden="true" />
                  <CardTitle className="text-sm">Aviso via WhatsApp</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Selecione data e hora, depois clique em <strong className="text-foreground">Agendar</strong> — o WhatsApp abre com a mensagem de confirmação já preenchida para você enviar ao cliente.
                </p>
                <p className="text-xs text-muted-foreground border-t border-white/5 pt-2">
                  Lembretes automáticos em breve.
                </p>
              </CardContent>
            </Card>
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
                        <>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                            disabled={atualizando === ag.id}
                            onClick={() => handleStatus(ag.id, "cancelado")}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar
                          </Button>
                        </>
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
