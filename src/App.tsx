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
            sidebarOpen ? "w-72" : "w-0 -translate-x-full md:w-28 md:translate-x-0"
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
            <div className="p-4 border-b">
              <h2 className={cn("text-[10px] font-bold uppercase text-gray-400 mb-4 transition-all duration-200", !sidebarOpen && "text-center")}>
                {sidebarOpen ? "Navigation" : "Nav"}
              </h2>
              <TabsList className={cn(
                "flex flex-col gap-3 p-0 items-center bg-transparent h-auto",
                !sidebarOpen && "items-center"
              )}>
                <TabsTrigger 
                  value="main" 
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg transition-all",
                    sidebarOpen 
                      ? "justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary" 
                      : "justify-center p-0 size-20 flex-col gap-1 text-[10px] uppercase font-bold"
                  )}
                >
                  <FileText className={cn("shrink-0", sidebarOpen ? "h-6 w-6" : "h-6 w-6")} />
                  <span className={cn("transition-all duration-200", sidebarOpen ? "" : "text-[8px] leading-none")}>
                    {sidebarOpen ? "Main Report" : "Report"}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="dashboard" 
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg transition-all",
                    sidebarOpen 
                      ? "justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary" 
                      : "justify-center p-0 size-20 flex-col gap-1 text-[10px] uppercase font-bold"
                  )}
                >
                  <LayoutDashboard className={cn("shrink-0", sidebarOpen ? "h-6 w-6" : "h-6 w-6")} />
                  <span className={cn("transition-all duration-200", sidebarOpen ? "" : "text-[8px] leading-none")}>
                    {sidebarOpen ? "Dashboard" : "Dash"}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="production" 
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg transition-all",
                    sidebarOpen 
                      ? "justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary" 
                      : "justify-center p-0 size-20 flex-col gap-1 text-[10px] uppercase font-bold"
                  )}
                >
                  <PlusCircle className={cn("shrink-0", sidebarOpen ? "h-6 w-6" : "h-6 w-6")} />
                  <span className={cn("transition-all duration-200", sidebarOpen ? "" : "text-[8px] leading-none")}>
                    {sidebarOpen ? "Production" : "Prod"}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="scrap" 
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg transition-all",
                    sidebarOpen 
                      ? "justify-start p-4 h-20 text-lg font-bold border-2 border-transparent data-[state=active]:border-primary" 
                      : "justify-center p-0 size-20 flex-col gap-1 text-[10px] uppercase font-bold"
                  )}
                >
                  <AlertCircle className={cn("shrink-0", sidebarOpen ? "h-6 w-6" : "h-6 w-6")} />
                  <span className={cn("transition-all duration-200", sidebarOpen ? "" : "text-[8px] leading-none")}>
                    {sidebarOpen ? "Scrap Entry" : "Scrap"}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {controls && (
              <div className="p-4 mt-auto border-t bg-gray-50/50 sticky bottom-0">
                <h2 className={cn("text-[10px] font-bold uppercase text-gray-400 mb-4 transition-all duration-200", !sidebarOpen && "text-center")}>
                  {sidebarOpen ? "Controls" : "Ctrl"}
                </h2>
                <div className={cn("space-y-6 flex flex-col", !sidebarOpen && "items-center")}>
                  {controls}
                </div>
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
