'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Gender, Goal } from '@/lib/types';

const GOALS = [
  { value: 'lose_weight', label: '🔥 Emagrecer', desc: 'Reduzir gordura corporal' },
  { value: 'gain_muscle', label: '💪 Ganhar massa', desc: 'Hipertrofia muscular' },
  { value: 'maintain', label: '⚖️ Manter peso', desc: 'Equilíbrio e saúde' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<Goal>('lose_weight');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name || !age || !weight || !height) { setError('Preencha todos os campos'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('profiles').update({
        full_name: name, age: parseInt(age), gender,
        weight: parseFloat(weight), height: parseFloat(height),
        goal, onboarding_completed: true,
      }).eq('id', user.id);
      if (error) throw error;
      router.push('/subscribe');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black p-6 flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-black gradient-text">Vamos te conhecer!</h1>
          <p className="text-gray-500 text-sm mt-1">Uma empresa do Grupo NSG</p>
          <p className="text-gray-400 text-sm mt-3">Personalize sua experiência</p>
          <div className="flex gap-2 justify-center mt-4">
            {[1,2].map(s => (
              <div key={s} className={`h-1 w-16 rounded-full transition-all ${step >= s ? 'bg-cyan-400' : 'bg-gray-800'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4 flex-1">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Nome completo</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Idade</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Sexo</label>
                <div className="flex gap-2">
                  {(['male','female'] as Gender[]).map(g => (
                    <button key={g} onClick={() => setGender(g)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${gender === g ? 'neon-border-blue text-cyan-400' : 'border border-gray-800 text-gray-500'}`}>
                      {g === 'male' ? 'M' : 'F'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Peso (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Altura (cm)</label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" />
              </div>
            </div>
            <button onClick={() => setStep(2)}
              className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold mt-4">
              Próximo →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 flex-1">
            <p className="text-white font-semibold text-lg mb-4">Qual é seu objetivo?</p>
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setGoal(g.value as Goal)}
                className={`w-full p-4 rounded-xl text-left transition-all ${goal === g.value ? 'neon-border-blue bg-cyan-950/20' : 'border border-gray-800 bg-gray-950'}`}>
                <div className="text-lg font-semibold text-white">{g.label}</div>
                <div className="text-gray-400 text-sm mt-1">{g.desc}</div>
              </button>
            ))}
            {error && <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)}
                className="border border-gray-800 py-4 px-6 rounded-xl text-gray-400 font-bold">
                ← Voltar
              </button>
              <button onClick={handleSave} disabled={loading}
                className="neon-btn-orange flex-1 py-4 rounded-xl text-orange-400 font-bold disabled:opacity-50">
                {loading ? 'Salvando...' : 'Começar! 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}