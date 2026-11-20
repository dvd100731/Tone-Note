import type { Route } from '../lib/router';

const TABS = [
  { route: 'songs', href: '#/', label: '곡' },
  { route: 'gear', href: '#/gear', label: '장비' },
  { route: 'recipes', href: '#/recipes', label: '레시피' },
  { route: 'data', href: '#/data', label: '데이터' },
] as const;

export function BottomNav({ current }: { current: Route['name'] }) {
  const active = current.startsWith('gear') ? 'gear' : current;
  return (
    <nav className="bottom-nav" aria-label="주 메뉴">
      {TABS.map((tab) => (
        <a key={tab.route} href={tab.href} aria-current={tab.route === active ? 'page' : undefined}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
