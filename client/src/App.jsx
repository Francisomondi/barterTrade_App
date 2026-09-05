import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";

import Marketplace from "./pages/Marketplace";
import CreateListing from "./pages/CreateListing";
import ListingDetails from "./pages/ListingDetails";
import MyListings from "./pages/MyListings";

import MakeOffer from "./pages/MakeOffer";
import Offers from "./pages/Offers";
import Trades from "./pages/Trades";
import TradeDetails from "./pages/TradeDetails";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>

        <Navbar />

        <Routes>

          <Route
            path="/"
            element={
              <Navigate
                to="/marketplace"
                replace
              />
            }
          />

          <Route
            path="/marketplace"
            element={<Marketplace />}
          />

          <Route
            path="/listings/:id"
            element={<ListingDetails />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/auth/callback"
            element={<AuthCallback />}
          />

          <Route element={<ProtectedRoute />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/listings/create"
              element={<CreateListing />}
            />

            <Route
              path="/my-listings"
              element={<MyListings />}
            />

            <Route path="/make-offer/:id" element={<MakeOffer />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/trades/:id" element={<TradeDetails />} />
            

          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to="/marketplace"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;