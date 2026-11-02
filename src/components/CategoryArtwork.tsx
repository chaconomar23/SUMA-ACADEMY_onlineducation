import React from 'react';
import { ThemeKey } from '../utils/academyLogic';

interface CategoryArtworkProps {
  themeKey: ThemeKey;
  title?: string;
  className?: string;
}

export const THEME_META: Record<
  ThemeKey,
  {
    label: string;
    bgClass: string;
    accentText: string;
    borderClass: string;
    hexAccent: string;
  }
> = {
  psychology: {
    label: 'Psicología & Cognición',
    bgClass: 'bg-[#0F172A]',
    accentText: 'text-[#0284C7]',
    borderClass: 'border-slate-200',
    hexAccent: '#0284C7',
  },
  marketing: {
    label: 'Marketing & Estrategia',
    bgClass: 'bg-[#1E293B]',
    accentText: 'text-[#D97706]',
    borderClass: 'border-slate-200',
    hexAccent: '#D97706',
  },
  ai: {
    label: 'Inteligencia Artificial',
    bgClass: 'bg-[#0F172A]',
    accentText: 'text-[#059669]',
    borderClass: 'border-slate-200',
    hexAccent: '#059669',
  },
  finance: {
    label: 'Finanzas & Negocios',
    bgClass: 'bg-[#1E293B]',
    accentText: 'text-[#0284C7]',
    borderClass: 'border-slate-200',
    hexAccent: '#0284C7',
  },
  design: {
    label: 'Diseño & Producto',
    bgClass: 'bg-[#0F172A]',
    accentText: 'text-[#D97706]',
    borderClass: 'border-slate-200',
    hexAccent: '#D97706',
  },
  leadership: {
    label: 'Liderazgo & Enfoque',
    bgClass: 'bg-[#1E293B]',
    accentText: 'text-[#059669]',
    borderClass: 'border-slate-200',
    hexAccent: '#059669',
  },
};

