'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Profile, Meal } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [dailyMealsCalories, setDailyMealsCalories] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const cameraCalories = meals
    .filter(m => m.created_at.startsWith(today))
    .reduce((sum, m) => sum + (m.calories ?? 0), 0);

  const todayCalories = cameraCalories + dailyMealsCalories;
  const netCalories = todayCalories - caloriesBurned;
  const progress = Math.min((todayCalories / calorieGoal) * 100, 100);

  const fetchCalories = useCallback(async (userId: string) => {
    // Calorias do cardápio diário (refeições marcadas como feitas)
    const { data: dailyMeals } = await supabase
      .from('daily_meals')
      .select('calories')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('completed', true);

    const dailyCals = (dailyMeals ?? []).reduce(
      (sum, m) => sum + (m.calories ?? 0), 0
    );
    setDailyMealsCalories(dailyCals);

    // Calorias queimadas em treinos
    const { data: workouts } = await supabase
      .from('workouts')
      .select('calories_burned')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('completed', true);

    // Calorias queimadas em atividades manuais
    const { data: activities } = await supabase
      .from('manual_activities')
      .select('calories_burned')
      .eq('user_id', userId)
      .eq('date', today);

    const workoutCals = (workouts ?? []).reduce(
      (sum, w) => sum + (w.calories_burned ?? 0), 0
    );
    const activityCals = (activities ?? []).reduce(
      (sum, a) => sum + (a.calories_burned ?? 0), 0
    );
    setCaloriesBurned(workoutCals + activityCals);
  }, [today]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      if (p?.weight && p?.height && p?.age) {
        const bmr = p.gender === 'male'
          ? 88.36 + 13.4 * p.weight + 4.8 * p.height - 5.7 * p.age
          : 447.6 + 9.25 * p.weight + 3.1 * p.height - 4.3 * p.age;
        const tdee = Math.round(bmr * 1.55);
        const goal = p.goal === 'lose_weight' ? tdee - 500
          : p.goal === 'gain_muscle' ? tdee + 300 : tdee;
        setCalorieGoal(goal);
      }

      const { data: m } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      setMeals(m ?? []);

      await fetchCalories(user.id);
      setLoading(false);
    }
    load();
  }, [router, fetchCalories]);

  // Atualizar calorias em tempo real com subscription
  useEffect(() => {
    const channel = supabase
      .channel('daily_meals_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_meals',
      }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await fetchCalories(user.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCalories]);

  const goalLabel: Record<string, string> = {
    lose_weight: '🔥 Emagrecimento',
    gain_muscle: '💪 Ganho de massa',
    maintain: '⚖️ Manutenção',
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">⚡</div>
        <p className="text-gray-400">Carregando...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">

        {/* Header */}
        <div className="pt-8 pb-6 flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm">Bem-vindo de volta</p>
            <h1 className="text-2xl font-bold text-white mt-1">
              {profile?.full_name?.split(' ')[0]} 👋
            </h1>
            <span className="text-xs text-cyan-400 mt-1 block">
              {goalLabel[profile?.goal ?? 'maintain']}
            </span>
          </div>
          <button
            onClick={() => router.push('/compartilhar')}
            className="border border-gray-800 rounded-xl px-3 py-2 text-gray-400 text-xs">
            📱 Compartilhar
          </button>
        </div>

        {/* Card de calorias */}
        <div className="glass-card rounded-2xl p-5 mb-4 neon-border-blue">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-gray-400 text-sm">Calorias hoje</p>
              <p className="text-4xl font-black text-cyan-400 mt-1">{todayCalories}</p>
              <p className="text-gray-500 text-xs">de {calorieGoal} kcal</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Queimadas</p>
              <p className="text-2xl font-bold text-orange-400">{caloriesBurned}</p>
              <p className="text-gray-500 text-xs">kcal 🔥</p>
            </div>
          </div>

          <div className="h-3 bg-gray-900 rounded-full overflow-hidden mb-2">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-1">
            <p className="text-gray-600 text-xs">
              {Math.round(progress)}% da meta
            </p>
            {caloriesBurned > 0 && (
              <p className="text-orange-400 text-xs">
                🔥 -{caloriesBurned} queimadas • líquido: {netCalories}
              </p>
            )}
          </div>

          {/* Mini breakdown */}
          {(cameraCalories > 0 || dailyMealsCalories > 0) && (
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-800">
              {cameraCalories > 0 && (
                <p className="text-gray-500 text-xs">📸 Analisadas: {cameraCalories} kcal</p>
              )}
              {dailyMealsCalories > 0 && (
                <p className="text-gray-500 text-xs">🍽️ Cardápio: {dailyMealsCalories} kcal</p>
              )}
            </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/cardapio"
            className="glass-card rounded-xl p-4 border border-gray-800 text-center">
            <p className="text-2xl mb-1">🍽️</p>
            <p className="text-white font-semibold text-sm">Cardápio do dia</p>
            <p className="text-gray-500 text-xs mt-1">Refeições personalizadas</p>
          </Link>
          <Link href="/treino"
            className="glass-card rounded-xl p-4 border border-gray-800 text-center">
            <p className="text-2xl mb-1">💪</p>
            <p className="text-white font-semibold text-sm">Treino de hoje</p>
            <p className="text-gray-500 text-xs mt-1">Academia ou em casa</p>
          </Link>
        </div>

        {/* Botão analisar */}
        <Link href="/camera"
          className="neon-btn-orange block rounded-2xl p-6 text-center mb-5">
          <div className="text-4xl mb-2">📸</div>
          <p className="text-orange-400 font-bold text-lg">Analisar refeição</p>
          <p className="text-gray-400 text-sm mt-1">Tire uma foto do seu prato</p>
        </Link>

        {/* Refeições analisadas */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">Analisadas hoje</h2>
          <Link href="/history" className="text-cyan-400 text-sm">Ver tudo →</Link>
        </div>

        {meals.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center border border-gray-800">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-400 text-sm">Nenhuma refeição analisada hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.slice(0, 3).map(meal => (
              <Link key={meal.id} href={`/result/${meal.id}`}
                className="glass-card rounded-xl p-4 flex items-center gap-3 block border border-gray-800">
                {meal.image_url
                  ? <img src={meal.image_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
                  : <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-2xl">🍽️</div>
                }
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{meal.meal_name ?? 'Refeição'}</p>
                  <p className="text-cyan-400 text-sm">{meal.calories} kcal</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{
                    color: meal.healthy_score && meal.healthy_score >= 7 ? '#22c55e'
                      : meal.healthy_score && meal.healthy_score >= 5 ? '#f59e0b'
                      : '#ef4444'
                  }}>
                    {meal.healthy_score}
                  </p>
                  <p className="text-gray-600 text-xs">/10</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="home" />
    </div>
  );
}