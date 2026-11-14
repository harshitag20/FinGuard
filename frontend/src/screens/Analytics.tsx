import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Database, FileCheck, AlertTriangle, ExternalLink, Play, 
  CheckCircle2, Info, ArrowUpRight, ShieldCheck, RefreshCw, Layers
} from 'lucide-react';
import { useTheme } from '../App';
import { DatasetManifestItem } from '../types';
import { api } from '../services/apiService';

const Analytics: React.FC = () => {
  const { theme } = useTheme();
  const [datasets, setDatasets] = useState<DatasetManifestItem[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetManifestItem | null>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchDatasets = async () => {
    try {
      const data = await api.getDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
      }
    } catch (err) {
      console.warn("Dataset fetch failed", err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRunEvaluation = async (dsId: string) => {
    setIsEvaluating(true);
    try {
      const res = await api.runEvaluation(dsId, true);
      setEvalResult(res);
    } catch (err) {
      alert("Evaluation failed: " + err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className={`p-4 pb-28 space-y-4 max-w-lg mx-auto transition-colors duration-500 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Header */}
      <div className="pt-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Open Data & Scientific Benchmarking
        </span>
        <h1 className="text-xl font-extrabold tracking-tight">Dataset Intelligence & Evaluation</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Authentic Kaggle reference datasets, label mapping manifests, and held-out validation pipelines.
        </p>
      </div>

      {/* Dataset Selection Tabs */}
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
          Discovered Kaggle Datasets ({datasets.length})
        </span>

        <div className="space-y-2">
          {datasets.map(ds => {
            const isSelected = selectedDataset?.id === ds.id;
            return (
              <div
                key={ds.id}
                onClick={() => { setSelectedDataset(ds); setEvalResult(null); }}
                className={`p-3.5 rounded-3xl border cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                      {ds.datasetName}
                    </h3>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      License: <strong className="text-slate-600 dark:text-slate-300">{ds.license}</strong>
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    ds.ingestionStatus === 'LOCAL_DIRECTORY_SYNCED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {ds.ingestionStatus === 'LOCAL_DIRECTORY_SYNCED' ? 'SYNCED' : 'CATALOG ONLY'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5">
                  <span>Species: {ds.supportedSpecies.slice(0, 2).join(', ')}</span>
                  <a
                    href={ds.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center space-x-0.5"
                  >
                    <span>Kaggle Source</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Dataset Detail & Manifest Inspection */}
      {selectedDataset && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Dataset Manifest & Verified Labels
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              Files: {selectedDataset.totalFileCount > 0 ? selectedDataset.totalFileCount : 'Awaiting download'}
            </span>
          </div>

          {/* Labels Grid */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documented Pathology Labels</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedDataset.availableLabels.map((lbl, idx) => (
                <span
                  key={idx}
                  className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300"
                >
                  {lbl}
                </span>
              ))}
            </div>
          </div>

          {/* Known Limitations Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl text-[10px] space-y-1 text-amber-900 dark:text-amber-200">
            <div className="font-extrabold flex items-center space-x-1.5">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>Documented Dataset Limitations:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
              {selectedDataset.knownLimitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>

          {/* Evaluation Trigger Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Quantitative Validation Benchmark
                </h4>
                <p className="text-[10px] text-slate-400">
                  Tests screening agreement against held-out partition
                </p>
              </div>
              <button
                onClick={() => handleRunEvaluation(selectedDataset.id)}
                disabled={isEvaluating}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center space-x-1 transition-all"
              >
                <Play size={10} />
                <span>{isEvaluating ? 'Evaluating...' : 'Run Benchmark'}</span>
              </button>
            </div>

            {/* Benchmark Results Display */}
            {evalResult ? (
              evalResult.evaluated ? (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Overall Accuracy</span>
                      <strong className="text-base font-black text-emerald-600">
                        {(evalResult.metrics.overallAccuracy * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Macro F1 Score</span>
                      <strong className="text-base font-black text-blue-600">
                        {evalResult.metrics.macroF1.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Per-class breakdown table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-bold">
                          <th className="py-1">Class Label</th>
                          <th className="py-1">Precision</th>
                          <th className="py-1">Recall</th>
                          <th className="py-1">F1 Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {evalResult.metrics.perClassMetrics.map((pcm: any, i: number) => (
                          <tr key={i} className="text-slate-700 dark:text-slate-300">
                            <td className="py-1 font-bold">{pcm.label.replace(/_/g, ' ')}</td>
                            <td className="py-1">{(pcm.precision * 100).toFixed(0)}%</td>
                            <td className="py-1">{(pcm.recall * 100).toFixed(0)}%</td>
                            <td className="py-1 font-bold text-blue-600">{(pcm.f1Score * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[9px] text-slate-400 italic">
                    {evalResult.metrics.evaluationNotes}
                  </p>
                </div>
              ) : (
                <div className="p-2 bg-amber-500/10 rounded-xl text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                  {evalResult.reason}
                </div>
              )
            ) : (
              <div className="text-[10px] text-slate-400 italic pt-1">
                Evaluation status: <strong>Not evaluated</strong> (Click Run Benchmark to trigger evaluation).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Transparency & Scientific Integrity Notice */}
      <div className="bg-slate-100 dark:bg-slate-800/80 rounded-3xl p-4 border border-slate-200 dark:border-white/5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white">
          <ShieldCheck size={16} className="text-blue-500" />
          <span>Scientific Integrity Disclosure</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Gemini serves as a multimodal screening assistant, not a proprietary model trained on these datasets. Kaggle datasets provide curated disease reference baselines, label mapping schemas, and benchmark comparisons. Agreement with a dataset label does not replace definitive microbiological culture or histopathology.
        </p>
      </div>

    </div>
  );
};

export default Analytics;
