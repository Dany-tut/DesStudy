'use client';

import { useMemo, useState } from 'react';
import { Users, Plus, Trash2, X, UserPlus, Loader2, Link2, Copy, Check, KeyRound } from 'lucide-react';

export interface LearnerOption {
  id: string;
  name: string | null;
  /** True once the learner has set email + password (LOGIN invite claimed). */
  hasAccount?: boolean;
}
export interface GroupView {
  id: string;
  name: string;
  members: LearnerOption[];
}

const learnerLabel = (l: LearnerOption) => l.name?.trim() || `Ученик ${l.id.slice(0, 6)}`;

export function GroupsManager({
  initialGroups,
  learners,
}: {
  initialGroups: GroupView[];
  learners: LearnerOption[];
}) {
  const [groups, setGroups] = useState<GroupView[]>(initialGroups);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function createGroup() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teacher/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroups((g) => [{ id: data.id, name: data.name, members: [] }, ...g]);
        setName('');
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteGroup(id: string) {
    const res = await fetch(`/api/teacher/groups/${id}`, { method: 'DELETE' });
    if (res.ok) setGroups((g) => g.filter((x) => x.id !== id));
  }

  async function setMember(groupId: string, learner: LearnerOption, remove: boolean) {
    const res = await fetch(`/api/teacher/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId: learner.id, remove }),
    });
    if (!res.ok) return;
    setGroups((gs) =>
      gs.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              members: remove
                ? g.members.filter((m) => m.id !== learner.id)
                : [...g.members, learner],
            },
      ),
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-callout font-semibold text-primary">
          <Users size={16} className="text-brand" /> Группы
        </h2>
      </div>

      {/* Create group */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 220 }}>
          <span className="text-caption text-tertiary">Название группы</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
            placeholder="Например: Поток 3 · вечер"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
          />
        </label>
        <button
          type="button"
          onClick={createGroup}
          disabled={creating || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-50"
        >
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Создать группу
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-footnote text-tertiary">
          Пока нет групп. Создай первую выше.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              learners={learners}
              onDelete={() => deleteGroup(g.id)}
              onAdd={(l) => setMember(g.id, l, false)}
              onRemove={(l) => setMember(g.id, l, true)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GroupCard({
  group,
  learners,
  onDelete,
  onAdd,
  onRemove,
}: {
  group: GroupView;
  learners: LearnerOption[];
  onDelete: () => void;
  onAdd: (l: LearnerOption) => void;
  onRemove: (l: LearnerOption) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const memberIds = useMemo(() => new Set(group.members.map((m) => m.id)), [group.members]);
  const available = useMemo(
    () => learners.filter((l) => !memberIds.has(l.id)),
    [learners, memberIds],
  );

  async function invite() {
    setInviting(true);
    try {
      const res = await fetch('/api/teacher/learner-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'TEST', groupId: group.id }),
      });
      const data = await res.json();
      if (res.ok) setInviteUrl(data.url);
    } finally {
      setInviting(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* selectable fallback */
    }
  }

  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-footnote font-semibold text-primary">{group.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-caption text-tertiary">{group.members.length} чел.</span>
          <button
            type="button"
            onClick={onDelete}
            title="Удалить группу"
            className="text-tertiary transition-fast hover:text-[#F85149]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {group.members.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {group.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-caption text-secondary"
            >
              {m.hasAccount && <KeyRound size={11} className="text-brand" aria-label="есть аккаунт" />}
              {learnerLabel(m)}
              <button
                type="button"
                onClick={() => onRemove(m)}
                title="Убрать из группы"
                className="text-tertiary transition-fast hover:text-[#F85149]"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-lg border border-border bg-surface p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-caption text-tertiary">Добавить ученика</span>
            <button type="button" onClick={() => setAdding(false)} className="text-tertiary hover:text-primary">
              <X size={13} />
            </button>
          </div>
          {available.length === 0 ? (
            <p className="px-1 py-1 text-caption text-tertiary">Все ученики уже в группе.</p>
          ) : (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
              {available.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onAdd(l)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-caption text-secondary transition-fast hover:bg-hover"
                  >
                    <UserPlus size={12} className="text-tertiary" /> {learnerLabel(l)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-caption font-medium text-brand transition-fast hover:underline"
          >
            <UserPlus size={13} /> Добавить ученика
          </button>
          <button
            type="button"
            onClick={invite}
            disabled={inviting}
            className="inline-flex items-center gap-1.5 text-caption font-medium text-secondary transition-fast hover:text-primary disabled:opacity-50"
          >
            {inviting ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={13} />}
            Пригласить по ссылке
          </button>
        </div>
      )}

      {inviteUrl && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-2">
          <p className="mb-1.5 text-caption text-tertiary">
            Ссылка на тест для этой группы — одноразовая, отправьте ученику.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 py-1.5 text-caption text-primary outline-none"
            />
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-caption font-medium text-on-brand transition-fast hover:opacity-90"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Ок' : 'Копировать'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
