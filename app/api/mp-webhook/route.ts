import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    console.log('Webhook recebido:', JSON.stringify(body));

    const type = body.type;
    const dataId = body.data?.id;

    if (!dataId) {
      console.log('ID não encontrado, ignorando');
      return NextResponse.json({ ok: true });
    }

    let userEmail = '';
    let mpStatus = '';
    let mpId = String(dataId);

    // Assinatura recorrente
    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const res = await fetch(
        `https://api.mercadopago.com/preapproval/${dataId}`,
        { headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      const mp = await res.json();
      console.log('Preapproval:', JSON.stringify(mp));
      userEmail = mp.payer_email ?? '';
      mpStatus = mp.status ?? '';
      mpId = String(mp.id ?? dataId);
    }

    // Pagamento único
    if (type === 'payment') {
      const res = await fetch(
        `https://api.mercadopago.com/v1/payments/${dataId}`,
        { headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      const mp = await res.json();
      console.log('Payment:', JSON.stringify(mp));
      userEmail = mp.payer?.email ?? '';
      mpStatus = mp.status === 'approved' ? 'authorized' : mp.status ?? '';
      mpId = String(dataId);
    }

    // Plano de assinatura
    if (type === 'subscription_authorized_payment') {
      const res = await fetch(
        `https://api.mercadopago.com/authorized_payments/${dataId}`,
        { headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      const mp = await res.json();
      console.log('Authorized payment:', JSON.stringify(mp));

      // Buscar a assinatura pelo preapproval_id
      if (mp.preapproval_id) {
        const subRes = await fetch(
          `https://api.mercadopago.com/preapproval/${mp.preapproval_id}`,
          { headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
        );
        const sub = await subRes.json();
        userEmail = sub.payer_email ?? '';
        mpStatus = sub.status ?? '';
        mpId = String(mp.preapproval_id);
      }
    }

    if (!userEmail) {
      console.log('Email não encontrado, ignorando');
      return NextResponse.json({ ok: true });
    }

    console.log(`Email: ${userEmail} | Status: ${mpStatus} | ID: ${mpId}`);

    // Buscar usuário pelo email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (profileError || !profile) {
      console.log('Usuário não encontrado:', userEmail);
      return NextResponse.json({ ok: true });
    }

    // Determinar status da assinatura
    const isActive = mpStatus === 'authorized' || mpStatus === 'approved';
    const status = isActive ? 'active' : 'inactive';

    // Calcular expiração (30 dias a partir de hoje se ativo)
    const expiresAt = isActive
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Verificar se já existe assinatura
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status,
          expires_at: expiresAt,
          mp_subscription_id: mpId,
        })
        .eq('user_id', profile.id);

      if (error) console.log('Erro ao atualizar:', error.message);
      else console.log(`Assinatura ${status} para ${userEmail}`);
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: profile.id,
          status,
          plan: 'monthly',
          mp_subscription_id: mpId,
          expires_at: expiresAt,
        });

      if (error) console.log('Erro ao inserir:', error.message);
      else console.log(`Assinatura criada como ${status} para ${userEmail}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log('Erro geral:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'SnapFit webhook ativo ✅' });
}