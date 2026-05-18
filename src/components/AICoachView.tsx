import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Zap } from 'lucide-react';
import { Trade, TradingAccount, Message } from '../utils/types';
import { formatCurrencyWithSign } from '../utils/format';

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

export default function AICoachView({ trades, account, currency, stats }: AICoachViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with customized welcome message based on actual journal data!
  useEffect(() => {
    const revengeCount = trades.filter((t) => t.emotion === 'Revenge').length;
    const fomoCount = trades.filter((t) => t.emotion === 'FOMO').length;
    // Stats reference

    const cur = currency || 'USD';
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
  }, [trades.length]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate smart tailored AI responses
    setTimeout(() => {
      const aiResponseText = generateAIResponse(textToSend);
      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase();
    const revengeCount = trades.filter((t) => t.emotion === 'Revenge').length;
    const fomoCount = trades.filter((t) => t.emotion === 'FOMO').length;
    const patienceCount = trades.filter((t) => t.emotion === 'Patience').length;

    // 1. Audit Performance
    if (q.includes('audit') || q.includes('performance') || q.includes('analyze')) {
      if (trades.length === 0) {
        return `I cannot perform a full audit yet because your trading journal is empty. Please log some trades with date, entry/exit prices, and emotion tags so I can analyze your mathematical edge and emotional biases!`;
      }

      return `📋 **TRADEFLOW JOURNAL AUDIT REPORT**\n\n` +
        `• **Mathematical Edge:** Your Win Rate is **${stats.winRate}%** with a Profit Factor of **${stats.profitFactor}**. This indicates a ${Number(stats.winRate) >= 50 ? 'solid mechanical edge' : 'weak mechanical edge'}.\n` +
        `• **Risk-To-Reward (R:R):** Your average R:R is **1 : ${stats.avgRR}**. Your average winning trade is **+₹${stats.avgWin.toLocaleString('en-IN')}** while your average losing trade is **-₹${stats.avgLoss.toLocaleString('en-IN')}**. Your reward-to-risk ratio is ${stats.avgWin > stats.avgLoss ? 'highly positive' : 'negative, meaning you are letting losses run too long'}.\n` +
        `• **Psychological Review:** You logged **${revengeCount} Revenge** trades and **${fomoCount} FOMO** trades. Revenge trading is currently your biggest profit drain.\n\n` +
        `💡 **My Recommendation:** Try capping your maximum daily losses to ₹${(account.capital * 0.02).toLocaleString('en-IN')} (2% of capital) to prevent revenge trading spirals.`;
    }

    // 2. Psychological Help
    if (q.includes('emotion') || q.includes('psychology') || q.includes('revenge') || q.includes('fomo') || q.includes('discipline')) {
      if (revengeCount > 0 || fomoCount > 0) {
        return `🧠 **PSYCHOLOGY DEEP DIVE**\n\n` +
          `I noticed you had some emotional trades logged recently. Let's break them down:\n` +
          `• **Revenge Trading (${revengeCount} cases):** This usually happens right after a loss. You over-leverage to "win back" the money. This breaks your system and compounds your losses.\n` +
          `• **FOMO Trading (${fomoCount} cases):** This occurs when you jump into a stock (like NIFTY or BANKNIFTY) mid-rally without waiting for a proper pullback. You buy at the top and get stopped out.\n\n` +
          `🔧 **Discipline Action Plan:**\n` +
          `1. **The 3-Loss Rule:** Shut down your terminal for the day after 3 consecutive losses.\n` +
          `2. **Consolidation Rule:** Never buy a breakout unless it consolidates on the 5-minute or 15-minute timeframe for at least 3 candles.`;
      }
      return `🧠 **PSYCHOLOGY STATUS: EXCELLENT**\n\n` +
        `You have logged **${patienceCount} Patience** setup trades and **0 Revenge/FOMO** trades. This shows exceptional emotional restraint, which is the hallmark of the top 5% of profitable traders in the Indian stock market.\n\n` +
        `Keep maintaining this strict rule-based approach! Never enter a trade unless it matches your pre-defined setup.`;
    }

    // 3. Risk Management
    if (q.includes('risk') || q.includes('size') || q.includes('capital') || q.includes('stop loss')) {
      const recommendedRisk = account.capital * (account.riskPerTradePercent / 100);
      return `🛡️ **RISK MANAGEMENT & SIZING COACHING**\n\n` +
        `Based on your starting Capital of **₹${account.capital.toLocaleString('en-IN')}** and a **${account.riskPerTradePercent}% risk limit**:\n` +
        `• **Maximum Allowed Risk per Trade:** **₹${recommendedRisk.toLocaleString('en-IN')}**\n` +
        `• **Position Sizing Rule:** For any stock, your maximum shares = \`Allowed Risk / (Entry Price - Stop Loss)\`.\n\n` +
        `⚠️ **The Golden Rules:**\n` +
        `1. Never risk more than 2% of your capital on a single intraday or swing trade.\n` +
        `2. Always enter your Stop Loss order directly in your broker terminal (Kite, Groww, etc.) the instant your trade is filled. Do not rely on "mental stop losses".`;
    }

    // 4. General fallback
    return `💡 **TradeFlow Pro AI Coach Feedback**\n\n` +
      `That is an excellent question. In the Indian stock market, consistency is driven by 3 pillars:\n` +
      `1. **System Edge:** Having a high-probability setup (e.g. CPR pullbacks, gap fill strategies, ascending triangle breakouts).\n` +
      `2. **Risk Management:** Never taking a trade where the potential reward is less than 1.5x your risk.\n` +
      `3. **Strict Psychology:** Log every trade in your journal. Reviewing your logs daily helps build the neural pathways for discipline.\n\n` +
      `Feel free to ask specifically about: "Give me an audit", "How is my psychology?", or "How should I risk my capital?"`;
  };

  const quickReplies = [
    'Give me an audit of my performance',
    'How is my trading psychology?',
    'Coach me on risk management',
  ];

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
      {/* Bot Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <Bot className="h-5 w-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
              <span>TradeFlow AI Coach</span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            </h3>
            <p className="text-[10px] text-slate-400">Personalized trading psychology & discipline diagnostics</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
          <Zap className="h-3 w-3" />
          <span>REAL-TIME ANALYSIS ACTIVE</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[85%] items-start space-x-2.5 rounded-2xl p-4 text-xs leading-relaxed
                ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-medium'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 rounded-tl-none'
                }
              `}
            >
              {msg.sender === 'ai' && (
                <div className="mt-0.5 rounded bg-emerald-500/10 p-1 text-emerald-400">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="whitespace-pre-line font-medium">
                  {/* Process simple markdown like **bold** in the text */}
                  {msg.text.split('\n').map((line, lIdx) => {
                    const parts = line.split('**');
                    return (
                      <p key={lIdx}>
                        {parts.map((part, pIdx) =>
                          pIdx % 2 === 1 ? <strong key={pIdx} className={msg.sender === 'user' ? 'font-extrabold text-slate-950' : 'text-white font-bold'}>{part}</strong> : part
                        )}
                      </p>
                    );
                  })}
                </div>
                <div className={`text-[9px] text-right mt-1 font-mono ${msg.sender === 'user' ? 'text-slate-800' : 'text-slate-500'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] items-center space-x-2.5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 rounded-tl-none">
              <div className="rounded bg-emerald-500/10 p-1 text-emerald-400">
                <Bot className="h-3.5 w-3.5 animate-bounce" />
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-medium">AI Coach is reviewing your setups...</span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse delay-75"></span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse delay-150"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      <div className="border-t border-slate-800 bg-slate-950/40 px-4 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Suggestions:</span>
        {quickReplies.map((reply) => (
          <button
            key={reply}
            onClick={() => handleSend(reply)}
            className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400 transition-all duration-200"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="border-t border-slate-800 bg-slate-950/80 p-4">
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
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="rounded-xl bg-emerald-500 p-3 text-slate-950 shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
