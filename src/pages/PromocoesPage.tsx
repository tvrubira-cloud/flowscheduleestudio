import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Megaphone, ImagePlus, Type, X, CheckSquare, Square, Send, CheckCircle, Loader2, Wifi, WifiOff, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useClientes } from "@/hooks/useClientes"
import { useAppStore } from "@/store/useAppStore"

export default function PromocoesPage() {
  const { clientes } = useClientes()
  const { setActiveTab } = useAppStore()

  const [modo, setModo] = useState<"texto" | "banner">("texto")
  const [texto, setTexto] = useState("")
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerNome, setBannerNome] = useState("")
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ sucesso: number; falhou: number; erros?: string[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [statusWA, setStatusWA] = useState<"verificando" | "conectado" | "desconectado">("verificando")

  useEffect(() => {
    fetch("/api/zapi-status")
      .then((r) => r.json())
      .then((d: { conectado: boolean }) => setStatusWA(d.conectado ? "conectado" : "desconectado"))
      .catch(() => setStatusWA("desconectado"))
  }, [])

  const toggleCliente = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selecionarTodos = () => setSelecionados(new Set(clientes.map((c) => c.id)))
  const limparSelecao = () => setSelecionados(new Set())

  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerNome(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setBannerUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const clientesSelecionados = clientes.filter((c) => selecionados.has(c.id))

  const mensagemFinal = modo === "texto"
    ? texto.trim()
    : `🎉 Temos uma promoção especial para você! Confira o banner em anexo e não perca essa oportunidade. Entre em contato para saber mais!`

  const podeEnviar = clientesSelecionados.length > 0 && mensagemFinal.length > 0 && statusWA === "conectado"

  const enviarParaTodos = async () => {
    setEnviando(true)
    setResultado(null)
    setErro(null)

    const mensagem = modo === "banner" && bannerUrl
      ? `${mensagemFinal}\n\n📎 _Veja o banner em anexo!_`
      : mensagemFinal

    try {
      const response = await fetch("/api/enviar-promocao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefones: clientesSelecionados.map((c) => c.telefone),
          mensagem,
        }),
      })
      const data = await response.json() as { sucesso: number; falhou: number; erros?: string[] }
      setResultado(data)
    } catch {
      setErro("Erro ao conectar com o servidor. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <motion.div
      key="promocoes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Promoções
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma promoção e envie via WhatsApp para os clientes selecionados.
          </p>
        </div>

        {/* Status WhatsApp */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 ${
          statusWA === "conectado"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : statusWA === "desconectado"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-white/5 border-white/10 text-muted-foreground"
        }`}>
          {statusWA === "verificando" && <Loader2 className="w-3 h-3 animate-spin" />}
          {statusWA === "conectado" && <Wifi className="w-3 h-3" />}
          {statusWA === "desconectado" && <WifiOff className="w-3 h-3" />}
          {statusWA === "verificando" ? "Verificando..." : statusWA === "conectado" ? "WhatsApp conectado" : "WhatsApp desconectado"}
        </div>
      </div>

      {/* Aviso quando desconectado */}
      {statusWA === "desconectado" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-400/25 bg-amber-400/5">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-400">WhatsApp não conectado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Escaneie o QR Code em Configurações para habilitar o envio.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 gap-1.5 text-xs shrink-0"
            onClick={() => setActiveTab("configuracoes")}
          >
            <Settings className="w-3 h-3" /> Configurações
          </Button>
        </div>
      )}

      {/* Card: criar promoção */}
      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="text-base">1. Criar promoção</CardTitle>
          <CardDescription>Escolha entre digitar uma mensagem ou enviar um banner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle modo */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setModo("texto")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                modo === "texto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Mensagem de texto
            </button>
            <button
              onClick={() => setModo("banner")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                modo === "banner" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5" /> Banner
            </button>
          </div>

          {/* Modo texto */}
          {modo === "texto" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Mensagem promocional</label>
              <textarea
                rows={5}
                placeholder={"Ex: 🎉 Promoção especial! Esta semana, corte + barba por apenas R$ 45. Agende já pelo link e garanta seu horário!"}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{texto.length} caracteres</p>
            </div>
          )}

          {/* Modo banner */}
          {modo === "banner" && (
            <div className="space-y-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium">{bannerNome || "Clique para selecionar o banner"}</p>
                <p className="text-xs text-muted-foreground">PNG, JPG ou GIF — max 5 MB</p>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBanner}
              />

              {bannerUrl && (
                <div className="relative">
                  <img
                    src={bannerUrl}
                    alt="Preview do banner"
                    className="w-full rounded-xl object-cover max-h-64"
                  />
                  <button
                    onClick={() => { setBannerUrl(null); setBannerNome("") }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1 transition-colors"
                    aria-label="Remover banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <p className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                💡 O WhatsApp abrirá com uma mensagem pronta. Você precisará anexar o banner manualmente antes de enviar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: selecionar clientes */}
      <Card className="border-white/5 bg-zinc-900/20">
        <CardHeader>
          <CardTitle className="text-base">2. Selecionar clientes</CardTitle>
          <CardDescription>
            {selecionados.size > 0
              ? `${selecionados.size} cliente${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`
              : "Nenhum cliente selecionado"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-white/5 rounded-xl text-sm">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 gap-1" onClick={selecionarTodos}>
                  <CheckSquare className="w-3 h-3" /> Todos
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 gap-1" onClick={limparSelecao}>
                  <Square className="w-3 h-3" /> Nenhum
                </Button>
              </div>

              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {clientes.map((c) => {
                  const sel = selecionados.has(c.id)
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => toggleCliente(c.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                          sel ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                          sel ? "bg-primary border-primary" : "border-white/20"
                        }`}>
                          {sel && <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {c.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.telefone}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enviando */}
      {enviando && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
            <div>
              <p className="font-semibold text-sm">Enviando promoção...</p>
              <p className="text-xs text-muted-foreground">
                Disparando mensagens para {clientesSelecionados.length} cliente{clientesSelecionados.length > 1 ? "s" : ""} via WhatsApp.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {resultado && (
        <Card className={resultado.falhou === 0 ? "border-green-500/30 bg-green-500/5" : "border-amber-400/30 bg-amber-400/5"}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle className={`w-6 h-6 shrink-0 ${resultado.falhou === 0 ? "text-green-400" : "text-amber-400"}`} />
            <div>
              <p className={`font-semibold text-sm ${resultado.falhou === 0 ? "text-green-400" : "text-amber-400"}`}>
                {resultado.falhou === 0 ? "Promoção enviada com sucesso!" : "Envio parcialmente concluído"}
              </p>
              <p className="text-xs text-muted-foreground">
                ✅ {resultado.sucesso} enviado{resultado.sucesso !== 1 ? "s" : ""}
                {resultado.falhou > 0 && ` · ❌ ${resultado.falhou} falhou${resultado.falhou !== 1 ? "ram" : ""}`}
              </p>
              {resultado.erros && resultado.erros.length > 0 && (
                <p className="text-xs text-red-400 mt-1">{resultado.erros[0]}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erro geral */}
      {erro && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-xs text-red-400">
          ❌ {erro}
        </div>
      )}

      {/* Botão enviar */}
      <Button
        className="w-full h-12 text-base font-bold gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-none disabled:opacity-50"
        disabled={!podeEnviar || enviando}
        onClick={enviarParaTodos}
      >
        {enviando
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
          : <><Send className="w-5 h-5" /> Disparar para {clientesSelecionados.length} cliente{clientesSelecionados.length !== 1 ? "s" : ""}</>
        }
      </Button>
    </motion.div>
  )
}
