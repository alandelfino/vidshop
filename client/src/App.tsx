import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DashboardHome from "./pages/DashboardHome";
import MediaPage from "./pages/MediaPage";
import ImportProductsPage from "./pages/ImportProductsPage";
import ProductsPage from "./pages/ProductsPage";
import VideosPage from "./pages/VideosPage";
import VideoEditorPage from "./pages/VideoEditorPage";
import CarouselsPage from "./pages/CarouselsPage";
import CarouselEditorPage from "./pages/CarouselEditorPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import StoresPage from "./pages/StoresPage";
import StoriesPage from "./pages/StoriesPage";
import StoryEditorPage from "./pages/StoryEditorPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
import BillingPage from "./pages/BillingPage";
import { StoreProvider } from "./context/StoreContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyEmailPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="import" element={<ImportProductsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="videos/new" element={<VideoEditorPage />} />
          <Route path="videos/edit/:id" element={<VideoEditorPage />} />
          <Route path="carousels" element={<CarouselsPage />} />
          <Route path="carousels/new" element={<CarouselEditorPage />} />
          <Route path="carousels/edit/:id" element={<CarouselEditorPage />} />
          <Route path="stories" element={<StoriesPage />} />
          <Route path="stories/new" element={<StoryEditorPage />} />
          <Route path="stories/edit/:id" element={<StoryEditorPage />} />
          <Route path="settings" element={<StoreSettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-muted-foreground">Página em construção.</p>
            </div>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
