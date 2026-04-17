import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Settings, Copy, Check, Loader2, Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDisponibilidade } from "@/hooks/useDisponibilidade"
import { useAppStore } from "@/store/useAppStore"
import type { Disponibilidade } from "@/types"
import toast from "react-hot-toast"

const DIAS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
]

const DURACOES = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
]

export default function ConfiguracoesPage() {
  const { user } = useAppStore()
  const { disponibilidade, loading, salvando, carregar, salvar } = useDisponibilidade()

  const [form, setForm] = useState<Disponibilidade>(disponibilidade)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    setForm(disponibilidade)
  }, [disponibilidade])

  const linkPublico = `${window.location.origin}/booking/${user?.uid ?? ""}`

  const copiarLink = async () => {
    await navigator.clipboard.writeText(linkPublico)
    setCopiado(true)
    toast.success("Link copiado!")
    setTimeout(() => setCopiado(false), 2000)
  }

  const toggleDia = (dia: number) => {
    setForm((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia].sort(),
    }))
  }

  const handleSalvar = () => {
    if (form.diasSemana.length === 0) {
      toast.error("Selecione ao menos um dia de atendimento.")
      return
    }
    if (form.horarioInicio >= form.horarioFim) {
      toast.error("Horário de início deve ser antes do horário de fim.")
      return
    }
    salvar(form)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando configurações...
      </div>
    )
  }

  return (
    <motion.div
      key="configuracoes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground mt-1">
          Defina sua disponibilidade para que clientes agendem online.
        </p>
      </div>

      {/* Link público */}
      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
            Seu link de agendamento
          </CardTitle>
          <CardDescription>
            Compartilhe este link com seus clientes — eles poderão ver sua agenda e agendar sozinhos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-zinc-950/50 rounded-lg border border-white/5">
            <p className="text-sm text-blue-400 font-mono flex-1 truncate">{linkPublico}</p>
            <Button size="sm" variant="ghost" onClick={copiarLink} aria-label="Copiar link">
              {copiado
                ? <Check className="w-4 h-4 text-green-400" />
                : <Copy className="w-4 h-4" />
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de disponibilidade */}
      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" aria-hidden="true" />
            Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Nome do negócio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do estabelecimento</label>
            <Input
              placeholder="Ex: Salão da Ana, Clínica Dr. João..."
              value={form.nomeNegocio}
              onChange={(e) => setForm((p) => ({ ...p, nomeNegocio: e.target.value }))}
            />
          </div>

          {/* Dias da semana */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dias de atendimento</label>
            <div className="flex gap-2 flex-wrap">
              {DIAS.map(({ id, label }) => {
                const ativo = form.diasSemana.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleDia(id)}
                    aria-pressed={ativo}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      ativo
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                Início
              </label>
              <Input
                type="time"
                value={form.horarioInicio}
                onChange={(e) => setForm((p) => ({ ...p, horarioInicio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                Fim
              </label>
              <Input
                type="time"
                value={form.horarioFim}
                onChange={(e) => setForm((p) => ({ ...p, horarioFim: e.target.value }))}
              />
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Duração de cada atendimento</label>
            <div className="flex gap-2 flex-wrap">
              {DURACOES.map(({ value, label }) => {
                const ativo = form.duracaoMinutos === value
                return (
                  <button
                    key={value}
                    onClick={() => setForm((p) => ({ ...p, duracaoMinutos: value }))}
                    aria-pressed={ativo}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      ativo
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full h-11 gap-2 font-bold"
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : "Salvar Configurações"
            }
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
