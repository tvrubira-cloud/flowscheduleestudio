import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resultados: Record<string, unknown> = {}

  // 1. Desativa webhooks desnecessários (não precisamos receber mensagens)
  const settings = await fetch(`${BASE}/setSettings/${TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      incomingWebhook: "no",
      outgoingWebhook: "no",
      outgoingAPIMessageWebhook: "no",
      stateWebhook: "no",
      pollMessageWebhook: "no",
    }),
  }).then(r => r.json())
  resultados.settings = settings

  // 2. Limpa a fila de notificações (até 50 itens)
  let limpos = 0
  for (let i = 0; i < 50; i++) {
    const r = await fetch(`${BASE}/receiveNotification/${TOKEN}`)
    const d = await r.json() as { receiptId?: number } | null
    if (!d || !d.receiptId) break
    await fetch(`${BASE}/deleteNotification/${TOKEN}/${d.receiptId}`, { method: "DELETE" })
    limpos++
  }
  resultados.notificacoesLimpas = limpos

  return res.status(200).json(resultados)
}
