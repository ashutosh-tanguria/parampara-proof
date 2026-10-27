import React from 'react';
import { Heart, ShieldCheck, Sparkles, Award } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-[#153828] text-[#F5EFE6] pt-14 pb-24 md:pb-12 border-t border-[#0D2B1D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#2D6A4F]/40">
          
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-bold text-lg">
                ॐ
              </div>
              <span className="font-editorial text-2xl font-bold tracking-tight text-[#FAF7F2]">
                Parampara Proof
              </span>
            </div>
            <p className="text-sm text-[#D5C4AC] max-w-md leading-relaxed">
              AI-assisted Indian traditional-art learning and preservation platform. Built for national-level innovation to preserve mastercraft knowledge, empower young learners, and ensure cultural continuity.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#EADFCF]/80 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D2B1D] border border-[#2D6A4F]/60">
                <ShieldCheck className="w-3.5 h-3.5 text-terracotta" />
                Zero Paid AI APIs
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D2B1D] border border-[#2D6A4F]/60">
                <Sparkles className="w-3.5 h-3.5 text-ochre-light" />
                Real Scikit-Learn & CV Pipeline
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D2B1D] border border-[#2D6A4F]/60">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                Social Impact Innovation
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-editorial text-lg font-semibold text-[#FAF7F2] mb-4">
              Explore Traditions
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D5C4AC]">
              <li>
                <button onClick={() => navigate('/art-forms/madhubani')} className="hover:text-white transition-colors">
                  Madhubani / Mithila
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/art-forms/warli')} className="hover:text-white transition-colors">
                  Warli Tribal Art
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/art-forms/gond')} className="hover:text-white transition-colors">
                  Gond Nature Painting
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/art-forms/pattachitra')} className="hover:text-white transition-colors">
                  Pattachitra Classical Scrolls
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/art-forms/kalamkari')} className="hover:text-white transition-colors">
                  Kalamkari Textile Art
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/art-forms/pottery')} className="hover:text-white transition-colors">
                  Traditional Pottery
                </button>
              </li>
            </ul>
          </div>

          {/* Platform & Learning */}
          <div>
            <h4 className="font-editorial text-lg font-semibold text-[#FAF7F2] mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D5C4AC]">
              <li>
                <button onClick={() => navigate('/analyse')} className="hover:text-white transition-colors">
                  Upload & Analyse Artwork
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/learn')} className="hover:text-white transition-colors">
                  Technique Video Lessons
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/chat')} className="hover:text-white transition-colors">
                  AI Craft Coach (Local)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/community')} className="hover:text-white transition-colors">
                  Community Gallery
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/portfolio')} className="hover:text-white transition-colors">
                  My Artwork Portfolio
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Credits & Ethics */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#D5C4AC]/70 gap-4">
          <p>
            © 2026 Parampara Proof. Dedicated to the traditional folk artists and craft communities of India.
          </p>
          <p className="flex items-center gap-1.5">
            Preserving ancestral heritage with open-source ethical machine learning.
          </p>
        </div>
      </div>
    </footer>
  );
};
