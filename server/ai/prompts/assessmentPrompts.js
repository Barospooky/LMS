/**
 * AI Service — Assessment Prompt Handler
 * Builds the Gemini prompts for all assessment types:
 *   - MCQ
 *   - Voice Practice Tasks
 *   - Mixed Mode
 */

import { buildMusicLMSPreamble, clamp, difficultyDescription } from '../utils/promptUtils.js';

/**
 * Build prompt for MCQ assessments.
 */
export const buildMcqPrompt = ({ lessonTitle, instrument, tradition, moduleContent, questionCount, difficulty }) => {
  const count = clamp(questionCount, 1, 20);
  return `
${buildMusicLMSPreamble({ instrument, tradition, lessonTitle })}

Generate exactly ${count} multiple-choice questions (MCQ) for the lesson: "${lessonTitle}".
Difficulty: ${difficultyDescription(difficulty)}.
${moduleContent ? `Lesson content context:\n${moduleContent}` : ''}

Instrument focus: ${instrument || 'general music'}.

Cover a MIX of these topic areas where relevant:
music theory, pitch recognition, rhythm, scales/ragas, notation, instrument technique, ear training.

For Carnatic lessons: include questions on ragas, talas, swaras, gamakas, compositions.
For Western lessons: include questions on scales, chords, intervals, time signatures, notation.

Return ONLY this exact JSON structure:
{
  "assessmentType": "mcq",
  "lessonTitle": "${lessonTitle}",
  "difficulty": "${difficulty}",
  "totalQuestions": ${count},
  "questions": [
    {
      "id": 1,
      "topicArea": "<topic_area>",
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correctAnswer": "<correct option text>",
      "explanation": "<brief explanation why this is correct>",
      "points": 1
    }
  ]
}
`.trim();
};

/**
 * Build prompt for Voice Practice assessments.
 */
export const buildVoicePracticePrompt = ({ lessonTitle, instrument, tradition, questionCount, difficulty }) => {
  const count = clamp(questionCount, 1, 15);
  return `
${buildMusicLMSPreamble({ instrument, tradition, lessonTitle })}

Generate exactly ${count} voice/music practice tasks for the lesson: "${lessonTitle}".
Difficulty: ${difficultyDescription(difficulty)}.
Instrument/style: ${instrument || 'vocal'}.

Task types to include (distribute variety):
- sing_note: Student sings a specific note or swara
- match_pitch: Student matches a given pitch
- repeat_rhythm: Student claps or vocalises a rhythm pattern
- practice_scale: Student sings an ascending/descending scale or raga aroha/avaroha
- hold_note: Student sustains a note for a duration
- sing_raga_phrase: Student sings a short raga phrase (for Carnatic)
- sing_solfege: Student sings a do-re-mi or sa-re-ga phrase

For Carnatic tasks: use Indian solfege (Sa Re Ga Ma Pa Da Ni).
For Western tasks: use standard note names (C D E F G A B).

Return ONLY this exact JSON structure:
{
  "assessmentType": "voice_practice",
  "lessonTitle": "${lessonTitle}",
  "difficulty": "${difficulty}",
  "totalTasks": ${count},
  "tasks": [
    {
      "id": 1,
      "taskType": "<task_type>",
      "instruction": "<clear instruction for the student>",
      "targetNote": "<note or phrase if applicable, else null>",
      "targetRhythm": "<rhythm description if applicable, else null>",
      "durationSeconds": <how long to hold/perform — integer>,
      "evaluationCriteria": {
        "pitchAccuracy": "<what to check for pitch>",
        "rhythmAccuracy": "<what to check for rhythm>",
        "toneQuality": "<what to listen for>"
      },
      "feedbackHints": {
        "tooHigh": "Pitch slightly high — bring it down.",
        "tooLow": "Pitch slightly low — raise it.",
        "offRhythm": "Rhythm is delayed — start on the beat.",
        "correct": "Excellent! Great pitch and stability."
      },
      "points": 2
    }
  ]
}
`.trim();
};

/**
 * Build prompt for Mixed Mode assessments (MCQ + Voice).
 */
export const buildMixedAssessmentPrompt = ({ lessonTitle, instrument, tradition, moduleContent, difficulty }) => {
  const mcqCount   = 3;
  const voiceCount = 2;
  const total      = 5;

  return `
${buildMusicLMSPreamble({ instrument, tradition, lessonTitle })}

Generate a MIXED assessment for the lesson: "${lessonTitle}".
Difficulty: ${difficultyDescription(difficulty)}.
${moduleContent ? `Lesson content context:\n${moduleContent}` : ''}

Generate:
- Exactly ${mcqCount} MCQ questions (focused on music theory and notation check)
- Exactly ${voiceCount} voice/practice tasks (pitch matching, interval holding, solfege notes)

Return ONLY this exact JSON structure:
{
  "assessmentType": "mixed",
  "lessonTitle": "${lessonTitle}",
  "difficulty": "${difficulty}",
  "totalItems": ${total},
  "mcqSection": {
    "count": ${mcqCount},
    "questions": [
      {
        "id": 1,
        "topicArea": "<topic>",
        "question": "<question>",
        "options": ["<A>", "<B>", "<C>", "<D>"],
        "correctAnswer": "<correct>",
        "explanation": "<explanation>",
        "points": 1
      }
    ]
  },
  "voiceSection": {
    "count": ${voiceCount},
    "tasks": [
      {
        "id": 1,
        "taskType": "<task_type>",
        "instruction": "<instruction>",
        "targetNote": "<note or null>",
        "targetRhythm": "<rhythm or null>",
        "durationSeconds": 5,
        "evaluationCriteria": {
          "pitchAccuracy": "<what to check>",
          "rhythmAccuracy": "<what to check>",
          "toneQuality": "<what to check>"
        },
        "feedbackHints": {
          "tooHigh": "Pitch slightly high — bring it down.",
          "tooLow": "Pitch slightly low — raise it.",
          "offRhythm": "Rhythm delayed — start on the beat.",
          "correct": "Excellent!"
        },
        "points": 2
      }
    ]
  }
}
`.trim();
};
