import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Film,
  PlusCircle,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import {
  CategoryItem,
  ReelItem,
  extractYouTubeId,
} from '../utils/academyLogic';
import { resolveMediaUri } from '../services/mediaFileStore';

interface ReelsViewProps {
  reels: ReelItem[];
  categories: CategoryItem[];
  savedReelIds: string[];
  isAdmin: boolean;
  onToggleSaveReel: (reelId: string) => void;
  onDeleteReel?: (reelId: string) => void;
  onOpenAdminReelUpload?: () => void;
  onExploreCategory?: (categoryId: string) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  reels,
  categories,
  savedReelIds,
  isAdmin,
  onToggleSaveReel,
  onDeleteReel,
  onOpenAdminReelUpload,
  onExploreCategory,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string>('');

  const filteredReels = reels.filter(
    (r) => selectedCategoryId === 'all' || r.categoryId === selectedCategoryId
  );

  const safeIndex =
    filteredReels.length > 0
      ? Math.min(activeIndex, filteredReels.length - 1)
      : 0;
  const activeReel = filteredReels[safeIndex] || null;

  useEffect(() => {
    let cancelled = false;
    if (!activeReel) {
      setResolvedVideoSrc('');
      return;
    }
    void resolveMediaUri(activeReel.videoUrl).then((src) => {
      if (!cancelled) {
        setResolvedVideoSrc(src || activeReel.videoUrl);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeReel?.id, activeReel?.videoUrl]);

  const activeCategory = activeReel
    ? categories.find((c) => c.id === activeReel.categoryId)
    : undefined;
  const youtubeId = activeReel ? extractYouTubeId(activeReel.videoUrl) : null;
  const isSaved = activeReel ? savedReelIds.includes(activeReel.id) : false;

  return (
    <div className="space-y-5 pb-20">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">
            Reels Educativos · Cápsulas en Video
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Videos cortos verticales para aprender conceptos clave en segundos.
          </p>
        </div>

        {isAdmin && onOpenAdminReelUpload && (
          <button
            type="button"
            onClick={onOpenAdminReelUpload}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Subir Reel Educativo</span>
          </button>
        )}
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId('all');
            setActiveIndex(0);
          }}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            selectedCategoryId === 'all'
              ? 'bg-[#38BDF8] text-[#090D16]'
              : 'bg-[#131C2E] border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Todos ({reels.length})
        </button>
        {categories.map((cat) => {
          const count = reels.filter((r) => r.categoryId === cat.id).length;
          const active = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setActiveIndex(0);
              }}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
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

      {/* Empty State when no Reels have been uploaded yet */}
      {!activeReel ? (
        <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-[#38BDF8] flex items-center justify-center mx-auto">
            <Film className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white font-display">
              Aún no hay Reels publicados en esta sección
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Los videos cortos educativos subidos por el administrador aparecerán aquí en formato
              vertical interactivo.
            </p>
          </div>
          {isAdmin && onOpenAdminReelUpload && (
            <button
              type="button"
              onClick={onOpenAdminReelUpload}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Subir Primer Reel desde Archivos o Link</span>
            </button>
          )}
        </div>
      ) : (
        /* Vertical 9:16 Short-Video Stage + Feed Controls */
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
          {/* Vertical 9:16 Video Frame */}
          <div className="sm:col-span-7 lg:col-span-6 mx-auto w-full max-w-[380px]">
            <div className="rounded-3xl overflow-hidden bg-[#131C2E] border border-slate-800 flex flex-col shadow-xl">
              {/* Top Bar: Category & Position Counter (Never overlaps video title) */}
              <div className="px-4 py-3 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#38BDF8]">
                  {activeCategory?.name || 'Categoría'}
                </span>
                <span className="font-mono tabular-nums text-slate-300">
                  Reel {safeIndex + 1} / {filteredReels.length} · {activeReel.durationSeconds}s
                </span>
              </div>

              {/* Unobstructed 9:16 Video Player Surface */}
              <div className="relative w-full aspect-[9/16] bg-black flex items-center justify-center">
                {youtubeId ? (
                  <iframe
                    title={activeReel.title}
                    src={`https://www.youtube.com/embed/${youtubeId}?rel=0&playsinline=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : resolvedVideoSrc ? (
                  <video
                    key={activeReel.id}
                    src={resolvedVideoSrc}
                    controls
                    playsInline
                    loop
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Cargando video educativo...
                  </div>
                )}
              </div>

              {/* Bottom Caption Deck */}
              <div className="p-4 bg-[#131C2E] border-t border-slate-800 space-y-1.5">
                <h2 className="text-base font-bold text-white font-display leading-snug">
                  {activeReel.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeReel.caption}
                </p>
                {activeReel.fileName && (
                  <div className="text-[11px] text-slate-400 font-mono truncate pt-0.5">
                    Origen: {activeReel.fileName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right / Bottom Action Deck & Playlist */}
          <div className="sm:col-span-5 lg:col-span-6 space-y-4">
            {/* Vertical Navigation & Interaction Controls */}
            <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 space-y-4">
              <div className="text-xs font-semibold text-slate-400">
                Controles del Reel ({safeIndex + 1} de {filteredReels.length})
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={safeIndex <= 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={safeIndex >= filteredReels.length - 1}
                  onClick={() =>
                    setActiveIndex((i) => Math.min(filteredReels.length - 1, i + 1))
                  }
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Siguiente</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => onToggleSaveReel(activeReel.id)}
                  className={`flex-1 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                    isSaved
                      ? 'bg-[#059669] text-white'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{isSaved ? 'Guardado en Favoritos' : 'Guardar Cápsula'}</span>
                </button>

                {activeCategory && onExploreCategory && (
                  <button
                    type="button"
                    onClick={() => onExploreCategory(activeCategory.id)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-[#38BDF8] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Ver {activeCategory.name}</span>
                  </button>
                )}

                {isAdmin && onDeleteReel && (
                  <button
                    type="button"
                    onClick={() => onDeleteReel(activeReel.id)}
                    aria-label={`Eliminar Reel ${activeReel.title}`}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-red-950/60 border border-red-800/80 hover:bg-red-900/60 text-red-300 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Playlist of Available Reels */}
            <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white font-display">
                Lista de Reels ({filteredReels.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredReels.map((r, idx) => {
                  const cat = categories.find((c) => c.id === r.categoryId);
                  const isCurrent = idx === safeIndex;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`w-full p-3 rounded-2xl border text-left transition-colors flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-sky-950/50 border-[#38BDF8] text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-[#38BDF8] font-medium">
                          {cat?.name || 'General'} · {r.durationSeconds}s
                        </div>
                        <div className="text-xs font-bold text-white truncate mt-0.5">
                          {r.title}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-400 shrink-0">
                        0{idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
