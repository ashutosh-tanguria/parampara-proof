import React, { useState, useRef } from 'react';
import { Upload, Camera, X, RefreshCw, CheckCircle2, AlertCircle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { ArtFormSummary, AnalysisReport } from '../types';

interface AnalyseUploadPageProps {
  navigate: (route: string) => void;
  artForms: ArtFormSummary[];
  onAnalysisComplete: (report: AnalysisReport) => void;
  initialArtForm?: string;
}

export const AnalyseUploadPage: React.FC<AnalyseUploadPageProps> = ({
  navigate,
  artForms,
  onAnalysisComplete,
  initialArtForm = 'warli'
}) => {
  const [selectedArtForm, setSelectedArtForm] = useState(initialArtForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userNote, setUserNote] = useState('');
  const [language, setLanguage] = useState('English');
  const [isDragging, setIsDragging] = useState(false);
  
  // Progress states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState(0); // 0 to 4
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit.');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleUseSample = () => {
    fetch('/assets/analysis/warli-sample.jpg')
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], 'warli-sample-practice.jpg', { type: 'image/jpeg' });
        handleFile(file);
        setSelectedArtForm('warli');
        setUserNote("I'm trying to draw a traditional Tarpa dance village scene, but unsure about figure proportions.");
      })
      .catch((err) => console.error(err));
  };

  const startAnalysis = async () => {
    if (!selectedFile) {
      setErrorMsg('Please upload your artwork before continuing.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setProgressStep(1);
    setProgressPercent(20);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('art_form', selectedArtForm);
    formData.append('user_note', userNote);
    formData.append('language', language);

    try {
      // Step 1: Detect art form
      setTimeout(() => {
        setProgressStep(2);
        setProgressPercent(45);
      }, 700);

      // Step 2: Analysing patterns and shapes
      setTimeout(() => {
        setProgressStep(3);
        setProgressPercent(70);
      }, 1400);

      // Step 3: Checking with expert knowledge
      setTimeout(() => {
        setProgressStep(4);
        setProgressPercent(90);
      }, 2100);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Analysis failed. Please try again.');
      }

      const report: AnalysisReport = await res.json();
      
      setTimeout(() => {
        setProgressPercent(100);
        onAnalysisComplete(report);
        navigate(`/analysis/${report.id}`);
      }, 2600);

    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorMsg(err.message || 'An error occurred during analysis.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      
      {/* 4-Step Stepper Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#EADFCF] -translate-y-1/2 z-0" />
          
          {[
            { step: 1, label: 'Upload' },
            { step: 2, label: 'Select Art Form' },
            { step: 3, label: 'Analysis' },
            { step: 4, label: 'Results' }
          ].map((s) => {
            const isCompleted = isAnalyzing ? s.step <= 3 : s.step === 1 && selectedFile !== null;
            const isCurrent = isAnalyzing ? s.step === 3 : (selectedFile ? s.step === 2 : s.step === 1);
            return (
              <div key={s.step} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-terracotta text-white ring-4 ring-terracotta/20'
                      : isCompleted
                      ? 'bg-forest text-white'
                      : 'bg-white text-[#78716C] border-2 border-[#D5C4AC]'
                  }`}
                >
                  {s.step}
                </div>
                <span className="text-[11px] font-medium text-[#78716C] mt-1.5 hidden sm:block">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen Title */}
      <div className="text-center space-y-2">
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#153828]">
          {isAnalyzing ? 'Analysing Your Artwork' : 'Upload Your Artwork'}
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] max-w-lg mx-auto">
          {isAnalyzing
            ? 'Our ML model and CV feature checker are examining your artwork using curated traditional features.'
            : 'Get evidence-based traditional art analysis and expert guidance for your practice painting.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-terracotta text-xs sm:text-sm flex items-center gap-2 max-w-xl mx-auto">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* VIEW A: ANALYSING PROGRESS SCREEN */}
      {isAnalyzing ? (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-[#EADFCF] shadow-warm space-y-8">
          
          {/* Radar Scanning HUD Container */}
          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border-2 border-terracotta/40 shadow-inner bg-black">
            <img
              src={previewUrl || '/assets/analysis/warli-sample.jpg'}
              alt="Scanning Artwork"
              className="w-full h-full object-cover opacity-85"
            />
            {/* Radar Circular Grid Overlay */}
            <div className="absolute inset-0 border border-terracotta/30 rounded-2xl pointer-events-none" />
            <div className="absolute inset-4 border border-terracotta/20 rounded-full pointer-events-none animate-pulse-ring" />
            <div className="absolute inset-12 border border-terracotta/30 rounded-full pointer-events-none" />
            <div className="absolute inset-20 border border-terracotta/40 rounded-full pointer-events-none" />
            
            {/* Rotating Radar Sweep Line */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-full animate-radar origin-center bg-gradient-to-tr from-terracotta/20 via-transparent to-transparent" />
            </div>

            {/* Crosshair */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-terracotta/40 pointer-events-none" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-terracotta/40 pointer-events-none" />
          </div>

          {/* Checklist */}
          <div className="space-y-3 max-w-md mx-auto text-xs sm:text-sm">
            <div className={`flex items-center gap-2.5 ${progressStep >= 1 ? 'text-forest font-semibold' : 'text-[#A8A29E]'}`}>
              <CheckCircle2 className={`w-4 h-4 ${progressStep >= 1 ? 'text-emerald-600' : 'text-[#D5C4AC]'}`} />
              <span>Detecting art form and palette...</span>
            </div>
            <div className={`flex items-center gap-2.5 ${progressStep >= 2 ? 'text-forest font-semibold' : 'text-[#A8A29E]'}`}>
              <CheckCircle2 className={`w-4 h-4 ${progressStep >= 2 ? 'text-emerald-600' : 'text-[#D5C4AC]'}`} />
              <span>Analysing geometric patterns, contours and shapes...</span>
            </div>
            <div className={`flex items-center gap-2.5 ${progressStep >= 3 ? 'text-forest font-semibold' : 'text-[#A8A29E]'}`}>
              <CheckCircle2 className={`w-4 h-4 ${progressStep >= 3 ? 'text-emerald-600' : 'text-[#D5C4AC]'}`} />
              <span>Matching with curated reference guidance...</span>
            </div>
            <div className={`flex items-center gap-2.5 ${progressStep >= 4 ? 'text-forest font-semibold' : 'text-[#A8A29E]'}`}>
              <CheckCircle2 className={`w-4 h-4 ${progressStep >= 4 ? 'text-emerald-600' : 'text-[#D5C4AC]'}`} />
              <span>Generating grounded feedback and practice drill...</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="h-2.5 w-full bg-[#EADFCF] rounded-full overflow-hidden">
              <div
                className="h-full bg-terracotta transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#78716C] font-semibold">
              <span>Analysing visual signals</span>
              <span>{progressPercent}%</span>
            </div>
          </div>

          {/* Cultural Fact Box */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EADFCF] text-xs text-[#57534E] max-w-md mx-auto flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <strong className="text-forest block mb-0.5">Did you know?</strong>
              Warli art traditionally used simple geometric shapes—triangles for human torso and circles for heads—to symbolize humanity's eternal harmony with the forest.
            </div>
          </div>

        </div>
      ) : (
        /* VIEW B: UPLOAD CONTROLS SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Dropzone & Preview */}
          <div className="lg:col-span-7 space-y-6">
            
            {!previewUrl ? (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-terracotta bg-terracotta/5'
                    : 'border-[#D5C4AC] bg-white hover:border-terracotta hover:bg-[#FAF7F2]'
                } shadow-sm group`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-full bg-[#FAF7F2] text-terracotta border border-ochre/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="font-editorial text-xl font-bold text-forest mb-1">
                  Drag and drop your image here
                </h3>
                <p className="text-xs sm:text-sm text-[#78716C] mb-4">
                  or click to browse from device / camera
                </p>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] text-[11px] font-medium text-[#78716C] border border-[#EADFCF]">
                  Supports: JPG, PNG, WEBP (Max 10MB)
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 border border-[#EADFCF] shadow-sm space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black/5 aspect-[4/3]">
                  <img
                    src={previewUrl}
                    alt="Upload Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={handleRemove}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-terracotta transition-colors"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-[#78716C] px-1">
                  <span className="font-medium truncate max-w-xs">{selectedFile?.name}</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-terracotta hover:underline font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace Image</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Sample Button */}
            {!previewUrl && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#EADFCF] text-xs">
                <span className="text-[#78716C]">Don't have a drawing handy right now?</span>
                <button
                  onClick={handleUseSample}
                  className="px-3.5 py-1.5 rounded-full bg-[#F5EFE6] text-forest font-semibold hover:bg-forest hover:text-white transition-colors"
                >
                  Try Sample Warli Artwork
                </button>
              </div>
            )}

            {/* Privacy notice */}
            <div className="flex items-start gap-2.5 text-xs text-[#78716C] px-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero Commercial AI APIs</strong>: Your artwork is processed privately on our ML pipeline. It is not fed into external commercial LLMs or shared publicly without your explicit choice.
              </span>
            </div>

          </div>

          {/* Right Column: Parameters & Submission */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-[#EADFCF] shadow-warm space-y-6">
            
            {/* Art Form Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#57534E]">
                Select Art Form (or we'll test match)
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {artForms.map((art) => (
                  <button
                    key={art.slug}
                    type="button"
                    onClick={() => setSelectedArtForm(art.slug)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedArtForm === art.slug
                        ? 'border-terracotta bg-terracotta/5 ring-2 ring-terracotta/20'
                        : 'border-[#EADFCF] hover:border-[#D5C4AC] bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-editorial text-sm font-bold text-forest">
                        {art.name.split(' ')[0]}
                      </span>
                      {selectedArtForm === art.slug && (
                        <CheckCircle2 className="w-4 h-4 text-terracotta" />
                      )}
                    </div>
                    <span className="text-[10px] text-[#78716C]">
                      {art.automated_supported ? 'Calibrated Model' : 'Knowledge Archive'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Description / Learning Question */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#57534E]">
                Tell us about your artwork (optional)
              </label>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="e.g., I'm trying to draw a village scene but unsure about the proportions and line weight..."
                rows={3}
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-[#D5C4AC] bg-[#FAF7F2] focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta outline-none transition-all placeholder:text-[#A8A29E]"
              />
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#57534E]">
                Feedback Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-[#D5C4AC] bg-[#FAF7F2] outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Bengali">বাংলা (Bengali)</option>
              </select>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                onClick={startAnalysis}
                disabled={!selectedFile}
                className={`w-full py-3.5 rounded-full font-semibold text-sm shadow-warm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  selectedFile
                    ? 'bg-terracotta text-white hover:bg-terracotta-hover shadow-warm-lg cursor-pointer'
                    : 'bg-[#EADFCF] text-[#A8A29E] cursor-not-allowed'
                }`}
              >
                <span>Analyse Artwork</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
