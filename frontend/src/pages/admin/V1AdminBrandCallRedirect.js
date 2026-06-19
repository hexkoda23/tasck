import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { v3MoveBrandToBusinessCall } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';

const V1AdminBrandCallRedirect = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('Opening transcript workspace...');

  useEffect(() => {
    let mounted = true;
    const openTranscriptWorkspace = async () => {
      if (!brandId) {
        setNotice('Brand id is missing.');
        return;
      }
      try {
        const result = await v3MoveBrandToBusinessCall(brandId);
        const businessCaseId = result.business_case_id || result.business_case?.id;
        if (!businessCaseId) {
          if (mounted) setNotice('The V3 workflow did not return a Business Case id.');
          return;
        }
        navigate(adminRoute(`/business-cases/${businessCaseId}/frame/transcripts`), { replace: true });
      } catch (error) {
        const message = error?.response?.data?.detail || error?.message || 'Could not open the transcript workspace.';
        if (mounted) setNotice(message);
      }
    };
    openTranscriptWorkspace();
    return () => { mounted = false; };
  }, [brandId, navigate]);

  return (
    <div className="space-y-4" data-testid="v1-brand-call-redirect">
      <button type="button" onClick={() => navigate(adminRoute('/crm-brands'))} className="v3-btn-secondary text-[11px]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM Brands
      </button>
      <div className="v3-card flex items-center gap-3 p-6 text-[13px] text-[#4F3E2F]">
        <Loader2 className="h-4 w-4 animate-spin text-[#1F4A3A]" />
        <span>{notice}</span>
      </div>
    </div>
  );
};

export default V1AdminBrandCallRedirect;
