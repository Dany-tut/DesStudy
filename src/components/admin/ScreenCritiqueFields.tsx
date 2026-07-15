'use client';

import { useRef, useState } from 'react';
import { Plus, X, Check, Sparkles, Upload, Loader2 } from 'lucide-react';
import type {
  CritiqueZone,
  CritiqueRoleId,
  CritiqueDefectId,
  CritiqueFixOption,
  CritiqueImage,
} from '@/lib/curriculum/types';
import { CRITIQUE_ROLES, CRITIQUE_DEFECTS, CRITIQUE_SCENES } from '@/lib/curriculum/screenCritique';

/**
 * Admin editor for a screen-critique exercise.
 * - `premium-card` scene: fixed built-in zones; teacher edits role/defect/fixes.
 * - `image` scene: teacher uploads a broken screen (+ optional good one), runs
 *   AI analysis to auto-propose zones (role, defect, fixes, bbox), then edits.
 */

const inputClass =
  'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary';
const labelClass = 'mb-1 block text-caption text-secondary';
const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

/** FileReader → base64 (no data: prefix) + mime. */
function fileToBase64(file: File): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve({ b64: s.slice(s.indexOf(',') + 1), mime: file.type });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadAdmin(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  return (await res.json()).url as string;
}

export function ScreenCritiqueFields({
  scene,
  screenTitle,
  zones,
  image,
  onScene,
  onScreenTitle,
  onZones,
  onImage,
}: {
  scene: string;
  screenTitle: string;
  zones: CritiqueZone[];
  image?: CritiqueImage;
  onScene: (v: string) => void;
  onScreenTitle: (v: string) => void;
  onZones: (v: CritiqueZone[]) => void;
  onImage: (v: CritiqueImage | undefined) => void;
}) {
  const isImage = scene === 'image';
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Cache the analyzable bytes of the broken/good uploads.
  const brokenRef = useRef<{ b64: string; mime: string } | null>(null);
  const goodRef = useRef<{ b64: string; mime: string } | null>(null);

  const patchZone = (i: number, patch: Partial<CritiqueZone>) =>
    onZones(zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const patchFix = (zi: number, fi: number, patch: Partial<CritiqueFixOption>) => {
    const fixes = (zones[zi].fixes ?? []).map((f, j) => (j === fi ? { ...f, ...patch } : f));
    patchZone(zi, { fixes });
  };
  const setCorrectFix = (zi: number, fi: number) =>
    patchZone(zi, { fixes: (zones[zi].fixes ?? []).map((f, j) => ({ ...f, correct: j === fi })) });
  const addFix = (zi: number) =>
    patchZone(zi, { fixes: [...(zones[zi].fixes ?? []), { id: rid('fix'), label: '' }] });
  const removeFix = (zi: number, fi: number) => {
    let fixes = (zones[zi].fixes ?? []).filter((_, j) => j !== fi);
    if (fixes.length > 0 && !fixes.some((f) => f.correct)) fixes = fixes.map((f, j) => ({ ...f, correct: j === 0 }));
    patchZone(zi, { fixes: fixes.length ? fixes : undefined });
  };
  const addZone = () =>
    onZones([
      ...zones,
      {
        id: rid('zone'),
        label: 'Новая зона',
        role: 'secondary',
        roleNote: '',
        intent: '',
        defect: 'none',
        defectNote: '',
        rect: { x0: 10, y0: 10, x1: 40, y1: 30 },
      },
    ]);
  const removeZone = (i: number) => onZones(zones.filter((_, j) => j !== i));

  async function onBrokenPick(file: File) {
    setStatus(null);
    try {
      brokenRef.current = await fileToBase64(file);
      const url = await uploadAdmin(file);
      onImage({ url, goodUrl: image?.goodUrl });
    } catch {
      setStatus('Не удалось загрузить изображение.');
    }
  }
  async function onGoodPick(file: File) {
    try {
      goodRef.current = await fileToBase64(file);
      const url = await uploadAdmin(file);
      onImage({ url: image?.url ?? '', goodUrl: url });
    } catch {
      setStatus('Не удалось загрузить «хороший» экран.');
    }
  }

  async function ensureBytes(url: string | undefined, cache: { b64: string; mime: string } | null) {
    if (cache) return cache;
    if (!url) return null;
    const res = await fetch(url);
    const blob = await res.blob();
    const b64 = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result);
        resolve(s.slice(s.indexOf(',') + 1));
      };
      r.readAsDataURL(blob);
    });
    return { b64, mime: blob.type };
  }

  async function analyze() {
    const broken = await ensureBytes(image?.url, brokenRef.current);
    if (!broken) {
      setStatus('Сначала загрузи экран для разбора.');
      return;
    }
    setAnalyzing(true);
    setStatus(null);
    try {
      const good = image?.goodUrl ? await ensureBytes(image.goodUrl, goodRef.current) : null;
      const res = await fetch('/api/admin/critique-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: broken.b64,
          mediaType: broken.mime,
          screenTitle,
          goodBase64: good?.b64,
          goodMediaType: good?.mime,
        }),
      });
      const reply = await res.json();
      const mapped: CritiqueZone[] = (reply.zones ?? []).map((z: Record<string, unknown>) => ({
        id: rid('zone'),
        label: (z.label as string) ?? '',
        role: z.role as CritiqueRoleId,
        roleNote: (z.roleNote as string) ?? '',
        intent: (z.intent as string) ?? '',
        defect: z.defect as CritiqueDefectId,
        defectNote: (z.defectNote as string) ?? '',
        rect: z.rect as CritiqueZone['rect'],
        fixes: Array.isArray(z.fixes)
          ? (z.fixes as { label: string; correct: boolean }[]).map((f) => ({ id: rid('fix'), label: f.label, correct: f.correct }))
          : undefined,
      }));
      if (mapped.length) onZones(mapped);
      if (reply.screenTitle && !screenTitle) onScreenTitle(reply.screenTitle as string);
      setStatus(
        reply.offline
          ? 'ИИ офлайн (нет ключа) — зоны не предложены, заполни вручную или добавь ANTHROPIC_API_KEY.'
          : `ИИ предложил зон: ${mapped.length}. Проверь и поправь.`,
      );
    } catch {
      setStatus('Ошибка анализа. Попробуй ещё раз.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Сцена (экран)</label>
          <select className={inputClass} value={scene} onChange={(e) => onScene(e.target.value)}>
            {CRITIQUE_SCENES.map((s) => (
              <option key={s} value={s}>
                {s === 'image' ? 'Загруженный экран (image)' : s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Описание экрана (контекст для ИИ)</label>
          <input className={inputClass} value={screenTitle} onChange={(e) => onScreenTitle(e.target.value)} />
        </div>
      </div>

      {isImage && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ImagePicker label="Экран для разбора (кривой)" url={image?.url} onPick={onBrokenPick} />
            <ImagePicker label="Хороший вариант (необязательно)" url={image?.goodUrl} onPick={onGoodPick} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing || !image?.url}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-40"
            >
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Проанализировать ИИ
            </button>
            <button
              type="button"
              onClick={addZone}
              className="inline-flex items-center gap-1 text-footnote text-brand hover:underline"
            >
              <Plus size={14} /> Добавить зону вручную
            </button>
          </div>
          {status && <p className="mt-2 text-caption text-tertiary">{status}</p>}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-caption text-secondary">
          Зоны экрана ({zones.length}){!isImage && ' — id зон заданы сценой'}
        </p>
        {zones.map((z, i) => (
          <div key={z.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-caption text-tertiary">{z.id.slice(0, 10)}</span>
              <input
                className={inputClass}
                value={z.label}
                placeholder="Название зоны"
                onChange={(e) => patchZone(i, { label: e.target.value })}
              />
              {isImage && (
                <button type="button" onClick={() => removeZone(i)} className="shrink-0 text-tertiary hover:text-danger">
                  <X size={15} />
                </button>
              )}
            </div>

            {isImage && z.rect && (
              <div className="mb-3 grid grid-cols-4 gap-2">
                {(['x0', 'y0', 'x1', 'y1'] as const).map((k) => (
                  <div key={k}>
                    <label className={labelClass}>{k} %</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={z.rect![k]}
                      onChange={(e) => patchZone(i, { rect: { ...z.rect!, [k]: Number(e.target.value) } })}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Роль на экране</label>
                <select
                  className={inputClass}
                  value={z.role}
                  onChange={(e) => patchZone(i, { role: e.target.value as CritiqueRoleId })}
                >
                  {CRITIQUE_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Дефект зоны</label>
                <select
                  className={inputClass}
                  value={z.defect}
                  onChange={(e) => patchZone(i, { defect: e.target.value as CritiqueDefectId })}
                >
                  {CRITIQUE_DEFECTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className={labelClass}>Почему такая роль (разбор)</label>
              <textarea className={inputClass} rows={2} value={z.roleNote} onChange={(e) => patchZone(i, { roleNote: e.target.value })} />
            </div>
            <div className="mt-3">
              <label className={labelClass}>Замысел зоны (ground truth — ИИ судит правки по нему)</label>
              <textarea className={inputClass} rows={2} value={z.intent} onChange={(e) => patchZone(i, { intent: e.target.value })} />
            </div>
            <div className="mt-3">
              <label className={labelClass}>Почему такой дефект (разбор)</label>
              <input className={inputClass} value={z.defectNote} onChange={(e) => patchZone(i, { defectNote: e.target.value })} />
            </div>

            <div className="mt-3">
              <label className={labelClass}>Варианты исправления — отметь верное (оно чинит зону)</label>
              <div className="space-y-2">
                {(z.fixes ?? []).map((f, fi) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectFix(i, fi)}
                      title="Верное исправление"
                      className={[
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-fast',
                        f.correct ? 'border-[#3FB950] bg-[#3FB950] text-white' : 'border-border text-transparent hover:border-[#3FB950]',
                      ].join(' ')}
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>
                    <input className={inputClass} value={f.label} placeholder="Текст варианта" onChange={(e) => patchFix(i, fi, { label: e.target.value })} />
                    <button type="button" onClick={() => removeFix(i, fi)} className="shrink-0 text-tertiary hover:text-danger">
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addFix(i)} className="flex items-center gap-1 text-footnote text-brand hover:underline">
                  <Plus size={14} /> Добавить вариант
                </button>
                {z.defect !== 'none' && (z.fixes?.length ?? 0) === 0 && (
                  <p className="text-caption text-warning">У зоны есть дефект — добавь варианты, иначе пересборки не будет.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImagePicker({ label, url, onPick }: { label: string; url?: string; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-2 text-footnote text-primary hover:border-brand/40"
        >
          <Upload size={14} /> {url ? 'Заменить' : 'Загрузить'}
        </button>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-10 w-10 rounded object-cover" />
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
