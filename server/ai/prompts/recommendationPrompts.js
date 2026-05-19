/**
 * AI Service — Recommendation Prompt Handler
 * Builds the Gemini prompt for the AI Recommendation Engine.
 */

import { buildMusicLMSPreamble } from '../utils/promptUtils.js';

/**
 * Build the personalised recommendation prompt from student performance data.
 */
export const buildRecommendationPrompt = ({ studentName, performanceData, availableModules }) => {
  const {
    quizScores        = [],
    voiceAccuracy     = [],
    completedLessons  = [],
    weakTopics        = [],
    strongTopics      = [],
    practiceStreak    = 0,
    totalLessons      = 0,
    currentLesson     = '',
    instrument        = '',
    tradition         = '',
  } = performanceData;

  const avgQuizScore = quizScores.length
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
    : 0;

  const avgVoiceAccuracy = voiceAccuracy.length
    ? Math.round(voiceAccuracy.reduce((a, b) => a + b, 0) / voiceAccuracy.length)
    : 0;

  return `
${buildMusicLMSPreamble({ instrument, tradition })}

You are an adaptive learning engine. Analyse the student's performance data below and generate
personalised, actionable recommendations to improve their music learning journey.

Student Name    : "${studentName || 'Student'}"
Instrument      : "${instrument || 'General Music'}"
Tradition       : "${tradition || 'General'}"
Current Lesson  : "${currentLesson}"
Practice Streak : ${practiceStreak} consecutive days

Performance Summary:
- Completed Lessons : ${completedLessons.length} / ${totalLessons}
- Average Quiz Score: ${avgQuizScore}%
- Voice/Pitch Accuracy: ${avgVoiceAccuracy}%
- Weak Topic Areas  : ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None identified yet'}
- Strong Topic Areas: ${strongTopics.length > 0 ? strongTopics.join(', ') : 'None identified yet'}
- Individual Quiz Scores (recent): [${quizScores.slice(-5).join(', ')}]
- Individual Voice Scores (recent): [${voiceAccuracy.slice(-5).join(', ')}]

Available Next Modules:
${availableModules && availableModules.length > 0
  ? availableModules.map((m, i) => `  ${i + 1}. "${m.title}" (${m.difficulty || 'unknown'} difficulty)`).join('\n')
  : '  (No additional modules data provided)'}

Based on this data, generate personalised recommendations. Be specific, encouraging, and practical.

Return ONLY this exact JSON structure:
{
  "studentName": "${studentName || 'Student'}",
  "analysisDate": "<ISO timestamp>",
  "overallPerformanceLevel": "<beginner | developing | intermediate | advanced>",
  "strengthSummary": "<1-2 sentences on what the student is doing well>",
  "improvementSummary": "<1-2 sentences on the main areas needing work>",
  "nextModuleRecommendation": {
    "title": "<recommended next module title>",
    "reason": "<why this module is recommended>",
    "estimatedReadiness": "<percentage ready for this module>"
  },
  "practiceExercises": [
    {
      "area": "<weak topic area>",
      "exercise": "<specific exercise description>",
      "duration": "<suggested daily practice duration>",
      "priority": "<high | medium | low>"
    }
  ],
  "weakAreaImprovements": [
    {
      "topic": "<weak topic>",
      "currentLevel": "<estimated current level>",
      "targetLevel": "<target level>",
      "actionPlan": "<specific action steps>"
    }
  ],
  "revisionSuggestions": [
    "<specific lesson or topic to revise>"
  ],
  "motivationalMessage": "<short, personalised, encouraging message for the student>",
  "weeklyGoals": [
    "<achievable goal 1>",
    "<achievable goal 2>",
    "<achievable goal 3>"
  ],
  "consistencyScore": {
    "score": <0-100>,
    "feedback": "<feedback on their practice consistency>"
  }
}
`.trim();
};
