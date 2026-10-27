import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Upload, Sparkles, Filter, X } from 'lucide-react';
import { CommunityPost } from '../types';

interface CommunityPageProps {
  navigate: (route: string) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ navigate }) => {
  const [artworks, setArtworks] = useState<CommunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<'latest' | 'popular'>('latest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artForm, setArtForm] = useState('warli');

  useEffect(() => {
    fetch('/api/community')
      .then((res) => res.json())
      .then((data) => setArtworks(data.artworks || []))
      .catch((err) => console.error(err));
  }, []);

  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/community/${id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setArtworks((prev) =>
          prev.map((art) => (art.id === id ? { ...art, likes: data.likes } : art))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    alert('Community post link copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          art_form: artForm,
          image_url: '/assets/analysis/warli-sample.jpg',
          artist: 'Guest'
        })
      });

      if (res.ok) {
        const newArt = await res.json();
        setArtworks((prev) => [newArt, ...prev]);
        setIsModalOpen(false);
        setTitle('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sortedArtworks = [...artworks].sort((a, b) => {
    if (activeTab === 'popular') return b.likes - a.likes;
    return 0; // default latest order
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header & Submission CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#153828]">
            Community Artworks
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Explore authentic practice drawings shared by learners and traditional artisans across India.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-full bg-forest text-white text-xs sm:text-sm font-semibold hover:bg-forest-light transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Upload className="w-4 h-4 text-terracotta" />
          <span>Share Your Artwork</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#EADFCF] pb-2">
        <button
          onClick={() => setActiveTab('latest')}
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'latest' ? 'bg-forest text-white' : 'text-[#78716C] hover:text-forest'
          }`}
        >
          Latest
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'popular' ? 'bg-forest text-white' : 'text-[#78716C] hover:text-forest'
          }`}
        >
          Popular
        </button>
      </div>

      {/* Artworks Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {sortedArtworks.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl overflow-hidden border border-[#EADFCF] shadow-warm hover:shadow-warm-lg transition-all flex flex-col justify-between"
          >
            {/* Artwork Image */}
            <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-forest uppercase tracking-wider">
                {item.art_form}
              </span>
              {item.is_curated && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                  Curated
                </span>
              )}
            </div>

            {/* Post Information */}
            <div className="p-5 space-y-4">
              {/* Author & Timestamp */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center font-bold text-xs">
                  {item.artist[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-forest leading-tight">
                    {item.artist}
                  </h4>
                  <span className="text-[10px] text-[#A8A29E]">
                    {item.created_at}
                  </span>
                </div>
              </div>

              <h3 className="font-editorial text-lg font-bold text-forest line-clamp-2">
                {item.title}
              </h3>

              {/* Interactions Bar */}
              <div className="pt-3 border-t border-[#F5EFE6] flex items-center justify-between text-xs text-[#78716C]">
                <button
                  onClick={() => handleLike(item.id)}
                  className="flex items-center gap-1.5 hover:text-terracotta transition-colors active:scale-125"
                >
                  <Heart className="w-4 h-4 fill-terracotta/10 text-terracotta" />
                  <span className="font-semibold">{item.likes}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>{item.comments}</span>
                </div>

                <button
                  onClick={handleShare}
                  className="hover:text-forest transition-colors p-1"
                  title="Share Post"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload to Community Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 border border-[#EADFCF] shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#78716C] hover:text-forest"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-editorial text-2xl font-bold text-forest">
              Share to Community
            </h3>
            <p className="text-xs text-[#78716C]">
              Share your latest folk-art attempt with our network of fellow learners and traditional artisans.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-[#57534E]">
                  Artwork Caption
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Practicing Warli Tarpa dance spiral..."
                  required
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-[#D5C4AC] bg-[#FAF7F2] outline-none focus:border-terracotta"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-[#57534E]">
                  Art Form
                </label>
                <select
                  value={artForm}
                  onChange={(e) => setArtForm(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-[#D5C4AC] bg-[#FAF7F2] outline-none"
                >
                  <option value="warli">Warli</option>
                  <option value="madhubani">Madhubani</option>
                  <option value="gond">Gond</option>
                  <option value="pattachitra">Pattachitra</option>
                  <option value="pottery">Traditional Pottery</option>
                  <option value="kalamkari">Kalamkari</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-forest text-white font-semibold text-xs sm:text-sm hover:bg-forest-light transition-all shadow-sm"
                >
                  Publish to Community Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
