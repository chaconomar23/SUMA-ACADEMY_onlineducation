import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateUnifiedLogin,
  extractYouTubeId,
  createSlug,
  evaluateQuizSubmission,
  validateCategoryInput,
  validateLessonInput,
  validateReelInput,
} from './academyLogic';
import {
  INITIAL_CATEGORIES,
  INITIAL_LESSONS,
  INITIAL_REELS,
} from '../data/seedAcademyData';

test('Seed data contains only the 4 categories and zero predetermined lessons or reels', () => {
  assert.equal(INITIAL_CATEGORIES.length, 4);
  assert.equal(INITIAL_LESSONS.length, 0);
  assert.equal(INITIAL_REELS.length, 0);
});

test('Unified login detects hidden admin credentials chaconomar23 / OmarJR2006', () => {
  const adminResult = evaluateUnifiedLogin('chaconomar23', 'OmarJR2006');
  assert.equal(adminResult.valid, true);
  assert.equal(adminResult.role, 'admin');
  assert.equal(adminResult.normalizedIdentifier, 'chaconomar23');

  const wrongPassResult = evaluateUnifiedLogin('chaconomar23', 'wrongpass');
  assert.equal(wrongPassResult.valid, false);
  assert.equal(wrongPassResult.role, 'student');

  const studentResult = evaluateUnifiedLogin('estudiante@universidad.edu', 'clave1234');
  assert.equal(studentResult.valid, true);
  assert.equal(studentResult.role, 'student');
});

test('YouTube URL parser extracts 11-char video ID from multiple formats including Shorts', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=aircAruvnKk'), 'aircAruvnKk');
  assert.equal(extractYouTubeId('https://youtu.be/aircAruvnKk?si=123'), 'aircAruvnKk');
  assert.equal(extractYouTubeId('https://www.youtube.com/shorts/aircAruvnKk'), 'aircAruvnKk');
  assert.equal(extractYouTubeId('localfile://file-1234'), null);
});

test('Slug generator strips accents and enforces blueprint pattern', () => {
  const slug = createSlug('Psicología & Comportamiento');
  assert.equal(slug, 'psicologia-comportamiento');
  assert.match(slug, /^[a-z0-9\-]+$/);
});

test('Quiz submission evaluator calculates score, pass threshold, and per-question breakdown', () => {
  const questions = [
    {
      id: 'q1',
      question: '¿Qué sistema procesa decisiones rápidas e intuitivas según Kahneman?',
      options: ['Sistema 1', 'Sistema 2', 'Corteza motora'],
      correctIndex: 0,
      explanation: 'El Sistema 1 opera de manera rápida, automática e inconsciente.',
    },
    {
      id: 'q2',
      question: '¿Qué métrica mide el costo de adquirir un cliente?',
      options: ['LTV', 'CAC', 'CTR'],
      correctIndex: 1,
      explanation: 'CAC significa Customer Acquisition Cost.',
    },
  ];

  const perfect = evaluateQuizSubmission(questions, { q1: 0, q2: 1 });
  assert.equal(perfect.correctCount, 2);
  assert.equal(perfect.scorePercent, 100);
  assert.equal(perfect.passed, true);
});

test('Blueprint input validators enforce size and format constraints for Categories, Lessons, and Reels', () => {
  assert.equal(
    validateCategoryInput({
      name: 'Psicología Cognitiva',
      description: 'Estudio de los procesos mentales, toma de decisiones y sesgos.',
      themeKey: 'psychology',
    }).valid,
    true
  );

  assert.equal(
    validateLessonInput({
      categoryId: 'cat-psicologia',
      title: 'Sesgos Cognitivos y Arquitectura de Decisiones',
      description: 'Cómo el cerebro humano utiliza heurísticas para decidir bajo incertidumbre.',
      youtubeUrl: 'localfile://file-abc123',
      durationMinutes: 18,
    }).valid,
    true
  );

  assert.equal(
    validateReelInput({
      categoryId: 'cat-ia',
      title: '¿Qué es un Token en IA?',
      caption: 'Explicación en 45 segundos sobre cómo los modelos dividen las palabras en sub-unidades.',
      videoUrl: 'localfile://file-reel99',
      durationSeconds: 45,
    }).valid,
    true
  );

  assert.equal(
    validateReelInput({
      categoryId: 'cat-ia',
      title: 'Corto',
      caption: 'Explicación válida sobre tokens.',
      videoUrl: '',
      durationSeconds: 45,
    }).valid,
    false
  );
});
