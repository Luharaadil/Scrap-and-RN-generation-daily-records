import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { saveProductionSummary, fetchSummaryAndScraps, getWebAppUrl } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

export function ProductionEntry() {
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState('');
  
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
            bicUsage: result.summary.bicUsage || '',
            plyUsage: result.summary.plyUsage || '',
            extrusionRubberUsage: result.summary.extrusionRubberUsage || result.summary.chaferUsage || '',
            mixingRubberUsage: result.summary.mixingRubberUsage || result.summary.rubberUsage || ''
          });
        } else {
          setFormData({ bicUsage: '', plyUsage: '', extrusionRubberUsage: '', mixingRubberUsage: '' });
        }
      } catch (err: any) {
        console.error("Failed to load existing data:", err);
      } finally {
        setIsFetching(false);
      }
    };
    
    loadExistingData();
  }, [date]);

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
        bicScrap: 0, // Scrap is updated via Scrap Entry
        plyUsage: formData.plyUsage || 0,
        plyScrap: 0,
        rubberUsage: formData.mixingRubberUsage || 0, // Save mixing rubber to the existing rubberUsage column
        rubberScrap: 0,
        rnScrap: 0,
        chaferUsage: formData.extrusionRubberUsage || 0, // Save extrusion rubber to the existing chaferUsage column
        chaferScrap: 0,
        extrusionRubberUsage: formData.extrusionRubberUsage || 0,
        mixingRubberUsage: formData.mixingRubberUsage || 0 // Keep for compatibility if backend is updated
      });
      setMessage('Production data saved successfully!');
      setFormData({ bicUsage: '', plyUsage: '', extrusionRubberUsage: '', mixingRubberUsage: '' });
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Production Entry</CardTitle>
        <CardDescription>Enter daily usage weights for materials.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plyUsage">Calender PLY & CH (kg)</Label>
              <Input 
                id="plyUsage" 
                name="plyUsage" 
                type="number" 
                step="0.01" 
                value={formData.plyUsage} 
                onChange={handleChange} 
                placeholder="0.00"
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
                placeholder="0.00"
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
                placeholder="0.00"
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
                placeholder="0.00"
                disabled={isFetching}
              />
            </div>
          </div>

          {message && (
            <div className={cn("text-sm font-medium", message.includes('Error') ? "text-red-500" : "text-green-600")}>
              {message}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading || isFetching} className="w-full">
            {(loading || isFetching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isFetching ? 'Loading existing data...' : 'Save Production Data'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
