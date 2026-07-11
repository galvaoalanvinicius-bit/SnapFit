'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!source) { setError('Selecione como nos conheceu'); return; }
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, source } },
      });
      if (error) throw error;
      router.push('/login');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black gradient-text">SnapFit</h1>
          <p className="text-gray-500 text-xs mt-1">Uma empresa do Grupo NSG</p>
          <p className="text-gray-400 text-sm mt-3">Criar nova conta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Nome completo</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Seu nome" required />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" required />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Confirmar senha</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a senha" required />
          </div>

          {/* Como nos conheceu */}
          <div>
            <label className="text-gray-400 text-sm mb-3 block">
              Como você descobriu o SnapFit?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'academia_tnt', label: '🏋️ Academia TNT' },
                { value: 'sozinho', label: '🔍 Por conta própria' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSource(opt.value)}
                  className={`p-4 rounded-xl text-sm font-semibold transition-all border ${
                    source === opt.value
                      ? 'border-cyan-400 bg-cyan-950/30 text-cyan-400'
                      : 'border-gray-800 bg-gray-950 text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold text-base disabled:opacity-50">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-gray-400 text-sm">
            Já tem conta? <span className="text-cyan-400">Entrar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}