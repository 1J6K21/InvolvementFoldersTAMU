"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Bot, MessageSquarePlus, History, X, RefreshCw } from "lucide-react";
import ChatWindow from "./components/ChatWindow";

interface Session {
  id: string;
  title: string;
  isCollapsed: boolean;
  messages?: any[]; // For persistence
}

interface HistoryItem {
  id: string;
  title: string;
  closedAt: number;
}

export default function MultiChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from local storage
  useEffect(() => {
    const savedSessions = localStorage.getItem("chat_sessions");
    const savedHistory = localStorage.getItem("chat_history");
    
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    } else {
      setSessions([{ id: "1", title: "Chat 1", isCollapsed: false }]);
    }
    
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    
    setIsMounted(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("chat_sessions", JSON.stringify(sessions));
      localStorage.setItem("chat_history", JSON.stringify(history));
    }
  }, [sessions, history, isMounted]);

  const addSession = () => {
    const newId = Math.random().toString(36).substring(7);
    const newSession: Session = {
      id: newId,
      title: `Chat ${sessions.length + history.length + 1}`,
      isCollapsed: false
    };
    setSessions((prev) => [...prev, newSession]);
  };

  const closeSession = (id: string) => {
    const sessionToClose = sessions.find(s => s.id === id);
    if (sessionToClose) {
      setHistory(prev => [{ id: sessionToClose.id, title: sessionToClose.title, closedAt: Date.now() }, ...prev].slice(0, 20));
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleCollapse = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isCollapsed: !s.isCollapsed } : s))
    );
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  const restoreSession = (item: HistoryItem) => {
    const newSession: Session = {
      id: item.id,
      title: item.title,
      isCollapsed: false
    };
    setSessions(prev => [...prev, newSession]);
    setHistory(prev => prev.filter(h => h.id !== item.id));
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* Dynamic Header Title */}
      <div className="shrink-0 flex items-center justify-center pt-8 pb-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-1">
            <Bot className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent tracking-tighter">
              Jonathans Local LLMs
            </h1>
          </div>
          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent rounded-full" />
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden px-8 pb-8 gap-8 flex items-stretch scroll-smooth bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-50/10 via-transparent to-transparent">
        
        {/* Left Toggle: History */}
        <div className="flex items-stretch shrink-0">
           <div className={`relative flex transition-all duration-500 ease-in-out ${isHistoryOpen ? 'w-64' : 'w-[64px]'}`}>
              <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`w-16 h-full rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-400 dark:hover:border-indigo-900 group transition-all shrink-0 bg-transparent hover:bg-indigo-50/10 z-10 ${isHistoryOpen ? 'border-indigo-500 text-indigo-500' : ''}`}
              >
                <div className="p-3 rounded-full border-2 border-slate-200 dark:border-slate-800 group-hover:border-indigo-400 mb-2 transition-colors">
                  <History className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] vertical-text">History Log</span>
              </button>

              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute left-[72px] top-0 bottom-0 w-56 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col z-0"
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recents</span>
                       <button onClick={() => setHistory([])} className="text-[10px] font-bold text-rose-500 hover:underline">Clear</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40 text-center">
                          <RefreshCw className="w-8 h-8 mb-2" />
                          <p className="text-[10px] font-bold uppercase">No closed sessions</p>
                        </div>
                      ) : (
                        history.map(item => (
                          <div key={item.id} className="group relative flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 shadow-sm transition-all cursor-pointer" onClick={() => restoreSession(item)}>
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                              <p className="text-[9px] text-slate-400">{new Date(item.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>

        {/* Sessions List */}
        <AnimatePresence mode="popLayout" initial={false}>
          {sessions.length === 0 && !isHistoryOpen ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-slate-400"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[100px] opacity-10" />
                <MessageSquarePlus className="w-24 h-24 opacity-20 relative z-10" />
              </div>
              <div className="text-center relative z-10">
                <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-tight">Workspace Empty</h3>
                <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">
                  Launch a new parallel chat session or restore a past one from the history log.
                </p>
              </div>
            </motion.div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id} 
                className={`transition-all duration-500 ease-in-out ${session.isCollapsed ? 'w-16 shrink-0' : 'w-[450px] md:w-[600px] lg:w-[680px] shrink-0 h-full'}`}
              >
                <ChatWindow
                  id={session.id}
                  title={session.title}
                  onClose={closeSession}
                  isCollapsed={session.isCollapsed}
                  onToggleCollapse={toggleCollapse}
                  onRename={renameSession}
                />
              </div>
            ))
          )}
        </AnimatePresence>

        {/* Right Toggle: Add Session */}
        <div className="flex items-stretch shrink-0">
          <button 
            onClick={addSession}
            className="w-16 h-full rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-400 dark:hover:border-indigo-900 group transition-all shrink-0 bg-transparent hover:bg-indigo-50/10"
          >
            <div className="p-3 rounded-full border-2 border-slate-200 dark:border-slate-800 group-hover:border-indigo-400 mb-2 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] vertical-text">New Window</span>
          </button>
        </div>
      </main>

      <style jsx global>{`
        ::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
        @keyframes gradient-text {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-text {
          animation: gradient-text 5s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 2px;
          border: none;
        }
      `}</style>
    </div>
  );
}
