import React from 'react';
import { Mic, Square, RefreshCw, Star, ThumbsUp, CheckCircle, AlertCircle, Zap, Trophy, Volume2, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';
import { EvaluationResult, EnglishLevel } from '../types';
import { speakWithBrowser } from '../services/geminiService';

interface SpeechEvaluatorProps {
  readingText: string | null;
  level: EnglishLevel;
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  studentName: string;
  teacherName: string;
  setStudentName: (name: string) => void;
  setTeacherName: (name: string) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  onShowCertificate: () => void;
}

export const SpeechEvaluator: React.FC<SpeechEvaluatorProps> = ({
  readingText, level, isRecording, isEvaluating, evaluation,
  studentName, teacherName, setStudentName, setTeacherName,
  startRecording, stopRecording, onShowCertificate
}) => {
  if (!readingText) return null;

  return (
    <div className="w-full max-w-[600px] mt-1 space-y-2">
      <div className="flex flex-col items-center gap-2 p-3 bg-emerald-50/20 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
          <Mic size={16} className="text-emerald-500" />
          <span>Mrs. Dung: Luyện nói cùng cô giáo</span>
        </div>
        
        {!evaluation && !isEvaluating && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-white transition-all shadow-xl text-base sm:text-lg min-h-[52px]
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-105' 
                : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-1'}`}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)', letterSpacing: '0.02em', WebkitFontSmoothing: 'antialiased' }}
          >
            {isRecording ? <Square size={22} fill="currentColor" /> : <Mic size={22} />}
            {isRecording ? 'Đang nghe bé nói...' : 'Bắt đầu luyện nói'}
          </button>
        )}

        {isRecording && (
          <p className="text-[10px] text-red-400 font-bold animate-pulse">
            Mẹo: Sau khi đọc xong, bé chờ 1 giây rồi hãy nhấn nút dừng nhé!
          </p>
        )}

        {isEvaluating && (
          <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
            <RefreshCw className="animate-spin text-brand-green" size={32} />
            <div className="text-center">
              <p className="text-sm font-black text-brand-green">Cô Dung đang nghe và chấm điểm cho con nhé...</p>
              <p className="text-[10px] text-slate-400 font-medium">Bé chờ cô một chút xíu thôi!</p>
            </div>
          </div>
        )}

        {evaluation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
            {!evaluation.isComplete ? (
              <IncompleteResult evaluation={evaluation} startRecording={startRecording} />
            ) : (
              <CompleteResult 
                evaluation={evaluation} startRecording={startRecording}
                studentName={studentName} teacherName={teacherName}
                setStudentName={setStudentName} setTeacherName={setTeacherName}
                onShowCertificate={onShowCertificate}
                level={level}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const IncompleteResult: React.FC<{ evaluation: EvaluationResult; startRecording: () => Promise<void> }> = ({ evaluation, startRecording }) => (
  <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm space-y-3">
    <div className="flex items-center gap-3 text-red-600">
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><RefreshCw size={20} /></div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider">Chưa hoàn thành</div>
        <div className="text-sm font-medium">Bé cần đọc lại đầy đủ nhé!</div>
      </div>
    </div>
    <p className="text-sm text-gray-700 leading-relaxed italic">"{evaluation.feedback}"</p>
    {evaluation.missingContent && (
      <div className="bg-white/50 p-2 rounded-lg border border-red-200 text-xs text-red-700">
        <span className="font-bold">Phần thiếu:</span> {evaluation.missingContent}
      </div>
    )}
    <button onClick={startRecording} className="w-full py-2 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-colors">Đọc lại ngay</button>
  </div>
);

const CompleteResult: React.FC<{
  evaluation: EvaluationResult;
  startRecording: () => Promise<void>;
  studentName: string; teacherName: string;
  setStudentName: (n: string) => void; setTeacherName: (n: string) => void;
  onShowCertificate: () => void;
  level: EnglishLevel;
}> = ({ evaluation, startRecording, studentName, teacherName, setStudentName, setTeacherName, onShowCertificate, level }) => (
  <>
    {/* Score */}
    <div className="flex items-center justify-between bg-gradient-to-br from-white to-emerald-50 p-4 sm:p-6 rounded-2xl border-2 border-emerald-200 shadow-md">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-yellow rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-yellow/20 rotate-3">
          <Star size={28} fill="currentColor" />
        </div>
        <div>
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Điểm số & Xếp loại CEFR</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl sm:text-4xl font-black text-emerald-700">{evaluation.score.toFixed(1)}</div>
            <div className="px-3 py-1 bg-brand-green text-white rounded-lg text-sm font-black shadow-sm">{evaluation.cefrLevel}</div>
          </div>
        </div>
      </div>
      <button onClick={startRecording} className="px-3 sm:px-4 py-2 bg-white text-emerald-600 border-2 border-emerald-100 rounded-xl font-bold text-xs sm:text-sm hover:border-brand-green transition-all shadow-sm active:scale-95">Thử lại</button>
    </div>

    {/* Criteria Scores */}
    {evaluation.criteriaScores && (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tiêu chí chấm điểm CEFR</span>
          <span className="text-[9px] font-medium text-slate-400 italic">Điều kiện: Đọc đủ & đúng 100% nội dung (Tối đa 2.0 điểm/tiêu chí)</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 bg-white p-2.5 sm:p-3 rounded-2xl border-2 border-emerald-50 shadow-sm text-center">
          {[
            { key: 'pronunciation', name: 'Phát âm' },
            { key: 'fluency', name: 'Trôi chảy' },
            { key: 'vocabulary', name: 'Từ vựng' },
            { key: 'grammar', name: 'Ngữ pháp' },
            { key: 'interaction', name: 'Tương tác' }
          ].map(({ key, name }) => {
            const score = (evaluation.criteriaScores as any)?.[key] ?? 0;
            return (
              <div key={key} className="p-1.5 sm:p-2 rounded-xl bg-emerald-50/30 border border-emerald-100/50">
                <div className="text-[8px] sm:text-[9px] font-extrabold text-emerald-600 uppercase leading-none mb-1">
                  {name}
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-700">
                  {score.toFixed(1)}<span className="text-[8px] font-bold text-emerald-400">/2</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Feedback */}
    <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-emerald-100 shadow-md space-y-6">
      <div className="flex items-start gap-3 bg-green-50 p-3 sm:p-4 rounded-xl border border-green-100">
        <ThumbsUp size={24} className="text-green-500 mt-0.5 shrink-0" />
        <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed italic">"{evaluation.feedback}"</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center"><CheckCircle size={14} /></div>
            <div className="text-xs font-black uppercase tracking-wider">Ưu điểm nổi bật</div>
          </div>
          <div className="space-y-2">
            {(evaluation.strengths || []).map((s, i) => (
              <div key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-green-50/30 p-2 rounded-lg">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0" /> {s}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-orange-600">
            <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center"><AlertCircle size={14} /></div>
            <div className="text-xs font-black uppercase tracking-wider">Cần chú ý thêm</div>
          </div>
          <div className="space-y-2">
            {evaluation.improvements.length > 0 ? evaluation.improvements.map((imp, i) => (
              <div key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-orange-50/30 p-2 rounded-lg">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0" /> {imp}
              </div>
            )) : (
              <div className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-orange-50/30 p-2 rounded-lg">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0" /> Luyện thêm ngữ điệu lên-xuống và âm nối giữa các từ để tự nhiên hơn
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IPA Analysis - Giao diện các từ cần viết & phát âm lại */}
      {evaluation.ipaAnalysis && evaluation.ipaAnalysis.length > 0 && (
        <div className="pt-4 border-t-2 border-slate-50">
          <div className="flex items-center gap-2 text-indigo-600 mb-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Edit3 size={18} /></div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest leading-none">CÁC TỪ CẦN LUYỆN TẬP LẠI (TỪ SAI)</span>
              <span className="text-[9px] text-slate-400 font-bold mt-1">Bé nhấn loa 🔊 để nghe cách đọc chuẩn và viết lại từ nhé!</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {evaluation.ipaAnalysis.map((item, idx) => (
              <div key={idx} className="bg-red-50/40 rounded-2xl border-2 border-red-100 p-3 sm:p-4 flex flex-col justify-between space-y-2.5 hover:border-red-300 transition-all shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black text-red-600 tracking-tight leading-none">{item.word}</span>
                    <button 
                      onClick={() => speakWithBrowser(item.word, level)}
                      className="p-1.5 bg-white border border-red-200 rounded-lg text-red-500 hover:bg-red-100 active:scale-95 transition-all shadow-sm"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">Bé đọc sai</span>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium bg-white/70 p-2 rounded-xl border border-red-50/50">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">IPA Chuẩn</span>
                    <span className="font-serif font-bold text-green-600 text-sm sm:text-base leading-none">{item.correctIpa}</span>
                  </div>
                  <div className="w-[2px] h-6 bg-red-100" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Bé đọc</span>
                    <span className="font-serif font-bold text-red-500 text-sm sm:text-base leading-none">{item.studentIpa}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 font-bold leading-relaxed flex items-start gap-1.5 p-1 bg-red-100/10 rounded-lg">
                  <span className="text-[10px] mt-0.5">💡</span>
                  <span>{item.tip}</span>
                </div>
                
                <div className="text-[8px] sm:text-[9px] font-black text-indigo-500/80 uppercase tracking-wider text-center border-t border-dashed border-red-200/50 pt-2 flex items-center justify-center gap-1">
                  <span>📝</span>
                  <span>Bé hãy viết lại từ này ra nháp 3 lần nhé!</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Sentences */}
      {(evaluation.standardSentences?.length || 0) > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <div>
            <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Câu mẫu luyện tập</div>
            {evaluation.standardSentences?.map((sentence, idx) => (
              <p key={idx} className="text-sm sm:text-base text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2 font-medium">{sentence}</p>
            ))}
          </div>
          {(evaluation.personalizedExercises?.length || 0) > 0 && (
            <div>
              <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 mt-2">Bài tập đề xuất</div>
              <div className="flex flex-col gap-2">
                {evaluation.personalizedExercises?.map((ex, idx) => (
                  <div key={idx} className="text-sm text-indigo-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 font-medium">{ex}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Certificate Inputs */}
      <div className="pt-4 border-t border-indigo-50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tên học sinh</label>
            <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nhập tên bé..."
              className="w-full px-3 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tên giáo viên</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Tên giáo viên..."
              className="w-full px-3 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <button onClick={onShowCertificate}
          className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-orange-200 hover:-translate-y-1"
        >
          <Trophy size={20} className="animate-bounce" /> NHẬN GIẤY CHỨNG NHẬN NGAY!
        </button>
      </div>
    </div>
  </>
);
