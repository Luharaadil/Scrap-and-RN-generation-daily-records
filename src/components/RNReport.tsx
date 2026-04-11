import React, { useState, useEffect, useRef } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { Calendar as CalendarIcon, RefreshCw, Copy, Image as ImageIcon, Check, Type, Plus, Minus, X } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Calendar } from '@/src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { cn } from '@/src/lib/utils';
import { DateRange } from 'react-day-picker';
import { useSidebar } from '@/src/lib/SidebarContext';
import { useData } from '@/src/lib/DataContext';
import { startOfWeek, endOfWeek } from 'date-fns';

export function RNReport() {
  const { 
    data, 
    loading, 
    error, 
    loadData,
    globalDateRange: date,
    setGlobalDateRange: setDate
  } = useData();
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isEditingFont, setIsEditingFont] = useState(false);
  const [detailModal, setDetailModal] = useState<{date: Date, shift?: string} | null>(null);
  const [highlightedCols, setHighlightedCols] = useState<number[]>([]);
  const [highlightedRows, setHighlightedRows] = useState<number[]>([]);
  const [modalCopied, setModalCopied] = useState(false);
  const [rowFontSizes, setRowFontSizes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mri_rn_row_font_sizes');
    return saved ? JSON.parse(saved) : {};
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const scrapModalRef = useRef<HTMLDivElement>(null);
  const { setControls } = useSidebar();

  useEffect(() => {
    localStorage.setItem('mri_rn_row_font_sizes', JSON.stringify(rowFontSizes));
  }, [rowFontSizes]);

  const adjustFontSize = (rowId: string, delta: number) => {
    setRowFontSizes(prev => ({
      ...prev,
      [rowId]: Math.max(8, (prev[rowId] || 14) + delta)
    }));
  };

  useEffect(() => {
    setControls(
      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 font-bold text-[10px] sm:text-xs whitespace-nowrap">
                <CalendarIcon className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "MM/dd")} - {format(date.to, "MM/dd")}
                    </>
                  ) : (
                    format(date.from, "MM/dd")
                  )
                ) : (
                  <span>Date</span>
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

        <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap">
          <Button variant="outline" size="sm" onClick={copyValuesOnly} title="Copy values only" className="h-7 px-1.5 sm:h-8 sm:px-2 font-bold text-[9px] sm:text-xs flex-shrink-0">
            {copiedText ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
            <span className="hidden lg:inline ml-1">Values</span>
          </Button>
          <Button variant="outline" size="sm" onClick={copyAsPicture} title="Copy table as picture" className="h-7 px-1.5 sm:h-8 sm:px-2 font-bold text-[9px] sm:text-xs flex-shrink-0">
            {copiedImage ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" /> : <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
            <span className="hidden lg:inline ml-1">Picture</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading} className="h-7 px-1.5 sm:h-8 sm:px-2 font-bold text-[9px] sm:text-xs flex-shrink-0">
            <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4", loading && "animate-spin")} />
            <span className="hidden lg:inline ml-1">Reload</span>
          </Button>
          <Button 
            variant={isEditingFont ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsEditingFont(!isEditingFont)} 
            className="h-7 px-1.5 sm:h-8 sm:px-2 font-bold text-[9px] sm:text-xs flex-shrink-0"
          >
            <Type className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline ml-1">Font</span>
          </Button>
        </div>
      </div>
    );
    return () => setControls(null);
  }, [date, loading, copiedText, copiedImage, isEditingFont]);

  const days = date?.from && date?.to 
    ? eachDayOfInterval({ start: date.from, end: date.to }) 
    : (date?.from ? [date.from] : []);

  const getShiftData = (d: Date, shift: string) => {
    const formattedDate = format(d, 'yyyy-MM-dd');
    const summary = data?.summaries?.find((s: any) => s.date === formattedDate && s.shift === shift);
    const scraps = data?.scraps?.filter((s: any) => s.date === formattedDate && s.shift === shift) || [];
    
    const usage = Number(summary?.extrusionRubberUsage || 0);
    const rn = scraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN')
                     .reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
    const rate = usage > 0 ? ((rn / usage) * 100).toFixed(3) + '%' : '0%';
    
    return { usage, rn, rate };
  };

  const getTotalData = (d: Date) => {
    const formattedDate = format(d, 'yyyy-MM-dd');
    const daySummaries = data?.summaries?.filter((s: any) => s.date === formattedDate) || [];
    const dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate) || [];
    
    const usage = daySummaries.reduce((sum: number, s: any) => sum + Number(s.extrusionRubberUsage || 0), 0);
    const rn = dayScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN')
                        .reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
    const rate = usage > 0 ? ((rn / usage) * 100).toFixed(3) + '%' : '0%';
    
    return { usage, rn, rate };
  };

  const copyValuesOnly = () => {
    if (!days.length) return;
    const shifts = ['A', 'B', 'C', 'A1', 'C1'];
    let rows = [];
    
    shifts.forEach(shift => {
      rows.push(days.map(d => getShiftData(d, shift).usage).join('\t'));
      rows.push(days.map(d => getShiftData(d, shift).rn).join('\t'));
      rows.push(days.map(d => getShiftData(d, shift).rate).join('\t'));
    });
    
    rows.push(days.map(d => getTotalData(d).usage).join('\t'));
    rows.push(days.map(d => getTotalData(d).rn).join('\t'));
    rows.push(days.map(d => getTotalData(d).rate).join('\t'));

    navigator.clipboard.writeText(rows.join('\n')).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  const copyAsPicture = async () => {
    if (!tableRef.current) return;
    try {
      const blob = await toBlob(tableRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err) {
      console.error('Failed to copy picture', err);
    }
  };

  const getFilteredScrapsForModal = () => {
    if (!detailModal) return [];
    const formattedDate = format(detailModal.date, 'yyyy-MM-dd');
    let dayScraps = data?.scraps?.filter((s: any) => s.date === formattedDate) || [];
    
    if (detailModal.shift) {
      dayScraps = dayScraps.filter((s: any) => s.shift === detailModal.shift);
    }

    return dayScraps.filter((s: any) => s.material === 'Extrusion Rubber' || s.material === 'RN');
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

  const copyModalAsPicture = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    try {
      const originalStyle = ref.current.getAttribute('style') || '';
      ref.current.style.width = 'max-content';
      ref.current.style.height = 'auto';
      ref.current.style.overflow = 'visible';

      const blob = await toBlob(ref.current, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });

      ref.current.setAttribute('style', originalStyle);

      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setModalCopied(true);
      setTimeout(() => setModalCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy modal picture', err);
    }
  };

  const RowHeader = ({ title, subtitle, rowId }: { title: string, subtitle: string, rowId: string }) => (
    <TableCell 
      className="border border-gray-300 font-medium leading-tight py-2 min-w-[150px] max-w-[250px] whitespace-normal relative"
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

  const renderCell = (d: Date, value: any, rowId: string, shift?: string) => {
    const formattedDate = format(d, 'yyyy-MM-dd');
    const hasData = data?.summaries?.some((s: any) => s.date === formattedDate) || data?.scraps?.some((s: any) => s.date === formattedDate);
    
    let displayValue = '';
    if (hasData) {
      if (typeof value === 'number') {
        displayValue = value === 0 ? '0' : (rowId.includes('rate') ? value.toFixed(3) : value.toFixed(0));
      } else {
        displayValue = value || '0';
      }
    }

    return (
      <TableCell 
        key={d.toISOString()} 
        className={cn(
          "border border-gray-300 text-center transition-colors",
          hasData && "cursor-pointer hover:bg-black/5"
        )}
        style={{ fontSize: rowFontSizes[rowId] ? `${rowFontSizes[rowId]}px` : undefined }}
        onDoubleClick={() => {
          if (hasData) {
            setDetailModal({ date: d, shift });
          }
        }}
      >
        {displayValue}
      </TableCell>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div ref={tableRef} className="bg-white">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">2026 RN Generation Details Report</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="p-4">
              <Table className="border-collapse border border-gray-300 w-full min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border border-gray-300 bg-gray-50 font-semibold text-center min-w-[150px]">
                      Date 日期
                    </TableHead>
                    {days.map((d, i) => (
                      <TableHead key={i} className="border border-gray-300 bg-gray-50 font-semibold text-center min-w-[80px] text-lg">
                        {format(d, 'M-d')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['A', 'B', 'C', 'A1', 'C1'].map(shift => (
                    <React.Fragment key={shift}>
                      <TableRow>
                        <RowHeader title={`Shift ${shift} Usage (kg)`} subtitle={`班次 ${shift} 使用重量`} rowId={`rn_${shift}_usage`} />
                        {days.map(d => renderCell(d, getShiftData(d, shift).usage, `rn_${shift}_usage`, shift))}
                      </TableRow>
                      <TableRow>
                        <RowHeader title={`Shift ${shift} RN (kg)`} subtitle={`班次 ${shift} RN產生重量`} rowId={`rn_${shift}_scrap`} />
                        {days.map(d => renderCell(d, getShiftData(d, shift).rn, `rn_${shift}_scrap`, shift))}
                      </TableRow>
                      <TableRow className="bg-[#e2f0d9]">
                        <RowHeader title={`Shift ${shift} Rate (%)`} subtitle={`班次 ${shift} 回收率`} rowId={`rn_${shift}_rate`} />
                        {days.map(d => renderCell(d, getShiftData(d, shift).rate, `rn_${shift}_rate`, shift))}
                      </TableRow>
                    </React.Fragment>
                  ))}
                  <TableRow className="bg-gray-100 font-bold">
                    <RowHeader title="TOTAL Usage (kg)" subtitle="總使用重量" rowId="rn_total_usage" />
                    {days.map(d => renderCell(d, getTotalData(d).usage, "rn_total_usage"))}
                  </TableRow>
                  <TableRow className="bg-gray-100 font-bold">
                    <RowHeader title="TOTAL RN (kg)" subtitle="總RN產生重量" rowId="rn_total_scrap" />
                    {days.map(d => renderCell(d, getTotalData(d).rn, "rn_total_scrap"))}
                  </TableRow>
                  <TableRow className="bg-[#ddebf7] font-bold">
                    <RowHeader title="TOTAL Rate (%)" subtitle="總回收率" rowId="rn_total_rate" />
                    {days.map(d => renderCell(d, getTotalData(d).rate, "rn_total_rate"))}
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
                  RN Generation Details - {format(detailModal.date, 'PPP')} 
                  {detailModal.shift && <span className="ml-2 text-primary">(Shift {detailModal.shift})</span>}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold text-sm">
                    Total RN: {getFilteredScrapsForModal().reduce((sum, s: any) => sum + Number(s.weight || 0), 0).toFixed(1)} kg
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyModalAsPicture(scrapModalRef, `RN_Details_${format(detailModal.date, 'yyyyMMdd')}`)}>
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
                  No RN records found for this selection.
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
    </div>
  );
}
