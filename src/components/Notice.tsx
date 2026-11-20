import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// 화면을 옮긴 뒤에도 보이는 짧은 결과 알림(예: 저장했습니다).
const NoticeContext = createContext<(message: string) => void>(() => {});

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; key: number } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <NoticeContext.Provider value={(message) => setNotice({ message, key: Date.now() })}>
      {children}
      <div className="notice-area" role="status" aria-live="polite">
        {notice && (
          <p key={notice.key} className="notice">
            {notice.message}
          </p>
        )}
      </div>
    </NoticeContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- Provider와 훅을 한 파일에 둔다
export function useNotice() {
  return useContext(NoticeContext);
}
