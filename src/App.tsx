/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Compass,
  Award,
  PlusCircle,
  Search,
  LogOut,
  CheckCircle2,
  Play,
  ChevronRight,
  SlidersHorizontal,
  UserCheck,
  Film,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  AcademyUser,
  CategoryItem,
  LessonItem,
  QuizAttemptRecord,
  ReelItem,
} from './utils/academyLogic';
import {
  loadCompletedLessons,
  loadInitialAttempts,
  loadInitialCategories,
  loadInitialLessons,
  loadInitialReels,
  loadLessonNotes,
  loadSavedReels,
  loadSessionUser,
  persistCategory,
  persistLesson,
  persistReel,
  removeCategory,
  removeLesson,
  removeReel,
  saveQuizAttemptAndComplete,
  saveSessionUser,
  saveStudentNote,
  subscribeFirestoreCatalog,
  subscribeRealtimeSync,
  toggleLessonCompletion,
  toggleSavedReel,
} from './services/academyStore';
import { AuthScreen } from './components/AuthScreen';
import { CategoryArtwork } from './components/CategoryArtwork';
import { LessonDetailView } from './components/LessonDetailView';
import { AdminStudioPanel } from './components/AdminStudioModal';
import { ReelsView } from './components/ReelsView';

type BottomNavTab = 'home' | 'reels' | 'categories' | 'progress' | 'admin';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AcademyUser | null>(() => {
    const saved = loadSessionUser();
    if (saved) return saved;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return {
        uid: 'student-demo',
        usernameOrEmail: 'estudiante@sumaacademy.edu',
        displayName: 'Estudiante SUMA+',
        email: 'estudiante@sumaacademy.edu',
        role: 'student',
        authMethod: 'email',
      };
    }
    return null;
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => loadInitialCategories());
  const [lessons, setLessons] = useState<LessonItem[]>(() => loadInitialLessons());
  const [reels, setReels] = useState<ReelItem[]>(() => loadInitialReels());
  const [completedIds, setCompletedIds] = useState<string[]>(() => loadCompletedLessons());
  const [savedReelIds, setSavedReelIds] = useState<string[]>(() => loadSavedReels());
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>(() => loadInitialAttempts());
  const [notes, setNotes] = useState<Record<string, string>>(() => loadLessonNotes());

  const [activeTab, setActiveTab] = useState<BottomNavTab>('home');
  const [adminInitialTab, setAdminInitialTab] = useState<
    'lesson' | 'reel' | 'category' | 'catalog'
  >('lesson');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, selectedLessonId, selectedCategoryId]);

  // Subscribe to real-time updates (BroadcastChannel + localStorage + Firestore onSnapshot)
  useEffect(() => {
    const refreshFromLocal = () => {
      setCategories(loadInitialCategories());
      setLessons(loadInitialLessons());
      setReels(loadInitialReels());
      setCompletedIds(loadCompletedLessons());
      setSavedReelIds(loadSavedReels());
      setAttempts(loadInitialAttempts());
      setNotes(loadLessonNotes());
    };

    const unsubLocal = subscribeRealtimeSync(refreshFromLocal);
    const unsubFirestore = subscribeFirestoreCatalog(
      (remoteCats) => {
        setCategories((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          remoteCats.forEach((rc) => map.set(rc.id, rc));
          return Array.from(map.values());
        });
      },
      (remoteLessons) => {
        setLessons((prev) => {
          const map = new Map(prev.map((l) => [l.id, l]));
          remoteLessons.forEach((rl) => map.set(rl.id, rl));
          return Array.from(map.values());
        });
      },
      (remoteReels) => {
        setReels((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          remoteReels.forEach((rr) => map.set(rr.id, rr));
          return Array.from(map.values());
        });
      }
    );

    return () => {
      unsubLocal();
      unsubFirestore();
    };
  }, [currentUser?.uid]);

  const handleAuthenticated = (user: AcademyUser) => {
    setCurrentUser(user);
    saveSessionUser(user);
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if not signed in via Firebase
    }
    saveSessionUser(null);
    setCurrentUser(null);
    setSelectedLessonId(null);
    setActiveTab('home');
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((les) => {
      const matchesCat =
        selectedCategoryId === 'all' || les.categoryId === selectedCategoryId;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const catName =
        categories.find((c) => c.id === les.categoryId)?.name.toLowerCase() || '';
      return (
        matchesCat &&
        (les.title.toLowerCase().includes(q) ||
          les.description.toLowerCase().includes(q) ||
          catName.includes(q))
      );
    });
  }, [lessons, selectedCategoryId, searchQuery, categories]);

  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || null,
    [lessons, selectedLessonId]
  );

  const progressPercentage = useMemo(() => {
    if (lessons.length === 0) return 0;
    const validCompleted = completedIds.filter((id) => lessons.some((l) => l.id === id));
    return Math.round((validCompleted.length / lessons.length) * 100);
  }, [completedIds, lessons]);

  const averageQuizScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((acc, item) => acc + item.scorePercent, 0);
    return Math.round(total / attempts.length);
  }, [attempts]);

  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col">
      {/* Top Bar Contract (Dark Mode, Sticky 56px) */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-8 px-4 sm:px-6 border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur-md">
        {/* Zone 1: Brand Title */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            setSelectedLessonId(null);
            setActiveTab('home');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          SUMA+ ACADEMY
        </a>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('home');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'home' && !selectedLessonId ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            Biblioteca
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('reels');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'reels' && !selectedLessonId ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            Reels
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('categories');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'categories' && !selectedLessonId ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            Categorías
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('progress');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'progress' && !selectedLessonId ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            Mi Progreso
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setSelectedLessonId(null);
                setActiveTab('admin');
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'admin' && !selectedLessonId ? 'text-[#38BDF8] font-semibold' : ''
              }`}
            >
              Panel Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Single Primary Contextual Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace (Vertical Mobile Primary Feed + Contextual Desktop Column) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Primary Vertical Mobile Stream (8 cols on lg) */}
        <div className="lg:col-span-8 w-full space-y-6">
          {selectedLesson ? (
            <LessonDetailView
              lesson={selectedLesson}
              category={categories.find((c) => c.id === selectedLesson.categoryId)}
              isCompleted={completedIds.includes(selectedLesson.id)}
              isAdmin={isAdmin}
              userId={currentUser.uid}
              initialNote={notes[selectedLesson.id] || ''}
              previousAttempts={attempts}
              onBack={() => setSelectedLessonId(null)}
              onToggleComplete={(lessonId) => {
                const updated = toggleLessonCompletion(lessonId);
                setCompletedIds(updated);
              }}
              onSubmitQuizAttempt={(attempt, passed) => {
                const res = saveQuizAttemptAndComplete(attempt, passed);
                setAttempts(res.attempts);
                setCompletedIds(res.completedIds);
              }}
              onSaveNote={(lessonId, noteText) => {
                const updated = saveStudentNote(lessonId, noteText);
                setNotes(updated);
              }}
              onEditLesson={(lessonToEdit) => {
                setEditingLesson(lessonToEdit);
                setAdminInitialTab('lesson');
                setSelectedLessonId(null);
                setActiveTab('admin');
              }}
              onDeleteLesson={async (lessonId) => {
                const next = await removeLesson(lessonId);
                setLessons(next);
                setSelectedLessonId(null);
              }}
            />
          ) : activeTab === 'admin' && isAdmin ? (
            <AdminStudioPanel
              categories={categories}
              lessons={lessons}
              reels={reels}
              authorUid={currentUser.uid}
              initialEditLesson={editingLesson}
              initialStudioTab={adminInitialTab}
              onSaveCategory={async (newCat) => {
                const next = await persistCategory(newCat);
                setCategories(next);
              }}
              onDeleteCategory={async (catId) => {
                const res = await removeCategory(catId);
                setCategories(res.categories);
                setLessons(res.lessons);
                setReels(res.reels);
              }}
              onSaveLesson={async (newLes) => {
                const next = await persistLesson(newLes);
                setLessons(next);
                setEditingLesson(null);
              }}
              onDeleteLesson={async (lesId) => {
                const next = await removeLesson(lesId);
                setLessons(next);
              }}
              onSaveReel={async (newReel) => {
                const next = await persistReel(newReel);
                setReels(next);
              }}
              onDeleteReel={async (reelId) => {
                const next = await removeReel(reelId);
                setReels(next);
              }}
              onPreviewAsStudent={(lessonId, categoryId, openReels) => {
                if (openReels) {
                  setSelectedLessonId(null);
                  setActiveTab('reels');
                  return;
                }
                if (categoryId) setSelectedCategoryId(categoryId);
                if (lessonId) {
                  setSelectedLessonId(lessonId);
                } else {
                  setSelectedLessonId(null);
                  setActiveTab('home');
                }
              }}
            />
          ) : activeTab === 'reels' ? (
            <ReelsView
              reels={reels}
              categories={categories}
              savedReelIds={savedReelIds}
              isAdmin={isAdmin}
              onToggleSaveReel={(reelId) => {
                setSavedReelIds(toggleSavedReel(reelId));
              }}
              onDeleteReel={async (reelId) => {
                const next = await removeReel(reelId);
                setReels(next);
              }}
              onOpenAdminReelUpload={() => {
                setAdminInitialTab('reel');
                setActiveTab('admin');
              }}
              onExploreCategory={(catId) => {
                setSelectedCategoryId(catId);
                setActiveTab('home');
              }}
            />
          ) : activeTab === 'categories' ? (
            /* CATEGORIES DIRECTORY VIEW (DARK MODE) */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-white font-display">
                    Categorías de Aprendizaje
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Las 4 áreas fundamentales y categorías creadas por el administrador.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminInitialTab('category');
                      setActiveTab('admin');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Nueva Categoría o Lección</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {categories.map((cat) => {
                  const catLessons = lessons.filter((l) => l.categoryId === cat.id);
                  const catReels = reels.filter((r) => r.categoryId === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="bg-[#131C2E] rounded-3xl border border-slate-800 overflow-hidden flex flex-col justify-between transition-colors hover:border-slate-700"
                    >
                      <div>
                        <CategoryArtwork themeKey={cat.themeKey} className="w-full h-32" />
                        <div className="p-5 space-y-2">
                          <div className="text-xs text-slate-400 font-mono tabular-nums">
                            {catLessons.length} lecciones · {catReels.length} reels
                          </div>
                          <h2 className="text-lg font-bold text-white font-display">
                            {cat.name}
                          </h2>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setActiveTab('home');
                          }}
                          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#38BDF8] hover:text-[#38BDF8] text-white text-xs font-semibold flex items-center justify-between transition-colors"
                        >
                          <span>Explorar lecciones de {cat.name}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'progress' ? (
            /* STUDENT PROGRESS & QUIZ SCORES VIEW (DARK MODE) */
            <div className="space-y-6">
              <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#38BDF8]">Perfil Académico Activo</div>
                    <h1 className="text-2xl font-bold text-white font-display mt-0.5">
                      {currentUser.displayName}
                    </h1>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {currentUser.email} · Rol:{' '}
                      {isAdmin ? 'Administrador Académico' : 'Estudiante'}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="text-2xl font-bold text-white font-mono tabular-nums">
                      {progressPercentage}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Avance del Catálogo</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="text-2xl font-bold text-white font-mono tabular-nums">
                      {completedIds.length}/{lessons.length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Lecciones Completadas</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                      {averageQuizScore}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Promedio en Evaluaciones</div>
                  </div>
                </div>
              </div>

              {/* Completed Lessons & Quiz History */}
              <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-6 space-y-4">
                <h2 className="text-base font-bold text-white font-display">
                  Historial de Cuestionarios y Lecciones
                </h2>
                {lessons.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Aún no hay lecciones cargadas en la biblioteca. Cuando el administrador suba
                    lecciones, tu progreso aparecerá aquí.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {lessons.map((les) => {
                      const done = completedIds.includes(les.id);
                      const cat = categories.find((c) => c.id === les.categoryId);
                      const lesAttempts = attempts.filter((a) => a.lessonId === les.id);
                      const best =
                        lesAttempts.length > 0
                          ? Math.max(...lesAttempts.map((a) => a.scorePercent))
                          : null;

                      return (
                        <div
                          key={les.id}
                          className="py-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs text-slate-400">
                              {cat?.name} · {les.durationMinutes} min
                              {best !== null ? ` · Mejor evaluación: ${best}%` : ''}
                            </div>
                            <div className="text-sm font-bold text-white">{les.title}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedLessonId(les.id)}
                            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                              done
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700'
                                : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            {done ? 'Completada · Repasar' : 'Estudiar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* HOME / STUDENT VERTICAL MOBILE LIBRARY FEED (DARK MODE) */
            <div className="space-y-6">
              {/* Hero Welcome Card */}
              <div className="bg-[#131C2E] border border-slate-800 text-white rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    Hola, <strong className="text-white">{currentUser.displayName}</strong>
                  </span>
                  <span className="font-mono tabular-nums">
                    {categories.length} categorías · {lessons.length} lecciones · {reels.length}{' '}
                    reels
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold font-display leading-tight">
                  Biblioteca de Lecciones SUMA+ ACADEMY
                </h1>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    aria-label="Buscar lección o tema"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por tema (Psicología, Marketing, IA, Liderazgo...)"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>

                {isAdmin && (
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                    <span className="text-xs text-[#38BDF8]">
                      Sesión de Administrador activa: sube lecciones, archivos o Reels en vivo.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminInitialTab('lesson');
                          setActiveTab('admin');
                        }}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Subir Lección</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminInitialTab('reel');
                          setActiveTab('admin');
                        }}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Film className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Subir Reel</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Category Filter Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Filtrar por Categoría Temática
                  </span>
                  {selectedCategoryId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId('all')}
                      className="text-xs font-semibold text-[#38BDF8] hover:underline"
                    >
                      Ver todas ({lessons.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategoryId === 'all'
                        ? 'bg-[#38BDF8] text-[#090D16]'
                        : 'bg-[#131C2E] border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Todas ({lessons.length})
                  </button>
                  {categories.map((cat) => {
                    const count = lessons.filter((l) => l.categoryId === cat.id).length;
                    const active = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#38BDF8] text-[#090D16]'
                            : 'bg-[#131C2E] border border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vertical Feed of Lesson Cards (Clean Empty State when 0 lessons uploaded) */}
              {filteredLessons.length === 0 ? (
                <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-8 sm:p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-[#38BDF8] flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="text-base font-bold text-white font-display">
                      {lessons.length === 0
                        ? 'Aún no hay lecciones publicadas en la biblioteca'
                        : 'No hay lecciones en esta categoría o búsqueda'}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {lessons.length === 0
                        ? 'Las 4 categorías principales están listas. En cuanto el administrador suba la primera lección desde archivos o link, aparecerá aquí inmediatamente.'
                        : 'Selecciona otra categoría temática o limpia el filtro de búsqueda.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {selectedCategoryId !== 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId('all');
                          setSearchQuery('');
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                      >
                        Mostrar todas las categorías
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminInitialTab('lesson');
                          setActiveTab('admin');
                        }}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Subir Primera Lección Ahora</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLessons.map((lesson) => {
                    const cat = categories.find((c) => c.id === lesson.categoryId);
                    const isDone = completedIds.includes(lesson.id);

                    return (
                      <article
                        key={lesson.id}
                        className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 hover:border-slate-700 transition-colors space-y-4"
                      >
                        {/* Clean Unboxed Metadata Row (Zero-Pill Discipline) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#38BDF8]">
                              {cat?.name || 'General'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{lesson.level}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {lesson.durationMinutes} min
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {lesson.materials.length} materiales
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {lesson.quizQuestions.length} preguntas
                            </span>
                          </div>
                          {isDone && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completada</span>
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h2 className="text-lg sm:text-xl font-bold text-white font-display leading-snug">
                            {lesson.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                            {lesson.description}
                          </p>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                          <div className="text-xs text-slate-400">
                            {lesson.videoFileName
                              ? `Video local: ${lesson.videoFileName}`
                              : 'Video, material didáctico y cuestionario'}
                          </div>
                          <button
                            type="button"
                            aria-label={`Abrir lección ${lesson.title}`}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Abrir Lección</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Contextual Column on Desktop (4 cols on lg, Dark Mode) */}
        <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-20">
          {/* Quick Student Progress Summary Card */}
          <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-display">
                Resumen de Estudio
              </h2>
              <span className="text-xs font-mono font-semibold text-[#38BDF8] tabular-nums">
                {progressPercentage}% completado
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#38BDF8] transition-transform duration-200 origin-left"
                style={{ transform: `scaleX(${Math.max(0.02, progressPercentage / 100)})` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-xl font-bold text-white font-mono tabular-nums">
                  {completedIds.length}
                </div>
                <div className="text-xs text-slate-400">Lecciones terminadas</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
                  {reels.length}
                </div>
                <div className="text-xs text-slate-400">Reels disponibles</div>
              </div>
            </div>
          </div>

          {/* Categories Quick Directory */}
          <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-display">
                Áreas de la Biblioteca
              </h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                0{categories.length}
              </span>
            </div>
            <div className="divide-y divide-slate-800">
              {categories.map((cat) => {
                const count = lessons.filter((l) => l.categoryId === cat.id).length;
                const reelCount = reels.filter((r) => r.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(null);
                      setSelectedCategoryId(cat.id);
                      setActiveTab('home');
                    }}
                    className="w-full min-h-[48px] py-2.5 flex items-center justify-between text-left hover:text-[#38BDF8] transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{cat.name}</div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        {count} lecciones · {reelCount} reels
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (Dark Mode, Natural Thumb Zone) */}
      <nav
        aria-label="Navegación principal móvil"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-800 px-2"
      >
        <div
          className={`max-w-lg mx-auto h-full grid ${
            isAdmin ? 'grid-cols-5' : 'grid-cols-4'
          } items-center`}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('home');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'home' && !selectedLessonId
                ? 'text-[#38BDF8] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Biblioteca</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('reels');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'reels' && !selectedLessonId
                ? 'text-[#38BDF8] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Reels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('categories');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'categories' && !selectedLessonId
                ? 'text-[#38BDF8] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Categorías</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLessonId(null);
              setActiveTab('progress');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'progress' && !selectedLessonId
                ? 'text-[#38BDF8] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Progreso</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setSelectedLessonId(null);
                setActiveTab('admin');
              }}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
                activeTab === 'admin' && !selectedLessonId
                  ? 'text-[#38BDF8] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 whitespace-nowrap">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
