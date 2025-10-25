// /app/projects/screening/page.tsx
"use client";

import { useState, useRef, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Bot, User, SendHorizontal, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

type ChatState = 'loading_params' | 'generating_questions' | 'answering_questions' | 'scoring' | 'finished';

// A styled full-page loader for the Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-foreground/60">Loading Screening Session...</p>
        </div>
    </div>
  )
}

export default function ScreeningPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScreeningChat />
    </Suspense>
  );
}

function ScreeningChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatState, setChatState] = useState<ChatState>('loading_params');
  const [instruction, setInstruction] = useState('');
  const [projectId, setProjectId] = useState(''); 
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const instructionFromUrl = searchParams.get('instruction');
    const projectIdFromUrl = searchParams.get('projectId');

    if (instructionFromUrl && projectIdFromUrl) {
      setInstruction(instructionFromUrl);
      setProjectId(projectIdFromUrl);
      addMessage('bot', `Starting screening for project: **${projectIdFromUrl}**.\n\nGenerating questions based on the provided instructions...`);
      handleInstructionSubmit(instructionFromUrl);
    } else {
      addMessage('bot', 'Error: Project ID or instructions not provided. Please return to the projects page and select a project.');
      setIsLoading(false);
      setChatState('finished');
    }
  }, [searchParams]);

  const addMessage = (role: 'user' | 'bot', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };
  
  const handleInstructionSubmit = async (instructionText: string) => {
    // ... (logic is unchanged)
    setChatState('generating_questions');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: instructionText }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      const data = await response.json();
      if (data.status === 'error' || !data.questions || data.questions.length === 0) {
        throw new Error(data.error_message || "Failed to generate questions.");
      }
      
      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
      addMessage('bot', `Great. I have ${data.questions.length} questions for you. Let's start.\n\n**Question 1:** ${data.questions[0]}`);
      setChatState('answering_questions');
    } catch (error: any) {
      console.error("Failed to fetch questions:", error);
      addMessage('bot', `Sorry, I ran into an error: ${error.message}. Please try again later.`);
      setChatState('finished');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (answerText: string) => {
    // ... (logic is unchanged)
    addMessage('user', answerText);
    const newAnswers = [...answers, answerText];
    setAnswers(newAnswers);

    const nextQuestionIndex = currentQuestionIndex + 1;

    if (nextQuestionIndex < questions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
      addMessage('bot', `**Question ${nextQuestionIndex + 1}:** ${questions[nextQuestionIndex]}`);
    } else {
      setIsLoading(true);
      setChatState('scoring');
      addMessage('bot', "Thank you. Evaluating your answers now...");
      
      try {
        const scoreResponse = await fetch('http://127.0.0.1:8000/submit-screening', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction: instruction,
            questions: questions,
            answers: newAnswers,
          }),
        });

        if (!scoreResponse.ok) throw new Error(`API error: ${scoreResponse.statusText}`);
        const scoreData = await scoreResponse.json();
        if (scoreData.status === 'error') {
          throw new Error(scoreData.error_message || "Failed to get a score.");
        }
        
        const resultText = `**Screening Complete**\n\n**Assessment:** ${scoreData.assessment}\n\n**Score:** ${scoreData.score}/100`;
        addMessage('bot', resultText);
        setChatState('finished');

        const screeningStatus = scoreData.score > 50 ? 'passed' : 'failed';
        addMessage('bot', `You have **${screeningStatus}** the screening. Recording result...`);

        const userId = "user-123-placeholder"; 

        const hcsResponse = await fetch('/api/screening-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectId,
            userId: userId,
            score: scoreData.score,
            status: screeningStatus
          }),
        });

        const hcsResult = await hcsResponse.json();
        if (hcsResult.success) {
            addMessage('bot', '✅ Screening result successfully recorded on-chain.');
        } else {
            addMessage('bot', `❌ Failed to record result: ${hcsResult.error}`);
        }

      } catch (error: any) {
        console.error("Failed to submit screening:", error);
        addMessage('bot', `Sorry, an error occurred during scoring: ${error.message}`);
        setChatState('finished');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || chatState !== 'answering_questions') return;
    const currentInput = input;
    setInput('');
    await handleAnswerSubmit(currentInput);
  };
  
  const getPlaceholderText = () => {
    // ... (logic is unchanged)
    switch (chatState) {
        case 'loading_params':
        case 'generating_questions':
            return 'Please wait...';
        case 'answering_questions':
            return `Type your answer for Question ${currentQuestionIndex + 1}...`;
        case 'scoring':
            return 'Scoring in progress...';
        case 'finished':
            return 'Screening complete. You can now close this page.';
        default:
            return 'Type your message...';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col max-w-4xl w-full mx-auto px-4 pt-8">
        {/* Header Section */}
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">Project Screening</h1>
            <p className="text-foreground/60">
                You are being screened for project: <span className="font-semibold text-blue-400">{projectId || "Loading..."}</span>
            </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'bot' && (
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10 rounded-full">
                  <Bot className="text-blue-400" />
                </div>
              )}
              <div className={`whitespace-pre-wrap max-w-lg px-5 py-3 rounded-2xl border ${msg.role === 'user' ? 'bg-blue-500/10 border-blue-500/20 text-foreground rounded-br-none' : 'bg-white/5 border-white/10 text-foreground/80 rounded-bl-none'}`}>
                <p className="prose prose-invert prose-p:my-0" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
               {msg.role === 'user' && (
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10 rounded-full">
                  <User className="text-foreground/60" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4 justify-start">
               <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10 rounded-full">
                  <Bot className="text-blue-400" />
                </div>
              <div className="max-w-lg px-5 py-3 rounded-2xl border bg-white/5 border-white/10 rounded-bl-none">
                <p className="flex items-center gap-2 text-foreground/60">
                    <Loader2 size={16} className="animate-spin" />
                    AI is thinking...
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="py-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getPlaceholderText()}
              disabled={isLoading || chatState !== 'answering_questions'}
              className="w-full pl-6 pr-16 py-4 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || chatState !== 'answering_questions'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow disabled:from-gray-500 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <SendHorizontal size={20} />
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}