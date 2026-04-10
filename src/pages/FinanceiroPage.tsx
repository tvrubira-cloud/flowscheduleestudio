import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CreditCard, Check, Zap, ExternalLink, QrCode,
  FileText, Key, Loader2, BadgeCheck, X, Mail, User,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAssinatura } from "@/hooks/useAssinatura"
import { salvarPedidoPendente } from "@/hooks/usePedidos"
import toast from "react-hot-toast"
import { z } from "zod"

const PAGSEGURO_LINK = "https://pag.ae/81FCjY2jo"

const pedidoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
})

// ─── Modal de captura de e-mail ───────────────────────────────────────────────

function ModalAssinar({ onClose }: { onClose: () => void }) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<{ nome?: string; email?: string }>({})
  const [loading, setLoading] = useState(false)

  const handleConfirmar = async () => {
    const result = pedidoSchema.safeParse({ nome, email })
    if (!result.success) {
      const fieldErrors: { nome?: string; email?: string } = {}
      result.error.issues.forEach((e) => {
        const field = e.path[0] as "nome" | "email"
        fieldErrors[field] = e.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      await salvarPedidoPendente(nome, email)
      window.open(PAGSEGURO_LINK, "_blank", "noopener,noreferrer")
      toast.success("Redirecionando para o PagSeguro...")
      onClose()
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Dados para ativação"
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
            <h2 className="text-base font-bold">Antes de pagar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usaremos esses dados para enviar seu código de ativação
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="pedido-nome" className="text-sm font-medium flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              Seu nome
            </label>
            <Input
              id="pedido-nome"
              placeholder="João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={!!errors.nome}
              autoComplete="name"
            />
            {errors.nome && <p role="alert" className="text-xs text-red-400">{errors.nome}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="pedido-email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              Seu e-mail
            </label>
            <Input
              id="pedido-email"
              type="email"
              placeholder="joao@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              autoComplete="email"
              onKeyDown={(e) => e.key === "Enter" && handleConfirmar()}
            />
            {errors.email && <p role="alert" className="text-xs text-red-400">{errors.email}</p>}
          </div>

          <p className="text-xs text-muted-foreground bg-white/5 rounded-lg p-3">
            Após confirmar o pagamento no PagSeguro, enviaremos um código de ativação para este e-mail.
          </p>

          <Button
            onClick={handleConfirmar}
            disabled={loading}
            className="w-full h-11 gap-2 font-bold"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
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

// ─── Card: Plano Pro já ativo ─────────────────────────────────────────────────

function PlanoProAtivo({ ativadoEm }: { ativadoEm?: Date }) {
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="pt-6 space-y-3">
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
        <p className="text-sm text-muted-foreground">
          Você tem acesso a todos os recursos do Plano Pro. Aproveite!
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Card: Ativar com código ──────────────────────────────────────────────────

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
          Já pagou? Ative seu plano
        </CardTitle>
        <CardDescription>
          Após confirmarmos seu pagamento, enviaremos um código por WhatsApp ou e-mail.
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
  const { isPro, assinatura, loadingAssinatura } = useAssinatura()
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

      {/* Plano já ativo */}
      {!loadingAssinatura && isPro && (
        <PlanoProAtivo ativadoEm={assinatura.ativadoEm} />
      )}

      {/* Plano Gratuito */}
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
              {["Até 10 clientes", "5 agendamentos por mês", "Link público básico"].map((f) => (
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

      {/* Plano Pro */}
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
              <span className="text-4xl font-bold">R$ 49.90</span>
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

            {/* Formas de pagamento */}
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
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              Assinar Agora · R$ 49.90/mês
            </Button>

            <p className="text-xs text-center text-white/50">
              Pagamento processado com segurança pelo PagSeguro · PagBank
            </p>
          </CardContent>
        </Card>
      )}

      {/* Campo de ativação com código */}
      {!loadingAssinatura && !isPro && <AtivacaoComCodigo />}
    </motion.div>

    {/* Modal captura e-mail */}
    <AnimatePresence>
      {modalAberto && <ModalAssinar onClose={() => setModalAberto(false)} />}
    </AnimatePresence>
    </>
  )
}
