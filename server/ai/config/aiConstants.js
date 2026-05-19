/**
 * AI Service — Shared Constants
 * Central place for all enumerations used across AI modules.
 */

export const SUPPORTED_INSTRUMENTS = [
  'vocal', 'guitar', 'piano', 'keyboard',
  'violin', 'flute', 'tabla', 'mridangam',
  'harmonium', 'sitar', 'drums', 'bass_guitar',
];

export const MUSIC_TRADITIONS = ['carnatic', 'western', 'hindustani', 'jazz', 'classical', 'folk'];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

export const ASSESSMENT_TYPES = ['mcq', 'voice_practice', 'mixed'];

export const QUESTION_TOPIC_AREAS = [
  'music_theory', 'pitch', 'rhythm', 'scales',
  'ragas', 'notation', 'instrument_technique',
  'ear_training', 'harmony', 'composition',
];

export const VOICE_TASK_TYPES = [
  'sing_note', 'match_pitch', 'repeat_rhythm',
  'practice_scale', 'hold_note', 'sing_raga_phrase',
  'sing_solfege', 'clap_rhythm',
];

export const NOTE_NAMES = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Da', 'Ni', 'Sa\'', 'C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const AI_MODEL = {
  DEFAULT: 'gemini-2.5-flash',
  PRO:     'gemini-2.5-flash',
};

export const MAX_TOKENS = {
  ASSESSMENT: 4096,
  NOTES:      3072,
  DOUBT:      1024,
  RECOMMEND:  2048,
};
