import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = process.env.EVOLUTION_URL
const KEY = process.env.EVOLUTION_KEY
const INSTANCE = process.env.EVOLUTION_INSTANCE

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { telefones, mensagem } = req.body as { telefones: string[]; mensagem: string }

  if (!Array.isArray(telefones) || telefones.length === 0 || !mensagem?.trim()) {
    return res.status(400).json({ error: "Parâmetros inválidos" })
  }

  const resultados = await Promise.allSettled(
    telefones.map(async (tel, i) => {
      await new Promise((r) => setTimeout(r, i * 300))
      const number = `55${tel.replace(/\D/g, "")}`
      const r = await fetch(`${BASE}/message/sendText/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY! },
        body: JSON.stringify({ number, text: mensagem }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
  )

  const sucesso = resultados.filter((r) => r.status === "fulfilled").length
  const falhou = resultados.filter((r) => r.status === "rejected").length

  console.log(`[enviar-promocao] sucesso=${sucesso} falhou=${falhou}`)
  return res.status(200).json({ sucesso, falhou })
}
