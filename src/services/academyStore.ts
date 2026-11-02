import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AcademyUser,
  CategoryItem,
  LessonItem,
  QuizAttemptRecord,
  ReelItem,
} from '../utils/academyLogic';
import {
  INITIAL_CATEGORIES,
  INITIAL_LESSONS,
  INITIAL_REELS,
} from '../data/seedAcademyData';

const STORAGE_KEYS = {
  CATEGORIES: 'suma_academy_categories_v2',
  LESSONS: 'suma_academy_lessons_v2',
  REELS: 'suma_academy_reels_v2',
  ATTEMPTS: 'suma_academy_attempts_v2',
  COMPLETED: 'suma_academy_completed_v2',
  SAVED_REELS: 'suma_academy_saved_reels_v2',
  NOTES: 'suma_academy_notes_v2',
  SESSION_USER: 'suma_academy_user_v2',
};

const CHANNEL_NAME = 'suma_academy_realtime_sync';

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadInitialCategories(): CategoryItem[] {
  const stored = safeReadJson<CategoryItem[] | null>(STORAGE_KEYS.CATEGORIES, null);
  if (stored && stored.length > 0) return stored;
  safeWriteJson(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  return INITIAL_CATEGORIES;
}

export function loadInitialLessons(): LessonItem[] {
  const stored = safeReadJson<LessonItem[] | null>(STORAGE_KEYS.LESSONS, null);
  if (stored) return stored;
  safeWriteJson(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
  return INITIAL_LESSONS;
}

export function loadInitialReels(): ReelItem[] {
  const stored = safeReadJson<ReelItem[] | null>(STORAGE_KEYS.REELS, null);
  if (stored) return stored;
  safeWriteJson(STORAGE_KEYS.REELS, INITIAL_REELS);
  return INITIAL_REELS;
}

export function loadInitialAttempts(): QuizAttemptRecord[] {
  return safeReadJson<QuizAttemptRecord[]>(STORAGE_KEYS.ATTEMPTS, []);
}

export function loadCompletedLessons(): string[] {
  return safeReadJson<string[]>(STORAGE_KEYS.COMPLETED, []);
}

export function loadSavedReels(): string[] {
  return safeReadJson<string[]>(STORAGE_KEYS.SAVED_REELS, []);
}

export function loadLessonNotes(): Record<string, string> {
  return safeReadJson<Record<string, string>>(STORAGE_KEYS.NOTES, {});
}

export function loadSessionUser(): AcademyUser | null {
  return safeReadJson<AcademyUser | null>(STORAGE_KEYS.SESSION_USER, null);
}

export function saveSessionUser(user: AcademyUser | null): void {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
  } else {
    safeWriteJson(STORAGE_KEYS.SESSION_USER, user);
  }
}

export function broadcastSyncUpdate(): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'SYNC_NOW', timestamp: Date.now() });
      ch.close();
    }
    window.dispatchEvent(new CustomEvent('suma-academy-sync'));
  } catch {
    // Ignore broadcast errors
  }
}

export function subscribeRealtimeSync(onUpdate: () => void): () => void {
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => onUpdate();
  }
  const handleWindowSync = () => onUpdate();
  const handleStorage = () => onUpdate();
  window.addEventListener('suma-academy-sync', handleWindowSync);
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) channel.close();
    window.removeEventListener('suma-academy-sync', handleWindowSync);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Subscribes to Firestore collections when a Firebase Auth user is active,
 * merging remote documents with local curriculum state in real time.
 */
