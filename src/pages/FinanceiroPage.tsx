import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CreditCard, Check, Zap, ExternalLink, QrCode,
  FileText, Key, Loader2, BadgeCheck, X, User, RefreshCw, AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAssinatura } from "@/hooks/useAssinatura"
import toast from "react-hot-toast"
import { z } from "zod"

const nomeSchema = z.string().min(2, "Nome deve ter ao menos 2 caracteres")

// ─── Modal: captura nome antes de ir ao PagSeguro ─────────────────────────────

function ModalAssinar({ onClose }: { onClose: () => void }) {
  const { criarAssinatura } = useAssinatura()
  const [nome, setNome] = useState("")
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConfirmar = async () => {
    const result = nomeSchema.safeParse(nome)
    if (!result.success) {
      setErro(result.error.issues[0].message)
      return
    }
    setErro("")
    setLoading(true)
    try {
      await criarAssinatura(nome)
      onClose()
    } catch {
      toast.error("Erro ao iniciar assinatura. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Dados para assinatura"
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold">Antes de assinar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seu nome será enviado ao PagSeguro para identificação
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="assinante-nome" className="text-sm font-medium flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              Seu nome completo
            </label>
            <Input
              id="assinante-nome"
              placeholder="João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={!!erro}
              autoComplete="name"
              onKeyDown={(e) => e.key === "Enter" && handleConfirmar()}
            />
            {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
          </div>

          <p className="text-xs text-muted-foreground bg-white/5 rounded-lg p-3">
            Você será redirecionado ao PagSeguro para autorizar a cobrança de{" "}
            <strong className="text-white">R$ 49,90/mês</strong>. O plano é renovado automaticamente e pode ser cancelado a qualquer momento.
          </p>

          <Button
            onClick={handleConfirmar}
            disabled={loading}
            className="w-full h-11 gap-2 font-bold"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando...</>
              : <><ExternalLink className="w-4 h-4" aria-hidden="true" /> Ir para o PagSeguro</>
            }
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

const PLANO_PRO_FEATURES = [
  "Agendamentos ilimitados",
  "Integração completa com WhatsApp",
  "Link público de agendamento",
  "Lembretes automáticos por IA",
  "Relatórios e métricas",
  "Suporte prioritário",
]

// ─── Card: Plano Pro ativo ────────────────────────────────────────────────────

function PlanoProAtivo({
  ativadoEm,
  expiraEm,
  renovacaoAutomatica,
}: {
  ativadoEm?: Date
  expiraEm?: Date
  renovacaoAutomatica?: boolean
}) {
  const { cancelarAssinatura, cancelando } = useAssinatura()
  const [confirmando, setConfirmando] = useState(false)

  const handleCancelar = async () => {
    const ok = await cancelarAssinatura()
    if (ok) setConfirmando(false)
  }

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <BadgeCheck className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="font-bold text-green-400">Plano Pro Ativo</p>
            {ativadoEm && (
              <p className="text-xs text-muted-foreground">
                Desde {ativadoEm.toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        {expiraEm && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 rounded-lg px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {renovacaoAutomatica
              ? <>Renovação automática em <strong className="text-white ml-1">{expiraEm.toLocaleDateString("pt-BR")}</strong></>
              : <>Acesso válido até <strong className="text-white ml-1">{expiraEm.toLocaleDateString("pt-BR")}</strong></>
            }
          </div>
        )}

        {renovacaoAutomatica && !confirmando && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => setConfirmando(true)}
          >
            Cancelar assinatura
          </Button>
        )}

        {confirmando && (
          <div className="space-y-2 border border-red-500/20 rounded-lg p-3 bg-red-500/5">
            <div className="flex items-start gap-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Tem certeza? Você perderá o acesso Pro ao fim do período atual.
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/10"
                onClick={() => setConfirmando(false)}
                disabled={cancelando}
              >
                Manter
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelar}
                disabled={cancelando}
              >
                {cancelando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Card: Ativar com código manual (fallback) ────────────────────────────────

function AtivacaoComCodigo() {
  const { ativando, ativarComCodigo } = useAssinatura()
  const [codigo, setCodigo] = useState("")
  const [sucesso, setSucesso] = useState(false)

  const handleAtivar = async () => {
    const ok = await ativarComCodigo(codigo)
    if (ok) setSucesso(true)
  }

  if (sucesso) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 text-center space-y-2">
          <BadgeCheck className="w-10 h-10 text-green-400 mx-auto" />
          <p className="font-bold text-green-400">Plano Pro ativado!</p>
          <p className="text-sm text-muted-foreground">Recarregue a página para ver todos os recursos.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/5 bg-zinc-900/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" aria-hidden="true" />
          Já tem um código? Ative manualmente
        </CardTitle>
        <CardDescription>
          Use um código enviado pela equipe de suporte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="codigo-ativacao" className="text-sm font-medium">
            Código de ativação
          </label>
          <Input
            id="codigo-ativacao"
            placeholder="Ex: FLOW-XXXX-XXXX"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className="font-mono tracking-widest"
            autoComplete="off"
          />
        </div>
        <Button
          onClick={handleAtivar}
          disabled={ativando || !codigo.trim()}
          className="w-full h-11 gap-2"
        >
          {ativando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
            : <><Key className="w-4 h-4" aria-hidden="true" /> Ativar Plano Pro</>
          }
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const { isPro, isTrialing, trialDaysLeft, assinatura, loadingAssinatura } = useAssinatura()
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <>
      <motion.div
        key="financeiro"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Planos & Pagamento</h2>
          <p className="text-muted-foreground mt-1">
            Escolha o plano ideal para o seu negócio.
          </p>
        </div>

        {!loadingAssinatura && isTrialing && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary">Trial gratuito ativo</p>
                <p className="text-xs text-muted-foreground">
                  Você tem acesso completo por mais <strong className="text-white">{trialDaysLeft} dia{trialDaysLeft === 1 ? "" : "s"}</strong>. Assine Pro para não perder o acesso.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loadingAssinatura && isPro && (
          <PlanoProAtivo
            ativadoEm={assinatura.ativadoEm}
            expiraEm={assinatura.expiraEm}
            renovacaoAutomatica={assinatura.renovacaoAutomatica}
          />
        )}

        {!isPro && (
          <Card className="border-white/5 bg-zinc-900/20">
            <CardHeader>
              <CardTitle className="text-lg">Plano Gratuito</CardTitle>
              <CardDescription>Para quem está começando</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["3 agendamentos por mês", "Clientes ilimitados", "Link público de agendamento"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" disabled className="w-full border-white/10">
                Plano Atual
              </Button>
            </CardContent>
          </Card>
        )}

        {!isPro && (
          <Card className="premium-gradient border-none text-white overflow-hidden relative">
            <div className="absolute top-4 right-4 opacity-10" aria-hidden="true">
              <Zap size={80} />
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                <CardTitle className="text-lg">Plano Pro</CardTitle>
              </div>
              <CardDescription className="text-white/70">
                Para profissionais que querem crescer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">R$ 49,90</span>
                <span className="text-white/70">/mês</span>
              </div>

              <ul className="space-y-2 text-sm text-white/80">
                {PLANO_PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 py-3 border-t border-white/10">
                <span className="text-xs text-white/60">Formas de pagamento:</span>
                <div className="flex gap-2 text-xs text-white/90">
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                    <QrCode className="w-3 h-3" aria-hidden="true" /> PIX
                  </span>
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                    <FileText className="w-3 h-3" aria-hidden="true" /> Boleto
                  </span>
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                    <CreditCard className="w-3 h-3" aria-hidden="true" /> Cartão
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setModalAberto(true)}
                className="w-full bg-white text-zinc-900 hover:bg-white/90 font-bold h-12 gap-2 text-base"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Assinar Agora · R$ 49,90/mês
              </Button>

              <p className="text-xs text-center text-white/50">
                Renovação automática mensal · Cancele quando quiser · PagSeguro
              </p>
            </CardContent>
          </Card>
        )}

        {!loadingAssinatura && !isPro && <AtivacaoComCodigo />}
      </motion.div>

      <AnimatePresence>
        {modalAberto && <ModalAssinar onClose={() => setModalAberto(false)} />}
      </AnimatePresence>
    </>
  )
}
