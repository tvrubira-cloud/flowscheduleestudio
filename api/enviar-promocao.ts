import type { VercelRequest, VercelResponse } from "@vercel/node"

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { telefones, mensagem } = req.body as { telefones: string[]; mensagem: string }

  if (!Array.isArray(telefones) || telefones.length === 0 || !mensagem?.trim()) {
    return res.status(400).json({ error: "Parâmetros inválidos" })
  }

  // Envia em paralelo com pequeno stagger (200ms) para evitar rate limit
  const resultados = await Promise.allSettled(
    telefones.map(async (tel, i) => {
      await new Promise((r) => setTimeout(r, i * 200))
      const phone = `55${tel.replace(/\D/g, "")}`
      const response = await fetch(`${ZAPI_BASE}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: mensagem }),
      })
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`${response.status}: ${body}`)
      }
      return response.json()
    })
  )

  const sucesso = resultados.filter((r) => r.status === "fulfilled").length
  const falhou = resultados.filter((r) => r.status === "rejected").length
  const erros = resultados
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message ?? "Erro desconhecido")

  console.log(`[enviar-promocao] sucesso=${sucesso} falhou=${falhou}`, erros)
  return res.status(200).json({ sucesso, falhou })
}
