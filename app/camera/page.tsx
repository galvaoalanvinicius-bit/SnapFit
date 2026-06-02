'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, uploadMealImage } from '@/lib/supabase';
import { BottomNav } from '../dashboard/page';

export default function CameraPage() {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    if (!image) return;
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();

      const imageUrl = await uploadMealImage(user.id, image);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, profile }),
      });

      if (!res.ok) throw new Error('Erro na análise');
      const analysis = await res.json();

      const { data: meal, error: mealError } = await supabase.from('meals').insert({
        user_id: user.id,
        image_url: imageUrl,
        calories: analysis.calories,
        proteins: analysis.proteins,
        carbs: analysis.carbs,
        fat: analysis.fat,
        healthy_score: analysis.healthy_score,
        ai_feedback: analysis.ai_feedback,
        tips: analysis.tips,
        recipes: analysis.recipes,
        meal_name: analysis.meal_name,
      }).select().single();

      if (mealError) throw mealError;
      router.push(`/result/${meal.id}`);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao analisar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-sm mx-auto p-5">
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-white">Analisar Refeição 📸</h1>
          <p className="text-gray-400 text-sm mt-1">Tire ou escolha uma foto do seu prato</p>
        </div>

        {preview ? (
          <div>
            <img src={preview} className="w-full h-72 object-cover rounded-2xl mb-4" alt="Preview" />
            <button onClick={() => { setImage(null); setPreview(null); }}
              className="text-gray-500 text-sm text-center w-full mb-4">
              Usar outra foto
            </button>

            {error && (
              <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm mb-4">{error}</div>
            )}

            <button onClick={handleAnalyze} disabled={loading}
              className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  Analisando com IA...
                </>
              ) : '🔍 Analisar com IA'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={fileRef} type="file" accept="image/*"
              className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <button onClick={() => cameraRef.current?.click()}
              className="neon-btn w-full rounded-2xl p-8 flex flex-col items-center gap-3">
              <span className="text-4xl">📷</span>
              <span className="text-cyan-400 font-bold text-lg">Abrir câmera</span>
              <span className="text-gray-500 text-sm">Tire uma foto agora</span>
            </button>

            <button onClick={() => fileRef.current?.click()}
              className="glass-card border border-gray-800 w-full rounded-2xl p-8 flex flex-col items-center gap-3">
              <span className="text-4xl">🖼️</span>
              <span className="text-white font-bold text-lg">Da galeria</span>
              <span className="text-gray-500 text-sm">Escolha uma foto existente</span>
            </button>
          </div>
        )}
      </div>
      <BottomNav active="camera" />
    </div>
  );
}