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

const PROTEINS = [
  { value: 'frango', label: '🍗 Frango' },
  { value: 'carne_bovina', label: '🥩 Carne bovina' },
  { value: 'peixe', label: '🐟 Peixe' },
  { value: 'ovo', label: '🥚 Ovo' },
  { value: 'atum', label: '🥫 Atum em lata' },
  { value: 'sardinha', label: '🐟 Sardinha' },
  { value: 'proteina_vegetal', label: '🌱 Proteína vegetal' },
  { value: 'feijao', label: '🫘 Feijão/Grão de bico' },
];

const CARBS = [
  { value: 'arroz', label: '🍚 Arroz' },
  { value: 'batata_doce', label: '🍠 Batata doce' },
  { value: 'mandioca', label: '🌿 Mandioca/Macaxeira' },
  { value: 'macarrao', label: '🍝 Macarrão' },
  { value: 'aveia', label: '🌾 Aveia' },
  { value: 'tapioca', label: '🫓 Tapioca' },
  { value: 'pao', label: '🍞 Pão' },
  { value: 'batata', label: '🥔 Batata inglesa' },
];

const VEGGIES = [
  { value: 'brocolis', label: '🥦 Brócolis' },
  { value: 'cenoura', label: '🥕 Cenoura' },
  { value: 'tomate', label: '🍅 Tomate' },
  { value: 'alface', label: '🥬 Alface/Folhas' },
  { value: 'abobrinha', label: '🥒 Abobrinha' },
  { value: 'chuchu', label: '🥗 Chuchu' },
  { value: 'couve', label: '🌿 Couve' },
  { value: 'pepino', label: '🥒 Pepino' },
];

