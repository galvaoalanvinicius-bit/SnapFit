import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { profile, date } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecimento — déficit calórico, alta proteína, baixo carboidrato',
      gain_muscle: 'ganho de massa muscular — superávit calórico, muita proteína e carboidrato',
      maintain: 'manutenção de peso — alimentação equilibrada e variada',
    };

    const today = new Date(date);
    const dayOfWeek = today.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayNumber = today.getDate();

    // Calcular meta calórica baseada nos dados do usuário
    const gender = profile.gender === 'male' ? 'male' : 'female';
    const bmr = gender === 'male'
      ? 88.36 + 13.4 * profile.weight + 4.8 * profile.height - 5.7 * profile.age
      : 447.6 + 9.25 * profile.weight + 3.1 * profile.height - 4.3 * profile.age;
    const tdee = Math.round(bmr * 1.55);
    const calorieGoal = profile.goal === 'lose_weight'
      ? tdee - 500
      : profile.goal === 'gain_muscle'
      ? tdee + 300
      : tdee;

    const prompt = `Você é um nutricionista fitness especializado criando um plano alimentar personalizado.

DADOS DO USUÁRIO:
- Nome: ${profile.full_name}
- Objetivo: ${goalMap[profile.goal] ?? 'saúde equilibrada'}
- Peso: ${profile.weight}kg | Altura: ${profile.height}cm | Idade: ${profile.age} anos
- Sexo: ${gender === 'male' ? 'Masculino' : 'Feminino'}
- Meta calórica diária: ${calorieGoal} kcal
- Dia da semana: ${dayOfWeek} (dia ${dayNumber} do mês)

IMPORTANTE: Use o número do dia (${dayNumber}) para variar as receitas — cada dia deve ter receitas DIFERENTES e criativas. Não repita as mesmas receitas de dias anteriores.

Crie um cardápio completo para hoje com 4 refeições. Responda SOMENTE em JSON válido:
{
  "greeting": "mensagem motivadora personalizada para ${profile.full_name?.split(' ')[0]} sobre o cardápio de hoje, máximo 2 frases",
  "total_calories": 0,
  "meals": [
    {
      "meal_type": "cafe",
      "meal_name": "nome da refeição",
      "calories": 0,
      "proteins": 0.0,
      "carbs": 0.0,
      "fat": 0.0,
      "prep_time": "X min",
      "difficulty": "Fácil/Médio",
      "description": "descrição apetitosa de 1 frase",
      "ingredients": ["ingrediente com quantidade", "..."],
      "steps": ["passo 1", "passo 2", "..."],
      "tip": "dica especial do nutricionista"
    },
    {
      "meal_type": "almoco",
      ...
    },
    {
      "meal_type": "lanche",
      ...
    },
    {
      "meal_type": "janta",
      ...
    }
  ]
}

Distribua as calorias assim:
- Café da manhã: 25% das calorias
- Almoço: 35% das calorias
- Lanche: 15% das calorias
- Janta: 25% das calorias

Seja criativo, use ingredientes variados e receitas gostosas que a pessoa vai querer fazer!`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
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