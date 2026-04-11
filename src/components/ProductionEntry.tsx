import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Save } from 'lucide-react';
import { Calendar } from '@/src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { saveProductionSummary, fetchSummaryAndScraps, getWebAppUrl } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { useSidebar } from '@/src/lib/SidebarContext';

export function ProductionEntry() {
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState('');
  const { setControls, sidebarOpen } = useSidebar();
  
  const [formData, setFormData] = useState({
    bicUsage: '',
    plyUsage: '',
    extrusionRubberUsage: '',
    mixingRubberUsage: ''
  });

  useEffect(() => {
    const loadExistingData = async () => {
      if (!getWebAppUrl()) return;
      setIsFetching(true);
      setMessage('');
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');
        const result = await fetchSummaryAndScraps(formattedDate);
        if (result && result.summary) {
          setFormData({
            bicUsage: result.summary.bicUsage || '0',
            plyUsage: result.summary.plyUsage || '0',
            extrusionRubberUsage: result.summary.extrusionRubberUsage || result.summary.chaferUsage || '0',
            mixingRubberUsage: result.summary.mixingRubberUsage || result.summary.rubberUsage || '0'
          });
        } else {
          setFormData({ bicUsage: '0', plyUsage: '0', extrusionRubberUsage: '0', mixingRubberUsage: '0' });
        }
      } catch (err: any) {
        console.error("Failed to load existing data:", err);
      } finally {
        setIsFetching(false);
      }
    };
    
    loadExistingData();
  }, [date]);

  useEffect(() => {
    setControls(
      <div className="space-y-4">
        <div className="space-y-2">
          {sidebarOpen && <label className="text-xs font-bold text-gray-500">Date</label>}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                  !sidebarOpen && "justify-center px-0"
                )}
                title={date ? format(date, "PPP") : "Pick a date"}
              >
                <CalendarIcon className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
                {sidebarOpen && (date ? format(date, "PPP") : <span>Pick a date</span>)}
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
        </div>

        <div className="pt-4">
          <Button 
            variant="default" 
            size={sidebarOpen ? "square-lg" : "icon"} 
            onClick={() => document.getElementById('submit-production')?.click()} 
            disabled={loading || isFetching}
            className={cn(sidebarOpen ? "w-full h-16" : "size-20 flex-col gap-1 text-[8px] uppercase font-bold")}
          >
            {loading || isFetching ? <Loader2 className={cn(sidebarOpen ? "h-6 w-6" : "h-5 w-5", "animate-spin")} /> : <Save className={sidebarOpen ? "h-6 w-6" : "h-5 w-5"} />}
            {!sidebarOpen && <span>Save</span>}
            {sidebarOpen && <span>Save Data</span>}
          </Button>
        </div>
      </div>
    );
    return () => setControls(null);
  }, [date, loading, isFetching, formData, sidebarOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      await saveProductionSummary({
        date: format(date, 'yyyy-MM-dd'),
        timestamp: format(new Date(), 'dd-MM-yyyy HH:mm:ss'),
        bicUsage: formData.bicUsage || 0,
        bicScrap: 0,
        plyUsage: formData.plyUsage || 0,
        plyScrap: 0,
        rubberUsage: formData.mixingRubberUsage || 0,
        rubberScrap: 0,
        rnScrap: 0,
        chaferUsage: formData.extrusionRubberUsage || 0,
        chaferScrap: 0,
        extrusionRubberUsage: formData.extrusionRubberUsage || 0,
        mixingRubberUsage: formData.mixingRubberUsage || 0
      });
      setMessage('Production data saved successfully!');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Production Entry</CardTitle>
        <CardDescription>Enter daily usage weights for materials.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="plyUsage">Calender PLY & CH (kg)</Label>
              <Input 
                id="plyUsage" 
                name="plyUsage" 
                type="number" 
                step="0.01" 
                value={formData.plyUsage} 
                onChange={handleChange} 
                placeholder="0"
                disabled={isFetching}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bicUsage">Cutting BIC (kg)</Label>
              <Input 
                id="bicUsage" 
                name="bicUsage" 
                type="number" 
                step="0.01" 
                value={formData.bicUsage} 
                onChange={handleChange} 
                placeholder="0"
                disabled={isFetching}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixingRubberUsage">Mixing Rubber (kg)</Label>
              <Input 
                id="mixingRubberUsage" 
                name="mixingRubberUsage" 
                type="number" 
                step="0.01" 
                value={formData.mixingRubberUsage} 
                onChange={handleChange} 
                placeholder="0"
                disabled={isFetching}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extrusionRubberUsage">Extrusion Rubber (kg)</Label>
              <Input 
                id="extrusionRubberUsage" 
                name="extrusionRubberUsage" 
                type="number" 
                step="0.01" 
                value={formData.extrusionRubberUsage} 
                onChange={handleChange} 
                placeholder="0"
                disabled={isFetching}
              />
            </div>
          </div>

          {message && (
            <div className={cn("text-sm font-medium p-3 rounded-md", message.includes('Error') ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>
              {message}
            </div>
          )}
          
          <button type="submit" id="submit-production" className="hidden" />
        </CardContent>
      </form>
    </Card>
  );
}
