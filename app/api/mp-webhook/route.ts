import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    console.log('MP Webhook recebido:', JSON.stringify(body));

    const mpId = body.data?.id;
    if (!mpId) {
      console.log('ID não encontrado no body');
      return NextResponse.json({ ok: true });
    }

    // Tentar buscar como assinatura primeiro
    let mp: any = null;
    let userEmail = '';

    const preapprovalRes = await fetch(
      `https://api.mercadopago.com/preapproval/${mpId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (preapprovalRes.ok) {
      mp = await preapprovalRes.json();
      console.log('Preapproval:', JSON.stringify(mp));
      userEmail = mp.payer_email ?? '';
    }

    // Se não achou como assinatura, tenta como pagamento
    if (!userEmail) {
      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${mpId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          },
        }
      );

      if (paymentRes.ok) {
        const payment = await paymentRes.json();
        console.log('Payment:', JSON.stringify(payment));
        userEmail = payment.payer?.email ?? '';
      }
    }

    if (!userEmail) {
      console.log('Email do pagador não encontrado');
      return NextResponse.json({ ok: true });
    }

    console.log('Email encontrado:', userEmail);

    // Buscar usuário pelo email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (profileError || !profile) {
      console.log('Usuário não encontrado para email:', userEmail);
      return NextResponse.json({ ok: true });
    }

    console.log('Usuário encontrado:', profile.id);

    // Calcular data de expiração (30 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Verificar se já existe assinatura
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          expires_at: expiresAt.toISOString(),
          mp_subscription_id: String(mpId),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id);

      if (updateError) console.log('Erro ao atualizar:', updateError.message);
      else console.log('Assinatura atualizada com sucesso!');
    } else {
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: profile.id,
          status: 'active',
          plan: 'monthly',
          mp_subscription_id: String(mpId),
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) console.log('Erro ao inserir:', insertError.message);
      else console.log('Assinatura criada com sucesso!');
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log('Erro geral no webhook:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'SnapFit webhook ativo ✅' });
}