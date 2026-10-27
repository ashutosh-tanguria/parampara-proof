import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Share2, Download, Sparkles, BookOpen, ChevronRight, RefreshCw, BookmarkCheck } from 'lucide-react';
import { AnalysisReport } from '../types';

interface AnalysisResultsPageProps {
  analysisId: string;
  navigate: (route: string) => void;
  cachedReport?: AnalysisReport | null;
}

export const AnalysisResultsPage: React.FC<AnalysisResultsPageProps> = ({
  analysisId,
  navigate,
  cachedReport
}) => {
  const [report, setReport] = useState<AnalysisReport | null>(cachedReport || null);
  const [loading, setLoading] = useState(!cachedReport);
  const [saved, setSaved] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (!cachedReport || cachedReport.id !== analysisId) {
      setLoading(true);
      fetch(`/api/analysis/${analysisId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Analysis report not found');
          return res.json();
        })
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [analysisId, cachedReport]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#78716C]">Loading your artwork analysis report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-editorial text-2xl font-bold text-forest">Analysis Not Found</h2>
        <p className="text-sm text-[#78716C] mt-2">Could not retrieve the analysis report with ID: {analysisId}</p>
        <button
          onClick={() => navigate('/analyse')}
          className="mt-4 px-5 py-2 rounded-full bg-forest text-white text-xs font-semibold"
        >
          Analyse New Artwork
        </button>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EADFCF]">
        <button
          onClick={() => navigate('/analyse')}
          className="flex items-center gap-1.5 text-xs text-[#78716C] hover:text-forest transition-colors font-medium self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Upload</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#D5C4AC] text-xs font-semibold text-forest hover:bg-[#F5EFE6] transition-all shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedShare ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-forest text-white text-xs font-semibold hover:bg-forest-light transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Screen Title */}
      <div className="space-y-1">
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#153828]">
          Analysis Results
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C]">
          Here's what our model found about your artwork. This is an AI-powered analysis with expert guidance.
        </p>
      </div>

      {/* Two-Column Core Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Uploaded Artwork & Reference Example */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Uploaded Artwork Card */}
          <div className="bg-white rounded-3xl p-5 border border-[#EADFCF] shadow-warm space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-editorial text-lg font-bold text-forest">Your Artwork</h3>
              <span className="text-[11px] font-semibold text-terracotta uppercase tracking-wider">
                Target: {report.target_name}
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black/5 aspect-[4/3] border border-[#EADFCF]">
              <img
                src={report.image_url}
                alt="Uploaded Artwork"
                className="w-full h-full object-contain"
              />
            </div>

            {report.user_note && (
              <div className="p-3 bg-[#FAF7F2] rounded-xl text-xs text-[#57534E] italic border border-[#EADFCF]/60">
                "{report.user_note}"
              </div>
            )}
          </div>

          {/* Reference Comparison Card */}
          <div className="bg-white rounded-3xl p-5 border border-[#EADFCF] shadow-warm space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-editorial text-lg font-bold text-forest">Reference Example</h3>
              <button 
                onClick={() => navigate(`/art-forms/${report.target_art_form}`)}
                className="text-xs font-semibold text-terracotta hover:underline flex items-center gap-1"
              >
                <span>View More Examples</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-[16/9] border border-[#EADFCF]">
              <img
                src={report.reference_artwork}
                alt="Reference Specimen"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-[#78716C] px-1 italic">
              Reference image for this art form (see image credits).
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Overall Assessment, Strengths, Improvements, Feature Checks */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Overall Assessment Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADFCF] shadow-warm space-y-6">
            
            <div className="flex items-center gap-5">
              {/* Assessment Message */}
              <div className="space-y-1.5 flex-1">
                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Model-assisted observation
                </span>
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-forest">
                  Overall Assessment
                </h3>
                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  {report.overall_assessment}
                </p>
              </div>
            </div>

            {/* Model Signals breakdown */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADFCF] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-forest">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                  <span>Real Classifier Probabilities (Scikit-Learn)</span>
                </span>
                <span className="text-[10px] text-[#78716C]">
                  {report.model_version.split(' ')[0]}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {Object.entries(report.probabilities).map(([cls, prob]) => (
                  <div key={cls} className="bg-white p-2 rounded-xl border border-[#EADFCF] text-center">
                    <span className="text-[11px] font-semibold capitalize text-[#57534E] block">
                      {cls}
                    </span>
                    <span className={`text-sm font-bold ${cls === report.target_art_form ? 'text-terracotta' : 'text-forest'}`}>
                      {(prob * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#78716C] pt-1 italic">
                {report.style_match_comment}
              </p>
            </div>

            {/* Strengths */}
            <div className="space-y-3">
              <h4 className="font-editorial text-lg font-bold text-forest flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Strengths</span>
              </h4>
              <div className="space-y-2">
                {report.strengths.map((str, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm text-[#334155]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0 mt-2" />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="space-y-3">
              <h4 className="font-editorial text-lg font-bold text-forest flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-terracotta" />
                <span>Areas for Improvement</span>
              </h4>
              <div className="space-y-3">
                {report.areas_for_improvement.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-red-50/50 border border-red-200 text-xs sm:text-sm space-y-1.5">
                    <div className="font-bold text-terracotta flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-terracotta text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{item.issue}</span>
                    </div>
                    <p className="text-[#57534E] pl-7">
                      <strong>Why it matters:</strong> {item.why_it_matters}
                    </p>
                    <p className="text-forest pl-7 font-medium">
                      <strong>How to fix:</strong> {item.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Checks Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="font-editorial text-lg font-bold text-forest">
                Calibrated Traditional Feature Checks
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {report.feature_checks.map((fc) => {
                  const statusBadge = 
                    fc.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                    fc.status === 'weak' ? 'bg-amber-100 text-amber-800' :
                    fc.status === 'missing' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800';

                  return (
                    <div key={fc.id} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EADFCF] flex items-center justify-between text-xs">
                      <span className="font-medium text-[#44403C]">{fc.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge}`}>
                        {fc.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Practice Exercise */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#153828] to-[#1E4D37] text-white shadow-warm space-y-2">
              <div className="flex items-center gap-2 text-ochre-light text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Next Practice Exercise</span>
              </div>
              <p className="text-xs sm:text-sm text-[#D5C4AC] leading-relaxed">
                {report.next_exercise}
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#F5EFE6]">
              <button
                onClick={() => setSaved(true)}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                  saved ? 'bg-emerald-600 text-white' : 'bg-[#FAF7F2] border border-[#D5C4AC] text-forest hover:bg-forest hover:text-white'
                }`}
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{saved ? 'Saved to Portfolio!' : 'Save Artwork'}</span>
              </button>

              <button
                onClick={() => navigate('/analyse')}
                className="px-6 py-2.5 rounded-full bg-terracotta hover:bg-terracotta-hover text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Analyse Another Artwork</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
