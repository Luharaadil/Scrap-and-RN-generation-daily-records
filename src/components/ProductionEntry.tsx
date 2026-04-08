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

function ProductionRow({ label, name, value, sectionKey, onChange, onSave, loading, isFetching, savingSection }: { 
  label: string, 
  name: string, 
  value: string, 
  sectionKey: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onSave: (sectionKey: string) => void,
  loading: boolean,
  isFetching: boolean,
  savingSection: string | null
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-gray-50/50">
      <Button 
        type="button" 
        variant="outline" 
        size="square-lg" 
        className="w-full sm:w-64 h-24 text-center flex flex-col gap-2 shrink-0"
        onClick={() => onSave(sectionKey)}
        disabled={loading || isFetching || !!savingSection}
      >
        {savingSection === sectionKey ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
        <span className="text-sm font-bold whitespace-normal leading-tight">{label}</span>
      </Button>
      <div className="flex-1 w-full">
        <Label htmlFor={name} className="mb-2 block text-xs font-bold uppercase text-gray-500">Enter Weight (kg)</Label>
        <Input 
          id={name} 
          name={name} 
          type="number" 
          step="0.01" 
          value={value} 
          onChange={onChange} 
          placeholder="0"
          className="h-16 text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          disabled={isFetching || !!savingSection}
        />
      </div>
    </div>
  );
}

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
  const [savingSection, setSavingSection] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveSection = async (sectionKey: string) => {
    setSavingSection(sectionKey);
    setMessage('');
    
    try {
      await saveProductionSummary({
        date: format(date, 'yyyy-MM-dd'),
        timestamp: new Date().toISOString(),
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
      setMessage(`${sectionKey.replace('Usage', '')} data saved successfully!`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Production Entry</CardTitle>
      </CardHeader>
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

        <div className="space-y-4">
          <ProductionRow 
            label="Calender PLY & CH (kg)" 
            name="plyUsage" 
            value={formData.plyUsage} 
            sectionKey="plyUsage"
            onChange={handleChange}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
          <ProductionRow 
            label="Cutting BIC (kg)" 
            name="bicUsage" 
            value={formData.bicUsage} 
            sectionKey="bicUsage"
            onChange={handleChange}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
          <ProductionRow 
            label="Mixing Rubber (kg)" 
            name="mixingRubberUsage" 
            value={formData.mixingRubberUsage} 
            sectionKey="mixingRubberUsage"
            onChange={handleChange}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
          <ProductionRow 
            label="Extrusion Rubber (kg)" 
            name="extrusionRubberUsage" 
            value={formData.extrusionRubberUsage} 
            sectionKey="extrusionRubberUsage"
            onChange={handleChange}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
        </div>

        <div className="pt-4">
          <Button 
            onClick={() => handleSaveSection('All Sections')} 
            disabled={loading || isFetching || !!savingSection}
            className="w-full h-16 text-lg font-bold uppercase tracking-wider"
          >
            {savingSection === 'All Sections' ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
            Save All Sections Combined
          </Button>
        </div>

        {message && (
          <div className={cn("text-sm font-medium p-3 rounded-md", message.includes('Error') ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
