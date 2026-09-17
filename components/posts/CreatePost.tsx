"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { validateFile } from "@/lib/media";
import type { Destination } from "@/types/social";
const schema = z.object({
  caption: z
    .string()
    .trim()
    .min(3, "Conte um pouco mais sobre sua experiência.")
    .max(3000),
  destination_id: z.string(),
  place_name: z.string().max(120),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]),
  type: z.enum([
    "IMAGE",
    "VIDEO",
    "TEXT",
    "TIP",
    "PLACE_REVIEW",
    "TRIP_UPDATE",
    "ROUTE",
  ]),
  category: z.string(),
  rating: z.string(),
  visited_at: z.string(),
  alt: z.string().max(300),
});
type Fields = z.infer<typeof schema>;
export function CreatePost({ destinations }: { destinations: Destination[] }) {
  const videoEnabled = process.env.NEXT_PUBLIC_VIDEO_UPLOAD_ENABLED === "true";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { type: "IMAGE", visibility: "PUBLIC", category: "Comida" },
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  return (
    <section className="form-card">
      <span className="eyebrow">
        UMA DESCOBERTA SUA. UMA NOVA VIAGEM DE ALGUÉM.
      </span>
      <h1 style={{ marginTop: 14 }}>Compartilhe uma experiência</h1>
      <p>Uma boa história inspira. Uma boa dica leva mais longe.</p>
      <form
        onSubmit={handleSubmit(async (values) => {
          setBusy(true);
          setMessage("Enviando sua experiência…");
          try {
            const form = new FormData();
            form.set(
              "post",
              JSON.stringify({
                ...values,
                destination_id: values.destination_id || null,
                place_name: values.place_name || null,
                rating: values.rating ? Number(values.rating) : null,
                visited_at: values.visited_at || null,
                trip_id: null,
              }),
            );
            files.forEach((f) => form.append("media", f));
            const r = await fetch("/api/posts", { method: "POST", body: form });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            router.push(`/p/${result.id}`);
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        })}
      >
        <label className="upload-zone">
          <ImagePlus size={32} />
          <strong>Adicione um pedaço da sua viagem</strong>
          <span>
            {videoEnabled
              ? "Até 10 fotos de 10 MB ou um vídeo de 50 MB."
              : "Até 10 fotos de 10 MB cada."}
          </span>
          <input
            aria-label="Escolher fotos ou vídeo"
            type="file"
            multiple
            accept={
              videoEnabled
                ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                : "image/jpeg,image/png,image/webp"
            }
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              const error =
                !videoEnabled && selected.some((file) => file.type.startsWith("video/"))
                  ? "O envio de vídeo ainda não está disponível."
                  : selected.length > 10
                  ? "Escolha até 10 fotos."
                  : selected.map(validateFile).find(Boolean);
              if (error) {
                setMessage(error);
                return;
              }
              setFiles(selected);
              setPreviews(selected.map((f) => URL.createObjectURL(f)));
              setMessage("");
            }}
          />
        </label>
        <div className="preview-grid">
          {previews.map((url, i) =>
            files[i]?.type.startsWith("video") ? (
              <video key={url} src={url} controls muted />
            ) : (
              <Image
                key={url}
                src={url}
                width={150}
                height={120}
                alt="Prévia da publicação"
                unoptimized
              />
            ),
          )}
        </div>
        <div className="form-grid">
          <label>
            Tipo de publicação
            <select {...register("type")}>
              <option value="IMAGE">Fotos</option>
              {videoEnabled && <option value="VIDEO">Vídeo curto</option>}
              <option value="TEXT">História</option>
              <option value="TIP">Dica de viajante</option>
              <option value="PLACE_REVIEW">Avaliação de lugar</option>
              <option value="TRIP_UPDATE">Diário de viagem</option>
              <option value="ROUTE">Roteiro</option>
            </select>
          </label>
          <label>
            Quem pode ver
            <select {...register("visibility")}>
              <option value="PUBLIC">Todos</option>
              <option value="FOLLOWERS">Meus seguidores</option>
              <option value="PRIVATE">Somente eu</option>
            </select>
          </label>
        </div>
        <label>
          Sua história
          <textarea
            {...register("caption")}
            placeholder="O que você gostaria de ter sabido antes de ir? Use #destinos e @viajantes."
          />
          {errors.caption && (
            <small role="alert">{errors.caption.message}</small>
          )}
        </label>
        <div className="form-grid">
          <label>
            Destino
            <select {...register("destination_id")}>
              <option value="">Escolha um destino</option>
              {destinations.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}, {d.country}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lugar ou bairro
            <input {...register("place_name")} placeholder="Ex.: Trastevere" />
          </label>
          <label>
            Categoria
            <select {...register("category")}>
              {[
                "Comida",
                "Natureza",
                "Praia",
                "Aventura",
                "História",
                "Luxo",
                "Baixo custo",
                "Romântico",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Visitado em (opcional)
            <input type="month" {...register("visited_at")} />
          </label>
          <label>
            Avaliação pessoal (opcional)
            <input
              type="number"
              min="0.5"
              max="5"
              step="0.5"
              {...register("rating")}
            />
          </label>
          <label>
            Descrição acessível da mídia
            <input
              {...register("alt")}
              placeholder="Descreva o que aparece na foto"
            />
          </label>
        </div>
        <p className="notice">
          Evite compartilhar sua localização exata em tempo real. Não publique
          endereço do hotel, documentos, QR codes ou dados privados da viagem.
        </p>
        <button disabled={busy} className="primary">
          <Send size={16} />
          {busy ? "Publicando…" : "Publicar"}
        </button>
        <p role="status" className="notice">
          {message || "Viaje. Descubra. Compartilhe."}
        </p>
      </form>
    </section>
  );
}
