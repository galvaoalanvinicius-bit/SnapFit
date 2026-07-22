'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import type { Profile } from '@/lib/types';

const ACTIVITIES = [
  { type: 'Corrida', icon: '🏃', met: 9.8 },
  { type: 'Caminhada', icon: '🚶', met: 3.5 },
  { type: 'Bicicleta', icon: '🚴', met: 7.5 },
  { type: 'Natação', icon: '🏊', met: 8.0 },
  { type: 'Futebol', icon: '⚽', met: 7.0 },
  { type: 'Dança', icon: '💃', met: 5.0 },
  { type: 'Pular corda', icon: '🪢', met: 12.0 },
  { type: 'Yoga', icon: '🧘', met: 2.5 },
];

export default function AtividadePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [caloriesPreview, setCaloriesPreview] = useState(0);
  const [todayActivities, setTodayActivities] = useState<any[]>([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      const { data: activities } = await supabase
        .from('manual_activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false });

      setTodayActivities(activities ?? []);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (selectedActivity && duration && profile?.weight) {
      const activity = ACTIVITIES.find(a => a.type === selectedActivity);
      if (activity) {
        const calories = Math.round(
          activity.met * profile.weight * (parseInt(duration) / 60)
        );
        setCaloriesPreview(calories);
      }
    }
  }, [selectedActivity, duration, profile]);

  async function handleSave() {
    if (!selectedActivity || !duration || !userId || !profile) return;
    setLoading(true);

    try {
      const activity = ACTIVITIES.find(a => a.type === selectedActivity);
      const calories = Math.round(
        (activity?.met ?? 5) * (profile.weight ?? 70) * (parseInt(duration) / 60)
      );

      await supabase.from('manual_activities').insert({
        user_id: userId,
        activity_type: selectedActivity,
        duration_minutes: parseInt(duration),
        distance_km: distance ? parseFloat(distance) : null,
        calories_burned: calories,
        date: today,
        notes: notes || null,
      });

      setSuccess(true);
      setSelectedActivity('');
      setDuration('');
      setDistance('');
      setNotes('');
      setCaloriesPreview(0);

      const { data: activities } = await supabase
        .from('manual_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false });

      setTodayActivities(activities ?? []);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const totalCaloriesBurned = todayActivities.reduce(
    (sum, a) => sum + a.calories_burned, 0
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-6">
          <button onClick={() => router.back()} className="text-gray-500 text-sm mb-4 block">
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-white">Registrar Atividade 🏃</h1>
          <p className="text-gray-400 text-sm mt-1">
            Registre seus exercícios e ajuste sua meta calórica
          </p>
        </div>

        {success && (
          <div className="bg-green-950 border border-green-800 rounded-xl p-4 mb-4 text-center">
            <p className="text-green-400 font-bold">✅ Atividade registrada!</p>
            <p className="text-gray-400 text-sm">Calorias adicionadas ao seu diário</p>
          </div>
        )}

        {/* Total do dia */}
        {totalCaloriesBurned > 0 && (
          <div className="glass-card rounded-xl p-4 mb-5 border border-gray-800 flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Calorias queimadas hoje</p>
              <p className="text-3xl font-black text-orange-400">{totalCaloriesBurned}</p>
            </div>
            <div className="text-4xl">🔥</div>
          </div>
        )}

        {/* Selecionar atividade */}
        <p className="text-gray-400 text-sm mb-3 font-semibold">Tipo de atividade</p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {ACTIVITIES.map(activity => (
            <button
              key={activity.type}
              onClick={() => setSelectedActivity(activity.type)}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                selectedActivity === activity.type
                  ? 'border-2 border-cyan-400 bg-cyan-950/30'
                  : 'border border-gray-800 bg-gray-950'
              }`}>
              <span className="text-2xl">{activity.icon}</span>
              <span className="text-xs text-gray-400">{activity.type}</span>
            </button>
          ))}
        </div>

        {selectedActivity && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-400 text-sm mb-2">Duração (min)</p>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="30"
                  style={{ borderRadius: '12px', padding: '12px 16px' }}
                />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Distância (km)</p>
                <input
                  type="number"
                  value={distance}
                  onChange={e => setDistance(e.target.value)}
                  placeholder="5.0"
                  step="0.1"
                  style={{ borderRadius: '12px', padding: '12px 16px' }}
                />
              </div>
            </div>

            {caloriesPreview > 0 && (
              <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-4 text-center">
                <p className="text-orange-400 text-sm">Estimativa de calorias queimadas</p>
                <p className="text-white text-3xl font-black">{caloriesPreview} kcal</p>
              </div>
            )}

            <div>
              <p className="text-gray-400 text-sm mb-2">Observações (opcional)</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Corri no parque, ritmo leve..."
                rows={2}
                style={{ borderRadius: '12px', padding: '12px 16px' }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!duration || loading}
              className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold disabled:opacity-40">
              {loading ? 'Salvando...' : '✅ Registrar atividade'}
            </button>
          </div>
        )}

        {/* Atividades do dia */}
        {todayActivities.length > 0 && (
          <div className="mt-6">
            <p className="text-white font-semibold mb-3">Atividades de hoje</p>
            <div className="space-y-2">
              {todayActivities.map((activity, i) => (
                <div key={i} className="glass-card rounded-xl p-4 border border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium text-sm">
                      {ACTIVITIES.find(a => a.type === activity.activity_type)?.icon ?? '🏃'} {activity.activity_type}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {activity.duration_minutes} min
                      {activity.distance_km ? ` • ${activity.distance_km}km` : ''}
                    </p>
                  </div>
                  <p className="text-orange-400 font-bold">{activity.calories_burned} kcal</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav active="treino" />
    </div>
  );
}