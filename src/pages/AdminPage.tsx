import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  RefreshCw, Send, Loader2, Inbox, Clock, CheckCircle, Users,
  Phone, Mail, Calendar, ShieldCheck, Zap, BadgeCheck, UserX, Gift,
} from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePedidos, type PedidoPendente } from "@/hooks/usePedidos"
import { useAppStore } from "@/store/useAppStore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { PerfilCliente } from "@/hooks/useClienteAuth"
import { Timestamp } from "firebase/firestore"
import toast from "react-hot-toast"

// ─── Linha de pedido ──────────────────────────────────────────────────────────

function LinhaPedido({ pedido, enviando, onEnviar }: {
  pedido: PedidoPendente; enviando: boolean; onEnviar: () => void
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
          <Clock className="w-3 h-3" />{data}
        </p>
      </div>
      <Button size="sm" onClick={onEnviar} disabled={enviando} className="gap-2 shrink-0">
        {enviando ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enviando...</> : <><Send className="w-3.5 h-3.5" />Enviar Código</>}
      </Button>
    </div>
  )
}

// ─── Linha de cliente (booking) ───────────────────────────────────────────────

interface ClienteCadastrado extends PerfilCliente { uid: string }

function LinhaCliente({ cliente }: { cliente: ClienteCadastrado }) {
  const data = (cliente.createdAt as Timestamp)?.toDate?.()?.toLocaleDateString("pt-BR") ?? "—"
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
        {cliente.nome.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{cliente.nome}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefone}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />desde {data}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    admin:    { label: "Admin",   className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",  icon: <ShieldCheck className="w-3 h-3" /> },
    pro:      { label: "Pro",     className: "bg-blue-500/15 text-blue-400 border-blue-500/20",        icon: <BadgeCheck className="w-3 h-3" /> },
    trial:    { label: "Trial",   className: "bg-green-500/15 text-green-400 border-green-500/20",     icon: <Zap className="w-3 h-3" /> },
    gratuito: { label: "Grátis",  className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",        icon: <UserX className="w-3 h-3" /> },
  }
  const s = map[status] ?? map.gratuito
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${s.className}`}>
      {s.icon}{s.label}
    </span>
  )
}

// ─── Linha de usuário SaaS ────────────────────────────────────────────────────

interface UsuarioSaaS {
  uid: string
  email: string
  criadoEm: string
  statusLabel: string
  isAdmin: boolean
  expiraEm: string | null
  trialExpiraEm: string | null
  ultimoBonusIndicacao: string | null
  referidoPor: string | null
}

function LinhaUsuario({ usuario, onAtivar }: { usuario: UsuarioSaaS; onAtivar: (uid: string) => Promise<void> }) {
  const [ativando, setAtivando] = useState(false)
  const expira = usuario.expiraEm ? new Date(usuario.expiraEm).toLocaleDateString("pt-BR") : null
  const criado = new Date(usuario.criadoEm).toLocaleDateString("pt-BR")
  const proximoBonus = usuario.ultimoBonusIndicacao
    ? new Date(new Date(usuario.ultimoBonusIndicacao).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")
    : null

  const handleAtivar = async () => {
    setAtivando(true)
    await onAtivar(usuario.uid)
    setAtivando(false)
  }

  return (
    <div className="flex items-start justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{usuario.email}</p>
          <StatusBadge status={usuario.statusLabel} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />cadastro: {criado}
          </p>
          {expira && (
            <p className="text-xs text-muted-foreground">Pro até {expira}</p>
          )}
          {usuario.referidoPor && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Gift className="w-3 h-3 text-yellow-400" />indicado por: {usuario.referidoPor}
            </p>
          )}
          {proximoBonus && (
            <p className="text-xs text-muted-foreground">próx. bônus indic.: {proximoBonus}</p>
          )}
        </div>
      </div>
      {!usuario.isAdmin && (
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-white/10 shrink-0"
          onClick={handleAtivar} disabled={ativando}>
          {ativando ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3 text-blue-400" />}
          Dar 30 dias Pro
        </Button>
      )}
    </div>
  )
}

// ─── Página Admin ─────────────────────────────────────────────────────────────

type Aba = "pedidos" | "clientes" | "usuarios"

export default function AdminPage() {
  const { pedidos, loading, enviando, enviarCodigo, recarregar } = usePedidos()
  const { user } = useAppStore()
  const [aba, setAba] = useState<Aba>("usuarios")
  const [clientes, setClientes] = useState<ClienteCadastrado[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioSaaS[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)

  const carregarUsuarios = async () => {
    if (!user) return
    setCarregandoUsuarios(true)
    try {
      const { getAuth } = await import("firebase/auth")
      const { auth } = await import("@/lib/firebase")
      const token = await getAuth(auth ?? undefined).currentUser?.getIdToken()
      if (!token) return

      const res = await fetch("/api/admin-usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setUsuarios(data.usuarios)
    } catch {
      toast.error("Erro ao carregar usuários.")
    } finally {
      setCarregandoUsuarios(false)
    }
  }

  const ativarUsuario = async (targetUid: string) => {
    try {
      const { getAuth } = await import("firebase/auth")
      const { auth } = await import("@/lib/firebase")
      const token = await getAuth(auth ?? undefined).currentUser?.getIdToken()
      if (!token) return

      const res = await fetch("/api/admin-ativar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid, dias: 30 }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const expira = new Date(data.expiraEm).toLocaleDateString("pt-BR")
      toast.success(`Pro ativado! Expira em ${expira}`)
      setUsuarios((prev) =>
        prev.map((u) => u.uid === targetUid
          ? { ...u, statusLabel: "pro", expiraEm: data.expiraEm }
          : u
        )
      )
    } catch {
      toast.error("Erro ao ativar. Tente novamente.")
    }
  }

  useEffect(() => {
    if (aba === "usuarios") carregarUsuarios()
  }, [aba])

  useEffect(() => {
    if (aba !== "clientes" || !user || !isFirebaseConfigured || !db) return
    setCarregandoClientes(true)
    const q = query(collection(db, "perfis_clientes"), where("salonId", "==", user.uid))
    getDocs(q).then((snap) => {
      const lista: ClienteCadastrado[] = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as PerfilCliente) }))
      lista.sort((a, b) => a.nome.localeCompare(b.nome))
      setClientes(lista)
    }).finally(() => setCarregandoClientes(false))
  }, [aba, user])

  return (
    <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel Admin</h2>
          <p className="text-muted-foreground mt-1">Gerencie usuários, pedidos e clientes.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => aba === "usuarios" ? carregarUsuarios() : recarregar()} aria-label="Recarregar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {([
          { id: "usuarios", label: "Usuários", icon: <ShieldCheck className="w-4 h-4" />, count: usuarios.length },
          { id: "pedidos",  label: "Pedidos",  icon: <Inbox className="w-4 h-4" />,      count: pedidos.length },
          { id: "clientes", label: "Clientes", icon: <Users className="w-4 h-4" />,      count: clientes.length || 0 },
        ] as const).map(({ id, label, icon, count }) => (
          <button key={id} onClick={() => setAba(id as Aba)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {icon}{label}
            {count > 0 && <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
          </button>
        ))}
      </div>

      {/* Aba Usuários SaaS */}
      {aba === "usuarios" && (
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Donos de salão cadastrados
            </CardTitle>
            <CardDescription>
              Todos os usuários do FlowSchedule AI com seu status de plano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregandoUsuarios ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Carregando...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
            ) : (
              <div className="space-y-3">
                {usuarios.map((u) => (
                  <LinhaUsuario key={u.uid} usuario={u} onAtivar={ativarUsuario} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Aba Pedidos */}
      {aba === "pedidos" && (
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="w-4 h-4 text-primary" />Aguardando pagamento
            </CardTitle>
            <CardDescription>
              Clique em "Enviar Código" após confirmar o pagamento no PagSeguro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Carregando pedidos...
              </div>
            ) : pedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <CheckCircle className="w-8 h-8 text-green-500/50" />
                <p className="text-sm">Nenhum pedido pendente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.map((pedido) => (
                  <LinhaPedido key={pedido.id} pedido={pedido} enviando={enviando === pedido.id}
                    onEnviar={() => enviarCodigo(pedido)} />
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
              <Users className="w-4 h-4 text-primary" />Clientes cadastrados
            </CardTitle>
            <CardDescription>
              Clientes que criaram conta pelo seu link de agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregandoClientes ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Carregando...
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientes.map((c) => <LinhaCliente key={c.uid} cliente={c} />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
