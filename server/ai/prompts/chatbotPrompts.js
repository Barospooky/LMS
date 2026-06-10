/**
 * AI Service - Chatbot Prompts
 */

const LMS_KNOWLEDGE_BASE = `
Amplepro Academy LMS support knowledge:

Available demo courses:
- Full Stack Web Development: development course covering HTML, CSS, JavaScript, React, Node.js, Express, PostgreSQL, auth, payments, final project, and certificate.
- Introduction to Data Science: beginner data science course covering Python, datasets, cleaning, visualization, machine learning basics, final quiz, and certificate.
- Modern Digital Marketing: marketing course covering digital strategy, SEO, social media, paid ads, analytics, email marketing, campaign project, and certificate.
- Music Performance Foundations: music course covering pitch control, rhythm, ear training, vocal warmups, breath control, final performance, and certificate.

How learners use the LMS:
1. Sign up or sign in.
2. Browse courses from the dashboard or course catalog.
3. Open a course and click Purchase Course if it is paid.
4. Complete lessons in order.
5. Watch each lesson video fully.
6. Complete the lesson quiz or assessment.
7. Use Resources for PDFs, checklists, sample files, and templates.
8. Use Discussions to ask course or lesson doubts.
9. Complete all lessons and pass required assessments.
10. Receive/generate a certificate after eligibility is met.

Certificate rules:
- The learner must have access to the course.
- Every lesson video must be completed.
- Every lesson assessment/quiz must be passed.
- The certificate is issued after course completion requirements are satisfied.
- The certificate can be used as proof of completion.

Payment:
- Paid courses use Razorpay test/live checkout depending on server keys.
- After successful payment verification, the course is unlocked for the student.

Quiz and AI:
- Quizzes are tied to lesson content.
- If AI quiz generation is enabled and Gemini quota is available, the LMS generates quiz questions from lesson transcript/content study guide.
- If AI is unavailable, the LMS uses stored or offline fallback quiz questions.

Admin/instructor:
- Admins can create/edit courses.
- Admins can add lessons using YouTube links or uploaded PC videos.
- Admins can add transcripts/content study guides to improve AI quiz generation.
- Admins can upload thumbnails and manage users.
`;

export const buildChatbotPrompt = ({ history, message }) => {
  const historyText = history && history.length > 0
    ? history.map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
    : 'No previous history.';

  return `
You are the Amplepro Academy LMS Assistant.
Your job is to answer student, instructor, and client-demo questions about the LMS clearly and formally.

Use this LMS knowledge base as the source of truth:
${LMS_KNOWLEDGE_BASE}

Behavior rules:
- Answer questions about available courses, purchase flow, lesson flow, quizzes, resources, discussions, certificates, login, and admin course setup.
- Keep answers concise, helpful, and step-by-step when explaining procedures.
- If asked what courses are available, list the four demo courses.
- If asked how to get a certificate, explain the completion and quiz requirements.
- If asked about AI quizzes, explain transcript/content-study-guide based generation and fallback behavior.
- If the question is outside the LMS, gently redirect to LMS/course support.
- Do not invent features that are not listed in the knowledge base.

Previous conversation:
${historyText}

User question:
"${message}"

Return only the direct response text. Do not wrap it in code blocks.
`.trim();
};

export const getLocalChatbotReply = (message = '') => {
  const text = message.toLowerCase();

  if (text.includes('course') || text.includes('available') || text.includes('what are')) {
    return `The available demo courses are:\n\n1. Full Stack Web Development\n2. Introduction to Data Science\n3. Modern Digital Marketing\n4. Music Performance Foundations\n\nYou can open a course from the dashboard or course catalog, review the syllabus, purchase if required, and then start the lessons.`;
  }

  if (text.includes('certificate') || text.includes('certification')) {
    return `To get a certificate:\n\n1. Sign in to your account.\n2. Purchase or unlock the course.\n3. Complete every lesson video.\n4. Pass each lesson quiz or assessment.\n5. Once all requirements are completed, the LMS issues the course completion certificate.\n\nThe certificate works as proof that you completed the course successfully.`;
  }

  if (text.includes('purchase') || text.includes('payment') || text.includes('razorpay') || text.includes('buy')) {
    return `To purchase a course:\n\n1. Sign in to your account.\n2. Open the course details page.\n3. Click Purchase Course.\n4. Complete the Razorpay checkout.\n5. After successful payment verification, the course is unlocked automatically.`;
  }

  if (text.includes('quiz') || text.includes('assessment') || text.includes('ai')) {
    return `Quizzes are connected to each lesson. After watching the lesson video, the quiz becomes available.\n\nIf AI quiz generation is enabled and Gemini quota is available, the LMS generates questions from the lesson transcript or content study guide. If AI is unavailable, the LMS uses stored fallback questions so learners can continue without interruption.`;
  }

  if (text.includes('resource') || text.includes('pdf') || text.includes('download')) {
    return `Resources are supporting materials attached to courses or lessons. They can include PDFs, checklists, templates, sample datasets, or external links. Open the course Resources section to view or download them.`;
  }

  if (text.includes('discussion') || text.includes('doubt') || text.includes('question') || text.includes('ask')) {
    return `For doubts, use the course Discussion section. You can post a lesson-specific question, reply to existing threads, and instructors/admins can mark helpful replies as answered.`;
  }

  if (text.includes('video') || text.includes('youtube') || text.includes('upload')) {
    return `Lessons can use either YouTube links or uploaded PC videos. Admins add these from the Course Manager. Students can play the lesson video in the course player, and completion unlocks the related quiz.`;
  }

  if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
    return `Hello! I can help you with Amplepro Academy courses, purchases, quizzes, resources, discussions, and certificates. What would you like to know?`;
  }

  return `I can help with Amplepro Academy LMS questions such as:\n\n- What courses are available\n- How to purchase a course\n- How lesson videos and quizzes work\n- How to get a certificate\n- Where to find resources\n- How to ask doubts in discussions\n\nPlease ask about any of these, and I will guide you step by step.`;
};
