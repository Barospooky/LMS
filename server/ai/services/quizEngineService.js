/**
 * AI Service - Automated Quiz Generation Engine
 *
 * Generates lesson-specific quiz questions for any LMS course category.
 * The engine uses the saved lesson transcript/content guide first. If no
 * transcript exists, it falls back to lesson title/category context.
 */

import pool from '../../config/db.js';
import { getGeminiModel } from '../config/geminiClient.js';
import { transcribeVideo } from './transcriptionService.js';
import { parseJsonResponse } from '../utils/responseUtils.js';

const MUSIC_SUBJECTS = new Set(['music', 'vocal', 'singing', 'guitar', 'piano', 'violin', 'drums']);

const isMusicSubject = (subject = '') => {
  const normalized = String(subject).toLowerCase().trim();
  return MUSIC_SUBJECTS.has(normalized);
};

const normalizeQuestion = (question, fallbackIndex, allowVoiceTasks) => {
  const rawType = String(question.type || '').toLowerCase();
  const isVoice = allowVoiceTasks && (rawType === 'voice' || rawType === 'voice_practice' || question.task);

  if (isVoice) {
    return {
      type: 'voice',
      question: question.task || question.question || `Practice task ${fallbackIndex}`,
      options: {
        expected_pitch: question.expected_pitch || 'Comfortable pitch',
        expected_scale: question.expected_scale || 'General',
        expected_tempo: question.expected_tempo || 'Steady',
        evaluation_rules: question.evaluation_rules || {
          pitch_accuracy: true,
          rhythm_accuracy: true,
          timing_check: true,
        },
      },
      correct_answer: 'recorded',
    };
  }

  const options = Array.isArray(question.options) && question.options.length >= 4
    ? question.options.slice(0, 4)
    : ['Correct concept', 'Related but incomplete', 'Incorrect concept', 'Not discussed'];

  const correctAnswer = question.correct_answer && options.includes(question.correct_answer)
    ? question.correct_answer
    : options[0];

  return {
    type: 'text',
    question: question.question || `Checkpoint question ${fallbackIndex}`,
    options,
    correct_answer: correctAnswer,
  };
};

const buildFallbackQuestions = ({ lessonTitle, subject, questionCount = 5, allowVoiceTasks = false }) => {
  const base = [
    {
      type: 'text',
      question: `What is the main focus of "${lessonTitle}"?`,
      options: [
        `Understanding ${lessonTitle}`,
        'Changing account settings',
        'Skipping the lesson',
        'Deleting course progress',
      ],
      correct_answer: `Understanding ${lessonTitle}`,
    },
    {
      type: 'text',
      question: `Which action best helps a learner after this ${subject} lesson?`,
      options: [
        'Review the lesson notes and apply the example',
        'Ignore the transcript',
        'Close the course permanently',
        'Skip the assessment',
      ],
      correct_answer: 'Review the lesson notes and apply the example',
    },
    {
      type: 'text',
      question: 'Why is the quiz connected to the lesson video?',
      options: [
        'To check understanding of the lesson content',
        'To replace the course certificate',
        'To remove the video player',
        'To change the student role',
      ],
      correct_answer: 'To check understanding of the lesson content',
    },
    {
      type: 'text',
      question: 'What should learners focus on before submitting the quiz?',
      options: [
        'Key concepts, examples, and common mistakes',
        'Only the course thumbnail',
        'Only the payment page',
        'Only the sidebar menu',
      ],
      correct_answer: 'Key concepts, examples, and common mistakes',
    },
    {
      type: 'text',
      question: `How does this ${subject} lesson support course completion?`,
      options: [
        'It builds progress toward assessment and certificate readiness',
        'It disables all future modules',
        'It removes resources',
        'It skips learning progress',
      ],
      correct_answer: 'It builds progress toward assessment and certificate readiness',
    },
  ];

  if (allowVoiceTasks) {
    base[3] = {
      type: 'voice',
      question: `Practice explaining or performing one key idea from "${lessonTitle}" clearly.`,
      options: {
        expected_pitch: 'Comfortable pitch',
        expected_scale: 'General',
        expected_tempo: 'Steady',
        evaluation_rules: {
          pitch_accuracy: true,
          rhythm_accuracy: true,
          timing_check: true,
        },
      },
      correct_answer: 'recorded',
    };
  }

  return base.slice(0, questionCount);
};

