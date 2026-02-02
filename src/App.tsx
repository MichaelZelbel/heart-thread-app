import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PartnerWizard from "./pages/PartnerWizard";
import PartnerDetail from "./pages/PartnerDetail";
import Archive from "./pages/Archive";
import Account from "./pages/Account";
import SelfProfile from "./pages/SelfProfile";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import EmailVerificationPending from "./pages/EmailVerificationPending";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiesPolicy from "./pages/CookiesPolicy";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";

// Blog Admin
import { BlogAdminLayout } from "./components/blog/BlogAdminLayout";
import BlogAdminDashboard from "./pages/blog/admin/BlogAdminDashboard";
import BlogAdminPosts from "./pages/blog/admin/BlogAdminPosts";
import BlogAdminCategories from "./pages/blog/admin/BlogAdminCategories";
import BlogAdminTags from "./pages/blog/admin/BlogAdminTags";
import BlogAdminMedia from "./pages/blog/admin/BlogAdminMedia";
import BlogPostEditor from "./pages/blog/admin/BlogPostEditor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/partner/new" element={<PartnerWizard />} />
              <Route path="/partner/:id" element={<PartnerDetail />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/account" element={<Account />} />
              <Route path="/account/profile" element={<SelfProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiesPolicy />} />
              
              {/* Blog Admin Routes */}
              <Route path="/blog/admin" element={<BlogAdminLayout />}>
                <Route index element={<BlogAdminDashboard />} />
                <Route path="posts" element={<BlogAdminPosts />} />
                <Route path="posts/new" element={<BlogPostEditor />} />
                <Route path="posts/:id" element={<BlogPostEditor />} />
                <Route path="categories" element={<BlogAdminCategories />} />
                <Route path="tags" element={<BlogAdminTags />} />
                <Route path="media" element={<BlogAdminMedia />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
