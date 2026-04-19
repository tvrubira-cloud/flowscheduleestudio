import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Settings, Copy, Check, Loader2, Calendar, Clock, Mail, Wifi, WifiOff, CheckCircle } from "lucide-react"
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function ConfiguracoesPage() {
  const { user, statusWA, setStatusWA } = useAppStore()
  const { disponibilidade, loading, salvando, carregar, salvar } = useDisponibilidade()

  const [form, setForm] = useState<Disponibilidade>(disponibilidade)
  const [copiado, setCopiado] = useState(false)

  // WhatsApp
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrErro, setQrErro] = useState<string | null>(null)
  const [carregandoQr, setCarregandoQr] = useState(false)

  const verificarStatus = () => {
    setStatusWA("verificando")
    fetch("/api/zapi-status")
      .then((r) => r.json())
      .then((d: { conectado: boolean }) => setStatusWA(d.conectado ? "conectado" : "desconectado"))
      .catch(() => setStatusWA("desconectado"))
  }

  const buscarQr = async () => {
    setCarregandoQr(true)
    setQrErro(null)
    try {
      const r = await fetch("/api/zapi-qrcode")
      const d = await r.json() as { qr?: string; erro?: string }
      if (d.qr) {
        setQrBase64(d.qr)
      } else if (d.erro === "alreadyLogged") {
        verificarStatus()
      } else {
        setQrErro(d.erro ?? "QR não disponível")
      }
    } catch {
      setQrErro("Erro ao carregar QR Code")
    } finally {
      setCarregandoQr(false)
    }
  }

  useEffect(() => { carregar() }, [])
  useEffect(() => { setForm(disponibilidade) }, [disponibilidade])
  useEffect(() => { verificarStatus() }, [])

  useEffect(() => {
    if (statusWA !== "desconectado") return
    buscarQr()
    const interval = setInterval(buscarQr, 30000)
    return () => clearInterval(interval)
  }, [statusWA])

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
          Defina sua disponibilidade e configure as integrações do sistema.
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

      {/* WhatsApp */}
      <Card className={`border-white/5 bg-zinc-900/20 ${statusWA === "desconectado" ? "border-amber-400/25" : statusWA === "conectado" ? "border-green-500/20" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              WhatsApp para Promoções
            </CardTitle>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${
              statusWA === "conectado"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : statusWA === "desconectado"
                ? "bg-amber-400/10 border-amber-400/20 text-amber-400"
                : "bg-white/5 border-white/10 text-muted-foreground"
            }`}>
              {statusWA === "verificando" && <Loader2 className="w-3 h-3 animate-spin" />}
              {statusWA === "conectado" && <Wifi className="w-3 h-3" />}
              {statusWA === "desconectado" && <WifiOff className="w-3 h-3" />}
              {statusWA === "verificando" ? "Verificando..." : statusWA === "conectado" ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <CardDescription>
            {statusWA === "conectado"
              ? "WhatsApp conectado. Você pode enviar promoções em massa pela aba Promoções."
              : "Conecte seu WhatsApp para enviar promoções em massa para seus clientes."}
          </CardDescription>
        </CardHeader>

        {statusWA === "conectado" && (
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">WhatsApp ativo</p>
                <p className="text-xs text-muted-foreground">Mensagens em massa habilitadas na aba Promoções.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto border-white/10 text-xs h-8 gap-1.5"
                onClick={verificarStatus}
              >
                <Wifi className="w-3 h-3" /> Verificar
              </Button>
            </div>
          </CardContent>
        )}

        {statusWA === "desconectado" && (
          <CardContent className="space-y-4">
            <ol className="text-xs text-muted-foreground space-y-1.5 list-none">
              <li>1. Abra o <strong className="text-foreground">WhatsApp</strong> no seu celular</li>
              <li>2. Toque em <strong className="text-foreground">⋮ Menu → Dispositivos conectados → Conectar dispositivo</strong></li>
              <li>3. Aponte a câmera para o QR Code abaixo</li>
            </ol>

            <div className="flex flex-col items-center gap-3">
              <div className="bg-white rounded-2xl p-3 w-52 h-52 flex items-center justify-center">
                {carregandoQr && <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />}
                {!carregandoQr && qrBase64 && (
                  <img src={qrBase64} alt="QR Code WhatsApp" className="w-full h-full object-contain" />
                )}
                {!carregandoQr && qrErro && (
                  <p className="text-xs text-red-400 text-center px-2">{qrErro}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">QR Code atualiza automaticamente a cada 30s</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 gap-1.5 text-xs"
                onClick={buscarQr}
                disabled={carregandoQr}
              >
                {carregandoQr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                Atualizar QR
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-[#25D366] hover:bg-[#1ebe5d] text-white border-none"
                onClick={() => { setQrBase64(null); verificarStatus() }}
              >
                <CheckCircle className="w-3 h-3" /> Já escaniei
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Suporte */}
      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
            Suporte
          </CardTitle>
          <CardDescription>
            Dúvidas ou problemas? Entre em contato com nossa equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="mailto:suporteflowschedule@gmail.com"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-mono"
          >
            <Mail className="w-4 h-4" />
            suporteflowschedule@gmail.com
          </a>
        </CardContent>
      </Card>
    </motion.div>
  )
}
