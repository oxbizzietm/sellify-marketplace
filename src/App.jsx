import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
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
              <Route path="/sell" element={<SellProduct />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:chatId" element={<Chat />} />

              <Route path="/favorites" element={<Favorites />} />
              <Route path="/alerts" element={<Alerts />} />

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
