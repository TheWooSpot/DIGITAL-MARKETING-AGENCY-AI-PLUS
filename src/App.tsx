import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./views/Index";
import NotFound from "./views/NotFound";
import Diagnostic from "./views/Diagnostic";
import DiagnosticResults from "./views/DiagnosticResults";
import DiagnosticUnlock from "./views/DiagnosticUnlock";
import DoorsUrlDiagnostic from "./views/DoorsUrlDiagnostic";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/doors/url-diagnostic" element={<DoorsUrlDiagnostic />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/diagnostic/results" element={<DiagnosticResults />} />
            <Route path="/diagnostic/unlock" element={<DiagnosticUnlock />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
