'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Meal, Recipe } from '@/lib/types';

function scoreColor(s: number | null) {
  if (!s) return '#666';
  if (s >= 8) return '#22c55e';
  if (s >= 5) return '#f59e0b';
  return '#ef4444';
}

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('meals').select('*').eq('id', id).single()
      .then(({ data }) => { setMeal(data); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse mb-3">🔍</div>
        <p className="text-gray-400">Carregando resultado...</p>
      </div>
    </div>
  );

  if (!meal) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 mb-4">Refeição não encontrada</p>
        <Link href="/dashboard" className="text-cyan-400">← Voltar</Link>
      </div>
    </div>
  );

  const macros = [
    { label: 'Proteínas', value: meal.proteins, color: '#3b82f6', max: 60 },
    { label: 'Carboidratos', value: meal.carbs, color: '#f59e0b', max: 300 },
    { label: 'Gorduras', value: meal.fat, color: '#ef4444', max: 80 },
  ];

  return (
    <div className="min-h-screen bg-black pb-10">
      <div className="max-w-sm mx-auto p-5">
        <button onClick={() => router.back()} className="text-gray-500 text-sm pt-8 pb-4 block">← Voltar</button>

        {meal.image_url && (
          <img src={meal.image_url} className="w-full h-56 object-cover rounded-2xl mb-5" alt="" />
        )}

        <h1 className="text-2xl font-bold text-white mb-5">{meal.meal_name ?? 'Refeição analisada'}</h1>

        {/* Health Score */}
        <div className="glass-card rounded-2xl p-5 mb-4 text-center"
          style={{ borderColor: scoreColor(meal.healthy_score), borderWidth: 2, boxShadow: `0 0 20px ${scoreColor(meal.healthy_score)}44` }}>
          <p className="text-gray-400 text-sm mb-2">Nota de saúde</p>
          <p className="text-6xl font-black mb-2" style={{ color: scoreColor(meal.healthy_score) }}>
            {meal.healthy_score}
          </p>
          <p style={{ color: scoreColor(meal.healthy_score) }} className="text-sm font-semibold">
            {meal.healthy_score && meal.healthy_score >= 8 ? 'Excelente! 🏆' : meal.healthy_score && meal.healthy_score >= 6 ? 'Bom! 👍' : meal.healthy_score && meal.healthy_score >= 4 ? 'Regular ⚠️' : 'Precisa melhorar ❌'}
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-2 w-5 rounded-sm"
                style={{ backgroundColor: i < (meal.healthy_score ?? 0) ? scoreColor(meal.healthy_score) : '#1a1a2e' }} />
            ))}
          </div>
        </div>

        {/* Calories */}
        <div className="glass-card neon-border-blue rounded-2xl p-5 mb-4 flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm">Calorias totais</p>
            <p className="text-4xl font-black text-cyan-400">{meal.calories}</p>
            <p className="text-gray-500 text-xs">kcal</p>
          </div>
          <div className="text-4xl">🔥</div>
        </div>

        {/* Macros */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <p className="text-white font-semibold mb-4">Macronutrientes</p>
          <div className="space-y-4">
            {macros.map(m => (
              <div key={m.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">{m.label}</span>
                  <span className="text-sm font-semibold" style={{ color: m.color }}>{m.value}g</span>
                </div>
                <div className="h-2 bg-gray-900 rounded-full">
                  <div className="h-2 rounded-full transition-all" style={{
                    width: `${Math.min(((m.value ?? 0) / m.max) * 100, 100)}%`,
                    backgroundColor: m.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Feedback */}
        {meal.ai_feedback && (
          <div className="glass-card rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold mb-3">🤖 Análise da IA</p>
            <p className="text-gray-300 text-sm leading-relaxed">{meal.ai_feedback}</p>
          </div>
        )}

        {/* Tips */}
        {meal.tips && meal.tips.length > 0 && (
          <div className="glass-card rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold mb-3">💡 Dicas personalizadas</p>
            <div className="space-y-2">
              {meal.tips.map((tip, i) => (
                <p key={i} className="text-gray-300 text-sm">• {tip}</p>
              ))}
            </div>
          </div>
        )}

        {/* Recipes */}
        {meal.recipes && (meal.recipes as Recipe[]).length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <p className="text-white font-semibold mb-4">🍽️ Receitas recomendadas</p>
            <div className="space-y-4">
              {(meal.recipes as Recipe[]).map((r, i) => (
                <div key={i} className={i < (meal.recipes as Recipe[]).length - 1 ? 'pb-4 border-b border-gray-800' : ''}>
                  <p className="text-white font-medium">{r.name}</p>
                  <p className="text-gray-400 text-sm mt-1">{r.description}</p>
                  <p className="text-cyan-400 text-xs mt-2">{r.calories} kcal · {r.prep_time}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}