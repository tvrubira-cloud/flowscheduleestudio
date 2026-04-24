import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"
import { getAdminAuth, firestoreGet, firestoreSet } from "./_lib/firebase-admin.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const idToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null

  if (!idToken) return res.status(401).json({ error: "Token não fornecido" })

  let userId: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    userId = decoded.uid
  } catch {
    return res.status(401).json({ error: "Token inválido" })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return res.status(500).json({ error: "Stripe não configurado" })

  const fields = await firestoreGet("assinaturas", userId)
  if (!fields) return res.status(404).json({ error: "Assinatura não encontrada" })

  const subscriptionId = (fields.psPreApprovalCode as { stringValue?: string } | undefined)?.stringValue

  if (!subscriptionId) {
    return res.status(400).json({ error: "ID da assinatura não encontrado. Contate o suporte." })
  }

  try {
    const stripe = new Stripe(stripeKey)
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })

    await firestoreSet("assinaturas", userId, {
      renovacaoAutomatica: false,
      canceladoEm: new Date(),
    })

    console.log(`[cancelar-assinatura] Cancelamento agendado: ${userId}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[cancelar-assinatura]", err)
    return res.status(500).json({ error: "Erro interno ao cancelar assinatura" })
  }
}
