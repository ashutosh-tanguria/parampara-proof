import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, BookOpen, AlertCircle, CheckCircle2, Upload, ChevronRight, Palette } from 'lucide-react';
import { ArtFormDetail } from '../types';

interface ArtFormDetailPageProps {
  slug: string;
  navigate: (route: string) => void;
}

export const ArtFormDetailPage: React.FC<ArtFormDetailPageProps> = ({ slug, navigate }) => {
  const [detail, setDetail] = useState<ArtFormDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'techniques' | 'mistakes' | 'gallery'>('overview');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/art-forms/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load art form details');
        return res.json();
      })
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#78716C]">Loading traditional knowledge...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-editorial text-2xl font-bold text-forest">Art Form Not Found</h2>
        <p className="text-sm text-[#78716C] mt-2">Could not find knowledge records for this tradition.</p>
        <button
          onClick={() => navigate('/art-forms')}
          className="mt-4 px-5 py-2 rounded-full bg-forest text-white text-xs font-semibold"
        >
          Back to Art Forms
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center gap-2 text-xs text-[#78716C]">
        <button
          onClick={() => navigate('/art-forms')}
          className="flex items-center gap-1 hover:text-forest transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Art Forms</span>
        </button>
        <span>/</span>
        <span className="text-forest font-semibold">{detail.name}</span>
      </div>

      {/* Hero Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-[#153828]">
            {detail.name}
          </h1>
          {detail.automated_supported ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-700" />
              <span>AI Classifier Active</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Knowledge Track
            </span>
          )}
        </div>
        <p className="text-sm sm:text-base text-[#57534E] max-w-3xl leading-relaxed">
          {detail.overview}
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#EADFCF] overflow-x-auto pb-1 scrollbar-none">
        {(['overview', 'techniques', 'mistakes', 'gallery'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold capitalize border-b-2 transition-all ${
              activeTab === tab
                ? 'border-terracotta text-terracotta'
                : 'border-transparent text-[#78716C] hover:text-forest'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Visual */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-[#EADFCF] shadow-warm bg-white">
              <img
                src={detail.hero_image}
                alt={detail.name}
                className="w-full h-80 sm:h-96 object-cover"
              />
            </div>

            {/* Quote Block */}
            {detail.quote && (
              <div className="p-5 rounded-2xl bg-[#F5EFE6] border border-[#EADFCF] text-xs sm:text-sm text-[#57534E] italic font-serif leading-relaxed">
                "{detail.quote}"
              </div>
            )}
          </div>

          {/* Key Characteristics Cards */}
          <div className="lg:col-span-6 space-y-6">
            <h3 className="font-editorial text-2xl font-bold text-forest">
              Key Characteristics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {detail.key_characteristics.map((feat) => (
                <div
                  key={feat.id}
                  className="p-4 rounded-xl bg-white border border-[#EADFCF] shadow-sm space-y-2 hover:border-terracotta transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-ochre/40 flex items-center justify-center text-terracotta">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-editorial text-base font-bold text-forest">
                      {feat.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    {feat.description}
                  </p>
                  <div className="text-[11px] text-terracotta font-medium pt-1 border-t border-[#F5EFE6]">
                    <strong>Tip:</strong> {feat.tip}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-forest to-forest-light text-white shadow-warm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-editorial text-lg font-bold">
                  Practice {detail.name}
                </h4>
                <p className="text-xs text-[#D5C4AC] mt-1 max-w-sm">
                  Upload your attempt and our machine learning pipeline will check adherence to these authentic rules.
                </p>
              </div>

              <button
                onClick={() => navigate(`/analyse?art_form=${slug}`)}
                className="px-5 py-2.5 rounded-full bg-terracotta hover:bg-terracotta-hover text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>Analyse Artwork</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Techniques */}
      {activeTab === 'techniques' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EADFCF] shadow-sm space-y-6">
          <h3 className="font-editorial text-2xl font-bold text-forest">
            Traditional Materials & Techniques
          </h3>
          <p className="text-sm text-[#78716C]">
            Centuries of craft wisdom passed down through ancestral lineages in {detail.origin}.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {detail.materials_and_techniques.map((mat, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EADFCF]">
                <div className="w-6 h-6 rounded-full bg-forest text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  {mat}
                </p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl bg-[#F5EFE6] border border-[#EADFCF] mt-4">
            <h4 className="font-editorial text-base font-bold text-forest mb-1">
              Next Practice Exercise
            </h4>
            <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
              {detail.next_exercise}
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Mistakes */}
      {activeTab === 'mistakes' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EADFCF] shadow-sm space-y-6">
          <h3 className="font-editorial text-2xl font-bold text-forest">
            Common Learner Mistakes & Fixes
          </h3>
          <p className="text-sm text-[#78716C]">
            Avoid modern western conventions that disrupt traditional aesthetics.
          </p>

          <div className="space-y-4 pt-2">
            {detail.common_mistakes.map((mistake, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-red-50/50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-terracotta flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-forest">
                    {mistake}
                  </h4>
                  <p className="text-xs text-[#78716C] mt-1">
                    Study the authentic characteristics to keep line weight, flat color, and geometry grounded in tradition.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Gallery */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <h3 className="font-editorial text-2xl font-bold text-forest">
            Reference Artwork Gallery
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {detail.reference_gallery.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-[#EADFCF] shadow-warm">
                <img src={item.image} alt={item.title} className="w-full h-56 object-cover" />
                <div className="p-4">
                  <h4 className="font-editorial text-base font-bold text-forest">{item.title}</h4>
                  <p className="text-xs text-[#78716C] mt-0.5">{detail.name} Specimen</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
