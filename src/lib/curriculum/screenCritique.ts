/**
 * Screen-critique — shared catalogs, deterministic grading, and the built-in
 * scene content. The player renders from this data; the validator grades from
 * it; the admin editor (later) authors it. Single source of truth so the three
 * never drift.
 */
import type {
  ScreenCritiqueExercise,
  CritiqueZone,
  CritiqueRoleId,
  CritiqueDefectId,
  DefectProp,
} from './types';

export type Verdict = 'right' | 'debatable' | 'wrong';

export interface CritiqueRole {
  id: CritiqueRoleId;
  label: string;
  hint: string;
}

/** The role palette the learner assigns during diagnosis. */
export const CRITIQUE_ROLES: CritiqueRole[] = [
  { id: 'accent', label: 'Главный акцент', hint: 'то, ради чего экран — ловит взгляд первым' },
  { id: 'secondary', label: 'Второстепенное', hint: 'нужное, но не борется за внимание' },
  { id: 'promo', label: 'Реклама, не часть карты', hint: 'продающий блок, живёт отдельно от продукта' },
  { id: 'neutral', label: 'Нейтральный фон', hint: 'поверхность/обрамление, не несёт смысла само по себе' },
  { id: 'nav', label: 'Навигация', hint: 'вход/выход, обрамляет экран' },
];

export interface CritiqueDefect {
  id: CritiqueDefectId;
  label: string;
  hint: string;
}

/** The defect palette — what's WRONG in a zone. */
export const CRITIQUE_DEFECTS: CritiqueDefect[] = [
  { id: 'hierarchy', label: 'Слабая иерархия', hint: 'главное не выделено — не читается, что важнее' },
  { id: 'radius', label: 'Разнобой скруглений', hint: 'у соседних элементов разные радиусы' },
  { id: 'contrast', label: 'Слабый контраст', hint: 'текст сливается с фоном, плохо читается' },
  { id: 'alignment', label: 'Сбито выравнивание', hint: 'элементы не на одной линии / не по полям' },
  { id: 'consistency', label: 'Рассогласованность', hint: 'однотипные блоки оформлены по-разному' },
  { id: 'typography', label: 'Плохой текст', hint: 'формулировка/типографика: размеры, длина, регистр' },
  { id: 'spacing', label: 'Размеры и сетка', hint: 'нарушен ритм отступов, элементы не по сетке' },
  { id: 'none', label: 'Здесь всё чисто', hint: 'в этой зоне нарушения нет' },
];

export const roleById = (id?: CritiqueRoleId) => CRITIQUE_ROLES.find((r) => r.id === id);
export const defectById = (id?: CritiqueDefectId) => CRITIQUE_DEFECTS.find((d) => d.id === id);

export interface DefectPropDef {
  id: DefectProp;
  label: string;
  /** Unit hint shown as a placeholder in the было/стало inputs. */
  unit?: string;
}

/**
 * The concrete properties a defect can change between the эталон and its
 * сломанный twin. Drives the per-delta property dropdown in the editor and,
 * for the auto-diff, maps `Layer.props` keys onto human labels.
 */
export const DEFECT_PROPS: DefectPropDef[] = [
  { id: 'font', label: 'Шрифт' },
  { id: 'fontSize', label: 'Кегль', unit: 'px' },
  { id: 'fontWeight', label: 'Начертание' },
  { id: 'lineHeight', label: 'Межстрочный', unit: 'px' },
  { id: 'color', label: 'Цвет текста' },
  { id: 'fill', label: 'Цвет фона' },
  { id: 'radius', label: 'Скругление', unit: 'px' },
  { id: 'padding', label: 'Внутр. отступ', unit: 'px' },
  { id: 'gap', label: 'Интервал', unit: 'px' },
  { id: 'size', label: 'Размер', unit: 'px' },
  { id: 'position', label: 'Положение', unit: 'px' },
  { id: 'opacity', label: 'Прозрачность' },
];

export const defectPropById = (id?: DefectProp) => DEFECT_PROPS.find((p) => p.id === id);

// ── Grading ────────────────────────────────────────────────────────────────

export function gradeRole(zone: CritiqueZone, picked: CritiqueRoleId): Verdict {
  if (picked === zone.role) return 'right';
  if (zone.debatableRoles?.includes(picked)) return 'debatable';
  return 'wrong';
}

export function gradeDefect(zone: CritiqueZone, picked: CritiqueDefectId): Verdict {
  if (picked === zone.defect) return 'right';
  if (zone.debatableDefects?.includes(picked)) return 'debatable';
  return 'wrong';
}

/**
 * Grade a multi-select of defects for a zone: the learner may name several
 * problems. We reward the best reading present — naming the true defect makes
 * the zone "right" even alongside extra guesses; a defensible-but-not-primary
 * pick is "debatable"; only an all-miss set is "wrong".
 */
export function gradeDefects(zone: CritiqueZone, picked: CritiqueDefectId[]): Verdict | undefined {
  if (!picked || picked.length === 0) return undefined;
  return picked
    .map((id) => gradeDefect(zone, id))
    .reduce((best, v) => (VERDICT_RANK[v] < VERDICT_RANK[best] ? v : best), 'wrong' as Verdict);
}

