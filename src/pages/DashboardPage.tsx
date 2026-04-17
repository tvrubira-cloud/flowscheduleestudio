import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ExternalLink, CreditCard, CheckCircle, XCircle, Clock, Loader2, X, ChevronRight, Zap, Link2, Copy, Pencil, Trash2 } from "lucide-react"
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

  const compartilharWhatsApp = () => {
    if (!link) return
    const texto = `Olá! Agora você pode agendar seu horário online 24h por dia pelo link: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer")
  }

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden relative h-full">
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
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white border-none" onClick={compartilharWhatsApp}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
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
  const { buscarAgendamentos, atualizarStatus, editarAgendamento, deletarAgendamento, carregando } = useAgendamentosPublicos()

  const [agendamentos, setAgendamentos] = useState<AgendamentoPublico[]>([])
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [editando, setEditando] = useState<AgendamentoPublico | null>(null)
  const [editData, setEditData] = useState("")
  const [editHora, setEditHora] = useState("")
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)
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

  const abrirEdicao = (ag: AgendamentoPublico) => {
    setEditando(ag)
    setEditData(ag.data)
    setEditHora(ag.hora)
  }

  const salvarEdicao = async () => {
    if (!editando) return
    setSalvandoEdicao(true)
    try {
      await editarAgendamento(editando.id, editData, editHora)
      setAgendamentos((prev) =>
        prev.map((a) => a.id === editando.id ? { ...a, data: editData, hora: editHora } : a)
      )
      toast.success("Agendamento atualizado!")
      setEditando(null)
    } catch {
      toast.error("Erro ao atualizar agendamento.")
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const confirmarExclusao = async (id: string) => {
    try {
      await deletarAgendamento(id)
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
      toast.success("Agendamento excluído.")
    } catch {
      toast.error("Erro ao excluir agendamento.")
    } finally {
      setConfirmandoExclusao(null)
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

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
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
          <div className="flex flex-col">
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
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      <StatusBadge status={ag.status} />
                      {ag.status === "pendente" && (
                        <Button size="sm" variant="ghost"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-1"
                          disabled={atualizando === ag.id}
                          onClick={() => handleStatus(ag.id, "confirmado")}
                        >
                          {atualizando === ag.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Confirmar
                        </Button>
                      )}
                      {ag.status !== "cancelado" && (
                        <Button size="sm" variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                          disabled={atualizando === ag.id}
                          onClick={() => handleStatus(ag.id, "cancelado")}
                        >
                          {atualizando === ag.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Cancelar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => abrirEdicao(ag)}
                        aria-label="Editar agendamento"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {confirmandoExclusao === ag.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-7 px-2"
                            onClick={() => setConfirmandoExclusao(null)}>Não</Button>
                          <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white h-7 px-2"
                            onClick={() => confirmarExclusao(ag.id)}>Excluir</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setConfirmandoExclusao(ag.id)}
                          aria-label="Excluir agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Modal editar agendamento ──────────────────────────────────── */}
      <AnimatePresence>
        {editando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditando(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div>
                  <h2 className="text-sm font-bold">Editar Agendamento</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{editando.clienteNome}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditando(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Data</label>
                    <Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} className="bg-zinc-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Hora</label>
                    <Input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} className="bg-zinc-800" />
                  </div>
                </div>
                <Button onClick={salvarEdicao} disabled={salvandoEdicao || !editData || !editHora} className="w-full gap-2">
                  {salvandoEdicao ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salvar alteração
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
