import React from 'react';
import { ArrowRight, Sparkles, BookOpen, Upload, Users, ShieldCheck, CheckCircle2, ChevronRight, Award, Camera } from 'lucide-react';
import { ArtFormSummary } from '../types';

interface HomePageProps {
  navigate: (route: string) => void;
  artForms: ArtFormSummary[];
}

export const HomePage: React.FC<HomePageProps> = ({ navigate, artForms }) => {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-6 sm:pt-12 pb-10 sm:pb-16 bg-gradient-to-b from-[#FAF7F2] via-[#F8F4EC] to-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EADFCF]/60 text-forest border border-ochre/40 text-xs sm:text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-terracotta" />
                <span>Zero Paid AI APIs • Real Computer Vision</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#153828] leading-[1.12]">
                Preserving India's Art.<br />
                <span className="text-terracotta italic font-normal">Empowering</span> Future Generations.
              </h1>

              <p className="text-base sm:text-lg text-[#57534E] max-w-xl leading-relaxed">
                AI-powered platform to learn, analyse and preserve India's traditional art forms with expert guidance and evidence-based feedback.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  onClick={() => navigate('/art-forms')}
                  className="px-7 py-3.5 rounded-full bg-forest text-[#FAF7F2] font-semibold text-base shadow-warm hover:bg-forest-light hover:shadow-warm-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
                >
                  <span>Explore Art Forms</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/analyse')}
                  className="px-7 py-3.5 rounded-full bg-white text-forest border border-[#D5C4AC] font-semibold text-base shadow-sm hover:border-terracotta hover:text-terracotta transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Upload className="w-4 h-4 text-terracotta" />
                  <span>Upload Your Artwork</span>
                </button>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 sm:pt-8 border-t border-[#EADFCF]/80">
                <div>
                  <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#153828]">5+</div>
                  <div className="text-xs text-[#78716C] font-medium mt-0.5">Art Forms</div>
                </div>
                <div>
                  <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#153828]">100+</div>
                  <div className="text-xs text-[#78716C] font-medium mt-0.5">Expert Lessons</div>
                </div>
                <div>
                  <div className="font-editorial text-2xl sm:text-3xl font-bold text-terracotta">AI</div>
                  <div className="text-xs text-[#78716C] font-medium mt-0.5">Artwork Analysis</div>
                </div>
                <div>
                  <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#153828]">Community</div>
                  <div className="text-xs text-[#78716C] font-medium mt-0.5">Learners & Artists</div>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Artwork */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 group">
                <img
                  src="/assets/hero/hero-painting.jpg"
                  alt="Traditional Indian folk art hand painting"
                  className="w-full h-[320px] sm:h-[420px] object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating Badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-ochre/30 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta block">
                      Authentic Mastercraft
                    </span>
                    <span className="font-editorial text-base font-bold text-forest">
                      Madhubani Kachni Technique
                    </span>
                  </div>
                  <button 
                    onClick={() => navigate('/art-forms/madhubani')}
                    className="p-2 rounded-full bg-forest text-white hover:bg-terracotta transition-colors"
                    aria-label="View Madhubani"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Explore Indian Art Forms Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#153828]">
              Explore Indian Art Forms
            </h2>
            <p className="text-sm sm:text-base text-[#78716C] mt-2 max-w-xl">
              Discover the rich heritage, stories and techniques behind traditional Indian art forms.
            </p>
          </div>
          <button
            onClick={() => navigate('/art-forms')}
            className="text-sm font-semibold text-terracotta hover:text-terracotta-dark flex items-center gap-1.5 self-start sm:self-auto group"
          >
            <span>View All Art Forms</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 5 Art Forms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {artForms.slice(0, 5).map((art) => (
            <div
              key={art.slug}
              onClick={() => navigate(`/art-forms/${art.slug}`)}
              className="group bg-white rounded-2xl overflow-hidden border border-[#EADFCF]/70 shadow-warm hover:shadow-warm-lg transition-all duration-300 cursor-pointer flex flex-col"
            >
              <div className="relative h-48 sm:h-52 overflow-hidden bg-[#EADFCF]">
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
                    <span>AI Model Calibrated</span>
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-ochre/90 text-white shadow-sm">
                    <span>Knowledge Archive</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#153828] group-hover:text-terracotta transition-colors">
                    {art.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#78716C] mt-1.5 line-clamp-2">
                    {art.subtitle}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#F5EFE6] flex items-center justify-between text-xs font-semibold text-terracotta">
                  <span>Explore Tradition</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}

          {/* 6th Card: Try Analysis CTA */}
          <div
            onClick={() => navigate('/analyse')}
            className="rounded-2xl p-6 bg-gradient-to-br from-[#153828] to-[#1E4D37] text-white flex flex-col justify-between shadow-warm cursor-pointer hover:shadow-warm-lg group transition-all"
          >
            <div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-ochre-light mb-4">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#FAF7F2]">
                Have a painting to evaluate?
              </h3>
              <p className="text-sm text-[#D5C4AC] mt-2 leading-relaxed">
                Upload your hand-drawn artwork to test adherence to traditional motifs, line consistency, and color rules.
              </p>
            </div>

            <div className="pt-6">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-terracotta text-white font-semibold text-sm group-hover:bg-terracotta-hover transition-colors shadow-sm">
                <span>Upload & Analyse Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How the Platform Works Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F5EFE6]/60 rounded-3xl p-8 sm:p-12 border border-[#EADFCF]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-widest text-terracotta block mb-2">
              Step-by-Step Guidance
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#153828]">
              How Parampara Proof Works
            </h2>
            <p className="text-sm sm:text-base text-[#78716C] mt-2">
              Combining ethical computer vision, curated knowledge, and targeted practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-[#EADFCF]/70 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-forest text-[#FAF7F2] font-editorial text-lg font-bold flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-editorial text-lg font-bold text-forest mb-2">
                Upload Your Practice Drawing
              </h3>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Photograph your painting from your phone or desktop. Select the folk-art style you intended to practice.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-[#EADFCF]/70 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-terracotta text-white font-editorial text-lg font-bold flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-editorial text-lg font-bold text-forest mb-2">
                Real ML & Feature Check
              </h3>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Our scikit-learn classifier tests style match while computer vision checks borders, inverted stick anatomy, and color purity.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-[#EADFCF]/70 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-[#D4A373] text-[#153828] font-editorial text-lg font-bold flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-editorial text-lg font-bold text-forest mb-2">
                Grounded Feedback & Next Drill
              </h3>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Receive grounded strengths, specific cultural corrections, reference comparisons, and a concrete practice task.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Sample Analysis Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EADFCF] shadow-warm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#EADFCF] shadow-sm">
            <img
              src="/assets/analysis/warli-sample.jpg"
              alt="Warli artwork sample analysis"
              className="w-full h-64 sm:h-80 object-cover"
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-semibold backdrop-blur-sm">
              Analyzed Attempt
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-4">
              {/* Circular score gauge */}
              <div className="hidden justify-center rounded-full border-4 border-ochre bg-[#FAF7F2]">
                <div className="text-center">
                  <span className="font-editorial text-xl sm:text-2xl font-bold text-forest block leading-none">
                    78
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#78716C] font-semibold">
                    / 100
                  </span>
                </div>
              </div>

              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">
                  Good Attempt!
                </span>
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-forest">
                  Warli Painting Analysis Result
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
              Your artwork follows many traditional elements but needs some improvements in line thickness and figure proportions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F5EFE6]/60 rounded-xl border border-[#EADFCF]">
                <div className="font-bold text-forest flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Strengths</span>
                </div>
                <p className="text-[#78716C]">Follows geometric inverted triangles & Tarpa dance spiral motion.</p>
              </div>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-200">
                <div className="font-bold text-terracotta flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                  <span>Area for Improvement</span>
                </div>
                <p className="text-[#78716C]">Human figures can be more proportional with balanced head size.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/analysis/warli-demo-001')}
                className="px-6 py-2.5 rounded-full bg-forest text-white font-semibold text-xs sm:text-sm hover:bg-forest-light transition-all flex items-center gap-2"
              >
                <span>View Full Interactive Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
