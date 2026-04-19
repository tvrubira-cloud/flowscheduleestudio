import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

async function resolverChatId(numero: string): Promise<string> {
  const r = await fetch(`${BASE}/checkWhatsapp/${TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: numero }),
  })
  if (!r.ok) return `${numero}@c.us`
  const d = await r.json() as { existsWhatsapp?: boolean; chatId?: string }
  if (d.existsWhatsapp && d.chatId) return d.chatId
  // Tenta formato sem o "9" extra (números antigos do Brasil 8 dígitos)
  const semNove = numero.replace(/^(55\d{2})9(\d{8})$/, "$1$2")
  if (semNove !== numero) {
    const r2 = await fetch(`${BASE}/checkWhatsapp/${TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: semNove }),
    })
    if (r2.ok) {
      const d2 = await r2.json() as { existsWhatsapp?: boolean; chatId?: string }
      if (d2.existsWhatsapp && d2.chatId) return d2.chatId
    }
  }
  throw new Error("Número sem WhatsApp")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { telefones, mensagem } = req.body as { telefones: string[]; mensagem: string }

  if (!Array.isArray(telefones) || telefones.length === 0 || !mensagem?.trim()) {
    return res.status(400).json({ error: "Parâmetros inválidos" })
  }

  const erros: string[] = []

  const resultados = await Promise.allSettled(
    telefones.map(async (tel, i) => {
      await new Promise((r) => setTimeout(r, i * 800))
      const digitos = tel.replace(/\D/g, "")
      const numero = digitos.startsWith("55") ? digitos : `55${digitos}`

      const chatId = await resolverChatId(numero)
      console.log(`[enviar-promocao] chatId resolvido: ${chatId}`)

      const r = await fetch(`${BASE}/sendMessage/${TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: mensagem }),
      })

      const body = await r.json() as { idMessage?: string; error?: string; message?: string }
      console.log(`[enviar-promocao] send ${chatId}:`, JSON.stringify(body))

      if (!r.ok || !body.idMessage) {
        throw new Error(body.error ?? body.message ?? `HTTP ${r.status}`)
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
