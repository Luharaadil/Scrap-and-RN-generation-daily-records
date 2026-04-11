import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fetchRangeData, fetchTargets, getWebAppUrl } from './api';
import { DateRange } from 'react-day-picker';

interface DataContextType {
  data: any;
  targets: any;
  loading: boolean;
  error: string;
  loadData: (force?: boolean) => Promise<void>;
  loadTargets: () => Promise<void>;
  updateTargets: (newTargets: any) => void;
  isSyncingTargets: boolean;
  // Global selections
  globalDateRange: DateRange | undefined;
  setGlobalDateRange: (range: DateRange | undefined) => void;
  globalDate: Date;
  setGlobalDate: (date: Date) => void;
  globalShift: string;
  setGlobalShift: (shift: string) => void;
  globalSection: string;
  setGlobalSection: (section: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<any>(null);
  const [targets, setTargets] = useState<any>({
    bic_scrap: { value: 0, period: 'daily' },
    ply_scrap: { value: 0, period: 'daily' },
    rubber_scrap: { value: 0, period: 'monthly' },
    rn_scrap: { value: 0, period: 'daily' },
    bic_rate: { value: 1.5, period: 'daily' },
    ply_rate: { value: 1.5, period: 'daily' },
    rubber_rate: { value: 1.5, period: 'daily' },
    rn_rate: { value: 95, period: 'daily' },
  });
  const [loading, setLoading] = useState(false);
  const [isSyncingTargets, setIsSyncingTargets] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchRange, setLastFetchRange] = useState<{ start: string, end: string } | null>(null);

  // Global selections
  const [globalDateRange, setGlobalDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [globalDate, setGlobalDate] = useState<Date>(new Date());
  const [globalShift, setGlobalShift] = useState('All');
  const [globalSection, setGlobalSection] = useState('All');

  const updateTargets = useCallback((newTargets: any) => {
    setTargets(newTargets);
  }, []);

  const loadTargets = useCallback(async () => {
    if (!getWebAppUrl()) return;
    setIsSyncingTargets(true);
    try {
      const targetResult = await fetchTargets();
      if (targetResult && targetResult.targets) {
        const newTargets: any = { ...targets };
        targetResult.targets.forEach((t: any) => {
          let rowId = '';
          const cat = String(t.category || '').toLowerCase();
          if (cat.includes('bic') && cat.includes('scrap')) rowId = 'bic_scrap';
          else if (cat.includes('ply') && cat.includes('scrap')) rowId = 'ply_scrap';
          else if (cat.includes('rubber') && cat.includes('scrap')) rowId = 'rubber_scrap';
          else if (cat.includes('rn') && cat.includes('scrap')) rowId = 'rn_scrap';
          else if (cat.includes('bic') && cat.includes('rate')) rowId = 'bic_rate';
          else if (cat.includes('ply') && cat.includes('rate')) rowId = 'ply_rate';
          else if (cat.includes('rubber') && cat.includes('rate')) rowId = 'rubber_rate';
          else if (cat.includes('rn') && cat.includes('rate')) rowId = 'rn_rate';
          
          if (rowId) {
            const period = String(t.period || '').toLowerCase();
            newTargets[rowId] = {
              value: Number(t.value || 0),
              period: period === 'not use' ? 'not_use' : (['daily', 'weekly', 'monthly', 'not_use'].includes(period) ? period : 'daily')
            };
          }
        });
        setTargets(newTargets);
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setIsSyncingTargets(false);
    }
  }, [targets]);

  const loadData = useCallback(async (force = false) => {
    if (!getWebAppUrl()) return;
    
    // Default range is start of current month to end of current week
    // But for global data, we'll just fetch a wide enough range or let components specify
    // For now, let's fetch from start of month to today + 7 days to cover most views
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    if (!force && data && lastFetchRange?.start === start && lastFetchRange?.end === end) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await fetchRangeData(start, end);
      setData(result);
      setLastFetchRange({ start, end });
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [data, lastFetchRange]);

  useEffect(() => {
    loadTargets();
    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ 
      data, 
      targets, 
      loading, 
      error, 
      loadData, 
      loadTargets, 
      updateTargets, 
      isSyncingTargets,
      globalDateRange,
      setGlobalDateRange,
      globalDate,
      setGlobalDate,
      globalShift,
      setGlobalShift,
      globalSection,
      setGlobalSection
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
