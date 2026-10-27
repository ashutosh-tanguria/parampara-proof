import React, { useState, useEffect } from 'react';
import { Upload, Camera, Award, Bookmark, Grid, Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { AnalysisReport, CommunityPost } from '../types';

interface PortfolioPageProps {
  navigate: (route: string) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'analysed' | 'saved'>('all');
  const [portfolioData, setPortfolioData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/portfolio')
      .then((res) => res.json())
      .then((data) => setPortfolioData(data))
      .catch((err) => console.error(err));
  }, []);

  const user = portfolioData?.user || {
    name: "Guest",
    handle: "@ananya_art",
    uploads_count: 12,
    analysed_count: 8,
    followers_count: 4,
    bio: "Enthusiastic beginner exploring Maharashtra Warli and Mithila folk art traditions."
  };

  const analysedList: AnalysisReport[] = portfolioData?.analysed || [];
  const savedList = portfolioData?.saved_references || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADFCF] shadow-warm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-forest text-white border-4 border-[#FAF7F2] shadow-md flex items-center justify-center font-editorial text-3xl font-bold">
            A
          </div>

          <div className="space-y-1.5">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-forest">
              {user.name}
            </h1>
            <span className="text-xs font-semibold text-terracotta block">
              {user.handle}
            </span>
            <p className="text-xs sm:text-sm text-[#57534E] max-w-md pt-1 leading-relaxed">
              {user.bio}
            </p>

            {/* Metrics */}
            <div className="flex items-center justify-center sm:justify-start gap-6 pt-3 text-xs">
              <div>
                <span className="font-bold text-forest text-sm sm:text-base block">
                  {user.uploads_count}
                </span>
                <span className="text-[#78716C]">Uploads</span>
              </div>
              <div className="h-6 w-px bg-[#EADFCF]" />
              <div>
                <span className="font-bold text-terracotta text-sm sm:text-base block">
                  {user.analysed_count}
                </span>
                <span className="text-[#78716C]">Analysed</span>
              </div>
              <div className="h-6 w-px bg-[#EADFCF]" />
              <div>
                <span className="font-bold text-forest text-sm sm:text-base block">
                  {user.followers_count}
                </span>
                <span className="text-[#78716C]">Followers</span>
              </div>
            </div>
          </div>

        </div>

        {/* Upload Action */}
        <button
          onClick={() => navigate('/analyse')}
          className="px-5 py-2.5 rounded-full bg-terracotta text-white font-semibold text-xs sm:text-sm hover:bg-terracotta-hover transition-all flex items-center gap-2 shadow-sm self-center sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Artwork</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#EADFCF] pb-2">
        {[
          { id: 'all', label: 'All Artworks' },
          { id: 'analysed', label: 'Analysed Reports' },
          { id: 'saved', label: 'Saved References' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-forest text-white' : 'text-[#78716C] hover:text-forest'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid: All & Analysed */}
      {(activeTab === 'all' || activeTab === 'analysed') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysedList.map((art) => (
            <div
              key={art.id}
              onClick={() => navigate(`/analysis/${art.id}`)}
              className="bg-white rounded-3xl overflow-hidden border border-[#EADFCF] shadow-warm hover:shadow-warm-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                <img
                  src={art.image_url}
                  alt={art.target_name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-forest uppercase tracking-wider backdrop-blur-sm">
                  {art.target_art_form}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-forest text-white shadow-sm flex items-center gap-1">
                  
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="font-editorial text-base font-bold text-forest">
                  {art.target_name} Practice
                </h4>
                <p className="text-xs text-[#78716C] line-clamp-2">
                  {art.overall_assessment}
                </p>
                <div className="pt-2 border-t border-[#F5EFE6] flex items-center justify-between text-xs font-semibold text-terracotta">
                  <span>View Full Report</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}

          {/* New Upload Placeholder Card */}
          <div
            onClick={() => navigate('/analyse')}
            className="border-2 border-dashed border-[#D5C4AC] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-terracotta hover:bg-white transition-all min-h-[220px] group"
          >
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-terracotta flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="font-editorial text-lg font-bold text-forest">
              Add New Artwork
            </h4>
            <p className="text-xs text-[#78716C] mt-1">
              Upload your hand-drawn painting to track your growth
            </p>
          </div>
        </div>
      )}

      {/* Grid: Saved References */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedList.map((item: any, idx: number) => (
            <div
              key={idx}
              onClick={() => navigate(`/art-forms/${item.art_form}`)}
              className="bg-white rounded-3xl overflow-hidden border border-[#EADFCF] shadow-warm cursor-pointer hover:shadow-warm-lg transition-all"
            >
              <img src={item.image} alt={item.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta block">
                  {item.art_form}
                </span>
                <h4 className="font-editorial text-base font-bold text-forest mt-0.5">
                  {item.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Settings & Help Footer Links */}
      <div className="bg-white rounded-3xl p-6 border border-[#EADFCF] shadow-sm space-y-3">
        <h3 className="font-editorial text-lg font-bold text-forest px-1">
          Account & Learning Resources
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/learn')}
            className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADFCF] hover:border-terracotta text-left flex items-center justify-between text-xs font-semibold text-forest transition-colors"
          >
            <span>Saved Video Lessons</span>
            <ChevronRight className="w-4 h-4 text-[#78716C]" />
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADFCF] hover:border-terracotta text-left flex items-center justify-between text-xs font-semibold text-forest transition-colors"
          >
            <span>Folk Art Coach AI</span>
            <ChevronRight className="w-4 h-4 text-[#78716C]" />
          </button>

          <button
            onClick={() => alert('Parampara Proof is operating in Social Impact Innovation Mode. All features are active with zero paid subscription requirements.')}
            className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADFCF] hover:border-terracotta text-left flex items-center justify-between text-xs font-semibold text-forest transition-colors"
          >
            <span>Platform Ethics & Policy</span>
            <ChevronRight className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>
      </div>

    </div>
  );
};
