import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";

// SOLID Principle: Open/Closed - 지연 로딩으로 확장 가능한 구조
const Landing = lazy(() => import("@/pages/landing").then(module => ({ default: module.default })));
const Timer = lazy(() => import("@/pages/timer-fixed").then(module => ({ default: module.default })));
const Analysis = lazy(() => import("@/pages/analysis").then(module => ({ default: module.default })));
const History = lazy(() => import("@/pages/history").then(module => ({ default: module.default })));
const NotFound = lazy(() => import("@/pages/not-found").then(module => ({ default: module.default })));

// 로딩 상태 컴포넌트 (Single Responsibility)
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/timer" component={Timer} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/history" component={History} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
