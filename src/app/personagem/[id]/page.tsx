"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { adicionarXP, buscarPersonagem, equiparItem } from "@/services/personagens";
import { CLASSES, ARMAS, ARMADURAS, ANEIS, type Personagem } from "@/types";
import BugBanner from "@/components/BugBanner";

export default function PersonagemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [personagem, setPersonagem] = useState<Personagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [equipando, setEquipando] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!id) return;
    buscarPersonagem(id)
      .then((p) => {
        if (!p) router.push("/dashboard");
        else setPersonagem(p);
      })
      .finally(() => setCarregando(false));
  }, [id, router]);

  async function handleEquipar(slot: "arma" | "armadura" | "anel", itemId: string) {
    if (!personagem) return;
    setEquipando(itemId);
    setMsg("");
    try {
      await equiparItem(personagem.id, slot, itemId);
      await adicionarXP(personagem.id, 10);
      setPersonagem((prev) => prev ? { ...prev, [slot]: itemId, xp: (prev.xp ?? 0) + 10 } : prev);
      setMsg(`✓ ${itemId} equipado! +10 XP`);
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setMsg("Erro ao equipar item.");
    } finally {
      setEquipando(null);
    }
  }

  if (carregando || !personagem) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "2rem", animation: "spin-slow 2s linear infinite" }}>🔮</div>
      </div>
    );
  }

  const info = CLASSES[personagem.classe] ?? CLASSES.guerreiro;
  const armasDisponiveis = ARMAS.filter((a) => a.clases.includes(personagem.classe));
  const armadurasDisponiveis = ARMADURAS.filter((a) => a.clases.includes(personagem.classe));

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo gold-text">⚔️ NEXUS</Link>
        <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: "0.82rem" }}>← Meus Heróis</Link>
      </nav>

      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        {/* BUG 06 banner */}
        <BugBanner
          numero={6}
          titulo="Equipar Item Apaga os Outros"
          oQueAcontece="Quando você equipa uma arma, a armadura e o anel desaparecem. Quando equipa um anel, a arma some. Cada novo item equipado apaga todos os outros! O personagem nunca fica completamente equipado."
          porQue="A função equiparItem em services/personagens.ts usa setDoc, que substitui o documento INTEIRO pelo objeto que você passa. Então ao mandar { arma: 'espada' }, o Firestore apaga todos os outros campos (nome, classe, userId, armadura, anel...) e salva só a arma."
          dica="Em services/personagens.ts, troque setDoc por updateDoc na função equiparItem. O updateDoc atualiza apenas os campos informados, sem mexer nos outros. Importe updateDoc de 'firebase/firestore'."
        />

        {/* BUG 07 banner */}
        <BugBanner
          numero={7}
          titulo="Deletar Personagem Deleta o Errado"
          oQueAcontece="Quando você volta ao dashboard e tenta deletar um personagem, o app deleta um herói diferente do que você escolheu, ou gera um erro 'documento não encontrado'. Parece aleatório, mas tem uma razão."
          porQue="A função deletarPersonagem em services/personagens.ts usa o parâmetro indice (a posição do personagem na lista: 0, 1, 2...) como se fosse o ID do documento no Firestore. O ID real é uma string aleatória como 'xK9pL2mNqR' — não um número."
          dica="Em services/personagens.ts, encontre o deleteDoc e troque String(indice) por personagem.id. O campo id do personagem já contém o ID real do documento no Firestore."
        />

        {/* Character header */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "flex-start",
            marginBottom: "2.5rem",
            flexWrap: "wrap",
          }}
        >
          <div
            className="card-3d-wrapper"
            style={{ flexShrink: 0 }}
          >
            <div
              className="card card-3d"
              style={{
                width: "140px", textAlign: "center", padding: "1.5rem 1rem",
                borderColor: `${info.cor}40`,
                background: info.corFundo,
                boxShadow: `0 0 30px ${info.cor}30`,
              }}
            >
              <div style={{ fontSize: "3rem", filter: `drop-shadow(0 0 16px ${info.cor})`, marginBottom: "0.5rem" }}>
                {info.emoji}
              </div>
              <div style={{ fontWeight: 800, color: info.cor, fontSize: "0.8rem" }}>{info.nome}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>Nv. {personagem.nivel}</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: "0.25rem" }}>
              {personagem.nome}
            </h1>
            <span className={`badge-classe classe-${personagem.classe}`}>
              {info.emoji} {info.nome}
            </span>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.75rem", lineHeight: 1.6, maxWidth: "400px" }}>
              {info.desc}
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "1rem", maxWidth: "300px" }}>
              {(["atk", "def", "mgc", "spd"] as const).map((stat) => (
                <div key={stat} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.65rem", textTransform: "uppercase", color: "var(--muted)", width: "2.2rem" }}>
                    {stat}
                  </span>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: `${info[stat] * 10}%`, background: info.cor }} />
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: info.cor }}>{info[stat]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
            🗃️ Equipamentos Atuais
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", maxWidth: "500px" }}>
            {(["arma", "armadura", "anel"] as const).map((slot) => {
              const icons = { arma: "⚔️", armadura: "🛡️", anel: "💍" };
              const valor = personagem[slot];
              return (
                <div key={slot} className={`equip-slot ${valor ? "filled" : ""}`}>
                  <div style={{ fontSize: "1.5rem" }}>{icons[slot]}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: valor ? "var(--primary-light)" : "rgba(255,255,255,0.3)" }}>
                    {slot}
                  </div>
                  {valor && (
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{valor}</div>
                  )}
                  {!valor && (
                    <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)" }}>vazio</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {msg && (
          <p className="msg-success animate-slide-in" style={{ marginBottom: "1rem" }}>{msg}</p>
        )}

        {/* Weapons */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>⚔️ Armas Disponíveis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {armasDisponiveis.map((arma) => (
              <button
                key={arma.id}
                onClick={() => handleEquipar("arma", arma.id)}
                disabled={equipando === arma.id || personagem.arma === arma.id}
                className="btn btn-ghost"
                style={{
                  justifyContent: "flex-start",
                  gap: "0.6rem",
                  padding: "0.75rem 1rem",
                  borderColor: personagem.arma === arma.id ? "var(--primary)" : undefined,
                  background: personagem.arma === arma.id ? "rgba(124,58,237,0.1)" : undefined,
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{arma.emoji}</span>
                <span style={{ fontSize: "0.82rem" }}>{arma.nome}</span>
                {personagem.arma === arma.id && <span style={{ marginLeft: "auto", color: "var(--primary-light)", fontSize: "0.7rem" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Armors */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>🛡️ Armaduras Disponíveis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {armadurasDisponiveis.map((armadura) => (
              <button
                key={armadura.id}
                onClick={() => handleEquipar("armadura", armadura.id)}
                disabled={equipando === armadura.id || personagem.armadura === armadura.id}
                className="btn btn-ghost"
                style={{
                  justifyContent: "flex-start",
                  gap: "0.6rem",
                  padding: "0.75rem 1rem",
                  borderColor: personagem.armadura === armadura.id ? "var(--primary)" : undefined,
                  background: personagem.armadura === armadura.id ? "rgba(124,58,237,0.1)" : undefined,
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{armadura.emoji}</span>
                <span style={{ fontSize: "0.82rem" }}>{armadura.nome}</span>
                {personagem.armadura === armadura.id && <span style={{ marginLeft: "auto", color: "var(--primary-light)", fontSize: "0.7rem" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Rings */}
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>💍 Anéis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {ANEIS.map((anel) => (
              <button
                key={anel.id}
                onClick={() => handleEquipar("anel", anel.id)}
                disabled={equipando === anel.id || personagem.anel === anel.id}
                className="btn btn-ghost"
                style={{
                  justifyContent: "flex-start",
                  gap: "0.6rem",
                  padding: "0.75rem 1rem",
                  borderColor: personagem.anel === anel.id ? "var(--primary)" : undefined,
                  background: personagem.anel === anel.id ? "rgba(124,58,237,0.1)" : undefined,
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{anel.emoji}</span>
                <span style={{ fontSize: "0.82rem" }}>{anel.nome}</span>
                {personagem.anel === anel.id && <span style={{ marginLeft: "auto", color: "var(--primary-light)", fontSize: "0.7rem" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
