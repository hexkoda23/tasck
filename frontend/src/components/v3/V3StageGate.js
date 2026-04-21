import React from 'react';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

const stageNames = { connect: 'CONNECT', frame: 'FRAME', plan: 'PLAN', deliver: 'DELIVER', closed: 'CLOSED' };
const nextStage = { connect: 'FRAME', frame: 'PLAN', plan: 'DELIVER', deliver: 'CLOSED' };

const V3StageGate = ({ stage, conditions, onAdvance, canAdvance }) => {
  const allMet = conditions.every(c => c.status === 'done' || c.status === 'na');
  const next = nextStage[stage];

  return (
    <div className="v3-stage-gate" data-testid="v3-stage-gate">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] uppercase tracking-wider font-semibold v3-stage-${stage}`}>
          Stage: {stageNames[stage]}
        </span>
      </div>
      <div className="border-t border-[#E8E4DB] pt-3">
        <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-3">Exit conditions</p>
        <div className="space-y-1">
          {conditions.map((c, i) => (
            <div key={i} className={`v3-stage-gate-condition v3-stage-gate-condition--${c.status}`} data-testid={`gate-condition-${i}`}>
              {c.status === 'done' && <CheckCircle className="w-4 h-4 text-[#1F4A3A]" />}
              {c.status === 'pending' && <Circle className="w-4 h-4 text-[#D4CDBF]" />}
              {c.status === 'na' && <AlertCircle className="w-4 h-4 text-[#D4CDBF]" />}
              <span>{c.label}</span>
              {c.status === 'na' && c.note && <span className="text-[11px] italic ml-1 text-[#D4CDBF]">— {c.note}</span>}
            </div>
          ))}
        </div>
      </div>
      {next && (
        <button
          className="v3-btn-primary mt-5 w-full justify-center"
          disabled={!allMet || !canAdvance}
          onClick={onAdvance}
          data-testid="v3-advance-stage"
        >
          Advance to {next}
        </button>
      )}
    </div>
  );
};

export default V3StageGate;
