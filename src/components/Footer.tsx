import React from 'react';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => (
  <footer className="bg-brand-green-dark text-white py-10 sm:py-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
        {/* Brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-white rounded-2xl border-4 border-brand-yellow">
              <BrandLogo className="w-16 h-16" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-brand-yellow uppercase tracking-tight">ENGLISH MRS. DUNG</h3>
            <p className="text-slate-300 font-serif italic text-sm mt-1">"English with Heart. Success with Mrs.Dung"</p>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-6">
          <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
            LIÊN HỆ
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/10" />
          </h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 group">
              <span className="text-brand-green mt-1">📍</span>
              <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">Ngõ 717 Mạc Đăng Doanh, Hải Phòng.</span>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="text-brand-green mt-1">📞</span>
              <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">Mrs.Dung: 0364409436</span>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="text-brand-yellow mt-1">✉️</span>
              <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">nguyendungvn8@gmail.com</span>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="text-sky-400 mt-1">🌐</span>
              <a href="#" className="text-sm font-black group-hover:text-brand-yellow transition-colors underline decoration-brand-yellow/30 underline-offset-4">Fanpage Facebook</a>
            </li>
          </ul>
        </div>

        {/* Slogan */}
        <div className="space-y-6">
          <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
            SLOGAN
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/10" />
          </h4>
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
            <p className="text-lg font-serif italic text-white font-bold leading-relaxed">
              "English with Heart. Success with Mrs.Dung"
            </p>
            <div className="h-0.5 bg-white/10 w-full" />
            <p className="text-base font-black text-brand-green uppercase tracking-widest text-[13px]">
              HỌC TIẾNG ANH BẰNG CẢ TRÁI TIM.
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
);
