/**
 * AI Service - Lesson Content Analysis
 *
 * Analyzes a lesson transcript and extracts generic LMS concepts that can be
 * used to generate quizzes for any course category.
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { parseJsonResponse } from '../utils/responseUtils.js';

export const analyzeLessonContent = async (transcript, lessonTitle, subject = 'general') => {
  console.log(`[Content Analysis] Analyzing lesson transcript for: "${lessonTitle}"`);

  const prompt = `
You are an advanced LMS instructional content analyzer.
Analyze the lesson transcript and extract the teachable concepts needed to generate a relevant quiz.

LESSON CONTEXT:
- Title: "${lessonTitle}"
- Course category or subject: "${subject}"

TRANSCRIPT TEXT:
"${transcript}"

Return EXACTLY this JSON structure:
{
  "key_concepts": ["concept 1", "concept 2"],
  "subject_area": "${subject}",
  "technical_vocabulary": ["term 1", "term 2"],
  "examples_or_demos": ["example 1", "demo 1"],
  "practical_steps": ["step 1", "step 2"],
  "learning_objectives": ["objective 1"],
  "common_student_pitfalls": ["pitfall 1", "pitfall 2"],
  "assessment_focus": ["thing to test 1", "thing to test 2"]
}

Return ONLY valid JSON. Do not include explanation or markdown.
`;

  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    const analysisData = parseJsonResponse(rawText);

    console.log(`[Content Analysis] Extracted ${analysisData.key_concepts?.length || 0} lesson concepts.`);
    return analysisData;
  } catch (error) {
    console.error('[Content Analysis] Gemini analysis failed:', error.message);
    return {
      key_concepts: [lessonTitle, subject, 'Core lesson takeaway'],
      subject_area: subject,
      technical_vocabulary: ['Key term', 'Workflow', 'Best practice'],
      examples_or_demos: ['Lesson demonstration', 'Practical example'],
      practical_steps: ['Review the lesson', 'Apply the example', 'Check understanding'],
      learning_objectives: ['Understand the main concept', 'Apply the lesson in a realistic scenario'],
      common_student_pitfalls: ['Skipping fundamentals', 'Confusing related terms'],
      assessment_focus: ['Concept understanding', 'Practical application'],
    };
  }
};
