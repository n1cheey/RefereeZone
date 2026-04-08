import React, { useEffect, useState } from 'react';
import { AlarmClockPlus, ArrowRight, CheckCircle, Clock, ExternalLink, FileWarning, Pencil, Plus, Trash2, X } from 'lucide-react';
import Layout from './Layout';
import { ReportDetail, ReportListItem, ReportMode, ReportStatus, User } from '../types';
import { getNominationSlotLabel, getTOSlotLabel } from '../slotLabels';
import { deleteReport, extendReportDeadline, getReportDetail, getReports, saveReport } from '../services/reportsService';
import { getReferees } from '../services/nominationService';
import { readViewCache, writeViewCache } from '../services/viewCache';
import { getReportStatusLabel, useI18n } from '../i18n';

interface ReportsProps {
  user: User;
  onBack: () => void;
  reportMode?: ReportMode;
}

const getReportsCacheKey = (userId: string, reportMode: ReportMode) => `reports:${userId}:${reportMode}`;
const getReportDetailCacheKey = (userId: string, reportMode: ReportMode, nominationId: string, refereeId: string) =>
  `report-detail:${userId}:${reportMode}:${nominationId}:${refereeId}`;

const getDisplayStatus = (item: ReportListItem, role: User['role']) => {
  if (item.reportMode === 'test_to') {
    return item.instructorReportStatus || 'No Report';
  }

  if (item.reportMode === 'to') {
    if (role === 'TO') {
      return item.instructorReportStatus === 'Reviewed' ? 'Reviewed' : item.refereeReportStatus || 'No Report';
    }

    return item.instructorReportStatus || item.refereeReportStatus || 'No Report';
  }

  if (item.instructorReportStatus === 'Reviewed') {
    return 'Reviewed';
  }

  if (role === 'Instructor' || role === 'Staff') {
    return item.instructorReportStatus || item.refereeReportStatus || 'No Report';
  }

  return item.refereeReportStatus || 'No Report';
};

const getStatusClasses = (statusLabel: string) => {
  if (statusLabel === 'Reviewed') {
    return 'bg-green-50 text-green-600';
  }

  if (statusLabel === 'Submitted') {
    return 'bg-blue-50 text-blue-600';
  }

  if (statusLabel === 'Draft') {
    return 'bg-slate-100 text-slate-500';
  }

  return 'bg-amber-50 text-amber-600';
};

const getStatusIcon = (statusLabel: string) => {
  if (statusLabel === 'Reviewed') {
    return <CheckCircle size={24} />;
  }

  if (statusLabel === 'Submitted' || statusLabel === 'Draft') {
    return <Clock size={24} />;
  }

  return <FileWarning size={24} />;
};

const getEditorReport = (detail: ReportDetail, role: User['role']) => {
  if (detail.item.reportMode === 'test_to') {
    return role === 'Instructor' ? detail.instructorReport : null;
  }

  if (detail.item.reportMode === 'to') {
    if (role === 'TO Supervisor') {
      return detail.instructorReport;
    }

    if (role === 'TO') {
      return detail.refereeReport;
    }

    return null;
  }

  if (role === 'Instructor') {
    return detail.instructorReport;
  }

  if (role === 'Referee') {
    return detail.refereeReport;
  }

  return null;
};

const buildFormDataFromDetail = (detail: ReportDetail, role: User['role']) => {
  const editorReport = getEditorReport(detail, role);

  return {
    gameCode: detail.item.gameCode ?? '',
    teams: detail.item.teams ?? '',
    matchDate: detail.item.matchDate ?? '',
    matchTime: detail.item.matchTime ?? '',
    venue: detail.item.venue ?? '',
    feedbackScore: editorReport?.feedbackScore ?? 0,
    threePO_IOT: editorReport?.threePO_IOT ?? '',
    criteria: editorReport?.criteria ?? '',
    teamwork: editorReport?.teamwork ?? '',
    generally: editorReport?.generally ?? '',
    googleDriveUrl: editorReport?.googleDriveUrl ?? '',
    visibleToRefereeId: editorReport?.visibleToRefereeIds?.[0] ?? '',
  };
};

