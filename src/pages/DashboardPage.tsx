import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ExternalLink, MessageSquare, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store/useAppStore"
import { useClientes } from "@/hooks/useClientes"
import { agendamentoSchema } from "@/lib/validations"
import type { Cliente } from "@/types"
import toast from "react-hot-toast"

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

  const linkPublico = `https://flow.ai/booking/${user?.uid ?? "demo"}`

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

  const pagarPlano = () => {
    window.open("https://pag.ae/81FCjY2jo", "_blank", "noopener,noreferrer")
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {/* ── Link público ─────────────────────────── */}
        <div className="md:col-span-3">
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
        </div>

        {/* ── Lista de clientes / agendar ───────────── */}
        <Card className="md:col-span-2 border-white/5 bg-zinc-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Próximos Agendamentos</CardTitle>
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

        {/* ── Sidebar cards ─────────────────────────── */}
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
      </motion.div>
    </AnimatePresence>
  )
}
