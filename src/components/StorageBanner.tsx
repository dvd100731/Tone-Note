import { useAppData } from '../store/AppDataContext';
import type { LoadStatus } from '../store/storage';

const LOAD_MESSAGES: Partial<Record<LoadStatus, string>> = {
  corrupt: '저장된 데이터를 읽지 못했습니다. 기존 데이터를 지키기 위해 이번 실행에서는 저장하지 않습니다.',
  unsupported: '더 새 버전의 앱에서 저장한 데이터입니다. 기존 데이터를 지키기 위해 이번 실행에서는 저장하지 않습니다.',
  unavailable: '브라우저 저장소를 사용할 수 없습니다(비공개 모드나 저장소 차단). 이번 실행의 변경은 저장되지 않습니다.',
};

// 저장 실패는 저장을 시도한 화면에서 알린다(그 화면의 편집 내용을 유지하기 위해).
export function StorageBanner() {
  const { load } = useAppData();
  const message = LOAD_MESSAGES[load.status];
  if (!message) return null;

  return (
    <div className="banner" role="alert">
      <p>
        {message}
        {load.detail && <span className="banner-detail">원인: {load.detail}</span>}
      </p>
    </div>
  );
}
