import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`
const PHONE_ID = process.env.MAYTAPI_PHONE_ID
const HEADERS = { "x-maytapi-key": process.env.MAYTAPI_TOKEN!, "Content-Type": "application/json" }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { telefones, mensagem } = req.body as { telefones: string[]; mensagem: string }

  if (!Array.isArray(telefones) || telefones.length === 0 || !mensagem?.trim()) {
    return res.status(400).json({ error: "Parâmetros inválidos" })
  }

  const resultados = await Promise.allSettled(
    telefones.map(async (tel, i) => {
      await new Promise((r) => setTimeout(r, i * 300))
      const to_number = `55${tel.replace(/\D/g, "")}`
      const r = await fetch(`${BASE}/${PHONE_ID}/sendMessage`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ to_number, type: "text", message: mensagem }),
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
