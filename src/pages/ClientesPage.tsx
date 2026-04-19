import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, Users, Phone, Pencil, Trash2, X, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useClientes } from "@/hooks/useClientes"
import { clienteSchema } from "@/lib/validations"
import { enviarMensagemWA } from "@/lib/whatsapp"
import { useAppStore } from "@/store/useAppStore"
import type { Cliente } from "@/types"

// ─── Ícone WhatsApp ───────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────

interface ModalEditarProps {
  cliente: Cliente
  onSalvar: (nome: string, telefone: string) => Promise<void>
  onFechar: () => void
}

function ModalEditar({ cliente, onSalvar, onFechar }: ModalEditarProps) {
  const [nome, setNome] = useState(cliente.nome)
  const [telefone, setTelefone] = useState(cliente.telefone)
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!nome.trim() || nome.trim().length < 2) return
    setSalvando(true)
    await onSalvar(nome.trim(), telefone.replace(/\D/g, ""))
    setSalvando(false)
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onFechar} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-sm font-bold">Editar Cliente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{cliente.nome}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onFechar}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-zinc-800" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">WhatsApp (com DDD)</label>
            <Input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
              maxLength={11}
              className="bg-zinc-800"
            />
          </div>
          <Button
            onClick={handleSalvar}
            disabled={salvando || !nome.trim() || nome.trim().length < 2}
            className="w-full gap-2"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Salvar alteração
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { clientes, adicionarCliente, editarCliente, deletarCliente } = useClientes()
  const { statusWA } = useAppStore()

  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [errors, setErrors] = useState<{ nome?: string; telefone?: string }>({})
  const [loading, setLoading] = useState(false)

  const [editando, setEditando] = useState<Cliente | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = clienteSchema.safeParse({ nome, telefone })
    if (!result.success) {
      const fieldErrors: { nome?: string; telefone?: string } = {}
      result.error.issues.forEach((err) => {
        const field = err.path[0] as "nome" | "telefone"
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setLoading(true)
    await adicionarCliente(result.data)
    setLoading(false)
    setNome("")
    setTelefone("")
  }

  const abrirWhatsApp = async (cliente: Cliente) => {
    const texto = `Olá, ${cliente.nome}! Tudo bem? 😊 Passamos para lembrar que você pode agendar seu horário online a qualquer hora pelo nosso link de agendamento.`
    await enviarMensagemWA(cliente.telefone, texto, statusWA)
  }

  return (
    <motion.div
      key="clientes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Formulário de cadastro */}
      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            Cadastrar Novo Cliente
          </CardTitle>
          <CardDescription>
            Adicione as informações de contato para gerar agendamentos via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="nome" className="text-sm font-medium">Nome Completo</label>
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-invalid={!!errors.nome}
                aria-describedby={errors.nome ? "nome-error" : undefined}
                autoComplete="name"
              />
              {errors.nome && (
                <p id="nome-error" role="alert" className="text-xs text-red-400">{errors.nome}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="telefone" className="text-sm font-medium">WhatsApp (com DDD)</label>
              <Input
                id="telefone"
                type="tel"
                placeholder="11999999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!errors.telefone}
                aria-describedby={errors.telefone ? "telefone-error" : "telefone-hint"}
                maxLength={11}
                autoComplete="tel"
              />
              <p id="telefone-hint" className="text-xs text-muted-foreground">
                Somente números, com DDD. Ex: 11999999999
              </p>
              {errors.telefone && (
                <p id="telefone-error" role="alert" className="text-xs text-red-400">{errors.telefone}</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      {clientes.length > 0 && (
        <Card className="border-white/5 bg-zinc-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" aria-hidden="true" />
              Clientes cadastrados ({clientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {clientes.map((c) => (
                <li key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-2">
                  {/* Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.nome}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {c.telefone}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 border-t border-white/5 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-[#25D366] hover:text-[#1ebe5d] hover:bg-green-500/10 gap-1"
                      onClick={() => abrirWhatsApp(c)}
                    >
                      <WhatsAppIcon className="w-3 h-3" />
                      WhatsApp
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1"
                      onClick={() => setEditando(c)}
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>

                    {confirmandoExclusao === c.id ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground px-2"
                          onClick={() => setConfirmandoExclusao(null)}
                        >
                          Não
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white px-2"
                          onClick={async () => {
                            await deletarCliente(c.id)
                            setConfirmandoExclusao(null)
                          }}
                        >
                          Confirmar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 ml-auto"
                        onClick={() => setConfirmandoExclusao(c.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Modal editar */}
      <AnimatePresence>
        {editando && (
          <ModalEditar
            cliente={editando}
            onSalvar={(n, t) => editarCliente(editando.id, n, t)}
            onFechar={() => setEditando(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
