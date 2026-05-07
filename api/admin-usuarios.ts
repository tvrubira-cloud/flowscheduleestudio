import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminAuth, firestoreGet, fromFirestoreFields } from "./_lib/firebase-admin.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const adminEmail = process.env.ADMIN_EMAIL
    const adminFields = fromFirestoreFields(await firestoreGet("assinaturas", decoded.uid))
    const isAdmin = !!(adminFields.isAdmin || (adminEmail && decoded.email === adminEmail))
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" })

    // Fetch all users with pagination
    const allUsers: any[] = []
    let nextPageToken: string | undefined
    do {
      const page = await getAdminAuth().listUsers(1000, nextPageToken)
      allUsers.push(...page.users)
      nextPageToken = page.pageToken
    } while (nextPageToken)
    const uids = allUsers.map((u) => u.uid)

    // Assinaturas em lotes de 10
    const assinaturas: Record<string, Record<string, unknown>> = {}
    for (let i = 0; i < uids.length; i += 10) {
      const batch = uids.slice(i, i + 10)
      const snaps = await Promise.all(batch.map((uid) => firestoreGet("assinaturas", uid)))
      snaps.forEach((fields, idx) => { assinaturas[batch[idx]] = fromFirestoreFields(fields) })
    }

    // Referrer emails
    const referrerUids = new Set<string>()
    Object.values(assinaturas).forEach((a) => { if (a.referidoPor) referrerUids.add(a.referidoPor as string) })
    const referrerEmails: Record<string, string> = {}
    for (const uid of referrerUids) {
      try { const u = await getAdminAuth().getUser(uid); referrerEmails[uid] = u.email ?? uid }
      catch { referrerEmails[uid] = uid }
    }

    // Nomes dos salões em lotes de 10
    const nomeSaloes: Record<string, string> = {}
    for (let i = 0; i < uids.length; i += 10) {
      const batch = uids.slice(i, i + 10)
      const snaps = await Promise.all(batch.map((uid) => firestoreGet("disponibilidade", uid)))
      snaps.forEach((fields, idx) => {
        const d = fromFirestoreFields(fields)
        if (typeof d.nomeNegocio === "string" && d.nomeNegocio) nomeSaloes[batch[idx]] = d.nomeNegocio
      })
    }

    const agora = new Date()
    const toDate = (v: unknown): Date | undefined =>
      v instanceof Date ? v : undefined

    const usuarios = allUsers.map((u) => {
      const ass = assinaturas[u.uid] ?? {}
      const trialExpiraEm = toDate(ass.trialExpiraEm)
      const expiraEm = toDate(ass.expiraEm)
      const ultimoBonus = toDate(ass.ultimoBonusIndicacao)
      const isAdm = ass.isAdmin === true
      const isPro = isAdm || (ass.plano === "pro" && ass.status === "ativo" && (!expiraEm || expiraEm > agora))
      const isTrialing = !isPro && !!trialExpiraEm && trialExpiraEm > agora
      const trialDaysLeft = isTrialing && trialExpiraEm
        ? Math.ceil((trialExpiraEm.getTime() - agora.getTime()) / 86400000)
        : null
      const statusLabel = isAdm ? "admin" : isPro ? "pro" : isTrialing ? "trial" : "gratuito"
      return {
        uid: u.uid,
        email: u.email ?? "",
        nomeNegocio: nomeSaloes[u.uid] ?? null,
        criadoEm: u.metadata.creationTime,
        statusLabel,
        isAdmin: isAdm,
        expiraEm: expiraEm?.toISOString() ?? null,
        trialExpiraEm: trialExpiraEm?.toISOString() ?? null,
        trialDaysLeft,
        ultimoBonusIndicacao: ultimoBonus?.toISOString() ?? null,
        referidoPor: ass.referidoPor ? (referrerEmails[ass.referidoPor as string] ?? null) : null,
      }
    })

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
