'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-4xl font-black gradient-text">SnapFit</h1>
          <p className="text-gray-500 text-xs mt-1">Uma empresa do Grupo NSG</p>
          <p className="text-gray-400 text-sm mt-3">Nutrição inteligente com IA</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha" required
            />
          </div>

          {error && (
            <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold text-base mt-2 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <Link href="/register" className="text-gray-400 text-sm block">
            Não tem conta? <span className="text-cyan-400">Cadastre-se</span>
          </Link>
          <Link href="/forgot-password" className="text-gray-500 text-sm block">
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  );
}