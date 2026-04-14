import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, RefreshCw, ImageIcon, Check, Edit2, Save, X } from 'lucide-react';
import { Calendar } from '@/src/components/ui/calendar';
import { toBlob } from 'html-to-image';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { getWebAppUrl } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { useData } from '@/src/lib/DataContext';

export function Dashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const { data, loading, error, loadData, updateScrapReasonInSheet } = useData();
  
  const [shiftFilter, setShiftFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedScrap, setCopiedScrap] = useState(false);
  
  const [editingScrap, setEditingScrap] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const summaryRef = useRef<HTMLDivElement>(null);
  const scrapTableRef = useRef<HTMLDivElement>(null);

  const copyAsPicture = async (ref: React.RefObject<HTMLDivElement>, setCopied: (v: boolean) => void) => {
    if (!ref.current) return;
    try {
      // Temporarily remove constraints for full capture
      const originalStyle = ref.current.getAttribute('style') || '';
      const originalParentStyle = ref.current.parentElement?.getAttribute('style') || '';
      
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy picture', err);
    }
  };

  const rawSummary = data?.summaries?.filter((s: any) => s.date === format(date, 'yyyy-MM-dd')) || [];
  const scraps = data?.scraps?.filter((s: any) => s.date === format(date, 'yyyy-MM-dd')) || [];
  
  // A day has data if it has scraps OR if any summary field is non-zero
  const hasAnySummaryValue = rawSummary.some((s: any) => 
    Number(s.bicUsage || 0) > 0 || 
    Number(s.plyUsage || 0) > 0 || 
    Number(s.mixingRubberUsage || 0) > 0 || 
    Number(s.rubberUsage || 0) > 0 || 
    Number(s.extrusionRubberUsage || 0) > 0 ||
    Number(s.chaferUsage || 0) > 0
  );
  const hasData = scraps.length > 0 || hasAnySummaryValue;

  const summary = rawSummary.reduce((acc: any, curr: any) => ({
    bicUsage: (acc.bicUsage || 0) + Number(curr.bicUsage || 0),
    bicScrap: (acc.bicScrap || 0) + Number(curr.bicScrap || 0),
    plyUsage: (acc.plyUsage || 0) + Number(curr.plyUsage || 0),
    plyScrap: (acc.plyScrap || 0) + Number(curr.plyScrap || 0),
    rubberUsage: (acc.rubberUsage || 0) + (Number(curr.mixingRubberUsage || 0) || Number(curr.rubberUsage || 0)),
    rubberScrap: (acc.rubberScrap || 0) + Number(curr.rubberScrap || 0),
    rnScrap: (acc.rnScrap || 0) + Number(curr.rnScrap || 0),
    chaferUsage: (acc.chaferUsage || 0) + Number(curr.chaferUsage || 0),
    chaferScrap: (acc.chaferScrap || 0) + Number(curr.chaferScrap || 0),
    extrusionRubberUsage: (acc.extrusionRubberUsage || 0) + Number(curr.extrusionRubberUsage || 0)
  }), {
    bicUsage: 0, bicScrap: 0, plyUsage: 0, plyScrap: 0, rubberUsage: 0, rubberScrap: 0, rnScrap: 0, chaferUsage: 0, chaferScrap: 0, extrusionRubberUsage: 0
  });
  
  const filteredScraps = scraps.filter((scrap: any) => {
    if (shiftFilter !== 'All' && scrap.shift !== shiftFilter) return false;
    if (sectionFilter !== 'All' && scrap.section !== sectionFilter) return false;
    if (materialFilter !== 'All' && scrap.material !== materialFilter) return false;
    return true;
  });

  const getSectionScrapTotal = (material: string, section: string) => {
    return scraps
      .filter((s: any) => s.material === material && s.section === section)
      .reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
  };

  const getScrapTotal = (material: string) => {
    return filteredScraps
      .filter((s: any) => s.material === material)
      .reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
  };

  const displayBicScrap = getScrapTotal('BIC');
  const displayPlyScrap = getScrapTotal('PLY');
  const displayRubberScrap = getScrapTotal('Rubber');
  const displayRnScrap = getScrapTotal('RN') + getScrapTotal('Extrusion Rubber');

  const calculateRate = (scrap: number, usage: number) => {
    if (!usage || usage === 0) return null;
    if (!scrap || scrap === 0) return 0;
    return ((Number(scrap) / Number(usage)) * 100).toFixed(3) + '%';
  };

  const formatValue = (val: any, unit: string = '') => {
    if (!hasData) return '';
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (num === 0) return '0';
    return num.toFixed(1) + (unit ? ` ${unit}` : '');
  };

  const formatToIST = (timestamp: string) => {
    if (!timestamp || timestamp === '-') return '-';
    try {
      // Check if it's already an ISO string or a valid date string
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
      
      // Fallback for old format dd-MM-yyyy HH:mm:ss
      // We'll just return it as is if it doesn't look like an ISO string
      return timestamp;
    } catch (e) {
      return timestamp;
    }
  };

  const handleSaveReason = async (timestamp: string) => {
    if (!timestamp) return;
    setIsUpdating(true);
    try {
      await updateScrapReasonInSheet(timestamp, editReason);
      setEditingScrap(null);
    } catch (err) {
      alert('Failed to update reason');
    } finally {
      setIsUpdating(false);
    }
  };

  const startEditing = (scrap: any) => {
    setEditingScrap(scrap.timestamp);
    setEditReason(scrap.reason || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Shifts</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="A1">A1</SelectItem>
              <SelectItem value="C1">C1</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sections</SelectItem>
              <SelectItem value="Mixing">Mixing</SelectItem>
              <SelectItem value="Extrusion">Extrusion</SelectItem>
              <SelectItem value="Calendering">Calendering</SelectItem>
              <SelectItem value="Cutting">Cutting</SelectItem>
              <SelectItem value="Tire building">Tire building</SelectItem>
              <SelectItem value="Curing">Curing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="BIC">BIC (鋼絲)</SelectItem>
              <SelectItem value="PLY">PLY (簾紗)</SelectItem>
              <SelectItem value="Rubber">Rubber (膠料)</SelectItem>
              <SelectItem value="RN">RN Generation</SelectItem>
              <SelectItem value="Chafer">Chafer (防擦布)</SelectItem>
              <SelectItem value="Fabric">Fabric</SelectItem>
              <SelectItem value="Carbon">Carbon</SelectItem>
              <SelectItem value="Chemical">Chemical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal h-10 font-bold",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => loadData(true)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm font-medium">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" ref={summaryRef}>
        <div className="md:col-span-2 lg:col-span-3 xl:col-span-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <h2 className="text-xl font-bold">Daily Summary Details</h2>
          <Button variant="outline" size="sm" onClick={() => copyAsPicture(summaryRef, setCopiedSummary)} className="h-9 font-bold">
            {copiedSummary ? <Check className="h-4 w-4 sm:mr-2 text-green-600" /> : <ImageIcon className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">{copiedSummary ? 'Copied!' : 'Copy Summary Image'}</span>
            {!copiedSummary && <span className="sm:hidden">Summary</span>}
            {copiedSummary && <span className="sm:hidden">Copied</span>}
          </Button>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">BIC (鋼絲)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage:</span>
                <span className="font-medium">{formatValue(summary.bicUsage, 'kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scrap:</span>
                <span className="font-medium text-red-600">{formatValue(displayBicScrap, 'kg')}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">Scrap Rate:</span>
                <span className="font-bold">{hasData ? (calculateRate(displayBicScrap, summary.bicUsage) ?? '0') : ''}</span>
              </div>
              {hasData && (
                <div className="mt-2 pt-2 border-t border-dashed text-[10px] space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Cutting:</span>
                    <span>{getSectionScrapTotal('BIC', 'Cutting').toFixed(1)} kg</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">PLY (簾紗)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage:</span>
                <span className="font-medium">{formatValue(summary.plyUsage, 'kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scrap:</span>
                <span className="font-medium text-red-600">{formatValue(displayPlyScrap, 'kg')}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">Scrap Rate:</span>
                <span className="font-bold">{hasData ? (calculateRate(displayPlyScrap, summary.plyUsage) ?? '0') : ''}</span>
              </div>
              {hasData && (
                <div className="mt-2 pt-2 border-t border-dashed text-[10px] space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Calendering:</span>
                    <span>{getSectionScrapTotal('PLY', 'Calendering').toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Cutting:</span>
                    <span>{getSectionScrapTotal('PLY', 'Cutting').toFixed(1)} kg</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rubber (膠料)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage:</span>
                <span className="font-medium">{formatValue(summary.rubberUsage, 'kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scrap:</span>
                <span className="font-medium text-red-600">{formatValue(displayRubberScrap, 'kg')}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">Scrap Rate:</span>
                <span className="font-bold">{hasData ? (calculateRate(displayRubberScrap, summary.rubberUsage) ?? '0') : ''}</span>
              </div>
              {hasData && (
                <div className="mt-2 pt-2 border-t border-dashed text-[10px] space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Mixing:</span>
                    <span>{getSectionScrapTotal('Rubber', 'Mixing').toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tire building:</span>
                    <span>{getSectionScrapTotal('Rubber', 'Tire building').toFixed(1)} kg</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">RN Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rubber Usage:</span>
                <span className="font-medium">{formatValue(summary.extrusionRubberUsage, 'kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RN Scrap:</span>
                <span className="font-medium text-red-600">{formatValue(displayRnScrap, 'kg')}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">Scrap Rate:</span>
                <span className="font-bold">{hasData ? (calculateRate(displayRnScrap, summary.extrusionRubberUsage) ?? '0') : ''}</span>
              </div>
              {hasData && (
                <div className="mt-2 pt-2 border-t border-dashed text-[10px] space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Extrusion:</span>
                    <span>{getSectionScrapTotal('Extrusion Rubber', 'Extrusion').toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tire building:</span>
                    <span>{getSectionScrapTotal('RN', 'Tire building').toFixed(1)} kg</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle>Scrap Details</CardTitle>
            <CardDescription>Detailed list of scrap recorded for {format(date, 'PPP')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => copyAsPicture(scrapTableRef, setCopiedScrap)} className="h-9 font-bold">
            {copiedScrap ? <Check className="h-4 w-4 sm:mr-2 text-green-600" /> : <ImageIcon className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">{copiedScrap ? 'Copied!' : 'Copy Scrap Image'}</span>
            {!copiedScrap && <span className="sm:hidden">Scrap</span>}
            {copiedScrap && <span className="sm:hidden">Copied</span>}
          </Button>
        </CardHeader>
        <CardContent ref={scrapTableRef}>
          {filteredScraps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scrap records found matching the current filters.
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
                {filteredScraps.map((scrap: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{scrap.date}</TableCell>
                    <TableCell>{scrap.shift}</TableCell>
                    <TableCell>{scrap.section}</TableCell>
                    <TableCell className="font-medium">{scrap.material}</TableCell>
                    <TableCell>{scrap.materialName || '-'}</TableCell>
                    <TableCell>{typeof scrap.weight === 'number' ? (scrap.weight === 0 ? '0' : scrap.weight.toFixed(1)) : (scrap.weight || '0')}</TableCell>
                    <TableCell>
                      {editingScrap === scrap.timestamp ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            className="border rounded px-2 py-1 text-sm flex-1"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            autoFocus
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleSaveReason(scrap.timestamp)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600"
                            onClick={() => setEditingScrap(null)}
                            disabled={isUpdating}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <span>{scrap.reason}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEditing(scrap)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
