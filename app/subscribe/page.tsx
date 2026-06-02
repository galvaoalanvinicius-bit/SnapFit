'use client';
import { useRouter } from 'next/navigation';

const MP_PLAN_LINK = 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=b7804ddab1554dc5885fe891c10c8f69';

const FEATURES = [
  { icon: '📸', text: 'Análise de refeições com IA ilimitada' },
  { icon: '🥗', text: 'Dicas personalizadas ao seu objetivo' },
  { icon: '🍽️', text: 'Receitas saudáveis recomendadas' },
  { icon: '📊', text: 'Histórico completo de refeições' },
  { icon: '💬', text: 'NutriBot — nutricionista IA 24h' },
  { icon: '⚡', text: 'Resultados em segundos' },
];

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-black p-6 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="text-center py-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-4xl font-black gradient-text">SnapFit Pro</h1>
          <p className="text-gray-500 text-xs mt-1">Uma empresa do Grupo NSG</p>
          <p className="text-gray-400 text-sm mt-3">Transforme sua alimentação com IA</p>
        </div>

        <div className="space-y-3 mb-8">
          {FEATURES.map(f => (
            <div key={f.text} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">{f.icon}</span>
              <span className="text-gray-300 text-sm">{f.text}</span>
            </div>
          ))}
        </div>

        <div className="neon-border-blue rounded-2xl p-6 text-center mb-6 glow-ring">
          <div className="text-5xl font-black text-cyan-400 mb-1">R$ 19,90</div>
          <div className="text-gray-400 text-sm">por mês · cancele quando quiser</div>
        </div>

        <a href={MP_PLAN_LINK} target="_blank" rel="noopener noreferrer"
          className="neon-btn-orange block w-full py-4 rounded-xl text-orange-400 font-bold text-center text-base">
          🔒 Assinar com Mercado Pago
        </a>

        <p className="text-gray-600 text-xs text-center mt-4 leading-5">
          Ao assinar você concorda com os Termos de Uso.<br />
          Cobrança automática mensal. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}