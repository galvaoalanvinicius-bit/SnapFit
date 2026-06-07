import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verificar assinatura do Mercado Pago
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (secret) {
      const xSignature = req.headers.get('x-signature') ?? '';
      const xRequestId = req.headers.get('x-request-id') ?? '';
      const url = new URL(req.url);
      const dataId = url.searchParams.get('data.id') ?? '';

      const parts = xSignature.split(',');
      let ts = '';
      let hash = '';
      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') ts = value?.trim() ?? '';
        if (key?.trim() === 'v1') hash = value?.trim() ?? '';
      }

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = createHmac('sha256', secret).update(manifest).digest('hex');

      if (hmac !== hash) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
    }

    const body = await req.json();

    if (body.type !== 'subscription_preapproval' && body.type !== 'payment') {
      return NextResponse.json({ ok: true });
    }

    const mpId = body.data?.id;
    if (!mpId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${mpId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
    });

    const mp = await mpRes.json();

    if (!mp.payer_email) {
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', mp.payer_email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 });
    }

    const status = mp.status === 'authorized' ? 'active' : 'inactive';
    const expiresAt = mp.next_payment_date ?? null;

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (existing) {
      await supabase
        .from('subscriptions')
        .update({ status, expires_at: expiresAt, mp_subscription_id: mpId })
        .eq('user_id', profile.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          user_id: profile.id,
          status,
          plan: 'monthly',
          mp_subscription_id: mpId,
          expires_at: expiresAt,
        });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'SnapFit webhook ativo' });
}