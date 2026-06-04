'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Meal } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function scoreColor(s: number | null) {
  if (!s) return '#666';
  if (s >= 8) return '#22c55e';
  if (s >= 5) return '#f59e0b';
  return '#ef4444';
}

function formatDate(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return `Hoje, ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `Ontem, ${format(d, 'HH:mm')}`;
  return format(d, "dd 'de' MMMM", { locale: ptBR });
}

export default function HistoryPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('meals').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      setMeals(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function deleteMeal(id: string) {
    if (!confirm('Excluir esta refeição?')) return;
    await supabase.from('meals').delete().eq('id', id);
    setMeals(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-white">Histórico 📋</h1>
          <p className="text-gray-400 text-sm mt-1">{meals.length} refeições registradas</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="glass-card rounded-xl p-4 flex gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-gray-900" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-900 rounded w-3/4" />
                  <div className="h-3 bg-gray-900 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-white font-semibold mb-2">Nenhuma refeição ainda</p>
            <p className="text-gray-400 text-sm">Tire uma foto do seu prato para começar!</p>
            <Link href="/camera" className="neon-btn-orange inline-block mt-4 px-6 py-3 rounded-xl text-orange-400 font-bold text-sm">
              Analisar agora
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map(meal => (
              <div key={meal.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                <Link href={`/result/${meal.id}`} className="flex items-center gap-3 flex-1">
                  {meal.image_url
                    ? <img src={meal.image_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
                    : <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-2xl">🍽️</div>
                  }
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{meal.meal_name ?? 'Refeição'}</p>
                    <p className="text-cyan-400 text-sm">{meal.calories} kcal</p>
                    <p className="text-gray-600 text-xs mt-1">{formatDate(meal.created_at)}</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold" style={{ color: scoreColor(meal.healthy_score) }}>
                      {meal.healthy_score}
                    </p>
                    <p className="text-gray-600 text-xs">/10</p>
                  </div>
                </Link>
                <button onClick={() => deleteMeal(meal.id)} className="text-gray-700 hover:text-red-500 transition-colors text-lg">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="history" />
    </div>
  );
}