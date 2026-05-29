import React, { useState } from 'react';
import { Zap, Languages, Sparkles, Cpu, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApiKeyModalProps {
  show: boolean;
  currentApiKey: string;
  currentModel: string;
  onSave: (key: string, model: string) => void;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ show, currentApiKey, currentModel, onSave, onClose }) => {
  // Use local state to avoid modifying the real apiKey on every keystroke
  const [localKey, setLocalKey] = useState(currentApiKey);
  const [localModel, setLocalModel] = useState(currentModel);

  // Sync when modal opens
  React.useEffect(() => {
    if (show) {
      setLocalKey(currentApiKey);
      setLocalModel(currentModel);
    }
  }, [show, currentApiKey, currentModel]);

  const handleSave = () => {
    const trimmedKey = localKey.trim();
    if (!trimmedKey) return;
    onSave(trimmedKey, localModel);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            // Removed onClick to prevent accidental closing on mobile when switching tabs
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border-4 border-emerald-100"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-brand-green shadow-inner">
                <Zap size={40} className="animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark uppercase tracking-tight">Cài đặt Gemini API Key</h2>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Để sử dụng ứng dụng, bạn cần nhập Gemini API Key cá nhân. Điều này giúp bạn có thể sử dụng không giới hạn và hoàn toàn miễn phí.
              </p>
              
              <div className="w-full space-y-4">
                <div className="text-left relative">
                  <label className="text-xs font-black text-brand-green uppercase tracking-widest block mb-2 px-1">Nhập API Key</label>
                  <div className="relative">
                    <input 
                      type="password"
                      placeholder="AIzaSyB..."
                      value={localKey}
                      onChange={(e) => setLocalKey(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                      className="w-full pl-5 pr-20 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green transition-all font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setLocalKey(text);
                        } catch (err) {
                          console.error("Failed to read clipboard contents: ", err);
                          alert("Trình duyệt không hỗ trợ dán tự động. Vui lòng nhấn giữ vào ô nhập và chọn 'Dán'.");
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-100 text-brand-green hover:bg-emerald-200 font-bold text-xs rounded-xl transition-all"
                    >
                      DÁN
                    </button>
                  </div>
                </div>

                <a 
                  href="https://aistudio.google.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-brand-green hover:text-brand-green-dark font-bold text-sm underline decoration-2 underline-offset-4 transition-all"
                >
                  <Languages size={16} />
                  Nhấn vào đây để lấy API Key miễn phí
                </a>

                {/* Chọn Model AI dạng Cards */}
                <div className="text-left mt-2">
                  <label className="text-xs font-black text-brand-green uppercase tracking-widest block mb-2 px-1">
                    Chọn Model AI
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: 'gemini-3-flash-preview',
                        name: 'Gemini 3 Flash',
                        desc: 'Tốc độ siêu nhanh, tối ưu nhất',
                        badge: 'Mặc định',
                        icon: <Sparkles size={16} className="text-amber-500" />,
                        bg: 'from-amber-50 to-orange-50/30 border-slate-100 hover:border-orange-200',
                        activeBg: 'bg-orange-50/50 border-orange-500 shadow-md shadow-orange-50'
                      },
                      {
                        id: 'gemini-3-pro-preview',
                        name: 'Gemini 3 Pro',
                        desc: 'Thông minh vượt trội, cực chi tiết',
                        badge: 'Chất lượng cao',
                        icon: <Cpu size={16} className="text-indigo-500" />,
                        bg: 'from-indigo-50 to-purple-50/30 border-slate-100 hover:border-indigo-200',
                        activeBg: 'bg-indigo-50/50 border-indigo-500 shadow-md shadow-indigo-50'
                      },
                      {
                        id: 'gemini-2.5-flash',
                        name: 'Gemini 2.5 Flash',
                        desc: 'Cực kỳ ổn định và đáng tin cậy',
                        badge: 'Khuyên dùng',
                        icon: <ShieldAlert size={16} className="text-emerald-500" />,
                        bg: 'from-emerald-50 to-teal-50/30 border-slate-100 hover:border-emerald-200',
                        activeBg: 'bg-emerald-50/50 border-emerald-500 shadow-md shadow-emerald-50'
                      }
                    ].map((m) => {
                      const isSelected = localModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLocalModel(m.id)}
                          className={`w-full p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 bg-gradient-to-br
                            ${isSelected ? m.activeBg : `${m.bg} cursor-pointer`}`}
                        >
                          <div className="mt-0.5 p-1.5 bg-white rounded-lg shadow-sm">{m.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-800">{m.name}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full
                                ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {m.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{m.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!localKey.trim()}
                  className="w-full py-4 bg-brand-green hover:bg-brand-green-dark text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] uppercase tracking-widest mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu và Bắt đầu
                </button>
                
                {currentApiKey && (
                  <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest mt-2"
                  >
                    Bỏ qua
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
