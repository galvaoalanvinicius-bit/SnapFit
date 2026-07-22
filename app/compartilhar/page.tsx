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
}

export default function CompartilharPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<'daily' | 'workout' | 'meal'>('daily');
  const cardRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      // Calcular meta calórica
      const bmr = p?.gender === 'male'
        ? 88.36 + 13.4 * (p?.weight ?? 70) + 4.8 * (p?.height ?? 170) - 5.7 * (p?.age ?? 25)
        : 447.6 + 9.25 * (p?.weight ?? 60) + 3.1 * (p?.height ?? 165) - 4.3 * (p?.age ?? 25);
      const tdee = Math.round(bmr * 1.55);
      const calorieGoal = p?.goal === 'lose_weight' ? tdee - 500
        : p?.goal === 'gain_muscle' ? tdee + 300 : tdee;

      // Buscar refeições do dia
      const { data: meals } = await supabase
        .from('daily_meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      const completedMeals = meals?.filter(m => m.completed) ?? [];
      const caloriesConsumed = completedMeals.reduce((sum, m) => sum + m.calories, 0);
      const proteins = completedMeals.reduce((sum, m) => sum + m.proteins, 0);
      const carbs = completedMeals.reduce((sum, m) => sum + m.carbs, 0);
      const fat = completedMeals.reduce((sum, m) => sum + m.fat, 0);
      const topMeal = completedMeals[0]?.meal_name ?? '—';

      // Buscar treino do dia
      const { data: workout } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // Buscar atividades manuais
      const { data: activities } = await supabase
        .from('manual_activities')
        .select('calories_burned')
        .eq('user_id', user.id)
        .eq('date', today);

      const activitiesCalories = (activities ?? []).reduce(
        (sum, a) => sum + a.calories_burned, 0
      );

      const workoutCalories = (workout?.calories_burned ?? 0) + activitiesCalories;

      setSummary({
        caloriesConsumed,
        calorieGoal,
        caloriesBurned: workoutCalories,
        mealsCompleted: completedMeals.length,
        totalMeals: meals?.length ?? 4,
        workoutCompleted: workout?.completed ?? false,
        workoutTitle: workout?.title ?? '',
        workoutCalories,
        topMeal,
        proteins: Math.round(proteins),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
      });
      setLoading(false);
    }
    load();
  }, [router]);

  function getShareText() {
    if (!summary || !profile) return '';
    const name = profile.full_name?.split(' ')[0];
    const goalLabel: Record<string, string> = {
      lose_weight: 'emagrecimento',
      gain_muscle: 'ganho de massa',
      maintain: 'manutenção',
    };

    if (selectedCard === 'daily') {
      return `🔥 Meu dia no SnapFit — ${todayFormatted}

✅ ${summary.mealsCompleted}/${summary.totalMeals} refeições concluídas
🍽️ ${summary.caloriesConsumed} kcal consumidas de ${summary.calorieGoal} kcal
💪 ${summary.caloriesBurned > 0 ? `${summary.caloriesBurned} kcal queimadas` : 'Sem treino hoje'}
📊 Proteínas: ${summary.proteins}g | Carbs: ${summary.carbs}g | Gorduras: ${summary.fat}g

Objetivo: ${goalLabel[profile.goal ?? 'maintain']} 🎯

Transformando minha alimentação com IA! 🤖
#SnapFit #Nutrição #Saúde #FitnessBrasil`;
    }

    if (selectedCard === 'workout') {
      return `💪 Treino concluído! — ${todayFormatted}

🏋️ ${summary.workoutTitle || 'Treino do dia'}
🔥 ${summary.workoutCalories} kcal queimadas
⏱️ 60 minutos de dedicação

Usando IA para otimizar meus treinos e alimentação! ⚡
#SnapFit #Treino #Fitness #PersonalTrainer #Academia`;
    }

    return `🥗 Alimentação saudável com IA — ${todayFormatted}

🍽️ Refeição destacada: ${summary.topMeal}
✅ ${summary.mealsCompleted} refeições saudáveis hoje
🎯 Objetivo: ${goalLabel[profile.goal ?? 'maintain']}

O SnapFit cria meu cardápio personalizado todo dia! 🤖
#SnapFit #Nutrição #ComidaSaudável #Saúde #Dieta`;
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function shareInstagram() {
    const text = getShareText();
    navigator.clipboard.writeText(text);
    alert('Texto copiado! Cole na legenda do Instagram 📸');
  }

  function shareFacebook() {
    const text = encodeURIComponent(getShareText());
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}`, '_blank');
  }

  function copyText() {
    navigator.clipboard.writeText(getShareText());
    alert('Texto copiado para a área de transferência! ✅');
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
          <p className="text-gray-400 text-sm mt-1">
            Mostre sua evolução para o mundo!
          </p>
        </div>

        {/* Seletor de card */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'daily', label: '📊 Resumo do dia' },
            { key: 'workout', label: '💪 Treino' },
            { key: 'meal', label: '🥗 Alimentação' },
          ].map(card => (
            <button
              key={card.key}
              onClick={() => setSelectedCard(card.key as any)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCard === card.key
                  ? 'bg-cyan-400 text-black'
                  : 'border border-gray-800 text-gray-400'
              }`}>
              {card.label}
            </button>
          ))}
        </div>

        {/* Card de preview */}
        <div ref={cardRef} className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, #000000, #0a0a1a, #000000)' }}>

          {/* Header do card */}
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span className="text-white font-black text-lg gradient-text">SnapFit</span>
              </div>
              <span className="text-gray-500 text-xs">Uma empresa do Grupo NSG</span>
            </div>
            <p className="text-gray-500 text-xs">{todayFormatted}</p>
          </div>

          {selectedCard === 'daily' && summary && (
            <div className="p-5">
              <p className="text-white font-bold text-lg mb-4">
                Resumo do dia de {profile?.full_name?.split(' ')[0]} 🎯
              </p>

              {/* Calorias */}
              <div className="bg-gray-900/50 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-400 text-sm">Calorias consumidas</p>
                  <p className="text-cyan-400 font-bold">{summary.caloriesConsumed} kcal</p>
                </div>
                <div className="h-2 bg-gray-800 rounded-full">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                    style={{ width: `${Math.min((summary.caloriesConsumed / summary.calorieGoal) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-gray-600 text-xs mt-1">Meta: {summary.calorieGoal} kcal</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-orange-400 font-bold text-xl">{summary.caloriesBurned}</p>
                  <p className="text-gray-500 text-xs">kcal queimadas</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-green-400 font-bold text-xl">{netCalories}</p>
                  <p className="text-gray-500 text-xs">kcal líquidas</p>
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                  <p className="text-blue-400 font-bold">{summary.proteins}g</p>
                  <p className="text-gray-600 text-xs">Proteínas</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                  <p className="text-yellow-400 font-bold">{summary.carbs}g</p>
                  <p className="text-gray-600 text-xs">Carboidratos</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                  <p className="text-red-400 font-bold">{summary.fat}g</p>
                  <p className="text-gray-600 text-xs">Gorduras</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {summary.mealsCompleted}/{summary.totalMeals} refeições ✅
                </span>
                <span className="text-xs text-cyan-400">
                  {goalLabel[profile?.goal ?? 'maintain']}
                </span>
              </div>
            </div>
          )}

          {selectedCard === 'workout' && summary && (
            <div className="p-5">
              <p className="text-white font-bold text-lg mb-4">
                Treino concluído! 💪
              </p>
              <div className="text-center py-6">
                <div className="text-6xl mb-3">🏆</div>
                <p className="text-white font-bold text-xl mb-1">
                  {summary.workoutTitle || 'Treino do dia'}
                </p>
                <p className="text-gray-400 text-sm mb-4">60 minutos de dedicação</p>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <p className="text-orange-400 text-4xl font-black">{summary.workoutCalories}</p>
                  <p className="text-gray-400 text-sm">calorias queimadas 🔥</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-xs text-cyan-400">{goalLabel[profile?.goal ?? 'maintain']}</span>
              </div>
            </div>
          )}

          {selectedCard === 'meal' && summary && (
            <div className="p-5">
              <p className="text-white font-bold text-lg mb-4">
                Alimentação saudável 🥗
              </p>
              <div className="bg-gray-900/50 rounded-xl p-4 mb-3 text-center">
                <p className="text-gray-400 text-xs mb-1">Destaque do dia</p>
                <p className="text-white font-bold">{summary.topMeal}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-cyan-400 font-bold text-xl">{summary.caloriesConsumed}</p>
                  <p className="text-gray-500 text-xs">kcal consumidas</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-green-400 font-bold text-xl">{summary.mealsCompleted}</p>
                  <p className="text-gray-500 text-xs">refeições saudáveis</p>
                </div>
              </div>
              <p className="text-center text-gray-500 text-xs">
                Cardápio personalizado com IA 🤖
              </p>
            </div>
          )}

          {/* Footer do card */}
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-gray-600 text-xs">snap-fit-sigma.vercel.app</p>
            <p className="text-cyan-400 text-xs font-bold">#SnapFit</p>
          </div>
        </div>

        {/* Botões de compartilhamento */}
        <p className="text-gray-400 text-sm font-semibold mb-3">Compartilhar em</p>
        <div className="space-y-3">
          <button
            onClick={shareWhatsApp}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3"
            style={{ backgroundColor: '#075e54', color: '#25d366', border: '1px solid #128c7e' }}>
            <span className="text-2xl">💬</span>
            WhatsApp
          </button>

          <button
            onClick={shareInstagram}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              color: '#fff',
              border: 'none',
            }}>
            <span className="text-2xl">📸</span>
            Instagram (copiar legenda)
          </button>

          <button
            onClick={shareFacebook}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3"
            style={{ backgroundColor: '#1877f2', color: '#fff', border: 'none' }}>
            <span className="text-2xl">👍</span>
            Facebook
          </button>

          <button
            onClick={copyText}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 border border-gray-800 text-gray-400">
            <span className="text-2xl">📋</span>
            Copiar texto
          </button>
        </div>

        {/* Preview do texto */}
        <div className="mt-6">
          <p className="text-gray-500 text-xs font-semibold mb-2">Preview do texto</p>
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