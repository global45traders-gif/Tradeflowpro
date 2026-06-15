import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Zap, Plus, Trash2, MessageSquare, Menu, X } from 'lucide-react';
import { Trade, TradingAccount, Message } from '../utils/types';
import { formatCurrencyWithSign } from '../utils/format';
import { supabase } from '../utils/supabaseClient';

interface AICoachViewProps {
  trades: Trade[];
  account: TradingAccount;
  currency: string;
  stats: {
    totalPnL: number;
    winRate: number;
    profitFactor: number | string;
    avgRR: number;
    winsCount: number;
    lossesCount: number;
    avgWin: number;
    avgLoss: number;
  };
}

interface ChatSession {
  chat_id: string;
  chat_title: string;
  last_activity: string;
}

export default function AICoachView({ trades, account, currency, stats }: AICoachViewProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Fetch unique chat sessions
  const fetchChats = async () => {
    setChatsLoading(true);
    try {
      // 1. Try the database RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_chats');
      if (!rpcErr && rpcData) {
        setChats(rpcData);
        if (rpcData.length > 0 && !activeChatId) {
          setActiveChatId(rpcData[0].chat_id);
        } else if (rpcData.length === 0) {
          startNewChat();
        }
        setChatsLoading(false);
        return;
      }
    } catch (err) {}

    // 2. Fallback: Query and group in memory
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('chat_id, chat_title, timestamp')
        .order('timestamp', { ascending: false });

      if (data) {
        const uniqueChatsMap = new Map();
        data.forEach((m: any) => {
          if (!uniqueChatsMap.has(m.chat_id)) {
            uniqueChatsMap.set(m.chat_id, {
              chat_id: m.chat_id,
              chat_title: m.chat_title,
              last_activity: m.timestamp,
            });
          }
        });
        const chatsList = Array.from(uniqueChatsMap.values()) as ChatSession[];
        setChats(chatsList);
        if (chatsList.length > 0 && !activeChatId) {
          setActiveChatId(chatsList[0].chat_id);
        } else if (chatsList.length === 0) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setChatsLoading(false);
    }
  };

  // Load messages for active chat
  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
    }
  }, [activeChatId]);

  const loadMessages = async (chatId: string) => {
    // If it's a completely new, unsaved chat, initialize with welcome text
    const chatExists = chats.some(c => c.chat_id === chatId);
    if (!chatExists) {
      initializeWelcomeMessage();
      return;
    }

    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });

      if (data && data.length > 0) {
        const mapped = data.map((m: any) => ({
          id: m.id,
          sender: m.sender as 'user' | 'ai',
          text: m.text,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(mapped);
      } else {
        initializeWelcomeMessage();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      initializeWelcomeMessage();
    } finally {
      setMessagesLoading(false);
    }
  };

  const initializeWelcomeMessage = () => {
    const revengeCount = trades.filter((t) => t.emotion === 'Revenge').length;
    const fomoCount = trades.filter((t) => t.emotion === 'FOMO').length;
    const cur = currency || 'INR';

    let welcomeText = `Hello! I am your **TradeFlow AI Coach**. I've just audited your journal. 📈\n\n`;

    if (trades.length === 0) {
      welcomeText += `I see your journal is currently empty. To get personalized psychological audits and risk-management reviews, log your recent trades! For now, feel free to ask me general questions about trading discipline, risk management, or position sizing.`;
    } else {
      welcomeText += `You have logged **${trades.length} trades** with a **Win Rate of ${stats.winRate}%** and a net PnL of **${formatCurrencyWithSign(stats.totalPnL, cur)}**. \n\n`;
      
      if (revengeCount > 0 || fomoCount > 0) {
        welcomeText += `⚠️ **Psychological Alert:** I detected **${revengeCount} Revenge** and **${fomoCount} FOMO** trades in your log. Your emotional discipline is directly impacting your bottom line. \n\n`;
      } else {
        welcomeText += `🎉 **Excellent Discipline:** You have kept your emotions under control with zero Revenge or FOMO trades. Keep up the high-discipline execution! \n\n`;
      }
      
      welcomeText += `How would you like to proceed? Click a quick topic below or type your question!`;
    }

    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: welcomeText,
        timestamp: new Date(),
      },
    ]);
  };

  const startNewChat = () => {
    // Generate new UUID-like format for unique session identification
    const newId = 'chat_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setActiveChatId(newId);
    setMessages([]);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('chat_id', chatId);

      if (!error) {
        setChats(prev => prev.filter(c => c.chat_id !== chatId));
        if (activeChatId === chatId) {
          const remaining = chats.filter(c => c.chat_id !== chatId);
          if (remaining.length > 0) {
            setActiveChatId(remaining[0].chat_id);
          } else {
            startNewChat();
          }
        }
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || !activeChatId) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // Is this the first user message? Determine chat title.
    const isFirstMsg = messages.length <= 1; // 1 is welcome message
    let chatTitle = 'New Chat';
    if (isFirstMsg) {
      const firstWords = textToSend.split(' ').slice(0, 5).join(' ');
      chatTitle = firstWords.length > 25 ? firstWords.substring(0, 22) + '...' : firstWords;
    } else {
      const existing = chats.find(c => c.chat_id === activeChatId);
      if (existing) chatTitle = existing.chat_title;
    }

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // 1. Insert user message to database
      await supabase.from('ai_conversations').insert({
        chat_id: activeChatId,
        chat_title: chatTitle,
        sender: 'user',
        text: textToSend,
        user_id: authUser.id,
      });

      // 2. Generate AI reply
      const aiReply = generateAIResponse(textToSend);

      // 3. Insert AI response to database
      await supabase.from('ai_conversations').insert({
        chat_id: activeChatId,
        chat_title: chatTitle,
        sender: 'ai',
        text: aiReply,
        user_id: authUser.id,
      });

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

      // Reload chats list to show updated title / new session
      fetchChats();
    } catch (err) {
      console.error('Error saving chat message:', err);
      setIsTyping(false);
    }
  };

  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase();
    const revengeCount = trades.filter((t) => t.emotion === 'Revenge').length;
    const fomoCount = trades.filter((t) => t.emotion === 'FOMO').length;
    const patienceCount = trades.filter((t) => t.emotion === 'Patience').length;

    if (q.includes('audit') || q.includes('performance') || q.includes('analyze')) {
      if (trades.length === 0) {
        return `I cannot perform a full audit yet because your trading journal is empty. Please log some trades with date, entry/exit prices, and emotion tags so I can analyze your mathematical edge and emotional biases!`;
      }
      return `📋 **TRADEFLOW JOURNAL AUDIT REPORT**\n\n` +
        `• **Mathematical Edge:** Your Win Rate is **${stats.winRate}%** with a Profit Factor of **${stats.profitFactor}**. This indicates a ${Number(stats.winRate) >= 50 ? 'solid mechanical edge' : 'weak mechanical edge'}.\n` +
        `• **Risk-To-Reward (R:R):** Your average R:R is **1 : ${stats.avgRR}**. Your average winning trade is **+${formatCurrencyWithSign(stats.avgWin, currency).replace('+', '')}** while your average losing trade is **-${formatCurrencyWithSign(stats.avgLoss, currency).replace('+', '')}**.\n` +
        `• **Psychological Review:** You logged **${revengeCount} Revenge** trades and **${fomoCount} FOMO** trades. Revenge trading is currently your biggest profit drain.\n\n` +
        `💡 **My Recommendation:** Try capping your maximum daily losses to ${formatCurrencyWithSign(account.capital * 0.02, currency).replace('+', '')} (2% of capital) to prevent revenge trading spirals.`;
    }

    if (q.includes('emotion') || q.includes('psychology') || q.includes('revenge') || q.includes('fomo') || q.includes('discipline')) {
      if (revengeCount > 0 || fomoCount > 0) {
        return `🧠 **PSYCHOLOGY DEEP DIVE**\n\n` +
          `I noticed you had some emotional trades logged recently. Let's break them down:\n` +
          `• **Revenge Trading (${revengeCount} cases):** This usually happens right after a loss. You over-leverage to "win back" the money. This breaks your system and compounds your losses.\n` +
          `• **FOMO Trading (${fomoCount} cases):** This occurs when you jump into a stock mid-rally without waiting for a proper pullback. You buy at the top and get stopped out.\n\n` +
          `🔧 **Discipline Action Plan:**\n` +
          `1. **The 3-Loss Rule:** Shut down your terminal for the day after 3 consecutive losses.\n` +
          `2. **Consolidation Rule:** Never buy a breakout unless it consolidates on the 5-minute or 15-minute timeframe for at least 3 candles.`;
      }
      return `🧠 **PSYCHOLOGY STATUS: EXCELLENT**\n\n` +
        `You have logged **${patienceCount} Patience** setup trades and **0 Revenge/FOMO** trades. This shows exceptional emotional restraint, which is the hallmark of top-performing disciplined traders.\n\n` +
        `Keep maintaining this strict rule-based approach! Never enter a trade unless it matches your pre-defined setup.`;
    }

    if (q.includes('risk') || q.includes('size') || q.includes('capital') || q.includes('stop loss')) {
      const recommendedRisk = account.capital * (account.riskPerTradePercent / 100);
      return `🛡️ **RISK MANAGEMENT & SIZING COACHING**\n\n` +
        `Based on your starting Capital of **${formatCurrencyWithSign(account.capital, currency).replace('+', '')}** and a **${account.riskPerTradePercent}% risk limit**:\n` +
        `• **Maximum Allowed Risk per Trade:** **${formatCurrencyWithSign(recommendedRisk, currency).replace('+', '')}**\n` +
        `• **Position Sizing Rule:** For any stock, your maximum shares = \`Allowed Risk / (Entry Price - Stop Loss)\`.\n\n` +
        `⚠️ **The Golden Rules:**\n` +
        `1. Never risk more than 2% of your capital on a single intraday or swing trade.\n` +
        `2. Always enter your Stop Loss order directly in your broker terminal the instant your trade is filled. Do not rely on "mental stop losses".`;
    }

    return `💡 **TradeFlow Pro AI Coach Feedback**\n\n` +
      `That is an excellent question. In the stock market, consistency is driven by 3 pillars:\n` +
      `1. **System Edge:** Having a high-probability setup (e.g. CPR pullbacks, gap fill strategies, ascending triangle breakouts).\n` +
      `2. **Risk Management:** Never taking a trade where the potential reward is less than 1.5x your risk.\n` +
      `3. **Strict Psychology:** Log every trade in your journal. Reviewing your logs daily helps build the neural pathways for discipline.\n\n` +
      `Feel free to ask specifically about: "Give me an audit", "How is my trading psychology", or "Coach me on risk management".`;
  };

  const quickReplies = [
    'Give me an audit of my performance',
    'How is my trading psychology?',
    'Coach me on risk management',
  ];

  return (
    <div className="flex h-[calc(100vh-10rem)] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden relative">
      {/* Chats List Sidebar (ChatGPT style) */}
      <div className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 w-60 flex-shrink-0 transition-transform duration-250 z-20 absolute md:relative inset-y-0 left-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-r-0'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Chats History</span>
          <button
            onClick={startNewChat}
            title="Start new chat session"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatsLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <span className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></span>
              <span className="text-[10px] text-slate-400 dark:text-slate-600">Loading chats...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-[10px] text-slate-400 dark:text-slate-600">No past conversations</div>
          ) : (
            chats.map(c => {
              const isActive = c.chat_id === activeChatId;
              return (
                <div
                  key={c.chat_id}
                  onClick={() => {
                    setActiveChatId(c.chat_id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors group/item ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-950 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate pr-1">
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                    <span className="truncate">{c.chat_title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => deleteChat(c.chat_id, e)}
                    className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-slate-900">
        {/* Bot Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4 relative">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1 rounded hover:bg-slate-250 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                <Bot className="h-5 w-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <span>TradeFlow AI Coach</span>
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Personalized trading psychology & discipline diagnostics</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">REAL-TIME ANALYSIS ACTIVE</span>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <span className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full"></span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading conversation history...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[85%] items-start space-x-2.5 rounded-2xl p-4 text-xs leading-relaxed shadow-sm
                    ${
                      msg.sender === 'user'
                        ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-medium'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                    }
                  `}
                >
                  {msg.sender === 'ai' && (
                    <div className="mt-0.5 rounded bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="whitespace-pre-line font-medium text-slate-900 dark:text-slate-100">
                      {msg.text.split('\n').map((line, lIdx) => {
                        const parts = line.split('**');
                        return (
                          <p key={lIdx}>
                            {parts.map((part, pIdx) =>
                              pIdx % 2 === 1 ? <strong key={pIdx} className={msg.sender === 'user' ? 'font-extrabold text-slate-950' : 'text-slate-950 dark:text-white font-extrabold'}>{part}</strong> : part
                            )}
                          </p>
                        );
                      })}
                    </div>
                    <div className={`text-[9px] text-right mt-1 font-mono ${msg.sender === 'user' ? 'text-slate-800' : 'text-slate-400 dark:text-slate-500'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] items-center space-x-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-500 dark:text-slate-400 rounded-tl-none shadow-sm">
                <div className="rounded bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                  <Bot className="h-3.5 w-3.5 animate-bounce" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-semibold">AI Coach is reviewing your setups...</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse delay-75"></span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse delay-150"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Quick Chips */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 px-4 py-2 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Suggestions:</span>
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => handleSend(reply)}
              className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex space-x-2"
          >
            <input
              type="text"
              placeholder="Ask AI Coach (e.g. 'How is my trading psychology?', 'Give me an audit')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-xs font-medium text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="rounded-xl bg-emerald-500 p-3 text-slate-950 shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
