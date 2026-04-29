import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"
import { getAdminAuth, firestoreSet } from "./_lib/firebase-admin.js"

async function ativarPro(userId: string, subscriptionId?: string): Promise<void> {
  const expiraEm = new Date()
  expiraEm.setDate(expiraEm.getDate() + 35)

  await firestoreSet("assinaturas", userId, {
    plano: "pro",
    status: "ativo",
    ativadoEm: new Date(),
    expiraEm,
    renovacaoAutomatica: true,
    ...(subscriptionId ? { psPreApprovalCode: subscriptionId } : {}),
  })

  console.log(`[webhook] Pro ativado: ${userId}, expira ${expiraEm.toISOString()}`)
}

async function cancelarPro(userId: string): Promise<void> {
  await firestoreSet("assinaturas", userId, {
    plano: "gratuito",
    status: "inativo",
    renovacaoAutomatica: false,
    canceladoEm: new Date(),
  })
  console.log(`[webhook] Assinatura cancelada: ${userId}`)
}

async function buscarUserIdPorEmail(email: string): Promise<string | null> {
  try {
    const userRecord = await getAdminAuth().getUserByEmail(email)
    return userRecord.uid
  } catch (err) {
    console.warn("[webhook] usuário não encontrado por email:", email, String(err))
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // ── Webhook Stripe ─────────────────────────────────────────────────────────
  if (stripeKey && req.headers["stripe-signature"]) {
    const stripe = new Stripe(stripeKey)
    let event: Stripe.Event

    try {
      const rawBody = req.body instanceof Buffer
        ? req.body
        : Buffer.from(JSON.stringify(req.body))

      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(
          rawBody,
          req.headers["stripe-signature"] as string,
          webhookSecret
        )
      } else {
        event = req.body as Stripe.Event
      }
    } catch {
      console.warn("[webhook] assinatura não verificada, usando req.body diretamente")
      event = req.body as Stripe.Event
    }

    if (!event?.type) {
      console.error("[webhook] evento inválido ou body vazio")
      return res.status(400).json({ error: "Evento inválido" })
    }

    console.log(`[webhook] Stripe evento: ${event.type}`)

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
          ?? await buscarUserIdPorEmail(session.customer_email ?? "")
        if (userId) await ativarPro(userId, session.subscription as string)
        else console.warn("[webhook] userId não encontrado para:", session.customer_email)
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
        const userId = customer.metadata?.userId
          ?? await buscarUserIdPorEmail(customer.email ?? "")
        if (userId) await cancelarPro(userId)
      }

      if (event.type === "invoice.payment_succeeded" || event.type === "invoice_payment.paid") {
        const obj = event.data.object as Stripe.Invoice & { invoice?: string }
        const customerId = obj.customer as string | undefined
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
          const userId = customer.metadata?.userId
            ?? await buscarUserIdPorEmail(customer.email ?? "")
          if (userId) await ativarPro(userId, ((obj as any).subscription ?? (obj as any).invoice) as string)
        }
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

  const { notificationType, status, senderEmail, preApprovalCode } = req.body as {
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
