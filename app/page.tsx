'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single();

      if (!profile?.onboarding_completed) { router.replace('/onboarding'); return; }

      const { data: sub } = await supabase
        .from('subscriptions').select('*').eq('user_id', session.user.id)
        .eq('status', 'active').single();

      if (!sub) { router.replace('/subscribe'); return; }
      router.replace('/dashboard');
    }
    check();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="text-6xl mb-6 animate-pulse">⚡</div>
      <h1 className="text-4xl font-black gradient-text mb-2">SnapFit</h1>
      <p className="text-gray-500 text-sm">Uma empresa do Grupo NSG</p>
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'0ms'}}/>
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay:'150ms'}}/>
        <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{animationDelay:'300ms'}}/>
      </div>
    </div>
  );
}