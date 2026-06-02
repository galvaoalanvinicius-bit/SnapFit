'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">📧</div>
      <h2 className="text-2xl font-bold text-white mb-3">E-mail enviado!</h2>
      <p className="text-gray-400 mb-6">Verifique sua caixa de entrada e siga as instruções.</p>
      <Link href="/login" className="neon-btn px-8 py-3 rounded-xl text-cyan-400 font-bold">Voltar ao login</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black gradient-text">SnapFit</h1>
          <p className="text-gray-500 text-xs mt-1">Uma empresa do Grupo NSG</p>
          <p className="text-gray-400 text-sm mt-3">Recuperar senha</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          {error && <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
          <button type="submit" disabled={loading}
            className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar instruções'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-gray-500 text-sm">← Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}