"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  ImagePlus,
  MapPin,
  Lightbulb,
  SlidersHorizontal,
  ArrowUpRight,
  Compass,
  BadgeCheck,
  Route,
  Leaf,
} from "lucide-react";
import type { FeedPage, Destination } from "@/types/social";
import { travelers, photo } from "@/lib/demo";
import { PostCard } from "@/components/posts/PostCard";
import { DestinationCard } from "@/components/destinations/DestinationCard";
import { FollowButton } from "@/components/profile/FollowButton";
export function Feed({
  initial,
  destinations,
  mode = "for-you",
  title,
  query,
}: {
  initial: FeedPage;
  destinations: Destination[];
  mode?: string;
  title?: string;
  query?: string;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Tudo");
  const sentinel = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    if (busy || !data.nextCursor) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        cursor: data.nextCursor,
        mode,
        ...(query ? { search: query } : {}),
      });
      const r = await fetch(`/api/feed?${params}`);
      if (!r.ok) throw new Error();
      const next: FeedPage = await r.json();
      setData((old) => ({
        ...next,
        posts: [
          ...old.posts,
          ...next.posts.filter((p) => !old.posts.some((x) => x.id === p.id)),
        ],
      }));
    } catch {
      setError("Não foi possível carregar mais publicações. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }, [busy, data.nextCursor, mode, query]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void load();
      },
      { rootMargin: "300px" },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [load]);
  const posts = data.posts.filter(
    (p) =>
      category === "Tudo" ||
      p.category === category ||
      (category === "Dicas" && p.type === "TIP"),
  );
  return (
    <>
      <section className="page-intro">
        <div>
          <div className="eyebrow">
            <span /> O MUNDO FICA MELHOR QUANDO A GENTE COMPARTILHA
          </div>
          <h1>{title ?? "Sua próxima viagem começa com uma descoberta."}</h1>
          <p>
            Histórias reais, lugares incríveis e dicas que merecem ir para o seu
            roteiro.
          </p>
        </div>
        <span className="intro-stamp">
          <Compass size={32} />
          <small>
            VIVA O MUNDO
            <br />
            DO SEU JEITO
          </small>
        </span>
      </section>
      <div className="feed-layout">
        <div className="feed-column">
          {mode === "for-you" && !query && (
            <>
              <section className="discovery-hero">
                <Image
                  src={photo("photo-1476514525535-07fb3b4ae5f1")}
                  alt="Barco em um lago cercado por montanhas na Europa"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 800px"
                />
                <div className="hero-overlay" />
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <span /> VÁ ALÉM DO ÓBVIO
                  </span>
                  <h2>
                    Menos pontos no mapa.
                    <br />
                    Mais histórias para contar.
                  </h2>
                  <p>
                    Encontre seu próximo lugar favorito
                    <br />
                    com quem já esteve lá.
                  </p>
                  <Link href="/explorar" className="hero-button">
                    Explore o mundo <ArrowUpRight size={17} />
                  </Link>
                </div>
                <span className="hero-location">
                  <MapPin size={13} />
                  Entre lagos e montanhas
                </span>
                <span className="hero-pages">
                  <b />
                  <i />
                  <i />
                </span>
              </section>
              <section className="destination-section">
                <div className="section-heading">
                  <h2>Para onde a sua curiosidade vai?</h2>
                  <Link href="/destinos">
                    Ver destinos <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="destination-strip">
                  {destinations.slice(0, 5).map((d) => (
                    <DestinationCard key={d.id} destination={d} />
                  ))}
                </div>
              </section>
              <Link href="/criar" className="composer">
                <span className="composer-avatar">
                  <ImagePlus size={23} />
                </span>
                <span>
                  <strong>Qual história você vai compartilhar?</strong>
                  <small>
                    Uma descoberta sua pode ser a próxima viagem de alguém.
                  </small>
                </span>
                <span className="composer-tools">
                  <ImagePlus size={19} />
                  <MapPin size={19} />
                  <Lightbulb size={19} />
                </span>
              </Link>
            </>
          )}
          <div className="feed-tabs">
            <div>
              <Link href="/" className={mode === "for-you" ? "selected" : ""}>
                <Sparkles size={17} />
                Para você
              </Link>
              <Link
                href="/seguindo"
                className={mode === "following" ? "selected" : ""}
              >
                Seguindo
              </Link>
            </div>
            <button
              onClick={() =>
                setCategory(category === "Tudo" ? "Dicas" : "Tudo")
              }
              className="icon-button"
              aria-label="Filtrar dicas"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
          <div className="filter-row">
            {["Tudo", "Dicas", "Comida", "Natureza", "Praia", "Aventura"].map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={category === c ? "chip selected" : "chip"}
                >
                  {c === "Tudo" && <Compass size={13} />} {c}
                </button>
              ),
            )}
          </div>
          {data.demo && (
            <p className="demo-label">
              <span /> Vitrine de demonstração · histórias e números
              ilustrativos
            </p>
          )}
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {!posts.length && (
            <div className="empty-state">
              <Compass size={35} />
              <h2>Seu feed está tranquilo por aqui.</h2>
              <p>
                Siga viajantes ou explore destinos para encontrar novas
                histórias.
              </p>
              <Link href="/explorar" className="primary">
                Explorar destinos
              </Link>
            </div>
          )}
          <div ref={sentinel} />
          {busy && <div className="skeleton" />}
          {error && <p role="alert">{error}</p>}
          {data.nextCursor && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void load()}
            >
              Carregar mais
            </button>
          )}
        </div>
        <aside className="right-rail">
          <section className="rail-card">
            <div className="section-heading">
              <h2>
                <span className="tiny-accent">↗</span> No radar dos viajantes
              </h2>
            </div>
            <p className="rail-subtitle">
              Destinos que estão dando o que falar
            </p>
            {destinations.slice(0, 3).map((d, i) => (
              <Link
                className="trending"
                href={`/destinos/${d.slug}`}
                key={d.id}
              >
                <span className="trending-photo">
                  <Image src={d.image_url} fill sizes="50px" alt="" />
                </span>
                <span>
                  <strong>
                    {d.name}
                    <span className="country-flag">
                      {["🇮🇹", "🇫🇷", "🇯🇵"][i]}
                    </span>
                  </strong>
                  <small>{d.country}</small>
                </span>
                <span className="trend-status">
                  <span />
                  Em alta
                </span>
              </Link>
            ))}
            <Link href="/destinos" className="rail-bottom-link">
              Descobrir mais destinos <ArrowRight size={15} />
            </Link>
          </section>
          <section className="rail-card travelers">
            <div className="section-heading">
              <h2>Boas histórias para seguir</h2>
              <span className="green-dot" />
            </div>
            <p className="rail-subtitle">
              Conheça quem inspira a ir mais longe
            </p>
            {(data.demo ? travelers : []).map((p) => (
              <div className="traveler" key={p.id}>
                <Link href={`/u/${p.username}`} className="avatar">
                  <Image src={p.avatar_url!} fill sizes="40px" alt={p.name} />
                </Link>
                <Link href={`/u/${p.username}`} className="traveler-info">
                  <strong>
                    {p.name} <BadgeCheck size={13} />
                  </strong>
                  <small>
                    {p.countries} países · {p.city}
                  </small>
                </Link>
                <FollowButton userId={p.id} compact demo={data.demo} />
              </div>
            ))}
            {!data.demo && (
              <p className="muted">Encontre viajantes pelo Explorar.</p>
            )}
            <Link href="/explorar" className="rail-bottom-link">
              Encontrar viajantes <ArrowRight size={15} />
            </Link>
          </section>
          <section className="route-promo">
            <span className="route-promo-icon">
              <Route size={23} />
            </span>
            <span className="eyebrow">INSPIROU? VIROU ROTEIRO.</span>
            <h2>
              O lugar que você salvou.
              <br />A viagem que vem aí.
            </h2>
            <p>Leve suas descobertas do feed direto para seu planejamento.</p>
            <Link href="/salvos">
              Organizar minhas descobertas <ArrowUpRight size={16} />
            </Link>
            <div className="route-decoration">
              <span />
              <MapPin size={23} />
              <span />
            </div>
          </section>
          <div className="community-note">
            <Leaf size={19} />
            <p>
              Viaje com respeito.
              <br />
              <strong>Deixe boas histórias por onde passar.</strong>
            </p>
          </div>
          <div className="rail-footer">
            <Link href="/sobre">Sobre a Voyra</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos</Link>
            <span>© 2026 Voyra Social · Feito para explorar.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
