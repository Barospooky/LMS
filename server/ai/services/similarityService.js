/**
 * AI Service — Semantic Similarity Engine
 * Path: server/ai/services/similarityService.js
 *
 * Implements industry-grade vector embeddings check using Gemini text-embedding-004.
 * Automatically computes Cosine Similarity to prevent duplicate or semantically similar questions.
 */

import genAI from '../config/geminiClient.js';

/**
 * Generate vector embedding for a given text.
 * @param {string} text 
 * @returns {Promise<number[]>} - 768-dimension vector array.
 */
export const getEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('[Similarity Service] Error generating embedding:', error.message);
    // Return empty vector or fallback
    return null;
  }
};

/**
 * Compute Cosine Similarity between two vectors.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} - Similarity score between -1 and 1.
 */
export const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Check if a new question is a semantic duplicate of any existing question.
 * @param {string} newQuestion 
 * @param {string[]} existingQuestions 
 * @param {number} threshold - Similarity cutoff (default 0.78 for music theory semantics).
 * @returns {Promise<{ isDuplicate: boolean, score: number, duplicateOf: string | null }>}
 */
export const checkSemanticDuplicate = async (newQuestion, existingQuestions, threshold = 0.78) => {
  if (!existingQuestions || existingQuestions.length === 0) {
    return { isDuplicate: false, score: 0, duplicateOf: null };
  }

  // 1. Quick String Edit Distance / Exact Match check
  const newClean = newQuestion.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  for (const eq of existingQuestions) {
    const eqClean = eq.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (newClean === eqClean || eqClean.includes(newClean) || newClean.includes(eqClean)) {
      console.log(`[Similarity Service] Exact match duplicate found for question: "${newQuestion.substring(0, 40)}..."`);
      return { isDuplicate: true, score: 1.0, duplicateOf: eq };
    }
  }

  // 2. High-Fidelity Vector Embedding check
  const newEmbed = await getEmbedding(newQuestion);
  if (!newEmbed) {
    // If embedding service is down, fallback to substring matches
    return { isDuplicate: false, score: 0, duplicateOf: null };
  }

  for (const eq of existingQuestions) {
    const eqEmbed = await getEmbedding(eq);
    if (!eqEmbed) continue;

    const similarity = calculateCosineSimilarity(newEmbed, eqEmbed);
    console.log(`[Similarity Service] Similarity check: "${newQuestion.substring(0, 30)}..." vs "${eq.substring(0, 30)}..." => Score: ${similarity.toFixed(4)}`);

    if (similarity >= threshold) {
      console.log(`[Similarity Service] Semantic duplicate rejected! Score: ${similarity.toFixed(4)} >= Threshold: ${threshold}`);
      return { isDuplicate: true, score: similarity, duplicateOf: eq };
    }
  }

  return { isDuplicate: false, score: 0, duplicateOf: null };
};
