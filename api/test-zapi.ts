import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const base = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

  const [statusRes, qrRes] = await Promise.allSettled([
    fetch(`${base}/connected`).then(r => r.json()),
    fetch(`${base}/qr-code`).then(r => r.text()),
  ])

  return res.status(200).json({
    instanceId: process.env.ZAPI_INSTANCE_ID,
    tokenPresente: !!process.env.ZAPI_TOKEN,
    status: statusRes.status === "fulfilled" ? statusRes.value : String(statusRes.reason),
    qrRaw: qrRes.status === "fulfilled" ? qrRes.value.slice(0, 500) : String(qrRes.reason),
  })
}
