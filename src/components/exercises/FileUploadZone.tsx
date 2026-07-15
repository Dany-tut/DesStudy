'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileCheck2, X, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

/**
 * Drag-and-drop (or click-to-browse) upload for file-upload exercises.
 * Uploads directly to /api/upload and reports back the stored public URL —
 * the exercise's "answer" is that URL string, same shape as any other answer.
 */
export function FileUploadZone({
  lessonSlug,
  exerciseId,
  accept,
  maxSizeMB,
  value,
  disabled,
  onChange,
}: {
  lessonSlug: string;
  exerciseId: string;
  accept: string;
  maxSizeMB: number;
  value: string | null;
  disabled?: boolean;
  onChange: (url: string | null) => void;
}) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(t('exercises.fileUpload.tooLarge', { size: maxSizeMB }));
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('lessonSlug', lessonSlug);
      form.append('exerciseId', exerciseId);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('upload_failed');
      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } catch {
      setError(t('exercises.fileUpload.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const filename = value.split('/').pop() ?? value;
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success bg-surface px-4 py-3">
        <FileCheck2 size={18} className="shrink-0 text-success" />
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="flex-1 truncate text-callout text-primary hover:underline"
        >
          {filename}
        </a>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('exercises.fileUpload.removeFile')}
            className="shrink-0 text-tertiary transition-fast hover:text-primary"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          const file = e.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-fast',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          dragOver ? 'border-brand bg-brand/5' : 'border-border-strong bg-canvas',
        ].join(' ')}
      >
        {uploading ? (
          <Loader2 size={22} className="animate-spin text-brand" />
        ) : (
          <UploadCloud size={22} className="text-tertiary" />
        )}
        <p className="text-callout text-secondary">
          {uploading ? t('exercises.fileUpload.uploading') : t('exercises.fileUpload.dropHint')}
        </p>
        <p className="text-caption text-tertiary">{t('exercises.fileUpload.maxSize', { size: maxSizeMB })}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-2 text-footnote text-danger">{error}</p>}
    </div>
  );
}
