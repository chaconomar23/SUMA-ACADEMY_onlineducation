import { CategoryItem, LessonItem, ReelItem } from '../utils/academyLogic';

/**
 * Only the 4 core categories are preloaded by default.
 * Lessons and Reels start empty so all educational content comes strictly from administrator uploads.
 */
export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-psicologia',
    name: 'Psicología',
    slug: 'psicologia',
    description:
      'Procesos cognitivos, arquitectura de decisiones, sesgos del comportamiento humano y regulación emocional aplicada.',
    themeKey: 'psychology',
    authorUid: 'admin-chaconomar23',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'cat-marketing',
    name: 'Marketing',
    slug: 'marketing',
    description:
      'Estrategia de posicionamiento, narrativa de marca, embudos de conversión y psicología del consumidor digital.',
    themeKey: 'marketing',
    authorUid: 'admin-chaconomar23',
    createdAt: '2026-10-20T10:05:00.000Z',
    updatedAt: '2026-10-20T10:05:00.000Z',
  },
  {
    id: 'cat-ia',
    name: 'Inteligencia Artificial',
    slug: 'inteligencia-artificial',
    description:
      'Redes neuronales, ingeniería de prompts, automatización de flujos de trabajo y modelos generativos.',
    themeKey: 'ai',
    authorUid: 'admin-chaconomar23',
    createdAt: '2026-10-20T10:10:00.000Z',
    updatedAt: '2026-10-20T10:10:00.000Z',
  },
  {
    id: 'cat-liderazgo',
    name: 'Liderazgo y Productividad',
    slug: 'liderazgo-productividad',
    description:
      'Sistemas de enfoque profundo, gestión de equipos de alto rendimiento y comunicación ejecutiva.',
    themeKey: 'leadership',
    authorUid: 'admin-chaconomar23',
    createdAt: '2026-10-20T10:15:00.000Z',
    updatedAt: '2026-10-20T10:15:00.000Z',
  },
];

export const INITIAL_LESSONS: LessonItem[] = [];

export const INITIAL_REELS: ReelItem[] = [];
