import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  RefreshCw, Send, Loader2, Inbox, Clock, CheckCircle, Users,
  Phone, Mail, Calendar, ShieldCheck, Zap, BadgeCheck, UserX, Gift,
  Store, Timer, Trash2,
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
    trial:    { label: "Teste",   className: "bg-green-500/15 text-green-400 border-green-500/20",     icon: <Zap className="w-3 h-3" /> },
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
  nomeNegocio: string | null
  criadoEm: string
  statusLabel: string
  isAdmin: boolean
  expiraEm: string | null
  trialExpiraEm: string | null
  trialDaysLeft: number | null
  ultimoBonusIndicacao: string | null
  referidoPor: string | null
}

function LinhaUsuario({ usuario, onAtivar, onExcluir }: {
  usuario: UsuarioSaaS
  onAtivar: (uid: string) => Promise<void>
  onExcluir: (uid: string, email: string) => Promise<void>
}) {
  const [ativando, setAtivando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
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

  const handleExcluir = async () => {
    setExcluindo(true)
    await onExcluir(usuario.uid, usuario.email)
    setExcluindo(false)
    setConfirmando(false)
  }

  return (
    <div className="flex items-start justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {usuario.nomeNegocio && (
            <p className="font-semibold text-sm truncate flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-primary shrink-0" />
              {usuario.nomeNegocio}
            </p>
          )}
          <StatusBadge status={usuario.statusLabel} />
        </div>
        <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />cadastro: {criado}
          </p>
          {usuario.statusLabel === "trial" && usuario.trialDaysLeft !== null && (
            <p className={`text-xs flex items-center gap-1 font-medium ${
              usuario.trialDaysLeft <= 2 ? "text-red-400" : usuario.trialDaysLeft <= 4 ? "text-yellow-400" : "text-green-400"
            }`}>
              <Timer className="w-3 h-3" />
              {usuario.trialDaysLeft <= 0 ? "expira hoje" : `${usuario.trialDaysLeft} dia${usuario.trialDaysLeft === 1 ? "" : "s"} de teste`}
            </p>
          )}
          {expira && usuario.statusLabel === "pro" && (
            <p className="text-xs text-blue-400 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" />Pro até {expira}
            </p>
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
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-white/10"
            onClick={handleAtivar} disabled={ativando || excluindo}>
            {ativando ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3 text-blue-400" />}
            Dar 30 dias Pro
          </Button>
          {confirmando ? (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" className="h-7 text-xs flex-1"
                onClick={handleExcluir} disabled={excluindo}>
                {excluindo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 border border-white/10"
                onClick={() => setConfirmando(false)} disabled={excluindo}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 border border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => setConfirmando(true)}>
              <Trash2 className="w-3 h-3" />Excluir
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card de métrica ──────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, className }: {
  label: string; value: number; icon: React.ReactNode; className: string
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${className}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Página Admin ─────────────────────────────────────────────────────────────

type Aba = "pedidos" | "clientes" | "usuarios"
type Filtro = "todos" | "trial" | "pro" | "gratuito"

export default function AdminPage() {
  const { pedidos, loading, enviando, enviarCodigo, recarregar } = usePedidos()
  const { user } = useAppStore()
  const [aba, setAba] = useState<Aba>("usuarios")
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [busca, setBusca] = useState("")
  const [clientes, setClientes] = useState<ClienteCadastrado[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioSaaS[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)

  const carregarUsuarios = async () => {
    if (!user) return
    setCarregandoUsuarios(true)
    try {
      const { auth } = await import("@/lib/firebase")
      const token = await auth?.currentUser?.getIdToken()
      if (!token) return

      const res = await fetch("/api/admin-usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setUsuarios(data.usuarios)
    } catch (e) {
      console.error("[carregarUsuarios]", e)
      toast.error("Erro ao carregar usuários.")
    } finally {
      setCarregandoUsuarios(false)
    }
  }

  const excluirUsuario = async (targetUid: string, email: string) => {
    try {
      const { auth } = await import("@/lib/firebase")
      const token = await auth?.currentUser?.getIdToken()
      if (!token) return

      const res = await fetch("/api/admin-excluir", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${email} excluído com sucesso.`)
      setUsuarios((prev) => prev.filter((u) => u.uid !== targetUid))
    } catch {
      toast.error("Erro ao excluir. Tente novamente.")
    }
  }

  const ativarUsuario = async (targetUid: string) => {
    try {
      const { auth } = await import("@/lib/firebase")
      const token = await auth?.currentUser?.getIdToken()
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

  // Métricas (excluindo o próprio admin)
  const saloesReais = usuarios.filter((u) => !u.isAdmin)
  const totalTrial = saloesReais.filter((u) => u.statusLabel === "trial").length
  const totalPro = saloesReais.filter((u) => u.statusLabel === "pro").length
  const totalGratuito = saloesReais.filter((u) => u.statusLabel === "gratuito").length

  // Filtro + busca
  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtro !== "todos" && u.statusLabel !== filtro) return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      return u.email.toLowerCase().includes(q) || (u.nomeNegocio ?? "").toLowerCase().includes(q)
    }
    return true
  })

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
          { id: "usuarios", label: "Salões",   icon: <Store className="w-4 h-4" />,  count: saloesReais.length },
          { id: "pedidos",  label: "Pedidos",  icon: <Inbox className="w-4 h-4" />,  count: pedidos.length },
          { id: "clientes", label: "Clientes", icon: <Users className="w-4 h-4" />,  count: clientes.length || 0 },
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

      {/* Aba Salões */}
      {aba === "usuarios" && (
        <div className="space-y-4">
          {/* Cards de métricas */}
          {!carregandoUsuarios && saloesReais.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Total de salões" value={saloesReais.length}
                icon={<Store className="w-5 h-5 text-muted-foreground" />}
                className="bg-white/5 border-white/5" />
              <MetricCard label="Em teste" value={totalTrial}
                icon={<Zap className="w-5 h-5 text-green-400" />}
                className="bg-green-500/5 border-green-500/15" />
              <MetricCard label="Plano Pro" value={totalPro}
                icon={<BadgeCheck className="w-5 h-5 text-blue-400" />}
                className="bg-blue-500/5 border-blue-500/15" />
              <MetricCard label="Sem plano" value={totalGratuito}
                icon={<UserX className="w-5 h-5 text-zinc-400" />}
                className="bg-zinc-500/5 border-zinc-500/15" />
            </div>
          )}

          <Card className="border-white/5 bg-zinc-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="w-4 h-4 text-primary" />Salões cadastrados
              </CardTitle>
              <CardDescription>Todos os salões com seu status de plano atual.</CardDescription>

              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="mt-2 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />

              <div className="flex flex-wrap gap-1.5 mt-2">
                {([
                  { id: "todos",    label: "Todos",     count: saloesReais.length },
                  { id: "trial",    label: "Em teste",  count: totalTrial },
                  { id: "pro",      label: "Pro",       count: totalPro },
                  { id: "gratuito", label: "Sem plano", count: totalGratuito },
                ] as const).map(({ id, label, count }) => (
                  <button key={id} onClick={() => setFiltro(id)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                      filtro === id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                    }`}>
                    {label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtro === id ? "bg-white/20" : "bg-white/10"}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {carregandoUsuarios ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />Carregando...
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Nenhum salão encontrado.</div>
              ) : (
                <div className="space-y-3">
                  {usuariosFiltrados.map((u) => (
                    <LinhaUsuario key={u.uid} usuario={u} onAtivar={ativarUsuario} onExcluir={excluirUsuario} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aba Pedidos */}
      {aba === "pedidos" && (
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="w-4 h-4 text-primary" />Aguardando pagamento
            </CardTitle>
            <CardDescription>
              Clique em "Enviar Código" após confirmar o pagamento no Stripe.
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