const Reports: React.FC<ReportsProps> = ({ user, onBack, reportMode = 'standard' as ReportMode }) => {
  const { language, t } = useI18n();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ReportDetail | null>(null);
  const [isChoosingNew, setIsChoosingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditingCurrentReport, setIsEditingCurrentReport] = useState(false);
  const [formData, setFormData] = useState({
    gameCode: '',
    teams: '',
    matchDate: '',
    matchTime: '',
    venue: '',
    feedbackScore: 0,
    threePO_IOT: '',
    criteria: '',
    teamwork: '',
    generally: '',
    googleDriveUrl: '',
    visibleToRefereeId: '',
  });

  const isInstructor = user.role === 'Instructor';
  const isReferee = user.role === 'Referee';
  const isTO = user.role === 'TO';
  const isTOSupervisor = user.role === 'TO Supervisor';
  const isStaff = user.role === 'Staff';
  const isTestReportPage = reportMode === 'test_to';
  const isTOReportPage = reportMode === 'to';
  const canWriteReportsOnPage = isTestReportPage ? isInstructor : isTOReportPage ? isTO || isTOSupervisor : isInstructor || isReferee;
  const pageTitle = isTestReportPage
    ? 'Report Test TO'
    : isTOReportPage
      ? isTO
        ? t('reports.myTitle')
        : t('reports.toTitle')
      : isStaff
        ? t('reports.title')
        : t('reports.myTitle');

  const buildNewTestReportDetail = async (): Promise<ReportDetail> => {
    const response = await getReferees(user.id);
    return {
      item: {
        nominationId: 'new',
        refereeId: '',
        gameCode: '',
        teams: '',
        matchDate: '',
        matchTime: '',
        venue: '',
        refereeName: '',
        slotNumber: 0,
        refereeReportStatus: null,
        instructorReportStatus: null,
        reviewScore: null,
        deadlineExceeded: false,
        deadlineMessage: null,
        reportDeadlineAt: null,
        canAddTime: false,
        reportMode: 'test_to',
        googleDriveUrl: null,
        visibleToRefereeIds: [],
      },
      refereeReport: null,
      instructorReport: null,
      canEditCurrentUserReport: true,
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt: null,
      canAddTime: false,
      visibilityOptions: response.referees.map((referee) => ({
        id: referee.id,
        fullName: referee.fullName,
        slotNumber: 0,
      })),
    };
  };

  const loadReports = async () => {
    const response = await getReports(user.id, reportMode);
    setReports(response.reports);
    writeViewCache(getReportsCacheKey(user.id, reportMode), response.reports);
  };

  useEffect(() => {
    let isMounted = true;
    const cacheKey = getReportsCacheKey(user.id, reportMode);

    const cachedReports = readViewCache<ReportListItem[]>(cacheKey);
    if (cachedReports) {
      setReports(cachedReports);
      setIsLoading(false);
    }

    const load = async () => {
      if (!cachedReports) {
        setIsLoading(true);
      }
      try {
        const response = await getReports(user.id, reportMode);
        if (isMounted) {
          setReports(response.reports);
          setErrorMessage('');
          writeViewCache(cacheKey, response.reports);
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

    void load();

    return () => {
      isMounted = false;
    };
  }, [reportMode, user.id]);

  const openReportDetail = async (item: ReportListItem) => {
    setErrorMessage('');
    setSuccessMessage('');

    const detailCacheKey = getReportDetailCacheKey(user.id, item.reportMode, item.nominationId, item.refereeId);
    const cachedDetail = readViewCache<ReportDetail>(detailCacheKey);
    if (cachedDetail) {
      setSelectedDetail(cachedDetail);
      setFormData(buildFormDataFromDetail(cachedDetail, user.role));
      setIsEditingCurrentReport(false);
      setIsChoosingNew(false);
    }

    try {
      const response = await getReportDetail(user.id, item.nominationId, item.refereeId, item.reportMode);
      setSelectedDetail(response.report);
      setFormData(buildFormDataFromDetail(response.report, user.role));
      writeViewCache(detailCacheKey, response.report);
      setIsEditingCurrentReport(false);
      setIsChoosingNew(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load report detail.');
    }
  };

  const handleSaveReport = async (action: ReportStatus) => {
    if (!selectedDetail) {
      return;
    }

    const reportItem = selectedDetail.item;
    const isManualReport = reportItem.reportMode === 'test_to';
    const gameCode = isManualReport ? formData.gameCode : reportItem.gameCode;
    const teams = isManualReport ? formData.teams : reportItem.teams;
    const matchDate = isManualReport ? formData.matchDate : reportItem.matchDate;
    const matchTime = isManualReport ? formData.matchTime : reportItem.matchTime;
    const venue = isManualReport ? formData.venue : reportItem.venue;

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await saveReport({
        userId: user.id,
        nominationId: selectedDetail.item.nominationId,
        refereeId: selectedDetail.item.reportMode === 'test_to' ? formData.visibleToRefereeId || selectedDetail.item.refereeId : selectedDetail.item.refereeId,
        mode: selectedDetail.item.reportMode,
        gameCode,
        teams,
        matchDate,
        matchTime,
        venue,
        action,
        feedbackScore: formData.feedbackScore,
        threePO_IOT: formData.threePO_IOT,
        criteria: formData.criteria,
        teamwork: formData.teamwork,
        generally: formData.generally,
        googleDriveUrl: formData.googleDriveUrl,
        visibleToRefereeIds: formData.visibleToRefereeId ? [formData.visibleToRefereeId] : [],
      });

      setSelectedDetail(response.report);
      setFormData(buildFormDataFromDetail(response.report, user.role));
      writeViewCache(
        getReportDetailCacheKey(user.id, response.report.item.reportMode, response.report.item.nominationId, response.report.item.refereeId),
        response.report,
      );
      setIsEditingCurrentReport(false);
      await loadReports();
      setSuccessMessage(
        action === 'Draft'
          ? 'Report saved as draft.'
          : selectedDetail.item.reportMode === 'test_to'
            ? 'Report Test TO sent to referee.'
            : selectedDetail.item.reportMode === 'to' && isTOSupervisor
              ? 'TO Supervisor response submitted.'
            : 'Report submitted.',
      );
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
        mode: selectedDetail.item.reportMode,
      });
      await loadReports();
      window.sessionStorage.removeItem(
        getReportDetailCacheKey(user.id, selectedDetail.item.reportMode, selectedDetail.item.nominationId, selectedDetail.item.refereeId),
      );
      setSelectedDetail(null);
      setIsEditingCurrentReport(false);
      setSuccessMessage('Draft report deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTime = async (nominationId: string, refereeId: string) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await extendReportDeadline({
        userId: user.id,
        nominationId,
        refereeId,
      });
      await loadReports();
      if (selectedDetail?.item.nominationId === nominationId && selectedDetail.item.refereeId === refereeId) {
        setSelectedDetail(response.report);
      }
      setSuccessMessage('Report deadline extended by 24 hours.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extend the report deadline.');
    } finally {
      setIsSaving(false);
    }
  };

  const eligibleNewReports = reports.filter((item) => {
    if (isTestReportPage) {
      return item.reportMode === 'test_to' && isInstructor && item.instructorReportStatus !== 'Reviewed';
    }

    if (isTOReportPage) {
      if (item.reportMode !== 'to') {
        return false;
      }

      if (isTO) {
        return item.refereeReportStatus !== 'Submitted';
      }

      if (isTOSupervisor) {
        return item.refereeReportStatus === 'Submitted' && item.instructorReportStatus !== 'Reviewed';
      }

      return false;
    }

    if (item.reportMode !== 'standard') {
      return false;
    }

    if (isReferee) {
      return item.refereeReportStatus !== 'Submitted';
    }

    if (isInstructor) {
      return item.refereeReportStatus === 'Submitted' && item.instructorReportStatus !== 'Reviewed';
    }

    return false;
  });

  const renderGoogleDriveButton = (url: string) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
      >
        <ExternalLink size={16} />
        {t('common.gameScoresheet')}
      </a>
    ) : null;

  const openNewTestReport = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const draftDetail = await buildNewTestReportDetail();
      setSelectedDetail(draftDetail);
      setFormData({
        gameCode: '',
        teams: '',
        matchDate: '',
        matchTime: '',
        venue: '',
        feedbackScore: 0,
        threePO_IOT: '',
        criteria: '',
        teamwork: '',
        generally: '',
        googleDriveUrl: '',
        visibleToRefereeId: '',
      });
      setIsChoosingNew(false);
      setIsEditingCurrentReport(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to open Report Test TO form.');
    }
  };

  if (selectedDetail) {
    const item = selectedDetail.item;
    const isTestReport = item.reportMode === 'test_to';
    const isTOReport = item.reportMode === 'to';
    const isNewTestReport = isTestReport && item.nominationId === 'new';
    const currentReport = getEditorReport(selectedDetail, user.role);
    const canWriteCurrentReport = isTestReport ? isInstructor : isTOReport ? isTO || isTOSupervisor : isInstructor || isReferee;
    const canEditForm =
      canWriteCurrentReport &&
      (selectedDetail.canEditCurrentUserReport || ((isInstructor || isTOSupervisor) && Boolean(currentReport) && isEditingCurrentReport));
    const selectedRecipientName =
      selectedDetail.visibilityOptions.find((option) => option.id === (currentReport?.visibleToRefereeIds?.[0] || ''))?.fullName || '';
    const draftRecipientName =
      selectedDetail.visibilityOptions.find((option) => option.id === formData.visibleToRefereeId)?.fullName || '';
    const displayGameCode = isTestReport && canEditForm ? formData.gameCode || 'NEW' : item.gameCode;
    const displayTeams = isTestReport && canEditForm ? formData.teams || 'Manual Report Test TO' : item.teams;
    const displayDateLine =
      isTestReport && canEditForm
        ? [formData.matchDate, formData.matchTime, formData.venue].filter(Boolean).join(' | ')
        : `${item.matchDate} at ${item.matchTime} | ${item.venue}`;
    const slotLabel = isTOReport ? getTOSlotLabel(item.slotNumber, language) : getNominationSlotLabel(item.slotNumber, language);
    const detailTitle = isTestReport ? 'Report Test TO' : isTOReport ? t('reports.toReport') : 'Report';
    const writeSectionTitle = isTestReport
      ? 'Report Test TO'
      : isTOReport
        ? isTOSupervisor
          ? t('reports.toSupervisorResponse')
          : t('reports.myReport')
        : isInstructor
          ? t('reports.instructorEvaluation')
          : t('reports.myReport');

    return (
      <Layout title={`${displayGameCode} ${detailTitle}`} onBack={() => setSelectedDetail(null)}>
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

        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase text-[#581c1c]">{displayGameCode}</div>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{displayTeams}</h3>
          <p className="mt-2 text-sm text-slate-500">{displayDateLine || 'Fill the game details below.'}</p>
          {isTestReport ? (
            <p className="mt-1 text-sm text-slate-500">
              {`Send To: ${canEditForm ? draftRecipientName || 'Select referee below' : selectedRecipientName || item.refereeName || 'No referee selected'}`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">{`${slotLabel}: ${item.refereeName}`}</p>
          )}
        </div>

        {!isTestReport && item.deadlineExceeded && item.deadlineMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div>{item.deadlineMessage}</div>
            {item.reportMode === 'standard' && isInstructor && selectedDetail.canAddTime && (
              <button
                onClick={() => handleAddTime(item.nominationId, item.refereeId)}
                disabled={isSaving}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
              >
                <AlarmClockPlus size={14} />
                {isSaving ? 'Adding...' : 'Add Time (+24h)'}
              </button>
            )}
          </div>
        )}

        {!isTestReport && !isTOReport && (isInstructor || isStaff) && (
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-slate-900">{t('reports.refereeReport')}</h3>
            {!selectedDetail.refereeReport ? (
              <p className="text-sm text-slate-500">{t('reports.refereeNotSubmittedYet')}</p>
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

        {!isTestReport && !isTOReport && (isReferee || isStaff) && (
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-slate-900">{t('reports.instructorReport')}</h3>
            {!selectedDetail.instructorReport ? (
              <p className="text-sm text-slate-500">{t('reports.instructorNotAvailableYet')}</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div><span className="font-bold">3PO & IOT:</span> {selectedDetail.instructorReport.threePO_IOT}</div>
                <div><span className="font-bold">Criteria:</span> {selectedDetail.instructorReport.criteria}</div>
                <div><span className="font-bold">Teamwork:</span> {selectedDetail.instructorReport.teamwork}</div>
                <div><span className="font-bold">Generally:</span> {selectedDetail.instructorReport.generally}</div>
                {selectedDetail.instructorReport.googleDriveUrl && (
                  <div className="pt-2">{renderGoogleDriveButton(selectedDetail.instructorReport.googleDriveUrl)}</div>
                )}
              </div>
            )}
          </div>
        )}

        {isTOReport && (isTOSupervisor || isInstructor || isStaff) && (
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-slate-900">{t('reports.toReport')}</h3>
            {!selectedDetail.refereeReport ? (
              <p className="text-sm text-slate-500">{t('reports.toNotSubmittedYet')}</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div><span className="font-bold">Generally:</span> {selectedDetail.refereeReport.generally}</div>
              </div>
            )}
          </div>
        )}

        {isTOReport && (isTO || isInstructor || isStaff) && (
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-slate-900">{t('reports.toSupervisorResponse')}</h3>
            {!selectedDetail.instructorReport ? (
              <p className="text-sm text-slate-500">{t('reports.toSupervisorNotAvailableYet')}</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div><span className="font-bold">Generally:</span> {selectedDetail.instructorReport.generally}</div>
              </div>
            )}
          </div>
        )}

        {isTestReport && !isInstructor && (
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-slate-900">Report Test TO</h3>
            {!selectedDetail.instructorReport ? (
              <p className="text-sm text-slate-500">This report is not available yet.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div><span className="font-bold">3PO & IOT:</span> {selectedDetail.instructorReport.threePO_IOT}</div>
                <div><span className="font-bold">Criteria:</span> {selectedDetail.instructorReport.criteria}</div>
                <div><span className="font-bold">Teamwork:</span> {selectedDetail.instructorReport.teamwork}</div>
                <div><span className="font-bold">Generally:</span> {selectedDetail.instructorReport.generally}</div>
                {selectedDetail.instructorReport.googleDriveUrl && (
                  <div className="pt-2">{renderGoogleDriveButton(selectedDetail.instructorReport.googleDriveUrl)}</div>
                )}
              </div>
            )}
          </div>
        )}

        {canWriteCurrentReport && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-slate-900">{writeSectionTitle}</h3>

            {!canEditForm && currentReport ? (
              <div className="space-y-3 text-sm text-slate-700">
                {!isTOReport && (
                  <>
                    <div><span className="font-bold">3PO & IOT:</span> {currentReport.threePO_IOT}</div>
                    <div><span className="font-bold">Criteria:</span> {currentReport.criteria}</div>
                    <div><span className="font-bold">Teamwork:</span> {currentReport.teamwork}</div>
                  </>
                )}
                <div><span className="font-bold">Generally:</span> {currentReport.generally}</div>
                {isTestReport && selectedRecipientName && (
                  <div><span className="font-bold">Send To:</span> {selectedRecipientName}</div>
                )}
                {isTestReport && currentReport.googleDriveUrl && (
                  <div className="pt-2">{renderGoogleDriveButton(currentReport.googleDriveUrl)}</div>
                )}
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
                  {`Status: ${getReportStatusLabel(item.instructorReportStatus === 'Reviewed' ? 'Reviewed' : currentReport.status, language)}`}
                </div>
                {(isInstructor || isTOSupervisor) && (
                  <button
                    onClick={() => setIsEditingCurrentReport(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isTestReport ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Game Code</label>
                      <input
                        value={formData.gameCode}
                        onChange={(event) => setFormData((prev) => ({ ...prev, gameCode: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                        placeholder="TEST-001"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Game</label>
                      <input
                        value={formData.teams}
                        onChange={(event) => setFormData((prev) => ({ ...prev, teams: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                        placeholder="Team A vs Team B"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Date</label>
                        <input
                          type="date"
                          value={formData.matchDate}
                          onChange={(event) => setFormData((prev) => ({ ...prev, matchDate: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Time</label>
                        <input
                          type="time"
                          value={formData.matchTime}
                          onChange={(event) => setFormData((prev) => ({ ...prev, matchTime: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Venue</label>
                      <input
                        value={formData.venue}
                        onChange={(event) => setFormData((prev) => ({ ...prev, venue: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                        placeholder="Arena name"
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-slate-500">Game Code</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.gameCode}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-slate-500">Date</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.matchDate}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                      <div className="text-xs font-bold uppercase text-slate-500">Game</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.teams}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-slate-500">Time</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.matchTime}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-slate-500">Venue</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.venue}</div>
                    </div>
                  </div>
                )}
                {!isTOReport && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">3PO & IOT</label>
                      <textarea
                        rows={3}
                        value={formData.threePO_IOT}
                        onChange={(event) => setFormData((prev) => ({ ...prev, threePO_IOT: event.target.value }))}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Criteria</label>
                      <textarea
                        rows={3}
                        value={formData.criteria}
                        onChange={(event) => setFormData((prev) => ({ ...prev, criteria: event.target.value }))}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Teamwork</label>
                      <textarea
                        rows={3}
                        value={formData.teamwork}
                        onChange={(event) => setFormData((prev) => ({ ...prev, teamwork: event.target.value }))}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Generally</label>
                  <textarea
                    rows={3}
                    value={formData.generally}
                    onChange={(event) => setFormData((prev) => ({ ...prev, generally: event.target.value }))}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                  />
                </div>

                {isTestReport && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Send To Referee</label>
                      <select
                        value={formData.visibleToRefereeId}
                        onChange={(event) => setFormData((prev) => ({ ...prev, visibleToRefereeId: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                      >
                        <option value="">Select referee</option>
                        {selectedDetail.visibilityOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Google Drive Link</label>
                      <input
                        type="url"
                        value={formData.googleDriveUrl}
                        onChange={(event) => setFormData((prev) => ({ ...prev, googleDriveUrl: event.target.value }))}
                        placeholder="https://drive.google.com/..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#f97316]"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSaveReport('Draft')}
                    disabled={isSaving || (!isTestReport && selectedDetail.deadlineExceeded)}
                    className="rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-700 disabled:opacity-70"
                  >
                  {isSaving ? t('common.saving') : t('common.saveDraft')}
                  </button>
                  <button
                    onClick={() => handleSaveReport('Submitted')}
                    disabled={isSaving || (!isTestReport && selectedDetail.deadlineExceeded)}
                    className="rounded-xl bg-[#581c1c] py-3 text-sm font-bold text-white disabled:opacity-70"
                  >
                    {isSaving
                      ? t('common.saving')
                      : isTestReport
                        ? t('common.submit')
                        : isTOReport
                          ? isTOSupervisor
                            ? t('reports.submitTOResponse')
                            : t('common.submit')
                          : isInstructor
                            ? t('reports.submitReview')
                            : t('common.submit')}
                  </button>
                </div>

                {(isInstructor || isTOSupervisor) && currentReport && !isNewTestReport && (
                  <button
                    onClick={() => setIsEditingCurrentReport(false)}
                    disabled={isSaving}
                    className="w-full rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-70"
                  >
                    {t('dashboard.cancelEdit')}
                  </button>
                )}

                {currentReport?.status === 'Draft' && (
                  <button
                    onClick={handleDeleteReport}
                    disabled={isSaving}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-70"
                  >
                    <Trash2 size={16} />
                    {isSaving ? t('common.deleting') : t('reports.deleteDraft')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle} onBack={onBack}>
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

      {canWriteReportsOnPage && (
        <div className="mb-4 flex items-center justify-between px-1">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-widest text-slate-400">{t('common.recentActivity')}</h3>
          <button
            onClick={() => {
              if (isTestReportPage) {
                void openNewTestReport();
                return;
              }

              setIsChoosingNew((prev) => !prev);
            }}
            className="flex items-center gap-1 rounded-full bg-[#581c1c]/5 px-3 py-1.5 text-xs font-bold text-[#581c1c]"
          >
            {isChoosingNew ? <X size={14} /> : <Plus size={14} />}
            {isTestReportPage ? 'New Report Test TO' : t('reports.newReport')}
          </button>
        </div>
      )}

      {isChoosingNew && !isTestReportPage && (
        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-bold text-slate-900">{t('reports.chooseGameForNew')}</h3>
          {eligibleNewReports.length === 0 ? (
            <p className="text-sm text-slate-500">{t('reports.noSlotAvailable')}</p>
          ) : (
            <div className="space-y-3">
              {eligibleNewReports.map((item) => (
                <button
                  key={`${item.reportMode}-${item.nominationId}-${item.refereeId}`}
                  onClick={() => openReportDetail(item)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                >
                  <div className="text-xs font-bold uppercase text-[#581c1c]">{item.gameCode}</div>
                  <div className="mt-1 font-semibold text-slate-900">{item.teams}</div>
                  <div className="mt-1 text-sm text-slate-500">{`${item.matchDate} at ${item.matchTime}`}</div>
                  <div className="text-sm text-slate-500">{item.refereeName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('reports.loading')}</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
          {isTestReportPage ? 'No Report Test TO found.' : isTOReportPage ? t('reports.toNone') : t('reports.none')}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const statusLabel = getDisplayStatus(report, user.role);
            return (
              <button
                key={`${report.reportMode}-${report.nominationId}-${report.refereeId}`}
                onClick={() => openReportDetail(report)}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-colors active:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${getStatusClasses(statusLabel)}`}>{getStatusIcon(statusLabel)}</div>
                  <div>
                    <div className="font-bold text-slate-800">{`${report.gameCode} | ${report.teams}`}</div>
                    <div className="text-xs text-slate-500">
                      {`${report.matchDate} | ${report.refereeName} | ${report.reportMode === 'to' ? getTOSlotLabel(report.slotNumber, language) : getNominationSlotLabel(report.slotNumber, language)} | ${getReportStatusLabel(statusLabel, language)}`}
                    </div>
                    {report.reportMode === 'test_to' && (
                      <div className="mt-1 text-[11px] text-slate-400">Type: Report Test TO</div>
                    )}
                    {report.reportMode === 'to' && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {`${t('reports.toReportLabel')}: ${report.refereeReportStatus ? getReportStatusLabel(report.refereeReportStatus, language) : t('reports.notSubmitted')} | ${t('reports.toSupervisorResponseLabel')}: ${report.instructorReportStatus ? getReportStatusLabel(report.instructorReportStatus, language) : t('reports.notStarted')}`}
                      </div>
                    )}
                    {report.reportMode === 'standard' && (user.role === 'Instructor' || user.role === 'Staff') && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {`Referee report: ${report.refereeReportStatus ? getReportStatusLabel(report.refereeReportStatus, language) : t('reports.notSubmitted')} | Instructor report: ${report.instructorReportStatus ? getReportStatusLabel(report.instructorReportStatus, language) : t('reports.notStarted')}`}
                      </div>
                    )}
                    {report.reportMode === 'standard' && isInstructor && report.deadlineExceeded && report.deadlineMessage && (
                      <div className="mt-2 text-[11px] font-semibold text-red-600">{report.deadlineMessage}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {report.reportMode === 'standard' && isInstructor && report.canAddTime && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleAddTime(report.nominationId, report.refereeId);
                      }}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                    >
                      <AlarmClockPlus size={14} />
                      {isSaving ? 'Adding...' : 'Add Time'}
                    </button>
                  )}
                  <ArrowRight size={18} className="text-slate-300 transition-colors group-hover:text-[#f97316]" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Reports;
