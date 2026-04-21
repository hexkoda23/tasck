import React, { useState } from 'react';
import Logo from '../../components/shared/Logo';
import { CheckCircle, ArrowRight, FolderOpen, FileCheck, Bell } from 'lucide-react';

const V3BrandOnboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to TASCK',
      desc: 'Your brand portal is ready. Here you\'ll track your campaigns, review documents, approve deliverables, and manage invoices — all in one place.',
      icon: FolderOpen,
      detail: 'Your dedicated Relationship Manager, Temi Bakare, has set up your account and will be your primary point of contact throughout every campaign.',
    },
    {
      title: 'Your Document Vault',
      desc: 'Every document generated for your campaigns — Alignment Snapshots, Creative Snapshots, contracts, and final reports — lives here. Version-controlled and always accessible.',
      icon: FileCheck,
      detail: 'When a document is ready for your review, you\'ll see it in Approvals. Approve or request changes directly from the portal — no email ping-pong.',
    },
    {
      title: 'Stay in the Loop',
      desc: 'You\'ll receive notifications when documents are ready, deliverables are uploaded, or invoices are issued. Configure your preferences in Settings.',
      icon: Bell,
      detail: 'Your team members (Chidi and Ngozi) have been added with the access levels you specified. Chidi is a co-approver on financial items.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAF7] flex items-center justify-center p-6" data-testid="v3-brand-onboarding">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo variant="light" size="sm" />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-[#1F4A3A] w-8' : 'bg-[#E8E4DB] w-4'}`} />
          ))}
        </div>

        <div className="v3-card p-8 text-center">
          {step < steps.length ? (
            <>
              {React.createElement(steps[step].icon, { className: 'w-10 h-10 text-[#1F4A3A] mx-auto mb-4', strokeWidth: 1.2 })}
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{steps[step].title}</h2>
              <p className="text-[14px] text-[#5C5C5C] mb-4 leading-relaxed">{steps[step].desc}</p>
              <p className="text-[12px] text-[#8A8A8A] leading-relaxed mb-6">{steps[step].detail}</p>
              <div className="flex gap-3 justify-center">
                {step > 0 && <button onClick={() => setStep(s => s - 1)} className="v3-btn-secondary">Back</button>}
                <button onClick={() => setStep(s => s + 1)} className="v3-btn-primary">
                  {step < steps.length - 1 ? <><span>Next</span><ArrowRight className="w-3.5 h-3.5" /></> : 'Get Started'}
                </button>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-12 h-12 text-[#1F4A3A] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>You're all set</h2>
              <p className="text-[14px] text-[#5C5C5C] mb-6">Your portal is ready. Explore your projects, review documents, and reach out to your RM anytime.</p>
              <button onClick={onComplete} className="v3-btn-primary" data-testid="onboarding-complete">Enter Portal</button>
            </>
          )}
        </div>

        <p className="text-[10px] text-[#8A8A8A] text-center mt-6">&copy; 2026 The TASCK Agency. All rights reserved.</p>
      </div>
    </div>
  );
};

export default V3BrandOnboarding;
