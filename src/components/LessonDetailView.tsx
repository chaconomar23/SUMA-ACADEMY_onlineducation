import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Film,
  Image as ImageIcon,
  ExternalLink,
  Award,
  BookOpen,
  Edit3,
  Trash2,
  PlayCircle,
  Save,
  Download,
} from 'lucide-react';
import {
  CategoryItem,
  DidacticMaterial,
  LessonItem,
  QuizAttemptRecord,
  evaluateQuizSubmission,
  extractYouTubeId,
} from '../utils/academyLogic';
import { DidacticDiagramIllustration } from './CategoryArtwork';
import { resolveMediaUri } from '../services/mediaFileStore';

interface LessonDetailViewProps {
  lesson: LessonItem;
  category?: CategoryItem;
  isCompleted: boolean;
  isAdmin: boolean;
  userId: string;
  initialNote: string;
  previousAttempts: QuizAttemptRecord[];
  onBack: () => void;
  onToggleComplete: (lessonId: string) => void;
  onSubmitQuizAttempt: (attempt: QuizAttemptRecord, passed: boolean) => void;
  onSaveNote: (lessonId: string, note: string) => void;
  onEditLesson?: (lesson: LessonItem) => void;
  onDeleteLesson?: (lessonId: string) => void;
}

export const LessonDetailView: React.FC<LessonDetailViewProps> = ({
  lesson,
  category,
  isCompleted,
  isAdmin,
  userId,
  initialNote,
  previousAttempts,
  onBack,
  onToggleComplete,
  onSubmitQuizAttempt,
  onSaveNote,
  onEditLesson,
  onDeleteLesson,
}) => {
  const [activeSection, setActiveSection] = useState<'content' | 'materials' | 'quiz'>('content');
  const [selectedMaterial, setSelectedMaterial] = useState<DidacticMaterial | null>(
    lesson.materials[0] || null
  );
  const [resolvedMainVideoSrc, setResolvedMainVideoSrc] = useState<string>('');
  const [resolvedMaterialSrc, setResolvedMaterialSrc] = useState<string>('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<ReturnType<typeof evaluateQuizSubmission> | null>(
    null
  );
  const [noteText, setNoteText] = useState(initialNote);
  const [noteSavedToast, setNoteSavedToast] = useState(false);

  const youtubeId = extractYouTubeId(lesson.youtubeUrl);

  useEffect(() => {
    let cancelled = false;
    void resolveMediaUri(lesson.youtubeUrl).then((src) => {
      if (!cancelled) setResolvedMainVideoSrc(src || lesson.youtubeUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.youtubeUrl]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedMaterial) {
      setResolvedMaterialSrc('');
      return;
    }
    void resolveMediaUri(selectedMaterial.url).then((src) => {
      if (!cancelled) setResolvedMaterialSrc(src || selectedMaterial.url);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMaterial?.id, selectedMaterial?.url]);

  const lessonAttempts = previousAttempts.filter((a) => a.lessonId === lesson.id);
  const bestScore =
    lessonAttempts.length > 0
      ? Math.max(...lessonAttempts.map((a) => a.scorePercent))
      : null;

  const handleGradeQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const evaluation = evaluateQuizSubmission(lesson.quizQuestions, selectedAnswers);
    setQuizResult(evaluation);

    const record: QuizAttemptRecord = {
      id: `att-${Date.now().toString(36)}`,
      userId,
      lessonId: lesson.id,
      scorePercent: evaluation.scorePercent,
      correctCount: evaluation.correctCount,
      totalQuestions: evaluation.totalQuestions,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    onSubmitQuizAttempt(record, evaluation.passed);
  };

  const handleSaveStudentNote = () => {
    onSaveNote(lesson.id, noteText);
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 2000);
  };

  const getMaterialIcon = (type: DidacticMaterial['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-[#38BDF8]" />;
      case 'video':
        return <Film className="w-4 h-4 text-amber-400" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#131C2E] border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Biblioteca</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && onEditLesson && (
            <button
              type="button"
              onClick={() => onEditLesson(lesson)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#131C2E] border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          )}
          {isAdmin && onDeleteLesson && (
            <button
              type="button"
              onClick={() => onDeleteLesson(lesson.id)}
              aria-label={`Eliminar lección ${lesson.title}`}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-red-950/60 border border-red-800 hover:bg-red-900/70 text-red-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleComplete(lesson.id)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isCompleted
                ? 'bg-[#059669] text-white'
                : 'bg-[#0284C7] text-white hover:bg-sky-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? 'Completada' : 'Completar Lección'}</span>
          </button>
        </div>
      </div>

      {/* Lesson Header Metadata (Zero-Pill Unboxed Text in Dark Mode) */}
      <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-[#38BDF8]">{category?.name || 'Categoría'}</span>
          <span aria-hidden="true">·</span>
          <span>Nivel {lesson.level}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{lesson.durationMinutes} min</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{lesson.materials.length} recursos</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{lesson.quizQuestions.length} preguntas</span>
          {bestScore !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-400 font-mono tabular-nums">
                Mejor puntaje: {bestScore}%
              </span>
            </>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white font-display leading-tight">
          {lesson.title}
        </h1>

        {/* Video Stage (Supports YouTube embed OR Local Uploaded Video File OR External Video Link) */}
        {youtubeId ? (
          <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video w-full">
            <iframe
              title={`Video de YouTube: ${lesson.title}`}
              src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : lesson.youtubeUrl.startsWith('localfile://') ||
          lesson.youtubeUrl.startsWith('data:video') ? (
          <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video w-full flex flex-col">
            {resolvedMainVideoSrc ? (
              <video
                src={resolvedMainVideoSrc}
                controls
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Cargando archivo de video de la lección...
              </div>
            )}
          </div>
        ) : lesson.youtubeUrl ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 text-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-[#38BDF8] font-medium">Recurso Audiovisual Principal</div>
              <div className="text-sm font-semibold">{lesson.title}</div>
              <div className="text-xs text-slate-400 break-all">{lesson.youtubeUrl}</div>
            </div>
            <a
              href={lesson.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Abrir Video</span>
            </a>
          </div>
        ) : null}

        {/* Interactive Section Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection('content')}
            className={`min-h-[44px] py-2 px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeSection === 'content'
                ? 'bg-[#1E293B] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Resumen
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('materials')}
            className={`min-h-[44px] py-2 px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeSection === 'materials'
                ? 'bg-[#1E293B] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Material ({lesson.materials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('quiz')}
            className={`min-h-[44px] py-2 px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeSection === 'quiz'
                ? 'bg-[#1E293B] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Evaluación ({lesson.quizQuestions.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: LESSON DESCRIPTION, KEY TAKEAWAYS & STUDENT NOTES */}
      {activeSection === 'content' && (
        <div className="space-y-6">
          <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white font-display">
                Descripción de la Lección
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                {lesson.description}
              </p>
            </div>

            {lesson.keyTakeaways.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white">
                  Conceptos Clave para Aplicar Hoy
                </h3>
                <ol className="space-y-2.5">
                  {lesson.keyTakeaways.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed"
                    >
                      <span className="font-mono text-xs font-semibold text-[#38BDF8] tabular-nums mt-0.5">
                        0{index + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Personal Study Notes */}
          <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="student-lesson-notes" className="text-sm font-bold text-white">
                Cuaderno de Apuntes Personales
              </label>
              {noteSavedToast && (
                <span className="text-xs font-medium text-emerald-400">
                  Apuntes guardados en tu biblioteca
                </span>
              )}
            </div>
            <textarea
              id="student-lesson-notes"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe aquí tus conclusiones, ideas de aplicación o dudas sobre esta lección..."
              className="w-full p-3.5 text-sm rounded-2xl border border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveStudentNote}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Apuntes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DIDACTIC MATERIALS (VIDEO, IMAGE, PDF, GUIDE — FROM FILE UPLOAD OR LINK) */}
      {activeSection === 'materials' && (
        <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-display">
              Material Didáctico Complementario
            </h2>
            <p className="text-xs text-slate-400">
              Selecciona cualquier archivo subido (PDF, imagen, video o guía) para visualizarlo o
              descargarlo.
            </p>
          </div>

          {lesson.materials.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              Esta lección aún no tiene materiales complementarios cargados.
            </div>
          ) : (
            <div className="space-y-3">
              {lesson.materials.map((mat) => {
                const isSelected = selectedMaterial?.id === mat.id;
                return (
                  <div
                    key={mat.id}
                    className={`rounded-2xl border transition-colors p-4 ${
                      isSelected
                        ? 'border-[#38BDF8] bg-sky-950/25'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                          {getMaterialIcon(mat.type)}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-white">{mat.title}</div>
                          <div className="text-xs text-slate-300 leading-relaxed">
                            {mat.description}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            Formato: {mat.type.toUpperCase()} · {mat.sizeOrDuration}
                            {mat.fileName ? ` · Archivo: ${mat.fileName}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMaterial(isSelected ? null : mat)
                          }
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-sky-500 transition-colors whitespace-nowrap"
                        >
                          {isSelected ? 'Ocultar Vista Previa' : 'Ver Material'}
                        </button>
                      </div>
                    </div>

                    {/* Built-in Interactive Viewer for Selected Material */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                        {mat.type === 'image' && (
                          resolvedMaterialSrc.startsWith('data:image') ? (
                            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black p-2">
                              <img
                                src={resolvedMaterialSrc}
                                alt={mat.title}
                                className="w-full max-h-96 object-contain mx-auto"
                              />
                            </div>
                          ) : (
                            <DidacticDiagramIllustration
                              url={resolvedMaterialSrc || mat.url}
                              title={mat.title}
                            />
                          )
                        )}

                        {mat.type === 'pdf' && (
                          <div className="rounded-2xl bg-slate-950 border border-slate-800 text-white p-5 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-xs text-[#38BDF8] font-medium">
                                  Documento PDF · {mat.fileName || mat.title}
                                </div>
                                <div className="text-sm font-bold mt-0.5">{mat.title}</div>
                              </div>
                              {resolvedMaterialSrc && (
                                <a
                                  href={resolvedMaterialSrc}
                                  download={mat.fileName || `${mat.title}.pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0284C7] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Descargar / Abrir PDF</span>
                                </a>
                              )}
                            </div>
                            {resolvedMaterialSrc.startsWith('data:application/pdf') ? (
                              <iframe
                                title={mat.title}
                                src={resolvedMaterialSrc}
                                className="w-full h-80 rounded-xl border border-slate-800 bg-slate-900"
                              />
                            ) : (
                              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
                                <p>{mat.description}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {mat.type === 'video' && (
                          <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video">
                            {extractYouTubeId(mat.url) ? (
                              <iframe
                                title={mat.title}
                                src={`https://www.youtube.com/embed/${extractYouTubeId(mat.url)}`}
                                className="w-full h-full"
                                allowFullScreen
                              />
                            ) : resolvedMaterialSrc ? (
                              <video
                                src={resolvedMaterialSrc}
                                controls
                                playsInline
                                className="w-full h-full object-contain bg-black"
                              />
                            ) : (
                              <div className="p-6 text-slate-300 text-xs">
                                Video disponible en: {mat.url}
                              </div>
                            )}
                          </div>
                        )}

                        {mat.type === 'guide' && (
                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed flex items-center justify-between gap-3">
                            <span>{mat.description}</span>
                            {resolvedMaterialSrc && (
                              <a
                                href={resolvedMaterialSrc}
                                download={mat.fileName || mat.title}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 text-[#38BDF8] font-semibold inline-flex items-center gap-1.5 shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Abrir Archivo</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: INTERACTIVE QUIZ TO APPLY KNOWLEDGE */}
      {activeSection === 'quiz' && (
        <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Cuestionario de Aplicación Práctica
              </h2>
              <p className="text-xs text-slate-400">
                Responde las preguntas para verificar tu dominio de la lección (aprobación con 70% o
                más).
              </p>
            </div>
          </div>

          {lesson.quizQuestions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              Esta lección no tiene preguntas de evaluación configuradas.
            </div>
          ) : (
            <form onSubmit={handleGradeQuiz} className="space-y-6">
              {lesson.quizQuestions.map((q, qIdx) => {
                const chosen = selectedAnswers[q.id];
                const qFeedback = quizResult?.questionResults.find((r) => r.questionId === q.id);

                return (
                  <div
                    key={q.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3"
                  >
                    <div className="text-xs font-mono font-semibold text-slate-400 tabular-nums">
                      Pregunta 0{qIdx + 1} de 0{lesson.quizQuestions.length}
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      {q.question}
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = chosen === optIdx;
                        let optionStyle =
                          'border-slate-800 bg-[#131C2E] text-slate-200 hover:border-slate-700';
                        if (isSelected) {
                          optionStyle =
                            'border-[#38BDF8] bg-sky-950/60 text-white font-semibold';
                        }
                        if (quizResult) {
                          if (optIdx === q.correctIndex) {
                            optionStyle =
                              'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold';
                          } else if (isSelected && optIdx !== q.correctIndex) {
                            optionStyle = 'border-red-500 bg-red-950/60 text-red-200';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                            }}
                            className={`w-full min-h-[46px] p-3 rounded-xl border text-left text-xs sm:text-sm flex items-center justify-between gap-3 transition-colors ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            <span className="font-mono text-xs text-slate-400 shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {qFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs leading-relaxed ${
                          qFeedback.isCorrect
                            ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-800'
                            : 'bg-amber-950/60 text-amber-200 border border-amber-800'
                        }`}
                      >
                        <span className="font-bold">
                          {qFeedback.isCorrect ? 'Respuesta Correcta: ' : 'Retroalimentación: '}
                        </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              {quizResult && (
                <div
                  className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    quizResult.passed
                      ? 'bg-emerald-950/50 border-emerald-700 text-emerald-100'
                      : 'bg-amber-950/50 border-amber-700 text-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-base font-bold font-display">
                        Puntaje Obtenido: {quizResult.scorePercent}% ({quizResult.correctCount}/
                        {quizResult.totalQuestions} aciertos)
                      </div>
                      <div className="text-xs text-slate-300">
                        {quizResult.passed
                          ? 'Excelente dominio. La lección ha sido marcada como completada en tu progreso.'
                          : 'Revisa las explicaciones de cada pregunta y vuelve a intentarlo para alcanzar el 70%.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizResult(null);
                      setSelectedAnswers({});
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Reintentar Evaluación
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white font-semibold text-sm transition-colors"
              >
                Calificar Cuestionario y Registrar Avance
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
