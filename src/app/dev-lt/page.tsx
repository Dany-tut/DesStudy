'use client';

// THROWAWAY dev harness to eyeball the layer-tree drop indicator. Delete me.
import { useState } from 'react';
import { LayerTree } from '@/components/editor/LayerTree';
import type { Layer } from '@/lib/editor/types';

const mk = (id: string, name: string, type: Layer['type'], children: Layer[] = []): Layer => ({
  id,
  name,
  type,
  props: {},
  children,
});

const LAYERS: Layer[] = [
  mk('a', 'Фрейм 1', 'frame', [mk('a1', 'Заголовок', 'text'), mk('a2', 'Кнопка', 'block')]),
  mk('b', 'Фрейм 1 · сломанный', 'frame', [mk('b1', 'Иконка', 'vector')]),
  mk('c', 'Изображение', 'image'),
];

export default function DevLT() {
  const [sel, setSel] = useState<string[]>(['a']);
  return (
    <div style={{ padding: 40, background: '#0b0d11', minHeight: '100vh' }}>
      <div style={{ width: 320, border: '1px solid #333', borderRadius: 8 }}>
        <div className="overflow-y-auto p-2">
          <LayerTree
            layers={LAYERS}
            selectedIds={sel}
            onSelect={(id) => setSel(id ? [id] : [])}
            onHover={() => {}}
            onReparent={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
