"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/config";
import { listarPersonagens, deletarPersonagem } from "@/services/personagens";
import type { Personagem } from "@/types";
import { CLASSES } from "@/types";
import BugBanner from "@/components/BugBanner";

export default function DashboardPage() {
  const { user, sair, loading } = useAuth();
  const router = useRouter();
  const [personagens, setPersonagens] = useState<Personagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [deletando, setDeletando] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "personagens"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Personagem));
        setPersonagens(lista);
        setCarregando(false);
      },
      () => setCarregando(false)
    );

    return () => unsubscribe();
  }, [user]);

  async function handleDeletar(personagem: Personagem, indice: number) {
    if (!confirm(`Tem certeza que quer deletar ${personagem.nome}? Esta ação não pode ser desfeita.`)) return;
    setDeletando(personagem.id);
    try {
      // 🐛 BUG 07 — esta chamada vai deletar o personagem ERRADO
      await deletarPersonagem(personagem, indice);
      setPersonagens((prev) => prev.filter((_, i) => i !== indice));
    } catch {
      alert("Erro ao deletar personagem.");
    } finally {
      setDeletando(null);
    }
  }

  async function handleSair() {
    if (!confirm("Deseja sair da sua conta?")) return;
    await sair();
    router.push("/");
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "2rem", animation: "spin-slow 2s linear infinite" }}>🔮</div>
      </div>
    );
  }

  const classeInfo = (p: Personagem) => CLASSES[p.classe] ?? CLASSES.guerreiro;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="nav">
        <span className="nav-logo gold-text">⚔️ NEXUS</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/perfil" className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "0.4rem 1rem" }}>
            Perfil
          </Link>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Olá, {user.displayName ?? user.email}
          </span>
          <button onClick={handleSair} className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "0.4rem 1rem" }}>
            Sair
          </button>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
        {/* BUG 02 banner — middleware invertido */}
        <BugBanner
          numero={2}
          titulo="Rota Protegida não Protege"
          oQueAcontece="Você conseguiu acessar esta página (dashboard) mesmo sem estar logado? Ou você está logado e foi redirecionado para o login toda vez que tentou entrar? A proteção de rota está ao contrário!"
          porQue="O arquivo middleware.ts usa if (token) para redirecionar — ou seja, ele manda para o login exatamente quem TEM sessão ativa, e deixa entrar quem NÃO tem sessão. A condição está invertida."
          dica="Abra middleware.ts e troque if (token) por if (!token). O ponto de exclamação (!) significa 'não' em JavaScript — é ele que faz a condição funcionar do jeito certo."
        />

        {/* BUG 04 banner — query sem filtro */}
        <BugBanner
          numero={4}
          titulo="Personagens de Outros Usuários Aparecem"
          oQueAcontece="A lista abaixo mostra personagens de TODOS os usuários do sistema, não apenas os seus. Qualquer pessoa que criar uma conta vai ver todos os heróis no dashboard — incluindo os de estranhos!"
          porQue="A função listarPersonagens em services/personagens.ts busca TODOS os documentos da coleção 'personagens' sem filtrar por usuário. No Firestore, você precisa usar where() para filtrar documentos pelo campo userId."
          dica="Em services/personagens.ts, encontre o query() na função listarPersonagens e adicione where('userId', '==', uid) como segundo argumento. Não esqueça de importar { where } do firebase/firestore."
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800 }}>
              Meus Heróis
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {carregando ? "Carregando..." : `${personagens.length} personagem(ns) encontrado(s)`}
            </p>
          </div>
          <Link href="/criar-personagem" className="btn btn-gold" style={{ flexShrink: 0 }}>
            + Criar Herói
          </Link>
        </div>

        {/* Characters grid */}
        {carregando ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ height: "180px", opacity: 0.4, animation: "pulse-glow 2s infinite" }} />
            ))}
          </div>
        ) : personagens.length === 0 ? (
          <div
            style={{
              textAlign: "center", padding: "4rem 2rem",
              background: "rgba(255,255,255,0.02)", borderRadius: "16px",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚔️</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Nenhum herói encontrado</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Crie seu primeiro personagem e comece sua jornada.
            </p>
            <Link href="/criar-personagem" className="btn btn-primary">
              Forjar meu primeiro herói
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1rem" }}>
            {personagens.map((p, i) => {
              const info = classeInfo(p);
              return (
                <div key={p.id} className={`card-3d-wrapper classe-${p.classe}`}>
                  <div className="card card-3d card-3d-face" style={{ borderColor: `${info.cor}30`, padding: "1.25rem" }}>
                    {/* Class emoji + glow */}
                    <div
                      style={{
                        fontSize: "2.5rem", marginBottom: "0.75rem",
                        filter: `drop-shadow(0 0 12px ${info.cor})`,
                        textAlign: "center",
                      }}
                    >
                      {info.emoji}
                    </div>

                    <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                        {p.nome}
                      </h3>
                      <span className="badge-classe">
                        {info.emoji} {info.nome}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
                      {(["atk", "def", "mgc", "spd"] as const).map((stat) => (
                        <div key={stat} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.65rem", textTransform: "uppercase", color: "var(--muted)", width: "2.2rem" }}>
                            {stat}
                          </span>
                          <div className="stat-bar-track">
                            <div
                              className="stat-bar-fill"
                              style={{ width: `${info[stat] * 10}%`, background: info.cor }}
                            />
                          </div>
                          <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: info.cor, width: "1.5rem" }}>
                            {info[stat]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Equipment preview */}
                    {(p.arma || p.armadura || p.anel) && (
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        {p.arma && <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>⚔️ {p.arma}</span>}
                        {p.armadura && <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>🛡️ {p.armadura}</span>}
                        {p.anel && <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>💍 {p.anel}</span>}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Link
                        href={`/personagem/${p.id}`}
                        className="btn btn-ghost"
                        style={{ flex: 1, fontSize: "0.8rem", padding: "0.5rem" }}
                      >
                        Equipar
                      </Link>
                      <button
                        onClick={() => handleDeletar(p, i)}
                        disabled={deletando === p.id}
                        className="btn btn-danger"
                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                      >
                        {deletando === p.id ? "..." : "🗑️"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
