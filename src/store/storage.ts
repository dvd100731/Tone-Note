import {
  CONTROL_TYPES,
  GEAR_KINDS,
  INSTRUMENTS,
  SCHEMA_VERSION,
  type AppData,
} from '../types';

export const STORAGE_KEY = 'tonenote:v1';

/** 테스트에서 가짜 저장소를 넣을 수 있도록 필요한 메서드만 받는다. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type LoadStatus = 'empty' | 'ok' | 'corrupt' | 'unsupported' | 'unavailable';

export interface LoadResult {
  status: LoadStatus;
  data: AppData;
  detail?: string;
}

export type SaveResult = { ok: true } | { ok: false; detail: string };

export type ParseResult =
  | { ok: true; data: AppData }
  | { ok: false; reason: 'invalid' | 'unsupported'; detail: string };

export function emptyData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, gears: [], songs: [], tones: [] };
}

/** 읽기에 성공했을 때만 저장을 허용한다. 실패 상태에서 저장하면 원본을 빈 데이터로 덮어쓴다. */
export function canSaveAfter(status: LoadStatus): boolean {
  return status === 'ok' || status === 'empty';
}

export function getBrowserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadData(storage: KeyValueStorage | null): LoadResult {
  if (!storage) {
    return { status: 'unavailable', data: emptyData(), detail: '브라우저 저장소에 접근할 수 없습니다.' };
  }
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    return { status: 'unavailable', data: emptyData(), detail: errorText(error) };
  }
  if (raw === null) return { status: 'empty', data: emptyData() };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', data: emptyData(), detail: '저장된 내용이 JSON 형식이 아닙니다.' };
  }
  const parsed = parseAppData(json);
  if (!parsed.ok) {
    return {
      status: parsed.reason === 'unsupported' ? 'unsupported' : 'corrupt',
      data: emptyData(),
      detail: parsed.detail,
    };
  }
  return { status: 'ok', data: parsed.data };
}

export function saveData(storage: KeyValueStorage | null, data: AppData): SaveResult {
  if (!storage) return { ok: false, detail: '브라우저 저장소에 접근할 수 없습니다.' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: errorText(error) };
  }
}

export type CommitResult =
  | { status: 'saved'; data: AppData }
  | { status: 'memoryOnly'; data: AppData }
  | { status: 'failed'; data: AppData; detail: string };

/**
 * 바뀐 데이터를 먼저 저장하고, 성공했을 때만 새 데이터를 돌려준다.
 * 저장이 막힌 상태(읽기 실패)에서는 이번 실행의 화면에만 반영한다.
 * 저장 실패 시 이전 데이터를 돌려주므로 화면도 저장소와 어긋나지 않는다.
 */
export function commitChange(storage: KeyValueStorage | null, canSave: boolean, current: AppData, next: AppData): CommitResult {
  if (!canSave) return { status: 'memoryOnly', data: next };
  const result = saveData(storage, next);
  return result.ok ? { status: 'saved', data: next } : { status: 'failed', data: current, detail: result.detail };
}

function errorText(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return '저장 공간이 부족합니다.';
  }
  return error instanceof Error ? error.message : String(error);
}

// ---- 검증: 저장소와 가져오기 파일은 신뢰할 수 없는 입력으로 다룬다 ----

class Invalid extends Error {}

type Obj = Record<string, unknown>;

function obj(value: unknown, at: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Invalid(`${at}: 객체가 아닙니다`);
  return value as Obj;
}
function str(o: Obj, key: string, at: string): void {
  if (typeof o[key] !== 'string') throw new Invalid(`${at}.${key}: 문자열이 아닙니다`);
}
function optStr(o: Obj, key: string, at: string): void {
  if (o[key] !== undefined) str(o, key, at);
}
function optNum(o: Obj, key: string, at: string): void {
  if (o[key] !== undefined && (typeof o[key] !== 'number' || !Number.isFinite(o[key]))) {
    throw new Invalid(`${at}.${key}: 숫자가 아닙니다`);
  }
}
function oneOf(o: Obj, key: string, allowed: readonly string[], at: string): void {
  if (!allowed.includes(o[key] as string)) throw new Invalid(`${at}.${key}: 허용되지 않는 값입니다`);
}
function arr(o: Obj, key: string, at: string): unknown[] {
  if (!Array.isArray(o[key])) throw new Invalid(`${at}.${key}: 배열이 아닙니다`);
  return o[key] as unknown[];
}
function stamps(o: Obj, at: string): void {
  str(o, 'createdAt', at);
  str(o, 'updatedAt', at);
}

