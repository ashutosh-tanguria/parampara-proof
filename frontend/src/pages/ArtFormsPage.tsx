import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, BookOpen, Filter } from 'lucide-react';
import { ArtFormSummary } from '../types';

interface ArtFormsPageProps {
  navigate: (route: string) => void;
  artForms: ArtFormSummary[];
}

export const ArtFormsPage: React.FC<ArtFormsPageProps> = ({ navigate, artForms }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Painting', 'Tribal Art', 'Textile', 'Pottery'];

  const filteredForms = artForms.filter((art) => {
    const matchesSearch = 
      art.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.origin.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'All' || art.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-[#153828]">
          Explore Indian Art Forms
        </h1>
        <p className="text-sm sm:text-base text-[#78716C] leading-relaxed">
          Discover the rich heritage, stories and techniques behind traditional Indian art forms.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#78716C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search art forms, techniques, or regions..."
            className="w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-full bg-white border border-[#D5C4AC] focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 text-sm shadow-sm outline-none transition-all placeholder:text-[#A8A29E]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-white text-[#57534E] border border-[#EADFCF] hover:bg-[#F5EFE6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Art Forms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredForms.map((art) => (
          <div
            key={art.slug}
            onClick={() => navigate(`/art-forms/${art.slug}`)}
            className="group bg-white rounded-2xl overflow-hidden border border-[#EADFCF]/80 shadow-warm hover:shadow-warm-lg transition-all duration-300 cursor-pointer flex flex-col"
          >
            <div className="relative h-48 sm:h-56 overflow-hidden bg-[#EADFCF]">
              <img
                src={art.image}
                alt={art.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-forest">
                {art.category}
              </div>
              {art.automated_supported ? (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/90 text-white shadow-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Model Active</span>
                </div>
              ) : (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600/90 text-white shadow-sm">
                  <span>Knowledge Archive</span>
                </div>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-editorial text-2xl font-bold text-[#153828] group-hover:text-terracotta transition-colors">
                  {art.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#78716C] mt-1.5 line-clamp-2">
                  {art.subtitle}
                </p>
                <div className="text-[11px] text-[#A8A29E] mt-2 line-clamp-1 italic">
                  Origin: {art.origin}
                </div>
              </div>

              <div className="pt-3 border-t border-[#F5EFE6] flex items-center justify-between text-xs font-semibold text-terracotta">
                <span>Explore Technique & Motifs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredForms.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EADFCF] p-8">
          <BookOpen className="w-10 h-10 text-terracotta mx-auto mb-3 opacity-60" />
          <h3 className="font-editorial text-xl font-bold text-forest">No art forms found</h3>
          <p className="text-sm text-[#78716C] mt-1">Try adjusting your search query or category filter.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="mt-4 px-4 py-2 rounded-full text-xs font-semibold bg-forest text-white"
          >
            Reset Filters
          </button>
        </div>
      )}

    </div>
  );
};
