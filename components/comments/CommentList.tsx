"use client";
import { useEffect, useState } from "react";
import { mutate } from "@/lib/client-api";
import type { Comment } from "@/types/social";
import { ReportModal } from "@/components/moderation/ReportModal";
export function CommentList({
  postId,
  demo,
}: {
  postId: string;
  demo?: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<string | null>(null);
  useEffect(() => {
    if (!demo)
      fetch(`/api/social?resource=comments&postId=${postId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setComments(d);
          else setMessage(d.error);
        })
        .catch(() => setMessage("Não foi possível carregar comentários."));
  }, [postId, demo]);
  return (
    <section className="comments">
      <h3>Converse com quem esteve lá</h3>
      {comments.map((c) => (
        <div
          key={c.id}
          className={c.parent_comment_id ? "comment reply" : "comment"}
        >
          <strong>{c.author?.name ?? "Viajante"}</strong>
          <p>{c.content}</p>
          <button onClick={() => setReply(c.id)}>Responder</button>
          <button onClick={() => setReport(c.id)}>Denunciar</button>
          <button
            onClick={async () => {
              try {
                await mutate({ action: "delete_comment", target: c.id });
                setComments(comments.filter((x) => x.id !== c.id));
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Excluir meu comentário
          </button>
        </div>
      ))}
      {!comments.length && (
        <p className="muted">Uma boa pergunta pode render uma ótima dica.</p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const c = await mutate({
              action: "comment",
              target: postId,
              content,
              parent: reply,
              demo,
            });
            setComments([...comments, c]);
            setContent("");
            setReply(null);
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        {reply && (
          <button type="button" onClick={() => setReply(null)}>
            Cancelar resposta
          </button>
        )}
        <label className="sr-only" htmlFor={`comment-${postId}`}>
          Seu comentário
        </label>
        <input
          id={`comment-${postId}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1200}
          required
          placeholder="Compartilhe uma dica ou faça uma pergunta…"
        />
        <button className="primary">Comentar</button>
      </form>
      <p role="status">{message}</p>
      {report && (
        <ReportModal
          target={report}
          type="COMMENT"
          onClose={() => setReport(null)}
        />
      )}
    </section>
  );
}
