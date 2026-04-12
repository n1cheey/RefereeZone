import React, { useMemo, useState } from 'react';
import { Calculator, Download, FileSpreadsheet } from 'lucide-react';
import Layout from './Layout';
import { User, InstructorNomination } from '../types';
import { getInstructorNominations } from '../services/nominationService';
import { getRoleLabel, useI18n } from '../i18n';
import { isPastMatch } from '../matchTiming';

interface FinancialCalculationsProps {
  user: User;
  onBack: () => void;
}

interface CalculationRow {
  id: string;
  name: string;
  role: 'Referee' | 'TO';
  matches: number;
  earnings: number;
}

const BAKU_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Baku',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getCurrentBakuDateString = () => BAKU_DATE_FORMATTER.format(new Date());

const formatFee = (value: number) => `AZN ${Math.round(value)}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildExcelDocument = (rows: CalculationRow[], t: (key: string) => string, getRoleText: (role: 'Referee' | 'TO') => string) => {
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(getRoleText(row.role))}</td>
          <td>${row.matches}</td>
          <td>${escapeHtml(formatFee(row.earnings))}</td>
          <td></td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; font-family: Arial, sans-serif; font-size: 12px; }
      th { background: #f1f5f9; text-align: left; }
      td:last-child { min-width: 180px; height: 36px; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t('common.fullName'))}</th>
          <th>${escapeHtml(t('common.role'))}</th>
          <th>${escapeHtml(t('dashboard.calculationMatches'))}</th>
          <th>${escapeHtml(t('dashboard.calculationEarnings'))}</th>
          <th>${escapeHtml(t('common.signature'))}</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </body>
</html>`;
};

const FinancialCalculations: React.FC<FinancialCalculationsProps> = ({ user, onBack }) => {
  const { language, t } = useI18n();
  const [nominations, setNominations] = useState<InstructorNomination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState(() => {
    const today = getCurrentBakuDateString();
    return {
      startDate: `${today.slice(0, 8)}01`,
      endDate: today,
    };
  });
  const [rows, setRows] = useState<CalculationRow[]>([]);

  const getRoleText = (role: 'Referee' | 'TO') => getRoleLabel(role, language);
  const canExport = rows.length > 0;

  const summary = useMemo(
    () => ({
      matches: rows.reduce((sum, row) => sum + row.matches, 0),
      earnings: rows.reduce((sum, row) => sum + row.earnings, 0),
    }),
    [rows],
  );

  const calculateRows = (items: InstructorNomination[], startDate: string, endDate: string) => {
    const totals = new Map<string, CalculationRow>();

    items.forEach((nomination) => {
      if (
        nomination.matchDate < startDate ||
        nomination.matchDate > endDate ||
        !isPastMatch(nomination.matchDate, nomination.matchTime, Date.now())
      ) {
        return;
      }

      nomination.referees.forEach((official) => {
        if (!['Accepted', 'Assigned'].includes(official.status)) {
          return;
        }

        const key = `referee:${official.refereeId}`;
        const current = totals.get(key) || {
          id: official.refereeId,
          name: official.refereeName,
          role: 'Referee' as const,
          matches: 0,
          earnings: 0,
        };

        current.matches += 1;
        current.earnings += nomination.refereeFee || 0;
        totals.set(key, current);
      });

      nomination.toCrew.forEach((official) => {
        if (!['Accepted', 'Assigned'].includes(official.status)) {
          return;
        }

        const key = `to:${official.toId}`;
        const current = totals.get(key) || {
          id: official.toId,
          name: official.toName,
          role: 'TO' as const,
          matches: 0,
          earnings: 0,
        };

        current.matches += 1;
        current.earnings += nomination.toFee || 0;
        totals.set(key, current);
      });
    });

    return [...totals.values()].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role.localeCompare(right.role);
      }

      return left.name.localeCompare(right.name, 'ru');
    });
  };

  const handleCalculate = async () => {
    if (!range.startDate || !range.endDate) {
      setError(t('dashboard.calculationSelectDates'));
      return;
    }

    if (range.startDate > range.endDate) {
      setError(t('dashboard.calculationInvalidRange'));
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const nominationsResponse = nominations.length ? { nominations } : await getInstructorNominations(user.id);
      const source = nominationsResponse.nominations || [];
      setNominations(source);
      setRows(calculateRows(source, range.startDate, range.endDate));
    } catch (loadError) {
      console.error('Failed to calculate financial totals', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to calculate.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!canExport) {
      return;
    }

    const documentHtml = buildExcelDocument(rows, t, getRoleText);
    const blob = new Blob([documentHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-calculation-${range.startDate}-${range.endDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout title={t('dashboard.calculation')} onBack={onBack}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                <Calculator size={16} className="text-[#581c1c]" />
                {t('dashboard.calculation')}
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-900">{user.fullName}</h2>
              <p className="mt-1 text-sm text-slate-500">{getRoleLabel(user.role, language)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_180px_160px_180px]">
              <input
                type="date"
                value={range.startDate}
                onChange={(event) =>
                  setRange((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#581c1c]"
              />
              <input
                type="date"
                value={range.endDate}
                onChange={(event) =>
                  setRange((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#581c1c]"
              />
              <button
                type="button"
                onClick={handleCalculate}
                disabled={isLoading}
                className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6b2222] disabled:opacity-70"
              >
                {t('dashboard.calculate')}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!canExport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <Download size={16} />
                {t('dashboard.exportExcel')}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {t('dashboard.calculationMatches')}
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{summary.matches}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                {t('dashboard.calculationEarnings')}
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{formatFee(summary.earnings)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">{t('dashboard.calculationList')}</h3>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">{t('dashboard.calculationLoading')}</p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t('dashboard.calculationNoData')}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-3">{t('common.fullName')}</th>
                    <th className="px-4 py-3">{t('common.role')}</th>
                    <th className="px-4 py-3">{t('dashboard.calculationMatches')}</th>
                    <th className="px-4 py-3">{t('dashboard.calculationEarnings')}</th>
                    <th className="px-4 py-3">{t('common.signature')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={`${row.role}-${row.id}`} className="text-sm text-slate-700">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{getRoleText(row.role)}</td>
                      <td className="px-4 py-3">{row.matches}</td>
                      <td className="px-4 py-3">{formatFee(row.earnings)}</td>
                      <td className="px-4 py-3">
                        <div className="h-8 min-w-40 rounded-lg border border-dashed border-slate-300 bg-slate-50" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FinancialCalculations;
