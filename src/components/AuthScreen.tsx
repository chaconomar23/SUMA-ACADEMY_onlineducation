import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { BookOpen, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { AcademyUser, evaluateUnifiedLogin } from '../utils/academyLogic';

interface AuthScreenProps {
  onAuthenticated: (user: AcademyUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoConsoleNote, setInfoConsoleNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoConsoleNote(null);

    const evaluation = evaluateUnifiedLogin(identifier, password);
    if (!evaluation.valid) {
      setErrorMsg(evaluation.error || 'Verifica tus datos de acceso.');
      return;
    }

    // Hidden Admin Access via exact same student form (chaconomar23 + OmarJR2006)
    if (evaluation.role === 'admin') {
      onAuthenticated({
        uid: 'admin-chaconomar23',
        usernameOrEmail: 'chaconomar23',
        displayName: 'Omar Chacón · Administrador',
        email: 'chaconomar411@gmail.com',
        role: 'admin',
        authMethod: 'admin-secret',
      });
      return;
    }

    // Standard Student Email Authentication
    const trimmedEmail = evaluation.normalizedIdentifier.includes('@')
      ? evaluation.normalizedIdentifier
      : `${evaluation.normalizedIdentifier}@estudiante.sumaacademy.edu`;

    if (mode === 'register' && fullName.trim().length < 2) {
      setErrorMsg('Ingresa tu nombre completo para crear tu cuenta de estudiante.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
        onAuthenticated({
          uid: cred.user.uid,
          usernameOrEmail: trimmedEmail,
          displayName: fullName.trim() || trimmedEmail.split('@')[0],
          email: trimmedEmail,
          role: 'student',
          authMethod: 'email',
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onAuthenticated({
          uid: cred.user.uid,
          usernameOrEmail: trimmedEmail,
          displayName: cred.user.displayName || trimmedEmail.split('@')[0],
          email: cred.user.email || trimmedEmail,
          role: 'student',
          authMethod: 'email',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('auth/operation-not-allowed') ||
        message.includes('auth/configuration-not-found') ||
        message.includes('auth/user-not-found') ||
        message.includes('auth/invalid-credential')
      ) {
        const studentName =
          fullName.trim() ||
          evaluation.normalizedIdentifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
        onAuthenticated({
          uid: `student-${evaluation.normalizedIdentifier.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
          usernameOrEmail: trimmedEmail,
          displayName: studentName.charAt(0).toUpperCase() + studentName.slice(1),
          email: trimmedEmail,
          role: 'student',
          authMethod: 'email',
        });
      } else {
        setErrorMsg('No se pudo iniciar sesión. Verifica tu correo y contraseña.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isOwnerAdmin = user.email === 'chaconomar411@gmail.com';
      onAuthenticated({
        uid: user.uid,
        usernameOrEmail: user.email || user.uid,
        displayName: user.displayName || 'Estudiante SUMA+',
        email: user.email || 'estudiante@sumaacademy.edu',
        role: isOwnerAdmin ? 'admin' : 'student',
        authMethod: 'google',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/popup-closed-by-user')) {
        setErrorMsg('Cerraste la ventana de acceso de Google antes de completar el inicio.');
      } else {
        setInfoConsoleNote(
          'Si estás en un navegador sin ventanas emergentes, puedes ingresar directamente con tu correo electrónico en el formulario.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col justify-between">
      {/* Top Bar Contract (Dark Mode) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          SUMA+ ACADEMY
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {['Psicología', 'Marketing', 'Inteligencia Artificial', 'Liderazgo'].map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => {
                setInfoConsoleNote(
                  `Inicia sesión o regístrate para acceder al catálogo de ${area}.`
                );
                const el = document.getElementById('auth-identifier');
                if (el) el.focus();
              }}
              className="hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0"
            >
              {area}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('auth-identifier');
              if (el) el.focus();
            }}
            className="px-4 py-2 text-xs font-semibold text-[#090D16] bg-[#38BDF8] rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            Acceso Estudiantes
          </button>
        </div>
      </header>

      {/* Main Split / Vertical Mobile Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Editorial Academy Overview on Desktop */}
        <section className="lg:col-span-7 space-y-6">
          <div className="text-xs font-medium text-[#38BDF8]">
            Biblioteca Académica Interactiva · Formato Móvil Vertical
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.12] font-display">
            Domina Psicología, Marketing e Inteligencia Artificial en lecciones y Reels educativos.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
            Accede a lecciones en video, archivos PDF, imágenes didácticas, cuestionarios de
            evaluación y cápsulas verticales en formato Reels publicadas en tiempo real.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 max-w-xl">
            <div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">04</div>
              <div className="text-xs text-slate-400 mt-0.5">Categorías base</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#38BDF8] font-mono tabular-nums">Reels</div>
              <div className="text-xs text-slate-400 mt-0.5">Videos cortos 9:16</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">Archivos y links</div>
            </div>
          </div>
        </section>

        {/* Right Column: Vertical Mobile Authentication Card (Dark Mode) */}
        <section className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-[#131C2E] rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-display">
                    {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta de Estudiante'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Ingresa con tu cuenta para acceder a la biblioteca
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ya tengo cuenta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Registrarme con correo
              </button>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.99-2.19-6.98-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.02 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4.01-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4.01 3.14c.99-2.95 3.74-5.24 6.98-5.24z"
                />
              </svg>
              <span className="whitespace-nowrap">Continuar con cuenta de Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-[#131C2E] px-3 text-xs text-slate-400 whitespace-nowrap">
                o con tu correo / usuario
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Unified Form for Students AND Hidden Administrator */}
            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Nombre completo del estudiante
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Sofía Martínez"
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-identifier"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Correo electrónico o usuario
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="estudiante@correo.com"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoConsoleNote && (
                <div className="p-3 rounded-xl bg-sky-950/70 border border-sky-800 text-xs text-sky-200">
                  {infoConsoleNote}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <span className="whitespace-nowrap">
                  {mode === 'login' ? 'Ingresar a SUMA+ ACADEMY' : 'Completar Registro'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="px-6 py-4 border-t border-slate-800 bg-[#0F172A] text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <span>SUMA+ ACADEMY · Biblioteca Móvil de Aprendizaje Aplicado</span>
        <span>Autenticación con Google y Correo Electrónico</span>
      </footer>
    </div>
  );
};
