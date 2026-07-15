/**
 * Barrel that merges the three exercise dictionary groups into the flat
 * `exercises.*` namespace consumed via `t('exercises.<ns>.<key>')`. Each group
 * owns disjoint sub-namespaces, so a shallow spread is a safe merge.
 */
import { exCore } from './ex-core';
import { exCritique } from './ex-critique';
import { exWidgets } from './ex-widgets';

export const exercisesRu = { ...exCore.ru, ...exCritique.ru, ...exWidgets.ru };
export const exercisesEn = { ...exCore.en, ...exCritique.en, ...exWidgets.en };
