// Location: app/page.tsx

"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';

// Define the structure of a chat message
interface Message {
  role: 'user' | 'bot';
  content: string;
}

// Define the states for our conversational agent
type ChatState = 'awaiting_instruction' | 'answering_questions' | 'finished';

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Welcome! What topic would you like to be screened on?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // New state variables to manage the screening process
  const [chatState, setChatState] = useState<ChatState>('awaiting_instruction');
  const [instruction, setInstruction] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- UI HELPERS ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // --- CORE LOGIC ---

  // Function to add a new message to the chat display
  const addMessage = (role: 'user' | 'bot', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };
  
  // Step 1: Handle the initial instruction from the user
  const handleInstructionSubmit = async (instructionText: string) => {
    addMessage('user', instructionText);
    setIsLoading(true);
    setInstruction(instructionText);

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
      addMessage('bot', `Great. I have ${data.questions.length} questions for you. Let's start.\n\n${data.questions[0]}`);
      setChatState('answering_questions');

    } catch (error: any) {
      console.error("Failed to fetch questions:", error);
      addMessage('bot', `Sorry, I ran into an error: ${error.message}. Please try a different topic.`);
      setChatState('awaiting_instruction'); // Reset state
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle answers and trigger final scoring when done
  const handleAnswerSubmit = async (answerText: string) => {
    addMessage('user', answerText);
    const newAnswers = [...answers, answerText];
    setAnswers(newAnswers);

    const nextQuestionIndex = currentQuestionIndex + 1;

    if (nextQuestionIndex < questions.length) {
      // Ask the next question
      setCurrentQuestionIndex(nextQuestionIndex);
      addMessage('bot', questions[nextQuestionIndex]);
    } else {
      // All questions answered, now submit for scoring
      setIsLoading(true);
      addMessage('bot', "Thank you for your answers. I'm now evaluating your screening...");
      
      try {
        const response = await fetch('http://127.0.0.1:8000/submit-screening', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction: instruction,
            questions: questions,
            answers: newAnswers,
          }),
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);

        const data = await response.json();
        if (data.status === 'error') {
           throw new Error(data.error_message || "Failed to get a score.");
        }
        
        const resultText = `**Screening Complete**\n\n**Assessment:** ${data.assessment}\n\n**Score:** ${data.score}/100`;
        addMessage('bot', resultText);
        setChatState('finished');

      } catch (error: any) {
        console.error("Failed to submit screening:", error);
        addMessage('bot', `Sorry, an error occurred during scoring: ${error.message}`);
        setChatState('awaiting_instruction'); // Reset
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Main submit handler that routes based on the current chat state
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput(''); // Clear input immediately

    if (chatState === 'awaiting_instruction') {
      await handleInstructionSubmit(currentInput);
    } else if (chatState === 'answering_questions') {
      await handleAnswerSubmit(currentInput);
    }
    // If state is 'finished', we don't do anything until user reloads (or we add a reset button)
  };

  // --- JSX RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-xl font-semibold text-center">AI Screening Agent</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`whitespace-pre-wrap max-w-lg px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg px-4 py-2 rounded-xl bg-gray-700">
              <p className="animate-pulse">AI is thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={chatState === 'finished' ? 'Screening complete. Refresh to start over.' : 'Type your message...'}
            disabled={isLoading || chatState === 'finished'}
            className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || chatState === 'finished'}
            className="px-4 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}