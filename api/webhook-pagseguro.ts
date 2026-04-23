import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"
import { getAdminDb, getAdminAuth } from "./_lib/firebase-admin.js"
import { FieldValue } from "firebase-admin/firestore"

// Necessário para que o Stripe possa verificar a assinatura com o body bruto
export const config = { api: { bodyParser: false } }

async function ativarPro(userId: string, subscriptionId?: string): Promise<void> {
  const expiraEm = new Date()
  expiraEm.setDate(expiraEm.getDate() + 35)

  await getAdminDb().collection("assinaturas").doc(userId).set(
    {
      plano: "pro",
      status: "ativo",
      ativadoEm: FieldValue.serverTimestamp(),
      expiraEm,
      renovacaoAutomatica: true,
      ...(subscriptionId ? { psPreApprovalCode: subscriptionId } : {}),
    },
    { merge: true }
  )

  console.log(`[webhook] Pro ativado: ${userId}, expira ${expiraEm.toISOString()}`)
}

async function cancelarPro(userId: string): Promise<void> {
  await getAdminDb().collection("assinaturas").doc(userId).set(
    {
      plano: "gratuito",
      status: "inativo",
      renovacaoAutomatica: false,
      canceladoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  console.log(`[webhook] Assinatura cancelada: ${userId}`)
}

async function buscarUserIdPorEmail(email: string): Promise<string | null> {
  try {
    const userRecord = await getAdminAuth().getUserByEmail(email)
    return userRecord.uid
  } catch {
    console.warn("[webhook] usuário não encontrado por email:", email)
    return null
  }
}

async function lerBodyBruto(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => chunks.push(chunk))
    req.on("end", () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const rawBody = await lerBodyBruto(req)

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // ── Webhook Stripe ─────────────────────────────────────────────────────────
  if (stripeKey && req.headers["stripe-signature"]) {
    const stripe = new Stripe(stripeKey)
    let event: Stripe.Event

    try {
      event = webhookSecret
        ? stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"] as string, webhookSecret)
        : JSON.parse(rawBody.toString()) as Stripe.Event
    } catch (err) {
      console.error("[webhook] Stripe signature error:", err)
      return res.status(400).json({ error: "Webhook inválido" })
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
          ?? await buscarUserIdPorEmail(session.customer_email ?? "")
        if (userId) await ativarPro(userId, session.subscription as string)
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const userId = customer.metadata?.userId
          ?? await buscarUserIdPorEmail(customer.email ?? "")
        if (userId) await cancelarPro(userId)
      }

      if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const userId = customer.metadata?.userId
          ?? await buscarUserIdPorEmail(customer.email ?? "")
        if (userId) await ativarPro(userId, invoice.subscription as string)
      }
    } catch (err) {
      console.error("[webhook] Stripe handler error:", err)
    }

    return res.status(200).json({ received: true })
  }

  // ── Ativação manual via agentex ───────────────────────────────────────────
  const webhookSharedSecret = process.env.WEBHOOK_SECRET
  if (webhookSharedSecret) {
    const headerSecret = req.headers["x-webhook-secret"] ?? ""
    if (headerSecret !== webhookSharedSecret) {
      console.warn("[webhook] segredo inválido — requisição rejeitada")
      return res.status(401).json({ error: "Não autorizado" })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody.toString())
  } catch {
    return res.status(400).json({ error: "Body inválido" })
  }

  const { notificationType, status, senderEmail, preApprovalCode } = body as {
    notificationType?: string
    status?: string
    senderEmail?: string
    preApprovalCode?: string
  }

  if (notificationType === "preApproval" && status && senderEmail) {
    const userId = await buscarUserIdPorEmail(senderEmail)
    if (userId) {
      if (status === "ACTIVE") await ativarPro(userId, preApprovalCode)
      else if (status === "CANCELLED") await cancelarPro(userId)
    }
    return res.status(200).json({ received: true })
  }

  return res.status(200).json({ received: true })
}
