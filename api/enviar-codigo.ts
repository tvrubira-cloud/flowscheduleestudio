import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb } from "./_lib/firebase-admin.js"
import { enviarCodigoAtivacao } from "./_lib/email.js"
import { FieldValue } from "firebase-admin/firestore"

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ""

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const parte = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `FLOW-${parte(4)}-${parte(4)}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Proteção simples por secret — só você sabe essa senha
  const { secret, pedidoId, email, nome } = req.body as {
    secret?: string
    pedidoId?: string
    email?: string
    nome?: string
  }

  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Não autorizado." })
  }

  if (!pedidoId || !email) {
    return res.status(400).json({ error: "pedidoId e email são obrigatórios." })
  }

  try {
    // 1. Gera código único
    let codigo = ""
    for (let i = 0; i < 5; i++) {
      const tentativa = gerarCodigo()
      const existe = await getAdminDb().collection("codigos_ativacao").doc(tentativa).get()
      if (!existe.exists) { codigo = tentativa; break }
    }

    if (!codigo) throw new Error("Não foi possível gerar código único.")

    // 2. Salva código no Firestore
    await getAdminDb().collection("codigos_ativacao").doc(codigo).set({
      usado: false,
      email,
      nome: nome ?? "Cliente",
      pedidoId,
      criadoEm: FieldValue.serverTimestamp(),
    })

    // 3. Marca pedido como código enviado
    await getAdminDb().collection("pedidos_pendentes").doc(pedidoId).update({
      status: "codigo_enviado",
      codigo,
      enviadoEm: FieldValue.serverTimestamp(),
    })

    // 4. Envia e-mail com o código
    await enviarCodigoAtivacao({ para: email, nomeCliente: nome ?? "Cliente", codigo })

    return res.status(200).json({ ok: true, codigo })
  } catch (err) {
    console.error("[enviar-codigo]", err)
    return res.status(500).json({ error: "Erro interno." })
  }
}
