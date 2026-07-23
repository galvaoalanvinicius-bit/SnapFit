import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { profile, workout_type, date, previous_workouts, exercise_progress } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecimento — foco em queima calórica e circuitos',
      gain_muscle: 'ganho de massa muscular — foco em hipertrofia com cargas progressivas',
      maintain: 'manutenção — equilíbrio entre força e condicionamento',
    };

    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Definir foco muscular por dia da semana
    const muscleByDay: Record<number, string> = {
      0: 'Descanso ou cardio leve',
      1: 'Peito e Tríceps',
      2: 'Costas e Bíceps',
      3: 'Pernas e Glúteos',
      4: 'Ombros e Core',
      5: 'Peito, Costas e Braços (treino completo)',
      6: 'Pernas e Glúteos',
    };

    const todayFocus = muscleByDay[dayOfWeek];

    // Progressão de carga automática
    const progressContext = exercise_progress?.length > 0
      ? `Histórico de cargas anteriores para progressão automática:
${exercise_progress.map((p: any) =>
  `${p.exercise_name}: última carga ${p.weight}kg x ${p.reps} reps x ${p.sets} séries (${p.date})`
).join('\n')}
IMPORTANTE: Aumente automaticamente 2.5kg nas cargas dos exercícios que o usuário já fez antes.`
      : 'Primeiro treino — use cargas iniciais baseadas no peso corporal do usuário.';

    const gymEquipment = workout_type === 'gym'
      ? 'Use equipamentos comuns: barras, halteres, máquinas de cabo, leg press, smith machine, polia, banco supino, cadeira extensora, mesa flexora, peck deck.'
      : 'Use apenas peso corporal: flexões, agachamentos, afundos, prancha, burpees, mountain climbers.';

    const prompt = `Você é um personal trainer especializado criando treinos personalizados para brasileiros.

DADOS DO USUÁRIO:
- Nome: ${profile.full_name?.split(' ')[0]}
- Objetivo: ${goalMap[profile.goal] ?? 'saúde'}
- Peso: ${profile.weight}kg | Altura: ${profile.height}cm | Idade: ${profile.age} anos
- Sexo: ${profile.gender === 'male' ? 'Masculino' : 'Feminino'}
- Tipo: ${workout_type === 'gym' ? 'Academia' : 'Em casa'}
- Dia: ${dayNames[dayOfWeek]} — Foco de hoje: ${todayFocus}

PROGRESSÃO AUTOMÁTICA DE CARGA:
${progressContext}

EQUIPAMENTOS:
${gymEquipment}

REGRAS:
- Treino de 60 minutos com 6-8 exercícios focados em: ${todayFocus}
- Para emagrecimento: séries de 15-20 reps, descanso curto (30-45s), circuitos
- Para ganho de massa: séries de 8-12 reps, descanso maior (60-90s), cargas pesadas
- Para manutenção: séries de 12-15 reps, descanso médio (45-60s)
- Aumente as cargas automaticamente baseado no histórico
- Seja motivador e conversacional com ${profile.full_name?.split(' ')[0]}

Responda SOMENTE em JSON válido:
{
  "title": "nome do treino — ${dayNames[dayOfWeek]}: ${todayFocus}",
  "motivation": "mensagem motivadora personalizada de 2 frases para ${profile.full_name?.split(' ')[0]}",
  "focus": "${todayFocus}",
  "duration_minutes": 60,
  "calories_estimate": 0,
  "warmup": "descrição do aquecimento de 5 min específico para ${todayFocus}",
  "exercises": [
    {
      "name": "nome do exercício",
      "muscle_group": "grupo muscular",
      "sets": 3,
      "reps": "10-12",
      "weight": 20.0,
      "rest_seconds": 60,
      "instructions": "como fazer em 2-3 frases claras",
      "tip": "dica de execução importante",
      "order_index": 1
    }
  ],
  "cooldown": "alongamento final de 5 min para ${todayFocus}",
  "coach_message": "mensagem final motivadora do coach"
}`;

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