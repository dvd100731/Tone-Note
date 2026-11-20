import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { canSaveAfter, commitChange, getBrowserStorage, loadData, type CommitResult, type LoadResult } from './storage';

interface AppDataValue {
  data: AppData;
  load: LoadResult;
  canSave: boolean;
  /**
   * 데이터를 바꾸고 저장한다. 저장에 실패하면 화면 데이터도 바꾸지 않는다.
   * 저장이 막힌 상태에서는 화면에만 반영한다(memoryOnly). 호출한 화면이 결과를 사용자에게 알린다.
   */
  update: (change: (current: AppData) => AppData) => CommitResult;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  // 첫 렌더 전에 동기로 읽는다. 저장은 update에서만 일어나므로 읽기 전에 덮어쓰는 경로가 없다.
  const [{ storage, load }] = useState(() => {
    const storage = getBrowserStorage();
    return { storage, load: loadData(storage) };
  });
  const [data, setData] = useState(load.data);
  const dataRef = useRef(data);
  const canSave = canSaveAfter(load.status);

  const update: AppDataValue['update'] = (change) => {
    const current = dataRef.current;
    const result = commitChange(storage, canSave, current, change(current));
    dataRef.current = result.data;
    setData(result.data);
    return result;
  };

  return <AppDataContext.Provider value={{ data, load, canSave, update }}>{children}</AppDataContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- Provider와 훅을 한 파일에 둔다
export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData는 AppDataProvider 안에서만 쓸 수 있습니다.');
  return value;
}
