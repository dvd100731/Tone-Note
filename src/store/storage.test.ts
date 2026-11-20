import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type AppData } from '../types';
import { STORAGE_KEY, canSaveAfter, commitChange, emptyData, loadData, parseAppData, saveData, type KeyValueStorage } from './storage';

class FakeStorage implements KeyValueStorage {
  items = new Map<string, string>();
  failGet = false;
  failSet = false;
  getItem(key: string) {
    if (this.failGet) throw new Error('get blocked');
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failSet) throw new DOMException('full', 'QuotaExceededError');
    this.items.set(key, value);
  }
}

const sample: AppData = {
  schemaVersion: SCHEMA_VERSION,
  gears: [
    {
      id: 'g1',
      name: '내 베이스 앰프',
      instruments: ['bass'],
      kind: 'amp',
      controls: [
        { id: 'c1', name: 'Gain', type: 'knob', min: 0, max: 10, step: 0.5 },
        { id: 'c2', name: 'Mid Freq', type: 'select', options: ['250Hz', '500Hz'] },
      ],
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    },
  ],
  songs: [{ id: 's1', title: '연습곡', artist: '아무개', createdAt: 'x', updatedAt: 'x' }],
  tones: [
    {
      id: 't1',
      songId: 's1',
      instrument: 'bass',
      name: '기본',
      chain: [
        {
          sourceGearId: null,
          name: '지금은 없는 장비',
          kind: 'amp',
          enabled: true,
          controls: [
            { id: 'c1', name: 'Gain', type: 'knob', value: 3.5 },
            { id: 'c3', name: 'Bright', type: 'switch', value: true },
            { id: 'c4', name: '메모', type: 'text', value: null },
          ],
        },
      ],
      createdAt: 'x',
      updatedAt: 'x',
    },
  ],
};

describe('loadData', () => {
  it('저장된 데이터가 없으면 빈 데이터로 시작하고 저장을 허용한다', () => {
    const result = loadData(new FakeStorage());
    expect(result.status).toBe('empty');
    expect(result.data).toEqual(emptyData());
    expect(canSaveAfter(result.status)).toBe(true);
  });

  it('저장한 데이터를 그대로 다시 읽는다', () => {
    const storage = new FakeStorage();
    expect(saveData(storage, sample)).toEqual({ ok: true });
    const result = loadData(storage);
    expect(result.status).toBe('ok');
    expect(result.data).toEqual(sample);
  });

  it('JSON이 아닌 내용은 corrupt로 보고하고 원본을 건드리지 않는다', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, '{not json');
    const result = loadData(storage);
    expect(result.status).toBe('corrupt');
    expect(canSaveAfter(result.status)).toBe(false);
    expect(storage.items.get(STORAGE_KEY)).toBe('{not json');
  });

  it('형식이 맞지 않으면 corrupt로 보고하고 위치를 알려준다', () => {
    const storage = new FakeStorage();
    const broken = structuredClone(sample) as unknown as { songs: { title: unknown }[] };
    broken.songs[0].title = 42;
    storage.items.set(STORAGE_KEY, JSON.stringify(broken));
    const result = loadData(storage);
    expect(result.status).toBe('corrupt');
    expect(result.detail).toContain('songs[0].title');
    expect(canSaveAfter(result.status)).toBe(false);
  });

  it('더 높은 스키마 버전은 unsupported로 보고하고 저장을 막는다', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, JSON.stringify({ ...sample, schemaVersion: SCHEMA_VERSION + 1 }));
    const result = loadData(storage);
    expect(result.status).toBe('unsupported');
    expect(canSaveAfter(result.status)).toBe(false);
  });

  it('저장소를 읽다가 예외가 나면 unavailable로 보고한다', () => {
    const storage = new FakeStorage();
    storage.failGet = true;
    const result = loadData(storage);
    expect(result.status).toBe('unavailable');
    expect(canSaveAfter(result.status)).toBe(false);
  });

  it('저장소 자체가 없으면 unavailable로 보고한다', () => {
    expect(loadData(null).status).toBe('unavailable');
  });
});

describe('saveData', () => {
  it('저장 실패 시 이유를 돌려주고 이전 저장본을 유지한다', () => {
    const storage = new FakeStorage();
    saveData(storage, sample);
    const before = storage.items.get(STORAGE_KEY);
    storage.failSet = true;
    const result = saveData(storage, emptyData());
    expect(result).toEqual({ ok: false, detail: '저장 공간이 부족합니다.' });
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('저장소가 없으면 실패를 돌려준다', () => {
    expect(saveData(null, sample).ok).toBe(false);
  });
});

describe('commitChange', () => {
  it('저장에 성공하면 새 데이터를 돌려준다', () => {
    const storage = new FakeStorage();
    const result = commitChange(storage, true, emptyData(), sample);
    expect(result.status).toBe('saved');
    expect(result.data).toBe(sample);
    expect(loadData(storage).data).toEqual(sample);
  });

  it('저장에 실패하면 failed와 이전 데이터를 돌려주고 저장본도 그대로다', () => {
    const storage = new FakeStorage();
    saveData(storage, sample);
    const before = storage.items.get(STORAGE_KEY);
    storage.failSet = true;
    const current = sample;
    const result = commitChange(storage, true, current, emptyData());
    expect(result.status).toBe('failed');
    expect(result.data).toBe(current);
    expect(storage.items.get(STORAGE_KEY)).toBe(before);
  });

  it('저장이 막힌 상태에서는 저장소에 쓰지 않고 memoryOnly로 반영한다', () => {
    const storage = new FakeStorage();
    storage.items.set(STORAGE_KEY, '{broken');
    const result = commitChange(storage, false, emptyData(), sample);
    expect(result.status).toBe('memoryOnly');
    expect(result.data).toBe(sample);
    expect(storage.items.get(STORAGE_KEY)).toBe('{broken');
  });
});

describe('parseAppData', () => {
  it.each([
    ['null', null],
    ['배열', []],
    ['버전 없음', { gears: [], songs: [], tones: [] }],
    ['버전 0', { schemaVersion: 0, gears: [], songs: [], tones: [] }],
    ['배열 누락', { schemaVersion: 1, gears: [], songs: [] }],
    ['알 수 없는 악기', { ...sample, tones: [{ ...sample.tones[0], instrument: 'drums' }] }],
    ['스냅샷 값 타입 오류', {
      ...sample,
      tones: [{ ...sample.tones[0], chain: [{ ...sample.tones[0].chain[0], controls: [{ id: 'c', name: 'n', type: 'knob', value: {} }] }] }],
    }],
  ])('%s → invalid', (_, value) => {
    const result = parseAppData(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid');
  });
});