export const CategoryArtwork: React.FC<CategoryArtworkProps> = ({
  themeKey,
  className = 'w-full h-36',
}) => {
  return (
    <div
      className={`relative overflow-hidden select-none bg-[#0F172A] text-white ${className}`}
      aria-hidden="true"
    >
      {/* Subtle architectural coordinate grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25"
        viewBox="0 0 400 200"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id={`grid-${themeKey}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#475569" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill={`url(#grid-${themeKey})`} />

        {themeKey === 'psychology' && (
          <g stroke="#38BDF8" strokeWidth="1.5">
            <circle cx="290" cy="100" r="56" strokeOpacity="0.35" />
            <circle cx="265" cy="100" r="42" stroke="#F8FAFC" strokeOpacity="0.6" />
            <path
              d="M 190 145 C 225 65, 295 65, 345 135"
              stroke="#38BDF8"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="265" cy="88" r="4" fill="#38BDF8" />
            <circle cx="305" cy="112" r="4" fill="#F8FAFC" />
          </g>
        )}

        {themeKey === 'marketing' && (
          <g stroke="#F59E0B" strokeWidth="1.5">
            <polygon
              points="230,45 340,45 310,95 260,95"
              fill="#F59E0B"
              fillOpacity="0.16"
            />
            <polygon
              points="260,102 310,102 295,148 275,148"
              fill="#F8FAFC"
              fillOpacity="0.2"
              stroke="#F8FAFC"
            />
            <line x1="210" y1="162" x2="360" y2="162" stroke="#94A3B8" strokeDasharray="4 4" />
          </g>
        )}

        {themeKey === 'ai' && (
          <g stroke="#34D399" strokeWidth="1.5">
            <line x1="220" y1="55" x2="285" y2="85" strokeOpacity="0.5" />
            <line x1="220" y1="100" x2="285" y2="85" strokeOpacity="0.5" />
            <line x1="220" y1="145" x2="285" y2="115" strokeOpacity="0.5" />
            <line x1="285" y1="85" x2="345" y2="100" stroke="#F8FAFC" strokeOpacity="0.7" />
            <line x1="285" y1="115" x2="345" y2="100" stroke="#F8FAFC" strokeOpacity="0.7" />
            <circle cx="220" cy="55" r="6" fill="#0F172A" stroke="#34D399" strokeWidth="2" />
            <circle cx="220" cy="100" r="6" fill="#0F172A" stroke="#34D399" strokeWidth="2" />
            <circle cx="220" cy="145" r="6" fill="#0F172A" stroke="#34D399" strokeWidth="2" />
            <circle cx="285" cy="85" r="7" fill="#34D399" />
            <circle cx="285" cy="115" r="7" fill="#34D399" />
            <circle cx="345" cy="100" r="8" fill="#F8FAFC" />
          </g>
        )}

        {(themeKey === 'leadership' || themeKey === 'finance' || themeKey === 'design') && (
          <g stroke="#38BDF8" strokeWidth="1.5">
            <rect x="220" y="110" width="24" height="45" fill="#38BDF8" fillOpacity="0.2" />
            <rect x="260" y="82" width="24" height="73" fill="#38BDF8" fillOpacity="0.35" />
            <rect x="300" y="52" width="24" height="103" fill="#F8FAFC" fillOpacity="0.7" stroke="#F8FAFC" />
            <path d="M 215 95 L 270 65 L 325 38" stroke="#34D399" strokeWidth="2" />
          </g>
        )}
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/45 to-transparent" />
    </div>
  );
};

export const DidacticDiagramIllustration: React.FC<{
  url: string;
  title: string;
}> = ({ url, title }) => {
  if (url === 'internal://diagram-sistema-1-2') {
    return (
      <div className="bg-[#0F172A] text-white p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="text-xs text-slate-400">Esquema Comparativo · Neurociencia Cognitiva</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-sm font-semibold text-sky-400">Sistema 1 · Rápido e Intuitivo</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Opera de forma automática, emocional y asociativa. Representa cerca del 95% de las
              decisiones cotidianas inmediatas.
            </p>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              Latencia neuronal: ~80-150 ms · Esfuerzo: Mínimo
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-sm font-semibold text-emerald-400">Sistema 2 · Analítico y Lento</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Evalúa evidencia lógica, compara probabilidades y audita impulsos generados por el
              Sistema 1.
            </p>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              Procesamiento secuencial · Esfuerzo: Alto
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (url === 'internal://diagram-funnel-aarrr') {
    return (
      <div className="bg-[#0F172A] text-white p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="text-xs text-slate-400">Arquitectura de Crecimiento · Embudo AARRR</div>
        <div className="space-y-2 font-mono text-xs tabular-nums">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
            <span>01. Adquisición (Tráfico Cualificado)</span>
            <span className="text-amber-400">100% Base</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
            <span>02. Activación (Primera Experiencia de Valor)</span>
            <span className="text-sky-400">42% Conversión</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
            <span>03. Retención (Uso Recurrente Mensual)</span>
            <span className="text-emerald-400">28% Cohorte</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
            <span>04. Ingresos y Referencia (LTV / CAC &gt; 3.0x)</span>
            <span className="text-white">Escala Sostenible</span>
          </div>
        </div>
      </div>
    );
  }

  if (url === 'internal://diagram-transformer-ai') {
    return (
      <div className="bg-[#0F172A] text-white p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="text-xs text-slate-400">Arquitectura Transformer · Flujo de Tokens</div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-semibold text-sky-400">1. Embeddings</div>
            <div className="text-[11px] text-slate-400 mt-1">Vectores semánticos + Posición</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-semibold text-emerald-400">2. Self-Attention</div>
            <div className="text-[11px] text-slate-400 mt-1">Matrices Q · K · V en paralelo</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-semibold text-amber-400">3. Softmax</div>
            <div className="text-[11px] text-slate-400 mt-1">Distribución del siguiente token</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
      <img
        src={url}
        alt={title}
        referrerPolicy="no-referrer"
        className="w-full max-h-80 object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="p-4 text-xs text-slate-300">{title}</div>
    </div>
  );
};
