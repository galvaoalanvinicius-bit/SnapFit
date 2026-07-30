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

interface BodyEvolution {
  id: string;
  date: string;
  weight: number;
  body_fat_percentage: number;
  muscle_mass: number;
  waist_cm: number;
  notes: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalMeals, setTotalMeals] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [activeTab, setActiveTab] = useState<'perfil' | 'evolucao' | 'corpo'>('perfil');
  const [evolution, setEvolution] = useState<BodyEvolution[]>([]);
  const [showAddEvolution, setShowAddEvolution] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newWaist, setNewWaist] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingEvolution, setSavingEvolution] = useState(false);
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [totalMealsCompleted, setTotalMealsCompleted] = useState(0);
  const [daysTracking, setDaysTracking] = useState(0);

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

      const { count: mealsCount } = await supabase
        .from('meals').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalMeals(mealsCount ?? 0);

      const { count: workoutsCount } = await supabase
        .from('workouts').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('completed', true);
      setTotalWorkouts(workoutsCount ?? 0);

      // Total calorias queimadas
      const { data: activities } = await supabase
        .from('manual_activities').select('calories_burned, created_at')
        .eq('user_id', user.id);
      const totalBurned = (activities ?? []).reduce((s, a) => s + a.calories_burned, 0);
      setTotalCaloriesBurned(totalBurned);

      // Total refeições do cardápio completadas
      const { count: completedMeals } = await supabase
        .from('daily_meals').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('completed', true);
      setTotalMealsCompleted(completedMeals ?? 0);

      // Dias rastreando
      const { data: workoutDays } = await supabase
        .from('workouts').select('date').eq('user_id', user.id);
      setDaysTracking(new Set(workoutDays?.map(w => w.date)).size);

      // Evolução corporal
      const { data: evo } = await supabase
        .from('body_evolution').select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      setEvolution(evo ?? []);

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    if (!confirm('Deseja sair da conta?')) return;
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function saveEvolution() {
    if (!profile || !newWeight) return;
    setSavingEvolution(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: saved } = await supabase.from('body_evolution').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        weight: parseFloat(newWeight),
        body_fat_percentage: newBodyFat ? parseFloat(newBodyFat) : null,
        muscle_mass: newMuscle ? parseFloat(newMuscle) : null,
        waist_cm: newWaist ? parseFloat(newWaist) : null,
        notes: newNotes || null,
      }).select().single();

      if (saved) setEvolution(prev => [saved as any, ...prev]);
      setShowAddEvolution(false);
      setNewWeight(''); setNewBodyFat('');
      setNewMuscle(''); setNewWaist(''); setNewNotes('');
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setSavingEvolution(false);
    }
  }

  // Calcular estimativa de resultado
  function calcEstimatedResult() {
    if (!profile?.weight || !profile?.goal || daysTracking === 0) return null;

    const calDeficitPerDay = profile.goal === 'lose_weight' ? 500
      : profile.goal === 'gain_muscle' ? -300 : 0;

    // Estimativa: 7700 kcal = 1kg de gordura
    const estimatedKgChange = (totalCaloriesBurned - (calDeficitPerDay * daysTracking)) / 7700;

    if (profile.goal === 'lose_weight') {
      const kgLost = Math.abs(Math.min(estimatedKgChange, 0)) +
        (totalCaloriesBurned / 7700 * 0.3);
      return { value: kgLost.toFixed(1), label: 'kg estimados perdidos', color: '#22c55e', icon: '🔥' };
    }
    if (profile.goal === 'gain_muscle') {
      const kgGained = (totalCaloriesBurned / 7700 * 0.1) +
        (totalWorkouts * 0.05);
      return { value: kgGained.toFixed(1), label: 'kg estimados de massa', color: '#3b82f6', icon: '💪' };
    }
    return null;
  }

  const estimatedResult = calcEstimatedResult();

  const bmi = profile?.weight && profile?.height
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;

  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5 ? 'Abaixo do peso'
    : parseFloat(bmi) < 25 ? 'Peso normal'
    : parseFloat(bmi) < 30 ? 'Sobrepeso' : 'Obesidade' : null;

  const bmiColor = bmi
    ? parseFloat(bmi) < 18.5 ? '#f59e0b'
    : parseFloat(bmi) < 25 ? '#22c55e'
    : parseFloat(bmi) < 30 ? '#f97316' : '#ef4444' : '#666';

  // Calcular % gordura corporal estimada (fórmula de Deurenberg)
  const estimatedBodyFat = profile?.weight && profile?.height && profile?.age
    ? profile.gender === 'male'
      ? (1.20 * parseFloat(bmi ?? '0')) + (0.23 * profile.age) - 16.2
      : (1.20 * parseFloat(bmi ?? '0')) + (0.23 * profile.age) - 5.4
    : null;

  const latestEvolution = evolution[0];

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-4xl animate-pulse">⚡</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-4">
          <h1 className="text-2xl font-bold text-white">Meu Perfil 👤</h1>
        </div>

        {/* Avatar e info */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full neon-border-blue flex items-center justify-center text-3xl font-black text-cyan-400 glow-ring flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{profile?.full_name}</p>
            <p className="text-gray-500 text-sm">{profile?.email}</p>
            {(profile as any)?.source && (
              <span className="text-xs bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full">
                {sourceLabels[(profile as any).source] ?? (profile as any).source}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'perfil', label: '👤 Perfil' },
            { key: 'corpo', label: '🫀 Corpo' },
            { key: 'evolucao', label: '📈 Evolução' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-400 text-black'
                  : 'border border-gray-800 text-gray-400'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ABA PERFIL */}
        {activeTab === 'perfil' && (
          <div className="space-y-3">
            {/* Stats físicos */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Peso', value: profile?.weight ? `${profile.weight}kg` : '—' },
                { label: 'Altura', value: profile?.height ? `${profile.height}cm` : '—' },
                { label: 'Idade', value: profile?.age ? `${profile.age}a` : '—' },
              ].map(s => (
                <div key={s.label} className="glass-card neon-border-blue rounded-xl p-3 text-center">
                  <p className="text-cyan-400 font-bold">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Conquistas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="glass-card rounded-xl p-4 text-center border border-gray-800">
                <p className="text-3xl font-black text-cyan-400">{totalMeals}</p>
                <p className="text-gray-500 text-xs mt-1">🍽️ Refeições analisadas</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center border border-gray-800">
                <p className="text-3xl font-black text-orange-400">{totalWorkouts}</p>
                <p className="text-gray-500 text-xs mt-1">💪 Treinos concluídos</p>
              </div>
            </div>

            {/* Estimativa de resultado */}
            {estimatedResult && (
              <div className="rounded-xl p-4 border text-center"
                style={{ borderColor: estimatedResult.color, background: `${estimatedResult.color}11` }}>
                <p className="text-gray-400 text-xs mb-1">📊 Estimativa baseada nos seus dados</p>
                <p className="text-5xl font-black mb-1" style={{ color: estimatedResult.color }}>
                  {estimatedResult.icon} {estimatedResult.value}
                </p>
                <p style={{ color: estimatedResult.color }} className="text-sm font-semibold">
                  {estimatedResult.label}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Baseado em {daysTracking} dias de rastreamento e {totalCaloriesBurned} kcal queimadas
                </p>
              </div>
            )}

            {/* IMC */}
            {bmi && (
              <div className="glass-card rounded-xl p-4 border border-gray-800 flex justify-between items-center">
                <span className="text-gray-400">IMC</span>
                <div className="text-right">
                  <span className="font-bold" style={{ color: bmiColor }}>{bmi}</span>
                  <span className="text-gray-500 text-sm ml-2">{bmiLabel}</span>
                </div>
              </div>
            )}

            <div className="glass-card rounded-xl p-4 border border-gray-800 flex justify-between">
              <span className="text-gray-400">Objetivo</span>
              <span className="text-white font-semibold">{goalLabels[profile?.goal ?? 'maintain']}</span>
            </div>

            <div className="glass-card rounded-xl p-4 border border-gray-800 flex justify-between">
              <span className="text-gray-400">Assinatura</span>
              <span className={isActive ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                {isActive ? '✅ Ativa' : '❌ Inativa'}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button onClick={() => router.push('/compartilhar')}
                className="w-full py-3 rounded-xl text-pink-400 font-bold border border-pink-900 bg-pink-950/20">
                📱 Compartilhar minha evolução
              </button>
              <button onClick={() => router.push('/onboarding')}
                className="neon-btn w-full py-3 rounded-xl text-cyan-400 font-bold">
                ✏️ Editar dados físicos
              </button>
              {!isActive && (
                <button onClick={() => router.push('/subscribe')}
                  className="neon-btn-orange w-full py-3 rounded-xl text-orange-400 font-bold">
                  ⚡ Assinar agora
                </button>
              )}
              {isAdmin && (
                <button onClick={() => router.push('/admin')}
                  className="w-full py-3 rounded-xl text-purple-400 font-bold border border-purple-900 bg-purple-950/20">
                  🛡️ Painel Admin
                </button>
              )}
              <button onClick={handleLogout}
                className="w-full py-3 rounded-xl text-red-400 font-semibold border border-red-900">
                Sair da conta
              </button>
            </div>
          </div>
        )}

        {/* ABA CORPO */}
        {activeTab === 'corpo' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Análise corporal baseada nos seus dados físicos
            </p>

            {/* Silhueta corporal com dados */}
            <div className="glass-card rounded-2xl p-5 border border-gray-800 relative overflow-hidden">
              <p className="text-white font-bold text-center mb-4">🫀 Composição Corporal Estimada</p>

              {/* Silhueta SVG */}
              <div className="flex justify-center mb-4">
                <svg viewBox="0 0 200 400" width="160" height="320">
                  {/* Cabeça */}
                  <circle cx="100" cy="50" r="35" fill="#1a1a3a" stroke="#00d4ff" strokeWidth="2" />
                  {/* Corpo */}
                  <ellipse cx="100" cy="180" rx="50" ry="80" fill="#1a1a3a" stroke="#00d4ff" strokeWidth="2" />
                  {/* Braço esquerdo */}
                  <ellipse cx="35" cy="190" rx="18" ry="65" fill="#1a1a3a" stroke="#00d4ff" strokeWidth="1.5"
                    transform="rotate(-10 35 190)" />
                  {/* Braço direito */}
                  <ellipse cx="165" cy="190" rx="18" ry="65" fill="#1a1a3a" stroke="#00d4ff" strokeWidth="1.5"
                    transform="rotate(10 165 190)" />
                  {/* Perna esquerda */}
                  <ellipse cx="75" cy="330" rx="22" ry="70" fill="#1a1a3a" stroke="#00d4ff" strokeWidth="1.5" />
                  {/* Perna direita */}
                  <ellipse cx="125" cy="330" rx="22" ry="70" fill="#1a1a3a" stroke="#00d4ff" strokeWidth="1.5" />

                  {/* Indicadores */}
                  {/* IMC - centro */}
                  <text x="100" y="175" textAnchor="middle" fill="#00d4ff" fontSize="12" fontWeight="bold">
                    {bmi ?? '--'}
                  </text>
                  <text x="100" y="190" textAnchor="middle" fill="#666" fontSize="8">IMC</text>

                  {/* % gordura - peito */}
                  <text x="100" y="145" textAnchor="middle" fill="#f97316" fontSize="10" fontWeight="bold">
                    {estimatedBodyFat ? `${estimatedBodyFat.toFixed(1)}%` : '--'}
                  </text>
                  <text x="100" y="158" textAnchor="middle" fill="#666" fontSize="7">gordura</text>
                </svg>
              </div>

              {/* Dados ao redor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-cyan-400 font-black text-lg">{bmi ?? '--'}</p>
                  <p className="text-gray-500 text-xs">IMC</p>
                  <p className="text-xs mt-1" style={{ color: bmiColor }}>{bmiLabel}</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-orange-400 font-black text-lg">
                    {estimatedBodyFat ? `${estimatedBodyFat.toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-gray-500 text-xs">% Gordura est.</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-blue-400 font-black text-lg">
                    {profile?.weight && estimatedBodyFat
                      ? `${(profile.weight * (1 - estimatedBodyFat / 100)).toFixed(1)}kg`
                      : '--'
                    }
                  </p>
                  <p className="text-gray-500 text-xs">Massa magra est.</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-red-400 font-black text-lg">
                    {profile?.weight && estimatedBodyFat
                      ? `${(profile.weight * (estimatedBodyFat / 100)).toFixed(1)}kg`
                      : '--'
                    }
                  </p>
                  <p className="text-gray-500 text-xs">Gordura est.</p>
                </div>
              </div>

              <p className="text-gray-600 text-xs text-center mt-3">
                * Estimativas baseadas em fórmulas científicas com seus dados físicos
              </p>
            </div>

            {/* Dados mais recentes do usuário */}
            {latestEvolution && (
              <div className="glass-card rounded-xl p-4 border border-gray-800">
                <p className="text-white font-bold mb-3">📋 Último registro manual</p>
                <p className="text-gray-500 text-xs mb-3">
                  {new Date(latestEvolution.date).toLocaleDateString('pt-BR')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {latestEvolution.weight && (
                    <div className="text-center">
                      <p className="text-cyan-400 font-bold">{latestEvolution.weight}kg</p>
                      <p className="text-gray-600 text-xs">Peso</p>
                    </div>
                  )}
                  {latestEvolution.body_fat_percentage && (
                    <div className="text-center">
                      <p className="text-orange-400 font-bold">{latestEvolution.body_fat_percentage}%</p>
                      <p className="text-gray-600 text-xs">% Gordura</p>
                    </div>
                  )}
                  {latestEvolution.muscle_mass && (
                    <div className="text-center">
                      <p className="text-blue-400 font-bold">{latestEvolution.muscle_mass}kg</p>
                      <p className="text-gray-600 text-xs">Massa muscular</p>
                    </div>
                  )}
                  {latestEvolution.waist_cm && (
                    <div className="text-center">
                      <p className="text-purple-400 font-bold">{latestEvolution.waist_cm}cm</p>
                      <p className="text-gray-600 text-xs">Cintura</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setShowAddEvolution(true)}
              className="neon-btn w-full py-3 rounded-xl text-cyan-400 font-bold">
              + Registrar medidas corporais
            </button>
          </div>
        )}

        {/* ABA EVOLUÇÃO */}
        {activeTab === 'evolucao' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-white font-semibold">Histórico de medidas</p>
              <button onClick={() => setShowAddEvolution(true)}
                className="text-cyan-400 text-sm border border-cyan-900 px-3 py-1 rounded-xl">
                + Adicionar
              </button>
            </div>

            {/* Estimativa geral */}
            {estimatedResult && (
              <div className="glass-card rounded-xl p-4 border border-gray-800">
                <p className="text-white font-bold text-sm mb-3">📊 Sua estimativa de progresso</p>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{estimatedResult.icon}</div>
                  <div>
                    <p className="font-black text-2xl" style={{ color: estimatedResult.color }}>
                      {estimatedResult.value} {estimatedResult.label}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Em {daysTracking} dias • {totalCaloriesBurned} kcal queimadas
                    </p>
                    <p className="text-gray-400 text-xs">
                      {totalMealsCompleted} refeições saudáveis completadas
                    </p>
                  </div>
                </div>
              </div>
            )}

            {evolution.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center border border-gray-800">
                <p className="text-4xl mb-3">📈</p>
                <p className="text-white font-semibold mb-1">Nenhum registro ainda</p>
                <p className="text-gray-400 text-sm">
                  Registre seu peso e medidas para acompanhar sua evolução
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {evolution.map((evo, i) => {
                  const prev = evolution[i + 1];
                  const weightDiff = prev ? evo.weight - prev.weight : 0;
                  return (
                    <div key={evo.id} className="glass-card rounded-xl p-4 border border-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-400 text-xs">
                          {new Date(evo.date).toLocaleDateString('pt-BR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                        {prev && (
                          <span className={`text-xs font-bold ${weightDiff < 0 ? 'text-green-400' : weightDiff > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {weightDiff < 0 ? '↓' : weightDiff > 0 ? '↑' : '→'} {Math.abs(weightDiff).toFixed(1)}kg
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {evo.weight && (
                          <div className="text-center">
                            <p className="text-cyan-400 font-bold text-sm">{evo.weight}kg</p>
                            <p className="text-gray-600 text-xs">Peso</p>
                          </div>
                        )}
                        {evo.body_fat_percentage && (
                          <div className="text-center">
                            <p className="text-orange-400 font-bold text-sm">{evo.body_fat_percentage}%</p>
                            <p className="text-gray-600 text-xs">Gordura</p>
                          </div>
                        )}
                        {evo.muscle_mass && (
                          <div className="text-center">
                            <p className="text-blue-400 font-bold text-sm">{evo.muscle_mass}kg</p>
                            <p className="text-gray-600 text-xs">Músculo</p>
                          </div>
                        )}
                        {evo.waist_cm && (
                          <div className="text-center">
                            <p className="text-purple-400 font-bold text-sm">{evo.waist_cm}cm</p>
                            <p className="text-gray-600 text-xs">Cintura</p>
                          </div>
                        )}
                      </div>
                      {evo.notes && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{evo.notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-gray-700 text-xs text-center mt-6">
          SnapFit — Uma empresa do Grupo NSG
        </p>
      </div>

      {/* Modal adicionar evolução */}
      {showAddEvolution && (
        <div className="fixed inset-0 bg-black/90 flex items-end z-50 p-4">
          <div className="w-full max-w-sm mx-auto bg-gray-950 border border-gray-800 rounded-2xl p-6">
            <p className="text-white font-bold text-lg mb-4">📏 Registrar medidas</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Peso atual (kg) *</label>
                <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                  placeholder="70.5" step="0.1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">% Gordura (opcional)</label>
                  <input type="number" value={newBodyFat} onChange={e => setNewBodyFat(e.target.value)}
                    placeholder="20.0" step="0.1" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Massa muscular kg</label>
                  <input type="number" value={newMuscle} onChange={e => setNewMuscle(e.target.value)}
                    placeholder="35.0" step="0.1" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Cintura (cm)</label>
                <input type="number" value={newWaist} onChange={e => setNewWaist(e.target.value)}
                  placeholder="80" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Observações</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)}
                  placeholder="Como você está se sentindo?" rows={2}
                  style={{ borderRadius: '12px', padding: '10px 14px' }} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAddEvolution(false)}
                className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 text-sm">
                Cancelar
              </button>
              <button onClick={saveEvolution} disabled={savingEvolution || !newWeight}
                className="flex-1 py-3 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold text-sm disabled:opacity-50">
                {savingEvolution ? 'Salvando...' : 'Salvar ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="profile" />
    </div>
  );
}