import { useState } from 'react';
import { useAppData } from '../store/AppDataContext';
import { GEAR_KIND_LABELS } from '../store/gear';
import { INSTRUMENT_LABELS, INSTRUMENTS, type Instrument } from '../types';

type Filter = Instrument | 'all';

export function GearListScreen() {
  const { data } = useAppData();
  const [filter, setFilter] = useState<Filter>('all');
  const gears = filter === 'all' ? data.gears : data.gears.filter((g) => g.instruments.includes(filter));

  return (
    <main className="screen">
      <div className="screen-head">
        <h1>내 장비</h1>
        <a className="button" href="#/gear/new">
          장비 추가
        </a>
      </div>

      <div className="chips" role="group" aria-label="악기로 거르기">
        {(['all', ...INSTRUMENTS] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? '전체' : INSTRUMENT_LABELS[value]}
          </button>
        ))}
      </div>

      {data.gears.length === 0 ? (
        <p className="empty">
          아직 등록한 장비가 없습니다. 앰프·페달·키보드 등 내 장비와 노브 이름을 등록해 두면 톤을 기록할 때 불러올 수 있습니다.
        </p>
      ) : gears.length === 0 ? (
        <p className="empty">{INSTRUMENT_LABELS[filter as Instrument]}에 쓰는 장비가 없습니다.</p>
      ) : (
        <ul className="card-list">
          {gears.map((gear) => (
            <li key={gear.id}>
              <a className="card" href={`#/gear/${encodeURIComponent(gear.id)}/edit`}>
                <strong>{gear.name}</strong>
                <span className="muted-line">
                  {GEAR_KIND_LABELS[gear.kind]} · {gear.instruments.map((i) => INSTRUMENT_LABELS[i]).join(', ')} · 조절 항목{' '}
                  {gear.controls.length}개
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
