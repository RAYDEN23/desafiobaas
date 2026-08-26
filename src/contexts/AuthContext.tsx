"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  atualizarPerfil: (dados: { displayName?: string; photoURL?: string | null }) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function entrar(email: string, senha: string) {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    document.cookie = `__session=${await cred.user.getIdToken()}; path=/`;
  }

  async function cadastrar(nome: string, email: string, senha: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    document.cookie = `__session=${await cred.user.getIdToken()}; path=/`;
  }

  async function atualizarPerfil(dados: { displayName?: string; photoURL?: string | null }) {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, dados);
  }

  async function sair() {
    await signOut(auth);
    document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  return (
    <AuthContext.Provider value={{ user, loading, entrar, cadastrar, atualizarPerfil, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de AuthProvider");
  return ctx;
}
