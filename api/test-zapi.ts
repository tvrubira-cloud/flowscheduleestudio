import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`
  const HEADERS = { "x-maytapi-key": process.env.MAYTAPI_TOKEN!, "Content-Type": "application/json" }

  const [listRes, qrRes] = await Promise.allSettled([
    fetch(`${BASE}/listPhones`, { headers: HEADERS }).then(r => r.json()),
    fetch(`${BASE}/${process.env.MAYTAPI_PHONE_ID}/qrCode`, { headers: HEADERS }).then(r => r.text()),
  ])

  return res.status(200).json({
    productId: process.env.MAYTAPI_PRODUCT_ID,
    phoneId: process.env.MAYTAPI_PHONE_ID,
    tokenPresente: !!process.env.MAYTAPI_TOKEN,
    phones: listRes.status === "fulfilled" ? listRes.value : String(listRes.reason),
    qrRaw: qrRes.status === "fulfilled" ? qrRes.value.slice(0, 200) : String(qrRes.reason),
  })
}