function checkControl(value: unknown, at: string): Obj {
  const c = obj(value, at);
  str(c, 'id', at);
  str(c, 'name', at);
  oneOf(c, 'type', CONTROL_TYPES, at);
  optNum(c, 'min', at);
  optNum(c, 'max', at);
  optNum(c, 'step', at);
  optStr(c, 'unit', at);
  if (c.options !== undefined) {
    arr(c, 'options', at).forEach((option, i) => {
      if (typeof option !== 'string') throw new Invalid(`${at}.options[${i}]: 문자열이 아닙니다`);
    });
  }
  return c;
}

function checkGear(value: unknown, at: string): void {
  const g = obj(value, at);
  str(g, 'id', at);
  str(g, 'name', at);
  oneOf(g, 'kind', GEAR_KINDS, at);
  arr(g, 'instruments', at).forEach((inst, i) => {
    if (!INSTRUMENTS.includes(inst as never)) throw new Invalid(`${at}.instruments[${i}]: 허용되지 않는 값입니다`);
  });
  arr(g, 'controls', at).forEach((c, i) => checkControl(c, `${at}.controls[${i}]`));
  optStr(g, 'memo', at);
  stamps(g, at);
}

function checkSong(value: unknown, at: string): void {
  const s = obj(value, at);
  str(s, 'id', at);
  str(s, 'title', at);
  optStr(s, 'artist', at);
  optStr(s, 'memo', at);
  stamps(s, at);
}

function checkTone(value: unknown, at: string): void {
  const t = obj(value, at);
  str(t, 'id', at);
  str(t, 'songId', at);
  str(t, 'name', at);
  oneOf(t, 'instrument', INSTRUMENTS, at);
  optStr(t, 'recipeId', at);
  optStr(t, 'notes', at);
  stamps(t, at);
  arr(t, 'chain', at).forEach((value, i) => {
    const gat = `${at}.chain[${i}]`;
    const g = obj(value, gat);
    if (g.sourceGearId !== null) str(g, 'sourceGearId', gat);
    str(g, 'name', gat);
    oneOf(g, 'kind', GEAR_KINDS, gat);
    if (typeof g.enabled !== 'boolean') throw new Invalid(`${gat}.enabled: 참/거짓 값이 아닙니다`);
    arr(g, 'controls', gat).forEach((value, j) => {
      const cat = `${gat}.controls[${j}]`;
      const c = checkControl(value, cat);
      const v = c.value;
      const okValue = v === null || typeof v === 'boolean' || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
      if (!okValue) throw new Invalid(`${cat}.value: 허용되지 않는 값입니다`);
    });
  });
}

/** 알 수 없는 JSON 값을 검사해 AppData로 받아들인다. 추가 필드는 그대로 둔다. */
export function parseAppData(value: unknown): ParseResult {
  try {
    const root = obj(value, 'data');
    const version = root.schemaVersion;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      throw new Invalid('data.schemaVersion: 올바른 버전이 아닙니다');
    }
    if (version > SCHEMA_VERSION) {
      return {
        ok: false,
        reason: 'unsupported',
        detail: `더 새 버전(${version})의 데이터입니다. 이 앱은 버전 ${SCHEMA_VERSION}까지 읽을 수 있습니다.`,
      };
    }
    arr(root, 'gears', 'data').forEach((g, i) => checkGear(g, `gears[${i}]`));
    arr(root, 'songs', 'data').forEach((s, i) => checkSong(s, `songs[${i}]`));
    arr(root, 'tones', 'data').forEach((t, i) => checkTone(t, `tones[${i}]`));
    return { ok: true, data: root as unknown as AppData };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, reason: 'invalid', detail: error.message };
    throw error;
  }
}
