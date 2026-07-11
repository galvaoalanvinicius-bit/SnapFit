'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Recipe {
  emoji: string;
  name: string;
  time: string;
  difficulty: string;
  calories: number;
  proteins: number;
  carbs: number;
  fat: number;
  desc: string;
  ingredients: string[];
  steps: string[];
  tip: string;
}

interface MealPlan {
  cafe: Recipe[];
  almoco: Recipe[];
  janta: Recipe[];
}

const RECIPES: Record<string, MealPlan> = {
  lose_weight: {
    cafe: [
      {
        emoji: '🍳',
        name: 'Omelete de claras com espinafre',
        time: '10 min',
        difficulty: 'Fácil',
        calories: 160,
        proteins: 24,
        carbs: 4,
        fat: 5,
        desc: 'Alta em proteína e baixíssima em calorias. Vai te manter saciado por horas sem comprometer seu déficit calórico.',
        ingredients: [
          '4 claras de ovo',
          '1 ovo inteiro',
          '1 xícara de espinafre fresco',
          '2 tomates cereja',
          'Sal, pimenta e azeite a gosto',
        ],
        steps: [
          'Bata as claras com o ovo inteiro em um bowl. Tempere com sal e pimenta.',
          'Aqueça uma frigideira antiaderente com um fio de azeite em fogo médio.',
          'Despeje a mistura de ovos e deixe cozinhar por 2 minutos até firmar nas bordas.',
          'Adicione o espinafre e os tomates cereja na metade da omelete.',
          'Dobre a omelete ao meio, tampe e deixe mais 1 minuto. Sirva imediatamente.',
        ],
        tip: '💡 Dica: Adicione ricota por cima para aumentar a proteína sem adicionar muita caloria!',
      },
      {
        emoji: '🥣',
        name: 'Bowl de iogurte grego com frutas vermelhas',
        time: '5 min',
        difficulty: 'Muito fácil',
        calories: 190,
        proteins: 18,
        carbs: 22,
        fat: 3,
        desc: 'Combinação perfeita de proteína e antioxidantes. Rápido, gostoso e vai te dar energia sem pesar.',
        ingredients: [
          '200g de iogurte grego desnatado',
          '½ xícara de morango picado',
          '½ xícara de mirtilo',
          '1 colher de sopa de chia',
          '1 fio de mel',
        ],
        steps: [
          'Coloque o iogurte grego em uma tigela.',
          'Distribua as frutas vermelhas por cima.',
          'Polvilhe a chia sobre tudo.',
          'Finalize com um fio de mel.',
          'Consuma imediatamente ou leve à geladeira por até 1 hora.',
        ],
        tip: '💡 Dica: Prepare na noite anterior e deixe na geladeira — fica ainda mais cremoso!',
      },
    ],
    almoco: [
      {
        emoji: '🍗',
        name: 'Frango grelhado com salada de folhas e quinoa',
        time: '25 min',
        difficulty: 'Fácil',
        calories: 380,
        proteins: 48,
        carbs: 28,
        fat: 7,
        desc: 'A refeição mais completa para emagrecer com saúde. Alta proteína, fibras e carboidratos de qualidade que vão te saciar sem exagerar nas calorias.',
        ingredients: [
          '200g de peito de frango',
          '½ xícara de quinoa cozida',
          '2 xícaras de folhas verdes mistas',
          '1 pepino em rodelas',
          '10 tomates cereja',
          'Limão, azeite, sal e pimenta',
        ],
        steps: [
          'Tempere o frango com sal, pimenta, limão e um fio de azeite. Deixe marinar 10 min.',
          'Grelhe o frango em frigideira quente por 6-7 minutos de cada lado até dourar.',
          'Enquanto isso, cozinhe a quinoa: 1 parte de quinoa para 2 de água, 15 minutos.',
          'Monte a salada com as folhas, pepino e tomates.',
          'Fatie o frango, coloque sobre a salada e adicione a quinoa.',
          'Tempere com limão, azeite, sal e pimenta. Sirva.',
        ],
        tip: '💡 Dica: Grelhe vários peitos de frango de uma vez e guarde na geladeira para a semana toda!',
      },
      {
        emoji: '🥗',
        name: 'Atum com grão de bico e legumes assados',
        time: '30 min',
        difficulty: 'Fácil',
        calories: 340,
        proteins: 38,
        carbs: 32,
        fat: 8,
        desc: 'Refeição anti-inflamatória e super nutritiva. O grão de bico traz fibras que prolongam a saciedade por horas.',
        ingredients: [
          '1 lata de atum em água',
          '½ xícara de grão de bico cozido',
          '1 abobrinha em cubos',
          '1 pimentão vermelho em tiras',
          '1 cenoura em rodelas',
          'Azeite, alho, sal e pimenta',
        ],
        steps: [
          'Pré-aqueça o forno a 200°C.',
          'Tempere os legumes com azeite, alho amassado, sal e pimenta.',
          'Leve os legumes ao forno por 20-25 minutos, virando na metade.',
          'Escorra o atum e misture com o grão de bico.',
          'Monte o prato com os legumes assados e a mistura de atum.',
          'Finalize com limão e azeite por cima.',
        ],
        tip: '💡 Dica: Asse os legumes em maior quantidade e use por 3-4 dias. Economiza muito tempo!',
      },
    ],
    janta: [
      {
        emoji: '🐠',
        name: 'Tilápia assada com brócolis no vapor',
        time: '20 min',
        difficulty: 'Fácil',
        calories: 260,
        proteins: 38,
        carbs: 10,
        fat: 6,
        desc: 'Janta ideal para emagrecer. Levíssima, rica em proteína e vai te ajudar a acordar mais leve amanhã.',
        ingredients: [
          '200g de filé de tilápia',
          '2 xícaras de brócolis',
          'Limão, alho, sal, pimenta e azeite',
          'Ervas a gosto (orégano, salsinha)',
        ],
        steps: [
          'Pré-aqueça o forno a 200°C.',
          'Tempere a tilápia com limão, alho, sal, pimenta e azeite.',
          'Coloque o peixe em uma forma e leve ao forno por 15-18 minutos.',
          'Cozinhe o brócolis no vapor por 5-7 minutos — deve ficar al dente.',
          'Sirva o peixe sobre o brócolis e finalize com ervas frescas.',
        ],
        tip: '💡 Dica: Substitua a tilápia por atum fresco ou sardinha para variar e economizar!',
      },
      {
        emoji: '🥚',
        name: 'Omelete recheada low carb',
        time: '12 min',
        difficulty: 'Muito fácil',
        calories: 230,
        proteins: 26,
        carbs: 5,
        fat: 12,
        desc: 'Rápida, saborosa e perfeita para a noite. Sem carboidratos complexos para não interferir no sono e na queima de gordura noturna.',
        ingredients: [
          '3 ovos inteiros',
          '50g de queijo cottage',
          '1 xícara de espinafre',
          '5 azeitonas fatiadas',
          'Sal, pimenta e azeite',
        ],
        steps: [
          'Bata os ovos em um bowl, tempere com sal e pimenta.',
          'Aqueça frigideira com azeite em fogo médio-baixo.',
          'Despeje os ovos e deixe firmar nas bordas por 2 minutos.',
          'Adicione o cottage, espinafre e azeitonas em metade da omelete.',
          'Dobre, tampe e deixe mais 2 minutos. Sirva com salada de folhas.',
        ],
        tip: '💡 Dica: Adicione pimenta calabresa para acelerar o metabolismo naturalmente!',
      },
    ],
  },
  gain_muscle: {
    cafe: [
      {
        emoji: '🥞',
        name: 'Panquecas de aveia com banana e proteína',
        time: '15 min',
        difficulty: 'Fácil',
        calories: 420,
        proteins: 32,
        carbs: 52,
        fat: 8,
        desc: 'O café da manhã favorito de quem treina pesado. Energia de longa duração e proteína para a síntese muscular desde cedo.',
        ingredients: [
          '1 xícara de aveia em flocos',
          '2 bananas maduras',
          '3 ovos',
          '1 scoop de whey protein (opcional)',
          'Mel e canela a gosto',
        ],
        steps: [
          'Amasse as bananas em um bowl até virar um purê.',
          'Adicione os ovos e misture bem.',
          'Acrescente a aveia e o whey (se usar) e misture até formar uma massa.',
          'Aqueça frigideira antiaderente em fogo médio com um fio de azeite.',
          'Coloque porções da massa e cozinhe 2-3 minutos de cada lado.',
          'Sirva com mel, canela e frutas frescas por cima.',
        ],
        tip: '💡 Dica: Faça a massa na noite anterior e deixe na geladeira — fica ainda melhor!',
      },
      {
        emoji: '🥤',
        name: 'Vitamina hipercalórica de banana com amendoim',
        time: '5 min',
        difficulty: 'Muito fácil',
        calories: 520,
        proteins: 28,
        carbs: 65,
        fat: 16,
        desc: 'Shake poderoso para ganho de massa. Rico em calorias de qualidade para quem tem dificuldade em comer muito.',
        ingredients: [
          '2 bananas congeladas',
          '300ml de leite integral',
          '2 colheres de pasta de amendoim',
          '1 scoop de whey protein',
          '1 colher de mel',
          'Canela a gosto',
        ],
        steps: [
          'Coloque todos os ingredientes no liquidificador.',
          'Bata por 1-2 minutos até ficar cremoso.',
          'Prove e ajuste o mel se precisar de mais dulçor.',
          'Sirva imediatamente — não deixe passar muito tempo.',
        ],
        tip: '💡 Dica: Tome 30 minutos antes do treino para máximo desempenho!',
      },
    ],
    almoco: [
      {
        emoji: '🐟',
        name: 'Salmão grelhado com batata doce e aspargos',
        time: '30 min',
        difficulty: 'Médio',
        calories: 580,
        proteins: 52,
        carbs: 42,
        fat: 20,
        desc: 'A refeição mais anabólica do cardápio. Ômega-3 do salmão + carboidratos de qualidade da batata doce = combinação perfeita para hipertrofia.',
        ingredients: [
          '200g de filé de salmão',
          '200g de batata doce',
          '1 maço de aspargos',
          'Azeite, limão, alho, sal e pimenta',
          'Ervas frescas (dill ou salsinha)',
        ],
        steps: [
          'Cozinhe a batata doce em cubos por 15 minutos até ficar macia.',
          'Tempere o salmão com sal, pimenta, limão e alho.',
          'Grelhe o salmão em frigideira quente com azeite por 4 minutos de cada lado.',
          'Refogue os aspargos no mesmo azeite por 3-4 minutos.',
          'Monte o prato e finalize com limão e ervas frescas.',
        ],
        tip: '💡 Dica: Compre salmão em porções maiores e congele — sai mais barato e prático!',
      },
      {
        emoji: '🥙',
        name: 'Bowl de arroz integral com frango e ovos',
        time: '25 min',
        difficulty: 'Fácil',
        calories: 620,
        proteins: 58,
        carbs: 55,
        fat: 14,
        desc: 'O bowl mais completo para ganho de massa. Tripla fonte de proteína que garante aminoácidos por horas após a refeição.',
        ingredients: [
          '200g de peito de frango',
          '2 ovos mexidos',
          '1 xícara de arroz integral cozido',
          '1 xícara de feijão preto',
          'Azeite, alho, cebola, sal e pimenta',
          'Salsa e cebolinha a gosto',
        ],
        steps: [
          'Cozinhe o frango temperado na frigideira e desfie.',
          'Faça os ovos mexidos cremosos em outra frigideira.',
          'Refogue o feijão com alho e cebola.',
          'Monte o bowl: arroz na base, frango, feijão e ovos por cima.',
          'Finalize com azeite, sal, pimenta e ervas frescas.',
        ],
        tip: '💡 Dica: Prepare todos os componentes separados e monte na hora — dura 4 dias na geladeira!',
      },
    ],
    janta: [
      {
        emoji: '🍲',
        name: 'Frango com purê de batata doce e couve',
        time: '30 min',
        difficulty: 'Médio',
        calories: 480,
        proteins: 52,
        carbs: 38,
        fat: 10,
        desc: 'Janta reconfortante e anabólica. Perfeita para recuperação muscular pós-treino noturno.',
        ingredients: [
          '200g de peito de frango',
          '200g de batata doce',
          '2 folhas de couve refogada',
          '50ml de leite desnatado',
          'Azeite, alho, sal e pimenta',
          'Noz-moscada para o purê',
        ],
        steps: [
          'Cozinhe a batata doce e amasse com leite, sal e noz-moscada até virar purê.',
          'Tempere o frango e grelhe por 6-7 minutos de cada lado.',
          'Refogue a couve com alho e azeite por 3 minutos.',
          'Fatie o frango e sirva sobre o purê com a couve ao lado.',
        ],
        tip: '💡 Dica: Adicione 1 colher de proteína em pó ao purê para turbinar ainda mais!',
      },
      {
        emoji: '🥘',
        name: 'Carne moída magra com legumes e quinoa',
        time: '25 min',
        difficulty: 'Fácil',
        calories: 520,
        proteins: 48,
        carbs: 40,
        fat: 16,
        desc: 'Rico em zinco, ferro e proteína completa. Ótimo para recuperação e crescimento muscular durante o sono.',
        ingredients: [
          '200g de carne moída patinho',
          '½ xícara de quinoa',
          '1 abobrinha em cubos',
          '1 pimentão em tiras',
          'Alho, cebola, tomate, sal e pimenta',
          'Salsinha a gosto',
        ],
        steps: [
          'Cozinhe a quinoa em água com sal por 15 minutos.',
          'Refogue cebola e alho em azeite por 2 minutos.',
          'Adicione a carne moída e cozinhe até dourar.',
          'Acrescente os legumes e cozinhe por mais 5 minutos.',
          'Misture a quinoa e ajuste o tempero.',
          'Finalize com salsinha fresca.',
        ],
        tip: '💡 Dica: Substitua a carne moída por frango desfiado para uma versão mais leve!',
      },
    ],
  },
  maintain: {
    cafe: [
      {
        emoji: '🫓',
        name: 'Tapioca recheada com queijo e peito de peru',
        time: '10 min',
        difficulty: 'Muito fácil',
        calories: 280,
        proteins: 18,
        carbs: 32,
        fat: 8,
        desc: 'Café da manhã equilibrado e saboroso. Energia moderada para o dia sem excessos nem restrições.',
        ingredients: [
          '3 colheres de goma de tapioca',
          '2 fatias de queijo branco',
          '3 fatias de peito de peru',
          '½ tomate em rodelas',
          'Orégano a gosto',
        ],
        steps: [
          'Espalhe a goma de tapioca em frigideira antiaderente quente.',
          'Deixe firmar por 2 minutos até formar a tapioca.',
          'Vire com cuidado e deixe mais 1 minuto.',
          'Recheie com queijo, peito de peru e tomate.',
          'Dobre ao meio, finalize com orégano e sirva.',
        ],
        tip: '💡 Dica: Experimente rechear com cottage e mel para uma versão mais doce!',
      },
      {
        emoji: '🍌',
        name: 'Smoothie bowl tropical com granola',
        time: '8 min',
        difficulty: 'Muito fácil',
        calories: 320,
        proteins: 12,
        carbs: 48,
        fat: 8,
        desc: 'Colorido, nutritivo e delicioso. Perfeito para quem quer manter o peso sem abrir mão do prazer de comer bem.',
        ingredients: [
          '1 banana congelada',
          '½ manga congelada',
          '100ml de leite de coco',
          '3 colheres de granola sem açúcar',
          'Kiwi, morango e coco ralado para decorar',
        ],
        steps: [
          'Bata a banana, manga e leite de coco no liquidificador.',
          'Deve ficar cremoso e espesso — adicione pouco líquido.',
          'Despeje em uma tigela.',
          'Decore com granola, frutas fatiadas e coco ralado.',
          'Sirva imediatamente.',
        ],
        tip: '💡 Dica: Quanto mais congelada a fruta, mais cremoso fica o smoothie!',
      },
    ],
    almoco: [
      {
        emoji: '🍱',
        name: 'Marmita fitness completa',
        time: '35 min',
        difficulty: 'Médio',
        calories: 480,
        proteins: 40,
        carbs: 48,
        fat: 10,
        desc: 'A refeição mais equilibrada possível. Todos os macronutrientes nas proporções ideais para manutenção de peso e saúde.',
        ingredients: [
          '150g de peito de frango',
          '½ xícara de arroz integral',
          '½ xícara de feijão',
          '1 xícara de brócolis e cenoura',
          'Salada de folhas verdes',
          'Azeite, alho, limão, sal e pimenta',
        ],
        steps: [
          'Cozinhe o arroz integral e o feijão normalmente.',
          'Grelhe o frango temperado até dourar dos dois lados.',
          'Cozinhe os legumes no vapor por 5-7 minutos.',
          'Monte a marmita com cada elemento separado.',
          'Tempere a salada na hora de comer para não murchar.',
        ],
        tip: '💡 Dica: Monte 5 marmitas no domingo e tenha almoço pronto para a semana toda!',
      },
      {
        emoji: '🌮',
        name: 'Wrap integral de frango com abacate',
        time: '15 min',
        difficulty: 'Fácil',
        calories: 420,
        proteins: 35,
        carbs: 38,
        fat: 14,
        desc: 'Moderno, prático e equilibrado. Ótimo para dias corridos sem abrir mão da nutrição de qualidade.',
        ingredients: [
          '1 wrap ou tortilla integral',
          '150g de frango desfiado',
          '½ abacate amassado',
          'Alface, tomate e cebola roxa',
          'Limão, sal e pimenta',
          'Iogurte grego como molho',
        ],
        steps: [
          'Amasse o abacate com limão, sal e pimenta.',
          'Espalhe o guacamole no wrap.',
          'Adicione o frango desfiado temperado.',
          'Coloque as folhas, tomate e cebola roxa.',
          'Finalize com iogurte grego como molho saudável.',
          'Enrole firme e sirva.',
        ],
        tip: '💡 Dica: Leve o wrap já montado na marmita para o trabalho — prático e nutritivo!',
      },
    ],
    janta: [
      {
        emoji: '🍝',
        name: 'Macarrão integral ao molho de tomate com atum',
        time: '25 min',
        difficulty: 'Fácil',
        calories: 420,
        proteins: 32,
        carbs: 52,
        fat: 8,
        desc: 'Confortante e nutritivo. O macarrão integral tem índice glicêmico baixo, ideal para uma janta equilibrada.',
        ingredients: [
          '100g de macarrão integral',
          '1 lata de atum em água',
          '1 xícara de molho de tomate caseiro',
          '2 dentes de alho',
          'Azeite, manjericão, sal e pimenta',
          'Queijo parmesão light para finalizar',
        ],
        steps: [
          'Cozinhe o macarrão al dente conforme embalagem.',
          'Refogue o alho no azeite por 1 minuto.',
          'Adicione o molho de tomate e deixe ferver por 5 minutos.',
          'Acrescente o atum escorrido e misture.',
          'Misture o molho com o macarrão.',
          'Finalize com manjericão fresco e parmesão.',
        ],
        tip: '💡 Dica: Faça o molho de tomate em grande quantidade e congele em porções!',
      },
      {
        emoji: '🥗',
        name: 'Salada quente de lentilha com ovos',
        time: '20 min',
        difficulty: 'Fácil',
        calories: 360,
        proteins: 28,
        carbs: 38,
        fat: 10,
        desc: 'Diferente, nutritiva e muito saborosa. A lentilha é uma das melhores fontes de proteína vegetal e fibras.',
        ingredients: [
          '½ xícara de lentilha',
          '2 ovos cozidos',
          '1 cenoura em cubos',
          '1 talo de salsão',
          'Cebola, alho, azeite, sal e pimenta',
          'Vinagre balsâmico para temperar',
        ],
        steps: [
          'Cozinhe a lentilha por 20 minutos até ficar macia.',
          'Refogue cebola, alho e cenoura no azeite por 5 minutos.',
          'Misture a lentilha com os legumes refogados.',
          'Cozinhe os ovos por 8 minutos, descasque e corte ao meio.',
          'Monte o prato com a lentilha e os ovos por cima.',
          'Tempere com vinagre balsâmico, sal e pimenta.',
        ],
        tip: '💡 Dica: Adicione folhas de rúcula por cima para dar frescor e vitaminas extra!',
      },
    ],
  },
};

