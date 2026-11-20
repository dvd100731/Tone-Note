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
    // 기록마다 순번을 붙여, 막힌 이동이 새 기록(링크)인지 뒤로/앞으로인지 구분해 원래 자리로 되돌린다.
    const stateIdx = () => {
      const idx = (history.state as { idx?: unknown } | null)?.idx;
      return typeof idx === 'number' ? idx : null;
    };
    let currentHash = window.location.hash;
    let currentIdx = stateIdx() ?? 0;
    history.replaceState({ idx: currentIdx }, '');

    const onChange = () => {
      const target = window.location.hash;
      if (target === currentHash) return; // 되돌리기로 돌아온 경우 포함
      const targetIdx = stateIdx();
      if (leaveGuard && !leaveGuard(target)) {
        if (targetIdx === null) history.back();
        else if (targetIdx !== currentIdx) history.go(currentIdx - targetIdx);
        else history.replaceState({ idx: currentIdx }, '', currentHash || '#/');
        return;
      }
      currentIdx = targetIdx ?? currentIdx + 1;
      if (targetIdx === null) history.replaceState({ idx: currentIdx }, '');
      currentHash = target;
      setRoute(parseHash(target));
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
