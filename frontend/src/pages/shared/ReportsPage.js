import React from 'react';
import { formatNaira } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { FileText, Download, BarChart3, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

const reports = [
  {
    id: 1,
    title: 'YBNL x Jumia — "Street to Screen" Campaign Report',
    project: 'PRJ-2026-0015',
    completed: '2026-02-28',
    budget: 22000000,
    actual: 21450000,
    deliverables: 45,
    onTime: 91,
    rating: 4.7,
    status: 'completed'
  },
  {
    id: 2,
    title: 'MTN x Wizkid Anniversary Campaign Report',
    project: 'PRJ-2025-0089',
    completed: '2025-12-15',
    budget: 38000000,
    actual: 37200000,
    deliverables: 32,
    onTime: 94,
    rating: 4.8,
    status: 'completed'
  },
  {
    id: 3,
    title: 'Johnnie Walker x Don Jazzy Q4 Report',
    project: 'PRJ-2025-0078',
    completed: '2025-12-31',
    budget: 25000000,
    actual: 24800000,
    deliverables: 28,
    onTime: 100,
    rating: 4.9,
    status: 'completed'
  },
  {
    id: 4,
    title: 'Beat FM New Year Concert Report',
    project: 'PRJ-2025-0095',
    completed: '2026-01-05',
    budget: 8000000,
    actual: 7950000,
    deliverables: 18,
    onTime: 89,
    rating: 4.6,
    status: 'completed'
  }
];

export const ReportsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Reports</h1>
          <p className="text-[#64748B] text-sm">Completed project reports and analytics</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export All
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Reports</p>
          <p className="text-lg font-bold text-[#0F172A]">{reports.length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Budget</p>
          <p className="text-lg font-bold text-[#0F172A] font-mono">₦93M</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Avg On-Time Rate</p>
          <p className="text-lg font-bold text-[#22C55E]">93.5%</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Avg Rating</p>
          <p className="text-lg font-bold text-[#0F172A]">4.75★</p>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="dashboard-card p-5" data-testid={`report-${report.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#2F55FF]" />
                </div>
                <div>
                  <h3 className="text-[#0F172A] font-semibold">{report.title}</h3>
                  <p className="text-[#94A3B8] text-sm">{report.project}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Completed: {report.completed}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-[#22C55E]" />
                      {report.deliverables} deliverables
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-ghost text-sm flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" /> View Details
                </button>
                <button className="btn-ghost text-sm flex items-center gap-1">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 p-4 bg-[#F8FAFC] rounded-lg">
              <div>
                <p className="text-[#94A3B8] text-xs mb-1">Budget</p>
                <p className="text-[#0F172A] font-mono">{formatNaira(report.budget, { compact: true })}</p>
              </div>
              <div>
                <p className="text-[#94A3B8] text-xs mb-1">Actual Spend</p>
                <p className="text-[#22C55E] font-mono">{formatNaira(report.actual, { compact: true })}</p>
              </div>
              <div>
                <p className="text-[#94A3B8] text-xs mb-1">Savings</p>
                <p className="text-[#22C55E] font-mono">{formatNaira(report.budget - report.actual, { compact: true })}</p>
              </div>
              <div>
                <p className="text-[#94A3B8] text-xs mb-1">On-Time Rate</p>
                <p className="text-[#0F172A] font-mono">{report.onTime}%</p>
              </div>
              <div>
                <p className="text-[#94A3B8] text-xs mb-1">Client Rating</p>
                <p className="text-[#D97706] font-mono">{report.rating}★</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
