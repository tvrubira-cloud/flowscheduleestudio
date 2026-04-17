import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Resend } from "resend"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { para } = req.body as { para?: string }
  if (!para) return res.status(400).json({ error: "campo 'para' obrigatório" })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: para,
    subject: "Teste FlowSchedule — email funcionando",
    html: "<p>Se você recebeu este email, o Resend está configurado corretamente.</p>",
  })

  return res.status(200).json({
    from: FROM,
    to: para,
    resend_key_prefix: process.env.RESEND_API_KEY?.slice(0, 8),
    data,
    error,
  })
}
