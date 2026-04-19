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

  const erros: string[] = []

  const resultados = await Promise.allSettled(
    telefones.map(async (tel, i) => {
      await new Promise((r) => setTimeout(r, i * 400))
      const numero = tel.replace(/\D/g, "")
      const base = numero.startsWith("55") ? numero : `55${numero}`
      const to_number = `${base}@c.us`

      const r = await fetch(`${BASE}/${PHONE_ID}/sendMessage`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ to_number, type: "text", message: mensagem }),
      })

      const body = await r.json() as { success?: boolean; message?: string }
      console.log(`[enviar-promocao] ${to_number}:`, JSON.stringify(body))

      if (!r.ok || body.success === false) {
        throw new Error(body.message ?? `HTTP ${r.status}`)
      }
      return body
    })
  )

  const sucesso = resultados.filter((r) => r.status === "fulfilled").length
  const falhou = resultados.filter((r) => r.status === "rejected").length

  resultados.forEach((r, i) => {
    if (r.status === "rejected") erros.push(`${telefones[i]}: ${r.reason?.message}`)
  })

  console.log(`[enviar-promocao] sucesso=${sucesso} falhou=${falhou}`, erros)
  return res.status(200).json({ sucesso, falhou, erros })
}
