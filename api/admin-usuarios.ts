import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb, getAdminAuth } from "./_lib/firebase-admin"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const adminSnap = await getAdminDb().collection("assinaturas").doc(decoded.uid).get()
    if (!adminSnap.data()?.isAdmin) return res.status(403).json({ error: "Forbidden" })

    const listResult = await getAdminAuth().listUsers(1000)
    const uids = listResult.users.map((u) => u.uid)

    // Busca assinaturas em lotes de 10
    const assinaturas: Record<string, Record<string, unknown>> = {}
    for (let i = 0; i < uids.length; i += 10) {
      const batch = uids.slice(i, i + 10)
      const snaps = await Promise.all(
        batch.map((uid) => getAdminDb().collection("assinaturas").doc(uid).get())
      )
      snaps.forEach((snap, idx) => {
        assinaturas[batch[idx]] = snap.exists ? (snap.data() as Record<string, unknown>) : {}
      })
    }

    // Busca emails dos referrers
    const referrerUids = new Set<string>()
    Object.values(assinaturas).forEach((a) => {
      if (a.referidoPor) referrerUids.add(a.referidoPor as string)
    })
    const referrerEmails: Record<string, string> = {}
    for (const uid of referrerUids) {
      try {
        const u = await getAdminAuth().getUser(uid)
        referrerEmails[uid] = u.email ?? uid
      } catch {
        referrerEmails[uid] = uid
      }
    }

    const agora = new Date()
    const usuarios = listResult.users.map((u) => {
      const ass = assinaturas[u.uid] ?? {}
      const trialExpiraEm = (ass.trialExpiraEm as { toDate?: () => Date } | undefined)?.toDate?.()
      const expiraEm = (ass.expiraEm as { toDate?: () => Date } | undefined)?.toDate?.()
      const ultimoBonus = (ass.ultimoBonusIndicacao as { toDate?: () => Date } | undefined)?.toDate?.()

      const isAdmin = !!(ass.isAdmin)
      const isPro = isAdmin || (ass.plano === "pro" && ass.status === "ativo" && (!expiraEm || expiraEm > agora))
      const isTrialing = !isPro && !!trialExpiraEm && trialExpiraEm > agora

      let statusLabel: string
      if (isAdmin) statusLabel = "admin"
      else if (isPro) statusLabel = "pro"
      else if (isTrialing) statusLabel = "trial"
      else statusLabel = "gratuito"

      return {
        uid: u.uid,
        email: u.email ?? "",
        criadoEm: u.metadata.creationTime,
        statusLabel,
        isAdmin,
        expiraEm: expiraEm?.toISOString() ?? null,
        trialExpiraEm: trialExpiraEm?.toISOString() ?? null,
        ultimoBonusIndicacao: ultimoBonus?.toISOString() ?? null,
        referidoPor: ass.referidoPor ? referrerEmails[ass.referidoPor as string] : null,
      }
    })

    // Admin primeiro, depois por criadoEm desc
    usuarios.sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    })

    return res.status(200).json({ usuarios })
  } catch (err) {
    console.error("[admin-usuarios]", err)
    return res.status(500).json({ error: "Internal error" })
  }
}
