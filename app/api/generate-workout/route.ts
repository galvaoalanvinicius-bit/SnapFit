import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { profile, workout_type, date, previous_workouts } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecimento — foco em queima calórica, circuitos e cardio',
      gain_muscle: 'ganho de massa muscular — foco em hipertrofia com cargas progressivas',
      maintain: 'manutenção — equilíbrio entre força e condicionamento',
    };

    const dayNumber = new Date(date).getDate();
    const dayOfWeek = new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' });

    const previousContext = previous_workouts?.length > 0
      ? `Treinos anteriores recentes: ${previous_workouts.map((w: any) =>
          `${w.date}: ${w.title} (${w.completed ? 'concluído' : 'não concluído'})`
        ).join(', ')}`
      : 'Primeiro treino do usuário';

    const gymExercises = workout_type === 'gym'
      ? `Use equipamentos comuns de academia: barras, halteres, máquinas de cabo, leg press, smith machine, polia, banco, esteira, bike.`
      : `Use apenas exercícios sem equipamento: peso corporal, cadeira, parede, toalha. Adaptados para casa.`;

    const prompt = `Você é um personal trainer especializado criando treinos personalizados.

DADOS DO USUÁRIO:
- Nome: ${profile.full_name?.split(' ')[0]}
- Objetivo: ${goalMap[profile.goal] ?? 'saúde'}
- Peso: ${profile.weight}kg | Altura: ${profile.height}cm | Idade: ${profile.age} anos
- Sexo: ${profile.gender === 'male' ? 'Masculino' : 'Feminino'}
- Tipo de treino: ${workout_type === 'gym' ? 'Academia' : 'Em casa'}
- Dia: ${dayOfWeek} (dia ${dayNumber})
- ${previousContext}

REGRAS:
- Treino de 60 minutos
- ${gymExercises}
- Varie os grupos musculares baseado no dia (${dayNumber} par = membros inferiores, ímpar = superiores + core)
- Para emagrecimento: inclua circuitos e exercícios compostos
- Para ganho de massa: series de 8-12 reps com cargas progressivas
- Para manutenção: equilíbrio entre força e resistência
- Sugira cargas iniciais baseadas no peso do usuário
- Seja motivador e conversacional

Responda SOMENTE em JSON válido:
{
  "title": "nome do treino de hoje",
  "motivation": "mensagem motivadora personalizada para ${profile.full_name?.split(' ')[0]}, máximo 2 frases animadas",
  "focus": "grupo muscular foco de hoje",
  "duration_minutes": 60,
  "calories_estimate": 0,
  "warmup": "descrição do aquecimento de 5 min",
  "exercises": [
    {
      "name": "nome do exercício",
      "muscle_group": "grupo muscular",
      "sets": 3,
      "reps": "10-12",
      "weight": 20.0,
      "rest_seconds": 60,
      "instructions": "como fazer o exercício passo a passo em 2-3 frases",
      "tip": "dica importante de execução ou segurança",
      "order_index": 1
    }
  ],
  "cooldown": "descrição do alongamento final de 5 min",
  "coach_message": "mensagem final do coach para motivar a conclusão"
}

Inclua 6-8 exercícios principais. Para academia inclua máquinas específicas.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const workout = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(workout);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}