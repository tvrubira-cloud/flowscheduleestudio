import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { RefreshCw, Send, Loader2, Inbox, Clock, CheckCircle, Users, Phone, Mail, Calendar } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePedidos, type PedidoPendente } from "@/hooks/usePedidos"
import { useAppStore } from "@/store/useAppStore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { PerfilCliente } from "@/hooks/useClienteAuth"
import { Timestamp } from "firebase/firestore"

// ─── Linha de pedido ──────────────────────────────────────────────────────────

function LinhaPedido({
  pedido, enviando, onEnviar,
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

// ─── Card de cliente cadastrado ───────────────────────────────────────────────

interface ClienteCadastrado extends PerfilCliente {
  uid: string
}

function LinhaCliente({ cliente }: { cliente: ClienteCadastrado }) {
  const data = (cliente.createdAt as Timestamp)?.toDate?.()
    ?.toLocaleDateString("pt-BR") ?? "—"

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
        {cliente.nome.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{cliente.nome}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="w-3 h-3" /> {cliente.telefone}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="w-3 h-3" /> {cliente.email}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> desde {data}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Página Admin ─────────────────────────────────────────────────────────────

type Aba = "pedidos" | "clientes"

export default function AdminPage() {
  const { pedidos, loading, enviando, enviarCodigo, recarregar } = usePedidos()
  const { user } = useAppStore()
  const [aba, setAba] = useState<Aba>("pedidos")
  const [clientes, setClientes] = useState<ClienteCadastrado[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(false)

  useEffect(() => {
    if (aba !== "clientes" || !user || !isFirebaseConfigured || !db) return
    setCarregandoClientes(true)
    const q = query(
      collection(db, "perfis_clientes"),
      where("salonId", "==", user.uid)
    )
    getDocs(q).then((snap) => {
      const lista: ClienteCadastrado[] = snap.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as PerfilCliente),
      }))
      lista.sort((a, b) => a.nome.localeCompare(b.nome))
      setClientes(lista)
    }).finally(() => setCarregandoClientes(false))
  }, [aba, user])

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
          <p className="text-muted-foreground mt-1">Gerencie pedidos e clientes cadastrados.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={recarregar} aria-label="Recarregar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setAba("pedidos")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === "pedidos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-4 h-4" />
          Pedidos
          {pedidos.length > 0 && (
            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{pedidos.length}</span>
          )}
        </button>
        <button
          onClick={() => setAba("clientes")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === "clientes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Clientes {clientes.length > 0 && `(${clientes.length})`}
        </button>
      </div>

      {/* Aba Pedidos */}
      {aba === "pedidos" && (
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="w-4 h-4 text-primary" aria-hidden="true" />
              Aguardando pagamento
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
      )}

      {/* Aba Clientes */}
      {aba === "clientes" && (
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
              Clientes cadastrados
            </CardTitle>
            <CardDescription>
              Clientes que criaram conta pelo seu link de agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregandoClientes ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando clientes...
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
                <p className="text-xs">Compartilhe seu link de agendamento para que clientes se cadastrem.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientes.map((c) => (
                  <LinhaCliente key={c.uid} cliente={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
