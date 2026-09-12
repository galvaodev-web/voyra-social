export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 50 * 1024 * 1024;
export const imageMimes = ["image/jpeg", "image/png", "image/webp"];
export const videoMimes = ["video/mp4", "video/quicktime"];
export function validateFile(file: Pick<File, "type" | "size">) {
  if (![...imageMimes, ...videoMimes].includes(file.type))
    return "Use JPG, PNG, WEBP, MP4 ou MOV compatível.";
  if (
    file.size === 0 ||
    file.size > (imageMimes.includes(file.type) ? IMAGE_LIMIT : VIDEO_LIMIT)
  )
    return "Limite: 10 MB por imagem e 50 MB por vídeo.";
  return null;
}
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return "image/png";
  const ascii = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp")
    return ascii(8, 12) === "qt  " ? "video/quicktime" : "video/mp4";
  return null;
}
export interface TranscodingJob {
  mediaId: string;
  storagePath: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
}
// A worker will create derivatives and posters. Never transcode in an HTTP request.
