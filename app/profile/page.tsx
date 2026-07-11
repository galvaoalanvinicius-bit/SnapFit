'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';

const goalLabels: Record<string, string> = {
  lose_weight: '🔥 Emagrecimento',
  gain_muscle: '💪 Ganho de massa',
  maintain: '⚖️ Manutenção',
};

const sourceLabels: Record<string, string> = {
  academia_tnt: '🏋️ Academia TNT',
  sozinho: '🔍 Por conta própria',
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      setIsAdmin(!!p?.is_admin);
      const { data: sub } = await supabase
        .from('subscriptions').select('*')
        .eq('user_id', user.id).eq('status', 'active').single();
      setIsActive(!!sub);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    if (!confirm('Deseja sair da conta?')) return;
    await supabase.auth.signOut();
    router.push('/login');
  }

  const bmi = profile?.weight && profile?.height
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
    : null;

  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5 ? 'Abaixo do peso'
    : parseFloat(bmi) < 25 ? 'Peso normal'
    : parseFloat(bmi) < 30 ? 'Sobrepeso' : 'Obesidade'
    : null;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-4xl animate-pulse">⚡</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-white">Meu Perfil 👤</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full neon-border-blue flex items-center justify-center text-4xl font-black text-cyan-400 mb-3 glow-ring">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <p className="text-white font-bold text-lg">{profile?.full_name}</p>
          <p className="text-gray-500 text-sm">{profile?.email}</p>
          {(profile as any)?.source && (
            <span className="mt-2 text-xs bg-cyan-950 text-cyan-400 px-3 py-1 rounded-full">
              {sourceLabels[(profile as any).source] ?? (profile as any).source}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Peso', value: profile?.weight ? `${profile.weight}kg` : '—' },
            { label: 'Altura', value: profile?.height ? `${profile.height}cm` : '—' },
            { label: 'Idade', value: profile?.age ? `${profile.age}a` : '—' },
          ].map(s => (
            <div key={s.label} className="glass-card neon-border-blue rounded-xl p-3 text-center">
              <p className="text-cyan-400 font-bold text-lg">{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* BMI */}
        {bmi && (
          <div className="glass-card rounded-xl p-4 mb-4 flex justify-between items-center">
            <span className="text-gray-400">IMC</span>
            <div className="text-right">
              <span className="text-white font-bold">{bmi}</span>
              <span className="text-gray-500 text-sm ml-2">{bmiLabel}</span>
            </div>
          </div>
        )}

        {/* Objetivo */}
        <div className="glass-card rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-gray-400">Objetivo</span>
          <span className="text-white font-semibold">
            {goalLabels[profile?.goal ?? 'maintain']}
          </span>
        </div>

        {/* Assinatura */}
        <div className="glass-card rounded-xl p-4 mb-6 flex justify-between items-center">
          <span className="text-gray-400">Assinatura</span>
          <span className={isActive ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {isActive ? '✅ Ativa' : '❌ Inativa'}
          </span>
        </div>

        {/* Ações */}
        <div className="space-y-3">
          <button onClick={() => router.push('/onboarding')}
            className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold">
            ✏️ Editar dados físicos
          </button>

          {!isActive && (
            <button onClick={() => router.push('/subscribe')}
              className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold">
              ⚡ Assinar agora
            </button>
          )}

          {isAdmin && (
            <button onClick={() => router.push('/admin')}
              className="w-full py-4 rounded-xl text-purple-400 font-bold border border-purple-900 bg-purple-950/20">
              🛡️ Painel Admin
            </button>
          )}

          <button onClick={handleLogout}
            className="w-full py-4 rounded-xl text-red-400 font-semibold border border-red-900">
            Sair da conta
          </button>
        </div>

        <p className="text-gray-700 text-xs text-center mt-6">
          SnapFit — Uma empresa do Grupo NSG
        </p>
      </div>
      <BottomNav active="profile" />
    </div>
  );
}