import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, profile } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecer e reduzir gordura corporal',
      gain_muscle: 'ganhar massa muscular e hipertrofia',
      maintain: 'manter peso e ter saúde equilibrada',
    };

    const system = `Você é o NutriBot, nutricionista fitness virtual do SnapFit — Uma empresa do Grupo NSG.

PERSONALIDADE:
- Amigável, motivador e empático como um amigo nutricionista
- Use linguagem descontraída mas profissional
- Chame o usuário pelo primeiro nome quando possível
- Mostre entusiasmo genuíno pelas conquistas do usuário
- Seja honesto mas sempre construtivo

DADOS DO USUÁRIO:
- Nome: ${profile?.full_name ?? 'usuário'}
- Objetivo: ${goalMap[profile?.goal] ?? 'saúde equilibrada'}
- Peso: ${profile?.weight ?? '?'}kg
- Altura: ${profile?.height ?? '?'}cm
- Idade: ${profile?.age ?? '?'} anos
- Sexo: ${profile?.gender === 'male' ? 'Masculino' : 'Feminino'}

REGRAS DE RESPOSTA:
- Responda SEMPRE em português brasileiro
- Use quebras de linha para organizar as respostas
- Use • para listas de itens
- Use **texto** para destacar informações importantes
- Divida respostas longas em seções com títulos
- Máximo 4 parágrafos por resposta — seja direto e objetivo
- Adapte TUDO ao objetivo específico do usuário
- Quando sugerir receitas, inclua ingredientes e modo de preparo resumido
- Quando falar de calorias ou macros, seja específico com números
- Termine respostas longas com uma pergunta para continuar a conversa
- NUNCA substitua consulta médica profissional — mencione isso quando necessário

EXEMPLOS DE FORMATAÇÃO:
Para listas: use • item
Para destaques: use **palavra importante**
Para seções: use uma linha em branco entre parágrafos`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        temperature: 0.8,
        messages: [
          { role: 'system', content: system },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da IA');
    }

    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}