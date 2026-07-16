// Demo заявки for the admin «Заявки» inbox — showcases the full redesigned view
// (Telegram-connected active lead with a chat history, plus a processed list in
// varied statuses). Idempotent: wipes previously-seeded demo rows first, keyed
// by the `demo-` tgLinkToken prefix / `@demo.local` email, so re-running is safe.
//
//   node --env-file=.env scripts/seed-demo-apps.mjs
//   node --env-file=.env scripts/seed-demo-apps.mjs --clean   (remove demo rows)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HOUR = 3600_000;
const now = Date.now();
const ago = (h) => new Date(now - h * HOUR);

async function wipeDemo() {
  // Cascade deletes applications + chatMessages + assessments with the learner.
  const { count } = await prisma.learner.deleteMany({
    where: {
      OR: [{ tgLinkToken: { startsWith: 'demo-' } }, { email: { endsWith: '@demo.local' } }],
    },
  });
  if (count) console.log(`✓ Removed ${count} previous demo learner(s)`);
}

/** Create one learner + its assessment (grade) + application + optional chat. */
async function seedLead({ token, name, telegram, email, phone, tgChatId, grade, plan, status, createdAgoH, messages = [] }) {
  const learner = await prisma.learner.create({
    data: {
      name,
      telegram: telegram ?? null,
      email: email ?? null,
      phone: phone ?? null,
      tgChatId: tgChatId ?? null,
      tgLinkToken: token,
      ...(grade
        ? { assessments: { create: { grade, scores: '{}', categoryGrades: '{}' } } }
        : {}),
      applications: { create: { plan, status, createdAt: createdAgoH != null ? ago(createdAgoH) : undefined } },
      ...(messages.length
        ? {
            chatMessages: {
              create: messages.map((m) => ({
                direction: m.dir,
                text: m.text,
                createdAt: ago(m.agoH),
              })),
            },
          }
        : {}),
    },
  });
  return learner;
}

async function main() {
  await wipeDemo();
  if (process.argv.includes('--clean')) {
    console.log('✓ Clean-only run — done.');
    return;
  }

  // ── Active (new) lead: Telegram-connected, with a full conversation ──────────
  await seedLead({
    token: 'demo-vadim',
    name: 'Вадим Алексеевич 🐝 | Репет химбио',
    telegram: 'diuminify',
    tgChatId: 'demo-tg-1001',
    grade: 'senior',
    plan: 'mentor',
    status: 'new',
    createdAgoH: 14,
    messages: [
      { dir: 'out', text: 'Здравствуйте! Спасибо за заявку 🙌', agoH: 13.5 },
      { dir: 'out', text: 'Подскажите, какой тариф вас интересует?', agoH: 13.2 },
      { dir: 'in', text: 'ау', agoH: 11.1 },
      { dir: 'in', text: 'как вы смеете нас игнорировать?', agoH: 11.05 },
      { dir: 'in', text: 'ало', agoH: 11.0 },
      { dir: 'in', text: 'я вас люблю', agoH: 10.9 },
      { dir: 'in', text: 'чего же боле', agoH: 10.89 },
      { dir: 'in', text: 'что я могу ещё сказать', agoH: 10.88 },
    ],
  });

  // ── Second active lead: email source, one inbound message, not bot-connected ─
  await seedLead({
    token: 'demo-marina',
    name: 'Марина Ковалёва',
    email: 'marina@demo.local',
    phone: '+7 900 111-22-33',
    grade: 'middle',
    plan: 'self',
    status: 'new',
    createdAgoH: 3,
    messages: [{ dir: 'in', text: 'Здравствуйте! Подскажите про рассрочку 🙏', agoH: 2.5 }],
  });

  // ── Processed leads (drop into «Обработанные») ───────────────────────────────
  const processed = [
    { token: 'demo-token-check', name: 'Проверка токена', telegram: 'token_fixed', grade: 'junior', plan: 'self', status: 'closed', createdAgoH: 15 },
    { token: 'demo-deploy', name: 'Проверка после деплоя', telegram: 'deploy_ok', grade: 'middle', plan: 'mentor', status: 'closed', createdAgoH: 24 },
    { token: 'demo-final', name: 'Финальная проверка', telegram: 'final_check', grade: 'senior', plan: 'job', status: 'contacted', createdAgoH: 25 },
    { token: 'demo-notify', name: 'Тест уведомления', telegram: 'test_check', grade: 'junior', plan: 'self', status: 'closed', createdAgoH: 27 },
    { token: 'demo-danilka', name: 'Данилка', telegram: 'dany_tut', grade: 'middle', plan: 'mentor', status: 'contacted', createdAgoH: 40 },
    { token: 'demo-buyer2', name: null, email: 'buyer2@demo.local', grade: null, plan: 'self', status: 'closed', createdAgoH: 60 },
    { token: 'demo-buyer', name: null, email: 'buyer@demo.local', grade: null, plan: 'self', status: 'spam', createdAgoH: 61 },
    { token: 'demo-example', name: null, email: 'test@demo.local', grade: null, plan: 'self', status: 'spam', createdAgoH: 62 },
    { token: 'demo-feedback', name: 'Обратная связь', telegram: 'feedback_ru', grade: 'junior', plan: 'mentor', status: 'closed', createdAgoH: 260 },
    { token: 'demo-oldlead', name: 'Старый лид', phone: '+7 918 000-00-00', grade: 'middle', plan: 'job', status: 'closed', createdAgoH: 300 },
  ];
  for (const p of processed) await seedLead(p);

  const total = await prisma.application.count();
  console.log(`✓ Seeded demo заявки. Total applications now: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
