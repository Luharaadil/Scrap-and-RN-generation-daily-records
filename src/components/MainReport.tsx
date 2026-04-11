import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getDate, getDay, startOfMonth, startOfYear, isSameMonth, isSameWeek } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, RefreshCw, Copy, Image as ImageIcon, Check, X, Type, Plus, Minus } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Calendar } from '@/src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { fetchRangeData, fetchTargets, getWebAppUrl } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { DateRange } from 'react-day-picker';
import { useSidebar } from '@/src/lib/SidebarContext';
import { useData } from '@/src/lib/DataContext';

export function MainReport() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const { data, targets, loading, error, loadData, loadTargets, updateTargets, isSyncingTargets } = useData();
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [detailModal, setDetailModal] = useState<{date: Date, type: 'BIC' | 'PLY_CHAFER' | 'RUBBER_MIXING' | 'RN'} | null>(null);
  const [usageDetailModal, setUsageDetailModal] = useState<{date: Date, type: 'BIC' | 'PLY_CHAFER' | 'RUBBER_MIXING' | 'RN'} | null>(null);
  const [highlightedCols, setHighlightedCols] = useState<number[]>([]);
  const [highlightedRows, setHighlightedRows] = useState<number[]>([]);
  const [modalCopied, setModalCopied] = useState(false);
  const [isEditingFont, setIsEditingFont] = useState(false);
  const [rowFontSizes, setRowFontSizes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mri_row_font_sizes');
    return saved ? JSON.parse(saved) : {};
  });
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrapModalRef = useRef<HTMLDivElement>(null);
  const usageModalRef = useRef<HTMLDivElement>(null);
  const { setControls, sidebarOpen } = useSidebar();

  useEffect(() => {
    localStorage.setItem('mri_row_font_sizes', JSON.stringify(rowFontSizes));
  }, [rowFontSizes]);

  const adjustFontSize = (rowId: string, delta: number) => {
    setRowFontSizes(prev => ({
      ...prev,
      [rowId]: Math.max(8, (prev[rowId] || 14) + delta)
    }));
  };

  useEffect(() => {
    setControls(
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 font-bold">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyValuesOnly} title="Copy values only (for Excel)" className="h-10 font-bold">
            {copiedText ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">Values</span>
          </Button>
          <Button variant="outline" size="sm" onClick={copyAsPicture} title="Copy table as picture" className="h-10 font-bold">
            {copiedImage ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <ImageIcon className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">Picture</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading} className="h-10 font-bold">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            <span className="hidden sm:inline">Reload</span>
          </Button>
          <Button 
            variant={isEditingFont ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsEditingFont(!isEditingFont)} 
            title="Edit row font sizes" 
            className="h-10 font-bold"
          >
            <Type className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Font</span>
          </Button>
        </div>
      </div>
    );
    return () => setControls(null);
  }, [date, loading, copiedText, copiedImage, isEditingFont]);

  const days = date?.from && date?.to 
    ? eachDayOfInterval({ start: date.from, end: date.to }) 
    : (date?.from ? [date.from] : []);

  const getSummaryForDate = (d: Date) => {
    const formattedDate = format(d, 'yyyy-MM-dd');
    const daySummaries = data?.summaries?.filter((s: any) => s.date === formattedDate) || [];
    if (daySummaries.length === 0) return null;
    
    return daySummaries.reduce((acc: any, curr: any) => ({
      ...curr,
      bicUsage: (acc.bicUsage || 0) + Number(curr.bicUsage || 0),
      plyUsage: (acc.plyUsage || 0) + Number(curr.plyUsage || 0),
      extrusionRubberUsage: (acc.extrusionRubberUsage || 0) + Number(curr.extrusionRubberUsage || 0),
      mixingRubberUsage: (acc.mixingRubberUsage || 0) + (Number(curr.mixingRubberUsage || 0) || Number(curr.rubberUsage || 0))
    }), { bicUsage: 0, plyUsage: 0, extrusionRubberUsage: 0, mixingRubberUsage: 0 });
  };

  const getCustomScrapForDate = (d: Date, type: 'BIC' | 'PLY_CHAFER' | 'RUBBER_MIXING' | 'RN') => {
    const formattedDate = format(d, 'yyyy-MM-dd');
    const dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate) || [];
    
    const hasSummary = data?.summaries?.some((s: any) => s.date === formattedDate);
    
    let filtered = [];
    if (type === 'BIC') {
      filtered = dayScraps.filter((s: any) => s.material === 'BIC');
    } else if (type === 'PLY_CHAFER') {
      filtered = dayScraps.filter((s: any) => 
        (s.material === 'PLY' || s.material === 'Chafer') && 
        (s.section === 'Calendering' || s.section === 'Cutting')
      );
    } else if (type === 'RUBBER_MIXING') {
      filtered = dayScraps.filter((s: any) => 
        s.material === 'Rubber' && s.section === 'Mixing'
      );
    } else if (type === 'RN') {
      filtered = dayScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
    }
    
    if (filtered.length === 0) {
      return hasSummary ? 0 : null;
    }
    return filtered.reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
  };

  const calculateRate = (scrap: number | null, usage: number | null) => {
    if (usage === null || usage === undefined) return null;
    if (scrap === null || scrap === undefined) return null;
    const s = Number(scrap);
    const u = Number(usage);
    if (s === 0) return 0;
    if (u === 0) return 0;
    return ((s / u) * 100).toFixed(3) + '%';
  };

  const copyValuesOnly = () => {
    if (!days.length) return;
    
    const rowsData = [
      // BIC
      days.map(d => getSummaryForDate(d)?.bicUsage || '0'),
      days.map(d => getCustomScrapForDate(d, 'BIC') || '0'),
      days.map(d => calculateRate(getCustomScrapForDate(d, 'BIC'), getSummaryForDate(d)?.bicUsage)),
      // PLY + Chafer
      days.map(d => getSummaryForDate(d)?.plyUsage || '0'),
      days.map(d => getCustomScrapForDate(d, 'PLY_CHAFER') || '0'),
      days.map(d => calculateRate(getCustomScrapForDate(d, 'PLY_CHAFER'), getSummaryForDate(d)?.plyUsage)),
      // Rubber Mixing
      days.map(d => {
        const s = getSummaryForDate(d);
        return s?.mixingRubberUsage || s?.rubberUsage || '0';
      }),
      days.map(d => getCustomScrapForDate(d, 'RUBBER_MIXING') || '0'),
      days.map(d => {
        const s = getSummaryForDate(d);
        return calculateRate(getCustomScrapForDate(d, 'RUBBER_MIXING'), s?.mixingRubberUsage || s?.rubberUsage);
      }),
      // RN
      days.map(d => {
        const s = getSummaryForDate(d);
        return s?.extrusionRubberUsage || '0';
      }),
      days.map(d => getCustomScrapForDate(d, 'RN') || '0'),
      days.map(d => {
        const s = getSummaryForDate(d);
        return calculateRate(getCustomScrapForDate(d, 'RN'), s?.extrusionRubberUsage);
      }),
    ];

    const tsv = rowsData.map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  const copyAsPicture = async () => {
    if (!tableRef.current) return;
    try {
      const blob = await toBlob(tableRef.current, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      if (!blob) return;

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      } catch (clipboardErr) {
        console.error('Clipboard write failed, falling back to download', clipboardErr);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Weekly_Report_${format(new Date(), 'yyyyMMdd')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      }
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  const getFilteredScrapsForModal = () => {
    if (!detailModal) return [];
    const formattedDate = format(detailModal.date, 'yyyy-MM-dd');
    const dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate) || [];
    
    if (detailModal.type === 'BIC') {
      return dayScraps.filter((s: any) => s.material === 'BIC');
    } else if (detailModal.type === 'PLY_CHAFER') {
      return dayScraps.filter((s: any) => 
        (s.material === 'PLY' || s.material === 'Chafer') && 
        (s.section === 'Calendering' || s.section === 'Cutting')
      );
    } else if (detailModal.type === 'RUBBER_MIXING') {
      return dayScraps.filter((s: any) => 
        s.material === 'Rubber' && s.section === 'Mixing'
      );
    } else if (detailModal.type === 'RN') {
      return dayScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
    }
    return [];
  };

  const formatToIST = (timestamp: string) => {
    if (!timestamp || timestamp === '-') return '-';
    try {
      const dateObj = new Date(timestamp);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\//g, '-');
      }
      return timestamp;
    } catch (e) {
      return timestamp;
    }
  };

  const renderCell = (d: Date, type: 'BIC' | 'PLY_CHAFER' | 'RUBBER_MIXING' | 'RN', value: any, rowId: string) => {
    let displayValue: React.ReactNode = '';
    let isOverTarget = false;
    const isUsageRow = rowId.endsWith('_usage');
    
    // Check if there is ANY data for this date at all
    const formattedDate = format(d, 'yyyy-MM-dd');
    const daySummaries = data?.summaries?.filter((s: any) => s.date === formattedDate) || [];
    const dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate) || [];
    
    // A day has data if it has scraps OR if any summary field is non-zero
    const hasAnyScrap = dayScraps.length > 0;
    const hasAnySummaryValue = daySummaries.some((s: any) => 
      Number(s.bicUsage || 0) > 0 || 
      Number(s.plyUsage || 0) > 0 || 
      Number(s.mixingRubberUsage || 0) > 0 || 
      Number(s.rubberUsage || 0) > 0 || 
      Number(s.extrusionRubberUsage || 0) > 0 ||
      Number(s.chaferUsage || 0) > 0
    );
    
    const hasData = hasAnyScrap || hasAnySummaryValue;

    if (!hasData) {
      displayValue = '';
    } else if (value === null || value === undefined || value === '') {
      displayValue = '';
    } else if (typeof value === 'number') {
      // If value is 0 but we have data for the day, show 0. Otherwise blank.
      displayValue = value === 0 ? '0' : (isUsageRow ? value.toFixed(0) : value.toFixed(1));
      
      // Check target
      const target = targets[rowId];
      if (target && target.period !== 'not_use' && target.value > 0) {
        if (target.period === 'daily') {
          isOverTarget = value > target.value;
        } else if (target.period === 'weekly' || target.period === 'monthly') {
          // Cumulative logic
          const targetValue = target.value;
          let dayNum = 1;
          let totalDays = 1;
          let cumulativeScrap = 0;
          
          if (target.period === 'monthly') {
            dayNum = getDate(d);
            totalDays = 30; // Approximation as per user example
            
            // Sum all scraps in the same month up to this day
            const monthScraps = data?.scraps?.filter((s: any) => {
              const sDate = new Date(s.date);
              return isSameMonth(sDate, d) && getDate(sDate) <= dayNum;
            }) || [];
            
            // Filter by material/section
            let filtered = [];
            if (type === 'BIC') filtered = monthScraps.filter((s: any) => s.material === 'BIC');
            else if (type === 'PLY_CHAFER') filtered = monthScraps.filter((s: any) => (s.material === 'PLY' || s.material === 'Chafer') && (s.section === 'Calendering' || s.section === 'Cutting'));
            else if (type === 'RUBBER_MIXING') filtered = monthScraps.filter((s: any) => s.material === 'Rubber' && s.section === 'Mixing');
            else if (type === 'RN') filtered = monthScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
            
            cumulativeScrap = filtered.reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
          } else {
            // Weekly
            dayNum = getDay(d); // 0-6 (Sun-Sat)
            if (dayNum === 0) dayNum = 7; // Adjust for week starting Mon
            totalDays = 7;
            
            const weekScraps = data?.scraps?.filter((s: any) => {
              const sDate = new Date(s.date);
              return isSameWeek(sDate, d, { weekStartsOn: 1 }) && sDate <= d;
            }) || [];
            
            let filtered = [];
            if (type === 'BIC') filtered = weekScraps.filter((s: any) => s.material === 'BIC');
            else if (type === 'PLY_CHAFER') filtered = weekScraps.filter((s: any) => (s.material === 'PLY' || s.material === 'Chafer') && (s.section === 'Calendering' || s.section === 'Cutting'));
            else if (type === 'RUBBER_MIXING') filtered = weekScraps.filter((s: any) => s.material === 'Rubber' && s.section === 'Mixing');
            else if (type === 'RN') filtered = weekScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
            
            cumulativeScrap = filtered.reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
          }
          
          const cumulativeTarget = (targetValue / totalDays) * dayNum;
          isOverTarget = cumulativeScrap > cumulativeTarget;
        }
      }
    } else if (typeof value === 'string') {
      if (value === '0' || value === '0%' || value === '0.000%') {
        displayValue = '0';
      } else {
        displayValue = value;
        
        // Check rate targets
        if (rowId.endsWith('_rate')) {
          const numValue = parseFloat(value);
          const target = targets[rowId];
          if (target && target.period !== 'not_use' && target.value > 0 && !isNaN(numValue)) {
            // For rate, we usually compare the daily rate directly against the target
            // User requested: "In RN rate need to show when it is over than that highlight"
            isOverTarget = numValue > target.value;
          }
        }
      }
    }
    
    return (
      <TableCell 
        key={d.toISOString()} 
        className={cn(
          "border border-gray-300 text-center cursor-pointer hover:bg-black/5 transition-colors",
          isOverTarget && "bg-red-100 text-red-700 font-bold"
        )}
        style={{ fontSize: rowFontSizes[rowId] ? `${rowFontSizes[rowId]}px` : undefined }}
        onDoubleClick={() => {
          if (isUsageRow) {
            setUsageDetailModal({ date: d, type });
          } else {
            setDetailModal({ date: d, type });
          }
        }}
        title={isOverTarget ? "Exceeds target standard!" : `Double click to view ${isUsageRow ? 'usage' : 'scrap'} details`}
      >
        {displayValue}
      </TableCell>
    );
  };

  const RowHeader = ({ title, subtitle, rowId }: { title: string, subtitle: string, rowId: string }) => (
    <TableCell 
      className="border border-gray-300 font-medium leading-tight py-2 min-w-[150px] max-w-[250px] whitespace-normal relative group"
      style={{ fontSize: rowFontSizes[rowId] ? `${rowFontSizes[rowId]}px` : undefined }}
    >
      <div className="text-sm" style={{ fontSize: 'inherit' }}>{title}</div>
      <div className="text-xs text-gray-500 mt-0.5" style={{ fontSize: rowFontSizes[rowId] ? `${rowFontSizes[rowId] * 0.8}px` : undefined }}>{subtitle}</div>
      
      {isEditingFont && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white/90 backdrop-blur-sm p-1 rounded border shadow-sm z-10">
          <button onClick={() => adjustFontSize(rowId, 1)} className="p-0.5 hover:bg-gray-100 rounded text-primary"><Plus className="h-3 w-3" /></button>
          <span className="text-[10px] text-center font-bold">{rowFontSizes[rowId] || 14}</span>
          <button onClick={() => adjustFontSize(rowId, -1)} className="p-0.5 hover:bg-gray-100 rounded text-primary"><Minus className="h-3 w-3" /></button>
        </div>
      )}
    </TableCell>
  );

  const copyModalAsPicture = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    try {
      // To capture the full table even if scrolled, we temporarily remove constraints
      const originalStyle = ref.current.getAttribute('style') || '';
      const originalParentStyle = ref.current.parentElement?.getAttribute('style') || '';
      
      // Force full width and height for capture
      ref.current.style.width = 'max-content';
      ref.current.style.height = 'auto';
      ref.current.style.overflow = 'visible';
      if (ref.current.parentElement) {
        ref.current.parentElement.style.overflow = 'visible';
      }

      const blob = await toBlob(ref.current, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      // Restore styles
      ref.current.setAttribute('style', originalStyle);
      if (ref.current.parentElement) {
        ref.current.parentElement.setAttribute('style', originalParentStyle);
      }

      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setModalCopied(true);
      setTimeout(() => setModalCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy modal picture', err);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-red-500 text-sm font-medium">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div ref={tableRef} className="bg-white">
          <CardHeader className="text-center pb-2 relative">
            <CardTitle className="text-2xl">2026 MRI Production Weekly Report</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 top-4 h-8 w-8 p-0" 
              onClick={() => setIsEditingTargets(true)}
              title="Target Settings"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="p-4">
              <Table className="border-collapse border border-gray-300 w-full min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="border border-gray-300 bg-gray-50 font-semibold text-center min-w-[150px] max-w-[250px] whitespace-normal">
                    <div>Date</div>
                    <div className="text-sm font-normal text-gray-600">日期</div>
                  </TableHead>
                  {days.map((d, i) => (
                    <TableHead key={i} className="border border-gray-300 bg-gray-50 font-semibold text-center min-w-[80px] text-lg">
                      {format(d, 'M-d')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <RowHeader title="BIC usage weight (kg)" subtitle="鋼絲使用重量(kg)" rowId="bic_usage" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'BIC', summary ? (summary.bicUsage ?? 0) : null, 'bic_usage');
                  })}
                </TableRow>
                <TableRow>
                  <RowHeader title="BIC scrapping weight (kg)" subtitle="鋼絲報廢公斤數(kg)" rowId="bic_scrap" />
                  {days.map((d) => renderCell(d, 'BIC', getCustomScrapForDate(d, 'BIC'), 'bic_scrap'))}
                </TableRow>
                <TableRow className="bg-[#e2f0d9]">
                  <RowHeader title="BIC scrap rate (%)" subtitle="鋼絲報廢率(%)" rowId="bic_rate" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'BIC', calculateRate(getCustomScrapForDate(d, 'BIC'), summary ? (summary.bicUsage ?? 0) : null), 'bic_rate');
                  })}
                </TableRow>

                {/* PLY + Chafer */}
                <TableRow>
                  <RowHeader title="PLY & Chafer usage weight (kg)" subtitle="簾紗及防擦布使用重量(kg)" rowId="ply_usage" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'PLY_CHAFER', summary ? (summary.plyUsage ?? 0) : null, 'ply_usage');
                  })}
                </TableRow>
                <TableRow>
                  <RowHeader title="PLY & Chafer scrap weight (kg)" subtitle="簾紗及防擦布報廢公斤數(kg)" rowId="ply_scrap" />
                  {days.map((d) => renderCell(d, 'PLY_CHAFER', getCustomScrapForDate(d, 'PLY_CHAFER'), 'ply_scrap'))}
                </TableRow>
                <TableRow className="bg-[#fce4d6]">
                  <RowHeader title="PLY & Chafer scrap rate (%)" subtitle="簾紗及防擦布報廢率(%)" rowId="ply_rate" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'PLY_CHAFER', calculateRate(getCustomScrapForDate(d, 'PLY_CHAFER'), summary ? (summary.plyUsage ?? 0) : null), 'ply_rate');
                  })}
                </TableRow>

                {/* Rubber (Mixing) */}
                <TableRow>
                  <RowHeader title="Rubber usage weight (Mixing) (kg)" subtitle="膠料使用重量(kg)" rowId="rubber_usage" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'RUBBER_MIXING', summary ? (summary.mixingRubberUsage ?? summary.rubberUsage ?? 0) : null, 'rubber_usage');
                  })}
                </TableRow>
                <TableRow>
                  <RowHeader title="Rubber scrap weight (Mixing) (kg)" subtitle="膠料報廢公斤數(kg)" rowId="rubber_scrap" />
                  {days.map((d) => renderCell(d, 'RUBBER_MIXING', getCustomScrapForDate(d, 'RUBBER_MIXING'), 'rubber_scrap'))}
                </TableRow>
                <TableRow className="bg-[#ddebf7]">
                  <RowHeader title="Rubber scrap rate (Mixing) (%)" subtitle="膠料報廢率(%)" rowId="rubber_rate" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'RUBBER_MIXING', calculateRate(getCustomScrapForDate(d, 'RUBBER_MIXING'), summary ? (summary.mixingRubberUsage ?? summary.rubberUsage ?? 0) : null), 'rubber_rate');
                  })}
                </TableRow>

                {/* RN (Rubber Recycling) */}
                <TableRow>
                  <RowHeader title="Extrusion rubber usage (kg)" subtitle="押出膠料使用重量(kg)" rowId="rn_usage" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'RN', summary ? (summary.extrusionRubberUsage ?? 0) : null, 'rn_usage');
                  })}
                </TableRow>
                <TableRow>
                  <RowHeader title="RN generation weight (kg)" subtitle="RN產生重量(kg)" rowId="rn_scrap" />
                  {days.map((d) => renderCell(d, 'RN', getCustomScrapForDate(d, 'RN'), 'rn_scrap'))}
                </TableRow>
                <TableRow className="bg-[#ddebf7]">
                  <RowHeader title="Rubber recovery rate (%)" subtitle="膠料回收率(%)" rowId="rn_rate" />
                  {days.map((d) => {
                    const summary = getSummaryForDate(d);
                    return renderCell(d, 'RN', calculateRate(getCustomScrapForDate(d, 'RN'), summary ? (summary.extrusionRubberUsage ?? 0) : null), 'rn_rate');
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </div>
    </Card>

      {detailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-4 flex-1">
                <h2 className="text-lg font-semibold flex-1">
                  Scrap Details - {format(detailModal.date, 'PPP')} 
                  <span className="text-muted-foreground ml-2 text-sm">
                    ({detailModal.type.replace('_', ' & ')})
                  </span>
                </h2>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold text-sm">
                    Total Weight: {getFilteredScrapsForModal().reduce((sum, s: any) => sum + Number(s.weight || 0), 0).toFixed(1)} kg
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyModalAsPicture(scrapModalRef, `Scrap_Details_${format(detailModal.date, 'yyyyMMdd')}`)}>
                    {modalCopied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                    {modalCopied ? 'Copied!' : 'Copy Picture'}
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="ml-4" onClick={() => { setDetailModal(null); setHighlightedCols([]); setHighlightedRows([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1" ref={scrapModalRef}>
              {getFilteredScrapsForModal().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scrap records found for this date and material type.
                </div>
              ) : (
                <Table className="border">
                  <TableHeader>
                    <TableRow>
                      {['Date', 'Shift', 'Section', 'Material Type', 'Material Name', 'Weight (kg)', 'Reason', 'Picture', 'Recorded At'].map((head, idx) => (
                        <TableHead 
                          key={idx} 
                          className={cn("cursor-pointer hover:bg-gray-100 transition-colors", highlightedCols.includes(idx) && "bg-yellow-100 text-yellow-900 font-bold")}
                          onClick={() => setHighlightedCols(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                        >
                          {head}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredScrapsForModal().map((scrap: any, i: number) => (
                      <TableRow 
                        key={i} 
                        className={cn("cursor-pointer hover:bg-gray-50 transition-colors", highlightedRows.includes(i) && "bg-yellow-100")}
                        onClick={() => setHighlightedRows(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                      >
                        <TableCell className={cn("whitespace-nowrap", highlightedCols.includes(0) && "bg-yellow-50")}>{scrap.date}</TableCell>
                        <TableCell className={cn(highlightedCols.includes(1) && "bg-yellow-50")}>{scrap.shift}</TableCell>
                        <TableCell className={cn(highlightedCols.includes(2) && "bg-yellow-50")}>{scrap.section}</TableCell>
                        <TableCell className={cn("font-medium", highlightedCols.includes(3) && "bg-yellow-50")}>{scrap.material}</TableCell>
                        <TableCell className={cn(highlightedCols.includes(4) && "bg-yellow-50")}>{scrap.materialName || '-'}</TableCell>
                        <TableCell className={cn(highlightedCols.includes(5) && "bg-yellow-50")}>{typeof scrap.weight === 'number' ? (scrap.weight === 0 ? '0' : scrap.weight.toFixed(1)) : (scrap.weight || '0')}</TableCell>
                        <TableCell className={cn(highlightedCols.includes(6) && "bg-yellow-50")}>{scrap.reason}</TableCell>
                        <TableCell className={cn(highlightedCols.includes(7) && "bg-yellow-50")}>
                          {scrap.imageUrl ? (
                            <a href={scrap.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View Image
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">No image</span>
                          )}
                        </TableCell>
                        <TableCell className={cn("text-muted-foreground whitespace-nowrap", highlightedCols.includes(8) && "bg-yellow-50")}>{formatToIST(scrap.timestamp || scrap.time || '-')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}

      {usageDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  Usage & Scrap Summary - {format(usageDetailModal.date, 'PPP')}
                  <span className="text-muted-foreground ml-2 text-sm">
                    ({usageDetailModal.type.replace('_', ' & ')})
                  </span>
                </h2>
                <Button variant="outline" size="sm" onClick={() => copyModalAsPicture(usageModalRef, `Usage_Details_${format(usageDetailModal.date, 'yyyyMMdd')}`)}>
                  {modalCopied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                  {modalCopied ? 'Copied!' : 'Copy Picture'}
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setUsageDetailModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1" ref={usageModalRef}>
              <Table className="border">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold border">Shift</TableHead>
                    <TableHead className="font-bold border text-center">Usage Weight (kg)</TableHead>
                    <TableHead className="font-bold border text-center">Scrap Weight (kg)</TableHead>
                    <TableHead className="font-bold border text-center">Scrap Rate (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['A', 'B', 'C', 'A1', 'C1'].map((shift) => {
                    const formattedDate = format(usageDetailModal.date, 'yyyy-MM-dd');
                    const shiftSummary = data?.summaries?.find((s: any) => s.date === formattedDate && s.shift === shift);
                    const dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate && s.shift === shift) || [];
                    
                    let usage = 0;
                    if (usageDetailModal.type === 'BIC') usage = Number(shiftSummary?.bicUsage || 0);
                    else if (usageDetailModal.type === 'PLY_CHAFER') usage = Number(shiftSummary?.plyUsage || 0);
                    else if (usageDetailModal.type === 'RUBBER_MIXING') usage = Number(shiftSummary?.mixingRubberUsage || shiftSummary?.rubberUsage || 0);
                    else if (usageDetailModal.type === 'RN') usage = Number(shiftSummary?.extrusionRubberUsage || 0);

                    let scrap = 0;
                    let filteredScraps = [];
                    if (usageDetailModal.type === 'BIC') filteredScraps = dayScraps.filter((s: any) => s.material === 'BIC');
                    else if (usageDetailModal.type === 'PLY_CHAFER') filteredScraps = dayScraps.filter((s: any) => (s.material === 'PLY' || s.material === 'Chafer') && (s.section === 'Calendering' || s.section === 'Cutting'));
                    else if (usageDetailModal.type === 'RUBBER_MIXING') filteredScraps = dayScraps.filter((s: any) => s.material === 'Rubber' && s.section === 'Mixing');
                    else if (usageDetailModal.type === 'RN') filteredScraps = dayScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
                    
                    scrap = filteredScraps.reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
                    const rate = usage > 0 ? ((scrap / usage) * 100).toFixed(3) + '%' : '0%';

                    return (
                      <TableRow key={shift}>
                        <TableCell className="font-bold border">{shift}</TableCell>
                        <TableCell className="text-center border">{usage.toFixed(0)}</TableCell>
                        <TableCell className="text-center border">{scrap.toFixed(1)}</TableCell>
                        <TableCell className="text-center border font-medium">{rate}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="border">TOTAL</TableCell>
                    {(() => {
                      const formattedDate = format(usageDetailModal.date, 'yyyy-MM-dd');
                      const daySummaries = data?.summaries?.filter((s: any) => s.date === formattedDate) || [];
                      const dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate) || [];
                      
                      let totalUsage = 0;
                      if (usageDetailModal.type === 'BIC') totalUsage = daySummaries.reduce((sum: number, s: any) => sum + Number(s.bicUsage || 0), 0);
                      else if (usageDetailModal.type === 'PLY_CHAFER') totalUsage = daySummaries.reduce((sum: number, s: any) => sum + Number(s.plyUsage || 0), 0);
                      else if (usageDetailModal.type === 'RUBBER_MIXING') totalUsage = daySummaries.reduce((sum: number, s: any) => sum + (Number(s.mixingRubberUsage || 0) || Number(s.rubberUsage || 0)), 0);
                      else if (usageDetailModal.type === 'RN') totalUsage = daySummaries.reduce((sum: number, s: any) => sum + Number(s.extrusionRubberUsage || 0), 0);

                      let totalScrap = 0;
                      let filteredScraps = [];
                      if (usageDetailModal.type === 'BIC') filteredScraps = dayScraps.filter((s: any) => s.material === 'BIC');
                      else if (usageDetailModal.type === 'PLY_CHAFER') filteredScraps = dayScraps.filter((s: any) => (s.material === 'PLY' || s.material === 'Chafer') && (s.section === 'Calendering' || s.section === 'Cutting'));
                      else if (usageDetailModal.type === 'RUBBER_MIXING') filteredScraps = dayScraps.filter((s: any) => s.material === 'Rubber' && s.section === 'Mixing');
                      else if (usageDetailModal.type === 'RN') filteredScraps = dayScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
                      
                      totalScrap = filteredScraps.reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
                      const totalRate = totalUsage > 0 ? ((totalScrap / totalUsage) * 100).toFixed(3) + '%' : '0%';

                      return (
                        <>
                          <TableCell className="text-center border">{totalUsage.toFixed(0)}</TableCell>
                          <TableCell className="text-center border">{totalScrap.toFixed(1)}</TableCell>
                          <TableCell className="text-center border text-primary">{totalRate}</TableCell>
                        </>
                      );
                    })()}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {isEditingTargets && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Target Settings</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-8 w-8", isSyncingTargets && "animate-spin")}
                  onClick={loadTargets}
                  disabled={isSyncingTargets}
                  title="Sync from Google Sheet"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingTargets(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {(Object.keys(targets) as Array<keyof typeof targets>).map((key) => {
                const target = targets[key];
                return (
                  <div key={key} className="space-y-2 border-b pb-3 last:border-0">
                    <label className="text-sm font-bold capitalize">{(key as string).replace('_', ' ')}</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 uppercase">Target Value</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={target.value}
                          onChange={(e) => updateTargets({
                            ...targets,
                            [key]: { ...targets[key], value: parseFloat(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] text-gray-500 uppercase">Period</label>
                        <select 
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={target.period}
                          onChange={(e) => updateTargets({
                            ...targets,
                            [key]: { ...targets[key], period: e.target.value as any }
                          })}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="not_use">Not use</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={() => setIsEditingTargets(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
