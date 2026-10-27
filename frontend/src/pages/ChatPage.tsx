import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Plus, Sparkles, MessageSquare, Bot, User, Image as ImageIcon } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPageProps {
  navigate: (route: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ navigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'user',
      text: 'How do I make better Warli human figures?',
      timestamp: '10:30 AM'
    },
    {
      id: 'm-2',
      sender: 'assistant',
      text: `Warli human figures are constructed using simple geometric harmony. Here are the core traditional principles:

1. **Torso**: Use two touching triangles meeting at their vertices (inverted points). The upper triangle represents the chest, and the lower represents the hips.
2. **Head**: Draw a simple circle perched directly above without realistic facial features.
3. **Limbs**: Keep lines simple and clean with single unshaded strokes.
4. **Proportions**: Maintain proportional balance (1:2:2 ratio between head, torso, and legs).
5. **Dynamic Movement**: Angle elbows and knees to show action—holding hands, dancing, or carrying baskets.

Would you like me to show some reference images from our mastercraft archive?`,
      timestamp: '10:31 AM',
      suggestions: ['Show Warli Tarpa dance reference', 'How to draw Warli animals', 'Madhubani fish motif tips'],
      references: ['/assets/art-forms/warli.jpg', '/assets/analysis/warli-sample.jpg']
    }
  ]);

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Warli human figures',
    'Madhubani color palette',
    'Pottery shaping tips',
    'Kalamkari motifs',
    'Gond pattern ideas',
    'Double-line border rules'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text, art_form: 'warli' })
      });

      if (!res.ok) throw new Error('Failed to get coach response');
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions,
        references: data.references
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: "In traditional Indian folk art, master artisans rely on ancestral rhythm, sacred geometry, and natural pigments. Focus on steady stroke weight, flat planes, and continuous border discipline.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Warli stick figures', 'Madhubani border patterns', 'Gond dots and dashes']
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Web Speech API Voice Recognition (Free browser standard)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      alert('Speech recognition is not supported in this browser. Please use text input.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Web Speech API Speech Synthesis (Free browser standard)
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#>`]/g, ''));
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        text: "Namaste! I am your Parampara Proof Folk Art Coach. How can I guide your practice in Warli, Madhubani, Gond, Kalamkari, or Pottery today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['How to draw Warli human figures', 'Madhubani natural colors', 'Gond tree of life']
      }
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[580px]">
        
        {/* Left Sidebar (Desktop) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col justify-between bg-white rounded-3xl p-5 border border-[#EADFCF] shadow-warm">
          <div className="space-y-5">
            <button
              onClick={handleNewChat}
              className="w-full py-3 rounded-full bg-forest text-white font-semibold text-xs sm:text-sm hover:bg-forest-light transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-3 px-1">
                Suggested Questions
              </h4>
              <div className="space-y-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(`Tell me about ${q}`)}
                    className="w-full p-2.5 rounded-xl text-left text-xs font-medium text-[#44403C] hover:text-terracotta hover:bg-[#FAF7F2] border border-[#EADFCF]/60 transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-terracotta" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ethics Banner */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADFCF] text-xs text-[#78716C] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-forest">
              <Bot className="w-3.5 h-3.5 text-terracotta" />
              <span>Knowledge Grounded</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Answers come from the team's curated knowledge base (not yet expert-reviewed). Rule/retrieval-based, no paid AI.
            </p>
          </div>
        </div>

        {/* Right Main Chat Container */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white rounded-3xl border border-[#EADFCF] shadow-warm overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-4 sm:p-5 border-b border-[#EADFCF] bg-[#FAF7F2]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center font-bold text-xs">
                PP
              </div>
              <div>
                <h3 className="font-editorial text-lg font-bold text-forest">
                  Chat with Parampara AI
                </h3>
                <span className="text-[11px] text-[#78716C] block">
                  Ask questions, get technique guidance, and study reference motifs
                </span>
              </div>
            </div>

            <button
              onClick={handleNewChat}
              className="lg:hidden p-2 rounded-full text-forest hover:bg-[#EADFCF] transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-2xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    m.sender === 'user' ? 'bg-terracotta text-white' : 'bg-forest text-white'
                  }`}
                >
                  {m.sender === 'user' ? 'U' : 'AI'}
                </div>

                {/* Message Body */}
                <div className="space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-forest text-white rounded-tr-none'
                        : 'bg-[#FAF7F2] text-[#292524] border border-[#EADFCF] rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.text}</div>

                    {/* Speech reader button for AI replies */}
                    {m.sender === 'assistant' && (
                      <div className="pt-2 mt-2 border-t border-[#EADFCF]/60 flex justify-end">
                        <button
                          onClick={() => speakText(m.text)}
                          className="text-[11px] text-[#78716C] hover:text-terracotta flex items-center gap-1"
                          title="Listen to advice"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reference Thumbnails */}
                  {m.references && m.references.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {m.references.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => navigate('/art-forms/warli')}
                          className="w-20 h-14 rounded-xl overflow-hidden border border-[#D5C4AC] shadow-xs cursor-pointer hover:scale-105 transition-transform"
                        >
                          <img src={img} alt="Reference" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested follow-up pills */}
                  {m.suggestions && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(s)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-[#EADFCF] text-forest hover:bg-forest hover:text-white transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADFCF] rounded-tl-none">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                    <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                    <span>Searching crafts archive...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Listening sound wave indicator if microphone active */}
          {isListening && (
            <div className="px-4 py-2 bg-terracotta/10 border-t border-terracotta/30 flex items-center justify-between text-xs text-terracotta">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-terracotta animate-ping" />
                <span>Listening... speak your question now</span>
              </span>
              <button
                onClick={toggleListening}
                className="font-bold underline text-xs"
              >
                Stop
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 sm:p-4 border-t border-[#EADFCF] bg-[#FAF7F2]/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-white rounded-full p-1.5 border border-[#D5C4AC] shadow-sm focus-within:border-terracotta transition-all"
            >
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${
                  isListening ? 'bg-terracotta text-white' : 'text-[#78716C] hover:text-forest'
                }`}
                title="Voice input"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your traditional art question..."
                className="flex-1 text-xs sm:text-sm px-2 outline-none bg-transparent placeholder:text-[#A8A29E]"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className={`p-2.5 rounded-full text-white transition-all ${
                  input.trim() ? 'bg-terracotta hover:bg-terracotta-hover shadow-sm active:scale-95' : 'bg-[#D5C4AC] cursor-not-allowed'
                }`}
                aria-label="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
