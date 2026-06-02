'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, Profile } from '@/lib/types';
import { BottomNav } from '../dashboard/page';

export default function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      setMessages([{
        role: 'assistant',
        content: `Olá, ${p?.full_name?.split(' ')[0] ?? 'usuário'}! 👋 Sou o NutriBot, seu nutricionista virtual do SnapFit. Como posso te ajudar hoje?`,
      }]);
    }
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading || !profile) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, profile }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao responder. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pb-20">
      {/* Header */}
      <div className="max-w-sm mx-auto w-full p-5 pt-8">
        <h1 className="text-2xl font-bold text-white">NutriBot 🤖</h1>
        <p className="text-cyan-400 text-sm mt-1">Nutricionista IA • SnapFit</p>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-sm mx-auto w-full px-5 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-cyan-950 border border-cyan-800 text-cyan-100'
                : 'glass-card border border-gray-800 text-gray-300'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card border border-gray-800 rounded-2xl p-3 flex gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'0ms'}}/>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'150ms'}}/>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'300ms'}}/>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="max-w-sm mx-auto w-full px-5 pb-24">
        <div className="flex gap-3 items-end">
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Pergunte sobre nutrição..."
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 resize-none max-h-32"
            style={{ borderRadius: '16px', padding: '12px 16px' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            className="neon-btn w-12 h-12 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xl disabled:opacity-40 flex-shrink-0">
            ↑
          </button>
        </div>
      </div>

      <BottomNav active="chat" />
    </div>
  );
}