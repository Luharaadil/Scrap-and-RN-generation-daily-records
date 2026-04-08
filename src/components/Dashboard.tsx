import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, RefreshCw } from 'lucide-react';
import { Calendar } from '@/src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { fetchSummaryAndScraps, getWebAppUrl } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

export function Dashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [shiftFilter, setShiftFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');

  const loadData = async () => {
    if (!getWebAppUrl()) return;
    
    setLoading(true);
    setError('');
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const result = await fetchSummaryAndScraps(formattedDate);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const rawSummary = data?.summary || {};
  const summary = {
    bicUsage: rawSummary.bicUsage || 0,
    bicScrap: rawSummary.bicScrap || 0,
    plyUsage: rawSummary.plyUsage || 0,
    plyScrap: rawSummary.plyScrap || 0,
    rubberUsage: rawSummary.rubberUsage || 0,
    rubberScrap: rawSummary.rubberScrap || 0,
    rnScrap: rawSummary.rnScrap || 0,
    chaferUsage: rawSummary.chaferUsage || 0,
    chaferScrap: rawSummary.chaferScrap || 0,
    extrusionRubberUsage: rawSummary.extrusionRubberUsage || 0
  };
  
  const scraps = data?.scraps || [];

  const filteredScraps = scraps.filter((scrap: any) => {
    if (shiftFilter !== 'All' && scrap.shift !== shiftFilter) return false;
    if (sectionFilter !== 'All' && scrap.section !== sectionFilter) return false;
    return true;
  });

  const getScrapTotal = (material: string) => {
    return filteredScraps
      .filter((s: any) => s.material === material)
      .reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);
  };

  const displayBicScrap = getScrapTotal('BIC');
  const displayPlyScrap = getScrapTotal('PLY');
  const displayRubberScrap = getScrapTotal('Rubber');
  const displayRnScrap = getScrapTotal('Extrusion Rubber');

  const calculateRate = (scrap: number, usage: number) => {
    if (!usage || usage === 0) return null;
    if (!scrap || scrap === 0) return 0;
    return ((Number(scrap) / Number(usage)) * 100).toFixed(3) + '%';
  };

  const formatValue = (val: any, unit: string = '') => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (num === 0) return '0';
    return num.toFixed(1) + (unit ? ` ${unit}` : '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

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
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm font-medium">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                <span className="font-bold">{calculateRate(displayBicScrap, summary.bicUsage) ?? '0'}</span>
              </div>
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
                <span className="font-bold">{calculateRate(displayPlyScrap, summary.plyUsage) ?? '0'}</span>
              </div>
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
                <span className="font-bold">{calculateRate(displayRubberScrap, summary.rubberUsage) ?? '0'}</span>
              </div>
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
                <span className="font-bold">{calculateRate(displayRnScrap, summary.extrusionRubberUsage) ?? '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scrap Details</CardTitle>
          <CardDescription>Detailed list of scrap recorded for {format(date, 'PPP')}</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <TableCell className="text-muted-foreground whitespace-nowrap">{scrap.timestamp || scrap.time || '-'}</TableCell>
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