const VERDICT_RANK: Record<Verdict, number> = { right: 0, debatable: 1, wrong: 2 };
/** The stronger warning of two verdicts (drives a zone's outline colour). */
export function worseVerdict(a?: Verdict, b?: Verdict): Verdict | undefined {
  if (!a) return b;
  if (!b) return a;
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

/** Zones that carry a reconstruction step (i.e. have a fixable defect). */
export const defectiveZones = (ex: ScreenCritiqueExercise) =>
  ex.zones.filter((z) => z.defect !== 'none' && z.fixes && z.fixes.length > 0);

export const correctFixId = (zone: CritiqueZone) => zone.fixes?.find((f) => f.correct)?.id;

/** Zones with teacher-authored per-property deltas (the «найди отличие» step). */
export const deltaZones = (ex: ScreenCritiqueExercise) =>
  ex.zones.filter((z) => z.deltas && z.deltas.length > 0);

/** The set of properties actually changed in a zone (its ground truth). */
export const deltaProps = (zone: CritiqueZone) =>
  Array.from(new Set((zone.deltas ?? []).map((d) => d.prop)));

/**
 * Grade the learner's guess of WHICH properties are broken in a zone against
 * its authored deltas. `right` — the picked set matches the truth exactly;
 * `debatable` — some hits but incomplete or padded with misses; `wrong` — no
 * overlap. Undefined when the zone has no deltas or nothing was picked.
 */
export function gradeDeltaProps(zone: CritiqueZone, picked: DefectProp[]): Verdict | undefined {
  const truth = new Set(deltaProps(zone));
  if (truth.size === 0 || !picked || picked.length === 0) return undefined;
  const pickedSet = new Set(picked);
  const hits = [...pickedSet].filter((p) => truth.has(p)).length;
  const extras = [...pickedSet].filter((p) => !truth.has(p)).length;
  if (hits === truth.size && extras === 0) return 'right';
  if (hits > 0) return 'debatable';
  return 'wrong';
}

// ── Learner answer ───────────────────────────────────────────────────────────

export interface CritiqueAnswer {
  /** zoneId → picked role. */
  roles: Record<string, CritiqueRoleId>;
  /** zoneId → picked defects (multi-select). */
  defects: Record<string, CritiqueDefectId[]>;
  /** zoneId → picked fix option id (reconstruction). */
  fixes: Record<string, string>;
  /** zoneId → picked broken properties (the «найди отличие» step). */
  props: Record<string, DefectProp[]>;
  /** zoneId → optional free-text note (AI-coached). */
  notes: Record<string, string>;
}

export const emptyCritiqueAnswer = (): CritiqueAnswer => ({
  roles: {},
  defects: {},
  fixes: {},
  props: {},
  notes: {},
});

/**
 * The exercise is solved when every zone has a role diagnosed as
 * right-or-debatable, AND every defective zone has its correct fix applied
 * (the reconstruction). Defect-naming and notes are coaching-only — they never
 * gate completion.
 */
export function critiqueSolved(ex: ScreenCritiqueExercise, answer: CritiqueAnswer): boolean {
  const rolesOk = ex.zones.every((z) => {
    const picked = answer.roles[z.id];
    return picked !== undefined && gradeRole(z, picked) !== 'wrong';
  });
  const rebuiltOk = defectiveZones(ex).every((z) => answer.fixes[z.id] === correctFixId(z));
  // Every zone with authored deltas must have its broken properties named exactly.
  const deltasOk = deltaZones(ex).every((z) => gradeDeltaProps(z, answer.props[z.id] ?? []) === 'right');
  return rolesOk && rebuiltOk && deltasOk;
}

/** How many defective zones the learner has already reconstructed correctly. */
export function rebuiltCount(ex: ScreenCritiqueExercise, answer: CritiqueAnswer): number {
  return defectiveZones(ex).filter((z) => answer.fixes[z.id] === correctFixId(z)).length;
}

// ── Built-in scene content ───────────────────────────────────────────────────

/** Scene keys the player knows how to render: built-in DOM scenes + 'image'. */
export const CRITIQUE_SCENES = ['premium-card', 'image', 'svg'] as const;

export const PREMIUM_CARD_SCREEN_TITLE =
  'Экран банковской «Премиум карты» — баланс, действия, промо и бонусы';

/** Ground truth for the built-in "Премиум карта" scene (6 zones). */
export const PREMIUM_CARD_ZONES: CritiqueZone[] = [
  {
    id: 'topbar',
    label: 'Топ-бар',
    role: 'nav',
    debatableRoles: ['neutral'],
    roleNote:
      'Топ-бар почти нейтрален — но у него есть работа: вход назад и настройки. Это навигация, а не просто фон.',
    intent:
      'Минимальный топ-бар: назад слева, настройки справа. Намеренно тихий, только обрамляет экран и даёт выход.',
    defect: 'alignment',
    defectNote: 'Иконка настроек съехала вниз — сбита оптическая линия с «назад».',
    fixes: [
      { id: 'align', label: 'Выровнять иконки по одной линии', correct: true },
      { id: 'bigger', label: 'Увеличить иконку настроек' },
      { id: 'remove', label: 'Убрать иконку настроек' },
    ],
  },
  {
    id: 'header',
    label: 'Шапка с балансом',
    role: 'accent',
    debatableRoles: [],
    roleNote: 'Баланс 980 000 ₽ — то, ради чего открывают экран. Это главный акцент.',
    intent:
      'Шапка карты с балансом — смысловой центр. Баланс намеренно крупный и контрастный, прижат к правому полю — первое, что видит глаз.',
    defect: 'hierarchy',
    debatableDefects: ['alignment'],
    defectNote:
      'Баланс — смысл экрана — сделан мелким и тусклым: акцент не читается. Первично сломана иерархия.',
    fixes: [
      { id: 'emphasize', label: 'Сделать баланс крупным и контрастным', correct: true },
      { id: 'title', label: 'Увеличить название карты' },
      { id: 'bg', label: 'Добавить фон под шапку' },
    ],
  },
  {
    id: 'chips',
    label: 'Чипы карты',
    role: 'secondary',
    debatableRoles: ['neutral'],
    roleNote: 'Чипы карты — второстепенное: нужны, но не тянут взгляд, у них есть смысл (номер, добавить).',
    intent:
      'Чипы карты: последние цифры и кнопка добавить. Меньший радиус и размер, чем у плиток действий, чтобы не спорить за вес.',
    defect: 'radius',
    defectNote: 'Карта почти прямоугольная рядом с «плюсом»-пилюлей — скругления вразнобой.',
    fixes: [
      { id: 'unify', label: 'Привести скругления к одному радиусу', correct: true },
      { id: 'square', label: 'Сделать оба элемента прямоугольными' },
      { id: 'enlarge', label: 'Увеличить чип с номером' },
    ],
  },
  {
    id: 'actions',
    label: 'Быстрые действия',
    role: 'secondary',
    debatableRoles: ['neutral'],
    roleNote: 'Быстрые действия — важное второстепенное. Ядро сценария, но визуально спокойное.',
    intent:
      'Три плитки быстрых действий делят ширину поровну, иконки и подписи центрированы. Нейтральные поверхности — не перебивают баланс.',
    defect: 'radius',
    debatableDefects: ['alignment'],
    defectNote: 'Три плитки с разными скруглениями и неровным шагом — ряд не читается как система.',
    fixes: [
      { id: 'system', label: 'Одинаковые скругления и равный шаг', correct: true },
      { id: 'round', label: 'Сделать плитки круглыми' },
      { id: 'border', label: 'Добавить плиткам обводку' },
    ],
  },
  {
    id: 'promo',
    label: 'Промо-вклад',
    role: 'promo',
    debatableRoles: ['accent'],
    roleNote:
      'Промо-вклад — реклама, живёт отдельно от карты. «Главным акцентом» назвать защитимо (яркий, продаёт), но это НЕ то, ради чего пришёл пользователь.',
    intent:
      'Промо-вклад — рекламный блок в фирменном фиолетовом. Яркий намеренно, но по иерархии ниже баланса.',
    defect: 'contrast',
    defectNote: 'Заголовок оффера почти сливается с фиолетовым фоном — контраст завален.',
    fixes: [
      { id: 'contrast', label: 'Поднять контраст заголовка', correct: true },
      { id: 'smaller', label: 'Уменьшить заголовок' },
      { id: 'white', label: 'Сменить фон на белый' },
    ],
  },
  {
    id: 'bonuses',
    label: 'Бонусы',
    role: 'secondary',
    debatableRoles: ['promo'],
    roleNote: 'Бонусы — второстепенная выгода продукта. Близко к «рекламе», но это свойство карты, а не баннер.',
    intent:
      'Бонусы по карте — две плитки кэшбэка с оранжевой иконкой. Второстепенная выгода: тёплый акцент цепляет глаз, но блок внизу.',
    defect: 'consistency',
    debatableDefects: ['hierarchy'],
    defectNote:
      'Две карточки оформлены по-разному (поля, радиусы, «5%» только на одной). Первично — рассогласованность.',
    fixes: [
      { id: 'match', label: 'Оформить обе карточки одинаково', correct: true },
      { id: 'drop', label: 'Убрать вторую карточку' },
      { id: 'heading', label: 'Увеличить заголовок секции' },
    ],
  },
];

/** Build the ready-to-use built-in exercise (used in lessons + as an admin seed). */
export function premiumCardCritique(
  id: string,
  prompt = 'Поставь диагноз экрану и пересобери его: определи роль и дефект каждой зоны, затем выбери верное исправление.',
): ScreenCritiqueExercise {
  return {
    id,
    type: 'screen-critique',
    prompt,
    scene: 'premium-card',
    screenTitle: PREMIUM_CARD_SCREEN_TITLE,
    zones: PREMIUM_CARD_ZONES,
    explanation:
      'Ты прошёл полный цикл: заметил роль каждой зоны, назвал дефект и пересобрал экран в рабочий вид. Так и работает насмотренность — видеть не «нравится/не нравится», а что и почему не так.',
  };
}
