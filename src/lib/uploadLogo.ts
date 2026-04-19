const MAX_SIZE = 300
const JPEG_QUALITY = 0.75

export function comprimirLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const ratio = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, w, h)

      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY))
    }

    img.onerror = reject
    img.src = url
  })
}
