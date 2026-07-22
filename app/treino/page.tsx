'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import type { Profile } from '@/lib/types';

interface Exercise {
  id?: string;
  name: string;
  muscle_group: string;
  sets: number;
  reps: string;
  weight?: number;
  rest_seconds: number;
  instructions: string;
  tip?: string;
  completed: boolean;
  order_index: number;
}

interface Workout {
  id?: string;
  title: string;
  motivation: string;
  focus: string;
  duration_minutes: number;
  calories_estimate: number;
  calories_burned?: number;
  warmup: string;
  exercises: Exercise[];
  cooldown: string;
  coach_message: string;
  completed: boolean;
  feedback?: string;
  difficulty_rating?: number;
}

const muscleColors: Record<string, string> = {
  'Peito': 'text-red-400 bg-red-950',
  'Costas': 'text-blue-400 bg-blue-950',
  'Pernas': 'text-green-400 bg-green-950',
  'Ombros': 'text-yellow-400 bg-yellow-950',
  'Bíceps': 'text-purple-400 bg-purple-950',
  'Tríceps': 'text-orange-400 bg-orange-950',
  'Core': 'text-cyan-400 bg-cyan-950',
  'Glúteos': 'text-pink-400 bg-pink-950',
};

export default function TreinoPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [workoutType, setWorkoutType] = useState<'gym' | 'home' | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      // Buscar treino do dia
      const { data: existingWorkout } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*)')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingWorkout) {
        const exercises = existingWorkout.workout_exercises
          .sort((a: any, b: any) => a.order_index - b.order_index);
        setWorkoutType(existingWorkout.workout_type as 'gym' | 'home');
        setCaloriesBurned(existingWorkout.calories_burned ?? 0);
        setWorkout({
          id: existingWorkout.id,
          title: existingWorkout.title,
          motivation: '',
          focus: '',
          duration_minutes: existingWorkout.duration_minutes,
          calories_estimate: existingWorkout.calories_burned,
          calories_burned: existingWorkout.calories_burned,
          warmup: '',
          exercises: exercises.map((e: any) => ({
            id: e.id,
            name: e.name,
            muscle_group: e.muscle_group,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            rest_seconds: e.rest_seconds,
            instructions: e.instructions,
            tip: e.tip,
            completed: e.completed,
            order_index: e.order_index,
          })),
          cooldown: '',
          coach_message: '',
          completed: existingWorkout.completed,
          feedback: existingWorkout.feedback,
          difficulty_rating: existingWorkout.difficulty_rating,
        });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // Timer de descanso
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, restTimer]);

  async function generateWorkout(type: 'gym' | 'home') {
    if (!profile || !userId) return;
    setWorkoutType(type);
    setGenerating(true);

    try {
      const { data: prevWorkouts } = await supabase
        .from('workouts')
        .select('date, title, completed')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5);

      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile, workout_type: type, date: today,
          previous_workouts: prevWorkouts ?? [],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Salvar treino no banco
      const { data: savedWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          date: today,
          workout_type: type,
          title: data.title,
          duration_minutes: data.duration_minutes,
          calories_burned: data.calories_estimate,
          completed: false,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Salvar exercícios
      const exercisesToSave = data.exercises.map((e: any) => ({
        workout_id: savedWorkout.id,
        name: e.name,
        muscle_group: e.muscle_group,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight ?? null,
        rest_seconds: e.rest_seconds,
        instructions: e.instructions,
        tip: e.tip ?? null,
        completed: false,
        order_index: e.order_index,
      }));

      const { data: savedExercises } = await supabase
        .from('workout_exercises')
        .insert(exercisesToSave)
        .select();

      setCaloriesBurned(data.calories_estimate);
      setWorkout({
        id: savedWorkout.id,
        ...data,
        exercises: (savedExercises ?? []).map((e: any) => ({
          ...e, completed: false,
        })).sort((a: any, b: any) => a.order_index - b.order_index),
        completed: false,
      });
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleExercise(exercise: Exercise, index: number) {
    if (!exercise.id || !workout) return;
    const newCompleted = !exercise.completed;

    await supabase.from('workout_exercises')
      .update({ completed: newCompleted })
      .eq('id', exercise.id);

    // Salvar progressão de carga
    if (newCompleted && exercise.weight && userId) {
      await supabase.from('exercise_progress').insert({
        user_id: userId,
        exercise_name: exercise.name,
        weight: exercise.weight,
        reps: exercise.reps,
        sets: exercise.sets,
        date: today,
      });
    }

    setWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e, i) =>
          i === index ? { ...e, completed: newCompleted } : e
        ),
      };
    });

    // Iniciar timer de descanso
    if (newCompleted) {
      setRestTimer(exercise.rest_seconds);
      setTimerActive(true);
    }
  }

  async function completeWorkout() {
    if (!workout?.id || !userId) return;
    setShowFeedback(true);
  }

  async function saveFeedback() {
    if (!workout?.id || !userId) return;

    const completedCalories = workout.completed ? 0 : caloriesBurned;

    await supabase.from('workouts').update({
      completed: true,
      feedback,
      difficulty_rating: rating,
      calories_burned: completedCalories,
    }).eq('id', workout.id);

    // Atualizar calorias gastas — criar entrada em manual_activities
    await supabase.from('manual_activities').insert({
      user_id: userId,
      activity_type: workoutType === 'gym' ? 'Academia' : 'Treino em casa',
      duration_minutes: workout.duration_minutes,
      calories_burned: completedCalories,
      date: today,
      notes: workout.title,
    });

    setWorkout(prev => prev ? { ...prev, completed: true, feedback, difficulty_rating: rating } : prev);
    setShowFeedback(false);
  }

  const completedCount = workout?.exercises.filter(e => e.completed).length ?? 0;
  const totalExercises = workout?.exercises.length ?? 0;
  const workoutProgress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-4xl animate-pulse">💪</div>
    </div>
  );

  // Tela de escolha de tipo de treino
  if (!workout && !generating) return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-6 text-center">
          <div className="text-5xl mb-3">💪</div>
          <h1 className="text-2xl font-bold text-white">Treino de Hoje</h1>
          <p className="text-gray-400 text-sm mt-2">
            Olá, {profile?.full_name?.split(' ')[0]}! Onde você vai treinar hoje?
          </p>
        </div>

        <div className="space-y-4 mt-4">
          <button
            onClick={() => generateWorkout('gym')}
            className="w-full glass-card rounded-2xl p-6 border border-gray-800 text-left hover:border-cyan-800 transition-all">
            <div className="text-4xl mb-3">🏋️</div>
            <p className="text-white font-bold text-lg">Academia</p>
            <p className="text-gray-400 text-sm mt-1">
              Treino com máquinas, barras e halteres. Exercícios otimizados para seu objetivo com progressão de carga.
            </p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-cyan-950 text-cyan-400 px-2 py-1 rounded-full">60 min</span>
              <span className="text-xs bg-purple-950 text-purple-400 px-2 py-1 rounded-full">6-8 exercícios</span>
              <span className="text-xs bg-green-950 text-green-400 px-2 py-1 rounded-full">Progressão</span>
            </div>
          </button>

          <button
            onClick={() => generateWorkout('home')}
            className="w-full glass-card rounded-2xl p-6 border border-gray-800 text-left hover:border-orange-800 transition-all">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-white font-bold text-lg">Em casa</p>
            <p className="text-gray-400 text-sm mt-1">
              Treino funcional sem equipamentos. Usando o peso do próprio corpo para resultados efetivos.
            </p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-orange-950 text-orange-400 px-2 py-1 rounded-full">60 min</span>
              <span className="text-xs bg-yellow-950 text-yellow-400 px-2 py-1 rounded-full">Sem equipamento</span>
              <span className="text-xs bg-red-950 text-red-400 px-2 py-1 rounded-full">Funcional</span>
            </div>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-xs text-center mb-3">Ou registre uma atividade manual</p>
          <button
            onClick={() => router.push('/atividade')}
            className="w-full border border-gray-800 py-3 rounded-xl text-gray-400 text-sm">
            🏃 Registrar corrida / caminhada / bike
          </button>
        </div>
      </div>
      <BottomNav active="treino" />
    </div>
  );

  // Tela de geração
  if (generating) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-8">
      <div className="text-5xl animate-bounce">💪</div>
      <p className="text-white font-bold text-xl text-center">
        Criando seu treino personalizado...
      </p>
      <p className="text-gray-400 text-sm text-center">
        O personal trainer virtual está montando o treino perfeito para {profile?.full_name?.split(' ')[0]} baseado no seu objetivo e histórico
      </p>
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
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">
                {workoutType === 'gym' ? '🏋️ Academia' : '🏠 Em casa'}
              </p>
              <h1 className="text-xl font-bold text-white mt-1">{workout?.title}</h1>
            </div>
            <div className="text-right">
              <p className="text-cyan-400 font-bold">{caloriesBurned}</p>
              <p className="text-gray-600 text-xs">kcal estimado</p>
            </div>
          </div>

          {workout?.motivation && (
            <div className="mt-3 bg-cyan-950/30 border border-cyan-900 rounded-xl p-3">
              <p className="text-cyan-300 text-sm leading-relaxed">💬 {workout.motivation}</p>
            </div>
          )}
        </div>

        {/* Timer de descanso */}
        {timerActive && restTimer !== null && (
          <div className="bg-orange-950 border border-orange-800 rounded-2xl p-4 mb-4 text-center">
            <p className="text-orange-400 text-sm font-semibold mb-1">⏱️ Descanso</p>
            <p className="text-white text-4xl font-black">{restTimer}s</p>
            <button
              onClick={() => { setTimerActive(false); setRestTimer(null); }}
              className="text-orange-400 text-xs mt-2">
              Pular descanso
            </button>
          </div>
        )}

        {/* Progresso do treino */}
        <div className="glass-card rounded-2xl p-4 mb-5 border border-gray-800">
          <div className="flex justify-between mb-2">
            <p className="text-gray-400 text-sm">Progresso do treino</p>
            <p className="text-white font-bold text-sm">{completedCount}/{totalExercises}</p>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
              style={{ width: `${workoutProgress}%` }}
            />
          </div>
          <div className="flex gap-3 mt-3">
            <span className="text-xs text-gray-500">⏱️ {workout?.duration_minutes} min</span>
            <span className="text-xs text-gray-500">🔥 {workout?.focus}</span>
          </div>
        </div>

        {/* Aquecimento */}
        {workout?.warmup && (
          <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-xl p-4 mb-4">
            <p className="text-yellow-400 font-bold text-sm mb-1">🔥 Aquecimento — 5 min</p>
            <p className="text-gray-300 text-sm leading-relaxed">{workout.warmup}</p>
          </div>
        )}

        {/* Exercícios */}
        <div className="space-y-3 mb-4">
          {workout?.exercises.map((exercise, i) => {
            const isExpanded = expandedExercise === i;
            const muscleColor = muscleColors[exercise.muscle_group] ?? 'text-gray-400 bg-gray-900';

            return (
              <div key={i} className={`rounded-2xl border overflow-hidden transition-all ${
                exercise.completed
                  ? 'border-green-900 bg-green-950/10'
                  : 'border-gray-800 glass-card'
              }`}>
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandedExercise(isExpanded ? null : i)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        exercise.completed ? 'bg-green-950 text-green-400' : 'bg-gray-900 text-gray-400'
                      }`}>
                        {exercise.completed ? '✓' : i + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{exercise.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${muscleColor}`}>
                          {exercise.muscle_group}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-cyan-400 font-bold text-sm">
                        {exercise.sets}x{exercise.reps}
                      </p>
                      {exercise.weight && (
                        <p className="text-gray-500 text-xs">{exercise.weight}kg</p>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
                    <p className="text-gray-300 text-sm leading-relaxed">{exercise.instructions}</p>

                    {exercise.tip && (
                      <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-3">
                        <p className="text-blue-300 text-sm">⚡ {exercise.tip}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-900 rounded-xl p-3 text-center">
                        <p className="text-white font-bold">{exercise.sets}</p>
                        <p className="text-gray-500 text-xs">Séries</p>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-3 text-center">
                        <p className="text-white font-bold">{exercise.reps}</p>
                        <p className="text-gray-500 text-xs">Reps</p>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-3 text-center">
                        <p className="text-white font-bold">{exercise.rest_seconds}s</p>
                        <p className="text-gray-500 text-xs">Descanso</p>
                      </div>
                    </div>

                    {exercise.weight && (
                      <div className="bg-purple-950/20 border border-purple-900/50 rounded-xl p-3">
                        <p className="text-purple-300 text-sm font-semibold">
                          📈 Carga sugerida: {exercise.weight}kg
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          Se conseguir completar todas as séries com facilidade, aumente 2.5kg na próxima vez
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => toggleExercise(exercise, i)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                        exercise.completed
                          ? 'bg-gray-900 text-gray-400 border border-gray-800'
                          : 'bg-green-950 text-green-400 border border-green-800'
                      }`}>
                      {exercise.completed ? '↩️ Desmarcar exercício' : '✅ Exercício concluído!'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cooldown */}
        {workout?.cooldown && (
          <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-4 mb-4">
            <p className="text-blue-400 font-bold text-sm mb-1">🧘 Alongamento final — 5 min</p>
            <p className="text-gray-300 text-sm leading-relaxed">{workout.cooldown}</p>
          </div>
        )}

        {/* Coach message */}
        {workout?.coach_message && !workout.completed && (
          <div className="bg-cyan-950/30 border border-cyan-900 rounded-xl p-4 mb-4">
            <p className="text-cyan-300 text-sm leading-relaxed">🏆 {workout.coach_message}</p>
          </div>
        )}

        {/* Botão concluir */}
        {!workout?.completed ? (
          <button
            onClick={completeWorkout}
            disabled={completedCount === 0}
            className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold text-base disabled:opacity-40">
            🏆 Concluir treino de hoje!
          </button>
        ) : (
          <div className="bg-green-950 border border-green-800 rounded-2xl p-5 text-center">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-green-400 font-bold text-lg">Treino concluído!</p>
            <p className="text-gray-400 text-sm mt-1">
              {caloriesBurned} kcal queimadas — já adicionado à sua meta diária
            </p>
            {workout.difficulty_rating && (
              <p className="text-yellow-400 text-sm mt-2">
                {'⭐'.repeat(workout.difficulty_rating)} Dificuldade: {workout.difficulty_rating}/5
              </p>
            )}
            {workout.feedback && (
              <p className="text-gray-400 text-sm mt-2 italic">"{workout.feedback}"</p>
            )}
          </div>
        )}

        {/* Modal de feedback */}
        {showFeedback && (
          <div className="fixed inset-0 bg-black/90 flex items-end z-50 p-4">
            <div className="w-full max-w-sm mx-auto bg-gray-950 border border-gray-800 rounded-2xl p-6">
              <p className="text-white font-bold text-lg text-center mb-2">🏆 Treino finalizado!</p>
              <p className="text-gray-400 text-sm text-center mb-6">
                Incrível, {profile?.full_name?.split(' ')[0]}! Como foi o treino de hoje?
              </p>

              <p className="text-gray-400 text-sm mb-2">Dificuldade</p>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="flex-1 py-2 rounded-xl text-xl">
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>

              <p className="text-gray-400 text-sm mb-2">Como você se sentiu? (opcional)</p>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Ex: Senti os exercícios mais fáceis hoje, pronto para aumentar a carga!"
                rows={3}
                className="w-full mb-4"
                style={{ borderRadius: '12px', padding: '12px' }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedback(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 text-sm">
                  Cancelar
                </button>
                <button
                  onClick={saveFeedback}
                  className="flex-1 py-3 rounded-xl bg-green-950 border border-green-800 text-green-400 font-bold text-sm">
                  Salvar 🎉
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav active="treino" />
    </div>
  );
}