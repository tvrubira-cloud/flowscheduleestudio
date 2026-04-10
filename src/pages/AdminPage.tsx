import { motion } from "framer-motion"
import { RefreshCw, Send, Loader2, Inbox, Clock, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePedidos, type PedidoPendente } from "@/hooks/usePedidos"

// ─── Linha de pedido ──────────────────────────────────────────────────────────

function LinhaPedido({
  pedido,
  enviando,
  onEnviar,
}: {
  pedido: PedidoPendente
  enviando: boolean
  onEnviar: () => void
}) {
  const data = pedido.criadoEm
    ? pedido.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—"

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{pedido.nome}</p>
        <p className="text-sm text-muted-foreground truncate">{pedido.email}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {data}
        </p>
      </div>
      <Button
        size="sm"
        onClick={onEnviar}
        disabled={enviando}
        className="gap-2 shrink-0"
        aria-label={`Enviar código para ${pedido.nome}`}
      >
        {enviando
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
          : <><Send className="w-3.5 h-3.5" aria-hidden="true" /> Enviar Código</>
        }
      </Button>
    </div>
  )
}

// ─── Página Admin ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { pedidos, loading, enviando, enviarCodigo, recarregar } = usePedidos()

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel Admin</h2>
          <p className="text-muted-foreground mt-1">
            Pedidos aguardando confirmação de pagamento.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={recarregar} aria-label="Recarregar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="w-4 h-4 text-primary" aria-hidden="true" />
            Aguardando pagamento
            {pedidos.length > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {pedidos.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Clique em "Enviar Código" após confirmar o pagamento no painel do PagSeguro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando pedidos...
            </div>
          ) : pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <CheckCircle className="w-8 h-8 text-green-500/50" />
              <p className="text-sm">Nenhum pedido pendente.</p>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label="Pedidos pendentes">
              {pedidos.map((pedido) => (
                <div key={pedido.id} role="listitem">
                  <LinhaPedido
                    pedido={pedido}
                    enviando={enviando === pedido.id}
                    onEnviar={() => enviarCodigo(pedido)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
