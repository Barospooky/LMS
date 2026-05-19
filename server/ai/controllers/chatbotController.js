/**
 * AI Controller — Chatbot
 * Handles: POST /api/ai/chatbot
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { buildChatbotPrompt } from '../prompts/chatbotPrompts.js';
import { successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

export const chatWithBot = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Message is required.'));
    }

    console.log(`[AI Chatbot] ${traceId} — user message="${message.slice(0, 80)}..."`);

    const prompt = buildChatbotPrompt({ history, message });

    // Call cloud Gemini Model (lightning-fast, zero-setup, reliable)
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    return res.status(200).json(successResponse({
      reply: rawText,
      traceId
    }, 'Chat generated successfully.'));

  } catch (err) {
    console.error(`[AI Chatbot] ${traceId} — Gemini API Error:`, err.message);

    // Serve a premium local expert response fallback if Gemini is rate-limited or offline
    const { message } = req.body;
    const lowerMessage = (message || "").toLowerCase();
    let localReply = "";

    if (lowerMessage.includes('roadmap') || lowerMessage.includes('learn') || lowerMessage.includes('path') || lowerMessage.includes('stage')) {
      localReply = `Here is your customized **Music Learning Roadmap**:\n\n` +
        `1. **Stage 1: Sound Production & Posture (Weeks 1-4)**\n` +
        `   - Learn correct instrument holding posture to avoid fatigue.\n` +
        `   - Focus on drawing clean bow strokes (violin) or standard piano keystrokes.\n` +
        `2. **Stage 2: Basic Scales & Note Names (Weeks 5-8)**\n` +
        `   - Memorize basic natural notes (e.g. A, B, C, D, E, F, G).\n` +
        `   - Practice the G Major and C Major scales steadily.\n` +
        `3. **Stage 3: Melody & Rhythm Coordination (Weeks 9-12)**\n` +
        `   - Start playing simple classical melodies or standard Carnatic swara patterns.\n` +
        `   - Practice with a metronome at a slow, comfortable tempo.\n\n` +
        `*💡 Practice Tip: Short, focused sessions of 20 minutes daily are far more effective than long occasional sessions!*`;
    } else if (lowerMessage.includes('tune') || lowerMessage.includes('tuning')) {
      localReply = `Tuning your instrument correctly is essential before every session!\n\n` +
        `- **Violin Tuning:** Standard strings are tuned to **G3 - D4 - A4 - E5** (from thickest to thinnest).\n` +
        `- **Guitar Tuning:** Standard strings are **E2 - A2 - D3 - G3 - B3 - E4**.\n` +
        `- **Tuning Secret:** Always turn the peg/key slightly flat first, then tune *upwards* into the pitch. This prevents the string from slipping out of tune while playing.`;
    } else if (lowerMessage.includes('violin') || lowerMessage.includes('bow')) {
      localReply = `Here are key **Violin Mastery Tips**:\n\n` +
        `- **Bow Grip:** Keep your right thumb slightly curved near the frog. Your fingers should rest relaxed over the stick.\n` +
        `- **Straight Bowing:** Play looking into a mirror. The bow must stay perfectly parallel to the bridge for a pure tone.\n` +
        `- **Relax Your Grip:** Do not clamp down with your left-hand thumb on the neck. Keep it loose so you can slide smoothly between notes.`;
    } else if (lowerMessage.includes('swara') || lowerMessage.includes('carnatic') || lowerMessage.includes('sa ri') || lowerMessage.includes('sargam')) {
      localReply = `In **Carnatic Music Theory**, the seven fundamental swaras (notes) are:\n\n` +
        `1. **Sa** (Shadjama) - The tonic root tone.\n` +
        `2. **Ri** (Rishabha)\n` +
        `3. **Ga** (Gandhara)\n` +
        `4. **Ma** (Madhyama)\n` +
        `5. **Pa** (Panchama)\n` +
        `6. **Dha** (Dhaivata)\n` +
        `7. **Ni** (Nishada)\n\n` +
        `These notes are the structural foundation of all ragas and align directly with Western musical solfege (Do-Re-Mi-Fa-Sol-La-Ti)!`;
    } else if (lowerMessage.includes('practice') || lowerMessage.includes('tip') || lowerMessage.includes('improve') || lowerMessage.includes('daily')) {
      localReply = `To make your practice sessions 2x more effective, try the **20-20-20 Structure**:\n\n` +
        `1. **First 20 Mins (Warmup):** Play long bow strokes, loose key runs, or steady scale exercises.\n` +
        `2. **Second 20 Mins (Core Work):** Focus on the active module's video lessons and pitch-check exercises.\n` +
        `3. **Last 20 Mins (Fun Repertoire):** Play a song you love or improvise freely to build creative musical expression.\n\n` +
        `*Consistently practicing a little bit every day builds permanent muscle memory!*`;
    } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey') || lowerMessage.includes('vanakkam')) {
      localReply = `Hello! I am your AI Music Assistant. 🎵\n\nI can help you with:\n- **Instrument practice tips (Violin, Guitar, Piano, Flute)**\n- **Correct tuning guides**\n- **Custom learning roadmaps**\n- **Carnatic swaras and music scale theory**\n\nWhat are you working on today?`;
    } else {
      localReply = `That is a great musical question! Here are standard rules to keep in mind:\n\n` +
        `- Ensure you are keeping your wrists and shoulders completely relaxed while playing.\n` +
        `- Use the **LMS Voice Analyzer** to test your pitch accuracy on scale exercises.\n` +
        `- Keep practicing the specific tutorial videos in your course syllabus.\n\n` +
        `Feel free to ask me details about tuning, scale theories, custom roadmaps, or finger placements!`;
    }

    return res.status(200).json(successResponse({
      reply: localReply,
      traceId,
      fallbackActive: true
    }, 'Music Assistant fallback response generated successfully.'));
  }
};

