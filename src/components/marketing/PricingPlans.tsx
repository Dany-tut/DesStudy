'use client';

import { useState } from 'react';
import { Check, ArrowRight, Loader2, CheckCircle2, X } from 'lucide-react';

/**
 * Guest-facing tariff cards shown to a learner who finished the grading test but
 * isn't enrolled yet — their grade is already saved for the curator. The learner
 * picks a format: the chosen card highlights and reveals its "Оставить заявку"
 * button, which posts to /api/application. That заявка then surfaces as a lead in
 * the teacher/boss results view, where staff follow up and attach the paid course.
 */

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'self',
    name: 'Самостоятельно',
    price: '4 990 ₽',
    period: 'разовый доступ',
    tagline: 'Все уроки и интерактивные задания платформы',
    features: ['Полный курс UI/UX', 'Интерактивные тренажёры', 'Тест на грейд и точки роста'],
  },
  {
    id: 'mentor',
    name: 'С ментором',
    price: '19 900 ₽',
    period: 'за месяц',
    tagline: 'Платформа + разбор работ и созвоны с куратором',
    features: [
      'Всё из «Самостоятельно»',
      'Ревью портфолио и заданий',
      'Личные созвоны с ментором',
      'Проверка тестовых и подготовка к собесам',
    ],
    featured: true,
  },
  {
    id: 'job',
    name: 'До оффера',
    price: 'по заявке',
    period: 'до трудоустройства',
    tagline: 'Ведём до выхода на работу дизайнером',
    features: ['Всё из «С ментором»', 'Сборка портфолио-кейсов', 'Карьерный трек и отклики', 'Поддержка до оффера'],
  },
];

type Status = 'idle' | 'sending' | 'sent';

export function PricingPlans() {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState(false);
  // The contact modal collects ФИ + telegram (both required) and phone
  // (optional) before the заявка goes out — that contact is how the curator
  // reaches the lead.
  const [contactOpen, setContactOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const canSubmit = name.trim() !== '' && telegram.trim() !== '';

  const selectedPlan = selected ? PLANS.find((p) => p.id === selected) ?? null : null;

  function openContact() {
    if (!selected) return;
    setError(false);
    setContactOpen(true);
  }

  async function submit() {
    if (!selected || status === 'sending' || !canSubmit) return;
    setStatus('sending');
    setError(false);
    try {
      const res = await fetch('/api/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selected,
          name: name.trim(),
          telegram: telegram.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
      setContactOpen(false);
    } catch {
      setError(true);
      setStatus('idle');
    }
  }

  const sentPlan = status === 'sent' ? PLANS.find((p) => p.id === selected) : null;

  return (
    <section className="mx-auto mt-16 max-w-[980px]">
      <div className="text-center">
        <h2 className="text-title1 font-bold text-primary">Как продолжить обучение</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-body text-secondary">
          Ваш грейд сохранён — куратор его уже видит. Выберите формат, и мы откроем доступ к платформе с
          персональными точками роста.
        </p>
      </div>

      {/* items-stretch (grid default) keeps every card the same height; each card
          is a flex column so its CTA slot pins to the bottom via mt-auto. */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelected(p.id);
                if (status === 'sent') setStatus('idle');
              }}
              aria-pressed={isSelected}
              className={[
                'flex flex-col rounded-2xl border p-6 text-left transition-base',
                isSelected
                  ? 'border-brand bg-brand/5 shadow-[0_0_0_2px_var(--brand)]'
                  : p.featured
                    ? 'border-brand/40 bg-surface hover:border-brand/70'
                    : 'border-border bg-surface hover:border-border-strong',
              ].join(' ')}
            >
              {p.featured && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-brand px-2.5 py-1 text-caption font-medium text-on-brand">
                  Популярный
                </span>
              )}
              <h3 className="text-callout font-semibold text-primary">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={[
                    'font-bold text-primary tabular-nums whitespace-nowrap',
                    /\d/.test(p.price) ? 'text-title2' : 'text-title3',
                  ].join(' ')}
                >
                  {p.price}
                </span>
                <span className="text-footnote text-tertiary">{p.period}</span>
              </div>
              <p className="mt-2 text-footnote text-secondary">{p.tagline}</p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-footnote text-secondary">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA slot — pinned to the bottom of every card (mt-auto). The
                  button only appears on the selected card; other cards show a
                  hint so the whole card still reads as pickable. */}
              <div className="mt-auto pt-6">
                {isSelected ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      openContact();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        openContact();
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-brand px-4 py-2.5 text-footnote font-medium text-on-brand transition-base hover:bg-brand-hover"
                  >
                    Оставить заявку <ArrowRight size={15} />
                  </span>
                ) : (
                  <span className="inline-flex w-full items-center justify-center rounded-lg border border-dashed border-border px-4 py-2.5 text-footnote text-tertiary">
                    Выбрать тариф
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {sentPlan ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-footnote text-brand">
          <CheckCircle2 size={16} />
          Заявка на «{sentPlan.name}» отправлена — куратор скоро свяжется с вами.
        </p>
      ) : error ? (
        <p className="mt-6 text-center text-footnote text-danger">
          Не удалось отправить заявку. Попробуйте ещё раз.
        </p>
      ) : (
        <p className="mt-6 text-center text-caption text-tertiary">
          Выберите тариф — заявка уйдёт куратору. Оплата и тарифы пока черновик.
        </p>
      )}

      {contactOpen && selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Оставить заявку"
          onClick={() => status !== 'sending' && setContactOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-callout font-semibold text-primary">Оставить заявку</h3>
                <p className="mt-1 text-footnote text-secondary">
                  Тариф «{selectedPlan.name}» — куратор свяжется с вами.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                disabled={status === 'sending'}
                aria-label="Закрыть"
                className="rounded-lg p-1 text-tertiary transition-base hover:bg-hover hover:text-secondary"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Фамилия и имя"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-footnote text-primary outline-none transition-base placeholder:text-tertiary focus:border-brand"
              />
              <input
                type="text"
                required
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="Telegram (@username)"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-footnote text-primary outline-none transition-base placeholder:text-tertiary focus:border-brand"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон — по желанию"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-footnote text-primary outline-none transition-base placeholder:text-tertiary focus:border-brand"
              />

              {/* Reach the curator directly — link + scannable QR to the bot. */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas p-3">
                <a
                  href="https://t.me/DesStudy_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md bg-white p-1.5"
                  aria-label="Открыть Telegram DesStudy"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/telegram-qr.svg" alt="QR на Telegram @DesStudy_bot" width={72} height={72} />
                </a>
                <div className="text-footnote text-secondary">
                  Можно написать нам напрямую в Telegram:{' '}
                  <a
                    href="https://t.me/DesStudy_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    @DesStudy_bot
                  </a>
                  <span className="mt-0.5 block text-tertiary">Наведите камеру на QR-код</span>
                </div>
              </div>

              {error && (
                <p className="text-footnote text-danger">Не удалось отправить. Попробуйте ещё раз.</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !canSubmit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-footnote font-medium text-on-brand transition-base hover:bg-brand-hover disabled:opacity-50"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Отправляем…
                  </>
                ) : (
                  <>
                    Отправить заявку <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
