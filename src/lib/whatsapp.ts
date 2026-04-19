import toast from "react-hot-toast"

export async function enviarMensagemWA(
  tel: string,
  mensagem: string,
  statusWA: "verificando" | "conectado" | "desconectado"
): Promise<void> {
  const numero = tel.replace(/\D/g, "")
  const numComPais = numero.startsWith("55") ? numero : `55${numero}`

  if (statusWA === "conectado") {
    try {
      const r = await fetch("/api/enviar-promocao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefones: [tel], mensagem }),
      })
      const d = await r.json() as { sucesso: number; falhou: number }
      if (d.sucesso > 0) {
        toast.success("Mensagem enviada via WhatsApp!")
        return
      }
    } catch {}
    toast.error("Falha no envio automático — abrindo WhatsApp...")
  }

  window.open(
    `https://wa.me/${numComPais}?text=${encodeURIComponent(mensagem)}`,
    "_blank",
    "noopener,noreferrer"
  )
}
