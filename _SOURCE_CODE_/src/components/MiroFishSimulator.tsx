import { useState, useEffect, useRef } from 'react';
import { Fish, ArrowLeft, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { uploadSeed, startSimulation, getSimulationStatus, generateReport } from '../lib/mirofish';
import { toast } from 'sonner';

type Step = 'seed' | 'uploading' | 'simulating' | 'reporting' | 'done' | 'error';

interface Props {
  title: string;
  seedText: string;
  onBack: () => void;
}

export default function MiroFishSimulator({ title, seedText, onBack }: Props) {
  const [step, setStep]           = useState<Step>('seed');
  const [log, setLog]             = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const [graphId, setGraphId]     = useState('');
  const [simId, setSimId]         = useState('');
  const [report, setReport]       = useState('');
  const [editSeed, setEditSeed]   = useState(seedText);
  const logRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);

  const handleStart = async () => {
    setStep('uploading');
    setLog([]);
    try {
      addLog('Uploading seed document to MiroFish...');
      const { project_id, graph_id } = await uploadSeed(
        editSeed,
        title,
        'Analyze sentiment and predict outcome based on the provided data.'
      );
      setProjectId(project_id);
      setGraphId(graph_id);
      addLog(`Graph created — Project: ${project_id}`);

      setStep('simulating');
      addLog('Starting simulation (20 rounds × 15 agents)...');
      addLog('This will take ~25-30 minutes with Gemini free tier (15 RPM limit).');
      const sim = await startSimulation(project_id, graph_id);
      setSimId(sim.simulation_id);
      addLog(`Simulation started — ID: ${sim.simulation_id}`);

      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const status = await getSimulationStatus(sim.simulation_id);
        addLog(`[${attempts}] Status: ${status.status}`);
        if (status.status === 'completed') {
          clearInterval(poll);
          setStep('reporting');
          addLog('Simulation complete! Generating report...');
          const rpt = await generateReport(project_id, sim.simulation_id);
          setReport(rpt.content || rpt.summary || 'Report generated.');
          addLog('Report ready!');
          setStep('done');
        } else if (status.status === 'failed') {
          clearInterval(poll);
          addLog('Simulation failed.');
          setStep('error');
        }
      }, 60000); // poll every 60 seconds
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      toast.error(err.message);
      setStep('error');
    }
  };

  const stepInfo: Record<Step, { label: string; color: string }> = {
    seed:       { label: 'Ready',       color: '#6366f1' },
    uploading:  { label: 'Uploading',   color: '#f59e0b' },
    simulating: { label: 'Simulating',  color: '#6366f1' },
    reporting:  { label: 'Reporting',   color: '#6366f1' },
    done:       { label: 'Complete',    color: '#22c55e' },
    error:      { label: 'Error',       color: '#ef4444' },
  };

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 transition" style={{ color: 'var(--color-muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Fish size={20} style={{ color: '#a78bfa' }} />
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{title}</h1>
        </div>
        <span className="ml-auto text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: stepInfo[step].color + '22', color: stepInfo[step].color }}>
          {stepInfo[step].label}
        </span>
      </div>

      {/* Seed Editor */}
      {step === 'seed' && (
        <div className="rounded-xl border space-y-3 p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <FileText size={15} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Seed Document</span>
            <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>แก้ไขได้ก่อน simulate</span>
          </div>
          <textarea
            value={editSeed}
            onChange={e => setEditSeed(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none resize-none"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          />
          <button
            onClick={handleStart}
            className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Fish size={16} /> Start MiroFish Simulation
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
            ใช้เวลา ~25-30 นาที · Gemini free tier · ~245K tokens
          </p>
        </div>
      )}

      {/* Progress Log */}
      {step !== 'seed' && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            {step === 'done' ? <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
              : step === 'error' ? <XCircle size={16} style={{ color: '#ef4444' }} />
              : <Loader2 size={16} className="animate-spin" style={{ color: '#a78bfa' }} />}
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Progress</span>
          </div>
          <div ref={logRef} className="h-40 overflow-y-auto space-y-1 font-mono text-xs p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
            {log.map((l, i) => <div key={i} style={{ color: 'var(--color-muted)' }}>{l}</div>)}
          </div>
        </div>
      )}

      {/* Report */}
      {step === 'done' && report && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-surface)', borderColor: '#22c55e44' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
            <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>Prediction Report</span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
            {report}
          </div>
          <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}>
            Back to Trade
          </button>
        </div>
      )}

      {/* Error retry */}
      {step === 'error' && (
        <button
          onClick={() => { setStep('seed'); setLog([]); }}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#ef444422', color: '#ef4444' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
