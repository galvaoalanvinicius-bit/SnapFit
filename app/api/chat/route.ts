import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, profile } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecer',
      gain_muscle: 'ganhar massa muscular',
      maintain: 'manter peso',
    };

    const system = `Você é NutriBot, nutricionista fitness virtual do SnapFit — Uma empresa do Grupo NSG.
Responda sempre em português, de forma amigável e motivadora.
Usuário: ${profile?.full_name} | Objetivo: ${goalMap[profile?.goal] ?? 'saúde'} | ${profile?.weight}kg ${profile?.height}cm ${profile?.age} anos
Máximo 3 parágrafos. Nunca substitua consulta médica.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}