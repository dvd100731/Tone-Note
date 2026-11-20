import type { AppData, Control, ControlType, Gear, GearKind, Instrument } from '../types';

export const GEAR_KIND_LABELS: Record<GearKind, string> = {
  instrument: '악기 본체',
  amp: '앰프',
  pedal: '이펙터 페달',
  multi: '멀티 이펙터',
  synth: '신시사이저·키보드',
  other: '그 밖의 장비',
};

export const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  knob: '숫자',
  switch: '켜기/끄기',
  select: '선택지',
  text: '텍스트',
};

/** 편집 화면의 입력 상태. 숫자는 입력 중 값을 그대로 두려고 문자열로 갖는다. */
export interface ControlDraft {
  id: string;
  name: string;
  type: ControlType;
  min: string;
  max: string;
  step: string;
  unit: string;
  optionsText: string; // 한 줄에 선택지 하나
}

export interface GearDraft {
  name: string;
  instruments: Instrument[];
  kind: GearKind;
  memo: string;
  controls: ControlDraft[];
}

export type GearFields = Pick<Gear, 'name' | 'instruments' | 'kind' | 'controls' | 'memo'>;

/** 오류 키: 'name', 'instruments', `${controlId}.name|min|max|step|options` */
export type DraftErrors = Record<string, string>;

export function newControlDraft(id: string): ControlDraft {
  return { id, name: '', type: 'knob', min: '0', max: '10', step: '1', unit: '', optionsText: '' };
}

export function gearToDraft(gear: Gear | undefined): GearDraft {
  if (!gear) return { name: '', instruments: [], kind: 'amp', memo: '', controls: [] };
  return {
    name: gear.name,
    instruments: [...gear.instruments],
    kind: gear.kind,
    memo: gear.memo ?? '',
    controls: gear.controls.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      min: String(c.min ?? 0),
      max: String(c.max ?? 10),
      step: String(c.step ?? 1),
      unit: c.unit ?? '',
      optionsText: (c.options ?? []).join('\n'),
    })),
  };
}

function toNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.trim());
  return Number.isFinite(n) ? n : null;
}

export function validateGearDraft(draft: GearDraft): { ok: true; value: GearFields } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = '장비 이름을 입력해 주세요.';
  if (draft.instruments.length === 0) errors.instruments = '사용 악기를 하나 이상 골라 주세요.';

  const controls: Control[] = draft.controls.map((d) => {
    const control: Control = { id: d.id, name: d.name.trim(), type: d.type };
    if (!control.name) errors[`${d.id}.name`] = '항목 이름을 입력해 주세요.';
    if (d.unit.trim()) control.unit = d.unit.trim();

    if (d.type === 'knob') {
      const min = toNumber(d.min);
      const max = toNumber(d.max);
      const step = toNumber(d.step);
      if (min === null) errors[`${d.id}.min`] = '최소값은 숫자여야 합니다.';
      if (max === null) errors[`${d.id}.max`] = '최대값은 숫자여야 합니다.';
      else if (min !== null && min >= max) errors[`${d.id}.max`] = '최대값은 최소값보다 커야 합니다.';
      if (step === null) errors[`${d.id}.step`] = '간격은 숫자여야 합니다.';
      else if (step <= 0) errors[`${d.id}.step`] = '간격은 0보다 커야 합니다.';
      Object.assign(control, { min, max, step });
    }
    if (d.type === 'select') {
      const options = d.optionsText.split('\n').map((o) => o.trim()).filter(Boolean);
      if (options.length === 0) errors[`${d.id}.options`] = '선택지를 하나 이상 입력해 주세요.';
      control.options = options;
    }
    return control;
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const value: GearFields = { name, instruments: draft.instruments, kind: draft.kind, controls };
  if (draft.memo.trim()) value.memo = draft.memo.trim();
  return { ok: true, value };
}

/** 새 장비면 id·createdAt을 새로 만들고, 기존 장비면 그대로 둔다. */
export function saveGear(data: AppData, fields: GearFields, existing: Gear | undefined, newId: string, now: string): AppData {
  if (existing) {
    const updated: Gear = { ...fields, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
    return { ...data, gears: data.gears.map((g) => (g.id === existing.id ? updated : g)) };
  }
  const created: Gear = { ...fields, id: newId, createdAt: now, updatedAt: now };
  return { ...data, gears: [...data.gears, created] };
}

/** 톤은 장비 스냅샷을 갖고 있으므로 건드리지 않는다. */
export function deleteGear(data: AppData, gearId: string): AppData {
  return { ...data, gears: data.gears.filter((g) => g.id !== gearId) };
}

export function countTonesUsingGear(data: AppData, gearId: string): number {
  return data.tones.filter((t) => t.chain.some((g) => g.sourceGearId === gearId)).length;
}
