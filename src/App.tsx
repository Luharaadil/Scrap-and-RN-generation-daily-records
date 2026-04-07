import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Dashboard } from '@/src/components/Dashboard';
import { ProductionEntry } from '@/src/components/ProductionEntry';
import { ScrapEntry } from '@/src/components/ScrapEntry';
import { MainReport } from '@/src/components/MainReport';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">MRI Production Tracker</h1>
        </div>

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="main">Main</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="scrap">Scrap Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="main">
            <MainReport />
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          
          <TabsContent value="production">
            <ProductionEntry />
          </TabsContent>
          
          <TabsContent value="scrap">
            <ScrapEntry />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
