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
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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

      const { data: workout } = await supabase
        .from('workouts').select('*')
        .eq('user_id', user.id).eq('date', today).single();

      const { data: activities } = await supabase
        .from('manual_activities').select('calories_burned')
        .eq('user_id', user.id).eq('date', today);

      const { data: routes } = await supabase
        .from('activity_routes').select('*')
        .eq('user_id', user.id).eq('date', today)
        .order('created_at', { ascending: false }).limit(1);

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
        proteins: Math.round(completed.reduce((s, m) => s + m.proteins, 0)),
        carbs: Math.round(completed.reduce((s, m) => s + m.carbs, 0)),
        fat: Math.round(completed.reduce((s, m) => s + m.fat, 0)),
        activityDistance: latestRoute?.distance_km ?? 0,
        activityType: latestRoute?.activity_type ?? '',
        activityPhoto: latestRoute?.photo_url ?? null,
      });
      setLoading(false);
    }
    load();
  }, [router]);

  async function captureCard(): Promise<string | null> {
    if (!cardRef.current) return null;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function handleCapture() {
    setCapturing(true);
    const img = await captureCard();
    setCapturedImage(img);
    setCapturing(false);
  }

  async function downloadImage() {
    const img = capturedImage ?? await captureCard();
    if (!img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `snapfit-${selectedCard}-${today}.png`;
    a.click();
  }

  async function shareNative() {
    const img = capturedImage ?? await captureCard();
    if (!img) return;

    // Converter base64 para blob
    const res = await fetch(img);
    const blob = await res.blob();
    const file = new File([blob], `snapfit-${today}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'SnapFit — Minha evolução',
          text: getShareText(),
          files: [file],
        });
      } catch (e) {
        // usuário cancelou
      }
    } else {
      // Fallback: baixar a imagem
      await downloadImage();
    }
  }

  function getShareText() {
    if (!summary || !profile) return '';
    const goalLabel: Record<string, string> = {
      lose_weight: 'emagrecimento 🔥',
      gain_muscle: 'ganho de massa 💪',
      maintain: 'manutenção ⚖️',
    };

    if (selectedCard === 'daily') {
      return `⚡ Meu dia no SnapFit — ${todayFormatted}

✅ ${summary.mealsCompleted}/${summary.totalMeals} refeições
🍽️ ${summary.caloriesConsumed} kcal consumidas
💪 ${summary.caloriesBurned} kcal queimadas
🎯 Objetivo: ${goalLabel[profile.goal ?? 'maintain']}

snap-fit-sigma.vercel.app
#SnapFit #Nutrição #Saúde`;
    }

    if (selectedCard === 'workout') {
      return `💪 Treino concluído! — ${todayFormatted}

🏋️ ${summary.workoutTitle || 'Treino do dia'}
🔥 ${summary.workoutCalories} kcal queimadas

snap-fit-sigma.vercel.app
#SnapFit #Treino #Fitness`;
    }

    return `🏃 ${summary.activityType} concluída! — ${todayFormatted}

📍 ${summary.activityDistance.toFixed(2)}km percorridos
🔥 ${summary.caloriesBurned} kcal queimadas

snap-fit-sigma.vercel.app
#SnapFit #Fitness`;
  }

  async function shareWhatsApp() {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
          <p className="text-gray-400 text-sm mt-1">Mostre sua evolução!</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'daily', label: '📊 Resumo' },
            { key: 'workout', label: '💪 Treino' },
            { key: 'activity', label: '🏃 Atividade' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => { setSelectedCard(tab.key as any); setCapturedImage(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCard === tab.key
                  ? 'bg-cyan-400 text-black'
                  : 'border border-gray-800 text-gray-400'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card para capturar */}
        <div ref={cardRef}
          className="rounded-2xl overflow-hidden mb-4 border border-gray-800"
          style={{ background: 'linear-gradient(135deg, #000000, #0a0a1a, #000510)' }}>

          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span className="font-black text-lg" style={{
                background: 'linear-gradient(135deg, #00d4ff, #a855f7, #f97316)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>SnapFit</span>
            </div>
            <span className="text-gray-600 text-xs">{todayFormatted}</span>
          </div>

          {/* Foto da atividade se existir */}
          {selectedCard === 'activity' && summary?.activityPhoto && (
            <img src={summary.activityPhoto}
              className="w-full h-44 object-cover" alt="Atividade"
              crossOrigin="anonymous" />
          )}

          <div className="p-5">
            {selectedCard === 'daily' && summary && (
              <div>
                <p className="text-white font-bold mb-4">
                  Resumo de {profile?.full_name?.split(' ')[0]} 🎯
                </p>
                <div className="bg-gray-900/80 rounded-xl p-3 mb-3">
                  <div className="flex justify-between mb-2">
                    <p className="text-gray-400 text-xs">Calorias</p>
                    <p className="text-cyan-400 text-xs font-bold">
                      {summary.caloriesConsumed}/{summary.calorieGoal} kcal
                    </p>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                      style={{ width: `${Math.min((summary.caloriesConsumed / summary.calorieGoal) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-900/80 rounded-xl p-2 text-center">
                    <p className="text-orange-400 font-black">{summary.caloriesBurned}</p>
                    <p className="text-gray-600 text-xs">kcal 🔥</p>
                  </div>
                  <div className="bg-gray-900/80 rounded-xl p-2 text-center">
                    <p className="text-blue-400 font-black">{summary.proteins}g</p>
                    <p className="text-gray-600 text-xs">Proteínas</p>
                  </div>
                  <div className="bg-gray-900/80 rounded-xl p-2 text-center">
                    <p className="text-green-400 font-black">{summary.mealsCompleted}/{summary.totalMeals}</p>
                    <p className="text-gray-600 text-xs">Refeições ✅</p>
                  </div>
                </div>
                <p className="text-cyan-400 text-xs text-center">{goalLabel[profile?.goal ?? 'maintain']}</p>
              </div>
            )}

            {selectedCard === 'workout' && summary && (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">🏆</div>
                <p className="text-white font-bold text-lg">{summary.workoutTitle || 'Treino concluído!'}</p>
                <p className="text-gray-400 text-sm mb-4">60 minutos de dedicação</p>
                <div className="bg-gray-900/80 rounded-xl p-4">
                  <p className="text-orange-400 text-4xl font-black">{summary.workoutCalories}</p>
                  <p className="text-gray-400 text-sm">calorias queimadas 🔥</p>
                </div>
                <p className="text-cyan-400 text-xs mt-3">{goalLabel[profile?.goal ?? 'maintain']}</p>
              </div>
            )}

            {selectedCard === 'activity' && summary && (
              <div>
                <p className="text-white font-bold text-lg mb-4">
                  {summary.activityType || 'Atividade'} concluída! 🏃
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-900/80 rounded-xl p-3 text-center">
                    <p className="text-cyan-400 font-black text-xl">
                      {summary.activityDistance.toFixed(2)}km
                    </p>
                    <p className="text-gray-500 text-xs">Distância</p>
                  </div>
                  <div className="bg-gray-900/80 rounded-xl p-3 text-center">
                    <p className="text-orange-400 font-black text-xl">{summary.caloriesBurned}</p>
                    <p className="text-gray-500 text-xs">kcal 🔥</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center">
              <p className="text-gray-700 text-xs">snap-fit-sigma.vercel.app</p>
              <p className="text-cyan-400 text-xs font-bold">#SnapFit • Grupo NSG</p>
            </div>
          </div>
        </div>

        {/* Imagem capturada preview */}
        {capturedImage && (
          <div className="mb-4">
            <p className="text-gray-400 text-xs mb-2 text-center">✅ Imagem gerada — pronta para compartilhar!</p>
            <img src={capturedImage} className="w-full rounded-2xl" alt="Preview" />
          </div>
        )}

        {/* Botões */}
        <div className="space-y-3">
          {/* Gerar imagem */}
          <button onClick={handleCapture} disabled={capturing}
            className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {capturing ? (
              <>
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Gerando imagem...
              </>
            ) : '📸 Gerar imagem para compartilhar'}
          </button>

          {/* Compartilhar nativo (com imagem) */}
          <button onClick={shareNative}
            className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold flex items-center justify-center gap-2">
            <span className="text-xl">📤</span>
            Compartilhar imagem (Instagram / Stories)
          </button>

          {/* Baixar imagem */}
          <button onClick={downloadImage}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 border border-gray-800 text-gray-300">
            <span className="text-xl">⬇️</span>
            Baixar imagem
          </button>

          {/* WhatsApp texto */}
          <button onClick={shareWhatsApp}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3"
            style={{ backgroundColor: '#075e54', color: '#25d366', border: '1px solid #128c7e' }}>
            <span className="text-xl">💬</span> WhatsApp
          </button>

          {/* Copiar texto */}
          <button onClick={copyText}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 border border-gray-800 text-gray-400">
            <span className="text-xl">📋</span>
            {copying ? 'Copiado! ✅' : 'Copiar texto'}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          Dica: Clique em "Gerar imagem" primeiro, depois compartilhe nos Stories do Instagram!
        </p>
      </div>
      <BottomNav active="compartilhar" />
    </div>
  );
}