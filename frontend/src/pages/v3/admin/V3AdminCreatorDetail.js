import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3GetCreator } from '../../../lib/v3api';
import { formatNairaV3 } from '../../../lib/v3data';
import {
  ArrowLeft, Briefcase, Globe, Linkedin, Mail, MapPin, Phone, Music,
  FolderOpen, Star, FileText, DollarSign, User, Building2, Calendar,
} from 'lucide-react';

const STAGE_LABEL = {
  connect: 'Connector',
  frame: 'Frame',
  plan: 'Plan',
  deliver: 'Delivery',
  closed: 'Closed',
};

const STAGE_TONE = {
  connect: 'bg-[#DDE7E2] text-[#1F4A3A]',
  frame: 'bg-[#F2EAD8] text-[#7A5F23]',
  plan: 'bg-[#E7E1F2] text-[#3E2A6B]',
  deliver: 'bg-[#DDE7E2] text-[#1F4A3A]',
  closed: 'bg-[#F4F2EC] text-[#6E6657]',
};

const cleanValue = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.toLowerCase() === 'nil' || s.toLowerCase() === 'n/a' || s === '-') return '';
  return s;
};

const InfoRow = ({ label, value, mono = false }) => {
  const v = cleanValue(value);
  if (!v) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[#F1ECDF] last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
      <span
        className={`text-[12px] text-[#1A1A1A] text-right break-words max-w-[60%] ${mono ? "font-mono" : ""}`}
        style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}
      >
        {v}
      </span>
    </div>
  );
};

