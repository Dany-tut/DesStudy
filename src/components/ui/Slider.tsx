'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Custom-skinned range input (see .ui-slider in globals.css for the thumb/track
 * styling — the native input stays for a11y/keyboard/touch, only its paint is replaced).
 *
 * The DOM input always drags with `step="any"` so the browser never quantizes
 * the thumb's motion — that's what makes dragging feel stepped/gritty. A local
 * `live` value tracks the raw continuous position for rendering (thumb + fill),
 * while every emitted `onChange` is snapped to `step` so exercise validation
 * still sees exact grid values. `live` only re-syncs from `value` when the user
 * isn't actively dragging, so the parent's rounding never fights the drag.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled,
  unit = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const [live, setLive] = useState(value);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setLive(value);
  }, [value]);

  const pct = ((live - min) / (max - min)) * 100;
  const snap = (raw: number) =>
    Math.min(max, Math.max(min, Math.round((raw - min) / step) * step + min));

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step;
    else if (e.key === 'PageUp') delta = step * 4;
    else if (e.key === 'PageDown') delta = -step * 4;
    else if (e.key === 'Home') {
      e.preventDefault();
      setLive(min);
      onChange(min);
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      setLive(max);
      onChange(max);
      return;
    } else return;
    e.preventDefault();
    const next = snap(live + delta);
    setLive(next);
    onChange(next);
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-footnote text-tertiary">
          {min}
          {unit}
        </span>
        <span className="text-title2 font-semibold tabular-nums text-primary">
          {Math.round(live)}
          {unit}
        </span>
        <span className="text-footnote text-tertiary">
          {max}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="ui-slider"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        min={min}
        max={max}
        step="any"
        value={live}
        disabled={disabled}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onPointerUp={() => {
          draggingRef.current = false;
          onChange(snap(live));
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const raw = Number(e.target.value);
          setLive(raw);
          onChange(snap(raw));
        }}
      />
    </div>
  );
}
