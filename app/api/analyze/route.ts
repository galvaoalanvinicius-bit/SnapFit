import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, profile } = await req.json();

    const goalMap: Record<string, string> = {
      lose_weight: 'emagrecer e reduzir gordura corporal',
      gain_muscle: 'ganhar massa muscular e hipertrofia',
      maintain: 'manter peso e ter saúde equilibrada',
    };

    const prompt = `Você é um nutricionista fitness especializado.
Analise a refeição na imagem e responda SOMENTE em JSON válido, sem markdown:
{
  "meal_name": "nome do prato",
  "calories": 000,
  "proteins": 00.0,
  "carbs": 00.0,
  "fat": 00.0,
  "healthy_score": 0,
  "ai_feedback": "análise detalhada em português",
  "tips": ["dica 1", "dica 2", "dica 3"],
  "recipes": [
    { "name": "Nome", "description": "Descrição", "calories": 000, "prep_time": "20 min" }
  ]
}
Dados do usuário:
- Objetivo: ${goalMap[profile?.goal] ?? 'manter saúde'}
- Peso: ${profile?.weight}kg | Altura: ${profile?.height}cm | Idade: ${profile?.age} anos
- Sexo: ${profile?.gender === 'male' ? 'Masculino' : 'Feminino'}
Adapte sugestões ao objetivo. Seja amigável e motivador.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        }],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}