export function subscribeFirestoreCatalog(
  onCategoriesMerge: (remoteCategories: CategoryItem[]) => void,
  onLessonsMerge: (remoteLessons: LessonItem[]) => void,
  onReelsMerge: (remoteReels: ReelItem[]) => void
): () => void {
  if (!auth.currentUser) {
    return () => {};
  }

  const unsubCategories = onSnapshot(
    collection(db, 'categories'),
    (snapshot) => {
      const items: CategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: d.id || docSnap.id,
          name: d.name,
          slug: d.slug,
          description: d.description,
          themeKey: d.themeKey || 'psychology',
          authorUid: d.authorUid || 'admin',
          createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
          updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
        });
      });
      if (items.length > 0) {
        onCategoriesMerge(items);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'categories');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  const lessonsQuery = query(collection(db, 'lessons'), where('isPublished', '==', true));
  const unsubLessons = onSnapshot(
    lessonsQuery,
    (snapshot) => {
      const items: LessonItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: d.id || docSnap.id,
          categoryId: d.categoryId,
          title: d.title,
          description: d.description,
          youtubeUrl: d.youtubeUrl || '',
          durationMinutes: Number(d.durationMinutes) || 15,
          level: d.level || 'Fundamentos',
          keyTakeaways: Array.isArray(d.keyTakeaways) ? d.keyTakeaways : [],
          materials: Array.isArray(d.materials) ? d.materials : [],
          quizQuestions: Array.isArray(d.quizQuestions) ? d.quizQuestions : [],
          authorUid: d.authorUid || 'admin',
          isPublished: Boolean(d.isPublished),
          createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
          updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
        });
      });
      if (items.length > 0) {
        onLessonsMerge(items);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'lessons');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  const reelsQuery = query(collection(db, 'reels'), where('isPublished', '==', true));
  const unsubReels = onSnapshot(
    reelsQuery,
    (snapshot) => {
      const items: ReelItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: d.id || docSnap.id,
          categoryId: d.categoryId,
          title: d.title,
          caption: d.caption,
          videoUrl: d.videoUrl || '',
          fileName: d.fileName || '',
          durationSeconds: Number(d.durationSeconds) || 45,
          authorUid: d.authorUid || 'admin',
          isPublished: Boolean(d.isPublished),
          createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
        });
      });
      if (items.length > 0) {
        onReelsMerge(items);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'reels');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  return () => {
    unsubCategories();
    unsubLessons();
    unsubReels();
  };
}

export async function persistCategory(category: CategoryItem): Promise<CategoryItem[]> {
  const current = loadInitialCategories();
  const existsIdx = current.findIndex((c) => c.id === category.id);
  const next =
    existsIdx >= 0
      ? current.map((c) => (c.id === category.id ? category : c))
      : [category, ...current];

  safeWriteJson(STORAGE_KEYS.CATEGORIES, next);
  broadcastSyncUpdate();

  if (auth.currentUser && auth.currentUser.email === 'chaconomar411@gmail.com') {
    const path = `categories/${category.id}`;
    try {
      await setDoc(doc(db, 'categories', category.id), {
        ...category,
        authorUid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch {
        // Handled
      }
    }
  }

  return next;
}

export async function removeCategory(categoryId: string): Promise<{
  categories: CategoryItem[];
  lessons: LessonItem[];
  reels: ReelItem[];
}> {
  const nextCategories = loadInitialCategories().filter((c) => c.id !== categoryId);
  const nextLessons = loadInitialLessons().filter((l) => l.categoryId !== categoryId);
  const nextReels = loadInitialReels().filter((r) => r.categoryId !== categoryId);
  safeWriteJson(STORAGE_KEYS.CATEGORIES, nextCategories);
  safeWriteJson(STORAGE_KEYS.LESSONS, nextLessons);
  safeWriteJson(STORAGE_KEYS.REELS, nextReels);
  broadcastSyncUpdate();

  if (auth.currentUser && auth.currentUser.email === 'chaconomar411@gmail.com') {
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
      } catch {
        // Handled
      }
    }
  }

  return { categories: nextCategories, lessons: nextLessons, reels: nextReels };
}

