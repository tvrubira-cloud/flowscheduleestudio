import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb } from "./_lib/firebase-admin"
import { enviarConfirmacaoCliente } from "./_lib/email"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId, agendamentoId, clienteNome, clienteUid, data, hora } = req.body as {
    userId: string
    agendamentoId: string
    clienteNome: string
    clienteUid?: string
    data: string
    hora: string
  }

  if (!userId || !agendamentoId || !clienteNome || !data || !hora) {
    return res.status(200).json({ ok: true, skipped: "missing fields" })
  }

  try {
    // Busca nome do negócio
    const dispSnap = await getAdminDb().collection("disponibilidade").doc(userId).get()
    const nomeNegocio = (dispSnap.data()?.nomeNegocio as string | undefined) || "Seu negócio"

    // Busca email do cliente via perfil
    if (!clienteUid) {
      return res.status(200).json({ ok: true, skipped: "no clienteUid" })
    }

    const perfilSnap = await getAdminDb().collection("perfis_clientes").doc(clienteUid).get()
    if (!perfilSnap.exists) {
      return res.status(200).json({ ok: true, skipped: "client profile not found" })
    }

    const emailCliente = perfilSnap.data()?.email as string | undefined
    if (!emailCliente) {
      return res.status(200).json({ ok: true, skipped: "no client email" })
    }

    await enviarConfirmacaoCliente({
      para: emailCliente,
      nomeCliente: clienteNome,
      data,
      hora,
      nomeNegocio,
    })

    console.log(`[confirmar-agendamento] Email enviado para ${emailCliente}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[confirmar-agendamento] erro:", err)
    return res.status(200).json({ ok: true, error: String(err) })
  }
}
