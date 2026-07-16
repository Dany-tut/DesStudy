'use client';

import { useMemo, useState } from 'react';
import { Users, Plus, Trash2, X, UserPlus, Loader2, Link2, Copy, Check, KeyRound, Eye, EyeOff } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { useT } from '@/lib/i18n/client';
import type { Translator } from '@/lib/i18n/translator';

export interface LearnerOption {
  id: string;
  name: string | null;
  /** True once the learner has set email + password (LOGIN invite claimed). */
  hasAccount?: boolean;
  /** Login the learner set for themselves (visible to the teacher). */
  email?: string | null;
  /** Plaintext password the learner set — shown so the teacher can recover it. */
  password?: string | null;
}
export interface GroupView {
  id: string;
  name: string;
  members: LearnerOption[];
}

const learnerLabel = (l: LearnerOption, t: Translator['t']) =>
  l.name?.trim() || t('teacher.learnerFallback', { id: l.id.slice(0, 6) });

export function GroupsManager({
  initialGroups,
  learners,
}: {
  initialGroups: GroupView[];
  learners: LearnerOption[];
}) {
  const { t } = useT();
  const [groups, setGroups] = useState<GroupView[]>(initialGroups);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  /**
   * Invite a learner WITHOUT the entry test: create a blank card, issue a LOGIN
   * link and copy it. The student sets their own name, email and password when
   * they open the link — no need to type their name here. Test invites live only
   * in the Тестирование tab.
   */
  async function invite() {
    setInviting(true);
    try {
      const cardRes = await fetch('/api/teacher/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const card = await cardRes.json();
      if (!cardRes.ok) return;
      const res = await fetch('/api/teacher/learner-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'LOGIN', learnerId: card.id }),
      });
      const data = await res.json();
      if (res.ok) {
        await setLinkAndCopy(data.url);
      }
    } finally {
      setInviting(false);
    }
  }

  // Publish the fresh link and copy it to the clipboard in one go — the teacher
  // just clicks "Получить ссылку" and it's ready to paste. If the clipboard is
  // blocked (permissions / non-secure origin), fall back to showing the field.
  async function setLinkAndCopy(url: string) {
    setInviteUrl(url);
    setCopyFailed(false);
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    if (await copyText(inviteUrl)) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  }

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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-callout font-semibold text-primary">
          <Users size={16} className="text-brand" /> {t('teacher.groupsHeader')}
        </h2>
        <button
          type="button"
          onClick={invite}
          disabled={inviting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-caption font-medium text-secondary transition-fast hover:text-primary disabled:opacity-50"
        >
          {inviting ? <Loader2 size={13} className="animate-spin" /> : copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? t('teacher.linkCopied') : t('teacher.inviteLearner')}
        </button>
      </div>

      {copied && !copyFailed && (
        <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-caption text-tertiary">
          {t('teacher.inviteCopiedHint')}
        </p>
      )}

      {/* Fallback only when the clipboard was blocked — otherwise the link is
          already copied and there's nothing to show. */}
      {inviteUrl && copyFailed && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-3">
          <p className="mb-1.5 text-caption text-tertiary">{t('teacher.copyFailedHint')}</p>
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
              {copied ? t('teacher.ok') : t('teacher.copy')}
            </button>
          </div>
        </div>
      )}

      {/* Create group */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 220 }}>
          <span className="text-caption text-tertiary">{t('teacher.groupNameLabel')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
            placeholder={t('teacher.groupNamePlaceholder')}
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
          {t('teacher.createGroup')}
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-footnote text-tertiary">
          {t('teacher.noGroups')}
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
  const { t, tp } = useT();
  const [adding, setAdding] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const memberIds = useMemo(() => new Set(group.members.map((m) => m.id)), [group.members]);
  const available = useMemo(
    () => learners.filter((l) => !memberIds.has(l.id)),
    [learners, memberIds],
  );

  /**
   * Invite a NEW learner straight into this group — no entry test. Create the
   * card, drop it into the group, then hand back a LOGIN link. Test invites are
   * issued only from the Тестирование tab.
   */
  async function invite() {
    const name = inviteName.trim();
    if (!name) return;
    setInviting(true);
    try {
      const cardRes = await fetch('/api/teacher/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const card = await cardRes.json();
      if (!cardRes.ok) return;
      await onAdd({ id: card.id, name: card.name, hasAccount: false });
      const res = await fetch('/api/teacher/learner-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'LOGIN', learnerId: card.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteName('');
        setInviteOpen(false);
        await setLinkAndCopy(data.url);
      }
    } finally {
      setInviting(false);
    }
  }

  async function setLinkAndCopy(url: string) {
    setInviteUrl(url);
    setCopyFailed(false);
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    if (await copyText(inviteUrl)) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-footnote font-semibold text-primary">{group.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-caption text-tertiary">{tp('teacher.membersCount', group.members.length)}</span>
          <button
            type="button"
            onClick={onDelete}
            title={t('teacher.deleteGroup')}
            className="text-tertiary transition-fast hover:text-[#F85149]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {group.members.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {group.members.map((m) => (
            <MemberRow key={m.id} member={m} onRemove={() => onRemove(m)} />
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-lg border border-border bg-surface p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-caption text-tertiary">{t('teacher.addLearner')}</span>
            <button type="button" onClick={() => setAdding(false)} className="text-tertiary hover:text-primary">
              <X size={13} />
            </button>
          </div>
          {available.length === 0 ? (
            <p className="px-1 py-1 text-caption text-tertiary">{t('teacher.allLearnersInGroup')}</p>
          ) : (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
              {available.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onAdd(l)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-caption text-secondary transition-fast hover:bg-hover"
                  >
                    <UserPlus size={12} className="text-tertiary" /> {learnerLabel(l, t)}
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
            <UserPlus size={13} /> {t('teacher.addLearner')}
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-caption font-medium text-secondary transition-fast hover:text-primary"
          >
            <Link2 size={13} />
            {t('teacher.inviteByLink')}
          </button>
        </div>
      )}

      {inviteOpen && (
        <div className="mt-2 flex items-end gap-2 rounded-lg border border-border bg-surface p-2">
          <label className="flex flex-1 flex-col gap-1" style={{ minWidth: 0 }}>
            <span className="text-caption text-tertiary">{t('teacher.inviteNameLabel')}</span>
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && invite()}
              placeholder={t('teacher.inviteNamePlaceholder')}
              className="rounded-md border border-border bg-canvas px-2 py-1.5 text-caption text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
            />
          </label>
          <button
            type="button"
            onClick={invite}
            disabled={inviting || !inviteName.trim()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-caption font-medium text-on-brand transition-fast hover:opacity-90 disabled:opacity-50"
          >
            {inviting ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={13} />}
            {t('teacher.link')}
          </button>
        </div>
      )}

      {copied && !copyFailed && (
        <p className="mt-2 inline-flex items-center gap-1 text-caption text-brand">
          <Check size={13} /> {t('teacher.linkCopiedSend')}
        </p>
      )}

      {inviteUrl && copyFailed && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-2">
          <p className="mb-1.5 text-caption text-tertiary">{t('teacher.copyFailedManual')}</p>
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
              {copied ? t('teacher.ok') : t('teacher.copy')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One learner in a group. Shows the name and, once they've claimed a LOGIN
 * invite, their login (email) plus a reveal-on-click password so the teacher can
 * hand the credentials back if the student forgets them.
 */
function MemberRow({ member, onRemove }: { member: LearnerOption; onRemove: () => void }) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasCreds = !!member.email;

  async function copyCreds() {
    const text = `${member.email ?? ''}${member.password ? ` / ${member.password}` : ''}`.trim();
    if (!text) return;
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <li className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        {member.hasAccount && <KeyRound size={11} className="shrink-0 text-brand" aria-label={t('teacher.hasAccount')} />}
        <span className="min-w-0 flex-1 truncate text-caption text-secondary">{learnerLabel(member, t)}</span>
        {hasCreds && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            title={show ? t('teacher.hideCreds') : t('teacher.showCreds')}
            className="shrink-0 text-tertiary transition-fast hover:text-primary"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          title={t('teacher.removeFromGroup')}
          className="shrink-0 text-tertiary transition-fast hover:text-[#F85149]"
        >
          <X size={13} />
        </button>
      </div>
      {hasCreds && show && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-border pt-1.5">
          <div className="min-w-0 flex-1 font-mono text-caption text-primary">
            <div className="truncate">{member.email}</div>
            <div className="truncate text-secondary">{member.password ?? t('teacher.noPassword')}</div>
          </div>
          <button
            type="button"
            onClick={copyCreds}
            title={t('teacher.copyCreds')}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-caption text-secondary transition-fast hover:text-primary"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? t('teacher.ok') : t('teacher.copy')}
          </button>
        </div>
      )}
    </li>
  );
}
