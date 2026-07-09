import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Component, useMemo, type ReactNode } from "react";
import { RootLayout } from "@/layouts/RootLayout";
import { RequireAuth } from "@/layouts/RequireAuth";
import { AdminLayout } from "@/layouts/AdminLayout";
import HomePage from "@/pages/Index";
import BoutiquePage from "@/pages/Boutique";
import ProductPage from "@/pages/Produit";
import AuthPage from "@/pages/Auth";
import ComptePage from "@/pages/Compte";
import AdminIndexPage from "@/pages/admin/Index";
import AdminProductsPage from "@/pages/admin/Products";
import AdminOrdersPage from "@/pages/admin/Orders";
import AdminCustomersPage from "@/pages/admin/Customers";
import AdminCreditsPage from "@/pages/admin/Credits";
import AdminEmployeesPage from "@/pages/admin/Employees";
import AdminExpensesPage from "@/pages/admin/Expenses";
import AdminActivityPage from "@/pages/admin/Activity";
import AdminTreasuryPage from "@/pages/admin/Treasury";
import AdminReportsPage from "@/pages/admin/Reports";
import AdminSettingsPage from "@/pages/admin/Settings";
import AdminTeamPage from "@/pages/admin/Team";
import AdminStockPage from "@/pages/admin/Stock";
import AdminSalesPage from "@/pages/admin/Sales";
import AdminRentPage from "@/pages/admin/Rent";
import AdminMessagesPage from "@/pages/admin/Messages";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 text-center">
            <h1 className="text-3xl font-bold">Oups, quelque chose s'est mal passé.</h1>
            <p className="mt-4 text-sm text-muted-foreground">Une erreur est survenue lors du rendu de l'application.</p>
            <pre className="mt-4 max-h-80 w-full overflow-auto rounded-lg bg-slate-950 p-4 text-left text-xs text-white/90">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRoutes() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/boutique" element={<BoutiquePage />} />
              <Route path="/produit/:slug" element={<ProductPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/compte" element={<ComptePage />} />

              <Route element={<RequireAuth />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminIndexPage />} />
                  <Route path="/admin/products" element={<AdminProductsPage />} />
                  <Route path="/admin/orders" element={<AdminOrdersPage />} />
                  <Route path="/admin/customers" element={<AdminCustomersPage />} />
                  <Route path="/admin/credits" element={<AdminCreditsPage />} />
                  <Route path="/admin/employees" element={<AdminEmployeesPage />} />
                  <Route path="/admin/expenses" element={<AdminExpensesPage />} />
                  <Route path="/admin/activity" element={<AdminActivityPage />} />
                  <Route path="/admin/treasury" element={<AdminTreasuryPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/team" element={<AdminTeamPage />} />
                  <Route path="/admin/stock" element={<AdminStockPage />} />
                  <Route path="/admin/sales" element={<AdminSalesPage />} />
                  <Route path="/admin/rent" element={<AdminRentPage />} />
                  <Route path="/admin/messages" element={<AdminMessagesPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default function App() {
  return <AppRoutes />;
}
