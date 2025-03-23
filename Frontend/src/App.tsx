import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { GardenProvider } from "@/context/GardenContext"; // Import the GardenProvider
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Recommendations from "./pages/Recommendations";
import NurseryFinder from "./pages/NurseryFinder";
import CropLibrary from "./pages/CropLibrary";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import UserCrops from "./pages/UserCrops"; // Import the new UserCrops component

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GardenProvider> {/* Wrap the app with GardenProvider */}
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/nursery-finder" element={<NurseryFinder />} />
              <Route path="/crop-library" element={<CropLibrary />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/user-crops" element={<UserCrops />} />
              <Route path="/my-garden" element={<UserCrops />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GardenProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;