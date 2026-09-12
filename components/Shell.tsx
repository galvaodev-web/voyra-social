"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  House,
  MapPin,
  Plus,
  Bell,
  UserRound,
  Bookmark,
  Route,
  ArrowUpRight,
  Search,
  MoveUpRight,
  Globe2,
} from "lucide-react";
const navigation = [
  { href: "/", label: "Início", icon: House },
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/destinos", label: "Destinos", icon: Globe2 },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
];
export function Shell({
  children,
  account,
}: {
  children: React.ReactNode;
  account?: { name: string; username: string } | null;
}) {
  const path = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Voyra Social início">
          <span className="brand-symbol">
            <MoveUpRight size={28} />
          </span>
          <span>
            voyra<span className="brand-social">social</span>
          </span>
        </Link>
        <div className="sidebar-caption">SEU PRÓXIMO DESTINO COMEÇA AQUI</div>
        <nav className="main-nav" aria-label="Principal">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              className={path === href ? "nav-link active" : "nav-link"}
              key={href}
              href={href}
            >
              <Icon size={21} />
              {label}
              {href === "/" && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="nav-divider" />
        <span className="nav-section">SUA BAGAGEM</span>
        <nav className="main-nav">
          <Link className="nav-link" href="/salvos">
            <Bookmark size={20} />
            Meus salvos
          </Link>
          <Link className="nav-link" href="/roteiros">
            <Route size={20} />
            Roteiros
          </Link>
        </nav>
        <Link href="/criar" className="primary create-nav">
          <Plus size={19} />
          Compartilhar viagem
        </Link>
        <div className="sidebar-bottom">
          <div className="travel-note">
            <span className="little-icon">
              <MapPin size={19} />
            </span>
            <strong>Da inspiração ao destino.</strong>
            <p>Transforme suas descobertas em uma viagem de verdade.</p>
            <a href={process.env.NEXT_PUBLIC_TRAVEL_URL ?? "https://voyra.com"}>
              Conheça o Voyra Travel <ArrowUpRight size={15} />
            </a>
          </div>
          <Link href={account ? "/perfil" : "/login"} className="account">
            <span className="guest-avatar">
              <UserRound size={21} />
            </span>
            <span>
              <strong>{account?.name??'Sua próxima história'}</strong>
              <small>{account?`@${account.username}`:'Entre na sua conta Voyra'}</small>
            </span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="top-message">
            Uma comunidade. <strong>Infinitas descobertas.</strong>
          </div>
          <form action="/explorar" className="search">
            <Search size={18} />
            <input
              name="q"
              aria-label="Buscar destinos, pessoas e lugares"
              placeholder="Busque destinos, pessoas, lugares..."
            />
            <kbd>⌘ K</kbd>
          </form>
          <Link
            className="header-icon"
            href="/notificacoes"
            aria-label="Notificações"
          >
            <Bell size={20} />
          </Link>
          <Link className="header-avatar" href="/login" aria-label="Entrar">
            <UserRound size={20} />
          </Link>
        </header>
        <main id="main" className="content">
          {children}
        </main>
        <footer className="page-footer">
          <span>© 2026 Voyra Social</span>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
          <span>Feito para ir além.</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Navegação mobile">
        <Link href="/">
          <House size={21} />
          Início
        </Link>
        <Link href="/explorar">
          <Compass size={21} />
          Explorar
        </Link>
        <Link
          className="mobile-create"
          href="/criar"
          aria-label="Criar publicação"
        >
          <Plus size={25} />
        </Link>
        <Link href="/notificacoes">
          <Bell size={21} />
          Avisos
        </Link>
        <Link href="/perfil">
          <UserRound size={21} />
          Perfil
        </Link>
      </nav>
    </>
  );
}
