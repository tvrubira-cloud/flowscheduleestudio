import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb, getAdminAuth } from "./_lib/firebase-admin"
import { enviarNotificacaoDono, enviarConfirmacaoCliente } from "./_lib/email"
import { FieldValue } from "firebase-admin/firestore"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { userId, clienteNome, clienteTelefone, clienteUid, clienteEmail, data, hora } = req.body as {
      userId: string
      clienteNome: string
      clienteTelefone: string
      clienteUid?: string
      clienteEmail?: string
      data: string
      hora: string
    }

    if (!userId || !clienteNome || !clienteTelefone || !data || !hora) {
      return res.status(200).json({ ok: true, skipped: "missing fields" })
    }

    // ── Sincroniza cliente na lista do salão (setDoc com ID composto — sem índice) ──
    try {
      const tel = clienteTelefone.replace(/\D/g, "")
      const docId = `${userId}_${tel}`
      await getAdminDb().collection("clientes").doc(docId).set({
        nome: clienteNome,
        telefone: tel,
        userId,
        clienteUid: clienteUid ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      console.log(`[notificar-agendamento] Cliente sincronizado: ${clienteNome} → salão ${userId}`)
    } catch (err) {
      console.error("[notificar-agendamento] erro ao sincronizar cliente:", err)
    }

    // ── Notifica o dono por email ──────────────────────────────────────────
    const userRecord = await getAdminAuth().getUser(userId)
    const emailDono = userRecord.email
    if (!emailDono) return res.status(200).json({ ok: true, skipped: "no owner email" })

    const docSnap = await getAdminDb().collection("disponibilidade").doc(userId).get()
    const nomeNegocio = (docSnap.data()?.nomeNegocio as string | undefined) || "Seu negócio"

    await enviarNotificacaoDono({
      para: emailDono,
      nomeNegocio,
      clienteNome,
      clienteTelefone,
      data,
      hora,
    })

    if (clienteEmail) {
      try {
        await enviarConfirmacaoCliente({
          para: clienteEmail,
          nomeCliente: clienteNome,
          data,
          hora,
          nomeNegocio,
        })
        console.log(`[notificar-agendamento] Confirmação enviada para cliente: ${clienteEmail}`)
      } catch (err) {
        console.error("[notificar-agendamento] erro ao enviar email ao cliente:", err)
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[notificar-agendamento] erro:", err)
    return res.status(200).json({ ok: true, error: String(err) })
  }
}