const Section = ({ title, icon: Icon, children, action }) => (
  <div className="v3-card p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#1F4A3A]" />}
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Pill = ({ children, tone = 'bg-[#F4F2EC] text-[#6E6657]' }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${tone}`}>{children}</span>
);

const formatBudget = (amount, currency) => {
  if (!amount) return '';
  const ccy = currency || 'NGN';
  if (ccy === 'USD') return `$${Math.round(amount).toLocaleString()}`;
  return formatNairaV3(amount);
};

const V3AdminCreatorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [projects, setProjects] = useState([]);
  const [businessCases, setBusinessCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    v3GetCreator(id)
      .then((data) => {
        if (!mounted) return;
        setCreator(data?.creator || null);
        setProjects(Array.isArray(data?.projects) ? data.projects : []);
        setBusinessCases(Array.isArray(data?.business_cases) ? data.business_cases : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || err?.message || 'Failed to load creator.');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-10 text-[#8A8A8A] text-[13px]">Loading creator…</div>;
  if (error || !creator) {
    return (
      <div className="p-8" data-testid="v3-creator-not-found">
        <button onClick={() => navigate('/v3/admin/creators')} className="v3-btn-secondary text-[11px] mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to creators
        </button>
        <p className="text-[#B54A37] text-[13px]">{error || 'Creator not found.'}</p>
      </div>
    );
  }

  const channels = Array.isArray(creator.key_marketing_channels) ? creator.key_marketing_channels : [];
  const linkedProjectsValue = projects.reduce((sum, p) => sum + (p.estimated_value || p.value_amount || 0), 0);

  return (
    <div className="space-y-5" data-testid="v3-creator-detail">
      <button onClick={() => navigate('/v3/admin/creators')} className="v3-btn-secondary text-[11px]">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to creators
      </button>

      {/* Header */}
      <div className="v3-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1F4A3A] text-white flex items-center justify-center text-lg font-semibold">
              {(creator.name || '?')[0]}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Super Creative</p>
              <h1 className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }} data-testid="creator-name">
                {creator.name}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {creator.role && <Pill tone="bg-[#DDE7E2] text-[#1F4A3A]">{creator.role}</Pill>}
                {creator.tier && <Pill tone="bg-[#F2EAD8] text-[#7A5F23]">{creator.tier} tier</Pill>}
                {creator.current_relationship_status && (
                  <Pill tone="bg-[#E7E1F2] text-[#3E2A6B]">Current: {creator.current_relationship_status}</Pill>
                )}
                {creator.desired_relationship_status && (
                  <Pill tone="bg-[#DDE7E2] text-[#1F4A3A]">Goal: {creator.desired_relationship_status}</Pill>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Fee for engagement / month</p>
            <p className="text-2xl font-semibold text-[#1A1A1A] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {cleanValue(creator.fee_raw) || cleanValue(creator.fee_for_engagement_per_month) || cleanValue(creator.fee) || '—'}
            </p>
            {creator.relationship_manager_name && (
              <p className="text-[11px] text-[#8A8A8A] mt-2">RM · {creator.relationship_manager_name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-5">
          {/* Identity & Contact */}
          <Section title="Identity & contact" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="Creative name" value={creator.name} />
              <InfoRow label="Role" value={creator.role} />
              <InfoRow label="Primary contact" value={creator.primary_contact} />
              <InfoRow label="Email" value={creator.email} />
              <InfoRow label="Phone" value={creator.phone} />
              <InfoRow label="LinkedIn" value={creator.linkedin} />
              <InfoRow label="Website" value={creator.website} />
              <InfoRow label="Relationship manager" value={creator.relationship_manager_name} />
            </div>
          </Section>

          {/* Relationship */}
          <Section title="Relationship status" icon={Star}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[#E8E4DB] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Current</p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{cleanValue(creator.current_relationship_status) || 'Stranger'}</p>
              </div>
              <div className="rounded-lg border border-[#E8E4DB] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Desired</p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{cleanValue(creator.desired_relationship_status) || 'Friend'}</p>
              </div>
            </div>
          </Section>

          {/* Creative & talent profile */}
          <Section title="Creative & talent profile" icon={Music}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="Key marketing focus" value={creator.key_marketing_focus} />
              <InfoRow label="Primary target audience" value={creator.primary_target_audience} />
              <InfoRow label="Decision making process" value={creator.decision_making_process} />
              <InfoRow label="Current creative / talent process" value={creator.current_creative_talent_process} />
            </div>
            {channels.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Key marketing channels</p>
                <div className="flex flex-wrap gap-2">
                  {channels.map((ch) => <Pill key={ch} tone="bg-[#F4F2EC] text-[#1A1A1A]">{ch}</Pill>)}
                </div>
              </div>
            )}
          </Section>

          {/* Linked projects */}
          <Section title={`Linked projects (${projects.length})`} icon={FolderOpen}>
            {projects.length === 0 ? (
              <p className="text-[12px] text-[#8A8A8A]">No projects linked to this creator yet.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => {
                  const tone = STAGE_TONE[p.stage] || 'bg-[#F4F2EC] text-[#6E6657]';
                  return (
                    <button
                      key={p.id}
                      onClick={() => p.business_case_id
                        ? navigate(`/v3/admin/business-cases/${p.business_case_id}`)
                        : navigate(`/v3/admin/projects/${p.id}`)}
                      className="w-full rounded-lg border border-[#E8E4DB] bg-white p-3 text-left hover:border-[#1F4A3A] transition-colors"
                      data-testid={`creator-project-${p.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-[13px] font-medium text-[#1A1A1A]">{p.title || p.project_descriptor}</p>
                          <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                            {p.brand_name || p.folder}
                            {p.notes && ` · ${p.notes.slice(0, 80)}${p.notes.length > 80 ? '…' : ''}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <Pill tone={tone}>{STAGE_LABEL[p.stage] || p.stage_label || p.stage || 'Stage'}</Pill>
                          {(p.estimated_value || p.value_amount) > 0 && (
                            <p className="text-[11px] font-mono text-[#1A1A1A] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {formatBudget(p.estimated_value || p.value_amount, p.value_currency || p.budget_currency)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Linked business cases (creator as recommended) */}
          {businessCases.length > 0 && (
            <Section title={`Recommended on (${businessCases.length})`} icon={Briefcase}>
              <div className="space-y-2">
                {businessCases.map((bc) => (
                  <button
                    key={bc.id}
                    onClick={() => navigate(`/v3/admin/business-cases/${bc.id}`)}
                    className="w-full rounded-lg border border-[#E8E4DB] bg-white p-3 text-left hover:border-[#1F4A3A] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{bc.title}</p>
                      <Pill tone={STAGE_TONE[bc.stage] || 'bg-[#F4F2EC] text-[#6E6657]'}>{STAGE_LABEL[bc.stage] || bc.stage}</Pill>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Commercials */}
          <Section title="Commercials" icon={DollarSign}>
            <InfoRow label="Raw fee (workbook)" value={creator.fee_raw} mono />
            <InfoRow label="Parsed amount" value={creator.fee_amount ? `${creator.fee_currency || ''} ${Math.round(creator.fee_amount).toLocaleString()}` : ''} mono />
            <InfoRow label="Currency" value={creator.fee_currency} />
            <InfoRow label="Tier" value={creator.tier} />
            <InfoRow label="Linked project value" value={linkedProjectsValue ? formatBudget(linkedProjectsValue, projects[0]?.value_currency) : ''} mono />
          </Section>

          {/* Fit & scoring */}
          <Section title="Fit & scoring" icon={Star}>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8A8A8A]">Relationship maturity</span>
                  <span className="font-mono text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {creator.current_relationship_status === 'Intimate' ? '90%' :
                     creator.current_relationship_status === 'Friend' ? '60%' :
                     creator.current_relationship_status === 'Acquaintance' ? '35%' : '10%'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F4F2EC] overflow-hidden">
                  <div className="h-full bg-[#1F4A3A]" style={{
                    width: creator.current_relationship_status === 'Intimate' ? '90%' :
                           creator.current_relationship_status === 'Friend' ? '60%' :
                           creator.current_relationship_status === 'Acquaintance' ? '35%' : '10%'
                  }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8A8A8A]">Engagement load (linked projects)</span>
                  <span className="font-mono text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{projects.length}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8A8A8A]">Commercial signal</span>
                  <span className="font-mono text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {creator.fee_amount ? 'Disclosed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* Source / Provenance */}
          <Section title="Source" icon={FileText}>
            <InfoRow label="Source sheet" value={creator.source_sheet} />
            <InfoRow label="Source workbook" value={creator.source_workbook} />
            <InfoRow label="Source row" value={creator.source_row_number} mono />
            <InfoRow label="Imported at" value={creator.imported_at ? creator.imported_at.replace('T', ' ').slice(0, 16) : ''} mono />
          </Section>

          {/* Quick actions */}
          <Section title="Quick actions" icon={Briefcase}>
            <div className="space-y-2">
              {creator.email && cleanValue(creator.email) && (
                <a
                  href={`mailto:${creator.email}`}
                  className="v3-btn-secondary w-full justify-start text-[11px]"
                >
                  <Mail className="w-3.5 h-3.5" /> Email creative
                </a>
              )}
              {creator.phone && cleanValue(creator.phone) && (
                <a
                  href={`tel:${creator.phone}`}
                  className="v3-btn-secondary w-full justify-start text-[11px]"
                >
                  <Phone className="w-3.5 h-3.5" /> Call creative
                </a>
              )}
              {creator.linkedin && cleanValue(creator.linkedin) && (
                <a
                  href={creator.linkedin.startsWith('http') ? creator.linkedin : `https://${creator.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v3-btn-secondary w-full justify-start text-[11px]"
                >
                  <Linkedin className="w-3.5 h-3.5" /> Open LinkedIn
                </a>
              )}
              <button
                onClick={() => navigate(`/v3/admin/meetings?creator_id=${creator.id}&mode=new&type=qualification`)}
                className="v3-btn-primary w-full justify-start text-[11px]"
                data-testid="creator-schedule-meeting"
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule a meeting
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default V3AdminCreatorDetail;
