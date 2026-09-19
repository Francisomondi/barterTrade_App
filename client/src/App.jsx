import { BrowserRouter, Routes, Route, Navigate,} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import Marketplace from "./pages/Marketplace";
import CreateListing from "./pages/CreateListing";
import ListingDetails from "./pages/ListingDetails";
import MyListings from "./pages/MyListings";
import ManageListing from "./pages/ManageListing.jsx";

import MakeOffer from "./pages/MakeOffer";
import Offers from "./pages/Offers";
import Trades from "./pages/Trades";
import TradeDetails from "./pages/TradeDetails";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Profile from "./pages/Profile";

import Matches from "./pages/Matches";
import MatchDetails from "./pages/MatchDetails";
import Notifications from "./pages/Notifications";
import AdminDisputes from "./pages/AdminDisputes";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer
          position="top-center"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
        />

        <Navbar />

        <Routes>

          <Route path="/" element={<Navigate  to="/marketplace" replace />}/>
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/listings/:id" element={<ListingDetails />}/>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />}/>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />}/>
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/listings/create" element={<CreateListing />} />
            <Route path="/my-listings" element={<MyListings />}/>
            <Route path="/listings/:id/manage" element={<ManageListing /> }/>

            <Route path="/profile" element={<Profile />} />
            <Route path="/make-offer" element={<MakeOffer />} />
            <Route path="/make-offer/:id" element={<MakeOffer />} />
            
            <Route path="/offers" element={<Offers />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/trades/:id" element={<TradeDetails />} />

            <Route path="/matches" element={<Matches /> }/>
            <Route path="/matches/:id" element={<MatchDetails />} />
            <Route path="/notifications" element={<Notifications />}/>
            <Route path="/admin/disputes" element={ <AdminDisputes />}/>
            

          </Route>

          <Route path="*" element={<Navigate to="/marketplace" replace/> }/>

        </Routes>
        <Footer />  

      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;