export async function persistLesson(lesson: LessonItem): Promise<LessonItem[]> {
  const current = loadInitialLessons();
  const existsIdx = current.findIndex((l) => l.id === lesson.id);
  const next =
    existsIdx >= 0
      ? current.map((l) => (l.id === lesson.id ? lesson : l))
      : [lesson, ...current];

  safeWriteJson(STORAGE_KEYS.LESSONS, next);
  broadcastSyncUpdate();

  if (auth.currentUser && auth.currentUser.email === 'chaconomar411@gmail.com') {
    const path = `lessons/${lesson.id}`;
    try {
      await setDoc(doc(db, 'lessons', lesson.id), {
        id: lesson.id,
        categoryId: lesson.categoryId,
        title: lesson.title,
        description: lesson.description,
        youtubeUrl: lesson.youtubeUrl,
        durationMinutes: lesson.durationMinutes,
        level: lesson.level,
        keyTakeaways: lesson.keyTakeaways,
        materials: lesson.materials,
        quizQuestions: lesson.quizQuestions,
        authorUid: auth.currentUser.uid,
        isPublished: lesson.isPublished,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch {
        // Handled
      }
    }
  }

  return next;
}

export async function removeLesson(lessonId: string): Promise<LessonItem[]> {
  const next = loadInitialLessons().filter((l) => l.id !== lessonId);
  safeWriteJson(STORAGE_KEYS.LESSONS, next);
  broadcastSyncUpdate();

  if (auth.currentUser && auth.currentUser.email === 'chaconomar411@gmail.com') {
    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
      } catch {
        // Handled
      }
    }
  }

  return next;
}

export async function persistReel(reel: ReelItem): Promise<ReelItem[]> {
  const current = loadInitialReels();
  const existsIdx = current.findIndex((r) => r.id === reel.id);
  const next =
    existsIdx >= 0
      ? current.map((r) => (r.id === reel.id ? reel : r))
      : [reel, ...current];

  safeWriteJson(STORAGE_KEYS.REELS, next);
  broadcastSyncUpdate();

  if (auth.currentUser && auth.currentUser.email === 'chaconomar411@gmail.com') {
    const path = `reels/${reel.id}`;
    try {
      await setDoc(doc(db, 'reels', reel.id), {
        id: reel.id,
        categoryId: reel.categoryId,
        title: reel.title,
        caption: reel.caption,
        videoUrl: reel.videoUrl,
        fileName: reel.fileName,
        durationSeconds: reel.durationSeconds,
        authorUid: auth.currentUser.uid,
        isPublished: reel.isPublished,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch {
        // Handled
      }
    }
  }

  return next;
}

export async function removeReel(reelId: string): Promise<ReelItem[]> {
  const next = loadInitialReels().filter((r) => r.id !== reelId);
  safeWriteJson(STORAGE_KEYS.REELS, next);
  broadcastSyncUpdate();

  if (auth.currentUser && auth.currentUser.email === 'chaconomar411@gmail.com') {
    try {
      await deleteDoc(doc(db, 'reels', reelId));
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `reels/${reelId}`);
      } catch {
        // Handled
      }
    }
  }

  return next;
}

export function toggleSavedReel(reelId: string): string[] {
  const current = loadSavedReels();
  const next = current.includes(reelId)
    ? current.filter((id) => id !== reelId)
    : [...current, reelId];
  safeWriteJson(STORAGE_KEYS.SAVED_REELS, next);
  broadcastSyncUpdate();
  return next;
}

export function saveQuizAttemptAndComplete(
  attempt: QuizAttemptRecord,
  markLessonCompleted: boolean
): { attempts: QuizAttemptRecord[]; completedIds: string[] } {
  const currentAttempts = loadInitialAttempts();
  const nextAttempts = [attempt, ...currentAttempts];
  safeWriteJson(STORAGE_KEYS.ATTEMPTS, nextAttempts);

  const currentCompleted = loadCompletedLessons();
  const nextCompleted =
    markLessonCompleted && !currentCompleted.includes(attempt.lessonId)
      ? [...currentCompleted, attempt.lessonId]
      : currentCompleted;
  safeWriteJson(STORAGE_KEYS.COMPLETED, nextCompleted);
  broadcastSyncUpdate();

  return { attempts: nextAttempts, completedIds: nextCompleted };
}

export function toggleLessonCompletion(lessonId: string): string[] {
  const current = loadCompletedLessons();
  const next = current.includes(lessonId)
    ? current.filter((id) => id !== lessonId)
    : [...current, lessonId];
  safeWriteJson(STORAGE_KEYS.COMPLETED, next);
  broadcastSyncUpdate();
  return next;
}

export function saveStudentNote(lessonId: string, noteText: string): Record<string, string> {
  const current = loadLessonNotes();
  const next = { ...current, [lessonId]: noteText.slice(0, 2000) };
  safeWriteJson(STORAGE_KEYS.NOTES, next);
  return next;
}
