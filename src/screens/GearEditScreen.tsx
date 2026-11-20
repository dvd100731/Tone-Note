import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNotice } from '../components/Notice';
import { createId } from '../lib/id';
import { setLeaveGuard } from '../lib/router';
import { useAppData } from '../store/AppDataContext';
import {
  CONTROL_TYPE_LABELS,
  GEAR_KIND_LABELS,
  countTonesUsingGear,
  deleteGear,
  gearToDraft,
  newControlDraft,
  saveGear,
  validateGearDraft,
  type ControlDraft,
  type DraftErrors,
  type GearDraft,
} from '../store/gear';
import type { CommitResult } from '../store/storage';
import { CONTROL_TYPES, GEAR_KINDS, INSTRUMENT_LABELS, INSTRUMENTS, type Gear } from '../types';

export function GearEditScreen({ id }: { id?: string }) {
  const { data } = useAppData();
  const existing = id === undefined ? undefined : data.gears.find((g) => g.id === id);

  if (id !== undefined && !existing) {
    return (
      <main className="screen">
        <h1>장비를 찾을 수 없습니다</h1>
        <p className="muted">삭제되었거나 주소가 잘못되었습니다.</p>
        <a className="button" href="#/gear">
          장비 목록으로
        </a>
      </main>
    );
  }
  return <GearForm key={id ?? 'new'} existing={existing} />;
}

function successMessage(result: CommitResult, saved: string): string {
  return result.status === 'memoryOnly' ? `${saved} 단, 저장이 꺼져 있어 이번 실행에서만 반영됩니다.` : saved;
}

