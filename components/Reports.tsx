import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import { ReportDetail, ReportListItem, ReportStatus, User } from '../types';
import { ArrowRight, CheckCircle, Clock, FileWarning, Plus, Trash2, X } from 'lucide-react';
import { deleteReport, getReportDetail, getReports, saveReport } from '../services/reportsService';

interface ReportsProps {
  user: User;
  onBack: () => void;
}

const getDisplayStatus = (item: ReportListItem, role: User['role']) => {
  if (item.instructorReportStatus === 'Reviewed') {
    return 'Reviewed';
  }

  if (role === 'Instructor') {
    return item.instructorReportStatus || item.refereeReportStatus || 'No Report';
  }

  return item.refereeReportStatus || 'No Report';
};

const Reports: React.FC<ReportsProps> = ({ user, onBack }) => {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ReportDetail | null>(null);
  const [isChoosingNew, setIsChoosingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    feedbackScore: 0,
    threePO_IOT: '',
    criteria: '',
    teamwork: '',
    generally: '',
  });

  const loadReports = async () => {
    const response = await getReports(user.id);
    setReports(response.reports);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await getReports(user.id);
        if (isMounted) {
          setReports(response.reports);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load reports.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const openReportDetail = async (item: ReportListItem) => {
    setIsLoadingDetail(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await getReportDetail(user.id, item.nominationId, item.refereeId);
      setSelectedDetail(response.report);
      const editorReport = user.role === 'Instructor' ? response.report.instructorReport : response.report.refereeReport;
      setFormData({
        feedbackScore: editorReport?.feedbackScore ?? 0,
        threePO_IOT: editorReport?.threePO_IOT ?? '',
        criteria: editorReport?.criteria ?? '',
        teamwork: editorReport?.teamwork ?? '',
        generally: editorReport?.generally ?? '',
      });
      setIsChoosingNew(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load report detail.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSaveReport = async (action: ReportStatus) => {
    if (!selectedDetail) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await saveReport({
        userId: user.id,
        nominationId: selectedDetail.item.nominationId,
        refereeId: selectedDetail.item.refereeId,
        action,
        feedbackScore: formData.feedbackScore,
        threePO_IOT: formData.threePO_IOT,
        criteria: formData.criteria,
        teamwork: formData.teamwork,
        generally: formData.generally,
      });

      setSelectedDetail(response.report);
      const editorReport = user.role === 'Instructor' ? response.report.instructorReport : response.report.refereeReport;
      setFormData({
        feedbackScore: editorReport?.feedbackScore ?? 0,
        threePO_IOT: editorReport?.threePO_IOT ?? '',
        criteria: editorReport?.criteria ?? '',
        teamwork: editorReport?.teamwork ?? '',
        generally: editorReport?.generally ?? '',
      });
      await loadReports();
      setSuccessMessage(action === 'Draft' ? 'Report saved as draft.' : 'Report submitted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedDetail) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteReport({
        userId: user.id,
        nominationId: selectedDetail.item.nominationId,
        refereeId: selectedDetail.item.refereeId,
      });
      await loadReports();
      setSelectedDetail(null);
      setSuccessMessage('Draft report deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete report.');
    } finally {
      setIsSaving(false);
    }
  };

  const eligibleNewReports = reports.filter((item) => {
    if (user.role === 'Referee') {
      return item.refereeReportStatus !== 'Submitted';
    }

    if (user.role === 'Instructor') {
      return item.refereeReportStatus === 'Submitted' && item.instructorReportStatus !== 'Submitted';
    }

    return false;
  });

  if (selectedDetail) {
    const item = selectedDetail.item;
    const isInstructor = user.role === 'Instructor';
    const currentReport = isInstructor ? selectedDetail.instructorReport : selectedDetail.refereeReport;
    const companionReport = isInstructor ? selectedDetail.refereeReport : selectedDetail.instructorReport;

    return (
      <Layout title={`${item.gameCode} Report`} onBack={() => setSelectedDetail(null)}>
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <div className="text-xs font-bold uppercase text-[#581c1c]">{item.gameCode}</div>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{item.teams}</h3>
          <p className="mt-2 text-sm text-slate-500">{item.matchDate} at {item.matchTime} • {item.venue}</p>
          <p className="mt-1 text-sm text-slate-500">{`Referee ${item.slotNumber}: ${item.refereeName}`}</p>
        </div>

        {selectedDetail.deadlineExceeded && selectedDetail.deadlineMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {selectedDetail.deadlineMessage}
          </div>
        )}

        {isInstructor && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
            <h3 className="text-base font-bold text-slate-900 mb-3">Referee Report</h3>
            {!selectedDetail.refereeReport ? (
              <p className="text-sm text-slate-500">Referee has not submitted the report yet.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div><span className="font-bold">3PO & IOT:</span> {selectedDetail.refereeReport.threePO_IOT}</div>
                <div><span className="font-bold">Criteria:</span> {selectedDetail.refereeReport.criteria}</div>
                <div><span className="font-bold">Teamwork:</span> {selectedDetail.refereeReport.teamwork}</div>
                <div><span className="font-bold">Generally:</span> {selectedDetail.refereeReport.generally}</div>
              </div>
            )}
          </div>
        )}

        {!isInstructor && companionReport && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
            <h3 className="text-base font-bold text-slate-900 mb-3">Instructor Report</h3>
            <div className="space-y-3 text-sm text-slate-700">
              <div><span className="font-bold">Score:</span> {companionReport.feedbackScore}</div>
              <div><span className="font-bold">3PO & IOT:</span> {companionReport.threePO_IOT}</div>
              <div><span className="font-bold">Criteria:</span> {companionReport.criteria}</div>
              <div><span className="font-bold">Teamwork:</span> {companionReport.teamwork}</div>
              <div><span className="font-bold">Generally:</span> {companionReport.generally}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-base font-bold text-slate-900 mb-4">{isInstructor ? 'Instructor Evaluation' : 'My Report'}</h3>

          {!selectedDetail.canEditCurrentUserReport && currentReport ? (
            <div className="space-y-3 text-sm text-slate-700">
              {isInstructor && <div><span className="font-bold">Score:</span> {currentReport.feedbackScore}</div>}
              <div><span className="font-bold">3PO & IOT:</span> {currentReport.threePO_IOT}</div>
              <div><span className="font-bold">Criteria:</span> {currentReport.criteria}</div>
              <div><span className="font-bold">Teamwork:</span> {currentReport.teamwork}</div>
              <div><span className="font-bold">Generally:</span> {currentReport.generally}</div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
                Status: {item.instructorReportStatus === 'Reviewed' ? 'Reviewed' : currentReport.status}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isInstructor && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.feedbackScore}
                    onChange={(e) => setFormData((prev) => ({ ...prev, feedbackScore: Number(e.target.value) }))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f97316] outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">3PO & IOT</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f97316] outline-none resize-none"
                  value={formData.threePO_IOT}
                  onChange={(e) => setFormData((prev) => ({ ...prev, threePO_IOT: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Criteria</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f97316] outline-none resize-none"
                  value={formData.criteria}
                  onChange={(e) => setFormData((prev) => ({ ...prev, criteria: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teamwork</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f97316] outline-none resize-none"
                  value={formData.teamwork}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teamwork: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Generally</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f97316] outline-none resize-none"
                  value={formData.generally}
                  onChange={(e) => setFormData((prev) => ({ ...prev, generally: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSaveReport('Draft')}
                  disabled={isSaving || selectedDetail.deadlineExceeded}
                  className="py-3 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleSaveReport('Submitted')}
                  disabled={isSaving || selectedDetail.deadlineExceeded}
                  className="py-3 bg-[#581c1c] text-white rounded-xl text-sm font-bold disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : isInstructor ? 'Submit Review' : 'Submit'}
                </button>
              </div>
              {currentReport?.status === 'Draft' && (
                <button
                  onClick={handleDeleteReport}
                  disabled={isSaving}
                  className="w-full mt-3 inline-flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-70"
                >
                  <Trash2 size={16} />
                  {isSaving ? 'Deleting...' : 'Delete Draft'}
                </button>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Reports" onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {(user.role === 'Referee' || user.role === 'Instructor') && (
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Recent Activity</h3>
          <button
            onClick={() => setIsChoosingNew((prev) => !prev)}
            className="text-xs font-bold text-[#581c1c] flex items-center gap-1 bg-[#581c1c]/5 px-3 py-1.5 rounded-full"
          >
            {isChoosingNew ? <X size={14} /> : <Plus size={14} />}
            New Report
          </button>
        </div>
      )}

      {isChoosingNew && (
        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-3">Choose Game For New Report</h3>
          {eligibleNewReports.length === 0 ? (
            <p className="text-sm text-slate-500">No report slot is available right now.</p>
          ) : (
            <div className="space-y-3">
              {eligibleNewReports.map((item) => (
                <button
                  key={`${item.nominationId}-${item.refereeId}`}
                  onClick={() => openReportDetail(item)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                >
                  <div className="text-xs font-bold uppercase text-[#581c1c]">{item.gameCode}</div>
                  <div className="font-semibold text-slate-900 mt-1">{item.teams}</div>
                  <div className="text-sm text-slate-500 mt-1">{item.matchDate} at {item.matchTime}</div>
                  <div className="text-sm text-slate-500">{item.refereeName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading reports...</p>
      ) : isLoadingDetail ? (
        <p className="text-sm text-slate-500">Loading report detail...</p>
      ) : user.role !== 'Referee' && user.role !== 'Instructor' ? (
        <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
          This role does not have report access.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const statusLabel = getDisplayStatus(report, user.role);
            return (
              <button
                key={`${report.nominationId}-${report.refereeId}`}
                onClick={() => openReportDetail(report)}
                className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    statusLabel === 'Reviewed' ? 'bg-green-50 text-green-600' :
                    statusLabel === 'Submitted' ? 'bg-blue-50 text-blue-600' :
                    statusLabel === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {statusLabel === 'Reviewed' ? <CheckCircle size={24} /> :
                     statusLabel === 'Submitted' ? <Clock size={24} /> :
                     statusLabel === 'Draft' ? <Clock size={24} /> : <FileWarning size={24} />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{report.gameCode} • {report.teams}</div>
                    <div className="text-xs text-slate-500">
                      {report.matchDate} • {report.refereeName} • {statusLabel}
                    </div>
                    {statusLabel === 'Reviewed' && report.reviewScore !== null && (
                      <div className="text-[11px] font-bold text-green-700 mt-1">
                        Score: {report.reviewScore}
                      </div>
                    )}
                    {user.role === 'Instructor' && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Referee report: {report.refereeReportStatus || 'Not submitted'} • Instructor report: {report.instructorReportStatus || 'Not started'}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-[#f97316] transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Reports;
