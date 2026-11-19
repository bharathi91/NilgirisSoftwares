import { lazy, Suspense } from "react";
import "@/App.css";
import "@/admin.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import { Toaster } from "@/components/ui/sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { PublicSite, PreviewSite } from "@/site/Pages";

const AdminApp = lazy(() => import("@/admin/AdminApp"));

function AuthPage({ children }) {
  return (
    <div className="admin-root min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 auth-side">
        <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-heading font-extrabold flex items-center justify-center">N</span><span className="font-heading">The Nilgiris Softwares</span></div>
        <div><p className="text-xs uppercase tracking-[0.2em] text-primary">Super Admin</p><h1 className="font-heading text-5xl mt-4 leading-tight">Run your entire website from one place.</h1>
          <p className="text-muted-foreground mt-4 max-w-md">Pages, themes, projects, leads and AI — draft, preview, publish and roll back without touching code.</p></div>
        <p className="text-sm text-muted-foreground">Made with ❤️ in the Queen of Hills, for the 🌍</p>
      </div>
      <div className="flex items-center justify-center p-4" data-testid="auth-page">{children}</div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkAuthProvider>
        <Suspense fallback={<div className="min-h-screen" style={{ background: "#080D12" }} />}>
          <Routes>
            <Route path="/admin/login/*" element={<AuthPage><SignIn routing="path" path="/admin/login" signUpUrl="/sign-up" withSignUp /></AuthPage>} />
            <Route path="/sign-in/*" element={<AuthPage><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></AuthPage>} />
            <Route path="/sign-up/*" element={<AuthPage><SignUp routing="path" path="/sign-up" signInUrl="/admin/login" /></AuthPage>} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/preview/*" element={<PreviewSite />} />
            <Route path="*" element={<PublicSite />} />
          </Routes>
        </Suspense>
      </ClerkAuthProvider>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
}

export default App;