function GearForm({ existing }: { existing: Gear | undefined }) {
  const { data, update } = useAppData();
  const notify = useNotice();
  const [initial] = useState(() => JSON.stringify(gearToDraft(existing)));
  const [draft, setDraft] = useState<GearDraft>(() => JSON.parse(initial));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);

  // 가드·beforeunload는 렌더 밖에서 읽으므로 ref로 둔다. 저장·삭제 성공 후 이동할 때는 직접 false로 바꾼다.
  const dirty = JSON.stringify(draft) !== initial;
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    setLeaveGuard((target) => {
      if (!dirtyRef.current) return true;
      setPendingLeave(target);
      return false;
    });
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      setLeaveGuard(null);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const leave = () => {
    dirtyRef.current = false;
    window.location.hash = '#/gear';
  };

  const patch = (change: Partial<GearDraft>) => setDraft((d) => ({ ...d, ...change }));
  const patchControl = (controlId: string, change: Partial<ControlDraft>) =>
    setDraft((d) => ({ ...d, controls: d.controls.map((c) => (c.id === controlId ? { ...c, ...change } : c)) }));
  const moveControl = (index: number, by: -1 | 1) =>
    setDraft((d) => {
      const controls = [...d.controls];
      [controls[index], controls[index + by]] = [controls[index + by], controls[index]];
      return { ...d, controls };
    });

  const save = () => {
    const checked = validateGearDraft(draft);
    if (!checked.ok) {
      setErrors(checked.errors);
      setSaveError(null);
      return;
    }
    setErrors({});
    const result = update((d) => saveGear(d, checked.value, existing, createId(), new Date().toISOString()));
    if (result.status === 'failed') {
      setSaveError(`저장하지 못했습니다. 입력한 내용은 그대로 있습니다. (원인: ${result.detail})`);
      return;
    }
    notify(successMessage(result, existing ? '장비를 수정했습니다.' : '장비를 등록했습니다.'));
    leave();
  };

  const remove = () => {
    if (!existing) return;
    const result = update((d) => deleteGear(d, existing.id));
    setConfirmDelete(false);
    if (result.status === 'failed') {
      setSaveError(`삭제하지 못했습니다. 장비는 그대로 있습니다. (원인: ${result.detail})`);
      return;
    }
    notify(successMessage(result, '장비를 삭제했습니다.'));
    leave();
  };

  const errorCount = Object.keys(errors).length;
  const toneCount = existing ? countTonesUsingGear(data, existing.id) : 0;

  return (
    <main className="screen">
      <h1>{existing ? '장비 수정' : '장비 등록'}</h1>

      <form
        className="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field id="gear-name" label="장비 이름" error={errors.name}>
          <input
            id="gear-name"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="예: 연습실 베이스 앰프"
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'gear-name-error' : undefined}
          />
        </Field>

        <fieldset className="field" aria-describedby={errors.instruments ? 'gear-instruments-error' : undefined}>
          <legend>사용 악기</legend>
          <div className="checks">
            {INSTRUMENTS.map((inst) => (
              <label key={inst} className="check">
                <input
                  type="checkbox"
                  checked={draft.instruments.includes(inst)}
                  onChange={(e) =>
                    patch({
                      instruments: e.target.checked
                        ? INSTRUMENTS.filter((i) => i === inst || draft.instruments.includes(i))
                        : draft.instruments.filter((i) => i !== inst),
                    })
                  }
                />
                {INSTRUMENT_LABELS[inst]}
              </label>
            ))}
          </div>
          {errors.instruments && (
            <p className="field-error" id="gear-instruments-error">
              {errors.instruments}
            </p>
          )}
        </fieldset>

        <Field id="gear-kind" label="분류">
          <select id="gear-kind" value={draft.kind} onChange={(e) => patch({ kind: e.target.value as GearDraft['kind'] })}>
            {GEAR_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {GEAR_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="gear-memo" label="메모 (선택)">
          <textarea id="gear-memo" rows={2} value={draft.memo} onChange={(e) => patch({ memo: e.target.value })} />
        </Field>

        <section className="controls" aria-labelledby="controls-title">
          <h2 id="controls-title">조절 항목</h2>
          {draft.controls.length === 0 && <p className="muted">노브·스위치처럼 톤을 기록할 때 값을 적을 항목을 추가하세요.</p>}
          {draft.controls.map((control, index) => (
            <ControlEditor
              key={control.id}
              control={control}
              index={index}
              total={draft.controls.length}
              errors={errors}
              onChange={(change) => patchControl(control.id, change)}
              onMove={(by) => moveControl(index, by)}
              onRemove={() => patch({ controls: draft.controls.filter((c) => c.id !== control.id) })}
            />
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() => patch({ controls: [...draft.controls, newControlDraft(createId())] })}
          >
            조절 항목 추가
          </button>
        </section>

        {/* 오류 문구는 화면 하단에 고정된 저장 버튼 줄 안에 둬서, 스크롤 위치와 상관없이 누른 직후 보이게 한다 */}
        <div className="form-actions">
          {(errorCount > 0 || saveError) && (
            <p className="form-error" role="alert">
              {saveError ?? `입력을 확인해 주세요. 고칠 곳이 ${errorCount}곳 있습니다.`}
            </p>
          )}
          <button type="button" className="button secondary" onClick={() => (window.location.hash = '#/gear')}>
            취소
          </button>
          <button type="submit" className="button">
            저장
          </button>
        </div>
      </form>

      {existing && (
        <button type="button" className="button danger-outline" onClick={() => setConfirmDelete(true)}>
          장비 삭제
        </button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="장비를 삭제할까요?"
        confirmLabel="삭제"
        danger
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>‘{existing?.name}’을(를) 내 장비 목록에서 삭제합니다.</p>
        <p>
          {toneCount > 0
            ? `이 장비를 쓴 톤 ${toneCount}개에는 작성 당시의 장비 이름과 설정이 그대로 남습니다.`
            : '기존 톤에 기록된 설정은 그대로 유지됩니다.'}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingLeave !== null}
        title="저장하지 않고 나갈까요?"
        confirmLabel="나가기"
        danger
        onConfirm={() => {
          const target = pendingLeave ?? '#/gear';
          setPendingLeave(null);
          dirtyRef.current = false;
          window.location.hash = target;
        }}
        onCancel={() => setPendingLeave(null)}
      >
        <p>저장하지 않은 변경 내용이 사라집니다.</p>
      </ConfirmDialog>
    </main>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactElement }) {
  return (
    <div className="field" data-invalid={error ? true : undefined}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

interface ControlEditorProps {
  control: ControlDraft;
  index: number;
  total: number;
  errors: DraftErrors;
  onChange: (change: Partial<ControlDraft>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}

function ControlEditor({ control, index, total, errors, onChange, onMove, onRemove }: ControlEditorProps) {
  const fid = (key: string) => `control-${control.id}-${key}`;
  const err = (key: string) => errors[`${control.id}.${key}`];
  const label = control.name.trim() || `항목 ${index + 1}`;

  return (
    <fieldset className="control-card">
      <legend>
        {index + 1}. {label}
      </legend>

      <div className="control-grid">
        <Field id={fid('name')} label="항목 이름" error={err('name')}>
          <input
            id={fid('name')}
            value={control.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="예: Gain"
            autoComplete="off"
            aria-invalid={err('name') ? true : undefined}
            aria-describedby={err('name') ? `${fid('name')}-error` : undefined}
          />
        </Field>
        <Field id={fid('type')} label="유형">
          <select id={fid('type')} value={control.type} onChange={(e) => onChange({ type: e.target.value as ControlDraft['type'] })}>
            {CONTROL_TYPES.map((type) => (
              <option key={type} value={type}>
                {CONTROL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {control.type === 'knob' && (
        <div className="number-grid">
          {(['min', 'max', 'step'] as const).map((key) => (
            <Field key={key} id={fid(key)} label={{ min: '최소', max: '최대', step: '간격' }[key]} error={err(key)}>
              <input
                id={fid(key)}
                inputMode="decimal"
                value={control[key]}
                onChange={(e) => onChange({ [key]: e.target.value })}
                aria-invalid={err(key) ? true : undefined}
                aria-describedby={err(key) ? `${fid(key)}-error` : undefined}
              />
            </Field>
          ))}
          <Field id={fid('unit')} label="단위 (선택)">
            <input id={fid('unit')} value={control.unit} onChange={(e) => onChange({ unit: e.target.value })} placeholder="dB" />
          </Field>
        </div>
      )}

      {control.type === 'select' && (
        <Field id={fid('options')} label="선택지 (한 줄에 하나)" error={err('options')}>
          <textarea
            id={fid('options')}
            rows={3}
            value={control.optionsText}
            onChange={(e) => onChange({ optionsText: e.target.value })}
            placeholder={'250Hz\n500Hz\n1kHz'}
            aria-invalid={err('options') ? true : undefined}
            aria-describedby={err('options') ? `${fid('options')}-error` : undefined}
          />
        </Field>
      )}

      <div className="control-actions">
        <button type="button" className="button small secondary" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`${label} 위로`}>
          위로
        </button>
        <button type="button" className="button small secondary" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`${label} 아래로`}>
          아래로
        </button>
        <button type="button" className="button small danger-outline" onClick={onRemove} aria-label={`${label} 삭제`}>
          삭제
        </button>
      </div>
    </fieldset>
  );
}
