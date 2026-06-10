import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";
import "./App.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Browse from "./pages/Browse";
import ProductDetail from "./pages/ProductDetail";
import SellProduct from "./pages/SellProduct";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Favorites from "./pages/Favorites";
import Alerts from "./pages/Alerts";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";

function RoleLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-10">
      <div className="rounded-2xl border border-green-100 bg-white px-6 py-5 text-center font-black text-slate-600 shadow-sm">
        Checking account access...
      </div>
    </main>
  );
}

function RoleAccessDenied({ message, actionTo = "/", actionLabel = "Go home" }) {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-[1.5rem] border border-red-200 bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-8">
        <h1 className="text-3xl font-black text-slate-950">
          Access Denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>

        <NavigateButton to={actionTo}>{actionLabel}</NavigateButton>
      </section>
    </main>
  );
}

function NavigateButton({ to, children }) {
  return (
    <Link
      to={to}
      className="mt-6 inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
    >
      {children}
    </Link>
  );
}

function AdminRoute({ children }) {
  const { currentUser, userRole, roleLoading, roleError } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roleLoading) return <RoleLoadingScreen />;

  if (roleError) {
    return (
      <RoleAccessDenied
        message={roleError}
        actionTo="/"
        actionLabel="Back to Sellify"
      />
    );
  }

  if (userRole !== "admin") {
    return (
      <RoleAccessDenied
        message="Only admin accounts can open the Sellify admin dashboard."
        actionTo="/"
        actionLabel="Back to Sellify"
      />
    );
  }

  return children;
}

function MarketplaceUserRoute({ children }) {
  const { currentUser, userRole, roleLoading, roleError } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roleLoading) return <RoleLoadingScreen />;

  if (roleError) {
    return (
      <RoleAccessDenied
        message={roleError}
        actionTo="/"
        actionLabel="Back to Sellify"
      />
    );
  }

  if (userRole !== "user") {
    return (
      <RoleAccessDenied
        message="Admin accounts are limited to admin functions and cannot use buyer or seller marketplace tools."
        actionTo="/admin"
        actionLabel="Go to Admin"
      />
    );
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-shell">
          <Navbar />

          <div className="app-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route
                path="/sell"
                element={
                  <MarketplaceUserRoute>
                    <SellProduct />
                  </MarketplaceUserRoute>
                }
              />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/dashboard"
                element={
                  <MarketplaceUserRoute>
                    <Dashboard />
                  </MarketplaceUserRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <MarketplaceUserRoute>
                    <Chat />
                  </MarketplaceUserRoute>
                }
              />
              <Route
                path="/chat/:chatId"
                element={
                  <MarketplaceUserRoute>
                    <Chat />
                  </MarketplaceUserRoute>
                }
              />

              <Route
                path="/favorites"
                element={
                  <MarketplaceUserRoute>
                    <Favorites />
                  </MarketplaceUserRoute>
                }
              />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
