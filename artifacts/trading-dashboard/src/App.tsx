import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Component, type ReactNode, type ErrorInfo } from 'react';

import Dashboard from '@/pages/dashboard';
import PlaceOrder from '@/pages/place-order';
import Orders from '@/pages/orders';
import Logs from '@/pages/logs';
import Settings from '@/pages/settings';

const queryClient = new QueryClient();

// Derive base path: in dev Replit it's e.g. "/trading-dashboard", in prod it's ""
const rawBase = import.meta.env.BASE_URL ?? '/';
const routerBase = rawBase === '/' ? '' : rawBase.replace(/\/$/, '');

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-xl w-full border border-red-800 bg-red-950/20 p-6 font-mono text-sm space-y-4">
            <p className="text-red-400 font-bold">APP_CRASH</p>
            <p className="text-muted-foreground">{err.message}</p>
            <pre className="text-xs text-muted-foreground/60 whitespace-pre-wrap overflow-auto max-h-48">
              {err.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 border border-border text-xs hover:bg-muted/30"
            >
              RETRY
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/place-order" component={PlaceOrder} />
      <Route path="/orders" component={Orders} />
      <Route path="/logs" component={Logs} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={routerBase}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
