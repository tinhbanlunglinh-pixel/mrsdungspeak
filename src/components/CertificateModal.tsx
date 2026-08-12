import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
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
  green:      '#00a84d',
  greenDark:  '#166534',
  greenLight: '#e6f9ef',
  white:      '#ffffff',
  dark:       '#1a1a1a',
  muted:      '#6B7280',
  ivory:      '#FFFDF5',
  yellow:     '#FFF3CD',
  yellowDark: '#B8860B',
};

/* ── Score rating helper ─────────────────────────────────── */
const getScoreRating = (score: number): { label: string; emoji: string; bgColor: string; textColor: string } => {
  if (score >= 9) return { label: 'XUẤT SẮC', emoji: '🏆', bgColor: '#FEF3C7', textColor: '#B45309' };
  if (score >= 7) return { label: 'GIỎI', emoji: '⭐', bgColor: '#FEF3C7', textColor: '#B45309' };
  if (score >= 5) return { label: 'KHÁ', emoji: '👍', bgColor: '#FEF3C7', textColor: '#B45309' };
  if (score >= 3) return { label: 'TRUNG BÌNH', emoji: '📝', bgColor: '#FEF3C7', textColor: '#B45309' };
  return { label: 'CẦN NỖ LỰC', emoji: '💪', bgColor: '#FEF3C7', textColor: '#B45309' };
};

/* ── Fixed certificate dimensions for consistent rendering ── */
const CERT_WIDTH = 680;
const CERT_HEIGHT = Math.round(CERT_WIDTH / 1.414); // ~481px (landscape A4 ratio)

