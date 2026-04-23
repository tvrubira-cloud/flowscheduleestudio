import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"

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

  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey) {
    return res.status(500).json({ error: "Stripe não configurado" })
  }

  try {
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { name: "FlowSchedule AI - Plano Pro Mensal" },
            unit_amount: 4990,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: { userId, nome: nome ?? "", email },
      success_url: "https://www.flowschedule.online/?stripe=ok",
      cancel_url: "https://www.flowschedule.online/",
    })
    return res.status(200).json({ checkoutUrl: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[criar-assinatura] Stripe error:", msg)
    return res.status(500).json({ error: "Erro ao criar sessão Stripe", details: msg })
  }
}
