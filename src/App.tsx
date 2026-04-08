import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Dashboard } from '@/src/components/Dashboard';
import { ProductionEntry } from '@/src/components/ProductionEntry';
import { ScrapEntry } from '@/src/components/ScrapEntry';
import { MainReport } from '@/src/components/MainReport';
import { Button } from '@/src/components/ui/button';
import { LayoutDashboard, FileText, PlusCircle, AlertCircle, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { SidebarProvider, useSidebar } from '@/src/lib/SidebarContext';

function AppContent() {
  const { controls, sidebarOpen, setSidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Tabs defaultValue="main" orientation="vertical" className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className={cn(
            "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20",
            sidebarOpen ? "w-72" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
          )}
        >
          <div className="p-4 border-b flex items-center justify-between overflow-hidden">
            <h1 className={cn("font-bold tracking-tight text-gray-900 whitespace-nowrap transition-opacity duration-200", sidebarOpen ? "opacity-100 text-xl" : "opacity-0 text-[0px]")}>
              MRI Tracker
            </h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0"
            >
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col scrollbar-hide">
            {sidebarOpen && (
              <div className="p-4 border-b">
                <h2 className="text-[10px] font-bold uppercase text-gray-400 mb-4">
                  Navigation
                </h2>
                <TabsList className="flex flex-col gap-3 p-0 items-center bg-transparent h-auto">
                  <TabsTrigger 
                    value="main" 
                    className="w-full flex items-center gap-3 rounded-lg transition-all justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary"
                  >
                    <FileText className="shrink-0 h-6 w-6" />
                    <span>Main Report</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="dashboard" 
                    className="w-full flex items-center gap-3 rounded-lg transition-all justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary"
                  >
                    <LayoutDashboard className="shrink-0 h-6 w-6" />
                    <span>Dashboard</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="production" 
                    className="w-full flex items-center gap-3 rounded-lg transition-all justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary"
                  >
                    <PlusCircle className="shrink-0 h-6 w-6" />
                    <span>Production</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="scrap" 
                    className="w-full flex items-center gap-3 rounded-lg transition-all justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary"
                  >
                    <AlertCircle className="shrink-0 h-6 w-6" />
                    <span>Scrap Entry</span>
                  </TabsTrigger>
                </TabsList>

                {controls && (
                  <div className="mt-8 pt-8 border-t">
                    <h2 className="text-[10px] font-bold uppercase text-gray-400 mb-4">
                      Controls
                    </h2>
                    <div className="space-y-6 flex flex-col">
                      {controls}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Mobile Toggle */}
          {!sidebarOpen && (
            <div className="md:hidden absolute top-4 left-4 z-30">
              <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="w-full">
              <TabsContent value="main" className="mt-0 outline-none">
                <MainReport />
              </TabsContent>

              <TabsContent value="dashboard" className="mt-0 outline-none">
                <Dashboard />
              </TabsContent>
              
              <TabsContent value="production" className="mt-0 outline-none">
                <ProductionEntry />
              </TabsContent>
              
              <TabsContent value="scrap" className="mt-0 outline-none">
                <ScrapEntry />
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default function App() {
  return (
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  );
}
