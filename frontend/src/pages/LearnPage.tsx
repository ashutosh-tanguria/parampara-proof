import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, User, CheckCircle2, AlertCircle, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { LessonItem } from '../types';

interface LearnPageProps {
  navigate: (route: string) => void;
}

export const LearnPage: React.FC<LearnPageProps> = ({ navigate }) => {
  const [lessonsData, setLessonsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'mistakes' | 'exercises' | 'tips'>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string>('l-1');

  useEffect(() => {
    fetch('/api/lessons')
      .then((res) => res.json())
      .then((data) => setLessonsData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-[#153828]">
          Learn & Improve
        </h1>
        <p className="text-sm sm:text-base text-[#78716C] max-w-2xl">
          Step-by-step guidance to help you master Warli, Madhubani, Gond, and traditional art forms with master artisan techniques.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EADFCF] overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'video', label: 'Video Lessons' },
          { id: 'mistakes', label: 'Common Mistakes' },
          { id: 'exercises', label: 'Practice Exercises' },
          { id: 'tips', label: 'Expert Tips' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-terracotta text-terracotta'
                : 'border-transparent text-[#78716C] hover:text-forest'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: VIDEO LESSONS */}
      {activeTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Video Player */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-[#EADFCF] shadow-warm space-y-4">
            <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-black group">
              <img
                src={lessonsData?.featured?.video_image || '/assets/learning/video-warli-main.jpg'}
                alt="Warli Video Masterclass"
                className={`w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-90' : 'opacity-80'}`}
              />
              
              {/* Overlay Play / Pause Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 text-forest shadow-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-terracotta group-hover:text-white transition-all"
                  aria-label={isPlaying ? 'Pause Lesson' : 'Play Lesson'}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-1" />
                  )}
                </button>
              </div>

              {/* Video Bottom Progress Bar Indicator */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-medium">Masterclass Demonstration</span>
                </div>
                <span>{lessonsData?.featured?.duration || '8:24'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 px-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-editorial text-2xl font-bold text-forest">
                  {lessonsData?.featured?.title || 'Getting Started with Warli'}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EADFCF] text-xs font-semibold text-forest">
                  <User className="w-3.5 h-3.5 text-terracotta" />
                  <span>{lessonsData?.featured?.instructor || 'Warli Master Artisan'}</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                {lessonsData?.featured?.description || 'Learn the basic shapes, motifs and techniques used in traditional Warli art.'}
              </p>
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#EADFCF] shadow-warm space-y-4">
            <h4 className="font-editorial text-lg font-bold text-forest px-1">
              Course Playlist
            </h4>

            <div className="space-y-2.5">
              {(lessonsData?.playlist || [
                { id: 'l-1', title: 'Getting Started with Warli', duration: '8:24', thumbnail: '/assets/learning/thumb-getting-started.jpg' },
                { id: 'l-2', title: 'Basic Shapes and Motifs', duration: '6:12', thumbnail: '/assets/learning/thumb-basic-shapes.jpg' },
                { id: 'l-3', title: 'Human Figures & Anatomy', duration: '10:15', thumbnail: '/assets/learning/thumb-human-figures.jpg' },
                { id: 'l-4', title: 'Nature and Daily Life Themes', duration: '7:30', thumbnail: '/assets/learning/thumb-nature-themes.jpg' },
                { id: 'l-5', title: 'Complete Artwork Demo', duration: '12:40', thumbnail: '/assets/learning/thumb-complete-demo.jpg' }
              ]).map((item: any, idx: number) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedLesson(item.id)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    selectedLesson === item.id
                      ? 'border-terracotta bg-terracotta/5 shadow-sm'
                      : 'border-[#EADFCF] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-black/10 flex-shrink-0">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-current opacity-90" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-forest truncate">
                      {idx + 1}. {item.title}
                    </h5>
                    <span className="text-[11px] text-[#78716C] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#A8A29E]" />
                      <span>{item.duration}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/analyse')}
                className="w-full py-2.5 rounded-full bg-forest text-white text-xs font-semibold hover:bg-forest-light transition-colors text-center"
              >
                Finished Watching? Test Your Practice Drawing
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: COMMON MISTAKES */}
      {activeTab === 'mistakes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(lessonsData?.common_mistakes || []).map((m: any, idx: number) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-[#EADFCF] shadow-warm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-terracotta/10 text-terracotta">
                  {m.art_form}
                </span>
                <AlertCircle className="w-4 h-4 text-terracotta" />
              </div>
              <h4 className="font-editorial text-lg font-bold text-forest">
                Mistake: {m.mistake}
              </h4>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                <strong>Traditional Fix:</strong> {m.fix}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PRACTICE EXERCISES */}
      {activeTab === 'exercises' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(lessonsData?.practice_exercises || []).map((ex: any) => (
            <div key={ex.id} className="bg-white rounded-2xl p-6 border border-[#EADFCF] shadow-warm space-y-4 flex flex-col justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {ex.difficulty}
                </span>
                <h4 className="font-editorial text-xl font-bold text-forest mt-2">
                  {ex.title}
                </h4>
                <p className="text-xs text-[#78716C] mt-1">
                  Target tradition: {ex.art_form}
                </p>
              </div>

              <button
                onClick={() => navigate(`/analyse?art_form=${ex.art_form.toLowerCase()}`)}
                className="w-full py-2 rounded-full bg-forest text-white text-xs font-semibold hover:bg-forest-light transition-colors"
              >
                Submit Attempt
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: EXPERT TIPS */}
      {activeTab === 'tips' && (
        <div className="bg-white rounded-3xl p-8 border border-[#EADFCF] shadow-warm space-y-6 max-w-4xl mx-auto">
          <h3 className="font-editorial text-2xl font-bold text-forest">
            Curated Principles (pending expert review)
          </h3>
          <div className="space-y-4 text-xs sm:text-sm text-[#57534E]">
            <p className="p-4 bg-[#FAF7F2] rounded-xl border border-[#EADFCF]">
              <strong>1. Grounding in Ancestral Pigments:</strong> Traditional art gains vitality from organic textures. Avoid synthetic plastic acrylics when practicing on paper; use gouache, watercolors, or ground rice water.
            </p>
            <p className="p-4 bg-[#FAF7F2] rounded-xl border border-[#EADFCF]">
              <strong>2. Unbroken Outlines:</strong> Always maintain fluid wrist movement for continuous black line work (Kajal) before applying color blocks.
            </p>
            <p className="p-4 bg-[#FAF7F2] rounded-xl border border-[#EADFCF]">
              <strong>3. Stylized vs Western Realism:</strong> Folk art does not use 3D vanishing points or photographic shadows. Embrace flat planes, rhythmic repetition, and symbolic proportions.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
