export type ThemeKey = 'psychology' | 'marketing' | 'ai' | 'finance' | 'design' | 'leadership';

export type LessonLevel = 'Fundamentos' | 'Intermedio' | 'Avanzado';

export type MaterialType = 'pdf' | 'video' | 'image' | 'guide';

export interface DidacticMaterial {
  id: string;
  title: string;
  type: MaterialType;
  url: string;
  fileName?: string;
  description: string;
  sizeOrDuration: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  themeKey: ThemeKey;
  authorUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonItem {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  videoFileName?: string;
  durationMinutes: number;
  level: LessonLevel;
  keyTakeaways: string[];
  materials: DidacticMaterial[];
  quizQuestions: QuizQuestion[];
  authorUid: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReelItem {
  id: string;
  categoryId: string;
  title: string;
  caption: string;
  videoUrl: string;
  fileName: string;
  durationSeconds: number;
  authorUid: string;
  isPublished: boolean;
  createdAt: string;
}

export interface QuizAttemptRecord {
  id: string;
  userId: string;
  lessonId: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  status: 'completed';
  createdAt: string;
}

export interface AcademyUser {
  uid: string;
  usernameOrEmail: string;
  displayName: string;
  email: string;
  role: 'admin' | 'student';
  authMethod: 'admin-secret' | 'google' | 'email';
}

export const HIDDEN_ADMIN_USERNAME = 'chaconomar23';
export const HIDDEN_ADMIN_PASSWORD = 'OmarJR2006';

/**
 * Checks whether the unified login form inputs match the hidden administrator credentials.
 * Accepts 'chaconomar23' or 'chaconomar23@...' as identifier when paired with exact password 'OmarJR2006'.
 */
export function evaluateUnifiedLogin(
  identifierInput: string,
  passwordInput: string
): { valid: boolean; role: 'admin' | 'student'; normalizedIdentifier: string; error?: string } {
  const cleanIdentifier = identifierInput.trim();
  const cleanPassword = passwordInput;

  if (!cleanIdentifier) {
    return {
      valid: false,
      role: 'student',
      normalizedIdentifier: '',
      error: 'Ingresa tu usuario o correo electrónico.',
    };
  }

  if (!cleanPassword || cleanPassword.length < 4) {
    return {
      valid: false,
      role: 'student',
      normalizedIdentifier: cleanIdentifier,
      error: 'Ingresa una contraseña válida (mínimo 4 caracteres).',
    };
  }

  const lowerId = cleanIdentifier.toLowerCase();
  const isChaconUser =
    lowerId === HIDDEN_ADMIN_USERNAME ||
    lowerId.startsWith(`${HIDDEN_ADMIN_USERNAME}@`);

  if (isChaconUser && cleanPassword === HIDDEN_ADMIN_PASSWORD) {
    return {
      valid: true,
      role: 'admin',
      normalizedIdentifier: HIDDEN_ADMIN_USERNAME,
    };
  }

  if (isChaconUser && cleanPassword !== HIDDEN_ADMIN_PASSWORD) {
    return {
      valid: false,
      role: 'student',
      normalizedIdentifier: cleanIdentifier,
      error: 'Credenciales incorrectas para esta cuenta.',
    };
  }

  return {
    valid: true,
    role: 'student',
    normalizedIdentifier: cleanIdentifier,
  };
}

/**
 * Extracts a clean 11-character YouTube video ID from standard watch URLs, youtu.be links, shorts, or embed URLs.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Normalizes a category name into a URL-safe slug matching ^[a-z0-9\-]+$
 */
export function createSlug(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 75);
  return normalized.length >= 2 ? normalized : `cat-${Date.now().toString(36)}`;
}

/**
 * Grades a student's quiz answers against a lesson's quiz questions.
 */
export function evaluateQuizSubmission(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>
): {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  passed: boolean;
  questionResults: { questionId: string; isCorrect: boolean; selectedIndex: number; correctIndex: number }[];
} {
  if (!questions || questions.length === 0) {
    return {
      correctCount: 0,
      totalQuestions: 0,
      scorePercent: 100,
      passed: true,
      questionResults: [],
    };
  }

  let correctCount = 0;
  const questionResults = questions.map((q) => {
    const selectedIndex = typeof selectedAnswers[q.id] === 'number' ? selectedAnswers[q.id] : -1;
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) correctCount += 1;
    return {
      questionId: q.id,
      isCorrect,
      selectedIndex,
      correctIndex: q.correctIndex,
    };
  });

