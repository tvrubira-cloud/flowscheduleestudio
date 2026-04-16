import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAuth } from "firebase-admin/auth"
import { adminDb } from "./_lib/firebase-admin"
import { enviarNotificacaoDono } from "./_lib/email"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { userId, clienteNome, clienteTelefone, data, hora } = req.body as {
      userId: string
      clienteNome: string
      clienteTelefone: string
      data: string
      hora: string
    }

    if (!userId || !clienteNome || !clienteTelefone || !data || !hora) {
      return res.status(200).json({ ok: true, skipped: "missing fields" })
    }

    // Busca o e-mail do dono via Firebase Auth
    const userRecord = await getAuth().getUser(userId)
    const emailDono = userRecord.email

    if (!emailDono) {
      return res.status(200).json({ ok: true, skipped: "no owner email" })
    }

    // Busca o nome do negócio no Firestore
    const docSnap = await adminDb.collection("disponibilidade").doc(userId).get()
    const nomeNegocio = (docSnap.data()?.nomeNegocio as string | undefined) || "Seu negócio"

    await enviarNotificacaoDono({
      para: emailDono,
      nomeNegocio,
      clienteNome,
      clienteTelefone,
      data,
      hora,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    // Nunca falha o agendamento — apenas loga o erro e retorna 200
    console.error("[notificar-agendamento] erro:", err)
    return res.status(200).json({ ok: true, error: String(err) })
  }
}
