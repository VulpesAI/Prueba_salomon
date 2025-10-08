export async function blobToBase64(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1] ?? "");
      } else {
        reject(new Error("No se pudo leer el audio"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Error al leer el audio"));
    reader.readAsDataURL(blob);
  });
}

export function base64ToAudio(base64: string, mime: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  return new Audio(URL.createObjectURL(blob));
}
