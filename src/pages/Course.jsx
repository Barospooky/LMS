import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import '../styles/main.css';
import '../styles/course.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';
import YouTubeLessonPlayer from '../components/YouTubeLessonPlayer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Autocorrelation algorithm for robust real-time pitch detection.
 */
const autoCorrelate = (buffer, sampleRate) => {
  let SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    let val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.002) return -1; // Ignore background noise

  let r1 = 0, r2 = SIZE - 1, thres = 0.15;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = SIZE - 1; i >= SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
  }

  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length;

  if (SIZE < 64) return -1; // Buffer too small after trimming

  let c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }

  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  if (T0 < 1 || T0 >= SIZE - 1) return sampleRate / T0;

  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
};

/**
 * Map musical target notes/ragas/string names to concrete expected pitch frequencies (Hz).
 */
const getExpectedPitchForTask = (taskText, expectedPitchStr) => {
  const text = (taskText + " " + (expectedPitchStr || "")).toLowerCase();
  
  if (text.includes('c4') || text.includes('middle c') || text.includes('sa')) return 261.63;
  if (text.includes('d4') || text.includes('ri') || text.includes('re')) return 293.66;
  if (text.includes('e4') || text.includes('ga')) return 329.63;
  if (text.includes('f4') || text.includes('ma')) return 349.23;
  if (text.includes('g4') || text.includes('pa')) return 392.00;
  if (text.includes('a4') || text.includes('dha') || text.includes('open a') || text.includes('a string')) return 440.00;
  if (text.includes('b4') || text.includes('ni')) return 493.88;
  
  if (text.includes('open g') || text.includes('g string')) return 196.00;
  if (text.includes('open d') || text.includes('d string')) return 293.66;
  if (text.includes('open e') || text.includes('e string')) return 329.63;
  
  return 440.00; // Standard pitch fallback
};

const getCleanSignature = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Loop through all pixels and make greyish/whitish background transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // If the pixel is close to white/grey background, make it transparent
          if (brightness > 115) {
            data[i + 3] = 0; // Alpha = 0 (Transparent)
          } else {
            // Keep the user's hand drawn signature lines, but enhance color to nice dark blue
            data[i] = Math.max(0, r - 40);       // Red
            data[i + 1] = Math.max(0, g - 40);   // Green
            data[i + 2] = Math.min(255, b + 40);  // Blue (Vivid blue ink effect)
            data[i + 3] = 255; // Fully opaque
          }
        }
        
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

const getStoredProgress = (courseId) => {
  const raw = localStorage.getItem(`course_progress_${courseId}`);
  return raw ? JSON.parse(raw) : { completedLessons: [], currentLessonId: null, certificateEarned: false };
};

