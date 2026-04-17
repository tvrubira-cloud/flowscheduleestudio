import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Clock, LogOut, Plus, CheckCircle, XCircle,
  Loader2, User, Mail, Phone, Lock, History, CalendarCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useClienteAuth } from "@/hooks/useClienteAuth"
import { useAgendamentosPublicos } from "@/hooks/useAgendamentosPublicos"
import type { AgendamentoPublico } from "@/types"
import toast from "react-hot-toast"

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

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

// ─── Formulário de login/registro ─────────────────────────────────────────────

function ClienteLoginForm({ salonId }: { salonId: string }) {
  const { registrar, entrar, processando } = useClienteAuth()
  const [modo, setModo] = useState<"login" | "registro">("login")
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")

  const handleSubmit = async () => {
    if (!email || !senha) { toast.error("Preencha e-mail e senha."); return }
    let ok = false
    if (modo === "registro") {
      if (!nome || nome.trim().length < 2) { toast.error("Informe seu nome completo."); return }
      if (!telefone || telefone.replace(/\D/g,"").length < 10) { toast.error("Informe o WhatsApp com DDD."); return }
      ok = await registrar(nome, telefone, email, senha, salonId)
    } else {
      ok = await entrar(email, senha)
    }
    if (ok) navigate(`/booking/${salonId}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Calendar className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Área do Cliente</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {modo === "login" ? "Entre na sua conta" : "Crie sua conta gratuitamente"}
          </p>
        </div>

        <Card className="border-white/5 bg-zinc-900/20">
          <CardContent className="pt-6 space-y-4">
            {modo === "registro" && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Nome completo
                  </label>
                  <Input placeholder="João Silva" value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    WhatsApp (com DDD)
                  </label>
                  <Input type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value)} autoComplete="tel" />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                E-mail
              </label>
              <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                Senha {modo === "registro" && <span className="text-xs text-muted-foreground">(mín. 6 caracteres)</span>}
              </label>
              <Input
                type="password"
                placeholder="••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
              />
            </div>

            <Button onClick={handleSubmit} disabled={processando} className="w-full h-11 font-bold gap-2">
              {processando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                : modo === "login" ? "Entrar" : "Criar Conta"
              }
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {modo === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                onClick={() => setModo(modo === "login" ? "registro" : "login")}
                className="text-primary hover:underline font-medium"
              >
                {modo === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Painel do cliente ────────────────────────────────────────────────────────

function PainelCliente({ salonId }: { salonId: string }) {
  const navigate = useNavigate()
  const { perfil, sair } = useClienteAuth()
  const { buscarAgendamentos, atualizarStatus } = useAgendamentosPublicos()
  const { cliente } = useClienteAuth()

  const [agendamentos, setAgendamentos] = useState<AgendamentoPublico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [aba, setAba] = useState<"proximos" | "historico">("proximos")

  useEffect(() => {
    buscarAgendamentos(salonId).then((todos) => {
      // filtra apenas os agendamentos deste cliente
      const meus = todos.filter((a) => a.clienteUid === cliente?.uid)
      setAgendamentos(meus)
      setCarregando(false)
    })
  }, [salonId, cliente?.uid])

  const cancelar = async (id: string) => {
    setCancelando(id)
    try {
      await atualizarStatus(id, "cancelado")
      setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelado" } : a))
      toast.success("Agendamento cancelado.")
    } catch {
      toast.error("Erro ao cancelar.")
    } finally {
      setCancelando(null)
    }
  }

  const hoje = new Date().toISOString().split("T")[0]

  const proximos = agendamentos
    .filter((a) => a.data >= hoje && a.status !== "cancelado")
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`))

  const historico = agendamentos
    .filter((a) => a.data < hoje || a.status === "cancelado")
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`))

  const lista = aba === "proximos" ? proximos : historico

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split("-")
    return `${dia} ${MESES[parseInt(mes) - 1]} ${ano}`
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Olá, {perfil?.nome?.split(" ")[0]} 👋</h1>
            <p className="text-sm text-muted-foreground">{perfil?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={sair} className="gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Novo agendamento */}
        <Button
          onClick={() => navigate(`/booking/${salonId}`)}
          className="w-full h-12 gap-2 font-bold"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setAba("proximos")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === "proximos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Próximos {proximos.length > 0 && `(${proximos.length})`}
          </button>
          <button
            onClick={() => setAba("historico")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === "historico" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
        </div>

        {/* Lista de agendamentos */}
        <AnimatePresence mode="wait">
          <motion.div
            key={aba}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {carregando ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : lista.length === 0 ? (
              <Card className="border-white/5 bg-zinc-900/20">
                <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {aba === "proximos" ? "Nenhum agendamento futuro." : "Nenhum histórico ainda."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              lista.map((ag) => (
                <Card key={ag.id} className="border-white/5 bg-zinc-900/20">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatarData(ag.data)}</span>
                          <Clock className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                          <span className="text-sm font-medium">{ag.hora}</span>
                        </div>
                        <StatusBadge status={ag.status} />
                      </div>
                      {ag.status !== "cancelado" && ag.data >= hoje && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 shrink-0"
                          disabled={cancelando === ag.id}
                          onClick={() => cancelar(ag.id)}
                        >
                          {cancelando === ag.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          Cancelar
                        </Button>
                      )}
                      {ag.status === "confirmado" && (
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClientePainelPage() {
  const { salonId } = useParams<{ salonId: string }>()
  const { cliente, loading } = useClienteAuth()

  if (!salonId) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!cliente) {
    return <ClienteLoginForm salonId={salonId} />
  }

  return <PainelCliente salonId={salonId} />
}
