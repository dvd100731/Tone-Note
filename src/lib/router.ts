import { useEffect, useState } from 'react';

// 곡·톤 상세 경로는 해당 단계에서 추가한다.
export type Route =
  | { name: 'songs' }
  | { name: 'gear' }
  | { name: 'gearNew' }
  | { name: 'gearEdit'; id: string }
  | { name: 'recipes' }
  | { name: 'data' }
  | { name: 'notFound'; path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0] || '/';
  const clean = path.replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/':
      return { name: 'songs' };
    case '/gear':
      return { name: 'gear' };
    case '/gear/new':
      return { name: 'gearNew' };
    case '/recipes':
      return { name: 'recipes' };
    case '/data':
      return { name: 'data' };
  }
  const gearEdit = clean.match(/^\/gear\/([^/]+)\/edit$/);
  if (gearEdit) return { name: 'gearEdit', id: decodeURIComponent(gearEdit[1]) };
  return { name: 'notFound', path };
}

/**
 * 화면 이탈 가드. 현재 화면이 이동을 막으면(false) 주소를 되돌리고 화면을 유지한다.
 * 가드를 건 화면이 사용자 확인 후 `location.hash = target`으로 다시 이동한다.
 */
type LeaveGuard = (targetHash: string) => boolean;
let leaveGuard: LeaveGuard | null = null;

export function setLeaveGuard(guard: LeaveGuard | null): void {
  leaveGuard = guard;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    let currentHash = window.location.hash;
    const onChange = () => {
      const target = window.location.hash;
      if (target === currentHash) return;
      if (leaveGuard && !leaveGuard(target)) {
        // shortcut: 뒤로가기로 막힌 경우 앞쪽 기록이 하나 남는다. 기록 조작이 더 필요해지면 다시 본다.
        history.replaceState(null, '', currentHash || '#/');
        return;
      }
      currentHash = target;
      setRoute(parseHash(target));
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
