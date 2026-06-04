'use client';
import { useEffect, useState } from 'react';
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

  const todayCalories = meals
    .filter(m => m.created_at.startsWith(new Date().toISOString().split('T')[0]))
    .reduce((sum, m) => sum + (m.calories ?? 0), 0);

  const calorieGoal = 2000;
  const progress = Math.min((todayCalories / calorieGoal) * 100, 100);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      const today = new Date().toISOString().split('T')[0];
      const { data: m } = await supabase.from('meals').select('*')
        .eq('user_id', user.id).gte('created_at', today)
        .order('created_at', { ascending: false });
      setMeals(m ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

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
        <div className="pt-8 pb-6">
          <p className="text-gray-500 text-sm">Bem-vindo de volta</p>
          <h1 className="text-2xl font-bold text-white mt-1">
            {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <span className="text-xs text-cyan-400 mt-1 block">{goalLabel[profile?.goal ?? 'maintain']}</span>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-5 neon-border-blue">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-gray-400 text-sm">Calorias hoje</p>
              <p className="text-4xl font-black text-cyan-400 mt-1">{todayCalories}</p>
              <p className="text-gray-500 text-xs">de {calorieGoal} kcal</p>
            </div>
            <div className="text-3xl">🔥</div>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Link href="/camera"
          className="neon-btn-orange block rounded-2xl p-6 text-center mb-5">
          <div className="text-4xl mb-2">📸</div>
          <p className="text-orange-400 font-bold text-lg">Analisar refeição</p>
          <p className="text-gray-400 text-sm mt-1">Tire uma foto do seu prato</p>
        </Link>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">Refeições hoje</h2>
          <Link href="/history" className="text-cyan-400 text-sm">Ver tudo →</Link>
        </div>

        {meals.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-400 text-sm">Nenhuma refeição hoje ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.slice(0, 3).map(meal => (
              <Link key={meal.id} href={`/result/${meal.id}`}
                className="glass-card rounded-xl p-4 flex items-center gap-3 block">
                {meal.image_url
                  ? <img src={meal.image_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
                  : <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-2xl">🍽️</div>
                }
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{meal.meal_name ?? 'Refeição'}</p>
                  <p className="text-cyan-400 text-sm">{meal.calories} kcal</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: meal.healthy_score && meal.healthy_score >= 7 ? '#22c55e' : meal.healthy_score && meal.healthy_score >= 5 ? '#f59e0b' : '#ef4444' }}>
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