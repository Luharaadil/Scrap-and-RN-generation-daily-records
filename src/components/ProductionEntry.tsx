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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useData } from '@/src/lib/DataContext';

function ProductionRow({ label, sectionKey, values, onChange, onSave, loading, isFetching, savingSection }: { 
  label: string, 
  sectionKey: string,
  values: Record<string, string>,
  onChange: (shift: string, value: string) => void,
  onSave: (sectionKey: string) => void,
  loading: boolean,
  isFetching: boolean,
  savingSection: string | null
}) {
  const shifts = ['A', 'B', 'C', 'A1', 'C1'];
  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50/50">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm font-bold whitespace-normal leading-tight text-primary uppercase">{label}</div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="h-10 px-4"
          onClick={() => onSave(sectionKey)}
          disabled={loading || isFetching || !!savingSection}
        >
          {savingSection === sectionKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save {label.split(' ')[0]}
        </Button>
      </div>
      <div className="grid grid-cols-5 gap-2 relative">
        {isFetching && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-md">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {shifts.map(shift => (
          <div key={shift} className="space-y-1">
            <Label className="text-[10px] uppercase text-gray-400 text-center block">Shift {shift}</Label>
            <Input 
              type="number" 
              step="1" 
              value={values[shift] || ''} 
              onChange={(e) => onChange(shift, e.target.value)} 
              placeholder="0"
              className="h-12 text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isFetching || !!savingSection}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductionEntry() {
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState('');
  const { loadData } = useData();
  
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({
    bicUsage: { A: '', B: '', C: '', A1: '', C1: '' },
    plyUsage: { A: '', B: '', C: '', A1: '', C1: '' },
    extrusionRubberUsage: { A: '', B: '', C: '', A1: '', C1: '' },
    mixingRubberUsage: { A: '', B: '', C: '', A1: '', C1: '' }
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
        
        const newFormData: any = {
          bicUsage: { A: '0', B: '0', C: '0', A1: '0', C1: '0' },
          plyUsage: { A: '0', B: '0', C: '0', A1: '0', C1: '0' },
          extrusionRubberUsage: { A: '0', B: '0', C: '0', A1: '0', C1: '0' },
          mixingRubberUsage: { A: '0', B: '0', C: '0', A1: '0', C1: '0' }
        };

        if (result && result.summaries) {
          result.summaries.forEach((s: any) => {
            const shift = s.shift;
            if (newFormData.bicUsage[shift] !== undefined) {
              // Use existing values if they exist, otherwise keep '0'
              if (s.bicUsage !== undefined && s.bicUsage !== null) 
                newFormData.bicUsage[shift] = Math.round(Number(s.bicUsage)).toString();
              if (s.plyUsage !== undefined && s.plyUsage !== null)
                newFormData.plyUsage[shift] = Math.round(Number(s.plyUsage)).toString();
              if (s.extrusionRubberUsage !== undefined && s.extrusionRubberUsage !== null)
                newFormData.extrusionRubberUsage[shift] = Math.round(Number(s.extrusionRubberUsage)).toString();
              else if (s.chaferUsage !== undefined && s.chaferUsage !== null)
                newFormData.extrusionRubberUsage[shift] = Math.round(Number(s.chaferUsage)).toString();
                
              if (s.mixingRubberUsage !== undefined && s.mixingRubberUsage !== null)
                newFormData.mixingRubberUsage[shift] = Math.round(Number(s.mixingRubberUsage)).toString();
              else if (s.rubberUsage !== undefined && s.rubberUsage !== null)
                newFormData.mixingRubberUsage[shift] = Math.round(Number(s.rubberUsage)).toString();
            }
          });
        }
        setFormData(newFormData);
      } catch (err: any) {
        console.error("Failed to load existing data:", err);
      } finally {
        setIsFetching(false);
      }
    };
    
    loadExistingData();
  }, [date]);

  const handleShiftChange = (sectionKey: string, shift: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [shift]: value
      }
    }));
  };

  const handleSaveSection = async (sectionKey: string) => {
    setSavingSection(sectionKey);
    setMessage('');
    
    try {
      const shifts = ['A', 'B', 'C', 'A1', 'C1'];
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (sectionKey === 'All Sections') {
        // Save all shifts for all sections
        for (const shift of shifts) {
          await saveProductionSummary({
            date: dateStr,
            shift: shift,
            timestamp: new Date().toISOString(),
            bicUsage: Number(formData.bicUsage[shift] || 0),
            plyUsage: Number(formData.plyUsage[shift] || 0),
            extrusionRubberUsage: Number(formData.extrusionRubberUsage[shift] || 0),
            mixingRubberUsage: Number(formData.mixingRubberUsage[shift] || 0),
            // Legacy fields for compatibility
            chaferUsage: Number(formData.extrusionRubberUsage[shift] || 0),
            rubberUsage: Number(formData.mixingRubberUsage[shift] || 0)
          });
        }
        setMessage(`All sections for all shifts saved successfully!`);
      } else {
        // Save all shifts for one specific section ONLY
        // This prevents overwriting other sections with 0 if they haven't been fetched/loaded
        for (const shift of shifts) {
          const payload: any = {
            date: dateStr,
            shift: shift,
            timestamp: new Date().toISOString()
          };
          
          // Only add the field for the section being saved
          if (sectionKey === 'bicUsage') payload.bicUsage = Number(formData.bicUsage[shift] || 0);
          if (sectionKey === 'plyUsage') payload.plyUsage = Number(formData.plyUsage[shift] || 0);
          if (sectionKey === 'extrusionRubberUsage') {
            payload.extrusionRubberUsage = Number(formData.extrusionRubberUsage[shift] || 0);
            payload.chaferUsage = Number(formData.extrusionRubberUsage[shift] || 0); // Legacy
          }
          if (sectionKey === 'mixingRubberUsage') {
            payload.mixingRubberUsage = Number(formData.mixingRubberUsage[shift] || 0);
            payload.rubberUsage = Number(formData.mixingRubberUsage[shift] || 0); // Legacy
          }
          
          await saveProductionSummary(payload);
        }
        setMessage(`${sectionKey.replace('Usage', '')} data for all shifts saved successfully!`);
      }
      
      loadData(true); // Refresh global data
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
        <div className="max-w-xs">
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
            sectionKey="plyUsage"
            values={formData.plyUsage} 
            onChange={(shift, val) => handleShiftChange('plyUsage', shift, val)}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
          <ProductionRow 
            label="Cutting BIC (kg)" 
            sectionKey="bicUsage"
            values={formData.bicUsage} 
            onChange={(shift, val) => handleShiftChange('bicUsage', shift, val)}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
          <ProductionRow 
            label="Mixing Rubber (kg)" 
            sectionKey="mixingRubberUsage"
            values={formData.mixingRubberUsage} 
            onChange={(shift, val) => handleShiftChange('mixingRubberUsage', shift, val)}
            onSave={handleSaveSection}
            loading={loading}
            isFetching={isFetching}
            savingSection={savingSection}
          />
          <ProductionRow 
            label="Extrusion Rubber (kg)" 
            sectionKey="extrusionRubberUsage"
            values={formData.extrusionRubberUsage} 
            onChange={(shift, val) => handleShiftChange('extrusionRubberUsage', shift, val)}
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