  const totalQuestions = questions.length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  return {
    correctCount,
    totalQuestions,
    scorePercent,
    passed: scorePercent >= 70,
    questionResults,
  };
}

/**
 * Validates outgoing Category payload against firebase-blueprint.json constraints.
 */
export function validateCategoryInput(input: {
  name: string;
  description: string;
  themeKey: ThemeKey;
}): { valid: boolean; error?: string } {
  const name = input.name.trim();
  const description = input.description.trim();

  if (name.length < 2 || name.length > 80) {
    return { valid: false, error: 'El nombre de la categoría debe tener entre 2 y 80 caracteres.' };
  }
  if (description.length < 5 || description.length > 500) {
    return { valid: false, error: 'La descripción debe tener entre 5 y 500 caracteres.' };
  }
  const allowedThemes: ThemeKey[] = ['psychology', 'marketing', 'ai', 'finance', 'design', 'leadership'];
  if (!allowedThemes.includes(input.themeKey)) {
    return { valid: false, error: 'Selecciona un tema visual válido.' };
  }
  return { valid: true };
}

/**
 * Validates outgoing Lesson payload against firebase-blueprint.json constraints.
 */
export function validateLessonInput(input: {
  categoryId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  durationMinutes: number;
}): { valid: boolean; error?: string } {
  if (!input.categoryId || !/^[a-zA-Z0-9_\-]+$/.test(input.categoryId)) {
    return { valid: false, error: 'Selecciona una categoría válida.' };
  }
  const title = input.title.trim();
  if (title.length < 3 || title.length > 140) {
    return { valid: false, error: 'El título de la lección debe tener entre 3 y 140 caracteres.' };
  }
  const description = input.description.trim();
  if (description.length < 10 || description.length > 3000) {
    return { valid: false, error: 'La descripción debe tener entre 10 y 3000 caracteres.' };
  }
  if (input.youtubeUrl.trim().length > 500) {
    return { valid: false, error: 'La referencia o enlace de video no puede superar los 500 caracteres.' };
  }
  if (
    typeof input.durationMinutes !== 'number' ||
    Number.isNaN(input.durationMinutes) ||
    input.durationMinutes < 1 ||
    input.durationMinutes > 600
  ) {
    return { valid: false, error: 'La duración debe estar entre 1 y 600 minutos.' };
  }
  return { valid: true };
}

/**
 * Validates outgoing Reel payload (short educational video).
 */
export function validateReelInput(input: {
  categoryId: string;
  title: string;
  caption: string;
  videoUrl: string;
  durationSeconds: number;
}): { valid: boolean; error?: string } {
  if (!input.categoryId || !/^[a-zA-Z0-9_\-]+$/.test(input.categoryId)) {
    return { valid: false, error: 'Selecciona una categoría válida para el Reel.' };
  }
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) {
    return { valid: false, error: 'El título del Reel debe tener entre 3 y 120 caracteres.' };
  }
  const caption = input.caption.trim();
  if (caption.length < 5 || caption.length > 600) {
    return { valid: false, error: 'La descripción del Reel debe tener entre 5 y 600 caracteres.' };
  }
  const videoUrl = input.videoUrl.trim();
  if (!videoUrl || videoUrl.length > 500) {
    return { valid: false, error: 'Sube un archivo de video desde tu dispositivo o ingresa un enlace válido.' };
  }
  if (
    typeof input.durationSeconds !== 'number' ||
    Number.isNaN(input.durationSeconds) ||
    input.durationSeconds < 1 ||
    input.durationSeconds > 600
  ) {
    return { valid: false, error: 'La duración del Reel debe estar entre 1 y 600 segundos.' };
  }
  return { valid: true };
}