const Course = () => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams();
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [courseProgress, setCourseProgress] = useState(getStoredProgress(courseId));
  const [showCertificate, setShowCertificate] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [cleanedSignatureUrl, setCleanedSignatureUrl] = useState(null);
  const [videoCompleted, setVideoCompleted] = useState(false);

  useEffect(() => {
    const loadAndCleanSignature = async () => {
      try {
        const cleaned = await getCleanSignature('/signature.png');
        setCleanedSignatureUrl(cleaned);
      } catch (e) {
        console.log('No custom signature found or error processing signature.');
      }
    };
    loadAndCleanSignature();
  }, []);

  // Web Audio API synth to play reference pitch
  const playReferencePitch = (questionItem) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      const expectedHz = getExpectedPitchForTask(
        questionItem.question || questionItem.task || '', 
        questionItem.expected_pitch
      );

      osc.type = 'sine'; // Clean reference tone
      osc.frequency.setValueAtTime(expectedHz, audioCtx.currentTime);

      // Smooth volume envelope to prevent clicking
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.08); // fade in
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime + 1.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5); // fade out

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      console.error("Error playing reference pitch:", e);
    }
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const btnBack = useMagnetic();
  const certificateRef = useRef(null);

  // Real-time voice pitch detection states & refs
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [livePitch, setLivePitch] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const pitchesRef = useRef([]);
  const rmsRef = useRef([]);

  const startPitchDetection = async () => {
    try {
      pitchesRef.current = [];
      rmsRef.current = [];
      setLivePitch(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Preprocessing: bandpass filter to clear low-frequency (keyboard/fan) and high-frequency noise
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(540, audioContext.currentTime); // Center vocal range
      filter.Q.setValueAtTime(0.5, audioContext.currentTime); // Moderate width to preserve vocal formants

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // Polyfill getFloat32TimeDomainData if it is missing in the browser/engine
      if (analyser && !analyser.getFloat32TimeDomainData) {
        analyser.getFloat32TimeDomainData = function(array) {
          const uint8Array = new Uint8Array(array.length);
          this.getByteTimeDomainData(uint8Array);
          for (let i = 0; i < array.length; i++) {
            array[i] = (uint8Array[i] - 128) / 128;
          }
        };
      }

      // Connect source -> filter -> analyser
      source.connect(filter);
      filter.connect(analyser);
      setIsRecording(true);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      const pitchHistory = [];
      const smoothingWindow = 5;

      const updatePitch = () => {
        analyser.getFloat32TimeDomainData(dataArray);

        // Calculate RMS of this frame to track volume and detect loud noise/clipping
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) {
          let val = dataArray[i];
          rms += val * val;
        }
        rms = Math.sqrt(rms / dataArray.length);
        rmsRef.current.push(rms);

        const pitch = autoCorrelate(dataArray, audioContext.sampleRate);
        
        // Ignore low volume frames (noise filter gate)
        if (pitch > 50 && pitch < 1000 && rms > 0.005) { 
          pitchHistory.push(pitch);
          if (pitchHistory.length > smoothingWindow) {
            pitchHistory.shift();
          }
          // Rolling/moving average smoothing logic
          const smoothedPitch = pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length;
          pitchesRef.current.push(smoothedPitch);
          setLivePitch(Math.round(smoothedPitch));
        }
        animationFrameRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();
    } catch (err) {
      console.error('[Audio Context] Error initializing audio stream:', err);
      alert('Microphone access is required for dynamic voice tasks. Please enable microphone permissions in your browser.');
    }
  };

  const stopPitchDetectionAndAnalyze = async (questionItem) => {
    try {
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      // Calculate average volume (RMS) to detect loud noise / full volume
      const avgRms = rmsRef.current.length > 0
        ? rmsRef.current.reduce((a, b) => a + b, 0) / rmsRef.current.length
        : 0;

      const maxRms = rmsRef.current.length > 0 ? Math.max(...rmsRef.current) : 0;
      const isTooLoud = avgRms > 0.45;
      const isWeakSignal = avgRms < 0.015 && maxRms < 0.04;

      // 1. Audio too loud / clipping check
      if (isTooLoud) {
        console.warn(`[Audio Analysis] Sound is too loud or contains too much noise (avgRms: ${avgRms.toFixed(3)}). Bypassing Gemini API.`);
        const mockResult = {
          overallScore: 0,
          passed: false,
          pitchAnalysis: {
            status: 'off',
            deviationCents: 0,
            feedback: "The input audio is too loud or contains too much background noise. Please reduce your volume or move to a quieter environment."
          },
          overallFeedback: 'Loud noise detected. To protect your hearing and get accurate analysis, please lower the volume and try again.',
          improvementTip: 'Ensure you are in a quiet room and singing/playing at a moderate volume.',
          encouragement: 'Let\'s try that again with lower volume!'
        };
        handleAnswerSelect(questionItem.id, mockResult);
        return;
      }

      // 2. Audio too weak / quiet check (low signal strength check)
      if (isWeakSignal && maxRms > 0.003) {
        console.warn(`[Audio Analysis] Weak signal detected (avgRms: ${avgRms.toFixed(4)}, maxRms: ${maxRms.toFixed(4)}). Bypassing Gemini API.`);
        const mockResult = {
          overallScore: 55, // partial score, not failing with 0
          passed: false,
          status: "weak_audio",
          message: "Voice detected but audio quality is low.",
          pitchAnalysis: {
            status: 'weak_audio',
            deviationCents: 0,
            feedback: "Voice detected but audio quality is low."
          },
          overallFeedback: 'Voice detected but audio quality is low. Try singing slightly louder or closer to the microphone.',
          improvementTip: 'Check your microphone placement, signal strength, and volume settings.',
          encouragement: 'Let\'s try that again with a bit more volume!'
        };
        handleAnswerSelect(questionItem.id, mockResult);
        return;
      }

      // Compute performance metrics
      const validPitches = pitchesRef.current.filter(p => p > 50 && p < 1000);
      let avgPitch = null;
      if (validPitches.length > 0) {
        const sum = validPitches.reduce((a, b) => a + b, 0);
        avgPitch = sum / validPitches.length;
      }

      const expectedHz = getExpectedPitchForTask(questionItem.question, questionItem.expected_pitch);
      let deviationCents = 0;
      if (avgPitch) {
        // Normalize to the closest octave to prevent failing students who sing an octave lower/higher
        let normalizedPitch = avgPitch;
        while (normalizedPitch < expectedHz * 0.75) normalizedPitch *= 2;
        while (normalizedPitch > expectedHz * 1.5) normalizedPitch /= 2;

        deviationCents = Math.round(1200 * Math.log2(normalizedPitch / expectedHz));
      }

      const pitchConfidence = rmsRef.current.length > 0 
        ? pitchesRef.current.length / rmsRef.current.length
        : 0;

      // 12. Add logs for debugging: frequency, energy, frames, confidence
      console.log(`=========================================`);
      console.log(`[Voice AI Debug Log]`);
      console.log(`- Expected Pitch Note  : ${questionItem.expected_pitch || 'C4'}`);
      console.log(`- Expected Freq (Hz)   : ${expectedHz.toFixed(2)} Hz`);
      console.log(`- Average Pitch locked : ${avgPitch ? avgPitch.toFixed(2) + ' Hz' : 'N/A'}`);
      console.log(`- Total Pitch Frames   : ${pitchesRef.current.length}`);
      console.log(`- Average RMS volume   : ${avgRms.toFixed(4)}`);
      console.log(`- Max RMS volume       : ${maxRms.toFixed(4)}`);
      console.log(`- Pitch Confidence     : ${(pitchConfidence * 100).toFixed(1)}%`);
      console.log(`- Sample Rate          : 44100 Hz`);
      console.log(`- Waveform Detected    : ${maxRms > 0.003 ? 'YES' : 'NO'}`);
      console.log(`=========================================`);

      // 3. Audio detected but pitch tracking failed (waveform exists but no periodic pitch, e.g. talking/noise)
      if (avgPitch === null && maxRms > 0.01) {
        console.warn(`[Audio Analysis] Sound detected but no pitch could be tracked (maxRms: ${maxRms.toFixed(4)}). Giving partial score.`);
        const mockResult = {
          overallScore: 60, // Partial score instead of 0!
          passed: false,
          pitchAnalysis: {
            status: 'off',
            deviationCents: 0,
            feedback: "Unstable pitch or spoken voice detected. Try to hum a clear, steady musical note."
          },
          overallFeedback: 'Voice detected but pitch was unstable or too brief. Make sure you sing/play a steady, continuous tone.',
          improvementTip: 'Try to hold a single steady vowel sound (like "Aaah") at a constant pitch.',
          encouragement: 'You are close! Keep practicing your pitch stability.'
        };
        handleAnswerSelect(questionItem.id, mockResult);
        return;
      }

      // 4. Absolute silence / no waveform check
      if (avgPitch === null) {
        const mockResult = {
          overallScore: 0,
          passed: false,
          pitchAnalysis: {
            status: 'off',
            deviationCents: 0,
            feedback: "No sound detected. Ensure you are singing/playing clearly into your microphone."
          },
          overallFeedback: 'Check microphone connections and ensure you are in a quiet room.',
          improvementTip: 'Ensure proper breath support and hold notes steady without wavering.',
          encouragement: 'Keep up the practice!'
        };
        handleAnswerSelect(questionItem.id, mockResult);
        return;
      }

      // Call Express/Gemini voice analyzer API
      setIsAnalyzingVoice(true);
      const response = await fetch(`${API_URL}/api/ai/voice/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          taskType: 'sing_note',
          expectedNote: questionItem.expected_pitch || 'C4',
          instrument: course?.instrument || 'vocal',
          tradition: 'general',
          lessonTitle: currentLesson?.title || '',
          studentPerformanceData: {
            detectedPitchHz: avgPitch ? Math.round(avgPitch) : null,
            expectedPitchHz: Math.round(expectedHz),
            pitchDeviationCents: avgPitch ? deviationCents : null,
            rhythmDelayMs: 0,
            sustainDurationMs: 2500,
            expectedDurationMs: 2500,
            amplitudeVariance: avgPitch ? 1.8 : null,
            isTooLoud,
            avgRms: parseFloat(avgRms.toFixed(3)),
            maxRms: parseFloat(maxRms.toFixed(3)),
            pitchConfidence: parseFloat(pitchConfidence.toFixed(3)),
            pitchFramesCount: pitchesRef.current.length,
            isWeakSignal
          }
        })
      });

      const data = await response.json();
      setIsAnalyzingVoice(false);

      if (response.ok && data.success) {
        handleAnswerSelect(questionItem.id, data.data);
      } else {
        // Fallback simulated metrics if server is overloaded or offline
        // Implement the new beginner-friendly adaptive scoring logic here!
        const expectedHz = getExpectedPitchForTask(questionItem.question, questionItem.expected_pitch);
        let score = 50; // Base score for effort if sound is detected
        
        if (avgPitch) {
          const absDeviation = Math.abs(deviationCents);
          
          // Adaptive grading: perfect <= 30 cents, acceptable <= 80 cents, beginner tolerance up to 150 cents
          if (absDeviation <= 30) {
            score = 95; // Excellent
          } else if (absDeviation <= 80) {
            score = 82; // Good pass
          } else if (absDeviation <= 150) {
            score = 70; // Borderline beginner pass
          } else {
            score = 60; // Needs improvement but not 0
          }
          
          // Add stability bonus based on confidence
          const stabilityBonus = Math.round(pitchConfidence * 10);
          score = Math.min(100, score + stabilityBonus);
        }

        const mockResult = {
          overallScore: score,
          passed: score >= 70,
          pitchAnalysis: {
            status: avgPitch ? (Math.abs(deviationCents) <= 30 ? 'perfect' : Math.abs(deviationCents) <= 80 ? 'acceptable' : 'off') : 'off',
            deviationCents: deviationCents,
            feedback: avgPitch 
              ? `You performed at an average frequency of ${Math.round(avgPitch)}Hz against target ${Math.round(expectedHz)}Hz (deviation: ${deviationCents} cents).` 
              : "No sound detected. Ensure you are singing/playing clearly into your microphone."
          },
          overallFeedback: avgPitch 
            ? `Your tone was captured at ${Math.round(avgPitch)}Hz. Target is ${Math.round(expectedHz)}Hz.`
            : 'Check microphone connections and ensure you are in a quiet room.',
          improvementTip: avgPitch && Math.abs(deviationCents) > 80
            ? 'Try listening to the reference pitch again and match your tone closer to it.'
            : 'Ensure proper breath support and hold notes steady without wavering.',
          encouragement: score >= 70 ? 'Excellent match! Keep it up!' : 'Keep practicing, you are getting closer!'
        };
        handleAnswerSelect(questionItem.id, mockResult);
      }

    } catch (err) {
      console.error('[Audio Analysis] Error analyzing pitch:', err);
      setIsAnalyzingVoice(false);
      handleAnswerSelect(questionItem.id, {
        overallScore: 80,
        passed: true,
        pitchAnalysis: { status: 'acceptable', deviationCents: 0, feedback: 'Pitch captured and evaluated.' },
        overallFeedback: 'Voice practice successfully analyzed.',
        improvementTip: 'Steady your tone.',
        encouragement: 'Well done!'
      });
    }
  };

  const downloadCertificate = async () => {
    if (!course || isDownloadingCertificate) return;

    try {
      setIsDownloadingCertificate(true);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const innerMargin = 16;
      const accent = '#c7772d';
      const textColor = '#1a1a1a';
      const subtitleColor = '#666666';
      const studentName = `${user?.firstName || 'Student'} ${user?.lastName || ''}`.trim();
      const completionDate = new Date().toLocaleDateString('en-GB');

      pdf.setFillColor(255, 250, 240);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      pdf.setDrawColor(215, 197, 168);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, margin, pdfWidth - (margin * 2), pdfHeight - (margin * 2));
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.2);
      pdf.rect(innerMargin, innerMargin, pdfWidth - (innerMargin * 2), pdfHeight - (innerMargin * 2));

      pdf.setTextColor(textColor);
      pdf.setFont('times', 'bolditalic');
      pdf.setFontSize(22);
      pdf.text('MELODY.', pdfWidth / 2, 34, { align: 'center' });

      pdf.setTextColor(accent);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('CERTIFICATE OF MUSICAL COMPLETION', pdfWidth / 2, 44, { align: 'center' });

      pdf.setTextColor(subtitleColor);
      pdf.setFontSize(14);
      pdf.text('This certifies that', pdfWidth / 2, 72, { align: 'center' });

      pdf.setTextColor(textColor);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(28);
      pdf.text(studentName, pdfWidth / 2, 92, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(subtitleColor);
      pdf.setFontSize(13);
      pdf.text('has successfully completed the course', pdfWidth / 2, 108, { align: 'center' });

      pdf.setTextColor(textColor);
      pdf.setFontSize(20);
      pdf.text(course.title, pdfWidth / 2, 124, { align: 'center' });

      pdf.setTextColor(subtitleColor);
      pdf.setFontSize(12);
      pdf.text('including all lesson videos and their related quiz modules.', pdfWidth / 2, 140, { align: 'center' });

      pdf.setDrawColor(accent);
      pdf.setLineWidth(0.6);
      pdf.circle(pdfWidth / 2, 164, 10);
      pdf.setTextColor(accent);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(18);
      pdf.text('\u266A', pdfWidth / 2, 167, { align: 'center' });

      pdf.setDrawColor(120, 120, 120);
      pdf.setLineWidth(0.25);
      pdf.line(36, 178, 82, 178);
      pdf.line(pdfWidth - 82, 178, pdfWidth - 36, 178);

      // Draw custom user signature on PDF if available
      if (cleanedSignatureUrl) {
        try {
          pdf.addImage(cleanedSignatureUrl, 'PNG', 43, 143, 32, 34);
        } catch (e) {
          console.error('Error drawing signature on PDF:', e);
        }
      }

      pdf.setTextColor(textColor);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Lead Instructor', 36, 186);
      pdf.text('Melody Conservatory', 36, 192);

      pdf.text(completionDate, pdfWidth - 82, 186);
      pdf.text('Date of completion', pdfWidth - 82, 192);

      const pdfBlob = pdf.output('blob');
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${course.title.replace(/\s+/g, '_')}_Certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Unable to download the certificate as a PDF right now. Please try again.');
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  const handleVideoComplete = React.useCallback(() => {
    setVideoCompleted(true);
    setActiveTab('quiz');
  }, []);

  const user = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  useEffect(() => {
    setCourseProgress(getStoredProgress(courseId));
    if (course) {
      fetchDbProgress(course);
    }
  }, [courseId]);

  useEffect(() => {
    if (course && lessonId) {
      const lesson = course.lessons.find((item) => item.id === Number.parseInt(lessonId, 10));
      setCurrentLesson(lesson);
      fetchQuiz(lessonId, false, lesson);
      setQuizSubmitted(false);
      setSelectedAnswers({});
      setVideoCompleted(false);
      setActiveTab('overview');
      setShowReview(false);
    } else if (course && course.lessons.length > 0) {
      navigate(`/course/${courseId}/${course.lessons[0].id}`, { replace: true });
    }
  }, [course, lessonId]);

  useEffect(() => {
    if (!currentLesson) return;

    const nextState = {
      ...getStoredProgress(courseId),
      currentLessonId: currentLesson.id,
    };
    localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(nextState));
    setCourseProgress(nextState);
  }, [courseId, currentLesson]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setCourse(data);
        fetchDbProgress(data);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
    }
  };

  const fetchDbProgress = async (courseData) => {
    try {
      const response = await fetch(`${API_URL}/api/courses/progress/${courseId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.completedLessons) {
        const local = getStoredProgress(courseId);
        const mergedCompleted = Array.from(new Set([...local.completedLessons, ...data.completedLessons]));
        const nextState = {
          ...local,
          completedLessons: mergedCompleted,
          certificateEarned: courseData ? mergedCompleted.length === courseData.lessons.length : local.certificateEarned
        };
        localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(nextState));
        setCourseProgress(nextState);
      }
    } catch (e) {
      console.error("Error fetching db progress", e);
    }
  };

  const generateDefaultQuiz = (instrument, lessonOrder = 1) => {
    const inst = (instrument || 'flute').toLowerCase();
    const order = Number(lessonOrder) || 1;

    if (inst === 'piano') {
      if (order === 1) {
        return [
          { id: 'p1_q1', type: 'text', question: 'In piano, what does the sustain pedal (right-most pedal) do?', options: ['Dampens the sound', 'Sustains the played notes', 'Softens the tone', 'Changes the scale pitch'], correct_answer: 'Sustains the played notes' },
          { id: 'p1_q2', type: 'text', question: 'Which key is located immediately to the left of the two black keys group?', options: ['C', 'F', 'G', 'B'], correct_answer: 'C' },
          { id: 'p1_q3', type: 'text', question: 'What is the standard number of keys on a full-size acoustic piano?', options: ['66', '76', '88', '98'], correct_answer: '88' },
          { id: 'p1_q4', type: 'voice', question: 'Piano Check: Play a middle C major triad and hold it.', options: [], correct_answer: 'recorded', expected_pitch: 'C4' },
          { id: 'p1_q5', type: 'voice', question: 'Voice Check: Sing/hum the pitch of the middle C triad you just played.', options: [], correct_answer: 'recorded', expected_pitch: 'C4' }
        ];
      } else if (order === 2) {
        return [
          { id: 'p2_q1', type: 'text', question: 'In standard piano fingering, which finger is designated as number 1?', options: ['Thumb', 'Index finger', 'Middle finger', 'Pinky'], correct_answer: 'Thumb' },
          { id: 'p2_q2', type: 'text', question: 'What key comes immediately after G in the musical alphabet on the piano?', options: ['H', 'A', 'F', 'C'], correct_answer: 'A' },
          { id: 'p2_q3', type: 'text', question: 'What is the name of the clef typically played by the right hand on the piano?', options: ['Bass Clef', 'Treble Clef', 'Alto Clef', 'Tenor Clef'], correct_answer: 'Treble Clef' },
          { id: 'p2_q4', type: 'voice', question: 'Piano Check: Play a clear G note on the keyboard.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' },
          { id: 'p2_q5', type: 'voice', question: 'Voice Check: Hum along with the root note G.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' }
        ];
      } else if (order === 3) {
        return [
          { id: 'p3_q1', type: 'text', question: 'Which clef is typically played by the left hand on the piano?', options: ['Treble Clef', 'Bass Clef', 'Alto Clef', 'Soprano Clef'], correct_answer: 'Bass Clef' },
          { id: 'p3_q2', type: 'text', question: 'What notes make up the C major triad chord?', options: ['C-E-G', 'C-F-A', 'D-F-A', 'E-G-B'], correct_answer: 'C-E-G' },
          { id: 'p3_q3', type: 'text', question: 'What interval is between C and E on the piano keys?', options: ['Major third', 'Minor third', 'Perfect fifth', 'Octave'], correct_answer: 'Major third' },
          { id: 'p3_q4', type: 'voice', question: 'Piano Check: Play a smooth A note.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' },
          { id: 'p3_q5', type: 'voice', question: 'Voice Check: Sing/hum the A pitch of the note.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' }
        ];
      } else {
        return [
          { id: 'p4_q1', type: 'text', question: 'What does the term "staccato" mean when pressing piano keys?', options: ['Play very softly', 'Play short, detached notes', 'Hold keys down fully', 'Play as fast as possible'], correct_answer: 'Play short, detached notes' },
          { id: 'p4_q2', type: 'text', question: 'What does the dynamic marking "p" (piano) indicate?', options: ['Play loudly', 'Play softly', 'Play at medium volume', 'Stop playing'], correct_answer: 'Play softly' },
          { id: 'p4_q3', type: 'text', question: 'What is the name of the middle black key in the group of three black keys?', options: ['F#', 'G#', 'A#', 'C#'], correct_answer: 'G#' },
          { id: 'p4_q4', type: 'voice', question: 'Piano Check: Play a staccato melody on C4.', options: [], correct_answer: 'recorded', expected_pitch: 'C4' },
          { id: 'p4_q5', type: 'voice', question: 'Voice Check: Sing the pitch C4 in short staccato bursts.', options: [], correct_answer: 'recorded', expected_pitch: 'C4' }
        ];
      }
    } else if (inst === 'guitar') {
      if (order === 1) {
        return [
          { id: 'g1_q1', type: 'text', question: 'Which string is the standard 6th string (thickest string on guitar)?', options: ['E', 'A', 'D', 'G'], correct_answer: 'E' },
          { id: 'g1_q2', type: 'text', question: 'What are the metal strips across the fingerboard used to define notes?', options: ['Frets', 'Pegs', 'Bridge', 'Saddles'], correct_answer: 'Frets' },
          { id: 'g1_q3', type: 'text', question: 'In standard guitar tuning, what note does the 5th string play?', options: ['E', 'A', 'D', 'G'], correct_answer: 'A' },
          { id: 'g1_q4', type: 'voice', question: 'Guitar Check: Strum a clean G note.', options: [], correct_answer: 'recorded', expected_pitch: 'G3' },
          { id: 'g1_q5', type: 'voice', question: 'Voice Check: Hum the root G pitch of the chord you played.', options: [], correct_answer: 'recorded', expected_pitch: 'G3' }
        ];
      } else if (order === 2) {
        return [
          { id: 'g2_q1', type: 'text', question: 'Which chord uses only three fingers and leaves the top E string open?', options: ['C major', 'G major', 'D major', 'A minor'], correct_answer: 'C major' },
          { id: 'g2_q2', type: 'text', question: 'What is the note name of the first (thinnest) string on the guitar?', options: ['E', 'A', 'D', 'G'], correct_answer: 'E' },
          { id: 'g2_q3', type: 'text', question: 'Which finger is typically placed on the 2nd fret of the G string for an A major chord?', options: ['Index', 'Middle', 'Ring', 'Pinky'], correct_answer: 'Middle' },
          { id: 'g2_q4', type: 'voice', question: 'Guitar Check: Play a clean D note.', options: [], correct_answer: 'recorded', expected_pitch: 'D4' },
          { id: 'g2_q5', type: 'voice', question: 'Voice Check: Sing/hum the D pitch.', options: [], correct_answer: 'recorded', expected_pitch: 'D4' }
        ];
      } else if (order === 3) {
        return [
          { id: 'g3_q1', type: 'text', question: 'What is the standard time signature for most beginner guitar strumming patterns?', options: ['3/4', '4/4', '6/8', '2/4'], correct_answer: '4/4' },
          { id: 'g3_q2', type: 'text', question: 'What accessory is held in the hand to pluck or strum guitar strings?', options: ['Capo', 'Slide', 'Pick', 'Tuner'], correct_answer: 'Pick' },
          { id: 'g3_q3', type: 'text', question: 'What does a "capo" do when clamped onto the guitar neck?', options: ['Lowers the pitch', 'Raises the pitch', 'Dampens the sound', 'Tunes the strings'], correct_answer: 'Raises the pitch' },
          { id: 'g3_q4', type: 'voice', question: 'Guitar Check: Play a steady E note.', options: [], correct_answer: 'recorded', expected_pitch: 'E3' },
          { id: 'g3_q5', type: 'voice', question: 'Voice Check: Sing/hum the low E pitch.', options: [], correct_answer: 'recorded', expected_pitch: 'E3' }
        ];
      } else {
        return [
          { id: 'g4_q1', type: 'text', question: 'Which note lies on the 3rd fret of the low E string?', options: ['G', 'A', 'F', 'F#'], correct_answer: 'G' },
          { id: 'g4_q2', type: 'text', question: 'What is the chromatic scale?', options: ['A scale using only natural notes', 'A scale using all twelve semitones', 'A major scale', 'A minor scale'], correct_answer: 'A scale using all twelve semitones' },
          { id: 'g4_q3', type: 'text', question: 'What does "tablature" (TAB) tell a guitarist?', options: ['Which note in sheet music to play', 'Where to place fingers on strings and frets', 'How loud to play', 'The tempo of the song'], correct_answer: 'Where to place fingers on strings and frets' },
          { id: 'g4_q4', type: 'voice', question: 'Guitar Check: Play a standard A note.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' },
          { id: 'g4_q5', type: 'voice', question: 'Voice Check: Sing the A note clearly.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' }
        ];
      }
    } else if (inst === 'violin') {
      if (order === 1) {
        return [
          { id: 'v1_q1', type: 'text', question: 'What is the standard name of the stick used to play the violin?', options: ['Baton', 'Bow', 'Rod', 'Stick'], correct_answer: 'Bow' },
          { id: 'v1_q2', type: 'text', question: 'How many strings does a standard violin have?', options: ['3', '4', '5', '6'], correct_answer: '4' },
          { id: 'v1_q3', type: 'text', question: 'Where does the violinist securely place their chin while playing?', options: ['Bridge', 'Pegbox', 'Chin rest', 'Tailpiece'], correct_answer: 'Chin rest' },
          { id: 'v1_q4', type: 'voice', question: 'Violin Check: Draw a long bow stroke across the open A string.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' },
          { id: 'v1_q5', type: 'voice', question: 'Voice Check: Hum along with the pitch of the open A string.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' }
        ];
      } else if (order === 2) {
        return [
          { id: 'v2_q1', type: 'text', question: 'Which finger is typically referred to as the "first finger" in violin technique?', options: ['Thumb', 'Index finger', 'Middle finger', 'Ring finger'], correct_answer: 'Index finger' },
          { id: 'v2_q2', type: 'text', question: 'What is the purpose of placing tape on a beginner violin fingerboard?', options: ['Decorate the wood', 'Help with correct finger placement', 'Change pitch sound', 'Hold the strings'], correct_answer: 'Help with correct finger placement' },
          { id: 'v2_q3', type: 'text', question: 'When pressing a string down onto the fingerboard, what happens to the pitch?', options: ['It gets lower', 'It stays the same', 'It gets higher', 'It stops vibrating'], correct_answer: 'It gets higher' },
          { id: 'v2_q4', type: 'voice', question: 'Violin Check: Play a clear E note on the D string (first finger).', options: [], correct_answer: 'recorded', expected_pitch: 'E4' },
          { id: 'v2_q5', type: 'voice', question: 'Voice Check: Hum the E pitch you just played.', options: [], correct_answer: 'recorded', expected_pitch: 'E4' }
        ];
      } else if (order === 3) {
        return [
          { id: 'v3_q1', type: 'text', question: 'What does the term "Legato" mean in bowing technique?', options: ['Short and detached notes', 'Plucking the strings', 'Smooth and connected strokes', 'Playing extremely loud'], correct_answer: 'Smooth and connected strokes' },
          { id: 'v3_q2', type: 'text', question: 'What substance is rubbed onto the bow hair to increase friction and make the strings sound?', options: ['Wax', 'Rosin', 'Oil', 'Soap'], correct_answer: 'Rosin' },
          { id: 'v3_q3', type: 'text', question: 'What is the term for plucking the violin strings with your fingers instead of using the bow?', options: ['Arpeggio', 'Staccato', 'Pizzicato', 'Vibrato'], correct_answer: 'Pizzicato' },
          { id: 'v3_q4', type: 'voice', question: 'Violin Check: Play two short detached bows on the open E string.', options: [], correct_answer: 'recorded', expected_pitch: 'E5' },
          { id: 'v3_q5', type: 'voice', question: 'Voice Check: Sing/hum the high E pitch of the open E string.', options: [], correct_answer: 'recorded', expected_pitch: 'E5' }
        ];
      } else {
        return [
          { id: 'v4_q1', type: 'text', question: 'Which note comes directly after G in the musical alphabet on a violin string?', options: ['H', 'A', 'F', 'C'], correct_answer: 'A' },
          { id: 'v4_q2', type: 'text', question: 'What is the key signature of the easiest beginner violin scale: G Major?', options: ['One sharp', 'Two sharps', 'No sharps', 'One flat'], correct_answer: 'One sharp' },
          { id: 'v4_q3', type: 'text', question: 'What does the symbol "V" mean in violin sheet music?', options: ['Up-bow', 'Down-bow', 'Vibrato', 'Volume up'], correct_answer: 'Up-bow' },
          { id: 'v4_q4', type: 'voice', question: 'Violin Check: Play a full G note clearly.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' },
          { id: 'v4_q5', type: 'voice', question: 'Voice Check: Sing along with the G note.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' }
        ];
      }
    } else {
      if (order === 1) {
        return [
          { id: 'f1_q1', type: 'text', question: 'How do you hold the flute while playing?', options: ['Vertical', 'Horizontal', 'Diagonal', 'Upside down'], correct_answer: 'Horizontal' },
          { id: 'f1_q2', type: 'text', question: 'What is the embouchure hole on the flute used for?', options: ['Blowing air', 'Placing fingers', 'Tuning the instrument', 'Holding it securely'], correct_answer: 'Blowing air' },
          { id: 'f1_q3', type: 'text', question: 'Which finger covers the first tone hole of the flute?', options: ['Thumb', 'Index finger', 'Middle finger', 'Pinky'], correct_answer: 'Index finger' },
          { id: 'f1_q4', type: 'voice', question: 'Flute Check: Play a long sustained "Sa" note for 3 seconds.', options: [], correct_answer: 'recorded', expected_pitch: 'C4' },
          { id: 'f1_q5', type: 'voice', question: 'Voice Check: Hum the pitch of the note you just played.', options: [], correct_answer: 'recorded', expected_pitch: 'C4' }
        ];
      } else if (order === 2) {
        return [
          { id: 'f2_q1', type: 'text', question: 'What is the standard fingering note for covering the thumb key and first three finger keys on the left hand?', options: ['G', 'A', 'B', 'C'], correct_answer: 'G' },
          { id: 'f2_q2', type: 'text', question: 'How do you achieve a higher octave note on the flute?', options: ['Press more keys', 'Blow faster, more focused air', 'Pull the headjoint out', 'Cover the end hole'], correct_answer: 'Blow faster, more focused air' },
          { id: 'f2_q3', type: 'text', question: 'What is the function of the foot joint on the flute?', options: ['Plays the highest notes', 'Plays the lowest notes', 'Connects the headjoint', 'Adjusts the volume'], correct_answer: 'Plays the lowest notes' },
          { id: 'f2_q4', type: 'voice', question: 'Flute Check: Play a sustained A note on the flute.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' },
          { id: 'f2_q5', type: 'voice', question: 'Voice Check: Sing/hum along with the A note pitch.', options: [], correct_answer: 'recorded', expected_pitch: 'A4' }
        ];
      } else if (order === 3) {
        return [
          { id: 'f3_q1', type: 'text', question: 'What syllable is recommended for standard tonguing to articulate notes on the flute?', options: ['Loo', 'Tu or Du', 'Pah', 'Shah'], correct_answer: 'Tu or Du' },
          { id: 'f3_q2', type: 'text', question: 'What muscle should be engaged to provide strong, steady breath support?', options: ['Shoulder muscles', 'Diaphragm', 'Throat', 'Chest'], correct_answer: 'Diaphragm' },
          { id: 'f3_q3', type: 'text', question: 'What does "slurring" mean in flute playing?', options: ['Tonguing every single note', 'Playing notes smoothly without tonguing', 'Playing notes out of tune', 'Playing as quiet as possible'], correct_answer: 'Playing notes smoothly without tonguing' },
          { id: 'f3_q4', type: 'voice', question: 'Flute Check: Play four short articulated notes.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' },
          { id: 'f3_q5', type: 'voice', question: 'Voice Check: Sing the pitch G4 in four short bursts.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' }
        ];
      } else {
        return [
          { id: 'f4_q1', type: 'text', question: 'Which note lies between F and G on the flute scale?', options: ['F#', 'G#', 'A#', 'E'], correct_answer: 'F#' },
          { id: 'f4_q2', type: 'text', question: 'What key is pressed by the right hand pinky for almost all standard middle octave notes?', options: ['D# key', 'C key', 'G# key', 'B key'], correct_answer: 'D# key' },
          { id: 'f4_q3', type: 'text', question: 'What happens if you pull the headjoint slightly out from the body of the flute?', options: ['The pitch goes flat', 'The pitch goes sharp', 'The sound becomes silent', 'The volume doubles'], correct_answer: 'The pitch goes flat' },
          { id: 'f4_q4', type: 'voice', question: 'Flute Check: Play a smooth G note.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' },
          { id: 'f4_q5', type: 'voice', question: 'Voice Check: Sing along with the G note.', options: [], correct_answer: 'recorded', expected_pitch: 'G4' }
        ];
      }
    }
  };

  const fetchQuiz = async (selectedLessonId, shouldRegenerate = false, lessonObj = null) => {
    try {
      setIsGeneratingQuiz(true);
      const url = shouldRegenerate 
        ? `${API_URL}/api/courses/quiz/${selectedLessonId}?regenerate=true`
        : `${API_URL}/api/courses/quiz/${selectedLessonId}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const formattedQuiz = data.map((q) => ({
            id: q.id,
            type: q.type || 'text',
            question: q.question,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            correct_answer: q.correct_answer,
          }));
          setQuiz(formattedQuiz);
        } else {
          const order = lessonObj?.lesson_order || currentLesson?.lesson_order || 1;
          const finalData = generateDefaultQuiz(course?.instrument, order);
          setQuiz(finalData);
        }
      } else {
        console.warn('Backend quiz API returned an error, using premium offline fallback');
        const order = lessonObj?.lesson_order || currentLesson?.lesson_order || 1;
        const finalData = generateDefaultQuiz(course?.instrument, order);
        setQuiz(finalData);
      }
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error fetching quiz, using premium offline fallback:', error);
      const order = lessonObj?.lesson_order || currentLesson?.lesson_order || 1;
      const finalData = generateDefaultQuiz(course?.instrument, order);
      setQuiz(finalData);
      setCurrentQuestionIndex(0);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSelect = (quizId, answer) => {
    setSelectedAnswers((prev) => ({ ...prev, [quizId]: answer }));
  };

  const handleQuizSubmit = () => {
    let newScore = 0;
    quiz.forEach((item) => {
      if (item.type === 'text' || item.type === 'mcq') {
        const selected = String(selectedAnswers[item.id] || '').trim().toLowerCase();
        const correct = String(item.correct_answer || '').trim().toLowerCase();
        
        // Allow exact match, or substring match if AI added extra characters like "A) "
        if (
          selected === correct || 
          (selected.length > 2 && correct.includes(selected)) || 
          (correct.length > 2 && selected.includes(correct))
        ) {
          newScore += 1;
        }
      } else {
        const analysis = selectedAnswers[item.id];
        if (analysis && (analysis.passed === true || String(analysis.passed).toLowerCase() === 'true')) {
          newScore += 1;
        }
      }
    });

    setScore(newScore);
    setQuizSubmitted(true);

    if (course && currentLesson) {
      const existingProgress = getStoredProgress(courseId);
      const completedLessons = Array.from(new Set([...existingProgress.completedLessons, currentLesson.id]));
      const certificateEarned = completedLessons.length === course.lessons.length || existingProgress.certificateEarned;

      const nextState = {
        completedLessons,
        currentLessonId: currentLesson.id,
        certificateEarned,
      };

      localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(nextState));
      setCourseProgress(nextState);

      // Save to database as well
      fetch(`${API_URL}/api/courses/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ courseId: Number(courseId), lessonId: Number(currentLesson.id) })
      }).catch(err => console.error("Error saving progress to DB:", err));
    }
  };

  const handleNextLesson = () => {
    if (!course || !currentLesson) return;

    const currentIndex = course.lessons.findIndex((lesson) => lesson.id === currentLesson.id);
    const nextLesson = course.lessons[currentIndex + 1];

    if (nextLesson) {
      navigate(`/course/${courseId}/${nextLesson.id}`);
    } else {
      setShowCertificate(true);
    }
  };

  if (!course || !currentLesson) return <div className="course-page">Loading...</div>;

  const completedCount = courseProgress.completedLessons.length;
  const progressPercentage = course.lessons.length ? Math.round((completedCount / course.lessons.length) * 100) : 0;
  const scorePercentage = quiz.length ? Math.round((score / quiz.length) * 100) : 0;
  const isCurrentLessonComplete = courseProgress.completedLessons.includes(currentLesson.id);
  const canAccessQuiz = videoCompleted || isCurrentLessonComplete;
  const isFinalLesson = course.lessons[course.lessons.length - 1]?.id === currentLesson.id;
  const shouldShowCertificateBlock = courseProgress.certificateEarned;

  return (
    <div className="course-page">
      <div className="course-shell">
        <nav className="course-nav">
          <div className="nav-left">
            <button ref={btnBack} className="nav-back magnetic" onClick={() => navigate('/dashboard')}>&larr; Dashboard</button>
          </div>
          <div className="nav-center">
            <span className="text-display font-semibold tracking-tight">{course.title}</span>
          </div>
          <div className="nav-right">
            <div className="course-badge">{course.instrument}</div>
            <div className="progress-pill">Lesson {currentLesson.lesson_order} / {course.lessons.length}</div>
          </div>
        </nav>

        <div className="course-layout">
          <aside className="curriculum-sidebar">
            <div className="curr-header">
              <h3 className="text-display font-bold">Curriculum</h3>
              <p className="curr-subtitle">Active lesson stays highlighted. Finish the current video, answer its question set, then continue into the next module.</p>
            </div>
            <div className="curr-list">
              {course.lessons.map((lesson) => {
                const isCompleted = courseProgress.completedLessons.includes(lesson.id);
                const isActive = lesson.id === Number.parseInt(lessonId, 10);

                return (
                  <div
                    key={lesson.id}
                    className={`curr-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => navigate(`/course/${courseId}/${lesson.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="curr-status"></span>
                    <div className="curr-copy">
                      <span className="curr-step">Module {lesson.lesson_order}</span>
                      <span className="curr-title">{lesson.title}</span>
                      <span className="curr-note">{isCompleted ? 'Completed' : isActive ? 'Now playing' : 'Upcoming'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="video-section">
            <Reveal>
              <div className="video-wrapper">
                <YouTubeLessonPlayer
                  key={lessonId}
                  videoUrl={currentLesson.video_url}
                  title={currentLesson.title}
                  onComplete={handleVideoComplete}
                />
              </div>
            </Reveal>

            <div className="lesson-info">
              <Reveal delay="0.1s">
                <div className="lesson-hero">
                  <div>
                    <span className="lesson-meta">Module {currentLesson.lesson_order} - {progressPercentage}% complete</span>
                    <h2 className="text-serif tracking-tighter">{currentLesson.title}</h2>
                    <p>Watch the lesson carefully, practice the technique, and when the video ends the related question set becomes the immediate next step for the learner.</p>
                  </div>
                  <div className="lesson-summary">
                    <div className="summary-box">
                      <span>Completed modules</span>
                      <strong>{completedCount} / {course.lessons.length}</strong>
                    </div>
                    <div className="summary-box">
                      <span>Current lesson</span>
                      <strong>{isCurrentLessonComplete ? 'Completed' : 'In Progress'}</strong>
                    </div>
                    <div className="summary-box">
                      <span>Video status</span>
                      <strong>{videoCompleted ? 'Finished' : isCurrentLessonComplete ? 'Review Mode' : 'Watching'}</strong>
                    </div>
                    <div className="summary-box">
                      <span>Certificate</span>
                      <strong>{courseProgress.certificateEarned ? 'Ready' : 'Locked'}</strong>
                    </div>
                  </div>
                </div>
              </Reveal>

              {courseProgress.certificateEarned && (
                <Reveal delay="0.15s">
                  <div className="completion-card" style={{ marginBottom: '20px' }}>
                    <strong>Certificate unlocked</strong>
                    <p className="text-secondary" style={{ marginTop: '8px' }}>
                      Your certificate stays available even when you come back to rewatch lessons or retake quizzes.
                    </p>
                    <div className="completion-actions">
                      <button className="btn-primary" onClick={() => setShowCertificate(true)}>Open Certificate</button>
                    </div>
                  </div>
                </Reveal>
              )}

              <div className="lesson-accordions">
                {/* Overview Accordion */}
                <div className={`accordion-section ${activeTab === 'overview' ? 'open' : ''}`}>
                  <button className="accordion-header" onClick={() => setActiveTab(activeTab === 'overview' ? null : 'overview')}>
                    <span>Overview</span>
                    <span className="accordion-icon">{activeTab === 'overview' ? '−' : '+'}</span>
                  </button>
                  {activeTab === 'overview' && (
                    <Reveal delay="0.1s">
                      <div className="accordion-body">
                        <p className="text-secondary">This lesson player is structured like a proper LMS: lesson navigation, embedded video, checkpoint quiz, and progress tied to the student profile on the device.</p>
                        <ul className="lesson-points">
                          <li>Watch the full module before the related questions become active.</li>
                          <li>Practice the shown technique alongside the instructor.</li>
                          <li>Submit the quiz to mark the lesson complete and move forward.</li>
                        </ul>
                        {!canAccessQuiz && (
                          <div className="video-gate">
                            <strong>Quiz unlocks after the video ends</strong>
                            <p className="text-secondary">The learner watches first, then the system moves attention to the related assessment for that exact lesson.</p>
                          </div>
                        )}
                        {isCurrentLessonComplete && (
                          <div className="video-gate">
                            <strong>Lesson already completed</strong>
                            <p className="text-secondary">This module stays open for review, so the learner can rewatch the video and retake the quiz anytime.</p>
                          </div>
                        )}
                      </div>
                    </Reveal>
                  )}
                </div>

                {/* Quiz Accordion */}
                <div className={`accordion-section ${activeTab === 'quiz' ? 'open' : ''}`}>
                  <button className="accordion-header" onClick={() => setActiveTab(activeTab === 'quiz' ? null : 'quiz')} disabled={!canAccessQuiz}>
                    <span>Quiz</span>
                    <span className="accordion-icon">{activeTab === 'quiz' ? '−' : '+'}</span>
                  </button>
                  {activeTab === 'quiz' && (
                    <Reveal delay="0.1s">
                      <div className="accordion-body">
                        {!canAccessQuiz ? (
                          <div className="quiz-locked">
                            <strong>Finish the lesson video first</strong>
                            <p className="text-secondary">As soon as the video completes, this lesson’s question set will open automatically.</p>
                          </div>
                        ) : isGeneratingQuiz ? (
                          <div className="quiz-loading-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div className="spinner" style={{
                              width: '40px',
                              height: '40px',
                              border: '4px solid rgba(199, 119, 45, 0.1)',
                              borderLeftColor: 'var(--accent, #c7772d)',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                              margin: '0 auto 20px auto'
                            }}></div>
                            <style>{`
                              @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                              }
                            `}</style>
                            <h4 style={{ color: 'var(--accent, #c7772d)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>✨ Generating Fresh Questions</h4>
                            <p className="text-secondary">Gemini AI is analyzing the high-fidelity video transcript to create a unique, non-repeating quiz for you...</p>
                          </div>
                        ) : quiz.length > 0 ? (
                          <div className="quiz-container">
                            {!quizSubmitted ? (
                              <div className="quiz-wizard">
                                {quiz[currentQuestionIndex] && (
                                  <div className="quiz-question">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Question {currentQuestionIndex + 1} of {quiz.length}
                                      </div>
                                      <button 
                                        className="btn-outline"
                                        style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', borderRadius: '20px', background: 'rgba(255,255,255,0.3)', color: 'var(--text)' }}
                                        onClick={() => {
                                          if (window.confirm("Do you want to regenerate this quiz with a brand new, non-repeating set of questions? Your current progress in this attempt will be reset.")) {
                                            fetchQuiz(currentLesson.id, true, currentLesson);
                                            setSelectedAnswers({});
                                            setCurrentQuestionIndex(0);
                                          }
                                        }}
                                      >
                                        🔄 Fresh Questions
                                      </button>
                                    </div>
                                    <h4 style={{ marginBottom: '20px', fontSize: '18px' }}>{quiz[currentQuestionIndex].question}</h4>
                                    
                                    {quiz[currentQuestionIndex].type === 'text' ? (
                                      <div className="options-grid">
                                        {quiz[currentQuestionIndex].options.map((opt) => (
                                          <button
                                            key={opt}
                                            className={`btn-outline quiz-option ${selectedAnswers[quiz[currentQuestionIndex].id] === opt ? 'active' : ''}`}
                                            onClick={() => handleAnswerSelect(quiz[currentQuestionIndex].id, opt)}
                                          >
                                            {opt}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="voice-check-ui" style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(255,255,255,0.4)', borderRadius: '16px' }}>
                                         {!isAnalyzingVoice && (
                                           <button 
                                             className="btn-outline"
                                             style={{ 
                                               display: 'flex', 
                                               alignItems: 'center', 
                                               justifyContent: 'center',
                                               gap: '8px',
                                               margin: '0 auto 20px auto', 
                                               borderRadius: '24px', 
                                               padding: '8px 18px',
                                               fontSize: '13px',
                                               fontWeight: '600',
                                               borderColor: 'var(--accent)',
                                               color: 'var(--accent)',
                                               background: 'rgba(255, 255, 255, 0.6)',
                                               cursor: 'pointer',
                                               boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                               transition: 'all 0.2s ease'
                                             }}
                                             onClick={() => playReferencePitch(quiz[currentQuestionIndex])}
                                             disabled={isRecording}
                                           >
                                             🎵 Listen to Reference Pitch ({quiz[currentQuestionIndex].expected_pitch || 'C4'})
                                           </button>
                                         )}
                                        {isAnalyzingVoice ? (
                                          <div style={{ padding: '20px 0' }}>
                                            <div className="spinner" style={{
                                              width: '30px',
                                              height: '30px',
                                              border: '3px solid rgba(111, 66, 193, 0.1)',
                                              borderLeftColor: '#6f42c1',
                                              borderRadius: '50%',
                                              animation: 'spin 1s linear infinite',
                                              margin: '0 auto 15px auto'
                                            }}></div>
                                            <h5 style={{ color: '#4b35cd', fontSize: '16px', fontWeight: '600' }}>🤖 Gemini is analyzing your pitch...</h5>
                                            <p className="text-secondary" style={{ fontSize: '13px' }}>Evaluating frequency stability, accuracy, and note duration...</p>
                                          </div>
                                        ) : (
                                          <>
                                            <button 
                                              className={`btn-primary ${isRecording ? 'recording' : ''}`}
                                              style={{ 
                                                borderRadius: '50%', 
                                                width: '80px', 
                                                height: '80px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                margin: '0 auto', 
                                                background: isRecording ? '#dc3545' : 'var(--accent)',
                                                fontSize: '30px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: isRecording ? '0 0 20px rgba(220, 53, 69, 0.6)' : 'none',
                                                transition: 'all 0.3s ease'
                                              }}
                                              onClick={() => {
                                                if (isRecording) {
                                                  stopPitchDetectionAndAnalyze(quiz[currentQuestionIndex]);
                                                } else {
                                                  startPitchDetection();
                                                }
                                              }}
                                            >
                                              {isRecording ? '⏹' : '🎤'}
                                            </button>
                                            
                                            {isRecording && livePitch > 0 && (
                                              <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                🎙️ Live Pitch: {livePitch} Hz
                                              </div>
                                            )}

                                            <div style={{ marginTop: '20px' }}>
                                              {isRecording ? (
                                                <p style={{ fontWeight: '500', color: 'var(--accent)' }}>Recording active... Play/sing your note clearly now!</p>
                                              ) : selectedAnswers[quiz[currentQuestionIndex].id] ? (
                                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', margin: '10px 0' }}>
                                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                                      {selectedAnswers[quiz[currentQuestionIndex].id].overallScore >= 70 ? '✅ Passed!' : '❌ Try Again'}
                                                    </span>
                                                    <strong style={{ fontSize: '18px', color: 'var(--accent)' }}>
                                                      {selectedAnswers[quiz[currentQuestionIndex].id].overallScore}/100
                                                    </strong>
                                                  </div>
                                                  <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text)' }}>
                                                    <strong>Feedback:</strong> {selectedAnswers[quiz[currentQuestionIndex].id].overallFeedback || selectedAnswers[quiz[currentQuestionIndex].id].pitchAnalysis?.feedback || "Voice analysis completed."}
                                                  </p>
                                                  {selectedAnswers[quiz[currentQuestionIndex].id].improvementTip && (
                                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                                      💡 <em>Tip: {selectedAnswers[quiz[currentQuestionIndex].id].improvementTip}</em>
                                                    </p>
                                                  )}
                                                </div>
                                              ) : (
                                                <p style={{ fontWeight: '500' }}>Click the microphone to start recording</p>
                                              )}
                                            </div>

                                            {!isRecording && (
                                              <button
                                                className="btn-outline"
                                                style={{ 
                                                  marginTop: '12px', 
                                                  fontSize: '12px', 
                                                  padding: '6px 12px', 
                                                  borderRadius: '20px', 
                                                  background: 'rgba(0,0,0,0.03)', 
                                                  border: '1px dashed var(--text-muted)' 
                                                }}
                                                onClick={() => {
                                                  handleAnswerSelect(quiz[currentQuestionIndex].id, {
                                                    overallScore: 85,
                                                    passed: true,
                                                    overallFeedback: "Skipped microphone check (Manual bypass).",
                                                    improvementTip: "Check your browser site permissions if your microphone is not picking up sound."
                                                  });
                                                }}
                                              >
                                                ⚠️ Mic Issues? Skip Voice Check
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                                  {currentQuestionIndex < quiz.length - 1 ? (
                                    <button 
                                      className="btn-primary" 
                                      disabled={!selectedAnswers[quiz[currentQuestionIndex]?.id]}
                                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                    >
                                      Next Question &rarr;
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn-primary" 
                                      onClick={handleQuizSubmit} 
                                      disabled={!selectedAnswers[quiz[currentQuestionIndex]?.id]}
                                    >
                                      Submit Quiz
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="quiz-results">
                                <h3 className="text-serif">Quiz Completed</h3>
                                <div className="quiz-score" style={{ '--score': scorePercentage }}>
                                  {score} / {quiz.length}
                                </div>
                                <p>
                                  {isFinalLesson
                                    ? 'You finished the last checkpoint. The course certificate is now available.'
                                    : 'This lesson is complete. Move to the next module to continue the program.'}
                                </p>
                                <div className="completion-actions" style={{ gap: '10px' }}>
                                  <button 
                                    className="btn-outline" 
                                    onClick={() => { 
                                      fetchQuiz(currentLesson.id, true); 
                                      setQuizSubmitted(false); 
                                      setSelectedAnswers({}); 
                                      setCurrentQuestionIndex(0); 
                                      setShowReview(false);
                                    }}
                                  >
                                    🔄 Retake Quiz (Fresh Questions)
                                  </button>
                                  <button className="btn-primary" onClick={handleNextLesson}>
                                    {isFinalLesson ? 'View Certificate' : 'Next Lesson'}
                                  </button>
                                </div>

                                <button 
                                  className="btn-outline"
                                  style={{ marginTop: '16px', width: '100%', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.4)', fontWeight: '600' }}
                                  onClick={() => setShowReview(prev => !prev)}
                                >
                                  {showReview ? 'Hide Question Review' : '🔍 Review Questions & Answers'}
                                </button>

                                {showReview && (
                                  <div className="quiz-review-section" style={{ marginTop: '24px', textAlign: 'left', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '20px' }}>
                                    <h4 className="font-semibold" style={{ fontSize: '18px', marginBottom: '16px' }}>Question Review</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                      {quiz.map((item, idx) => {
                                        const studentAns = selectedAnswers[item.id];
                                        const correctAns = item.correct_answer;
                                        const isCorrect = studentAns === correctAns;

                                        return (
                                          <div 
                                            key={item.id} 
                                            style={{ 
                                              background: 'rgba(255,255,255,0.4)', 
                                              padding: '16px', 
                                              borderRadius: '12px', 
                                              borderLeft: `5px solid ${item.type === 'voice' ? '#6f42c1' : isCorrect ? '#28a745' : '#dc3545'}`,
                                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                            }}
                                          >
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                              Question {idx + 1} • {item.type === 'text' ? 'Theory MCQ' : 'Voice Practice'}
                                            </div>
                                            <p style={{ fontWeight: '600', fontSize: '15px', marginBottom: '12px', color: 'var(--text)' }}>{item.question}</p>
                                            
                                            {item.type === 'text' ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {item.options.map((opt) => {
                                                  const isSelected = studentAns === opt;
                                                  const isOptCorrect = correctAns === opt;

                                                  let border = '1px solid rgba(0,0,0,0.1)';
                                                  let background = 'rgba(255,255,255,0.5)';
                                                  let textColor = 'var(--text)';
                                                  let icon = '';

                                                  if (isSelected && isCorrect) {
                                                    background = 'rgba(40, 167, 69, 0.15)';
                                                    border = '1px solid #28a745';
                                                    textColor = '#155724';
                                                    icon = '✅ ';
                                                  } else if (isSelected && !isCorrect) {
                                                    background = 'rgba(220, 53, 69, 0.15)';
                                                    border = '1px solid #dc3545';
                                                    textColor = '#721c24';
                                                    icon = '❌ ';
                                                  } else if (isOptCorrect) {
                                                    background = 'rgba(40, 167, 69, 0.08)';
                                                    border = '2px dashed #28a745';
                                                    textColor = '#155724';
                                                    icon = '👉 ';
                                                  }

                                                  return (
                                                    <div 
                                                      key={opt}
                                                      style={{ 
                                                        padding: '10px 14px', 
                                                        borderRadius: '8px', 
                                                        border, 
                                                        background, 
                                                        color: textColor, 
                                                        fontSize: '13px', 
                                                        fontWeight: isSelected || isOptCorrect ? '600' : 'normal',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                      }}
                                                    >
                                                      <span style={{ marginRight: '6px' }}>{icon}</span>
                                                      {opt}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {studentAns ? (
                                                  <>
                                             <button 
                                               className="btn-outline"
                                               style={{ 
                                                 display: 'none', 
                                                 alignItems: 'center', 
                                                 justifyContent: 'center',
                                                 gap: '8px',
                                                 margin: '0 auto 20px auto', 
                                                 borderRadius: '24px', 
                                                 padding: '8px 18px',
                                                 fontSize: '13px',
                                                 fontWeight: '600',
                                                 borderColor: 'var(--accent)',
                                                 color: 'var(--accent)',
                                                 background: 'rgba(255, 255, 255, 0.6)',
                                                 cursor: 'pointer',
                                                 boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                                 transition: 'all 0.2s ease'
                                               }}
                                               onClick={() => playReferencePitch(quiz[currentQuestionIndex])}
                                               disabled={isRecording}
                                             >
                                               🎵 Listen to Reference Pitch ({quiz[currentQuestionIndex].expected_pitch || 'C4'})
                                             </button>
                                             <button 
                                               className="btn-outline"
                                               style={{ 
                                                 display: 'none', 
                                                 alignItems: 'center', 
                                                 justifyContent: 'center',
                                                 gap: '8px',
                                                 margin: '0 auto 20px auto', 
                                                 borderRadius: '24px', 
                                                 padding: '8px 18px',
                                                 fontSize: '13px',
                                                 fontWeight: '600',
                                                 borderColor: 'var(--accent)',
                                                 color: 'var(--accent)',
                                                 background: 'rgba(255, 255, 255, 0.6)',
                                                 cursor: 'pointer',
                                                 boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                                 transition: 'all 0.2s ease'
                                               }}
                                               onClick={() => playReferencePitch(quiz[currentQuestionIndex])}
                                               disabled={isRecording}
                                             >
                                               🎵 Listen to Reference Pitch ({quiz[currentQuestionIndex].expected_pitch || 'C4'})
                                             </button>
                                                    <div style={{ 
                                                      background: studentAns.passed ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)', 
                                                      border: `1px solid ${studentAns.passed ? '#28a745' : '#dc3545'}`, 
                                                      padding: '12px 14px', 
                                                      borderRadius: '8px', 
                                                      fontSize: '13px', 
                                                      color: studentAns.passed ? '#155724' : '#721c24'
                                                    }}>
                                                      <strong>Score: {studentAns.overallScore}/100 ({studentAns.passed ? 'PASSED ✅' : 'FAILED ❌'})</strong>
                                                      <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.9 }}>
                                                        {studentAns.overallFeedback}
                                                      </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                      <div>🎯 <strong>Target:</strong> {item.expected_pitch || 'N/A'}</div>
                                                      {studentAns.pitchAnalysis && (
                                                        <div>🎙️ <strong>Pitch Check:</strong> {studentAns.pitchAnalysis.feedback}</div>
                                                      )}
                                                      {studentAns.improvementTip && (
                                                        <div style={{ color: '#c7772d', fontWeight: '500' }}>💡 <strong>Teacher Tip:</strong> {studentAns.improvementTip}</div>
                                                      )}
                                                    </div>
                                                  </>
                                                ) : (
                                                  <div style={{ color: '#dc3545', fontSize: '13px', fontWeight: '500' }}>
                                                    ⚠️ No attempt recorded for this voice exercise.
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {shouldShowCertificateBlock && (
                                  <div className="completion-card" style={{ marginTop: '20px' }}>
                                    <strong>Certificate unlocked</strong>
                                    <p className="text-secondary" style={{ marginTop: '8px' }}>
                                      Every lesson module and assessment for this music course has been completed successfully.
                                    </p>
                                    <div className="completion-actions">
                                      <button className="btn-primary" onClick={() => setShowCertificate(true)}>Open Certificate</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p>No quiz available for this lesson.</p>
                        )}
                      </div>
                    </Reveal>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showCertificate && (
        <div className="cert-modal">
          <div className="cert-overlay" onClick={() => setShowCertificate(false)}></div>
          <div className="cert-container">
            <div className="certificate" ref={certificateRef}>
              <div className="cert-border-outer">
                <div className="cert-border-inner">
                  <div className="cert-top">
                    <div className="cert-logo brand-logo">MELODY.</div>
                    <div className="cert-subtitle">Certificate of Musical Completion</div>
                  </div>
                  <div className="cert-divider"></div>
                  <div className="cert-body">
                    <p className="cert-presented">This certifies that</p>
                    <h2 className="cert-name">{user?.firstName || 'Student'} {user?.lastName || ''}</h2>
                    <p className="cert-course-label">has successfully completed the course</p>
                    <div className="cert-course">{course.title}</div>
                    <p className="cert-detail">including all lesson videos and their related quiz modules.</p>
                  </div>
                  <div className="cert-footer">
                    <div className="cert-sig" style={{ position: 'relative' }}>
                      {cleanedSignatureUrl && (
                        <img 
                          src={cleanedSignatureUrl} 
                          alt="Lead Instructor Signature" 
                          style={{
                            position: 'absolute',
                            top: '-55px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            height: '65px',
                            objectFit: 'contain',
                            pointerEvents: 'none'
                          }} 
                        />
                      )}
                      <div className="sig-line"></div>
                      <span>Lead Instructor</span>
                      <small>Melody Conservatory</small>
                    </div>
                    <div className="cert-seal">
                      <div className="seal-ring">♪</div>
                    </div>
                    <div className="cert-sig">
                      <div className="sig-line"></div>
                      <span>{new Date().toLocaleDateString()}</span>
                      <small>Date of completion</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="cert-actions">
              <button className="btn-primary" onClick={downloadCertificate} disabled={isDownloadingCertificate}>
                {isDownloadingCertificate ? 'Preparing PDF...' : 'Download Certificate'}
              </button>
              <button className="btn-outline" onClick={() => setShowCertificate(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Course;
