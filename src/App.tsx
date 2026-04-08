import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/context/SessionContext";
import Index from "./views/Index";
import NotFound from "./views/NotFound";
import DiagnosticResults from "./views/DiagnosticResults";
import DiagnosticUnlock from "./views/DiagnosticUnlock";
import DoorsUrlDiagnostic from "./views/DoorsUrlDiagnostic";
import SharedReportPage from "./views/SharedReportPage";
import TeamTiersPage from "./views/TeamTiersPage";
import YourPackage from "./pages/YourPackage";
import AiIqReport from "./pages/AiIqReport";
import AiIqAssessmentPage from "./pages/AiIqAssessmentPage";
import Rung2AdaptationPage from "./pages/aiReadiness/Rung2AdaptationPage";
import Rung3OptimizationPage from "./pages/aiReadiness/Rung3OptimizationPage";
import Door5CalculatorPage from "./pages/Door5CalculatorPage";
import QuotePage from "./pages/QuotePage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import SelfDiscoveryPage from "./pages/SelfDiscoveryPage";
import DreamDoorPage from "./pages/DreamDoorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* URL diagnostic (Mirror / Door b1). Legacy /views/Diagnostic.tsx was AI IQ questions — wrong route; use /ai-iq. */}
              <Route path="/doors/url-diagnostic" element={<DoorsUrlDiagnostic />} />
              <Route path="/diagnostic" element={<DoorsUrlDiagnostic />} />
              <Route path="/report/:token" element={<SharedReportPage />} />
              <Route path="/diagnostic/results" element={<DiagnosticResults />} />
              <Route path="/diagnostic/unlock" element={<DiagnosticUnlock />} />
              <Route path="/team/tiers" element={<TeamTiersPage />} />
              <Route path="/your-package" element={<YourPackage />} />
              <Route path="/ai-iq" element={<AiIqAssessmentPage />} />
              <Route path="/ai-iq/report" element={<AiIqReport />} />
              <Route path="/ai-readiness" element={<Navigate to="/ai-readiness/rung-2" replace />} />
              <Route path="/ai-readiness/rung-2" element={<Rung2AdaptationPage />} />
              <Route path="/ai-readiness/rung-3" element={<Rung3OptimizationPage />} />
              <Route path="/calculator" element={<Door5CalculatorPage />} />
              <Route path="/self-discovery" element={<SelfDiscoveryPage />} />
              <Route path="/dream" element={<DreamDoorPage />} />
              <Route path="/door-7" element={<Navigate to="/dream" replace />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
