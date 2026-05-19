/**
 * AI Service — Notes Prompt Handler
 * Builds the Gemini prompt for the AI Notes Generator.
 */

import { buildMusicLMSPreamble } from '../utils/promptUtils.js';

/**
 * Build the prompt for generating structured study notes from lesson content.
 */
export const buildNotesPrompt = ({ lessonTitle, instrument, tradition, moduleContent, lessonOrder }) => `
${buildMusicLMSPreamble({ instrument, tradition, lessonTitle })}

Generate comprehensive, student-friendly study notes for this music lesson.

Lesson Title  : "${lessonTitle}"
Module Number : ${lessonOrder || 'N/A'}
Instrument    : ${instrument || 'General Music'}
Tradition     : ${tradition || 'General'}
${moduleContent ? `\nLesson Description/Content:\n${moduleContent}` : ''}

Create notes that are:
- Concise and easy to understand for music students
- Structured with clear sections
- Practical with actionable practice tips
- Inclusive of music-specific terminology with plain-English explanations

For Carnatic music lessons: include relevant ragas, talas, swaras, gamakas, composers.
For Western music lessons: include scales, chords, intervals, time signatures, notation tips.
For instrument lessons (guitar/piano/tabla etc.): include finger positions, technique cues, common mistakes.

Return ONLY this exact JSON structure:
{
  "lessonTitle": "${lessonTitle}",
  "instrument": "${instrument || 'General'}",
  "tradition": "${tradition || 'General'}",
  "generatedAt": "<ISO timestamp>",
  "notes": {
    "summary": "<2-3 sentence overview of what this lesson covers>",
    "keyPoints": [
      "<concise key point 1>",
      "<concise key point 2>",
      "<concise key point 3>"
    ],
    "importantConcepts": [
      {
        "term": "<music term>",
        "definition": "<plain-language definition>",
        "example": "<practical example>"
      }
    ],
    "practiceExercises": [
      {
        "exerciseNumber": 1,
        "description": "<what to practice>",
        "duration": "<suggested practice duration>",
        "tip": "<helpful tip>"
      }
    ],
    "revisionPoints": [
      "<quick revision bullet 1>",
      "<quick revision bullet 2>",
      "<quick revision bullet 3>"
    ],
    "commonMistakes": [
      "<mistake to avoid>"
    ],
    "furtherLearning": "<suggestion for what to explore next>"
  }
}
`.trim();
