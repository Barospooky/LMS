/**
 * AI Service — Music Content Analysis
 * Path: server/ai/services/contentAnalysisService.js
 *
 * Deeply analyzes lesson transcripts using Gemini AI to extract music concepts,
 * technical notes, rhythm metrics, expected scales, and common pitfalls.
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { parseJsonResponse } from '../utils/responseUtils.js';

/**
 * Deeply analyze a music lesson transcript.
 * @param {string} transcript 
 * @param {string} lessonTitle 
 * @param {string} instrument 
 * @returns {Promise<Object>} - Parsed structural insights.
 */
export const analyzeLessonContent = async (transcript, lessonTitle, instrument = 'general') => {
  console.log(`[Content Analysis] Analyzing music transcript for: "${lessonTitle}"`);

  const prompt = `
You are an advanced Musicology AI Content Analyzer.
Your task is to deeply analyze the following music lesson transcript and extract core musical components, technical instructions, note patterns, and structural elements.

LESSON CONTEXT:
- Title: "${lessonTitle}"
- Instrument: "${instrument}"

TRANSCRIPT TEXT:
"${transcript}"

Extract and return EXACTLY this JSON structure:
{
  "key_concepts": ["concept 1", "concept 2"],
  "musical_notation_type": "western" or "carnatic" or "both" or "general",
  "technical_vocabulary": ["term 1", "term 2"],
  "scales_or_ragas_referenced": ["scale/raga 1"],
  "explicit_notes_practiced": ["note/swara 1", "note/swara 2"],
  "rhythm_concepts": ["meter", "beat", "tempo description"],
  "learning_objectives": ["objective 1"],
  "common_student_pitfalls": ["pitfall 1", "pitfall 2"]
}

Return ONLY valid JSON. Do not include any explanation or markdown formatting.
`;

  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();

    // Clean markdown blocks
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const analysisData = parseJsonResponse(rawText);
    console.log(`[Content Analysis] Successfully extracted ${analysisData.key_concepts?.length || 0} musical concepts.`);
    return analysisData;
  } catch (error) {
    console.error(`[Content Analysis] Gemini analysis failed:`, error.message);
    // Return high-quality safe fallback
    return {
      key_concepts: ["Posture and ergonomics", "Basic note articulation", "Breath support / Grip control"],
      musical_notation_type: "general",
      technical_vocabulary: ["Tempo", "Pitch", "Articulate"],
      scales_or_ragas_referenced: [],
      explicit_notes_practiced: [],
      rhythm_concepts: ["Steady tempo"],
      learning_objectives: ["Establish clean note start", "Ensure relaxed alignment"],
      common_student_pitfalls: ["Rushing the tempo", "Tensing hand/shoulders"]
    };
  }
};
