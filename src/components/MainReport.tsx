import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, RefreshCw, Copy, Image as ImageIcon, Check, X, Type, Plus, Minus } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Calendar } from '@/src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { fetchRangeData, getWebAppUrl } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { DateRange } from 'react-day-picker';
import { useSidebar } from '@/src/lib/SidebarContext';

export function MainReport() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [detailModal, setDetailModal] = useState<{date: Date, type: 'BIC' | 'PLY_CHAFER' | 'RUBBER' | 'RN'} | null>(null);
  const [isEditingFont, setIsEditingFont] = useState(false);
  const [rowFontSizes, setRowFontSizes] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const { setControls, sidebarOpen } = useSidebar();

  const adjustFontSize = (rowId: string, delta: number) => {
    setRowFontSizes(prev => ({
      ...prev,
      [rowId]: Math.max(8, (prev[rowId] || 14) + delta)
    }));
  };

  const loadData = async () => {
    if (!getWebAppUrl() || !date?.from || !date?.to) return;
    
    setLoading(true);
    setError('');
    try {
      const startDate = format(date.from, 'yyyy-MM-dd');
      const endDate = format(date.to, 'yyyy-MM-dd');
      const result = await fetchRangeData(startDate, endDate);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (date?.from && date?.to) {
      loadData().then(() => {
        if (!active) return;
      });
    }
    return () => { active = false; };
  }, [date]);

  useEffect(() => {
    setControls(
      <div className="space-y-4">
        <div className="space-y-2">
          {sidebarOpen && <label className="text-xs font-bold text-gray-500">Date Range</label>}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                  !sidebarOpen && "justify-center px-0"
                )}
                title={date?.from ? `${format(date.from, "LLL dd, y")} - ${date.to ? format(date.to, "LLL dd, y") : ""}` : "Pick a date range"}
              >
                <CalendarIcon className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
                {sidebarOpen && (
                  date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
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

        <div className="space-y-2">
          {sidebarOpen && <label className="text-xs font-bold text-gray-500">Actions</label>}
          <div className={cn("grid gap-2", sidebarOpen ? "grid-cols-2" : "grid-cols-1")}>
            <Button variant="outline" size={sidebarOpen ? "square-lg" : "icon"} onClick={copyValuesOnly} title="Copy values only (for Excel)" className={cn(!sidebarOpen && "size-20 flex-col gap-1 text-[8px] uppercase font-bold")}>
              {copiedText ? <Check className={cn(sidebarOpen ? "h-6 w-6" : "h-5 w-5", "text-green-600")} /> : <Copy className={sidebarOpen ? "h-6 w-6" : "h-5 w-5"} />}
              {!sidebarOpen && <span>Values</span>}
              {sidebarOpen && <span>Values</span>}
            </Button>
            <Button variant="outline" size={sidebarOpen ? "square-lg" : "icon"} onClick={copyAsPicture} title="Copy table as picture" className={cn(!sidebarOpen && "size-20 flex-col gap-1 text-[8px] uppercase font-bold")}>
              {copiedImage ? <Check className={cn(sidebarOpen ? "h-6 w-6" : "h-5 w-5", "text-green-600")} /> : <ImageIcon className={sidebarOpen ? "h-6 w-6" : "h-5 w-5"} />}
              {!sidebarOpen && <span>Picture</span>}
              {sidebarOpen && <span>Picture</span>}
            </Button>
            <Button variant="outline" size={sidebarOpen ? "square-lg" : "icon"} onClick={loadData} disabled={loading} className={cn(sidebarOpen ? "col-span-2 w-full h-16" : "size-20 flex-col gap-1 text-[8px] uppercase font-bold")}>
              <RefreshCw className={cn(sidebarOpen ? "h-6 w-6" : "h-5 w-5", loading && "animate-spin")} />
              {!sidebarOpen && <span>Reload</span>}
              {sidebarOpen && <span>Reload Data</span>}
            </Button>
            <Button 
              variant={isEditingFont ? "default" : "outline"} 
              size={sidebarOpen ? "square-lg" : "icon"} 
              onClick={() => setIsEditingFont(!isEditingFont)} 
              title="Edit row font sizes" 
              className={cn(sidebarOpen ? "col-span-2 w-full h-16" : "size-20 flex-col gap-1 text-[8px] uppercase font-bold")}
            >
              <Type className={sidebarOpen ? "h-6 w-6" : "h-5 w-5"} />
              {!sidebarOpen && <span>Font</span>}
              {sidebarOpen && <span>Edit Font</span>}
            </Button>
          </div>
        </div>
      </div>
    );
    return () => setControls(null);
  }, [date, loading, copiedText, copiedImage, sidebarOpen, isEditingFont]);

  const days = date?.from && date?.to 
    ? eachDayOfInterval({ start: date.from, end: date.to }) 
    : (date?.from ? [date.from] : []);

  const getSummaryForDate = (d: Date) => {
    const formattedDate = format(d, 'yyyy-MM-dd');
    const summary = data?.summaries?.find((s: any) => s.date === formattedDate);
    return summary || null;
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
      days.map(d => getSummaryForDate(d).bicUsage || '0'),
      days.map(d => getCustomScrapForDate(d, 'BIC') || '0'),
      days.map(d => calculateRate(getCustomScrapForDate(d, 'BIC'), getSummaryForDate(d).bicUsage)),
      // PLY + Chafer
      days.map(d => getSummaryForDate(d).plyUsage || '0'),
      days.map(d => getCustomScrapForDate(d, 'PLY_CHAFER') || '0'),
      days.map(d => calculateRate(getCustomScrapForDate(d, 'PLY_CHAFER'), getSummaryForDate(d).plyUsage)),
      // Rubber Mixing
      days.map(d => getSummaryForDate(d).mixingRubberUsage || getSummaryForDate(d).rubberUsage || '0'),
      days.map(d => getCustomScrapForDate(d, 'RUBBER_MIXING') || '0'),
      days.map(d => calculateRate(getCustomScrapForDate(d, 'RUBBER_MIXING'), getSummaryForDate(d).mixingRubberUsage || getSummaryForDate(d).rubberUsage)),
      // RN
      days.map(d => getSummaryForDate(d).mixingRubberUsage || getSummaryForDate(d).rubberUsage || '0'),
      days.map(d => getCustomScrapForDate(d, 'RN') || '0'),
      days.map(d => calculateRate(getCustomScrapForDate(d, 'RN'), getSummaryForDate(d).mixingRubberUsage || getSummaryForDate(d).rubberUsage)),
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
    
    if (value === null || value === undefined || value === '') {
      displayValue = '';
    } else if (typeof value === 'number') {
      displayValue = value === 0 ? '0' : value.toFixed(1);
    } else if (typeof value === 'string') {
      if (value === '0' || value === '0%' || value === '0.000%') {
        displayValue = '0';
      } else {
        displayValue = value;
      }
    }
    
    return (
      <TableCell 
        key={d.toISOString()} 
        className="border border-gray-300 text-center cursor-pointer hover:bg-black/5 transition-colors"
        style={{ fontSize: rowFontSizes[rowId] ? `${rowFontSizes[rowId]}px` : undefined }}
        onDoubleClick={() => setDetailModal({ date: d, type })}
        title="Double click to view scrap details"
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-red-500 text-sm font-medium">{error}</div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">MRI Production Weekly Report MRI 生產週報</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div ref={tableRef} className="bg-white p-4">
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
      </Card>

      {detailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold">
                Scrap Details - {format(detailModal.date, 'PPP')} 
                <span className="text-muted-foreground ml-2 text-sm">
                  ({detailModal.type.replace('_', ' & ')})
                </span>
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setDetailModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {getFilteredScrapsForModal().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scrap records found for this date and material type.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Material Type</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Weight (kg)</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Picture</TableHead>
                      <TableHead>Recorded At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredScrapsForModal().map((scrap: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">{scrap.date}</TableCell>
                        <TableCell>{scrap.shift}</TableCell>
                        <TableCell>{scrap.section}</TableCell>
                        <TableCell className="font-medium">{scrap.material}</TableCell>
                        <TableCell>{scrap.materialName || '-'}</TableCell>
                        <TableCell>{typeof scrap.weight === 'number' ? (scrap.weight === 0 ? '0' : scrap.weight.toFixed(1)) : (scrap.weight || '0')}</TableCell>
                        <TableCell>{scrap.reason}</TableCell>
                        <TableCell>
                          {scrap.imageUrl ? (
                            <a href={scrap.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View Image
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">No image</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatToIST(scrap.timestamp || scrap.time || '-')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
