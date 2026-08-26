"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function PerfilPage() {
  const { user, loading, atualizarPerfil } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState(user?.displayName ?? "");
  const [foto, setFoto] = useState(user?.photoURL ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) {
      setNome(user.displayName ?? "");
      setFoto(user.photoURL ?? "");
    }
  }, [user, loading, router]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg("");
    try {
      await atualizarPerfil({
        displayName: nome || user.email?.split("@")[0] || "Herói",
        photoURL: foto || null,
      });
      setMsg("Perfil atualizado com sucesso!");
    } catch {
      setMsg("Erro ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "2rem", animation: "spin-slow 2s linear infinite" }}>🔮</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo gold-text">⚔️ NEXUS</Link>
        <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: "0.82rem" }}>← Dashboard</Link>
      </nav>

      <main className="container" style={{ maxWidth: 560, paddingTop: "2rem" }}>
        <div className="card" style={{ padding: "2rem" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, marginBottom: "1rem" }}>Perfil do aventureiro</h1>

          <form onSubmit={handleSalvar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="nomePerfil">Nome</label>
              <input
                id="nomePerfil"
                className="input-field"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome no Nexus"
              />
            </div>

            <div>
              <label htmlFor="fotoPerfil">URL da foto</label>
              <input
                id="fotoPerfil"
                className="input-field"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {msg && <p className="msg-success">{msg}</p>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
