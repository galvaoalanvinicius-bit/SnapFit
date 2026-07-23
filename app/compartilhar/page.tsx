'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import type { Profile } from '@/lib/types';

interface DailySummary {
  caloriesConsumed: number;
  calorieGoal: number;
  caloriesBurned: number;
  mealsCompleted: number;
  totalMeals: number;
  workoutCompleted: boolean;
  workoutTitle: string;
  workoutCalories: number;
  topMeal: string;
  proteins: number;
  carbs: number;
  fat: number;
  activityDistance: number;
  activityType: string;
  activityPhoto: string | null;
}

export default function CompartilharPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<'daily' | 'workout' | 'activity'>('daily');
  const [copying, setCopying] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      const bmr = p?.gender === 'male'
        ? 88.36 + 13.4 * (p?.weight ?? 70) + 4.8 * (p?.height ?? 170) - 5.7 * (p?.age ?? 25)
        : 447.6 + 9.25 * (p?.weight ?? 60) + 3.1 * (p?.height ?? 165) - 4.3 * (p?.age ?? 25);
      const tdee = Math.round(bmr * 1.55);
      const calorieGoal = p?.goal === 'lose_weight' ? tdee - 500
        : p?.goal === 'gain_muscle' ? tdee + 300 : tdee;

      const { data: meals } = await supabase
        .from('daily_meals').select('*')
        .eq('user_id', user.id).eq('date', today);

      const completed = meals?.filter(m => m.completed) ?? [];
      const caloriesConsumed = completed.reduce((s, m) => s + m.calories, 0);
      const proteins = completed.reduce((s, m) => s + m.proteins, 0);
      const carbs = completed.reduce((s, m) => s + m.carbs, 0);
      const fat = completed.reduce((s, m) => s + m.fat, 0);

      const { data: workout } = await supabase
        .from('workouts').select('*')
        .eq('user_id', user.id).eq('date', today).single();

      const { data: activities } = await supabase
        .from('manual_activities').select('calories_burned')
        .eq('user_id', user.id).eq('date', today);

      const { data: routes } = await supabase
        .from('activity_routes').select('*')
        .eq('user_id', user.id).eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestRoute = routes?.[0] ?? null;
      const actCals = (activities ?? []).reduce((s, a) => s + a.calories_burned, 0);
      const workoutCals = (workout?.calories_burned ?? 0) + actCals;

      setSummary({
        caloriesConsumed,
        calorieGoal,
        caloriesBurned: workoutCals,
        mealsCompleted: completed.length,
        totalMeals: meals?.length ?? 5,
        workoutCompleted: workout?.completed ?? false,
        workoutTitle: workout?.title ?? '',
        workoutCalories: workoutCals,
        topMeal: completed[0]?.meal_name ?? '—',
        proteins: Math.round(proteins),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        activityDistance: latestRoute?.distance_km ?? 0,
        activityType: latestRoute?.activity_type ?? '',
        activityPhoto: latestRoute?.photo_url ?? null,
      });
      setLoading(false);
    }
    load();
  }, [router]);

  function getShareText() {
    if (!summary || !profile) return '';
    const name = profile.full_name?.split(' ')[0];
    const goalLabel: Record<string, string> = {
      lose_weight: 'emagrecimento 🔥',
      gain_muscle: 'ganho de massa 💪',
      maintain: 'manutenção ⚖️',
    };

    if (selectedCard === 'daily') {
      return `⚡ Meu dia no SnapFit — ${todayFormatted}

✅ ${summary.mealsCompleted}/${summary.totalMeals} refeições concluídas
🍽️ ${summary.caloriesConsumed} kcal consumidas de ${summary.calorieGoal} kcal
💪 ${summary.caloriesBurned > 0 ? `${summary.caloriesBurned} kcal queimadas` : 'Dia de descanso'}
📊 Proteínas: ${summary.proteins}g | Carbs: ${summary.carbs}g | Gorduras: ${summary.fat}g
🎯 Objetivo: ${goalLabel[profile.goal ?? 'maintain']}

Transformando minha alimentação com IA! 🤖
snap-fit-sigma.vercel.app

#SnapFit #Nutrição #Saúde #FitnessBrasil`;
    }

    if (selectedCard === 'workout') {
      return `💪 Treino concluído! — ${todayFormatted}

🏋️ ${summary.workoutTitle || 'Treino do dia'}
🔥 ${summary.workoutCalories} kcal queimadas
⏱️ 60 minutos de dedicação pura!

Usando IA para otimizar meus treinos! ⚡
snap-fit-sigma.vercel.app

#SnapFit #Treino #Fitness #Academia #PersonalTrainer`;
    }

    const actIcon: Record<string, string> = {
      'Corrida': '🏃', 'Caminhada': '🚶', 'Bicicleta': '🚴', 'Natação': '🏊',
    };

    return `${actIcon[summary.activityType] ?? '🏃'} ${summary.activityType} concluída! — ${todayFormatted}

📍 ${summary.activityDistance.toFixed(2)}km percorridos
🔥 ${summary.caloriesBurned} kcal queimadas
🎯 Objetivo: ${goalLabel[profile.goal ?? 'maintain']}

Rastreando minhas atividades com o SnapFit! ⚡
snap-fit-sigma.vercel.app

#SnapFit #${summary.activityType} #Fitness #Saúde`;
  }

  async function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText())}`, '_blank');
  }

  async function shareInstagram() {
    await navigator.clipboard.writeText(getShareText());
    alert('Legenda copiada! Abra o Instagram e cole na legenda da sua foto 📸');
  }

  async function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(getShareText())}`, '_blank');
  }

  async function copyText() {
    await navigator.clipboard.writeText(getShareText());
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-4xl animate-pulse">📱</div>
    </div>
  );

  const netCalories = (summary?.caloriesConsumed ?? 0) - (summary?.caloriesBurned ?? 0);
  const goalLabel: Record<string, string> = {
    lose_weight: '🔥 Emagrecimento',
    gain_muscle: '💪 Ganho de massa',
    maintain: '⚖️ Manutenção',
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-white">Compartilhar 📱</h1>
          <p className="text-gray-400 text-sm mt-1">Mostre sua evolução para o mundo!</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key: 'daily', label: '📊 Resumo do dia' },
            { key: 'workout', label: '💪 Treino' },
            { key: 'activity', label: '🏃 Atividade' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setSelectedCard(tab.key as any)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCard === tab.key
                  ? 'bg-cyan-400 text-black'
                  : 'border border-gray-800 text-gray-400'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card de preview */}
        <div ref={cardRef} className="rounded-2xl overflow-hidden mb-6 border border-gray-800"
          style={{ background: 'linear-gradient(135deg, #000000, #0a0a1a)' }}>

          {/* Foto da atividade se existir */}
          {selectedCard === 'activity' && summary?.activityPhoto && (
            <img src={summary.activityPhoto}
              className="w-full h-48 object-cover" alt="Atividade" />
          )}

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="text-white font-black gradient-text">SnapFit</span>
              </div>
              <span className="text-gray-600 text-xs">{todayFormatted}</span>
            </div>

            {selectedCard === 'daily' && summary && (
              <div>
                <p className="text-white font-bold mb-3">
                  Resumo de {profile?.full_name?.split(' ')[0]} 🎯
                </p>
                <div className="bg-gray-900/50 rounded-xl p-3 mb-3">
                  <div className="flex justify-between mb-2">
                    <p className="text-gray-400 text-xs">Calorias</p>
                    <p className="text-cyan-400 text-xs font-bold">{summary.caloriesConsumed}/{summary.calorieGoal} kcal</p>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                      style={{ width: `${Math.min((summary.caloriesConsumed / summary.calorieGoal) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                    <p className="text-blue-400 font-bold text-sm">{summary.proteins}g</p>
                    <p className="text-gray-600 text-xs">Prot</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                    <p className="text-yellow-400 font-bold text-sm">{summary.carbs}g</p>
                    <p className="text-gray-600 text-xs">Carb</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                    <p className="text-red-400 font-bold text-sm">{summary.fat}g</p>
                    <p className="text-gray-600 text-xs">Gord</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">{summary.mealsCompleted}/{summary.totalMeals} refeições ✅</span>
                  <span className="text-xs text-cyan-400">{goalLabel[profile?.goal ?? 'maintain']}</span>
                </div>
              </div>
            )}

            {selectedCard === 'workout' && summary && (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">🏆</div>
                <p className="text-white font-bold text-lg">{summary.workoutTitle || 'Treino concluído!'}</p>
                <p className="text-gray-400 text-sm mb-4">60 minutos de dedicação</p>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <p className="text-orange-400 text-4xl font-black">{summary.workoutCalories}</p>
                  <p className="text-gray-400 text-sm">calorias queimadas 🔥</p>
                </div>
              </div>
            )}

            {selectedCard === 'activity' && summary && (
              <div>
                <p className="text-white font-bold text-lg mb-4">
                  {summary.activityType || 'Atividade'} concluída! 🏃
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-cyan-400 font-black text-xl">
                      {summary.activityDistance.toFixed(2)}km
                    </p>
                    <p className="text-gray-500 text-xs">Distância</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-orange-400 font-black text-xl">{summary.caloriesBurned}</p>
                    <p className="text-gray-500 text-xs">kcal queimadas</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between">
              <p className="text-gray-700 text-xs">snap-fit-sigma.vercel.app</p>
              <p className="text-cyan-400 text-xs font-bold">#SnapFit</p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <p className="text-gray-400 text-sm font-semibold mb-3">Compartilhar em</p>
        <div className="space-y-3">
          <button onClick={shareWhatsApp}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3"
            style={{ backgroundColor: '#075e54', color: '#25d366', border: '1px solid #128c7e' }}>
            <span className="text-2xl">💬</span> WhatsApp
          </button>

          <button onClick={shareInstagram}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 text-white"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', border: 'none' }}>
            <span className="text-2xl">📸</span> Instagram (copiar legenda)
          </button>

          <button onClick={shareFacebook}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 text-white"
            style={{ backgroundColor: '#1877f2', border: 'none' }}>
            <span className="text-2xl">👍</span> Facebook
          </button>

          <button onClick={copyText}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 border border-gray-800 text-gray-400">
            <span className="text-2xl">📋</span>
            {copying ? 'Copiado! ✅' : 'Copiar texto'}
          </button>
        </div>

        {/* Preview do texto */}
        <div className="mt-6">
          <p className="text-gray-500 text-xs font-semibold mb-2">Preview</p>
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">
              {getShareText()}
            </p>
          </div>
        </div>
      </div>
      <BottomNav active="compartilhar" />
    </div>
  );
}