const RESTRICTIONS = [
  { value: 'sem_gluten', label: '🌾 Sem glúten' },
  { value: 'sem_lactose', label: '🥛 Sem lactose' },
  { value: 'vegetariano', label: '🌱 Vegetariano' },
  { value: 'vegano', label: '🌿 Vegano' },
  { value: 'sem_restricao', label: '✅ Sem restrição' },
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
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [selectedCarbs, setSelectedCarbs] = useState<string[]>([]);
  const [selectedVeggies, setSelectedVeggies] = useState<string[]>([]);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    if (list.includes(value)) {
      setList(list.filter(i => i !== value));
    } else {
      setList([...list, value]);
    }
  }

  async function handleSave() {
    if (!name || !age || !weight || !height) {
      setError('Preencha todos os campos'); return;
    }
    if (selectedProteins.length === 0) {
      setError('Selecione pelo menos uma proteína'); return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const foodPreferences = {
        proteins: selectedProteins,
        carbs: selectedCarbs,
        veggies: selectedVeggies,
        restrictions: selectedRestrictions,
      };

      const { error } = await supabase.from('profiles').update({
        full_name: name,
        age: parseInt(age),
        gender,
        weight: parseFloat(weight),
        height: parseFloat(height),
        goal,
        food_preferences: foodPreferences,
        onboarding_completed: true,
      }).eq('id', user.id);

      if (error) throw error;
      router.push('/subscribe');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="max-w-sm mx-auto w-full p-5 flex-1 flex flex-col">

        {/* Header */}
        <div className="text-center pt-10 pb-6">
          <h1 className="text-3xl font-black gradient-text">Vamos te conhecer!</h1>
          <p className="text-gray-500 text-sm mt-1">Uma empresa do Grupo NSG</p>
          <p className="text-gray-400 text-sm mt-2">Personalize sua experiência</p>
          <div className="flex gap-2 justify-center mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 w-16 rounded-full transition-all ${
                step > i ? 'bg-cyan-400' : 'bg-gray-800'
              }`} />
            ))}
          </div>
        </div>

        {/* Step 1 — Dados pessoais */}
        {step === 1 && (
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Seu nome</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Nome completo"
                style={{ borderRadius: '12px', padding: '14px 16px' }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Idade</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="25"
                  style={{ borderRadius: '12px', padding: '14px 16px' }} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Sexo</label>
                <div className="flex gap-2">
                  {(['male', 'female'] as Gender[]).map(g => (
                    <button key={g} onClick={() => setGender(g)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                        gender === g
                          ? 'border-cyan-400 bg-cyan-950/30 text-cyan-400'
                          : 'border-gray-800 bg-gray-950 text-gray-500'
                      }`}>
                      {g === 'male' ? 'M' : 'F'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Peso (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="70"
                  style={{ borderRadius: '12px', padding: '14px 16px' }} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Altura (cm)</label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                  placeholder="175"
                  style={{ borderRadius: '12px', padding: '14px 16px' }} />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-3 block">Seu objetivo</label>
              <div className="space-y-2">
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value as Goal)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      goal === g.value
                        ? 'border-cyan-400 bg-cyan-950/20'
                        : 'border-gray-800 bg-gray-950'
                    }`}>
                    <p className="text-white font-semibold">{g.label}</p>
                    <p className="text-gray-400 text-sm">{g.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => {
              if (!name || !age || !weight || !height) {
                setError('Preencha todos os campos'); return;
              }
              setError('');
              setStep(2);
            }} className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold mt-4">
              Próximo →
            </button>
          </div>
        )}

        {/* Step 2 — Preferências alimentares */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto space-y-5">
            <div>
              <p className="text-white font-bold mb-1">🥩 Quais proteínas você consome?</p>
              <p className="text-gray-400 text-xs mb-3">Selecione as que você consegue comprar facilmente</p>
              <div className="grid grid-cols-2 gap-2">
                {PROTEINS.map(p => (
                  <button key={p.value}
                    onClick={() => toggleItem(selectedProteins, setSelectedProteins, p.value)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border text-left ${
                      selectedProteins.includes(p.value)
                        ? 'border-cyan-400 bg-cyan-950/30 text-cyan-400'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-1">🍚 Quais carboidratos você prefere?</p>
              <p className="text-gray-400 text-xs mb-3">Escolha os que fazem parte do seu dia a dia</p>
              <div className="grid grid-cols-2 gap-2">
                {CARBS.map(c => (
                  <button key={c.value}
                    onClick={() => toggleItem(selectedCarbs, setSelectedCarbs, c.value)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border text-left ${
                      selectedCarbs.includes(c.value)
                        ? 'border-yellow-400 bg-yellow-950/30 text-yellow-400'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-1">🥦 Quais vegetais você gosta?</p>
              <p className="text-gray-400 text-xs mb-3">Opcional — para personalizar ainda mais</p>
              <div className="grid grid-cols-2 gap-2">
                {VEGGIES.map(v => (
                  <button key={v.value}
                    onClick={() => toggleItem(selectedVeggies, setSelectedVeggies, v.value)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border text-left ${
                      selectedVeggies.includes(v.value)
                        ? 'border-green-400 bg-green-950/30 text-green-400'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-1">⚠️ Restrições alimentares</p>
              <div className="grid grid-cols-2 gap-2">
                {RESTRICTIONS.map(r => (
                  <button key={r.value}
                    onClick={() => toggleItem(selectedRestrictions, setSelectedRestrictions, r.value)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border text-left ${
                      selectedRestrictions.includes(r.value)
                        ? 'border-red-400 bg-red-950/30 text-red-400'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pb-6">
              <button onClick={() => setStep(1)}
                className="border border-gray-800 py-4 px-6 rounded-xl text-gray-400 font-bold">
                ← Voltar
              </button>
              <button onClick={() => {
                if (selectedProteins.length === 0) {
                  setError('Selecione pelo menos uma proteína'); return;
                }
                setError('');
                setStep(3);
              }} className="neon-btn flex-1 py-4 rounded-xl text-cyan-400 font-bold">
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirmação */}
        {step === 3 && (
          <div className="flex-1 space-y-4">
            <p className="text-white font-bold text-lg">Tudo pronto! 🎉</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Vamos criar seu plano alimentar personalizado com base nas suas preferências e objetivo!
            </p>

            <div className="space-y-3">
              <div className="glass-card rounded-xl p-4 border border-gray-800">
                <p className="text-gray-500 text-xs mb-1">Objetivo</p>
                <p className="text-white font-semibold">
                  {GOALS.find(g => g.value === goal)?.label}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 border border-gray-800">
                <p className="text-gray-500 text-xs mb-1">Suas proteínas</p>
                <p className="text-white font-semibold">
                  {selectedProteins.map(p =>
                    PROTEINS.find(pp => pp.value === p)?.label
                  ).join(', ')}
                </p>
              </div>
              {selectedCarbs.length > 0 && (
                <div className="glass-card rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-500 text-xs mb-1">Seus carboidratos</p>
                  <p className="text-white font-semibold">
                    {selectedCarbs.map(c =>
                      CARBS.find(cc => cc.value === c)?.label
                    ).join(', ')}
                  </p>
                </div>
              )}
              {selectedRestrictions.length > 0 && (
                <div className="glass-card rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-500 text-xs mb-1">Restrições</p>
                  <p className="text-white font-semibold">
                    {selectedRestrictions.map(r =>
                      RESTRICTIONS.find(rr => rr.value === r)?.label
                    ).join(', ')}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-950 border border-red-500 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pb-6">
              <button onClick={() => setStep(2)}
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