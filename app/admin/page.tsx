'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserData {
  id: string;
  full_name: string | null;
  email: string;
  source: string | null;
  goal: string | null;
  created_at: string;
  subscription_status: string | null;
}

const goalLabels: Record<string, string> = {
  lose_weight: '🔥 Emagrecer',
  gain_muscle: '💪 Ganhar massa',
  maintain: '⚖️ Manutenção',
};

const sourceLabels: Record<string, string> = {
  academia_tnt: '🏋️ Academia TNT',
  sozinho: '🔍 Por conta própria',
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'academia_tnt' | 'sozinho'>('all');
  const [stats, setStats] = useState({
    total: 0,
    academia: 0,
    sozinho: 0,
    ativos: 0,
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single();

      if (!profile?.is_admin) { router.push('/dashboard'); return; }

      await fetchUsers();
    }
    load();
  }, [router]);

  async function fetchUsers() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, status');

    const subMap: Record<string, string> = {};
    subscriptions?.forEach(s => { subMap[s.user_id] = s.status; });

    const userData: UserData[] = (profiles ?? []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      source: p.source,
      goal: p.goal,
      created_at: p.created_at,
      subscription_status: subMap[p.id] ?? null,
    }));

    setUsers(userData);
    setStats({
      total: userData.length,
      academia: userData.filter(u => u.source === 'academia_tnt').length,
      sozinho: userData.filter(u => u.source === 'sozinho').length,
      ativos: userData.filter(u => u.subscription_status === 'active').length,
    });
    setLoading(false);
  }

  async function liberarAcesso(userId: string) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    const { data: existing } = await supabase
      .from('subscriptions').select('id').eq('user_id', userId).single();

    if (existing) {
      await supabase.from('subscriptions')
        .update({ status: 'active', expires_at: expires.toISOString() })
        .eq('user_id', userId);
    } else {
      await supabase.from('subscriptions').insert({
        user_id: userId, status: 'active',
        plan: 'monthly', expires_at: expires.toISOString(),
      });
    }
    await fetchUsers();
  }

  async function revogarAcesso(userId: string) {
    await supabase.from('subscriptions')
      .update({ status: 'inactive' }).eq('user_id', userId);
    await fetchUsers();
  }

  const filtered = users.filter(u => filter === 'all' || u.source === filter);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse mb-3">⚡</div>
        <p className="text-gray-400">Carregando painel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-10">
      <div className="max-w-2xl mx-auto p-5">

        {/* Header */}
        <div className="pt-8 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Painel Admin 🛡️</h1>
            <p className="text-cyan-400 text-sm mt-1">SnapFit — Grupo NSG</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-gray-500 text-sm border border-gray-800 px-4 py-2 rounded-xl">
            ← Voltar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Total de usuários', value: stats.total, color: 'text-white' },
            { label: 'Assinaturas ativas', value: stats.ativos, color: 'text-green-400' },
            { label: 'Academia TNT', value: stats.academia, color: 'text-cyan-400' },
            { label: 'Por conta própria', value: stats.sozinho, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center border border-gray-800">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-5">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'academia_tnt', label: '🏋️ Academia TNT' },
            { value: 'sozinho', label: '🔍 Por conta própria' },
          ].map(f => (
            <button key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f.value
                  ? 'bg-cyan-400 text-black'
                  : 'border border-gray-800 text-gray-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de usuários */}
        <div className="space-y-3">
          {filtered.map(user => (
            <div key={user.id} className="glass-card rounded-xl p-4 border border-gray-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">{user.full_name ?? 'Sem nome'}</p>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  user.subscription_status === 'active'
                    ? 'bg-green-950 text-green-400'
                    : 'bg-red-950 text-red-400'
                }`}>
                  {user.subscription_status === 'active' ? '✅ Ativo' : '❌ Inativo'}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap mb-3">
                {user.source && (
                  <span className="text-xs bg-cyan-950 text-cyan-400 px-2 py-1 rounded-full">
                    {sourceLabels[user.source] ?? user.source}
                  </span>
                )}
                {user.goal && (
                  <span className="text-xs bg-purple-950 text-purple-400 px-2 py-1 rounded-full">
                    {goalLabels[user.goal] ?? user.goal}
                  </span>
                )}
                <span className="text-xs bg-gray-900 text-gray-500 px-2 py-1 rounded-full">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex gap-2">
                {user.subscription_status !== 'active' ? (
                  <button onClick={() => liberarAcesso(user.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-950 text-green-400 border border-green-900">
                    ✅ Liberar acesso
                  </button>
                ) : (
                  <button onClick={() => revogarAcesso(user.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-950 text-red-400 border border-red-900">
                    ❌ Revogar acesso
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center border border-gray-800">
              <p className="text-gray-400">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}