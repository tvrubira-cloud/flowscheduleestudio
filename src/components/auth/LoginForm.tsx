import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { authSchema } from "@/lib/validations"

export function LoginForm() {
  const { login, registrar } = useAuth()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [errors, setErrors] = useState<{ email?: string; senha?: string }>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const result = authSchema.safeParse({ email, senha })
    if (!result.success) {
      const fieldErrors: { email?: string; senha?: string } = {}
      result.error.issues.forEach((e) => {
        const field = e.path[0] as "email" | "senha"
        fieldErrors[field] = e.message
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    await login({ email, senha })
    setLoading(false)
  }

  const handleRegistrar = async () => {
    if (!validate()) return
    setLoading(true)
    await registrar({ email, senha })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-[400px]"
      >
        <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl overflow-hidden mb-4">
              <img src="/logo.jpg" alt="FlowSchedule AI" className="w-full h-full object-cover" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">FlowSchedule AI</CardTitle>
            <CardDescription>
              Crie sua conta e experimente grátis por <strong className="text-white">7 dias</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 mt-2">
            <div className="grid gap-1">
              <label htmlFor="email" className="text-sm font-medium">E-mail</label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="bg-zinc-900/50 border-white/10 h-11"
                autoComplete="email"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-400 mt-1">{errors.email}</p>
              )}
            </div>

            <div className="grid gap-1">
              <label htmlFor="senha" className="text-sm font-medium">Senha</label>
              <Input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-invalid={!!errors.senha}
                aria-describedby={errors.senha ? "senha-error" : undefined}
                className="bg-zinc-900/50 border-white/10 h-11"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              {errors.senha && (
                <p id="senha-error" role="alert" className="text-xs text-red-400 mt-1">{errors.senha}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="premium-gradient border-none shadow-lg shadow-primary/20 h-11 font-semibold uppercase tracking-wider text-xs"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRegistrar}
                disabled={loading}
                className="border-white/10 hover:bg-white/5 h-11 text-xs uppercase font-semibold"
              >
                {loading ? "Criando..." : "Cadastrar"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-1">
              Ao cadastrar, você ganha <strong className="text-white">7 dias grátis</strong> com todos os recursos Pro.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