export const generateAutomatedAssessment = async ({
  lessonId,
  lessonTitle,
  videoUrl,
  instrument = 'general',
  tradition = 'general',
  type = 'mcq',
  questionCount = 5,
  difficulty = 'intermediate',
}) => {
  const subject = instrument || 'general';
  const allowVoiceTasks = isMusicSubject(subject) && type !== 'mcq';
  const normalizedQuestionCount = Math.max(1, Math.min(Number(questionCount) || 5, 10));

  console.log(`[Quiz Engine] Generating ${normalizedQuestionCount} ${subject} questions for lesson ${lessonId}`);

  const transcript = await transcribeVideo(lessonId, videoUrl, lessonTitle, subject);

  const existing = await pool.query(
    'SELECT question FROM quizzes WHERE lesson_id = $1',
    [lessonId]
  );
  const blacklist = existing.rows.map((row) => row.question.trim()).filter(Boolean);

  const prompt = buildQuizPrompt({
    lessonTitle,
    subject,
    tradition,
    transcript,
    questionCount: normalizedQuestionCount,
    difficulty,
    allowVoiceTasks,
    blacklist,
  });

  let normalizedQuestions = [];

  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = parseJsonResponse(rawText);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    normalizedQuestions = questions
      .slice(0, normalizedQuestionCount)
      .map((question, index) => normalizeQuestion(question, index + 1, allowVoiceTasks))
      .filter((question) => question.question && !blacklist.includes(question.question));
  } catch (error) {
    console.error('[Quiz Engine] Gemini question generation failed:', error.message);
    normalizedQuestions = buildFallbackQuestions({
      lessonTitle,
      subject,
      questionCount: normalizedQuestionCount,
      allowVoiceTasks,
    });
  }

  if (normalizedQuestions.length < normalizedQuestionCount) {
    const fallback = buildFallbackQuestions({
      lessonTitle,
      subject,
      questionCount: normalizedQuestionCount,
      allowVoiceTasks,
    });

    for (const question of fallback) {
      if (normalizedQuestions.length >= normalizedQuestionCount) break;
      if (!normalizedQuestions.some((item) => item.question === question.question)) {
        normalizedQuestions.push(question);
      }
    }
  }

  await pool.query('DELETE FROM quizzes WHERE lesson_id = $1', [lessonId]);

  for (const question of normalizedQuestions.slice(0, normalizedQuestionCount)) {
    await pool.query(
      `INSERT INTO quizzes (lesson_id, type, question, options, correct_answer)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        lessonId,
        question.type,
        question.question,
        JSON.stringify(question.options),
        question.correct_answer,
      ]
    );
  }

  return {
    quiz_title: `${lessonTitle} Checkpoint Assessment`,
    difficulty,
    mode: allowVoiceTasks ? 'mixed' : 'mcq',
    questions: normalizedQuestions.slice(0, normalizedQuestionCount),
  };
};

const buildQuizPrompt = ({
  lessonTitle,
  subject,
  tradition,
  transcript,
  questionCount,
  difficulty,
  allowVoiceTasks,
  blacklist,
}) => {
  const blacklistText = blacklist.length
    ? blacklist.map((question, index) => `${index + 1}. ${question}`).join('\n')
    : 'None';

  const questionMix = allowVoiceTasks
    ? `Create mostly MCQ questions and include 1-2 practical voice/performance tasks only when the transcript supports them.`
    : `Create only MCQ questions. Do not create voice, singing, pitch, rhythm, or performance tasks.`;

  const allowedTypes = allowVoiceTasks
    ? '"mcq" or "voice"'
    : '"mcq" only';

  return `
You are an expert LMS quiz generator.
Generate exactly ${questionCount} quiz questions from the lesson transcript.

LESSON:
- Title: ${lessonTitle}
- Subject/category: ${subject}
- Tradition/context: ${tradition}
- Difficulty: ${difficulty}

TRANSCRIPT OR LESSON NOTES:
${transcript}

PREVIOUS QUESTIONS TO AVOID:
${blacklistText}

RULES:
- Questions must be based on the transcript/lesson notes above.
- ${questionMix}
- Use clear language suitable for learners.
- Avoid duplicate or nearly duplicate questions from the previous list.
- Every MCQ must have exactly 4 options.
- The correct_answer must exactly match one option.
- Allowed question types: ${allowedTypes}.

Return ONLY valid JSON in this exact structure:
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A"
    }
  ]
}

If creating a music voice task, use this structure:
{
  "type": "voice",
  "task": "Short practical performance task",
  "expected_pitch": "Comfortable pitch or named pitch",
  "expected_scale": "General or named scale",
  "expected_tempo": "Steady or bpm",
  "evaluation_rules": {
    "pitch_accuracy": true,
    "rhythm_accuracy": true,
    "timing_check": true
  }
}
`.trim();
};
