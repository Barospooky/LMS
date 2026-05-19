/**
 * AI Service — Prompt Utilities
 * Shared helpers for constructing Gemini prompts.
 */

/**
 * Build a music-context preamble injected into every AI prompt.
 * This tells Gemini exactly what kind of platform it is operating within.
 */
export const buildMusicLMSPreamble = ({ instrument = '', tradition = '', lessonTitle = '' } = {}) => `
You are an expert music education AI assistant embedded inside a Music Learning Management System (LMS)
called "Melody Conservatory". The platform teaches both Carnatic and Western music traditions.
Supported instruments include: vocal, guitar, piano, violin, flute, tabla, mridangam, harmonium, sitar, drums.
${instrument ? `Current lesson instrument: ${instrument}.` : ''}
${tradition ? `Music tradition: ${tradition}.` : ''}
${lessonTitle ? `Current lesson: "${lessonTitle}".` : ''}
Always respond with ONLY valid JSON — no markdown, no prose, no explanation outside the JSON structure.
`.trim();

/**
 * Clamp a number between min and max.
 */
export const clamp = (value, min, max) => Math.min(Math.max(Number(value), min), max);

/**
 * Return a difficulty label description for prompt injection.
 */
export const difficultyDescription = (level) => {
  const map = {
    beginner:     'very simple, introductory-level, assume no prior music knowledge',
    intermediate: 'moderately challenging, assume basic music theory knowledge',
    advanced:     'complex and nuanced, assume strong music theory background',
  };
  return map[level] || map.beginner;
};
