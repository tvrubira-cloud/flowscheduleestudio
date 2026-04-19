import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { telefones, mensagem } = req.body as { telefones: string[]; mensagem: string }

  if (!Array.isArray(telefones) || telefones.length === 0 || !mensagem?.trim()) {
    return res.status(400).json({ error: "Parâmetros inválidos" })
  }

  const erros: string[] = []

  const resultados = await Promise.allSettled(
    telefones.map(async (tel, i) => {
      await new Promise((r) => setTimeout(r, i * 500))
      const numero = tel.replace(/\D/g, "")
      const chatId = `${numero.startsWith("55") ? numero : `55${numero}`}@c.us`
      const phoneNumber = numero.startsWith("55") ? numero : `55${numero}`

      const r = await fetch(`${BASE}/sendMessage/${TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, phoneNumber, message: mensagem }),
      })

      const body = await r.json() as { idMessage?: string; error?: string }
      console.log(`[enviar-promocao] ${phoneNumber}:`, JSON.stringify(body))

      if (!r.ok || !body.idMessage) {
        throw new Error(body.error ?? `HTTP ${r.status}`)
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
