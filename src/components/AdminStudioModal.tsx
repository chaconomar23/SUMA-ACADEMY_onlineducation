import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  FolderPlus,
  Video,
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  Upload,
  Film,
} from 'lucide-react';
import {
  CategoryItem,
  DidacticMaterial,
  LessonItem,
  LessonLevel,
  MaterialType,
  QuizQuestion,
  ReelItem,
  ThemeKey,
  createSlug,
  extractYouTubeId,
  validateCategoryInput,
  validateLessonInput,
  validateReelInput,
} from '../utils/academyLogic';
import { formatFileSize, storeUploadedFile } from '../services/mediaFileStore';

interface AdminStudioPanelProps {
  categories: CategoryItem[];
  lessons: LessonItem[];
  reels: ReelItem[];
  authorUid: string;
  initialEditLesson?: LessonItem | null;
  initialStudioTab?: 'lesson' | 'reel' | 'category' | 'catalog';
  onSaveCategory: (category: CategoryItem) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSaveLesson: (lesson: LessonItem) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
  onSaveReel: (reel: ReelItem) => Promise<void>;
  onDeleteReel: (reelId: string) => Promise<void>;
  onPreviewAsStudent: (lessonId?: string, categoryId?: string, openReels?: boolean) => void;
}

export const AdminStudioPanel: React.FC<AdminStudioPanelProps> = ({
  categories,
  lessons,
  reels,
  authorUid,
  initialEditLesson,
  initialStudioTab = 'lesson',
  onSaveCategory,
  onDeleteCategory,
  onSaveLesson,
  onDeleteLesson,
  onSaveReel,
  onDeleteReel,
  onPreviewAsStudent,
}) => {
  const [studioTab, setStudioTab] = useState<'lesson' | 'reel' | 'category' | 'catalog'>(
    initialStudioTab
  );

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catTheme, setCatTheme] = useState<ThemeKey>('psychology');
  const [catMessage, setCatMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Lesson Form State (Starts completely clean with zero predetermined data)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(
    initialEditLesson?.id || null
  );
  const [lessonCategoryId, setLessonCategoryId] = useState<string>(
    initialEditLesson?.categoryId || categories[0]?.id || 'cat-psicologia'
  );
  const [lessonTitle, setLessonTitle] = useState(initialEditLesson?.title || '');
  const [lessonDescription, setLessonDescription] = useState(initialEditLesson?.description || '');
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState(initialEditLesson?.youtubeUrl || '');
  const [lessonVideoFileName, setLessonVideoFileName] = useState(
    initialEditLesson?.videoFileName || ''
  );
  const [isUploadingLessonVideo, setIsUploadingLessonVideo] = useState(false);
  const [lessonDuration, setLessonDuration] = useState<number>(
    initialEditLesson?.durationMinutes || 15
  );
  const [lessonLevel, setLessonLevel] = useState<LessonLevel>(
    initialEditLesson?.level || 'Fundamentos'
  );
  const [takeawaysText, setTakeawaysText] = useState<string>(
    initialEditLesson?.keyTakeaways.join('\n') || ''
  );

  // Didactic Materials Builder State (Clean empty list by default)
  const [materials, setMaterials] = useState<DidacticMaterial[]>(
    initialEditLesson?.materials || []
  );
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatType, setNewMatType] = useState<MaterialType>('pdf');
  const [newMatUrl, setNewMatUrl] = useState('');
  const [newMatFileName, setNewMatFileName] = useState('');
  const [newMatSizeLabel, setNewMatSizeLabel] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [isUploadingMatFile, setIsUploadingMatFile] = useState(false);

  // Quiz Questions Builder State (Clean empty list by default)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    initialEditLesson?.quizQuestions || []
  );
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptA, setNewOptA] = useState('');
  const [newOptB, setNewOptB] = useState('');
  const [newOptC, setNewOptC] = useState('');
  const [newCorrectIdx, setNewCorrectIdx] = useState<number>(0);
  const [newExplanation, setNewExplanation] = useState('');

  const [lessonFeedback, setLessonFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
    createdLessonId?: string;
    createdCatId?: string;
  } | null>(null);

  // Reel Upload Form State
  const [reelCategoryId, setReelCategoryId] = useState<string>(
    categories[0]?.id || 'cat-psicologia'
  );
  const [reelTitle, setReelTitle] = useState('');
  const [reelCaption, setReelCaption] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState('');
  const [reelFileName, setReelFileName] = useState('');
  const [reelDurationSeconds, setReelDurationSeconds] = useState<number>(45);
  const [isUploadingReelFile, setIsUploadingReelFile] = useState(false);
  const [reelFeedback, setReelFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Handle Main Lesson Video File Upload
  const handleLessonVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLessonVideo(true);
    try {
      const { uri, record } = await storeUploadedFile(file);
      setLessonYoutubeUrl(uri);
      setLessonVideoFileName(`${record.name} (${formatFileSize(record.sizeBytes)})`);
    } finally {
      setIsUploadingLessonVideo(false);
    }
  };

  // Handle Didactic Material File Upload (PDF, Image, Video, Document)
  const handleMaterialFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMatFile(true);
    try {
      const { uri, record } = await storeUploadedFile(file);
      let detectedType: MaterialType = 'guide';
      if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
        detectedType = 'pdf';
      } else if (file.type.startsWith('image/')) {
        detectedType = 'image';
      } else if (file.type.startsWith('video/')) {
        detectedType = 'video';
      }

      setNewMatType(detectedType);
      setNewMatUrl(uri);
      setNewMatFileName(record.name);
      setNewMatSizeLabel(`${detectedType.toUpperCase()} · ${formatFileSize(record.sizeBytes)}`);
      if (!newMatTitle.trim()) {
        setNewMatTitle(record.name.replace(/\.[^/.]+$/, ''));
      }
    } finally {
      setIsUploadingMatFile(false);
    }
  };

  // Handle Reel Video File Upload
  const handleReelVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReelFile(true);
    try {
      const { uri, record } = await storeUploadedFile(file);
      setReelVideoUrl(uri);
      setReelFileName(`${record.name} (${formatFileSize(record.sizeBytes)})`);
      if (!reelTitle.trim()) {
        setReelTitle(record.name.replace(/\.[^/.]+$/, ''));
      }
    } finally {
      setIsUploadingReelFile(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatMessage(null);

    const validation = validateCategoryInput({
      name: catName,
      description: catDescription,
      themeKey: catTheme,
    });
    if (!validation.valid) {
      setCatMessage({ type: 'err', text: validation.error || 'Datos inválidos.' });
      return;
    }

    const slug = createSlug(catName);
    const nowIso = new Date().toISOString();
    const newCategory: CategoryItem = {
      id: `cat-${slug}-${Date.now().toString(36).slice(-4)}`,
      name: catName.trim(),
      slug,
      description: catDescription.trim(),
      themeKey: catTheme,
      authorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await onSaveCategory(newCategory);
    setLessonCategoryId(newCategory.id);
    setReelCategoryId(newCategory.id);
    setCatName('');
    setCatDescription('');
    setCatMessage({
      type: 'ok',
      text: `Categoría "${newCategory.name}" publicada. Ya está disponible en vivo para todos los estudiantes.`,
    });
  };

  const handleAddMaterial = () => {
    if (newMatTitle.trim().length < 2) return;
    if (!newMatUrl.trim()) return;

    const item: DidacticMaterial = {
      id: `mat-${Date.now().toString(36)}`,
      title: newMatTitle.trim(),
      type: newMatType,
      url: newMatUrl.trim(),
      fileName: newMatFileName || undefined,
      description:
        newMatDesc.trim() || 'Material didáctico adjunto para el estudio de la lección.',
      sizeOrDuration: newMatSizeLabel || `${newMatType.toUpperCase()} · Recurso Adjunto`,
    };
    setMaterials((prev) => [...prev, item].slice(0, 15));
    setNewMatTitle('');
    setNewMatUrl('');
    setNewMatFileName('');
    setNewMatSizeLabel('');
    setNewMatDesc('');
  };

  const handleAddQuizQuestion = () => {
    if (newQuestionText.trim().length < 5 || !newOptA.trim() || !newOptB.trim()) return;
    const opts = [newOptA.trim(), newOptB.trim()];
    if (newOptC.trim()) opts.push(newOptC.trim());

    const qItem: QuizQuestion = {
      id: `q-${Date.now().toString(36)}`,
      question: newQuestionText.trim(),
      options: opts,
      correctIndex: Math.min(newCorrectIdx, opts.length - 1),
      explanation:
        newExplanation.trim() || 'Explicación verificada por el equipo académico de SUMA+.',
    };
    setQuizQuestions((prev) => [...prev, qItem].slice(0, 15));
    setNewQuestionText('');
    setNewOptA('');
    setNewOptB('');
    setNewOptC('');
    setNewExplanation('');
    setNewCorrectIdx(0);
  };

  const handlePublishLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLessonFeedback(null);

    const validation = validateLessonInput({
      categoryId: lessonCategoryId,
      title: lessonTitle,
      description: lessonDescription,
      youtubeUrl: lessonYoutubeUrl,
      durationMinutes: Number(lessonDuration),
    });

    if (!validation.valid) {
      setLessonFeedback({ type: 'err', text: validation.error || 'Revisa los campos.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const id =
      editingLessonId ||
      `les-${createSlug(lessonTitle).slice(0, 24)}-${Date.now().toString(36).slice(-4)}`;

    const parsedTakeaways = takeawaysText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 10);

    const newLesson: LessonItem = {
      id,
      categoryId: lessonCategoryId,
      title: lessonTitle.trim(),
      description: lessonDescription.trim(),
      youtubeUrl: lessonYoutubeUrl.trim(),
      videoFileName: lessonVideoFileName || undefined,
      durationMinutes: Number(lessonDuration) || 15,
      level: lessonLevel,
      keyTakeaways: parsedTakeaways,
      materials,
      quizQuestions,
      authorUid,
      isPublished: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await onSaveLesson(newLesson);
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonDescription('');
    setLessonYoutubeUrl('');
    setLessonVideoFileName('');
    setTakeawaysText('');
    setMaterials([]);
    setQuizQuestions([]);
    setLessonFeedback({
      type: 'ok',
      text: `Lección "${newLesson.title}" publicada exitosamente. Ya es visible inmediatamente para los estudiantes.`,
      createdLessonId: newLesson.id,
      createdCatId: newLesson.categoryId,
    });
    window.scrollTo(0, 0);
  };

  const handlePublishReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setReelFeedback(null);

    const validation = validateReelInput({
      categoryId: reelCategoryId,
      title: reelTitle,
      caption: reelCaption,
      videoUrl: reelVideoUrl,
      durationSeconds: Number(reelDurationSeconds),
    });

    if (!validation.valid) {
      setReelFeedback({ type: 'err', text: validation.error || 'Revisa los datos del Reel.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newReel: ReelItem = {
      id: `reel-${createSlug(reelTitle).slice(0, 20)}-${Date.now().toString(36).slice(-4)}`,
      categoryId: reelCategoryId,
      title: reelTitle.trim(),
      caption: reelCaption.trim(),
      videoUrl: reelVideoUrl.trim(),
      fileName: reelFileName || 'Video Reel',
      durationSeconds: Number(reelDurationSeconds) || 45,
      authorUid,
      isPublished: true,
      createdAt: nowIso,
    };

    await onSaveReel(newReel);
    setReelTitle('');
    setReelCaption('');
    setReelVideoUrl('');
    setReelFileName('');
    setReelFeedback({
      type: 'ok',
      text: `Reel "${newReel.title}" publicado exitosamente en el apartado de Reels.`,
    });
    window.scrollTo(0, 0);
  };

  const previewVideoId = extractYouTubeId(lessonYoutubeUrl);

  return (
    <div className="space-y-6 pb-20">
      {/* Studio Header Card (Dark Mode) */}
      <div className="bg-[#131C2E] border border-slate-800 text-white rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#38BDF8] font-medium">
              Consola Académica · Acceso Administrador (chaconomar23)
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display mt-0.5">
              Subir Lecciones, Reels, Archivos y Evaluaciones
            </h1>
          </div>

          <button
            type="button"
            onClick={() => onPreviewAsStudent()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Eye className="w-4 h-4 text-[#38BDF8]" />
            <span>Ver como Estudiante</span>
          </button>
        </div>

        {/* Admin Mode Switcher (4 Tabs: Lesson, Reel, Category, Catalog) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setStudioTab('lesson')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              studioTab === 'lesson'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Subir Lección
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('reel')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              studioTab === 'reel'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Subir Reel ({reels.length})
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('category')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              studioTab === 'category'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Categorías ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('catalog')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              studioTab === 'catalog'
                ? 'bg-[#0284C7] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Catálogo ({lessons.length})
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD / EDIT LESSON (SUPPORTS FILE UPLOADS + LINKS) */}
      {studioTab === 'lesson' && (
        <form
          onSubmit={handlePublishLesson}
          className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-6"
        >
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white font-display">
              {editingLessonId ? 'Editar Lección Académica' : 'Publicar Nueva Lección'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sube archivos directamente desde tu dispositivo (videos, PDFs, imágenes) o usa
              enlaces de YouTube. Al publicar, aparecerá al instante para los estudiantes.
            </p>
          </div>

          {lessonFeedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                lessonFeedback.type === 'ok'
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-100'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {lessonFeedback.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{lessonFeedback.text}</span>
              </div>
              {lessonFeedback.createdLessonId && (
                <button
                  type="button"
                  onClick={() =>
                    onPreviewAsStudent(
                      lessonFeedback.createdLessonId,
                      lessonFeedback.createdCatId
                    )
                  }
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white font-semibold whitespace-nowrap shrink-0"
                >
                  Abrir Lección como Estudiante
                </button>
              )}
            </div>
          )}

          {/* Core Lesson Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="lesson-category-select"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Categoría de la Lección
              </label>
              <select
                id="lesson-category-select"
                value={lessonCategoryId}
                onChange={(e) => setLessonCategoryId(e.target.value)}
                className="w-full min-h-[46px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white focus:border-[#38BDF8] focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="lesson-level-select"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Nivel
                </label>
                <select
                  id="lesson-level-select"
                  value={lessonLevel}
                  onChange={(e) => setLessonLevel(e.target.value as LessonLevel)}
                  className="w-full min-h-[46px] px-3 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white focus:border-[#38BDF8] focus:outline-none"
                >
                  <option value="Fundamentos">Fundamentos</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="lesson-duration-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Duración (min)
                </label>
                <input
                  id="lesson-duration-input"
                  type="number"
                  min={1}
                  max={600}
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(Number(e.target.value))}
                  className="w-full min-h-[46px] px-3 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white font-mono tabular-nums focus:border-[#38BDF8] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="lesson-title-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Nombre de la Lección
            </label>
            <input
              id="lesson-title-input"
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Ej. Neurociencia del Hábito y Dopamina"
              className="w-full min-h-[46px] px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="lesson-desc-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Descripción Académica y Desarrollo del Tema
            </label>
            <textarea
              id="lesson-desc-input"
              rows={4}
              value={lessonDescription}
              onChange={(e) => setLessonDescription(e.target.value)}
              placeholder="Describe detalladamente los conceptos, casos prácticos y objetivos de la lección..."
              className="w-full p-3.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
            />
          </div>

          {/* Main Video Section: Upload Video File OR YouTube Link */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Video className="w-4 h-4 text-[#38BDF8]" />
              <span>Video Principal de la Lección (Subir Archivo o Link de YouTube)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: File Upload from Device */}
              <div className="p-3.5 rounded-xl bg-[#131C2E] border border-slate-800 space-y-2">
                <label
                  htmlFor="lesson-video-file"
                  className="block text-xs font-semibold text-slate-200"
                >
                  Opción 1: Subir archivo de video desde tu dispositivo
                </label>
                <input
                  id="lesson-video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleLessonVideoFileSelect}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0284C7] file:text-white hover:file:bg-sky-500"
                />
                {isUploadingLessonVideo && (
                  <div className="text-xs text-[#38BDF8]">Procesando archivo de video...</div>
                )}
                {lessonVideoFileName && (
                  <div className="text-xs text-emerald-400 font-mono truncate">
                    Archivo listo: {lessonVideoFileName}
                  </div>
                )}
              </div>

              {/* Option B: YouTube or External URL */}
              <div className="p-3.5 rounded-xl bg-[#131C2E] border border-slate-800 space-y-2">
                <label
                  htmlFor="lesson-youtube-input"
                  className="block text-xs font-semibold text-slate-200"
                >
                  Opción 2: URL de video de YouTube o enlace directo
                </label>
                <input
                  id="lesson-youtube-input"
                  type="text"
                  value={lessonYoutubeUrl}
                  onChange={(e) => {
                    setLessonYoutubeUrl(e.target.value);
                    if (!e.target.value.startsWith('localfile://')) {
                      setLessonVideoFileName('');
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
                />
                {previewVideoId && (
                  <div className="text-xs text-emerald-400 font-mono tabular-nums">
                    YouTube ID detectado: {previewVideoId}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Key Takeaways */}
          <div>
            <label
              htmlFor="lesson-takeaways-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Puntos Clave de Aprendizaje (uno por línea, opcional)
            </label>
            <textarea
              id="lesson-takeaways-input"
              rows={3}
              value={takeawaysText}
              onChange={(e) => setTakeawaysText(e.target.value)}
              placeholder="Escribe las conclusiones principales que el estudiante debe recordar..."
              className="w-full p-3.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
            />
          </div>

          {/* Didactic Materials Builder (File Upload OR Link for PDF, Video, Image, Guide) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileText className="w-4 h-4 text-[#38BDF8]" />
                <span>Material Didáctico Adjunto ({materials.length})</span>
              </div>
            </div>

            {materials.length > 0 && (
              <div className="space-y-2">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#131C2E] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-white">{m.title}</span>
                      <span className="text-slate-400"> · {m.sizeOrDuration}</span>
                      {m.fileName && (
                        <span className="text-[#38BDF8] font-mono"> ({m.fileName})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMaterials((prev) => prev.filter((item) => item.id !== m.id))
                      }
                      aria-label={`Quitar material ${m.title}`}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-950/60 font-semibold shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Direct File Upload for Didactic Material */}
              <div className="p-3.5 rounded-xl bg-[#131C2E] border border-slate-800 space-y-2">
                <label
                  htmlFor="new-mat-file"
                  className="block text-xs font-semibold text-slate-200"
                >
                  Subir archivo de material didáctico desde tu dispositivo (PDF, Imagen, Video o
                  Documento)
                </label>
                <input
                  id="new-mat-file"
                  type="file"
                  accept=".pdf,image/*,video/*,.doc,.docx,.ppt,.pptx,.txt"
                  onChange={handleMaterialFileSelect}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0284C7] file:text-white hover:file:bg-sky-500"
                />
                {isUploadingMatFile && (
                  <div className="text-xs text-[#38BDF8]">Cargando archivo...</div>
                )}
                {newMatFileName && (
                  <div className="text-xs text-emerald-400 font-mono">
                    Archivo cargado: {newMatFileName} ({newMatSizeLabel})
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="new-mat-title"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Título del recurso didáctico
                  </label>
                  <input
                    id="new-mat-title"
                    type="text"
                    value={newMatTitle}
                    onChange={(e) => setNewMatTitle(e.target.value)}
                    placeholder="Ej. Manual en PDF o Infografía del Tema"
                    className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-mat-type"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Formato
                  </label>
                  <select
                    id="new-mat-type"
                    value={newMatType}
                    onChange={(e) => setNewMatType(e.target.value as MaterialType)}
                    className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white"
                  >
                    <option value="pdf">Documento PDF</option>
                    <option value="image">Infografía / Imagen</option>
                    <option value="video">Video Complementario</option>
                    <option value="guide">Guía / Plantilla</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-mat-url"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    O ingresa URL externa (si no subiste archivo)
                  </label>
                  <input
                    id="new-mat-url"
                    type="text"
                    value={newMatUrl}
                    onChange={(e) => setNewMatUrl(e.target.value)}
                    placeholder="https://... o archivo local cargado"
                    className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-mat-desc"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Descripción breve del material
                  </label>
                  <input
                    id="new-mat-desc"
                    type="text"
                    value={newMatDesc}
                    onChange={(e) => setNewMatDesc(e.target.value)}
                    placeholder="Instrucciones para el estudiante..."
                    className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddMaterial}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#131C2E] border border-slate-700 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Adjuntar Material a la Lección</span>
              </button>
            </div>
          </div>

          {/* Quiz Questions Builder */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Cuestionario de Evaluación ({quizQuestions.length} preguntas)</span>
            </div>

            {quizQuestions.length > 0 && (
              <div className="space-y-2">
                {quizQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl bg-[#131C2E] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#38BDF8]">0{idx + 1}. </span>
                      <span className="font-semibold text-white">{q.question}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuizQuestions((prev) => prev.filter((item) => item.id !== q.id))
                      }
                      aria-label={`Quitar pregunta ${q.question}`}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-950/60 font-semibold"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label
                  htmlFor="new-quiz-question"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Nueva pregunta para el estudiante
                </label>
                <input
                  id="new-quiz-question"
                  type="text"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Ej. ¿Cuál es la función principal del hipocampo en el aprendizaje?"
                  className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  aria-label="Opción A"
                  value={newOptA}
                  onChange={(e) => setNewOptA(e.target.value)}
                  placeholder="Opción A"
                  className="min-h-[40px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                />
                <input
                  type="text"
                  aria-label="Opción B"
                  value={newOptB}
                  onChange={(e) => setNewOptB(e.target.value)}
                  placeholder="Opción B"
                  className="min-h-[40px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                />
                <input
                  type="text"
                  aria-label="Opción C"
                  value={newOptC}
                  onChange={(e) => setNewOptC(e.target.value)}
                  placeholder="Opción C"
                  className="min-h-[40px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-quiz-correct"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Respuesta correcta
                  </label>
                  <select
                    id="new-quiz-correct"
                    value={newCorrectIdx}
                    onChange={(e) => setNewCorrectIdx(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white"
                  >
                    <option value={0}>Opción A</option>
                    <option value={1}>Opción B</option>
                    <option value={2}>Opción C</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-quiz-explanation"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Explicación pedagógica de la respuesta
                  </label>
                  <input
                    id="new-quiz-explanation"
                    type="text"
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="Por qué esta opción es la correcta..."
                    className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#131C2E] text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddQuizQuestion}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#131C2E] border border-slate-700 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Añadir Pregunta al Cuestionario</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[50px] py-3.5 px-5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white font-semibold text-sm transition-colors"
          >
            Publicar Lección en Biblioteca SUMA+ ACADEMY
          </button>
        </form>
      )}

      {/* TAB 2: UPLOAD REEL (SHORT VERTICAL EDUCATIONAL VIDEO) */}
      {studioTab === 'reel' && (
        <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white font-display">
              Publicar Nuevo Reel Educativo (Video Corto Vertical)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sube un archivo de video corto desde tu dispositivo o ingresa un enlace vertical para
              la sección de Reels de los estudiantes.
            </p>
          </div>

          {reelFeedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                reelFeedback.type === 'ok'
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-100'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              <span>{reelFeedback.text}</span>
              {reelFeedback.type === 'ok' && (
                <button
                  type="button"
                  onClick={() => onPreviewAsStudent(undefined, undefined, true)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0284C7] text-white font-semibold whitespace-nowrap shrink-0"
                >
                  Ir a Reels como Estudiante
                </button>
              )}
            </div>
          )}

          <form onSubmit={handlePublishReel} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reel-category-select"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Categoría del Reel
                </label>
                <select
                  id="reel-category-select"
                  value={reelCategoryId}
                  onChange={(e) => setReelCategoryId(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reel-duration-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Duración aproximada (segundos)
                </label>
                <input
                  id="reel-duration-input"
                  type="number"
                  min={1}
                  max={600}
                  value={reelDurationSeconds}
                  onChange={(e) => setReelDurationSeconds(Number(e.target.value))}
                  className="w-full min-h-[46px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reel-title-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Título del Reel Educativo
              </label>
              <input
                id="reel-title-input"
                type="text"
                value={reelTitle}
                onChange={(e) => setReelTitle(e.target.value)}
                placeholder="Ej. El Efecto Anclaje en 45 Segundos"
                className="w-full min-h-[46px] px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="reel-caption-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Descripción / Cápsula de Aprendizaje
              </label>
              <textarea
                id="reel-caption-input"
                rows={3}
                value={reelCaption}
                onChange={(e) => setReelCaption(e.target.value)}
                placeholder="Resumen breve que acompaña al video corto..."
                className="w-full p-3.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Reel Video Source: File Upload OR URL */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Upload className="w-4 h-4 text-[#38BDF8]" />
                <span>Origen del Video Corto (Subir Archivo o Link)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#131C2E] border border-slate-800 space-y-2">
                  <label
                    htmlFor="reel-video-file"
                    className="block text-xs font-semibold text-slate-200"
                  >
                    Subir video desde tus archivos (.mp4, .webm, .mov)
                  </label>
                  <input
                    id="reel-video-file"
                    type="file"
                    accept="video/*"
                    onChange={handleReelVideoFileSelect}
                    className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0284C7] file:text-white hover:file:bg-sky-500"
                  />
                  {isUploadingReelFile && (
                    <div className="text-xs text-[#38BDF8]">Procesando video...</div>
                  )}
                  {reelFileName && (
                    <div className="text-xs text-emerald-400 font-mono truncate">
                      Archivo cargado: {reelFileName}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#131C2E] border border-slate-800 space-y-2">
                  <label
                    htmlFor="reel-video-url"
                    className="block text-xs font-semibold text-slate-200"
                  >
                    O pegar enlace de YouTube Shorts / Video
                  </label>
                  <input
                    id="reel-video-url"
                    type="text"
                    value={reelVideoUrl}
                    onChange={(e) => {
                      setReelVideoUrl(e.target.value);
                      if (!e.target.value.startsWith('localfile://')) {
                        setReelFileName('Video por enlace');
                      }
                    }}
                    placeholder="https://www.youtube.com/shorts/..."
                    className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Film className="w-4 h-4" />
              <span>Publicar Reel Educativo Ahora</span>
            </button>
          </form>

          {/* Published Reels List */}
          {reels.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">
                Reels Publicados ({reels.length})
              </h3>
              <div className="space-y-2">
                {reels.map((r) => {
                  const cat = categories.find((c) => c.id === r.categoryId);
                  return (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{r.title}</div>
                        <div className="text-xs text-slate-400">
                          {cat?.name} · {r.durationSeconds}s · {r.fileName}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteReel(r.id)}
                        aria-label={`Eliminar Reel ${r.title}`}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/60 shrink-0"
                      >
                        Eliminar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CREATE CATEGORY */}
      {studioTab === 'category' && (
        <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white font-display">
              Crear Nueva Categoría Académica
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Agrega áreas temáticas adicionales a las 4 categorías base.
            </p>
          </div>

          {catMessage && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-xs font-medium ${
                catMessage.type === 'ok'
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-100'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              {catMessage.text}
            </div>
          )}

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label
                htmlFor="cat-name-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Nombre de la Categoría
              </label>
              <input
                id="cat-name-input"
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ej. Finanzas Cuantitativas, Neuroventas, Diseño UX..."
                className="w-full min-h-[46px] px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="cat-theme-select"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Identidad Visual del Área
              </label>
              <select
                id="cat-theme-select"
                value={catTheme}
                onChange={(e) => setCatTheme(e.target.value as ThemeKey)}
                className="w-full min-h-[46px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white"
              >
                <option value="psychology">Psicología y Comportamiento</option>
                <option value="marketing">Marketing y Crecimiento</option>
                <option value="ai">Inteligencia Artificial y Datos</option>
                <option value="finance">Finanzas y Economía</option>
                <option value="design">Diseño y Producto Digital</option>
                <option value="leadership">Liderazgo y Productividad</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="cat-desc-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Descripción de la Categoría
              </label>
              <textarea
                id="cat-desc-input"
                rows={3}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Explica qué aprenderán los estudiantes dentro de esta categoría..."
                className="w-full p-3.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Publicar Categoría Ahora</span>
            </button>
          </form>

          {/* Existing Categories Directory */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300">
              Categorías Activas ({categories.length})
            </h3>
            <div className="space-y-2">
              {categories.map((c) => {
                const count = lessons.filter((l) => l.categoryId === c.id).length;
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{c.name}</div>
                      <div className="text-xs text-slate-400">
                        {count} lecciones publicadas · {c.description.slice(0, 70)}...
                      </div>
                    </div>
                    {categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(c.id)}
                        aria-label={`Eliminar categoría ${c.name}`}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/60 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FULL CATALOG MANAGEMENT */}
      {studioTab === 'catalog' && (
        <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-bold text-white font-display">
            Catálogo General de Lecciones Publicadas ({lessons.length})
          </h2>
          {lessons.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              No hay lecciones predeterminadas cargadas. Usa la pestaña «Subir Lección» para
              publicar la primera lección.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {lessons.map((les) => {
                const cat = categories.find((c) => c.id === les.categoryId);
                return (
                  <div
                    key={les.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs text-slate-400">
                        {cat?.name || 'Categoría'} · {les.level} · {les.durationMinutes} min ·{' '}
                        {les.materials.length} recursos · {les.quizQuestions.length} preguntas
                      </div>
                      <div className="text-sm font-bold text-white">{les.title}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPreviewAsStudent(les.id, les.categoryId)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        Ver como Estudiante
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLesson(les.id)}
                        aria-label={`Eliminar ${les.title}`}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-red-800/80 text-xs font-semibold text-red-400 hover:bg-red-950/60"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
