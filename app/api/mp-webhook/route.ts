import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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