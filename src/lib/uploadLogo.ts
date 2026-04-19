import { auth } from "@/lib/firebase"

export async function uploadLogo(file: File): Promise<string> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error("Usuário não autenticado")

  const base64 = await fileToBase64(file)

  const res = await fetch("/api/upload-logo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ base64, mimeType: file.type }),
  })

  if (!res.ok) {
    const data = await res.json() as { erro?: string }
    throw new Error(data.erro ?? "Erro ao enviar logo")
  }

  const { url } = await res.json() as { url: string }
  return url
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