export const CertificateModal: React.FC<CertificateModalProps> = ({
  show, onClose, evaluation, studentName, studentClass, teacherName,
  generatedTopicName, topic, level, isDownloading, setIsDownloading, setError
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  /* ── Auto-scale certificate to fit the wrapper container ── */
  const recalcScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wrapperW = wrapper.clientWidth;
    const wrapperH = wrapper.clientHeight;
    // Fit the fixed-size certificate inside the wrapper with some padding
    const scaleX = wrapperW / CERT_WIDTH;
    const scaleY = wrapperH / CERT_HEIGHT;
    setScale(Math.min(scaleX, scaleY, 1)); // never scale up beyond 1
  }, []);

  useEffect(() => {
    if (!show) return;
    // Initial calc after paint
    const raf = requestAnimationFrame(() => recalcScale());
    window.addEventListener('resize', recalcScale);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recalcScale);
    };
  }, [show, recalcScale]);

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
        backgroundColor: C.white, logging: false, imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const container = clonedDoc.querySelector('[data-certificate-container]') as HTMLElement;
          if (container) {
            container.style.boxShadow = 'none';
            container.style.transform = 'none';
          }
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
  const criteriaScores = evaluation?.criteriaScores;
  const scoreRating = getScoreRating(evaluation?.score ?? 0);

  const criteriaList = [
    { key: 'pronunciation', label: 'Phát âm' },
    { key: 'fluency', label: 'Trôi chảy' },
    { key: 'vocabulary', label: 'Từ vựng' },
    { key: 'grammar', label: 'Ngữ pháp' },
    { key: 'interaction', label: 'Tương tác' },
  ];

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
            className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden relative flex flex-col"
            style={{
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.4)',
              maxWidth: '720px',
              maxHeight: 'min(calc(100vh - 16px), calc(100dvh - 16px))',
            }}
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

            {/* ─── Certificate Viewport ─── 
                 This wrapper takes all remaining space; the certificate 
                 is rendered at a fixed size and CSS-scaled to fit.       */}
            <div
              ref={wrapperRef}
              className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-5"
            >
              <div
                ref={certificateRef}
                data-certificate-container
                style={{
                  position: 'relative',
                  width: `${CERT_WIDTH}px`,
                  height: `${CERT_HEIGHT}px`,
                  flexShrink: 0,
                  backgroundColor: C.white,
                  fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif",
                  overflow: 'hidden',
                  border: `5px solid ${C.green}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
              >

                {/* ═══════════ CONTENT ═══════════ */}
                <div style={{
                  position: 'relative', zIndex: 5,
                  width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between',
                  padding: '24px 36px 18px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}>

                  {/* ── TOP: Icon + School Name + Title ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                    {/* School Icon */}
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '14px',
                      backgroundColor: C.green,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,168,77,0.3)',
                    }}>
                      <span style={{ fontSize: '26px', lineHeight: 1 }}>🏠</span>
                    </div>

                    {/* School Name */}
                    <p style={{
                      fontSize: '11px', fontWeight: 800, color: C.green,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      margin: '6px 0 0', lineHeight: 1.3,
                    }}>
                      Trung tâm Ngoại Ngữ English Mrs. Dung
                    </p>

                    {/* Main Title */}
                    <h1 style={{
                      fontSize: '28px', fontWeight: 900,
                      color: C.greenDark,
                      margin: '0', lineHeight: 1.15,
                      fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif",
                    }}>
                      GIẤY CHỨNG NHẬN
                    </h1>

                    {/* Subtitle */}
                    <p style={{
                      fontSize: '12px', color: C.dark,
                      fontStyle: 'italic', fontWeight: 600, margin: 0,
                    }}>
                      Hoàn thành xuất sắc bài học
                    </p>
                  </div>

                  {/* ── MIDDLE: Student Name + Topic ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    {/* "Vinh danh học viên:" */}
                    <p style={{
                      fontSize: '12px', fontStyle: 'italic', color: C.muted,
                      margin: 0, fontWeight: 500,
                    }}>
                      Vinh danh học viên:
                    </p>

                    {/* Student Name */}
                    <div style={{ width: '100%', maxWidth: '400px' }}>
                      <h2 style={{
                        fontSize: '36px', fontWeight: 900,
                        color: C.dark, margin: 0, padding: '0 0 6px',
                        fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif",
                        lineHeight: 1.15,
                        wordBreak: 'break-word',
                      }}>
                        {displayName}
                      </h2>
                      {/* Green underline */}
                      <div style={{
                        width: '60%', height: '4px', borderRadius: '2px',
                        backgroundColor: C.green,
                        margin: '0 auto',
                      }} />
                    </div>

                    {/* Topic */}
                    <div style={{ marginTop: '2px' }}>
                      <p style={{
                        fontSize: '10px', fontWeight: 700, color: C.muted,
                        textTransform: 'uppercase', letterSpacing: '0.15em',
                        margin: '0 0 2px',
                      }}>
                        Chủ đề học tập
                      </p>
                      <p style={{
                        fontSize: '18px', fontWeight: 900, color: C.dark,
                        margin: 0, fontStyle: 'italic',
                        fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif",
                      }}>
                        "{displayTopic}"
                      </p>
                    </div>
                  </div>

                  {/* ── SCORE SECTION ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '20px', width: '100%',
                  }}>
                    {/* Score Circle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '88px', height: '88px', borderRadius: '50%',
                        backgroundColor: C.green,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 6px 20px rgba(0,168,77,0.35)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <span style={{
                            fontSize: '30px', fontWeight: 900, color: C.white,
                            fontFamily: "'Roboto', 'Segoe UI', sans-serif", lineHeight: 1,
                          }}>
                            {displayScore}
                          </span>
                          <span style={{
                            fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1,
                          }}>
                            /10
                          </span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: 800, color: C.greenDark,
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                      }}>
                        Điểm số
                      </span>
                    </div>

                    {/* Rating Badge */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '4px', padding: '12px 20px',
                      backgroundColor: scoreRating.bgColor,
                      borderRadius: '14px',
                      border: '2px solid rgba(180,134,11,0.15)',
                      minWidth: '130px',
                    }}>
                      <span style={{ fontSize: '28px', lineHeight: 1 }}>{scoreRating.emoji}</span>
                      <span style={{
                        fontSize: '14px', fontWeight: 900, color: scoreRating.textColor,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {scoreRating.label}
                      </span>
                      {/* Criteria mini summary */}
                      {criteriaScores && (
                        <div style={{
                          display: 'flex', gap: '6px', marginTop: '2px',
                          flexWrap: 'wrap', justifyContent: 'center',
                        }}>
                          {criteriaList.map(({ key, label }) => {
                            const score = (criteriaScores as any)?.[key] ?? 0;
                            return (
                              <span key={key} style={{
                                fontSize: '7px', fontWeight: 700,
                                color: scoreRating.textColor,
                                opacity: 0.8,
                              }}>
                                {label}: {score.toFixed(1)}/2
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── BOTTOM: Date + Brand | Teacher Signature ── */}
                  <div style={{
                    width: '100%', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'flex-end',
                    padding: '0 8px',
                  }}>
                    {/* Left: Date + Brand */}
                    <div style={{ textAlign: 'left' }}>
                      <p style={{
                        fontSize: '11px', fontStyle: 'italic', color: C.muted,
                        margin: '0 0 4px',
                      }}>
                        Ngày cấp: {displayDate}
                      </p>
                      <p style={{
                        fontSize: '12px', fontWeight: 800, color: C.green,
                        margin: 0,
                      }}>
                        English with Heart 💚
                      </p>
                    </div>

                    {/* Right: Teacher Signature */}
                    <div style={{ textAlign: 'center', minWidth: '160px' }}>
                      {/* Signature line */}
                      <div style={{
                        width: '100%', height: '3px', borderRadius: '2px',
                        backgroundColor: C.green,
                        marginBottom: '8px',
                      }} />
                      <p style={{
                        fontSize: '18px', fontWeight: 900, color: C.dark,
                        margin: '0 0 2px',
                        fontFamily: "'Roboto', 'Segoe UI', 'Arial', sans-serif",
                      }}>
                        {teacherName}
                      </p>
                      <p style={{
                        fontSize: '10px', fontWeight: 700, color: C.green,
                        fontStyle: 'italic', margin: '0 0 1px',
                      }}>
                        Giám đốc Trung tâm
                      </p>
                      <p style={{
                        fontSize: '8px', fontWeight: 600, color: C.muted,
                        margin: 0,
                      }}>
                        Trung tâm Ngoại Ngữ English Mrs. Dung
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Action Bar ─── */}
            <div className="p-3 sm:p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-100/60 flex gap-3 flex-shrink-0">
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
                  background: `linear-gradient(135deg, ${C.green}, #059669)`,
                  boxShadow: `0 8px 24px -4px rgba(0,168,77,0.4)`,
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
