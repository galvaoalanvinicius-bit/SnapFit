'use client';
import Link from 'next/link';

const items = [
  { href: '/dashboard', icon: '🏠', label: 'Home', key: 'home' },
  { href: '/camera', icon: '📸', label: 'Analisar', key: 'camera' },
  { href: '/chat', icon: '🤖', label: 'NutriBot', key: 'chat' },
  { href: '/history', icon: '📋', label: 'Histórico', key: 'history' },
  { href: '/profile', icon: '👤', label: 'Perfil', key: 'profile' },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-900 px-4 py-3 z-50">
      <div className="max-w-sm mx-auto flex justify-around">
        {items.map(item => (
          <Link key={item.key} href={item.href}
            className={`flex flex-col items-center gap-1 ${active === item.key ? 'text-cyan-400' : 'text-gray-600'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}