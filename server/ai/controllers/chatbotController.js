/**
 * AI Controller - Chatbot
 * Handles: POST /api/ai/chatbot
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { buildChatbotPrompt, getLocalChatbotReply } from '../prompts/chatbotPrompts.js';
import { successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

export const chatWithBot = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Message is required.'));
    }

    console.log(`[AI Chatbot] ${traceId} - user message="${message.slice(0, 80)}..."`);

    const prompt = buildChatbotPrompt({ history, message });
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    return res.status(200).json(successResponse({
      reply: rawText,
      traceId,
    }, 'Chat generated successfully.'));
  } catch (err) {
    console.warn(`[AI Chatbot] ${traceId} - using local LMS fallback:`, err.message);

    const localReply = getLocalChatbotReply(req.body?.message || '');

    return res.status(200).json(successResponse({
      reply: localReply,
      traceId,
      fallbackActive: true,
    }, 'LMS assistant fallback response generated successfully.'));
  }
};
