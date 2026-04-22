import type { VercelRequest, VercelResponse } from "@vercel/node"
import { adminDb } from "./_lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId, nome, email } = req.body as {
    userId?: string
    nome?: string
    email?: string
  }

  if (!userId || !email) {
    return res.status(400).json({ error: "userId e email são obrigatórios" })
  }

  const psToken = process.env.PAGSEGURO_TOKEN
  const psEmail = process.env.PAGSEGURO_EMAIL

  console.log("[criar-assinatura] token presente:", !!psToken, "email presente:", !!psEmail)

  if (!psToken) {
    return res.status(500).json({ error: "PAGSEGURO_TOKEN não configurado no Vercel" })
  }

  const appUrl = "https://www.flowschedule.online"
  const notificationUrl = process.env.PAGSEGURO_NOTIFICATION_URL
    ?? `${appUrl}/api/webhook-pagseguro`

  const params = new URLSearchParams({
    currency: "BRL",
    reference: `PRO-${userId}`,
    senderName: nome?.trim() || email.split("@")[0],
    senderEmail: email,
    preApprovalCharge: "auto",
    preApprovalName: "FlowSchedule AI Pro",
    preApprovalAmountPerPayment: "49.90",
    preApprovalPeriod: "MONTHLY",
    preApprovalMaxTotalAmount: "9999.00",
    preApprovalExpirationValue: "10",
    preApprovalExpirationUnit: "YEARS",
    redirectURL: `${appUrl}/?ps=ok`,
    notificationURL: notificationUrl,
  })

  // Tenta autenticação Bearer (PagBank novo) primeiro,
  // cai para email+token (PagSeguro legado) se necessário
  const usarBearer = !psEmail

  const url = usarBearer
    ? `https://api.pagseguro.com/pre-approvals/request`
    : `https://ws.pagseguro.uol.com.br/v2/pre-approvals/request?email=${psEmail}&token=${psToken}`

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/vnd.pagseguro.com.br.v3+xml;charset=ISO-8859-1",
  }

  if (usarBearer) {
    headers["Authorization"] = `Bearer ${psToken}`
  }

  try {
    const psRes = await fetch(url, { method: "POST", headers, body: params.toString() })
    const text = await psRes.text()

    if (!psRes.ok) {
      console.error("[criar-assinatura] PagBank error:", psRes.status, text)
      return res.status(502).json({ error: "Erro ao criar assinatura no PagBank", details: text })
    }

    const checkoutCode = text.match(/<checkoutCode>(.*?)<\/checkoutCode>/)?.[1]

    if (!checkoutCode) {
      console.error("[criar-assinatura] checkoutCode ausente:", text)
      return res.status(502).json({ error: "Código não retornado pelo PagBank" })
    }

    await adminDb.collection("assinaturas_pendentes").doc(userId).set({
      userId,
      nome: nome?.trim() || email.split("@")[0],
      email,
      checkoutCode,
      criadoEm: FieldValue.serverTimestamp(),
    })

    const checkoutUrl = `https://pagseguro.uol.com.br/v2/pre-approvals/request.html?code=${checkoutCode}`
    return res.status(200).json({ checkoutUrl })
  } catch (err) {
    console.error("[criar-assinatura]", err)
    return res.status(500).json({ error: "Erro interno ao criar assinatura" })
  }
}
