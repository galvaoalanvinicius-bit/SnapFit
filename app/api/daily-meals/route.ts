import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { profile, date } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecimento — déficit calórico, alta proteína, baixo carboidrato',
      gain_muscle: 'ganho de massa muscular — superávit calórico, muita proteína e carboidrato',
      maintain: 'manutenção de peso — alimentação equilibrada e variada',
    };

    const dayNumber = new Date(date).getDate();
    const dayOfWeek = new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' });

    const bmr = profile.gender === 'male'
      ? 88.36 + 13.4 * profile.weight + 4.8 * profile.height - 5.7 * profile.age
      : 447.6 + 9.25 * profile.weight + 3.1 * profile.height - 4.3 * profile.age;
    const tdee = Math.round(bmr * 1.55);
    const calorieGoal = profile.goal === 'lose_weight' ? tdee - 500
      : profile.goal === 'gain_muscle' ? tdee + 300 : tdee;

    const prefs = profile.food_preferences ?? {};
    const proteins = prefs.proteins?.length > 0
      ? `Use APENAS estas proteínas: ${prefs.proteins.join(', ')}`
      : 'Use proteínas acessíveis como frango, ovo e atum';
    const carbs = prefs.carbs?.length > 0
      ? `Use APENAS estes carboidratos: ${prefs.carbs.join(', ')}`
      : 'Use carboidratos comuns como arroz e batata doce';
    const veggies = prefs.veggies?.length > 0
      ? `Priorize estes vegetais: ${prefs.veggies.join(', ')}`
      : 'Use vegetais comuns e acessíveis';
    const restrictions = prefs.restrictions?.length > 0 && !prefs.restrictions.includes('sem_restricao')
      ? `Restrições OBRIGATÓRIAS: ${prefs.restrictions.join(', ')}`
      : 'Sem restrições alimentares';

    const prompt = `Você é um nutricionista fitness especializado em alimentação acessível para brasileiros.

DADOS DO USUÁRIO:
- Nome: ${profile.full_name?.split(' ')[0]}
- Objetivo: ${goalMap[profile.goal] ?? 'saúde'}
- Peso: ${profile.weight}kg | Altura: ${profile.height}cm | Idade: ${profile.age} anos
- Sexo: ${profile.gender === 'male' ? 'Masculino' : 'Feminino'}
- Meta calórica: ${calorieGoal} kcal
- Dia: ${dayOfWeek} (dia ${dayNumber})

PREFERÊNCIAS ALIMENTARES OBRIGATÓRIAS:
- ${proteins}
- ${carbs}
- ${veggies}
- ${restrictions}

IMPORTANTE: Use APENAS os alimentos que o usuário selecionou. Não inclua alimentos caros ou difíceis de encontrar.
Varie as receitas usando o número do dia (${dayNumber}) para sempre ser diferente.

Crie um cardápio com 5 refeições. Responda SOMENTE em JSON válido:
{
  "greeting": "mensagem motivadora personalizada de 2 frases",
  "total_calories": 0,
  "meals": [
    {
      "meal_type": "cafe",
      "meal_name": "nome",
      "calories": 0,
      "proteins": 0.0,
      "carbs": 0.0,
      "fat": 0.0,
      "prep_time": "X min",
      "difficulty": "Fácil",
      "description": "descrição apetitosa",
      "ingredients": ["ingrediente com quantidade"],
      "steps": ["passo 1", "passo 2"],
      "tip": "dica do nutricionista"
    },
    { "meal_type": "lanche_manha", ... },
    { "meal_type": "almoco", ... },
    { "meal_type": "lanche_tarde", ... },
    { "meal_type": "janta", ... }
  ]
}

Distribua as calorias:
- Café da manhã: 20%
- Lanche da manhã: 10%
- Almoço: 35%
- Lanche da tarde: 10%
- Janta: 25%

Use ingredientes baratos e acessíveis no Brasil!`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        temperature: 0.9,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const plan = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}