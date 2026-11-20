// 저장 형식이 바뀌면 올리고, 이전 버전을 읽는 변환을 storage.ts에 추가한다.
export const SCHEMA_VERSION = 1;

export const INSTRUMENTS = ['bass', 'guitar', 'keys'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  bass: '베이스',
  guitar: '일렉기타',
  keys: '건반',
};

export const CONTROL_TYPES = ['knob', 'switch', 'select', 'text'] as const;
export type ControlType = (typeof CONTROL_TYPES)[number];

export interface Control {
  id: string;
  name: string;
  type: ControlType;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  unit?: string;
}

export const GEAR_KINDS = ['instrument', 'amp', 'pedal', 'multi', 'synth', 'other'] as const;
export type GearKind = (typeof GEAR_KINDS)[number];

export interface Gear {
  id: string;
  name: string;
  instruments: Instrument[];
  kind: GearKind;
  controls: Control[];
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export type ControlValue = number | boolean | string;

/** 톤 작성 당시의 조절 항목 정의 + 값. 원본 장비가 바뀌어도 유지된다. */
export interface ControlSnapshot extends Control {
  value: ControlValue | null;
}

/** 톤 작성 당시의 장비 정보. 원본 장비가 수정·삭제되어도 유지된다. */
export interface GearSnapshot {
  sourceGearId: string | null;
  name: string;
  kind: GearKind;
  enabled: boolean;
  controls: ControlSnapshot[];
}

export interface ToneSetting {
  id: string;
  songId: string;
  instrument: Instrument;
  name: string;
  chain: GearSnapshot[];
  recipeId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION;
  gears: Gear[];
  songs: Song[];
  tones: ToneSetting[];
}
