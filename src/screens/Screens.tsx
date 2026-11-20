import type { ReactNode } from 'react';
import { useAppData } from '../store/AppDataContext';

// 1단계 골격. 각 화면은 해당 단계에서 별도 파일로 채운다.

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="screen">
      <h1>{title}</h1>
      {children}
    </main>
  );
}

export function SongsScreen() {
  const { data } = useAppData();
  return (
    <Screen title="곡">
      <p className="muted">저장된 곡 {data.songs.length}개 · 톤 설정 {data.tones.length}개</p>
      <p className="empty">곡 추가와 톤 기록은 다음 단계에서 열립니다.</p>
    </Screen>
  );
}

export function RecipesScreen() {
  return (
    <Screen title="기본 레시피">
      <p className="empty">베이스·일렉기타·건반별 기본 레시피가 여기에 표시됩니다.</p>
    </Screen>
  );
}

export function DataScreen() {
  const { load, canSave } = useAppData();
  return (
    <Screen title="데이터">
      <dl className="facts">
        <dt>저장 위치</dt>
        <dd>이 브라우저 (로그인 없음)</dd>
        <dt>불러오기 상태</dt>
        <dd>{load.status === 'ok' ? '정상' : load.status === 'empty' ? '저장된 데이터 없음' : '실패'}</dd>
        <dt>자동 저장</dt>
        <dd>{canSave ? '켜짐' : '꺼짐 (기존 데이터 보호)'}</dd>
      </dl>
      <p className="empty">JSON 내보내기·가져오기는 다음 단계에서 열립니다.</p>
    </Screen>
  );
}

export function NotFoundScreen({ path }: { path: string }) {
  return (
    <Screen title="찾을 수 없는 화면">
      <p className="muted">{path}</p>
      <a className="button" href="#/">곡 목록으로</a>
    </Screen>
  );
}
