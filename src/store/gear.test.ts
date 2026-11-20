import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type AppData, type Gear } from '../types';
import { countTonesUsingGear, deleteGear, gearToDraft, newControlDraft, saveGear, validateGearDraft, type GearDraft } from './gear';

const T0 = '2026-11-20T00:00:00.000Z';
const T1 = '2026-11-21T00:00:00.000Z';

const amp: Gear = {
  id: 'g1',
  name: '베이스 앰프',
  instruments: ['bass'],
  kind: 'amp',
  controls: [
    { id: 'c1', name: 'Gain', type: 'knob', min: 0, max: 10, step: 0.5 },
    { id: 'c2', name: 'Mid Freq', type: 'select', options: ['250Hz', '500Hz'] },
  ],
  createdAt: T0,
  updatedAt: T0,
};

const data: AppData = {
  schemaVersion: SCHEMA_VERSION,
  gears: [amp],
  songs: [{ id: 's1', title: '곡', createdAt: T0, updatedAt: T0 }],
  tones: [
    {
      id: 't1',
      songId: 's1',
      instrument: 'bass',
      name: '기본',
      chain: [
        {
          sourceGearId: 'g1',
          name: '베이스 앰프',
          kind: 'amp',
          enabled: true,
          controls: [{ id: 'c1', name: 'Gain', type: 'knob', min: 0, max: 10, step: 0.5, value: 4 }],
        },
      ],
      createdAt: T0,
      updatedAt: T0,
    },
  ],
};

function validDraft(): GearDraft {
  return { ...gearToDraft(undefined), name: '페달', instruments: ['guitar'], kind: 'pedal' };
}

function errorsOf(draft: GearDraft) {
  const result = validateGearDraft(draft);
  return result.ok ? {} : result.errors;
}

