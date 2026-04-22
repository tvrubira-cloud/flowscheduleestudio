import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb } from "./_lib/firebase-admin.js"
import { enviarLembreteAgendamento } from "./_lib/email.js"
import { FieldValue } from "firebase-admin/firestore"

// Roda todo dia às 12:00 UTC (09:00 horário de Brasília)
// Envia lembretes para agendamentos confirmados de amanhã

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end()

  // Proteção: só o cron do Vercel ou quem tem o CRON_SECRET pode disparar
  const secret = process.env.CRON_SECRET ?? process.env.ADMIN_SECRET
  const auth = req.headers.authorization
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Não autorizado" })
  }

  // Amanhã no fuso de Brasília (UTC-3) — às 09:00 BRT a data UTC é a mesma
  const amanha = new Date()
  amanha.setUTCDate(amanha.getUTCDate() + 1)
  const amanhaStr = amanha.toISOString().split("T")[0] // "YYYY-MM-DD"

  try {
    const snap = await getAdminDb()
      .collection("agendamentos_publicos")
      .where("data", "==", amanhaStr)
      .where("status", "==", "confirmado")
      .get()

    // Filtra os que ainda não receberam lembrete
    const pendentes = snap.docs.filter((d) => !d.data().lembreteEnviado)

    let enviados = 0
    let erros = 0

    for (const docSnap of pendentes) {
      const ag = docSnap.data()
      const { clienteUid, clienteNome, hora, userId } = ag

      if (!clienteUid) continue // agendamento sem conta — sem email

      try {
        // Email do cliente
        const perfilSnap = await getAdminDb().collection("perfis_clientes").doc(clienteUid).get()
        if (!perfilSnap.exists) continue
        const { email, nome } = perfilSnap.data() as { email: string; nome: string }

        // Nome do negócio
        const dispSnap = await getAdminDb().collection("disponibilidade").doc(userId).get()
        const nomeNegocio = dispSnap.exists
          ? ((dispSnap.data() as { nomeNegocio?: string }).nomeNegocio ?? "seu serviço")
          : "seu serviço"

        await enviarLembreteAgendamento({
          para: email,
          nomeCliente: nome || clienteNome,
          data: amanhaStr,
          hora,
          nomeNegocio,
        })

        await getAdminDb().collection("agendamentos_publicos").doc(docSnap.id).update({
          lembreteEnviado: true,
          lembreteEnviadoEm: FieldValue.serverTimestamp(),
        })

        enviados++
      } catch (err) {
        console.error(`[lembretes] Erro no agendamento ${docSnap.id}:`, err)
        erros++
      }
    }

    console.log(`[lembretes] ${amanhaStr}: ${enviados} enviados, ${erros} erros`)
    return res.status(200).json({ ok: true, data: amanhaStr, enviados, erros })
  } catch (err) {
    console.error("[lembretes]", err)
    return res.status(500).json({ error: "Erro interno" })
  }
}
