'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import type { Profile } from '@/lib/types';

interface DailyMeal {
  id?: string;
  meal_type: 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'janta';
  meal_name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fat: number;
  prep_time?: string;
  difficulty?: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  tip?: string;
  completed: boolean;
}

interface DailyPlan {
  greeting: string;
  total_calories: number;
  meals: DailyMeal[];
}

const mealLabels: Record<string, { label: string; icon: string; time: string }> = {
  cafe: { label: 'Café da manhã', icon: '☀️', time: '07:00' },
  lanche_manha: { label: 'Lanche da manhã', icon: '🍎', time: '10:00' },
  almoco: { label: 'Almoço', icon: '🌤️', time: '12:30' },
  lanche_tarde: { label: 'Lanche da tarde', icon: '🥜', time: '15:30' },
  janta: { label: 'Janta', icon: '🌙', time: '19:00' },
};

const MEAL_ORDER = ['cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'janta'];

export default function CardapioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

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

      await fetchMeals(user.id, p);
      setLoading(false);
    }
    load();
  }, [router]);

  async function fetchMeals(uid: string, p: Profile | null) {
    const { data: existingMeals } = await supabase
      .from('daily_meals')
      .select('*')
      .eq('user_id', uid)
      .eq('date', today)
      .order('created_at', { ascending: true });

    if (existingMeals && existingMeals.length >= 5) {
      // Ordenar na ordem correta
      const ordered = MEAL_ORDER.map(type =>
        existingMeals.find(m => m.meal_type === type)
      ).filter(Boolean) as any[];

      const consumed = ordered
        .filter(m => m.completed)
        .reduce((sum: number, m: any) => sum + m.calories, 0);
      setCaloriesConsumed(consumed);

      setPlan({
        greeting: `Aqui está seu cardápio de hoje! 💪`,
        total_calories: ordered.reduce((sum: number, m: any) => sum + m.calories, 0),
        meals: ordered.map((m: any) => ({
          id: m.id,
          meal_type: m.meal_type,
          meal_name: m.meal_name,
          calories: m.calories,
          proteins: m.proteins,
          carbs: m.carbs,
          fat: m.fat,
          ingredients: m.ingredients ?? [],
          steps: m.steps ?? [],
          tip: m.tip,
          completed: m.completed,
        })),
      });
    } else {
      // Deletar qualquer refeição parcial do dia e gerar novo
      if (existingMeals && existingMeals.length > 0) {
        await supabase.from('daily_meals').delete()
          .eq('user_id', uid).eq('date', today);
      }
      await generatePlan(uid, p);
    }
  }

  async function generatePlan(uid: string, p: Profile | null) {
    if (!p) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/daily-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, date: today }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Inserir as 5 refeições uma por uma
      const savedMeals: any[] = [];
      for (const meal of data.meals) {
        const { data: saved, error } = await supabase
          .from('daily_meals')
          .insert({
            user_id: uid,
            date: today,
            meal_type: meal.meal_type,
            meal_name: meal.meal_name,
            calories: meal.calories,
            proteins: meal.proteins,
            carbs: meal.carbs,
            fat: meal.fat,
            ingredients: meal.ingredients,
            steps: meal.steps,
            tip: meal.tip ?? null,
            completed: false,
          })
          .select()
          .single();

        if (!error && saved) savedMeals.push(saved);
      }

      // Ordenar na ordem correta
      const ordered = MEAL_ORDER.map(type =>
        savedMeals.find((m: any) => m.meal_type === type)
      ).filter(Boolean) as any[];

      setPlan({
        greeting: data.greeting,
        total_calories: data.total_calories,
        meals: ordered.map((m: any) => ({ ...m, completed: false })),
      });
      setCaloriesConsumed(0);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleCompleted(meal: DailyMeal) {
    if (!userId || !meal.id) return;
    const newCompleted = !meal.completed;

    await supabase.from('daily_meals')
      .update({ completed: newCompleted })
      .eq('id', meal.id);

    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        meals: prev.meals.map(m =>
          m.id === meal.id ? { ...m, completed: newCompleted } : m
        ),
      };
    });

    setCaloriesConsumed(prev =>
      newCompleted ? prev + meal.calories : prev - meal.calories
    );
  }

  async function regeneratePlan() {
    if (!userId || !profile) return;
    if (!confirm('Gerar um novo cardápio para hoje?')) return;
    await supabase.from('daily_meals')
      .delete().eq('user_id', userId).eq('date', today);
    setPlan(null);
    setCaloriesConsumed(0);
    await generatePlan(userId, profile);
  }

  const progress = Math.min((caloriesConsumed / calorieGoal) * 100, 100);
  const remaining = calorieGoal - caloriesConsumed;

  if (loading || generating) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="text-5xl animate-bounce">🍽️</div>
      <p className="text-white font-bold text-lg">
        {generating ? 'Criando seu cardápio personalizado...' : 'Carregando...'}
      </p>
      {generating && (
        <p className="text-gray-400 text-sm text-center px-8">
          A IA está criando 5 receitas únicas baseadas nas suas preferências e objetivo
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">

        {/* Header */}
        <div className="pt-8 pb-4">
          <p className="text-gray-500 text-sm capitalize">{todayFormatted}</p>
          <h1 className="text-2xl font-bold text-white mt-1">Meu Cardápio 🍽️</h1>
          {plan?.greeting && (
            <div className="mt-3 bg-cyan-950/30 border border-cyan-900 rounded-xl p-3">
              <p className="text-cyan-300 text-sm leading-relaxed">💬 {plan.greeting}</p>
            </div>
          )}
        </div>

        {/* Progresso calórico */}
        <div className="glass-card rounded-2xl p-5 mb-5 border border-gray-800">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-gray-400 text-sm">Calorias consumidas</p>
              <p className="text-3xl font-black text-cyan-400">{caloriesConsumed}</p>
              <p className="text-gray-500 text-xs">de {calorieGoal} kcal</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Restante</p>
              <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(remaining)}
              </p>
              <p className="text-gray-500 text-xs">{remaining >= 0 ? 'kcal livres' : 'acima'}</p>
            </div>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                progress > 100
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-cyan-400 to-purple-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-gray-600 text-xs">{Math.round(progress)}% da meta</p>
            <p className="text-gray-600 text-xs">
              {plan?.meals.filter(m => m.completed).length}/{plan?.meals.length} refeições ✓
            </p>
          </div>
        </div>

        {/* Macros do dia */}
        {plan && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              {
                label: 'Proteínas',
                value: Math.round(plan.meals.filter(m => m.completed).reduce((s, m) => s + m.proteins, 0)),
                total: Math.round(plan.meals.reduce((s, m) => s + m.proteins, 0)),
                color: 'text-blue-400',
              },
              {
                label: 'Carboidratos',
                value: Math.round(plan.meals.filter(m => m.completed).reduce((s, m) => s + m.carbs, 0)),
                total: Math.round(plan.meals.reduce((s, m) => s + m.carbs, 0)),
                color: 'text-yellow-400',
              },
              {
                label: 'Gorduras',
                value: Math.round(plan.meals.filter(m => m.completed).reduce((s, m) => s + m.fat, 0)),
                total: Math.round(plan.meals.reduce((s, m) => s + m.fat, 0)),
                color: 'text-red-400',
              },
            ].map(macro => (
              <div key={macro.label} className="glass-card rounded-xl p-3 text-center border border-gray-800">
                <p className={`font-bold text-sm ${macro.color}`}>
                  {macro.value}<span className="text-xs text-gray-600">/{macro.total}g</span>
                </p>
                <p className="text-gray-600 text-xs mt-1">{macro.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Refeições */}
        <div className="space-y-3 mb-5">
          {plan?.meals.map((meal, i) => {
            const meta = mealLabels[meal.meal_type] ?? { label: meal.meal_type, icon: '🍽️', time: '' };
            const isExpanded = expandedMeal === meal.meal_type;

            return (
              <div key={meal.meal_type} className={`rounded-2xl border overflow-hidden transition-all ${
                meal.completed
                  ? 'border-green-900 bg-green-950/10'
                  : 'border-gray-800 glass-card'
              }`}>
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandedMeal(isExpanded ? null : meal.meal_type)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                        meal.completed ? 'bg-green-950' : 'bg-gray-900'
                      }`}>
                        {meal.completed ? '✅' : meta.icon}
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">{meta.label} • {meta.time}</p>
                        <p className="text-white font-semibold text-sm">{meal.meal_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-cyan-400 font-bold">{meal.calories}</p>
                      <p className="text-gray-600 text-xs">kcal</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs text-blue-400">P: {meal.proteins}g</span>
                    <span className="text-xs text-yellow-400">C: {meal.carbs}g</span>
                    <span className="text-xs text-red-400">G: {meal.fat}g</span>
                    <span className="text-gray-600 text-xs ml-auto">
                      {isExpanded ? '▲ fechar' : '▼ ver receita'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
                    {meal.description && (
                      <p className="text-gray-300 text-sm leading-relaxed italic">
                        "{meal.description}"
                      </p>
                    )}

                    <div>
                      <p className="text-white font-bold text-sm mb-2">🛒 Ingredientes</p>
                      <div className="space-y-1.5">
                        {meal.ingredients.map((ing, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5" />
                            <p className="text-gray-300 text-sm">{ing}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-white font-bold text-sm mb-2">👨‍🍳 Modo de preparo</p>
                      <div className="space-y-2">
                        {meal.steps.map((step, j) => (
                          <div key={j} className="flex gap-3">
                            <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-cyan-400 text-xs font-bold">{j + 1}</span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {meal.tip && (
                      <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-3">
                        <p className="text-yellow-300 text-sm">💡 {meal.tip}</p>
                      </div>
                    )}

                    <button
                      onClick={() => toggleCompleted(meal)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                        meal.completed
                          ? 'bg-gray-900 text-gray-400 border border-gray-800'
                          : 'bg-green-950 text-green-400 border border-green-800'
                      }`}>
                      {meal.completed
                        ? '↩️ Desmarcar refeição'
                        : '✅ Marcar como feito — adicionar ao diário'
                      }
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={regeneratePlan}
          className="w-full py-3 rounded-xl text-gray-400 text-sm border border-gray-800 mb-3">
          🔄 Gerar novo cardápio para hoje
        </button>

        <button onClick={() => router.push('/chat')}
          className="neon-btn w-full py-3 rounded-xl text-cyan-400 font-bold text-sm">
          🤖 Pedir ajuste ao NutriBot
        </button>
      </div>
      <BottomNav active="cardapio" />
    </div>
  );
}