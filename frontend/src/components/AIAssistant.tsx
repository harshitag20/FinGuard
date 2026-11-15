import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, X, Send, Sparkles, Volume2, Loader2, BookOpen, 
  ShieldCheck, AlertCircle, RefreshCw, Layers, CheckCircle2, Bot, HelpCircle,
  Activity, FlaskConical, Bell
} from 'lucide-react';
import { usePond, useTheme, useLanguage, useNavigation } from '../App';
import { getGeminiAnalysis, speakWithElevenLabs, speakWithFallback } from '../services/aiAssistantService';
import { api } from '../services/apiService';

interface ProvenanceInfo {
  type: 'VERIFIED_DATA' | 'FARMER_OBSERVATION' | 'SIMULATED_TELEMETRY' | 'RESEARCH_LITERATURE' | 'AI_HYPOTHESIS';
  label: string;
  sourceText?: string;
}

interface ChatEntry {
  role: 'user' | 'ai';
  text: string;
  provenance?: ProvenanceInfo;
  toolsUsed?: string[];
  isFallback?: boolean;
  provider?: string;
}

const AIAssistant: React.FC = () => {
  const { pond } = usePond();
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const { navigate } = useNavigation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'farm_agent' | 'general_ai'>('farm_agent');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPremiumVoice, setIsPremiumVoice] = useState(true);
  const [query, setQuery] = useState('');
  const [agentStatus, setAgentStatus] = useState<'online' | 'dormant' | 'offline'>('dormant');
  const [isResearching, setIsResearching] = useState(false);
  const [researchNotice, setResearchNotice] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<ChatEntry[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const farmId = pond.id || 'FARM-001';

  // Check FarmAgent health on open
  useEffect(() => {
    if (isOpen) {
      api.getFarmAgentStatus(farmId).then(res => {
        setAgentStatus(res.status);
      }).catch(() => setAgentStatus('dormant'));
    }
  }, [isOpen, farmId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      const langMap: Record<string, string> = {
        hi: 'hi-IN',
        te: 'te-IN',
        bn: 'bn-IN',
        mr: 'mr-IN',
        ta: 'ta-IN',
        en: 'en-IN'
      };
      recognitionRef.current.lang = langMap[lang] || 'en-IN'; 

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        handleSendMessage(text);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Recognition Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis.cancel();
    };
  }, [lang]);

  const classifyProvenance = (text: string, toolsUsed?: string[]): ProvenanceInfo => {
    const lower = text.toLowerCase();
    if (toolsUsed && (toolsUsed.includes('get_diagnostics') || toolsUsed.includes('list_diagnostic_history'))) {
      return { type: 'VERIFIED_DATA', label: 'Verified Central Diagnostic Record' };
    }
    if (toolsUsed && toolsUsed.includes('get_farmer_observations')) {
      return { type: 'FARMER_OBSERVATION', label: 'Farmer-Reported Observation' };
    }
    if (lower.includes('simulated') || (toolsUsed && toolsUsed.includes('get_telemetry'))) {
      return { type: 'SIMULATED_TELEMETRY', label: 'Pond Water Quality Telemetry' };
    }
    if (lower.includes('icar') || lower.includes('fao') || lower.includes('literature') || lower.includes('research')) {
      return { type: 'RESEARCH_LITERATURE', label: 'Scientific Literature Reference (ICAR-CIFA)' };
    }
    return { type: 'AI_HYPOTHESIS', label: 'AI Diagnostic Hypothesis (Not Lab-Confirmed)' };
  };

  const handleSendMessage = async (textToUse?: string) => {
    const message = textToUse || query;
    if (!message.trim()) return;

    setQuery('');
    setTranscript(prev => [...prev, { role: 'user', text: message }]);
    setIsProcessing(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();

    try {
      if (activeTab === 'farm_agent') {
        // Route to FarmAgent via FinGuard Core Express Gateway
        const agentRes = await api.sendFarmAgentMessage(farmId, message);
        const prov = classifyProvenance(agentRes.response, agentRes.tools_used);
        
        setTranscript(prev => [
          ...prev,
          {
            role: 'ai',
            text: agentRes.response,
            provenance: prov,
            toolsUsed: agentRes.tools_used,
            isFallback: agentRes.is_fallback
          }
        ]);
      } else {
        // Route to Governed Model Gateway (Prune / Gemini)
        const aiRes = await api.sendGovernedAIChat(message, 'general_text', farmId);
        setTranscript(prev => [
          ...prev,
          {
            role: 'ai',
            text: aiRes.content,
            provider: aiRes.provider,
            provenance: { type: 'RESEARCH_LITERATURE', label: `Model Gateway (${aiRes.provider})` }
          }
        ]);
      }
    } catch (err) {
      console.error("Chat Error:", err);
      // Fallback to local audio/visual engine
      const fallback = await getGeminiAnalysis(message, pond, lang);
      setTranscript(prev => [...prev, { role: 'ai', text: fallback.text }]);
      if (fallback.navigate) {
        setTimeout(() => navigate(fallback.navigate!), 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartResearch = async () => {
    if (!query.trim()) {
      alert("Please enter a research topic or question in the box below.");
      return;
    }
    const topic = query.trim();
    setQuery('');
    setIsResearching(true);
    setResearchNotice(`Dispatching asynchronous scientific research inquiry for: "${topic}"...`);

    try {
      const task = await api.createFarmAgentResearch(farmId, topic);
      setResearchNotice(`Research Task ${task.research_task_id} registered. Sourcing ICAR-CIFA & FAO literature...`);
      
      setTimeout(async () => {
        const polled = await api.getFarmAgentResearchTask(farmId, task.research_task_id);
        setIsResearching(false);
        setResearchNotice(null);
        setTranscript(prev => [
          ...prev,
          { role: 'user', text: `Deep Literature Inquiry: ${topic}` },
          {
            role: 'ai',
            text: polled.findings || task.findings || 'Research literature findings compiled.',
            provenance: { type: 'RESEARCH_LITERATURE', label: 'Peer-Reviewed Scientific Synthesis' }
          }
        ]);
      }, 1500);
    } catch {
      setIsResearching(false);
      setResearchNotice(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-28 right-6 z-[70] flex flex-col items-end pointer-events-auto select-none">
        {/* Attention-grabbing message bubble over Finn */}
        <div 
          onClick={() => setIsOpen(true)}
          className="mb-2.5 cursor-pointer animate-bounce transform transition-transform hover:scale-105 active:scale-95"
          role="button"
          tabIndex={0}
          aria-label="Open Finn AI Assistant"
        >
          <div className="relative bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-1.5 rounded-2xl shadow-xl border-2 border-blue-400/60 dark:border-blue-600 flex items-center space-x-1.5">
            <span className="text-xs font-black tracking-tight text-blue-600 dark:text-blue-400 whitespace-nowrap">
              Hi , I am Finn 👋
            </span>
            {/* Pointer tail pointing down towards Finn mascot button */}
            <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-white dark:bg-slate-800 border-r-2 border-b-2 border-blue-400/60 dark:border-blue-600 rotate-45 transform"></div>
          </div>
        </div>

        {/* Floating Mascot Button */}
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center p-1 shadow-2xl shadow-blue-500/40 active:scale-90 hover:scale-105 transition-all group overflow-hidden border-2 border-white/90 relative"
          title="Ask Finn - FinGuard AI Agent"
          aria-label="Open Finn AI Agent"
        >
          <img 
            src="/mascot.png" 
            alt="Finn Mascot" 
            className="w-full h-full object-contain rounded-full group-hover:rotate-6 transition-transform"
          />
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsOpen(false)} />
      
      <div className={`mt-auto w-full max-w-lg mx-auto rounded-[2.5rem] p-4 sm:p-5 shadow-2xl relative animate-in slide-in-from-bottom-20 duration-500 border flex flex-col max-h-[88vh] ${
        theme === 'dark' ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        
        {/* Header with Mascot in Top Left */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2.5">
            {/* Mascot in Top Left */}
            <div className="relative shrink-0">
              <img 
                src="/mascot.png" 
                alt="Finn Mascot" 
                className="w-10 h-10 rounded-full object-contain bg-blue-100 p-0.5 border border-blue-200 shadow-sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  Finn • {activeTab === 'farm_agent' ? `Farm Intelligence [${farmId}]` : 'Governed Model Gateway'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  agentStatus === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {agentStatus === 'online' ? 'Agent Live' : 'Standby'}
                </span>
              </div>
              <p className={`text-[10px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeTab === 'farm_agent' ? 'Maritime micro-VM persistent memory' : 'Prune model policy & receipt validation'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl mb-3 text-[11px] font-black uppercase tracking-wider ${
          theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
        }`}>
          <button
            onClick={() => setActiveTab('farm_agent')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'farm_agent' 
                ? (theme === 'dark' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            Farm Agent
          </button>
          <button
            onClick={() => setActiveTab('general_ai')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'general_ai' 
                ? (theme === 'dark' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            Prune Gateway
          </button>
        </div>

        {/* Research Notification Banner */}
        {researchNotice && (
          <div className={`p-2.5 mb-3 rounded-xl flex items-center space-x-2 text-xs border ${
            theme === 'dark' ? 'bg-blue-950/40 text-blue-300 border-blue-900/50' : 'bg-blue-50 text-blue-700 border-blue-200/50'
          }`}>
            <Loader2 size={14} className="animate-spin shrink-0 text-blue-500" />
            <span className="text-[10px] font-bold">{researchNotice}</span>
          </div>
        )}

        {/* Chat Transcript Area */}
        <div className="max-h-[380px] sm:max-h-[430px] overflow-y-auto mb-3 space-y-3.5 no-scrollbar flex flex-col pr-1">
          
          {/* FIRST MESSAGE: Finn Welcome Greeting with Mascot and 4 Well-Spaced Capability Cards */}
          <div className="flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <img 
              src="/mascot.png" 
              alt="Finn" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-md shrink-0 object-contain bg-blue-50 border border-blue-200 mt-1"
            />

            <div className={`flex-1 p-3.5 sm:p-4 rounded-3xl rounded-tl-sm border text-xs leading-relaxed shadow-sm ${
              theme === 'dark' 
                ? 'bg-slate-800/90 border-slate-700/80 text-slate-100' 
                : 'bg-[#f0f7ff] border-blue-200/70 text-slate-900 shadow-slate-100'
            }`}>
              <h3 className="text-sm font-black tracking-tight flex items-center flex-wrap">
                <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Hi! I'm</span>
                <span className="text-blue-600 dark:text-blue-400 mx-1 underline decoration-blue-400 decoration-wavy">Finn</span>
                <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>, your FinGuard AI Agent!</span>
              </h3>
              <p className={`text-[11px] font-medium mt-1 leading-snug ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                I help you keep your aquaculture operations healthy, productive, and risk-free. Here's what I can do for you:
              </p>

              {/* 4 Feature Capability Cards (Responsive 2x2 Grid with generous space and high contrast) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                {/* 1. Diagnose */}
                <div className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-blue-100 shadow-xs'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0">
                    <strong className={`block text-[11px] font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Diagnose fish health
                    </strong>
                    <span className={`text-[10px] leading-tight block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      from observations
                    </span>
                  </div>
                </div>

                {/* 2. Simulate */}
                <div className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-purple-100 shadow-xs'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <FlaskConical size={16} />
                  </div>
                  <div className="min-w-0">
                    <strong className={`block text-[11px] font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Simulate & forecast
                    </strong>
                    <span className={`text-[10px] leading-tight block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      pond risks
                    </span>
                  </div>
                </div>

                {/* 3. Research */}
                <div className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-emerald-100 shadow-xs'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="min-w-0">
                    <strong className={`block text-[11px] font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Find trusted
                    </strong>
                    <span className={`text-[10px] leading-tight block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      research & guidelines
                    </span>
                  </div>
                </div>

                {/* 4. Monitor */}
                <div className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-amber-100 shadow-xs'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Bell size={16} />
                  </div>
                  <div className="min-w-0">
                    <strong className={`block text-[11px] font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Monitor alerts
                    </strong>
                    <span className={`text-[10px] leading-tight block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      and suggest actions
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggestion prompt & pills */}
              <p className={`text-[11px] font-medium mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                You can ask me anything, like:
              </p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  "Check the health of Pond 1",
                  "Run a 7-day risk simulation",
                  "Latest research on EMS"
                ].map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    onClick={() => handleSendMessage(promptText)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-slate-900/90 border-slate-700 text-blue-300 hover:border-blue-400 hover:bg-slate-900'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 shadow-xs'
                    }`}
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>

              <p className={`text-[11px] font-medium mt-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                How would you like to get started today?
              </p>

              <div className={`text-[9px] text-right mt-1 font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Just now
              </div>
            </div>
          </div>

          {/* Subsequent conversation messages */}
          {transcript.map((msg, i) => (
            <div key={i} className={`flex items-start space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
              {msg.role === 'ai' ? (
                <img 
                  src="/mascot.png" 
                  alt="Finn" 
                  className="w-7 h-7 rounded-full shadow-xs shrink-0 object-contain bg-blue-50 border border-blue-200 mt-0.5"
                />
              ) : null}

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1 max-w-[85%]`}>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-sm font-medium' 
                    : (theme === 'dark' ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-white/5' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-xs')
                }`}>
                  {msg.text}
                </div>

                {/* Provenance Badge */}
                {msg.provenance && (
                  <div className="flex items-center space-x-1 px-1">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      msg.provenance.type === 'VERIFIED_DATA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      msg.provenance.type === 'FARMER_OBSERVATION' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                      msg.provenance.type === 'SIMULATED_TELEMETRY' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                      msg.provenance.type === 'RESEARCH_LITERATURE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {msg.provenance.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center space-x-2 pl-9">
              <div className={`p-3 rounded-2xl rounded-tl-none flex items-center space-x-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {activeTab === 'farm_agent' ? 'Finn Querying Farm Memory...' : 'Routing Through Model Gateway...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Literature Research Trigger (FarmAgent Mode) */}
        {activeTab === 'farm_agent' && (
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={handleStartResearch}
              disabled={isResearching || !query.trim()}
              className="flex items-center space-x-1 text-[10px] font-black text-purple-600 dark:text-purple-400 hover:text-purple-700 disabled:opacity-30 uppercase tracking-wider"
            >
              <BookOpen size={12} />
              <span>Synthesize FAO/ICAR Research on this query</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleListening}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}
            title="Voice input"
          >
            <Mic size={18} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={activeTab === 'farm_agent' ? "Message farm agent..." : "Ask general aquaculture question..."}
              className={`w-full py-3 pl-4 pr-10 rounded-2xl text-xs outline-none border ${
                theme === 'dark' ? 'bg-slate-800 border-white/5 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-blue-500/50'
              }`}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={isProcessing || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 disabled:opacity-30"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
