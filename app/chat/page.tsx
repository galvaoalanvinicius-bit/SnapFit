'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export default function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      // Carregar histórico de mensagens
      const { data: history } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // Primeira vez — mensagem de boas vindas
        const welcome: Message = {
          role: 'assistant',
          content: `Olá, ${p?.full_name?.split(' ')[0] ?? 'usuário'}! 👋 Sou o **NutriBot**, seu nutricionista virtual do SnapFit.\n\nEstou aqui para te ajudar com:\n• 🥗 Dúvidas sobre alimentação\n• 💪 Estratégias para seu objetivo\n• 🍽️ Sugestões de receitas\n• 📊 Análise de hábitos alimentares\n\nComo posso te ajudar hoje?`,
        };
        setMessages([welcome]);

        // Salvar mensagem de boas vindas
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          role: welcome.role,
          content: welcome.content,
        });
      }
      setLoadingHistory(false);
    }
    load();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  function formatMessage(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={i} className="font-bold text-white mb-1">
              {line.replace(/\*\*/g, '')}
            </p>
          );
        }
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 mb-1">
              <span className="text-cyan-400 flex-shrink-0">•</span>
              <span>{line.replace(/^[•\-] /, '')}</span>
            </div>
          );
        }
        if (line.startsWith('**')) {
          return (
            <p key={i} className="mb-1">
              {line.split('**').map((part, j) =>
                j % 2 === 1
                  ? <strong key={j} className="text-white font-bold">{part}</strong>
                  : part
              )}
            </p>
          );
        }
        if (line === '') return <br key={i} />;
        return <p key={i} className="mb-1">{line}</p>;
      });
  }

  async function handleSend() {
    if (!input.trim() || loading || !profile || !userId) return;

    const userContent = input.trim();
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: Message = { role: 'user', content: userContent };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Salvar mensagem do usuário no banco
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      content: userContent,
    });

    try {
      // Pegar últimas 10 mensagens para contexto
      const contextMessages = [...messages, userMsg]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          profile,
        }),
      });

      const data = await res.json();
      const reply = data.reply ?? 'Desculpe, não consegui responder. Tente novamente.';

      const assistantMsg: Message = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);

      // Salvar resposta da IA no banco
      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: reply,
      });
    } catch {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Ops! Tive um problema para responder. Tente novamente em alguns segundos. 🔄',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    if (!confirm('Apagar todo o histórico de conversa?')) return;
    if (!userId) return;
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    const welcome: Message = {
      role: 'assistant',
      content: `Conversa reiniciada! 🔄 Como posso te ajudar, ${profile?.full_name?.split(' ')[0]}?`,
    };
    setMessages([welcome]);
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      content: welcome.content,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  const goalLabel: Record<string, string> = {
    lose_weight: '🔥 Emagrecimento',
    gain_muscle: '💪 Ganho de massa',
    maintain: '⚖️ Manutenção',
  };

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ height: '100dvh' }}>

      {/* Header */}
      <div className="bg-black border-b border-gray-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <p className="text-white font-bold text-sm">NutriBot</p>
            <p className="text-cyan-400 text-xs">
              {goalLabel[profile?.goal ?? 'maintain']} • Online
            </p>
          </div>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-gray-600 text-xs border border-gray-800 px-3 py-1.5 rounded-xl">
          🗑️ Limpar
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ paddingBottom: '160px' }}>

        {loadingHistory ? (
          <div className="flex justify-center pt-10">
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>

              {/* Avatar do bot */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-sm flex-shrink-0 mt-1">
                  🤖
                </div>
              )}

              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-950 border border-cyan-800 text-cyan-100 rounded-br-sm'
                  : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant'
                  ? <div className="space-y-0.5">{formatMessage(msg.content)}</div>
                  : msg.content
                }
              </div>

              {/* Avatar do usuário */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm flex-shrink-0 mt-1 font-bold text-white">
                  {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
            </div>
          ))
        )}

        {/* Digitando */}
        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-sm flex-shrink-0">
              🤖
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sugestões rápidas */}
      {messages.length <= 2 && !loading && (
        <div className="px-4 pb-2 flex-shrink-0" style={{ position: 'fixed', bottom: '140px', left: 0, right: 0 }}>
          <div className="max-w-sm mx-auto">
            <p className="text-gray-600 text-xs mb-2 text-center">Sugestões</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                '🍽️ Me sugira um cardápio',
                '💪 Dicas para treinar em jejum',
                '🥗 Receitas com frango',
                '⚖️ Como calcular minhas calorias',
              ].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="border border-gray-800 text-gray-400 text-xs px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0 bg-gray-950">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-black border-t border-gray-900 px-4 py-3 z-40">
        <div className="max-w-sm mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre nutrição..."
            rows={1}
            className="flex-1 resize-none"
            style={{
              borderRadius: '16px',
              padding: '12px 16px',
              maxHeight: '120px',
              minHeight: '46px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="neon-btn w-12 h-12 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xl disabled:opacity-40 flex-shrink-0">
            ↑
          </button>
        </div>
        <p className="text-gray-800 text-xs text-center mt-2">
          Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>

      <BottomNav active="chat" />
    </div>
  );
}