"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  MapPin,
  BadgeCheck,
  ArrowUpRight,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Flag,
  Ban,
} from "lucide-react";
import type { SocialPost } from "@/types/social";
import { mutate } from "@/lib/client-api";
import { Modal } from "@/components/ui/Modal";
import { CommentList } from "@/components/comments/CommentList";
import { AddToTripButton, CollectionPicker } from "./TripAndSave";
import { ReportModal } from "@/components/moderation/ReportModal";
const number = (n: number) =>
  Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
export function PostCard({
  post: p,
  expanded = false,
}: {
  post: SocialPost;
  expanded?: boolean;
}) {
  const [liked, setLiked] = useState(p.liked);
  const [saved, setSaved] = useState(p.saved);
  const [comments, setComments] = useState(expanded);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [collection, setCollection] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function toggle(action: "like" | "save") {
    setBusy(true);
    try {
      await mutate({
        action,
        target: p.id,
        remove: action === "like" ? liked : saved,
        demo: p.demo,
      });
      if (action === "like") setLiked(!liked);
      else {
        setSaved(!saved);
        if (!saved) setCollection(true);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="post-card">
      <header className="post-header">
        <Link className="avatar" href={`/u/${p.author.username}`}>
          {p.author.avatar_url ? (
            <Image
              src={p.author.avatar_url}
              alt={p.author.name}
              fill
              sizes="42px"
            />
          ) : (
            p.author.name[0]
          )}
        </Link>
        <div className="post-author">
          <Link href={`/u/${p.author.username}`}>
            <strong>{p.author.name}</strong>
            {p.author.creator && <BadgeCheck size={15} />}
          </Link>
          <span>
            <MapPin size={12} />
            {p.destination?.name ?? "Pelo mundo"}
            {p.destination ? `, ${p.destination.country}` : ""}
            <b>·</b>
            {p.demo
              ? "Exemplo"
              : new Date(p.created_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
        {p.type === "TIP" && (
          <span className="tip-badge">
            <Lightbulb size={13} />
            Dica de viajante
          </span>
        )}
        <button
          className="icon-button"
          aria-label="Opções da publicação"
          onClick={() => setMenu(!menu)}
        >
          <MoreHorizontal size={21} />
        </button>
        {menu && (
          <div className="post-menu">
            <button
              onClick={() => {
                setReport(true);
                setMenu(false);
              }}
            >
              <Flag size={15} />
              Denunciar publicação
            </button>
            <button
              onClick={async () => {
                try {
                  await mutate({
                    action: "block",
                    target: p.author_id,
                    demo: p.demo,
                  });
                  window.location.reload();
                } catch (e) {
                  setMessage((e as Error).message);
                }
                setMenu(false);
              }}
            >
              <Ban size={15} />
              Bloquear viajante
            </button>
          </div>
        )}
      </header>
      <PostMedia post={p} />
      <div className="post-body">
        <div className="post-actions">
          <button
            disabled={busy}
            className={liked ? "liked" : ""}
            aria-label="Curtir publicação"
            aria-pressed={liked}
            onClick={() => void toggle("like")}
          >
            <Heart size={21} fill={liked ? "currentColor" : "none"} />
            <span>{number(p.likes + Number(liked) - Number(p.liked))}</span>
          </button>
          <button
            aria-label="Ver comentários"
            onClick={() => setComments(!comments)}
          >
            <MessageCircle size={21} />
            <span>{number(p.comment_count)}</span>
          </button>
          <button
            aria-label="Compartilhar publicação"
            onClick={async () => {
              const url = `${window.location.origin}/p/${p.id}`;
              try {
                if (navigator.share)
                  await navigator.share({
                    title: `${p.author.name} na Voyra`,
                    url,
                  });
                else {
                  await navigator.clipboard.writeText(url);
                  setMessage("Link copiado!");
                }
              } catch {
                setMessage("Não foi possível compartilhar agora.");
              }
            }}
          >
            <Share2 size={20} />
          </button>
          <button
            disabled={busy}
            className="save-action"
            aria-label="Salvar publicação"
            aria-pressed={saved}
            onClick={() => void toggle("save")}
          >
            <Bookmark size={21} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="post-caption">
          <Link href={`/u/${p.author.username}`}>
            <strong>{p.author.name.split(" ")[0]}</strong>
          </Link>{" "}
          {p.caption.split("#")[0]}
          <span className="hashtags">
            {p.caption.match(/#[\p{L}\p{N}_]+/gu)?.map((tag) => (
              <Link href={`/explorar?q=${encodeURIComponent(tag)}`} key={tag}>
                {tag}{" "}
              </Link>
            ))}
          </span>
        </p>
        {p.rating && (
          <div className="review-context">
            ★ {p.rating}/5 · Experiência pessoal · Visitado em {p.visited_at}
          </div>
        )}
        {p.place_name && (
          <div className="post-place">
            <span className="place-icon">
              <MapPin size={20} />
            </span>
            <span>
              <strong>{p.place_name}</strong>
              <small>
                {p.destination?.name}, {p.destination?.country}{" "}
                <span>· Salve para sua próxima viagem</span>
              </small>
            </span>
            <AddToTripButton post={p} />
          </div>
        )}
        {comments && <CommentList postId={p.id} demo={p.demo} />}
        <Link className="post-details" href={`/p/${p.id}`}>
          Ver experiência completa <ArrowUpRight size={12} />
        </Link>
      </div>
      {message && (
        <Modal title="Sua comunidade Voyra" onClose={() => setMessage("")}>
          <p>{message}</p>
          <Link className="primary" href="/login">
            Entrar na Voyra
          </Link>
        </Modal>
      )}
      {report && (
        <ReportModal
          target={p.id}
          demo={p.demo}
          onClose={() => setReport(false)}
        />
      )}{" "}
      {collection && (
        <CollectionPicker postId={p.id} onClose={() => setCollection(false)} />
      )}
    </article>
  );
}
export function PostMedia({ post }: { post: SocialPost }) {
  const [index, setIndex] = useState(0);
  const media = post.media[index];
  if (!media)
    return (
      <div className="text-post">
        <Lightbulb size={29} />
        <p>{post.caption.split("#")[0]}</p>
        <span>UMA DICA PODE MUDAR UMA VIAGEM.</span>
      </div>
    );
  return (
    <div className="post-media">
      {media.type === "VIDEO" ? (
        <video
          src={media.url}
          controls
          muted
          playsInline
          preload="metadata"
          aria-label={media.alt}
        />
      ) : media.url ? (
        <Image
          src={media.url}
          alt={media.alt}
          unoptimized={!post.demo}
          fill
          sizes="(max-width: 768px) 100vw, 750px"
        />
      ) : (
        <span>Mídia indisponível</span>
      )}
      {post.media.length > 1 && (
        <>
          <span className="media-count">
            {index + 1}/{post.media.length}
          </span>
          <button
            className="media-prev"
            aria-label="Foto anterior"
            onClick={() =>
              setIndex((index - 1 + post.media.length) % post.media.length)
            }
          >
            <ChevronLeft />
          </button>
          <button
            className="media-next"
            aria-label="Próxima foto"
            onClick={() => setIndex((index + 1) % post.media.length)}
          >
            <ChevronRight />
          </button>
        </>
      )}
      {post.place_name && (
        <span className="media-location">
          <MapPin size={12} />
          {post.place_name}
        </span>
      )}
    </div>
  );
}
