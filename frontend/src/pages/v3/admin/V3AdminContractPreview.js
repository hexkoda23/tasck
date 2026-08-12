import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Projects, v3CreativeSnapshots, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import { ChevronLeft, Download } from 'lucide-react';

const V3AdminContractPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const project = v3Projects.find(p => p.id === id);
  const brand = project ? getBrand(project.brandId) : null;
  const creator = project ? getCreator(project.creatorId) : null;
  const rm = project ? getRM(project.rmId) : null;

  if (!project) return <div className="p-8 text-[#8A8A8A]">Project not found.</div>;

  const isRetainer = project.engagement === 'retainer';
  const managementFee = Math.round(project.estimatedValue * (isRetainer ? 0.15 : 0.12));

  return (
    <div data-testid="v3-admin-contract-preview">
      <button onClick={() => navigate(`/v3/admin/projects/${id}`)} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to project
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CONTRACT</p>
          <h1 className="v3-heading text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Campaign Services Agreement</h1>
        </div>
        <button className="v3-btn-secondary"><Download className="w-3.5 h-3.5" /> Download PDF</button>
      </div>

      <V3DocumentSurface
        title="Campaign Services Agreement"
        meta={`Contract ref: TASCK-${project.id.toUpperCase()} | ${isRetainer ? 'Retainer' : 'Direct'} Engagement | Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      >
        <h2>1. Parties</h2>
        <p><strong>Client:</strong> {brand?.company} ("{brand?.company?.split(' ')[0]}"), represented by {brand?.primaryContact}, {brand?.role}, with registered offices at {brand?.hq}.</p>
        <p><strong>Agency:</strong> The TASCK Agency Limited ("TASCK"), a creator campaign engine registered in Lagos, Nigeria, with offices at Victoria Island, Lagos.</p>
        {creator && <p><strong>Creator:</strong> {creator.name} ("{creator.name}"), represented by their management, for the purposes of creative services under this engagement.</p>}

        <h2>2. Project Scope</h2>
        <p><strong>Campaign Title:</strong> "{project.title}"</p>
        <p><strong>Engagement Model:</strong> {isRetainer ? 'Retainer - strategic advisory + campaign management' : 'Direct - single-project execution'}</p>
        <p><strong>Estimated Value:</strong> {formatNairaV3(project.estimatedValue)}</p>
        <p>TASCK shall provide campaign strategy, creator matching, creative direction oversight, production management, deliverable quality assurance, and project closure services as detailed in the Strategy Snapshot (Appendix A, to be attached upon approval).</p>

        <h2>3. Fee Structure</h2>
        {isRetainer && (
          <>
            <p><strong>Strategy Development Fee:</strong> {formatNairaV3(managementFee)} (15% of estimated value), payable after creator briefing and tracked before Delivery. Frame, including Alignment Snapshot review, remains fee-free.</p>
            <p><strong>Management Fee:</strong> 15% of the total approved campaign budget, payable upon Strategy Snapshot approval and project commencement into the Deliver stage.</p>
          </>
        )}
        {!isRetainer && (
          <p><strong>Management Fee:</strong> {formatNairaV3(managementFee)} (12% of total budget), payable upon Strategy Snapshot approval and project commencement.</p>
        )}

        <h2>4. Payment Terms</h2>
        <p>All invoices are payable within {isRetainer ? '14' : '21'} days of issuance. Late payments shall incur a 2% monthly surcharge. TASCK reserves the right to pause deliverables if payment is overdue by more than 30 days.</p>
        <p>Creator payments are held in escrow by TASCK and released upon brand approval of each contracted deliverable, as specified in the Strategy Snapshot timeline.</p>

        <h2>5. Usage Rights</h2>
        <p>All content produced under this Agreement is licensed to the Client for a period of <strong>12 months</strong> from the date of final deliverable approval. Usage territory: {brand?.industry?.includes('Alcohol') ? 'Pan-African (Nigeria, Kenya, South Africa, Cameroon)' : 'Nigeria (primary) with option for pan-African extension'}.</p>
        <p>Creator retains moral rights and portfolio usage rights. Any extension of usage rights beyond 12 months requires a separate licensing agreement negotiated through TASCK.</p>

        <h2>6. Creative Control</h2>
        <p>The Creator shall have final edit approval on all creative deliverables, subject to a brand safety clause. Brand safety is defined as: no content that could reasonably be interpreted as harmful, offensive, or inconsistent with the Client's public brand guidelines (to be provided by Client within 5 business days of contract execution).</p>

        <h2>7. Scope Changes</h2>
        <p>Any deviation from the agreed scope (as defined in the approved Strategy Snapshot) must be submitted as a formal Scope Change Request through the TASCK platform. Scope changes require written approval from both Client and TASCK before execution. Unapproved scope changes will not be invoiced.</p>

        <h2>8. Confidentiality</h2>
        <p>All parties agree to maintain confidentiality of campaign strategies, financial terms, creator rates, and brand-sensitive information for a period of 24 months following project closure. Standard NDA terms apply.</p>

        <h2>9. Termination</h2>
        <p>Either party may terminate this Agreement with 14 days' written notice. In the event of termination, Client shall pay for all work completed to date, including any creator commitments that cannot be reasonably unwound.</p>

        <h2>10. Signatures</h2>
        <p>This Agreement is executed electronically via the TASCK platform.</p>
        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="border-t-2 border-[#E8E4DB] pt-3">
            <p className="text-[11px] text-[#8A8A8A]">For the Client</p>
            <p className="text-[13px] text-[#1A1A1A] font-medium mt-2">{brand?.primaryContact}</p>
            <p className="text-[11px] text-[#8A8A8A]">{brand?.role}</p>
            <p className="text-[11px] text-[#D4CDBF] italic mt-2">Pending signature</p>
          </div>
          <div className="border-t-2 border-[#E8E4DB] pt-3">
            <p className="text-[11px] text-[#8A8A8A]">For TASCK</p>
            <p className="text-[13px] text-[#1A1A1A] font-medium mt-2">{rm?.name}</p>
            <p className="text-[11px] text-[#8A8A8A]">Relationship Manager</p>
            <p className="text-[11px] text-[#D4CDBF] italic mt-2">Pending signature</p>
          </div>
          {creator && (
            <div className="border-t-2 border-[#E8E4DB] pt-3">
              <p className="text-[11px] text-[#8A8A8A]">For the Creator</p>
              <p className="text-[13px] text-[#1A1A1A] font-medium mt-2">{creator.name}</p>
              <p className="text-[11px] text-[#8A8A8A]">{creator.genre}</p>
              <p className="text-[11px] text-[#D4CDBF] italic mt-2">Pending signature</p>
            </div>
          )}
        </div>
      </V3DocumentSurface>
    </div>
  );
};

export default V3AdminContractPreview;
