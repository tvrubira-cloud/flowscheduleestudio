import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

async function getState(): Promise<string> {
  try {
    const r = await fetch(`${BASE}/getStateInstance/${TOKEN}`)
    const d = await r.json() as { stateInstance?: string }
    return d.stateInstance ?? "unknown"
  } catch {
    return "unknown"
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()
  try {
    // Se já está desconectado de forma definitiva, retorna sucesso imediatamente
    const stateBefore = await getState()
    if (stateBefore !== "authorized" && stateBefore !== "unknown") {
      return res.status(200).json({ ok: true, state: stateBefore })
    }

    // Tenta Logout
    const r = await fetch(`${BASE}/logout/${TOKEN}`)
    const text = await r.text()
    let d: any = {}
    try { d = JSON.parse(text) } catch { d = {} }

    const logoutOk = r.ok || d.isLogout || d.status === "success" || text === "" || text === "null"

    if (logoutOk) {
      return res.status(200).json({ ok: true })
    }

    // Confirma estado após tentativa de logout (pode ter funcionado mesmo com resposta estranha)
    const stateAfter = await getState()
    if (stateAfter !== "authorized") {
      return res.status(200).json({ ok: true, state: stateAfter })
    }

    // Última tentativa: Reboot
    const r2 = await fetch(`${BASE}/reboot/${TOKEN}`)
    const text2 = await r2.text()
    let d2: any = {}
    try { d2 = JSON.parse(text2) } catch { d2 = {} }
    const rebootOk = r2.ok || d2.status === "success" || d2.reboot

    return res.status(200).json({ ok: rebootOk, debug: { logoutResponse: text, rebootResponse: text2 } })
  } catch (err) {
    return res.status(200).json({ ok: false, erro: String(err) })
  }
}
