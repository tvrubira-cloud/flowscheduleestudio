import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, User, Phone, CheckCircle, Loader2, UserCircle, MessageSquare, Mail, Lock } from "lucide-react"
import { useClienteAuth } from "@/hooks/useClienteAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAgendamentosPublicos, gerarSlots } from "@/hooks/useAgendamentosPublicos"
import type { Disponibilidade } from "@/types"
import toast from "react-hot-toast"

const DIAS_NOME = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// Próximos N dias úteis disponíveis (de acordo com diasSemana)
function gerarDatasDisponiveis(diasSemana: number[], qtd = 30): Date[] {
  const datas: Date[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  let cursor = new Date(hoje) // começa hoje

  while (datas.length < qtd) {
    if (diasSemana.includes(cursor.getDay())) {
      datas.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return datas
}

function formatarData(data: Date): string {
  return data.toISOString().split("T")[0]
}

// ─── Etapas ──────────────────────────────────────────────────────────────────

type Etapa = "data" | "horario" | "dados" | "confirmado"

export default function BookingPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { cliente: clienteLogado, perfil: perfilCliente, loading: loadingAuth, registrar, entrar } = useClienteAuth()
  const { buscarDisponibilidade, buscarHorariosOcupados, salvarAgendamento, salvando } =
    useAgendamentosPublicos()

  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [etapa, setEtapa] = useState<Etapa>("data")

  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [carregandoSlots, setCarregandoSlots] = useState(false)

  // Dados do cliente
  const [modoAuth, setModoAuth] = useState<"cadastro" | "login">("cadastro")
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [processandoAuth, setProcessandoAuth] = useState(false)

  useEffect(() => {
    if (!userId) return
    buscarDisponibilidade(userId).then((d) => {
      setDisponibilidade(d)
      setCarregando(false)
    })
  }, [userId])

  // Pré-preenche dados quando cliente já está logado
  useEffect(() => {
    if (perfilCliente) {
      setNome(perfilCliente.nome)
      setTelefone(perfilCliente.telefone)
      setEmail(perfilCliente.email)
    }
  }, [perfilCliente])

  const selecionarData = async (data: Date) => {
    setDataSelecionada(data)
    setHorarioSelecionado(null)
    setEtapa("horario")

    if (!disponibilidade || !userId) return
    setCarregandoSlots(true)
    const ocupados = await buscarHorariosOcupados(userId, formatarData(data))
    let livres = gerarSlots(
      disponibilidade.horarioInicio,
      disponibilidade.horarioFim,
      disponibilidade.duracaoMinutos,
      ocupados
    )
    // Para hoje: remove slots que já passaram
    const hoje = new Date()
    const isHoje = formatarData(data) === formatarData(hoje)
    if (isHoje) {
      const agora = hoje.getHours() * 60 + hoje.getMinutes()
      livres = livres.filter((h) => {
        const [hh, mm] = h.split(":").map(Number)
        return hh * 60 + mm > agora
      })
    }
    setSlots(livres)
    setCarregandoSlots(false)
  }

  const selecionarHorario = (hora: string) => {
    setHorarioSelecionado(hora)
    setEtapa("dados")
  }

  const confirmar = async () => {
    if (!dataSelecionada || !horarioSelecionado || !userId) return

    setProcessandoAuth(true)
    try {
      let uid = clienteLogado?.uid
      let nomeFinal = nome.trim()
      let telFinal = telefone.replace(/\D/g, "")

      // Se não está logado, faz cadastro ou login
      if (!clienteLogado) {
        if (!email || !senha) { toast.error("Informe e-mail e senha."); return }

        if (modoAuth === "cadastro") {
          if (!nomeFinal || nomeFinal.length < 2) { toast.error("Informe seu nome completo."); return }
          if (telFinal.length < 10) { toast.error("Informe um telefone com DDD."); return }
          const ok = await registrar(nomeFinal, telFinal, email, senha, userId)
          if (!ok) return
        } else {
          const ok = await entrar(email, senha)
          if (!ok) return
          // perfil carregado pelo useEffect após entrar()
          // usa nome/telefone do perfil que serão preenchidos no próximo render
          nomeFinal = nome.trim() || email.split("@")[0]
          telFinal = telefone.replace(/\D/g, "")
        }
        // uid será atualizado via onAuthStateChanged — usa email como fallback identifier
      } else {
        uid = clienteLogado.uid
        nomeFinal = perfilCliente?.nome || nome.trim()
        telFinal = (perfilCliente?.telefone || telefone).replace(/\D/g, "")
      }

      if (!nomeFinal || nomeFinal.length < 2) { toast.error("Informe seu nome completo."); return }
      if (telFinal.length < 10) { toast.error("Informe um telefone com DDD."); return }

      await salvarAgendamento({
        clienteNome: nomeFinal,
        clienteTelefone: telFinal,
        data: formatarData(dataSelecionada),
        hora: horarioSelecionado,
        userId,
        clienteUid: uid,
        status: "pendente",
        ...(mensagem.trim() ? { mensagem: mensagem.trim() } : {}),
      })
      setEtapa("confirmado")

      fetch("/api/notificar-agendamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          clienteNome: nomeFinal,
          clienteTelefone: telFinal,
          data: formatarData(dataSelecionada),
          hora: horarioSelecionado,
        }),
      }).catch(() => {})
    } catch (err) {
      if (err instanceof Error && err.message === "LIMITE_ATINGIDO") {
        toast.error("Este estabelecimento atingiu o limite do plano gratuito. Entre em contato com o profissional.")
      } else {
        toast.error("Erro ao confirmar agendamento. Tente novamente.")
      }
    } finally {
      setProcessandoAuth(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loadingAuth || carregando) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!disponibilidade) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="border-white/5 bg-zinc-900/40 max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-bold">Agenda não configurada</p>
            <p className="text-sm text-muted-foreground">
              Este profissional ainda não configurou seus horários de atendimento.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const datas = gerarDatasDisponiveis(disponibilidade.diasSemana)
  const nomeNegocio = disponibilidade.nomeNegocio || "Agendamento Online"

  // ── Confirmado ────────────────────────────────────────────────────────────

  if (etapa === "confirmado") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full"
        >
          <Card className="border-green-500/30 bg-green-500/5 text-center">
            <CardContent className="pt-10 pb-10 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <div>
                <p className="text-xl font-bold text-green-400">Agendamento confirmado!</p>
                <p className="text-muted-foreground mt-1">{nomeNegocio}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-sm space-y-1">
                <p><strong>Data:</strong> {dataSelecionada && `${DIAS_NOME[dataSelecionada.getDay()]}, ${dataSelecionada.getDate()} de ${MESES[dataSelecionada.getMonth()]}`}</p>
                <p><strong>Horário:</strong> {horarioSelecionado}</p>
                <p><strong>Nome:</strong> {nome}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Aguarde a confirmação do profissional.
              </p>
            </CardContent>
          </Card>

          {/* Branding footer */}
          <div className="mt-6 text-center">
            <a
              href="https://flowschedule-estudio.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Agendamento via <strong className="text-primary">FlowSchedule AI</strong> — Crie o seu grátis
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Layout principal ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{nomeNegocio}</h1>
            <p className="text-muted-foreground text-sm">Escolha uma data e horário disponível</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/booking/${userId}/painel`)}
            className="gap-2 text-muted-foreground hover:text-foreground shrink-0"
          >
            <UserCircle className="w-4 h-4" />
            {perfilCliente ? perfilCliente.nome.split(" ")[0] : "Minha conta"}
          </Button>
        </div>

        {/* Indicador de etapas */}
        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
          {(["data", "horario", "dados"] as Etapa[]).map((e, i) => (
            <div key={e} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-white/10" />}
              <span className={etapa === e || (
                (e === "data" && ["horario","dados"].includes(etapa)) ||
                (e === "horario" && etapa === "dados")
              ) ? "text-primary font-medium" : ""}>
                {e === "data" ? "1. Data" : e === "horario" ? "2. Horário" : "3. Seus dados"}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Etapa 1: Selecionar data */}
          {etapa === "data" && (
            <motion.div
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-white/5 bg-zinc-900/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Escolha a data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {datas.map((data) => (
                      <button
                        key={formatarData(data)}
                        onClick={() => selecionarData(data)}
                        className="flex flex-col items-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/50 transition-colors"
                      >
                        <span className="text-xs text-muted-foreground">{DIAS_NOME[data.getDay()].slice(0, 3)}</span>
                        <span className="text-lg font-bold">{data.getDate()}</span>
                        <span className="text-xs text-muted-foreground">{MESES[data.getMonth()]}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Etapa 2: Selecionar horário */}
          {etapa === "horario" && (
            <motion.div
              key="horario"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-white/5 bg-zinc-900/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {dataSelecionada && `${DIAS_NOME[dataSelecionada.getDay()]}, ${dataSelecionada.getDate()} de ${MESES[dataSelecionada.getMonth()]}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {carregandoSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhum horário disponível neste dia.</p>
                      <Button variant="ghost" className="mt-2" onClick={() => setEtapa("data")}>
                        Escolher outra data
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((hora) => (
                        <button
                          key={hora}
                          onClick={() => selecionarHorario(hora)}
                          className="py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/50 transition-colors text-sm font-medium"
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEtapa("data")} className="text-muted-foreground">
                    ← Voltar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Etapa 3: Dados do cliente */}
          {etapa === "dados" && (
            <motion.div
              key="dados"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-white/5 bg-zinc-900/20">
                <CardHeader>
                  <CardTitle className="text-base">Seus dados</CardTitle>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dataSelecionada && `${dataSelecionada.getDate()}/${dataSelecionada.getMonth() + 1}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {horarioSelecionado}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Cliente já logado — mostra perfil resumido */}
                  {clienteLogado && perfilCliente ? (
                    <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {perfilCliente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{perfilCliente.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{perfilCliente.email}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Toggle cadastro / login */}
                      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                        <button
                          onClick={() => setModoAuth("cadastro")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${modoAuth === "cadastro" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          Primeira vez
                        </button>
                        <button
                          onClick={() => setModoAuth("login")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${modoAuth === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          Já tenho conta
                        </button>
                      </div>

                      {modoAuth === "cadastro" && (
                        <>
                          <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              Nome completo
                            </label>
                            <Input placeholder="João Silva" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              WhatsApp (com DDD)
                            </label>
                            <Input type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} autoComplete="tel" />
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          E-mail
                        </label>
                        <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          Senha {modoAuth === "cadastro" && <span className="text-xs text-muted-foreground font-normal">(mín. 6 caracteres)</span>}
                        </label>
                        <Input type="password" placeholder="••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={modoAuth === "cadastro" ? "new-password" : "current-password"} />
                      </div>
                    </>
                  )}

                  {/* Mensagem opcional */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      Mensagem <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <textarea
                      placeholder="Ex: Quero corte e barba, tenho cabelo longo..."
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>

                  <Button
                    onClick={confirmar}
                    disabled={salvando || processandoAuth}
                    className="w-full h-11 font-bold gap-2"
                  >
                    {(salvando || processandoAuth)
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                      : "Confirmar Agendamento"
                    }
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => setEtapa("horario")} className="text-muted-foreground w-full">
                    ← Voltar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Branding footer */}
        <div className="mt-8 text-center">
          <a
            href="https://flowschedule-estudio.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Calendar className="w-3 h-3" />
            Agendamento via <strong className="text-primary">FlowSchedule AI</strong> — Crie o seu grátis
          </a>
        </div>

      </div>
    </div>
  )
}