const tabLabels = [
  { key: 'cafe', label: '☀️ Café da manhã' },
  { key: 'almoco', label: '🌤️ Almoço' },
  { key: 'janta', label: '🌙 Janta' },
];

const goalInfo: Record<string, { label: string; color: string; desc: string }> = {
  lose_weight: {
    label: '🔥 Emagrecimento',
    color: 'text-orange-400',
    desc: 'Receitas com déficit calórico, ricas em proteína e fibras para saciedade máxima.',
  },
  gain_muscle: {
    label: '💪 Ganho de massa',
    color: 'text-blue-400',
    desc: 'Refeições hipercalóricas e hiperproteicas para maximizar a hipertrofia muscular.',
  },
  maintain: {
    label: '⚖️ Manutenção',
    color: 'text-green-400',
    desc: 'Receitas equilibradas com todos os macros nas proporções ideais para saúde.',
  },
};

export default function TipsPage() {
  const router = useRouter();
  const [goal, setGoal] = useState<string>('maintain');
  const [activeTab, setActiveTab] = useState<'cafe' | 'almoco' | 'janta'>('cafe');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('goal').eq('id', user.id).single();
        if (profile?.goal) setGoal(profile.goal);
      }
      setLoading(false);
    }
    load();
  }, []);

  const meals = RECIPES[goal]?.[activeTab] ?? [];
  const info = goalInfo[goal];

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-4xl animate-pulse">🍽️</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-10">
      <div className="max-w-sm mx-auto p-5">

        {/* Header */}
        <div className="pt-8 pb-4 text-center">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-white">Seu Plano Alimentar</h1>
          <p className={`text-sm font-semibold mt-1 ${info.color}`}>{info.label}</p>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed px-4">{info.desc}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-5 mb-5">
          {tabLabels.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); setExpandedIndex(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-400 text-black'
                  : 'border border-gray-800 text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recipe Cards */}
        <div className="space-y-4">
          {meals.map((meal, i) => (
            <div key={i} className="glass-card rounded-2xl border border-gray-800 overflow-hidden">

              {/* Card Header */}
              <button
                className="w-full p-5 text-left"
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{meal.emoji}</span>
                    <div>
                      <p className="text-white font-bold text-sm">{meal.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-500">⏱️ {meal.time}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{meal.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-gray-500 text-lg mt-1">
                    {expandedIndex === i ? '▲' : '▼'}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mt-3 leading-relaxed">{meal.desc}</p>

                {/* Macros */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { label: 'Kcal', value: meal.calories, color: 'text-cyan-400' },
                    { label: 'Prot', value: `${meal.proteins}g`, color: 'text-blue-400' },
                    { label: 'Carb', value: `${meal.carbs}g`, color: 'text-yellow-400' },
                    { label: 'Gord', value: `${meal.fat}g`, color: 'text-red-400' },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-900 rounded-xl p-2 text-center">
                      <p className={`font-bold text-sm ${m.color}`}>{m.value}</p>
                      <p className="text-gray-600 text-xs">{m.label}</p>
                    </div>
                  ))}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedIndex === i && (
                <div className="px-5 pb-5 border-t border-gray-800 pt-4">

                  {/* Ingredientes */}
                  <div className="mb-5">
                    <p className="text-white font-bold mb-3">🛒 Ingredientes</p>
                    <div className="space-y-2">
                      {meal.ingredients.map((ing, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                          <p className="text-gray-300 text-sm">{ing}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modo de preparo */}
                  <div className="mb-5">
                    <p className="text-white font-bold mb-3">👨‍🍳 Modo de preparo</p>
                    <div className="space-y-3">
                      {meal.steps.map((step, j) => (
                        <div key={j} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-cyan-400 text-xs font-bold">{j + 1}</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dica */}
                  <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-4">
                    <p className="text-yellow-300 text-sm leading-relaxed">{meal.tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="neon-btn-orange w-full py-4 rounded-xl text-orange-400 font-bold text-base">
            🚀 Começar a usar o SnapFit
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="neon-btn w-full py-4 rounded-xl text-cyan-400 font-bold text-base">
            🤖 Pedir mais receitas ao NutriBot
          </button>
          <p className="text-gray-600 text-xs text-center">
            O NutriBot cria receitas personalizadas específicas para você!
          </p>
        </div>
      </div>
    </div>
  );
}