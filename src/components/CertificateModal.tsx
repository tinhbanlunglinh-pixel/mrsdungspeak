import React, { useRef } from 'react';
import { X, Download, RefreshCw, Trophy, Award, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { EvaluationResult, EnglishLevel } from '../types';
import { submitCertificateToSheet } from '../services/googleSheetsService';

interface CertificateModalProps {
  show: boolean;
  onClose: () => void;
  evaluation: EvaluationResult | null;
  studentName: string;
  studentClass: string;
  teacherName: string;
  generatedTopicName: string | null;
  topic: string;
  level: EnglishLevel;
  isDownloading: boolean;
  setIsDownloading: (d: boolean) => void;
  setError: (err: string | null) => void;
}

/* ── Colour tokens ─────────────────────────────────────── */
const C = {
  gold:       '#B8860B',
  goldLight:  '#DAA520',
  goldPale:   '#F5E6B8',
  goldBorder: '#C4973B',
  ivory:      '#FFFDF5',
  ivoryDark:  '#FFF8E7',
  emerald:    '#065F46',
  emeraldMid: '#059669',
  emeraldPale:'#D1FAE5',
  dark:       '#1F2937',
  muted:      '#6B7280',
  white:      '#FFFFFF',
};

export const CertificateModal: React.FC<CertificateModalProps> = ({
  show, onClose, evaluation, studentName, studentClass, teacherName,
  generatedTopicName, topic, level, isDownloading, setIsDownloading, setError
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const downloadCertificate = async () => {
    if (!certificateRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // Gửi dữ liệu lên Google Sheets (chạy song song, không block download)
      submitCertificateToSheet({
        studentName: studentName || "Không rõ tên",
        className: studentClass || level,
        lessonName: generatedTopicName || topic || "General English",
        score: evaluation?.score ?? 0,
      }).catch((err) => console.warn("[Google Sheets] Gửi dữ liệu thất bại:", err));

      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(certificateRef.current, {
        useCORS: true, allowTaint: true,
        scale: window.devicePixelRatio ? Math.max(3, window.devicePixelRatio * 2) : 3,
        backgroundColor: C.ivory, logging: false, imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const container = clonedDoc.querySelector('[data-certificate-container]') as HTMLElement;
          if (container) { container.style.boxShadow = 'none'; container.style.transform = 'none'; }
        },
        ignoreElements: (element) => element.hasAttribute('data-html2canvas-ignore'),
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.style.display = 'none'; link.href = dataUrl;
      link.download = `Certificate_${studentName.replace(/\s+/g, '_') || 'Student'}.png`;
      document.body.appendChild(link); link.click();
      setTimeout(() => { if (link.parentNode) document.body.removeChild(link); }, 500);
    } catch (err) {
      console.error("Failed to download certificate", err);
      setError("Không thể tải giấy chứng nhận. Vui lòng thử lại hoặc chụp màn hình.");
    } finally {
      setIsDownloading(false);
    }
  };

  const displayScore = evaluation?.score?.toFixed(1) ?? '0.0';
  const displayName = studentName || 'Amazing Student';
  const displayTopic = generatedTopicName || topic || 'General English';
  const displayDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <AnimatePresence>
      {show && evaluation && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl max-w-[720px] w-full overflow-hidden relative"
            style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,0.4), 0 0 0 1px rgba(184,134,11,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              data-html2canvas-ignore
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-white/80 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all z-20 shadow-md"
            >
              <X size={18} />
            </button>

            {/* ─── Certificate Body ─── */}
            <div className="p-3 sm:p-6 overflow-auto max-h-[85vh]">
              <div
                ref={certificateRef}
                data-certificate-container
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1.414 / 1',
                  backgroundColor: C.ivory,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  overflow: 'hidden',
                }}
              >
                {/* ── Layer 1: Subtle background pattern ── */}
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.035, zIndex: 0,
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, ${C.goldLight} 0.5px, transparent 0.5px),
                    radial-gradient(circle at 0% 0%, ${C.goldLight} 0.3px, transparent 0.3px)
                  `,
                  backgroundSize: '24px 24px, 12px 12px',
                }} />

                {/* ── Layer 2: Outer gold border ── */}
                <div style={{
                  position: 'absolute', inset: '6px',
                  border: `4px solid ${C.goldBorder}`,
                  zIndex: 1,
                }} />

                {/* ── Layer 3: Inner ornate border ── */}
                <div style={{
                  position: 'absolute', inset: '14px',
                  border: `2px solid ${C.goldPale}`,
                  zIndex: 1,
                }} />

                {/* ── Layer 4: Decorative double-line border ── */}
                <div style={{
                  position: 'absolute', inset: '20px',
                  border: `1px solid ${C.goldBorder}`,
                  zIndex: 1,
                }} />

                {/* ── Corner Ornaments (4 corners) ── */}
                {[
                  { top: '8px', left: '8px', borderTop: `6px solid ${C.gold}`, borderLeft: `6px solid ${C.gold}`, borderRadius: '4px 0 0 0' },
                  { top: '8px', right: '8px', borderTop: `6px solid ${C.gold}`, borderRight: `6px solid ${C.gold}`, borderRadius: '0 4px 0 0' },
                  { bottom: '8px', left: '8px', borderBottom: `6px solid ${C.gold}`, borderLeft: `6px solid ${C.gold}`, borderRadius: '0 0 0 4px' },
                  { bottom: '8px', right: '8px', borderBottom: `6px solid ${C.gold}`, borderRight: `6px solid ${C.gold}`, borderRadius: '0 0 4px 0' },
                ].map((style, i) => (
                  <div key={i} style={{ position: 'absolute', width: '40px', height: '40px', zIndex: 2, ...style } as React.CSSProperties} />
                ))}

                {/* ── Corner Diamond Accents ── */}
                {[
                  { top: '26px', left: '26px' },
                  { top: '26px', right: '26px' },
                  { bottom: '26px', left: '26px' },
                  { bottom: '26px', right: '26px' },
                ].map((pos, i) => (
                  <div key={`d${i}`} style={{
                    position: 'absolute', ...pos, width: '8px', height: '8px',
                    backgroundColor: C.gold, transform: 'rotate(45deg)', zIndex: 2,
                  } as React.CSSProperties} />
                ))}

                {/* ── Layer 5: Watermark seal (background) ── */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '280px', height: '280px',
                  borderRadius: '50%',
                  border: `3px solid ${C.goldPale}`,
                  opacity: 0.08, zIndex: 0,
                }} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '260px', height: '260px',
                  borderRadius: '50%',
                  border: `1px dashed ${C.goldPale}`,
                  opacity: 0.08, zIndex: 0,
                }} />

                {/* ═══════════ CONTENT ═══════════ */}
                <div style={{
                  position: 'relative', zIndex: 5,
                  width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between',
                  padding: '32px 40px 24px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}>

                  {/* ── TOP: Emblem + Title ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                    {/* Trophy Emblem */}
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: `linear-gradient(145deg, ${C.gold}, ${C.goldLight})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 6px 20px rgba(184,134,11,0.35), inset 0 2px 4px rgba(255,255,255,0.4)`,
                      border: `3px solid ${C.goldPale}`,
                    }}>
                      <Trophy size={30} color={C.white} strokeWidth={2.5} />
                    </div>

                    {/* Decorative line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '60%', maxWidth: '320px' }}>
                      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${C.goldBorder})` }} />
                      <Star size={10} color={C.gold} fill={C.gold} />
                      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${C.goldBorder})` }} />
                    </div>

                    {/* Title */}
                    <h1 style={{
                      fontSize: '22px', fontWeight: 900,
                      color: C.gold, letterSpacing: '0.25em',
                      textTransform: 'uppercase', margin: 0, lineHeight: 1.2,
                      textShadow: `1px 1px 0 ${C.goldPale}`,
                      fontFamily: "'Georgia', 'Times New Roman', serif",
                    }}>
                      Certificate of Excellence
                    </h1>

                    {/* Subtitle */}
                    <p style={{
                      fontSize: '12px', color: C.emeraldMid,
                      fontStyle: 'italic', fontWeight: 500, margin: 0,
                      letterSpacing: '0.05em',
                    }}>
                      This award is proudly presented to
                    </p>
                  </div>

                  {/* ── MIDDLE: Student Name + Details ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                    {/* Student Name */}
                    <div style={{ width: '100%', maxWidth: '480px' }}>
                      <h2 style={{
                        fontSize: '38px', fontWeight: 900,
                        color: C.emerald, margin: 0, padding: '0 0 8px',
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                        fontStyle: 'italic', lineHeight: 1.15,
                        borderBottom: `3px solid ${C.goldLight}`,
                        minHeight: '50px',
                        wordBreak: 'break-word',
                      }}>
                        {displayName}
                      </h2>
                      {/* Decorative dots under name */}
                      <div style={{
                        display: 'flex', justifyContent: 'center', gap: '6px',
                        marginTop: '6px',
                      }}>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} style={{
                            width: i === 2 ? '6px' : '4px',
                            height: i === 2 ? '6px' : '4px',
                            borderRadius: '50%',
                            backgroundColor: i === 2 ? C.gold : C.goldPale,
                          }} />
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{
                      fontSize: '13px', fontWeight: 600, color: C.dark,
                      margin: 0, lineHeight: 1.4,
                    }}>
                      For outstanding performance in <span style={{ color: C.emeraldMid, fontWeight: 700 }}>English Speaking</span>
                    </p>

                    {/* Topic + Level Row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '12px', flexWrap: 'wrap',
                    }}>
                      <div style={{
                        padding: '5px 16px', borderRadius: '20px',
                        backgroundColor: C.ivoryDark,
                        border: `1.5px solid ${C.goldPale}`,
                        fontSize: '11px', fontWeight: 700, color: C.dark,
                        letterSpacing: '0.02em',
                      }}>
                        📚 {displayTopic}
                      </div>
                      <div style={{
                        padding: '5px 16px', borderRadius: '20px',
                        background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldMid})`,
                        fontSize: '11px', fontWeight: 800, color: C.white,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        {studentClass ? `Class ${studentClass}` : level}
                      </div>
                    </div>
                  </div>

                  {/* ── SCORE SEAL ── */}
                  <div style={{
                    position: 'relative',
                    width: '110px', height: '110px',
                  }}>
                    {/* Outer ring */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      borderRadius: '50%',
                      background: `conic-gradient(from 0deg, ${C.gold}, ${C.goldLight}, ${C.gold}, ${C.goldLight}, ${C.gold})`,
                      padding: '4px',
                    }}>
                      <div style={{
                        width: '100%', height: '100%',
                        borderRadius: '50%',
                        backgroundColor: C.ivory,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${C.goldPale}`,
                      }}>
                        <span style={{
                          fontSize: '9px', fontWeight: 800,
                          color: C.goldBorder, textTransform: 'uppercase',
                          letterSpacing: '0.2em', lineHeight: 1, marginBottom: '2px',
                        }}>
                          Score
                        </span>
                        <span style={{
                          fontSize: '32px', fontWeight: 900,
                          color: C.emerald, lineHeight: 1,
                          fontFamily: "'Georgia', serif",
                        }}>
                          {displayScore}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: C.goldBorder, lineHeight: 1, marginTop: '1px',
                        }}>
                          / 10
                        </span>
                      </div>
                    </div>
                    {/* Star accents around seal */}
                    {[0, 72, 144, 216, 288].map((deg) => (
                      <div key={deg} style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: `rotate(${deg}deg) translateY(-62px) rotate(-${deg}deg)`,
                        width: '8px', height: '8px',
                      }}>
                        <Star size={8} color={C.gold} fill={C.gold} />
                      </div>
                    ))}
                  </div>

                  {/* ── BOTTOM: Signatures ── */}
                  <div style={{
                    width: '100%', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'flex-end',
                    padding: '0 16px',
                  }}>
                    {/* Left: Date */}
                    <div style={{ textAlign: 'center', minWidth: '140px' }}>
                      <p style={{
                        fontSize: '13px', fontWeight: 700, color: C.dark,
                        margin: '0 0 6px', fontFamily: "'Georgia', serif",
                      }}>
                        {displayDate}
                      </p>
                      <div style={{
                        width: '100%', height: '2px',
                        background: `linear-gradient(to right, transparent, ${C.goldBorder}, transparent)`,
                        marginBottom: '4px',
                      }} />
                      <p style={{
                        fontSize: '9px', fontWeight: 800, color: C.goldBorder,
                        textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0,
                      }}>
                        Date of Issue
                      </p>
                    </div>

                    {/* Center: Award icon */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', opacity: 0.4 }}>
                      <Award size={24} color={C.gold} />
                      <span style={{ fontSize: '7px', fontWeight: 700, color: C.goldBorder, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        Mrs. Dung AI
                      </span>
                    </div>

                    {/* Right: Teacher Signature */}
                    <div style={{ textAlign: 'center', minWidth: '140px' }}>
                      <p style={{
                        fontSize: '16px', fontWeight: 800, color: C.emerald,
                        margin: '0 0 6px',
                        fontFamily: "'Georgia', serif", fontStyle: 'italic',
                      }}>
                        {teacherName}
                      </p>
                      <div style={{
                        width: '100%', height: '2px',
                        background: `linear-gradient(to right, transparent, ${C.goldBorder}, transparent)`,
                        marginBottom: '4px',
                      }} />
                      <p style={{
                        fontSize: '9px', fontWeight: 800, color: C.goldBorder,
                        textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0,
                      }}>
                        Head Teacher
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Action Bar ─── */}
            <div className="p-3 sm:p-5 bg-gradient-to-r from-amber-50 to-emerald-50 border-t border-amber-100/60 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                Đóng
              </button>
              <button
                onClick={downloadCertificate}
                disabled={isDownloading}
                className="flex-[2.5] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-white"
                style={{
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight}, ${C.gold})`,
                  boxShadow: `0 8px 24px -4px rgba(184,134,11,0.4)`,
                }}
              >
                {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                Tải Giấy Chứng Nhận (PNG)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
