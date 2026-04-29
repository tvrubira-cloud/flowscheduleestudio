import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ExternalLink, CreditCard, CheckCircle, XCircle, Clock, Loader2, X, ChevronRight, Zap, Link2, Copy, Pencil, Trash2, MessageSquare, Users, Calendar, Megaphone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store/useAppStore"
import { useClientes } from "@/hooks/useClientes"
import { useAgendamentosPublicos } from "@/hooks/useAgendamentosPublicos"
import { useDisponibilidade } from "@/hooks/useDisponibilidade"
import { agendamentoSchema } from "@/lib/validations"
import { enviarMensagemWA } from "@/lib/whatsapp"
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
  salvando?: boolean
}

const ClienteRow = React.memo(function ClienteRow({ cliente, onAgendar, salvando }: ClienteRowProps) {
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
          <p className="font-semibold text-foreground">{cliente.nome}</p>
          <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onAgendar(cliente)}
        disabled={salvando}
        className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 hover:bg-primary text-primary hover:text-white border-primary/30"
        aria-label={`Agendar para ${cliente.nome}`}
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
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
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden relative h-full rounded-[2rem] p-4">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <CardHeader className="pb-3 p-4">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground font-bold">
          <Link2 className="w-5 h-5 text-primary" />
          Link de Agendamento
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Compartilhe com seus clientes para receberem agendamentos 24h por dia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
          <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
            {link || "Carregando..."}
          </span>
          <button
            onClick={copiar}
            className="shrink-0 text-muted-foreground hover:text-white transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {copiado && (
          <p className="text-xs text-green-400 text-center font-bold">Link copiado com sucesso!</p>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button size="sm" className="h-12 rounded-xl gap-2 premium-gradient text-white border-none font-bold" onClick={compartilharWhatsApp}>
            <MessageSquare className="w-4 h-4" /> Enviar no WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="h-12 rounded-xl gap-2 border-white/10 text-white font-bold" onClick={copiar}>
            <Copy className="w-4 h-4" /> Copiar link
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({ title, value, icon: Icon, subtext, trend }: { 
  title: string, value: string | number, icon: any, subtext?: string, trend?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-3xl relative overflow-hidden group"
    >
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-foreground tracking-tighter">{value}</h3>
          {subtext && <p className="text-[10px] text-muted-foreground mt-1 font-medium">{subtext}</p>}
          {trend && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 mt-2 bg-green-400/10 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-primary/30 transition-all group-hover:scale-110">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, schedulingDate, schedulingTime, setSchedulingDate, setSchedulingTime, setActiveTab, statusWA } =
    useAppStore()
  const { clientes } = useClientes()
  const { buscarAgendamentos, salvarAgendamento, atualizarStatus, editarAgendamento, deletarAgendamento, carregando, salvando } = useAgendamentosPublicos()
  const { disponibilidade, carregar: carregarDisponibilidade } = useDisponibilidade()
  const nomeNegocio = disponibilidade.nomeNegocio || "nosso salão"

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
    carregarDisponibilidade()

    const intervalo = setInterval(() => {
      buscarAgendamentos(user.uid).then(setAgendamentos)
    }, 30_000)

    return () => clearInterval(intervalo)
  }, [user])

  const criarAgendamento = async (cliente: Cliente) => {
    if (!user) return
    const result = agendamentoSchema.safeParse({ data: schedulingDate, hora: schedulingTime })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }
    try {
      await salvarAgendamento({
        userId: user.uid,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        data: schedulingDate,
        hora: schedulingTime,
        status: "confirmado",
      }, true) // hasFullAccess = true (dono criando manualmente)
      toast.success(`Agendamento criado para ${cliente.nome}!`)
      const atualizados = await buscarAgendamentos(user.uid)
      setAgendamentos(atualizados)
    } catch {
      toast.error("Erro ao criar agendamento.")
    }
  }

  const handleStatus = async (id: string, status: AgendamentoPublico["status"]) => {
    setAtualizando(id)
    try {
      await atualizarStatus(id, status)
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      )
      toast.success(status === "confirmado" ? "Agendamento confirmado!" : "Agendamento cancelado.")

      // Envia email de confirmação ao cliente (fire-and-forget)
      if (status === "confirmado" && user) {
        const ag = agendamentos.find((a) => a.id === id)
        if (ag?.clienteUid) {
          fetch("/api/confirmar-agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.uid,
              agendamentoId: id,
              clienteNome: ag.clienteNome,
              clienteUid: ag.clienteUid,
              data: ag.data,
              hora: ag.hora,
            }),
          }).catch(() => {})
        }
      }
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

  const agendamentosOrdenados = [...agendamentos].sort((a, b) => {
    const da = `${a.data} ${a.hora}`
    const db2 = `${b.data} ${b.hora}`
    return da.localeCompare(db2)
  })

  const pendentesCount = agendamentosOrdenados.filter((a) => a.status === "pendente").length
  const confirmadosCount = agendamentosOrdenados.filter((a) => a.status === "confirmado").length
  
  // Cálculo de receita financeira do salão (estimada em R$ 50 por agendamento confirmado)
  const receitaEstimada = confirmadosCount * 50

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-8 pb-10"
      >
        {/* ── KPIs Section ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Total de Clientes" 
            value={clientes.length} 
            icon={Users} 
            subtext="Clientes cadastrados"
            trend="+12% este mês"
          />
          <KPICard 
            title="Agendamentos" 
            value={agendamentos.length} 
            icon={Calendar} 
            subtext="Total registrados"
          />
          <KPICard 
            title="Pendentes" 
            value={pendentesCount} 
            icon={Clock} 
            subtext="Aguardando confirmação"
          />
          <KPICard 
            title="Receita Estimada" 
            value={`R$ ${receitaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={CreditCard} 
            subtext="Baseado em confirmados"
            trend="+R$ 250 hoje"
          />
        </div>

        {/* ── Header do negócio ────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 glass-card p-6 rounded-[2rem]">
          <div className="flex items-center gap-5">
            {disponibilidade.logoUrl ? (
              <div className="w-16 h-16 rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden shrink-0 flex items-center justify-center glow-primary">
                <img src={disponibilidade.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-2xl border border-primary/30 glow-primary shrink-0">
                {nomeNegocio.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground italic uppercase">
                {disponibilidade.nomeNegocio || "Meu Estabelecimento"}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Sistema Online
              </div>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            className="hidden md:flex glass border-white/10 h-11 px-6 rounded-xl hover:bg-primary hover:text-white transition-all gap-2"
            onClick={() => window.open(linkPublico, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            Ver Página Pública
          </Button>
        </div>

        {/* ── Onboarding checklist ─────────────────────────────────────── */}
        {!onboardingFechado && clientes.length === 0 && agendamentos.length === 0 && (
          <Card className="glass border-primary/20 bg-primary/5 rounded-[2rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Zap className="w-32 h-32 text-primary" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                  <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Primeiros passos</CardTitle>
                  <CardDescription>Configure seu sistema em poucos minutos</CardDescription>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
                onClick={() => {
                  localStorage.setItem("onboarding_fechado", "true")
                  setOnboardingFechado(true)
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[
                {
                  num: 1,
                  label: "Configurar horários",
                  action: () => setActiveTab("configuracoes"),
                  icon: Clock
                },
                {
                  num: 2,
                  label: "Copiar link público",
                  action: () =>
                    navigator.clipboard
                      .writeText(linkPublico)
                      .then(() => toast.success("Link copiado!"))
                      .catch(() => toast.error("Não foi possível copiar o link.")),
                  icon: Link2
                },
                {
                  num: 3,
                  label: "Primeiro cliente",
                  action: () => setActiveTab("clientes"),
                  icon: Users
                },
              ].map(({ num, label, action, icon: Icon }) => (
                <button
                  key={num}
                  onClick={action}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <span className="w-10 h-10 rounded-xl bg-primary/20 text-primary text-sm font-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {num}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                      Ir agora <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* ── Lista de clientes / agendar ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-white/5 rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Novo Agendamento</CardTitle>
                    <CardDescription>
                      Registre manualmente um horário para um cliente
                    </CardDescription>
                  </div>
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="sched-date" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                      Data do Serviço
                    </label>
                    <Input
                      id="sched-date"
                      type="date"
                      value={schedulingDate}
                      onChange={(e) => setSchedulingDate(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="sched-time" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                      Horário
                    </label>
                    <Input
                      id="sched-time"
                      type="time"
                      value={schedulingTime}
                      onChange={(e) => setSchedulingTime(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3" role="list" aria-label="Lista de clientes">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                    Selecionar Cliente
                  </p>
                  {clientes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl">
                      Nenhum cliente cadastrado ainda
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {clientes.map((c) => (
                        <div key={c.id} role="listitem">
                          <ClienteRow cliente={c} onAgendar={criarAgendamento} salvando={salvando} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Agendamentos Recentes ────────────────────────────── */}
            <Card className="glass-card border-white/5 rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    Agendamentos
                    {pendentesCount > 0 && (
                      <span className="text-[10px] font-black bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                        {pendentesCount} PENDENTE{pendentesCount > 1 ? "S" : ""}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Gerencie todos os horários marcados
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                {carregando ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : agendamentosOrdenados.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl">
                    Nenhum agendamento registrado
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agendamentosOrdenados.map((ag) => (
                      <motion.div
                        layout
                        key={ag.id}
                        className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all space-y-4 relative group"
                      >
                        <div className="flex items-center gap-4">
                          <div aria-hidden="true"
                            className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black shrink-0 text-lg border border-primary/20 shadow-inner">
                            {ag.clienteNome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="font-bold text-foreground text-lg tracking-tight">{ag.clienteNome}</p>
                              <StatusBadge status={ag.status} />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium mt-1">
                              <span className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" /> {ag.clienteTelefone}
                              </span>
                              <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                {ag.data.split("-").reverse().join("/")} às <span className="text-foreground font-bold">{ag.hora}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {ag.mensagem && (
                          <div className="text-xs text-muted-foreground bg-black/20 rounded-2xl px-4 py-3 italic border border-white/5">
                            "{ag.mensagem}"
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap border-t border-white/5 pt-4">
                          {ag.status === "pendente" && (
                            <Button size="sm" variant="ghost"
                              className="h-10 text-xs font-bold text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-2 rounded-xl border border-green-500/20"
                              disabled={atualizando === ag.id}
                              onClick={async () => {
                                await handleStatus(ag.id, "confirmado")
                                const data = ag.data.split("-").reverse().join("/")
                                const texto = `Olá, ${ag.clienteNome}! 😊\n\nSeu agendamento no *${nomeNegocio}* foi *confirmado* com sucesso! ✅\n\n📅 Data: ${data}\n🕐 Horário: ${ag.hora}\n\nCaso precise reagendar ou cancelar, entre em contato com antecedência. Te esperamos! 🙏`
                                await enviarMensagemWA(ag.clienteTelefone, texto, statusWA)
                              }}
                            >
                              {atualizando === ag.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Confirmar
                            </Button>
                          )}
                          {ag.status !== "cancelado" && (
                            <Button size="sm" variant="ghost"
                              className="h-10 text-xs font-bold text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 gap-2 rounded-xl border border-orange-500/20"
                              disabled={atualizando === ag.id}
                              onClick={() => handleStatus(ag.id, "cancelado")}
                            >
                              {atualizando === ag.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Cancelar
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-1 ml-auto">
                            <Button size="icon" variant="ghost"
                              className="h-10 w-10 rounded-xl text-green-400 hover:bg-green-500/10"
                              onClick={async () => {
                                const data = ag.data.split("-").reverse().join("/")
                                const texto = ag.status === "confirmado"
                                  ? `Olá, ${ag.clienteNome}! 😊\n\nSeu agendamento no *${nomeNegocio}* foi *confirmado* com sucesso! ✅\n\n📅 Data: ${data}\n🕐 Horário: ${ag.hora}\n\nCaso precise reagendar ou cancelar, entre em contato com antecedência. Te esperamos! 🙏`
                                  : `Olá, ${ag.clienteNome}! 😊\n\nPassamos para lembrar do seu agendamento no *${nomeNegocio}*.\n\n📅 Data: ${data}\n🕐 Horário: ${ag.hora}\n\nQualquer dúvida, estamos à disposição! 🙏`
                                await enviarMensagemWA(ag.clienteTelefone, texto, statusWA)
                              }}
                            >
                              <MessageSquare className="w-5 h-5" />
                            </Button>
                            <Button size="icon" variant="ghost"
                              className="h-10 w-10 rounded-xl text-blue-400 hover:bg-blue-500/10"
                              onClick={() => abrirEdicao(ag)}
                            >
                              <Pencil className="w-5 h-5" />
                            </Button>
                            <Button size="icon" variant="ghost"
                              className="h-10 w-10 rounded-xl text-red-400 hover:bg-red-500/10"
                              onClick={() => setConfirmandoExclusao(ag.id)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>

                          {confirmandoExclusao === ag.id && (
                            <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6 text-center flex-col gap-4">
                              <p className="text-sm font-bold text-foreground">Deseja excluir permanentemente este agendamento?</p>
                              <div className="flex gap-3">
                                <Button size="sm" variant="ghost" className="rounded-xl font-bold" onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-6" onClick={() => confirmarExclusao(ag.id)}>Excluir Agora</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <LinkPublicoCard userId={user?.uid} />
            
            {/* Promo Card placeholder */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card p-8 rounded-[2rem] border-primary/20 bg-primary/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <Megaphone className="w-12 h-12 text-primary/20 -rotate-12" />
              </div>
              <h4 className="text-xl font-black text-foreground italic uppercase tracking-tighter mb-2">Dica do Dia</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Agendamentos confirmados pelo WhatsApp reduzem faltas em até 40%. Use nosso link automático!
              </p>
              <Button size="sm" variant="link" className="text-primary font-bold p-0 mt-4 h-auto" onClick={() => setActiveTab("promocoes")}>
                Criar Promoção <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* ── Modal editar agendamento ──────────────────────────────────── */}
        <AnimatePresence>
          {editando && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={() => setEditando(null)} 
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative glass-card border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tighter italic uppercase">Editar</h2>
                    <p className="text-sm text-muted-foreground font-medium">{editando.clienteNome}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full h-10 w-10" onClick={() => setEditando(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Nova Data</label>
                      <Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Nova Hora</label>
                      <Input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl" />
                    </div>
                  </div>
                  <Button onClick={salvarEdicao} disabled={salvandoEdicao || !editData || !editHora} className="w-full h-14 rounded-2xl premium-gradient text-white font-bold gap-3 text-lg shadow-xl glow-primary">
                    {salvandoEdicao ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Salvar Mudanças
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