describe('validateGearDraft', () => {
  it('공백뿐인 장비 이름은 거부한다', () => {
    expect(errorsOf({ ...validDraft(), name: '   ' })).toHaveProperty('name');
  });

  it('사용 악기가 없으면 거부한다', () => {
    expect(errorsOf({ ...validDraft(), instruments: [] })).toHaveProperty('instruments');
  });

  it('공백뿐인 조절 항목 이름은 거부한다', () => {
    const control = { ...newControlDraft('c'), name: '  ' };
    expect(errorsOf({ ...validDraft(), controls: [control] })).toHaveProperty('c.name');
  });

  it.each([
    ['최소 빈칸', { min: '' }, 'c.min'],
    ['최소 문자', { min: 'abc' }, 'c.min'],
    ['최대 무한대', { max: 'Infinity' }, 'c.max'],
    ['최소 = 최대', { min: '5', max: '5' }, 'c.max'],
    ['최소 > 최대', { min: '6', max: '5' }, 'c.max'],
    ['간격 0', { step: '0' }, 'c.step'],
    ['간격 음수', { step: '-1' }, 'c.step'],
    ['간격 NaN', { step: 'NaN' }, 'c.step'],
  ])('숫자 항목: %s → 거부', (_, change, key) => {
    const control = { ...newControlDraft('c'), name: 'Gain', ...change };
    expect(errorsOf({ ...validDraft(), controls: [control] })).toHaveProperty(key);
  });

  it('숫자 항목: 음수 범위와 소수 간격은 허용하고 숫자로 바꾼다', () => {
    const control = { ...newControlDraft('c'), name: 'Level', min: '-12', max: ' 12 ', step: '0.5', unit: ' dB ' };
    const result = validateGearDraft({ ...validDraft(), controls: [control] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.controls[0]).toEqual({ id: 'c', name: 'Level', type: 'knob', min: -12, max: 12, step: 0.5, unit: 'dB' });
  });

  it('선택지 항목: 빈 목록(공백 줄만 포함)은 거부한다', () => {
    const control = { ...newControlDraft('c'), name: 'Mode', type: 'select' as const, optionsText: ' \n\n ' };
    expect(errorsOf({ ...validDraft(), controls: [control] })).toHaveProperty('c.options');
  });

  it('선택지 항목: 줄마다 다듬고 빈 줄은 뺀다. 숫자 입력값은 저장하지 않는다', () => {
    const control = { ...newControlDraft('c'), name: 'Mode', type: 'select' as const, optionsText: ' A \n\nB\n' };
    const result = validateGearDraft({ ...validDraft(), controls: [control] });
    expect(result.ok && result.value.controls[0]).toEqual({ id: 'c', name: 'Mode', type: 'select', options: ['A', 'B'] });
  });

  it('켜기/끄기·텍스트 항목은 이름만 있으면 된다', () => {
    const controls = [
      { ...newControlDraft('a'), name: 'Bright', type: 'switch' as const, min: 'x' },
      { ...newControlDraft('b'), name: '메모', type: 'text' as const },
    ];
    expect(validateGearDraft({ ...validDraft(), controls }).ok).toBe(true);
  });
});

describe('saveGear', () => {
  it('새 장비는 받은 ID와 생성 시각으로 추가한다', () => {
    const result = validateGearDraft(validDraft());
    if (!result.ok) throw new Error('draft should be valid');
    const next = saveGear(data, result.value, undefined, 'new-id', T1);
    expect(next.gears).toHaveLength(2);
    expect(next.gears[1]).toMatchObject({ id: 'new-id', name: '페달', createdAt: T1, updatedAt: T1 });
  });

  it('수정 시 장비 ID·조절 항목 ID·생성 시각을 유지하고 수정 시각만 바꾼다', () => {
    const draft = gearToDraft(amp);
    draft.name = '새 이름';
    draft.controls[0].name = 'Drive';
    draft.controls.reverse();
    const result = validateGearDraft(draft);
    if (!result.ok) throw new Error('draft should be valid');
    const next = saveGear(data, result.value, amp, 'unused-id', T1);
    const saved = next.gears[0];
    expect(saved.id).toBe('g1');
    expect(saved.createdAt).toBe(T0);
    expect(saved.updatedAt).toBe(T1);
    expect(saved.controls.map((c) => c.id)).toEqual(['c2', 'c1']);
    expect(next.gears.map((g) => g.id)).toEqual(['g1']);
  });

  it('장비를 수정해도 기존 톤 스냅샷은 그대로다', () => {
    const before = structuredClone(data.tones);
    const draft = gearToDraft(amp);
    draft.name = '이름 변경';
    draft.controls = [];
    const result = validateGearDraft(draft);
    if (!result.ok) throw new Error('draft should be valid');
    const next = saveGear(data, result.value, amp, 'x', T1);
    expect(next.tones).toEqual(before);
  });

  it('원본 데이터를 바꾸지 않는다', () => {
    const snapshot = structuredClone(data);
    const result = validateGearDraft(gearToDraft(amp));
    if (!result.ok) throw new Error('draft should be valid');
    saveGear(data, result.value, amp, 'x', T1);
    expect(data).toEqual(snapshot);
  });
});

describe('deleteGear', () => {
  it('장비만 지우고 그 장비를 쓴 톤 스냅샷은 그대로 둔다', () => {
    const before = structuredClone(data.tones);
    expect(countTonesUsingGear(data, 'g1')).toBe(1);
    const next = deleteGear(data, 'g1');
    expect(next.gears).toEqual([]);
    expect(next.tones).toEqual(before);
    expect(data.gears).toHaveLength(1);
  });

  it('없는 ID는 아무것도 지우지 않는다', () => {
    expect(deleteGear(data, 'nope').gears).toEqual(data.gears);
  });
});

describe('gearToDraft', () => {
  it('저장된 장비를 편집 상태로 바꾸고 다시 검증하면 같은 값이 된다', () => {
    const result = validateGearDraft(gearToDraft(amp));
    expect(result.ok && result.value).toEqual({
      name: amp.name,
      instruments: amp.instruments,
      kind: amp.kind,
      controls: amp.controls,
    });
  });
});
