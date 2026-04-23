import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"
import { getAdminDb, getAdminAuth } from "./_lib/firebase-admin.js"
import { FieldValue } from "firebase-admin/firestore"

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
  if (!stripeKey) {
    return res.status(500).json({ error: "Stripe não configurado" })
  }

  const assinaturaSnap = await getAdminDb().collection("assinaturas").doc(userId).get()
  if (!assinaturaSnap.exists) {
    return res.status(404).json({ error: "Assinatura não encontrada" })
  }

  const { psPreApprovalCode } = assinaturaSnap.data() as { psPreApprovalCode?: string }

  if (!psPreApprovalCode) {
    return res.status(400).json({ error: "ID da assinatura não encontrado. Contate o suporte." })
  }

  try {
    const stripe = new Stripe(stripeKey)

    // Cancela no fim do período atual (não imediatamente)
    await stripe.subscriptions.update(psPreApprovalCode, {
      cancel_at_period_end: true,
    })

    await getAdminDb().collection("assinaturas").doc(userId).update({
      renovacaoAutomatica: false,
      canceladoEm: FieldValue.serverTimestamp(),
    })

    console.log(`[cancelar-assinatura] Cancelamento agendado: ${userId} / ${psPreApprovalCode}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[cancelar-assinatura]", err)
    return res.status(500).json({ error: "Erro interno ao cancelar assinatura" })
  }
}
