"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, FileText, X, Loader2, Bot, Square, Minus, Maximize2, SkipForward } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

const preprocessLaTeX = (content: string) => {
  let processedContent = content.replace(/\\\[/g, "$$$$").replace(/\\\]/g, "$$$$");
  processedContent = processedContent.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
  processedContent = processedContent.replace(/\[\s*(\\begin\{[a-zA-Z]+\}[\s\S]*?\\end\{[a-zA-Z]+\})\s*\]/g, "$$$$\n$1\n$$$$");
  return processedContent;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: {
    previewUrl: string;
    type: "image" | "pdf";
    name: string;
    color: string;
    file?: File;
  }[];
  isPending?: boolean;
}

interface AttachedFile {
  file: File;
  previewUrl: string;
  type: "image" | "pdf";
  color: string;
}

const FILE_COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4"  // cyan-500
];

interface ChatWindowProps {
  id: string;
  title: string;
  onClose: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

//implement these changes of pdf uploads and references in nexodeck project
export default function ChatWindow({ id, title, onClose, isCollapsed, onToggleCollapse, onRename }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>(messages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isNavigatingHistory, setIsNavigatingHistory] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [activeHistoryColor, setActiveHistoryColor] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlighterRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef<boolean>(true);

  useEffect(() => {
    import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
    });
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current && isAtBottomRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "auto"
      });
    }
  }, [messages, loading]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Use a smaller threshold (20px) to determine if at bottom
      // This makes it easier to "unlock" from the bottom by scrolling up
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 20;
      isAtBottomRef.current = isNearBottom;
    }
  };

  const generatePdfThumbnail = async (file: File): Promise<string | null> => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise;
        return canvas.toDataURL("image/jpeg", 0.8);
      }
      return null;
    } catch (e) {
      console.error("Failed to generate PDF thumbnail", e);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files);
    e.target.value = ""; 
    const newAttachments = await Promise.all(
      filesArray.map(async (file) => {
        const isPdf = file.type.includes("pdf");
        let previewUrl = "";
        if (isPdf) {
          previewUrl = await generatePdfThumbnail(file) || "";
        } else {
          previewUrl = URL.createObjectURL(file);
        }
        const color = FILE_COLORS[Math.floor(Math.random() * FILE_COLORS.length)];
        return { file, previewUrl, type: isPdf ? "pdf" : "image", color } as AttachedFile;
      })
    );
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      if (prev[index].previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev[index].previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const parsePdf = async (file: File) => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let text = "";
      const images: string[] = [];
      const MAX_PAGES = 5;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        text += `\n--- Slide ${i} ---\n` + pageText + "\n";
        if (i <= MAX_PAGES) {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const base64 = dataUrl.split(",")[1];
            images.push(base64);
          }
        }
      }
      return { text, images };
    } catch (error) {
      console.error("PDF processing error", error);
      throw error;
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.split(",")[1]);
      };
      reader.onerror = (err) => reject(err);
    });

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const requestInput = input;
    const requestAttachments = attachments.map(a => ({
      previewUrl: a.previewUrl,
      type: a.type,
      name: a.file.name,
      color: a.color,
      file: a.file // Include the file object for processing later
    }));

    // Add to input history immediately
    if (requestInput.trim()) {
      setInputHistory(prev => {
        const newHistory = [...prev, requestInput.trim()];
        setHistoryIndex(newHistory.length);
        return newHistory;
      });
    }

    const userMsg: Message = { 
      id: Math.random().toString(36).substring(7),
      role: "user", 
      content: requestInput,
      attachments: requestAttachments,
      isPending: loading // Mark as pending if another message is already loading
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachments([]);

    if (!loading) {
      // If nothing is loading, process this message immediately
      // Force scroll to bottom when user sends a message
      isAtBottomRef.current = true;
      processMessage(userMsg);
    }
  };

  const processMessage = React.useCallback(async (msg: Message) => {
    setLoading(true);
    
    let assistantMsgId = Math.random().toString(36).substring(7);
    
    setMessages(prev => {
      const newMsgs = [...prev];
      const targetIdx = newMsgs.findIndex(m => m.id === msg.id);
      
      if (targetIdx !== -1) {
        newMsgs[targetIdx] = { ...newMsgs[targetIdx], isPending: false };
        
        const nextIdx = targetIdx + 1;
        const existsNextA = nextIdx < newMsgs.length && newMsgs[nextIdx].role === "assistant";
        
        if (!existsNextA) {
          const assistantPlaceholder: Message = { 
            id: assistantMsgId, 
            role: "assistant", 
            content: "" 
          };
          newMsgs.splice(nextIdx, 0, assistantPlaceholder);
        } else {
          assistantMsgId = newMsgs[nextIdx].id;
        }
      }
      return newMsgs;
    });

    try {
      let finalImages: string[] = [];
      let finalPdfText = "";
      
      if (msg.attachments) {
        for (const attachmentInfo of msg.attachments) {
          if (attachmentInfo.file) {
            if (attachmentInfo.type === "pdf") {
              const { text, images } = await parsePdf(attachmentInfo.file);
              finalPdfText += `=== Document: ${attachmentInfo.file.name} ===\n${text}\n=== End of ${attachmentInfo.file.name} ===\n\n`;
              finalImages = [...finalImages, ...images];
            } else {
              const b64 = await fileToBase64(attachmentInfo.file);
              finalImages.push(b64);
            }
          }
        }
      }
      
      let currentPrompt = msg.content;
      if (finalPdfText) {
        currentPrompt = `[Attached Documents Content]\n${finalPdfText}[End of attached content]\n\n${currentPrompt}`;
      }
      
      const newMessagesPayload: Record<string, unknown>[] = [
        { role: "system", content: "You are a versatile AI assistant and tutor. CRITICAL MATH INSTRUCTION: You MUST wrap ALL mathematical expressions, equations, inline math, and block math in EXACTLY standard markdown math delimiters ($ and $$). For INLINE math, use a single $ (e.g., $E=mc^2$). For BLOCK math, use double $$ (e.g., $$ x^2 $$). NEVER use ( ), [ ], \\( \\), or \\[ \\] for math." },
        ...messagesRef.current.filter(m => m.id !== assistantMsgId && !m.isPending).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: currentPrompt, ...(finalImages.length > 0 && { images: finalImages }) }
      ];
      
      abortControllerRef.current = new AbortController();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessagesPayload }),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsgContent = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          assistantMsgContent += chunk;
          setMessages((prev) => {
            const newArray = [...prev];
            const target = newArray.find(m => m.id === assistantMsgId);
            if (target) target.content = assistantMsgContent;
            return newArray;
          });
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Generation stopped by user");
      } else {
        console.error(err);
        setMessages((prev) => {
          const newArray = [...prev];
          const target = newArray.find(m => m.id === assistantMsgId);
          if (target) target.content = "⚠️ Error generating response...";
          return newArray;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      const nextPending = messages.find(m => m.role === "user" && m.isPending);
      if (nextPending) {
        processMessage(nextPending);
      }
    }
  }, [loading, messages, processMessage]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // Update the UI to show the skip status
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastAssistantIdx = newMsgs.findLastIndex(m => m.role === "assistant");
        if (lastAssistantIdx !== -1) {
          const msg = newMsgs[lastAssistantIdx];
          if (!msg.content.trim()) {
            newMsgs[lastAssistantIdx] = { ...msg, content: "⚠️ *Skipped response...*" };
          } else if (!msg.content.includes("[Skipped the rest]")) {
            newMsgs[lastAssistantIdx] = { ...msg, content: msg.content.trim() + " \n\n*[Skipped the rest]*" };
          }
        }
        return newMsgs;
      });
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex(prev => (prev > 0 ? prev - 1 : filteredFiles.length - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex(prev => (prev < filteredFiles.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredFiles[suggestionIndex]) {
          selectSuggestion(filteredFiles[suggestionIndex].name);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === "ArrowUp") {
      if (inputHistory.length > 0) {
        e.preventDefault();
        setIsNavigatingHistory(true);
        setTimeout(() => setIsNavigatingHistory(false), 350);
        
        const newIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
        
        const nextColor = FILE_COLORS[newIndex % FILE_COLORS.length];
        setActiveHistoryColor(nextColor);

        setTimeout(() => {
          if (textareaRef.current) {
             textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
             textareaRef.current.style.height = "44px";
             textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
          }
        }, 0);
      }
    } else if (e.key === "ArrowDown") {
      if (inputHistory.length > 0) {
        e.preventDefault();
        setIsNavigatingHistory(true);
        setTimeout(() => setIsNavigatingHistory(false), 350);
        
        if (historyIndex >= 0 && historyIndex < inputHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(inputHistory[newIndex]);

          const nextColor = FILE_COLORS[newIndex % FILE_COLORS.length];
          setActiveHistoryColor(nextColor);

          setTimeout(() => {
             if (textareaRef.current) {
               textareaRef.current.style.height = "44px";
               textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
             }
          }, 0);
        } else {
          setHistoryIndex(-1);
          setInput("");
          setActiveHistoryColor("");
          setTimeout(() => { if (textareaRef.current) textareaRef.current.style.height = "44px"; }, 0);
        }
      }
    }
  };


  const selectSuggestion = (name: string) => {
    const before = input.substring(0, cursorPos - suggestionQuery.length - 1);
    const after = input.substring(cursorPos);
    const newValue = `${before}@${name} ${after}`;
    setInput(newValue);
    setShowSuggestions(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = before.length + name.length + 2;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const filteredFiles = attachments.length > 0 
    ? attachments
        .map(a => ({ name: a.file.name, color: a.color }))
        .filter(f => f.name.toLowerCase().includes(suggestionQuery.toLowerCase()))
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setInput(val);
    setCursorPos(pos);

    const textBeforeCursor = val.substring(0, pos);
    const mentionMatch = textBeforeCursor.match(/@(\w*[.\w]*)$/);
    
    if (mentionMatch) {
      setShowSuggestions(true);
      setSuggestionQuery(mentionMatch[1]);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }

    e.target.style.height = "44px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const allAtts = React.useMemo(() => {
    const map: Record<string, string> = {};
    messages.forEach(m => {
      if (m.attachments) {
        m.attachments.forEach(a => map[a.name] = a.color);
      }
    });
    attachments.forEach(a => map[a.file.name] = a.color);
    return map;
  }, [messages, attachments]);

  const processContent = (content: string) => {
    let text = preprocessLaTeX(content);
    Object.entries(allAtts).forEach(([name, color]) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}(?!\\w)`, "gi");
      text = text.replace(regex, `[@${name}](mention://${encodeURIComponent(name)}|${encodeURIComponent(color)})`);
    });
    return text;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className={`flex flex-col bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-16 shrink-0 h-full' : 'h-full flex-1'}`}
    >
      <style>{`
        @keyframes historyScramble {
          0% { filter: blur(4px) contrast(200%); opacity: 0; transform: translateY(4px); color: var(--nav-color); text-shadow: 0 0 15px var(--nav-color); }
          40% { filter: blur(2px) contrast(150%); opacity: 0.6; transform: translateY(-2px); color: var(--nav-color); text-shadow: 0 0 10px var(--nav-color); }
          100% { filter: blur(0) contrast(100%); opacity: 1; transform: translateY(0); color: inherit; text-shadow: none; }
        }
        .animate-history-text { animation: historyScramble 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>
      <header className={`shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md transition-all duration-300 ${isCollapsed ? 'px-2 py-8 flex-col h-full border-b-0 space-y-8' : 'px-6 py-4'}`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Bot className="w-5 h-5 text-indigo-500 shrink-0" />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                className="bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  if (editedTitle.trim()) onRename(id, editedTitle);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingTitle(false);
                    if (editedTitle.trim()) onRename(id, editedTitle);
                  }
                }}
                autoFocus
              />
            ) : (
              <h2 
                className="font-semibold text-slate-700 dark:text-slate-200 truncate cursor-pointer hover:text-indigo-500 transition-colors"
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename"
              >
                {title}
              </h2>
            )}
          </div>
        )}

        {isCollapsed && (
          <div className="flex-1 flex flex-col w-full h-full">
            {/* Top: Close button */}
            <div className="pt-2 flex flex-col items-center">
              <button 
                onClick={() => onClose(id)} 
                className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors"
                title="Close Window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Center: Expand button and Title */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-12">
              <button 
                onClick={() => onToggleCollapse(id)} 
                className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
                title="Expand Window"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 vertical-text whitespace-nowrap">
                {title}
              </h2>
            </div>
          </div>
        )}

        <div className={`flex items-center space-x-2 ${isCollapsed ? 'hidden' : ''}`}>
          {!isCollapsed && (
            <React.Fragment>
              <button onClick={() => onToggleCollapse(id)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => onClose(id)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </React.Fragment>
          )}
        </div>
      </header>

      {!isCollapsed && (
        <React.Fragment>
          <main 
            ref={scrollContainerRef} 
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                <Bot className="w-16 h-16" />
                <p className="mt-4">How can I help you in this chat?</p>
              </div>
            )}
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-500 text-white" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700"}`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {msg.attachments.map((att, aIdx) => (
                        <div key={aIdx} className="w-16 h-16 rounded-lg overflow-hidden border shadow-sm bg-black/10 flex items-center justify-center" style={{ borderColor: att.color }}>
                          {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <FileText className="w-5 h-5 text-white/50" />}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`prose prose-sm max-w-none break-words ${msg.role === "user" ? "prose-invert" : "dark:prose-invert"}`}>
                    {msg.isPending && (
                      <div className="flex items-center space-x-2 mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Queued in history</span>
                      </div>
                    )}
                    {msg.role === "assistant" && msg.content === "" && loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={{
                        a: ({href, children}) => {
                          if (href?.startsWith("mention://")) {
                            const [rawName, rawColor] = href.replace("mention://", "").split("|");
                            const name = decodeURIComponent(rawName);
                            const color = decodeURIComponent(rawColor);
                            return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[12px] font-bold mx-0.5 align-baseline" style={{ backgroundColor: `${color}15`, color: color }}>@{name}</span>
                          }
                          return <a href={href} className="text-indigo-500 hover:underline">{children}</a>
                        },
                        code({children, className, ...rest}: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return match ? (
                            <div className="not-prose my-2 rounded-lg overflow-hidden border border-slate-700/50">
                              <SyntaxHighlighter language={match[1]} style={vscDarkPlus as any} customStyle={{ margin: 0, fontSize: '12px' }}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                            </div>
                          ) : <code {...rest} className={className}>{children}</code>
                        }
                      }}>
                        {processContent(msg.content)}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </main>

          <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-md">
            <AnimatePresence>
              {attachments.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border-2 flex items-center justify-center shadow-sm" style={{ borderColor: att.color }}>
                      {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <FileText className="w-4 h-4" />}
                      <button onClick={() => removeAttachment(i)} className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-2 h-2" /></button>
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            <div 
               className="relative flex items-end gap-2 bg-white/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all shadow-sm"
               style={{ '--nav-color': activeHistoryColor } as any}
            >
              <AnimatePresence>
                {showSuggestions && filteredFiles.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-0 mb-4 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-20">
                    <div className="p-3 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mention File</span></div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredFiles.map((f, i) => (
                        <button key={f.name} onClick={() => selectSuggestion(f.name)} onMouseEnter={() => setSuggestionIndex(i)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors ${i === suggestionIndex ? "bg-indigo-500 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"}`}>
                          <div className={`w-2 h-2 rounded-full ${i === suggestionIndex ? 'bg-white' : ''}`} style={i === suggestionIndex ? {} : { backgroundColor: f.color }} /><span className="truncate flex-1 text-left font-bold">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <label className="p-2 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0 transition-colors">
                <Paperclip className="w-5 h-5" />
                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </label>

              <div className="flex-1 relative min-h-[44px]">
                <div 
                  ref={highlighterRef}
                  className={`absolute inset-0 pointer-events-none py-3 px-0 text-sm whitespace-pre-wrap break-words overflow-hidden text-slate-700 dark:text-slate-200 leading-relaxed ${isNavigatingHistory ? 'animate-history-text' : ''}`}
                  style={{ font: 'inherit', letterSpacing: 'inherit' }}
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      let h = input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                      Object.entries(allAtts).forEach(([name, color]) => {
                        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`@${escapedName}(?!\\w)`, "gi");
                        // 1. Remove font-weight: 900 (it changes character width)
                        // 2. Use tiny text-shadow to give 'bold' feel without changing width
                        // 3. Keep background and box-shadow for the 'pill' look
                        h = h.replace(regex, `<span style="color: ${color}; background: ${color}15; box-shadow: 0 0 0 2px ${color}15; border-radius: 4px; text-shadow: 0 0 0.5px currentColor;">@${name}</span>`);
                      });
                      return h + (input.endsWith('\n') ? '<br/>&nbsp;' : '');
                    })()
                  }}
                />
                <textarea
                  ref={textareaRef}
                  className="w-full max-h-48 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-0 text-sm outline-none leading-relaxed relative z-10 block"
                  style={{ 
                    color: 'transparent', 
                    WebkitTextFillColor: 'transparent',
                    caretColor: '#6366f1',
                    font: 'inherit'
                  } as any}
                  placeholder="Ask something..."
                  rows={1}
                  value={input}
                  onScroll={(e) => {
                    if (highlighterRef.current) highlighterRef.current.scrollTop = (e.currentTarget.scrollTop);
                  }}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {loading ? (
                <button 
                  onClick={stopGeneration} 
                  className={`p-2.5 text-white rounded-xl shadow-lg active:scale-95 transition-all ${messages.some(m => m.isPending) ? 'bg-amber-500 shadow-amber-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}
                  title={messages.some(m => m.isPending) ? "Skip to next" : "Stop generation"}
                >
                  {messages.some(m => m.isPending) ? (
                    <SkipForward className="w-4 h-4 fill-current" />
                  ) : (
                    <Square className="w-4 h-4 fill-current" />
                  )}
                </button>
              ) : (
                <button onClick={sendMessage} disabled={!input.trim() && attachments.length === 0} className="p-2.5 bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"><Send className="w-4 h-4" /></button>
              )}
            </div>
          </div>
        </React.Fragment>
      )}
    </motion.div>
  );
}
