import { useState } from "react"
import { motion } from "framer-motion"
import { UserPlus, Users, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useClientes } from "@/hooks/useClientes"
import { clienteSchema } from "@/lib/validations"

export default function ClientesPage() {
  const { clientes, adicionarCliente } = useClientes()

  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [errors, setErrors] = useState<{ nome?: string; telefone?: string }>({})
  const [loading, setLoading] = useState(false)

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

  return (
    <motion.div
      key="clientes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
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
              <label htmlFor="nome" className="text-sm font-medium">
                Nome Completo
              </label>
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
                <p id="nome-error" role="alert" className="text-xs text-red-400">
                  {errors.nome}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="telefone" className="text-sm font-medium">
                WhatsApp (com DDD)
              </label>
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
                <p id="telefone-error" role="alert" className="text-xs text-red-400">
                  {errors.telefone}
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                <li key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="font-medium text-sm">{c.nome}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {c.telefone}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
