// randomUUID는 보안 컨텍스트(https, localhost)에서만 있다. 휴대폰에서 LAN IP(http)로 열 때를 대비한다.
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
