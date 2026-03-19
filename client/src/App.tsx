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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="import" element={<ImportProductsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="videos/new" element={<VideoEditorPage />} />
          <Route path="videos/edit/:id" element={<VideoEditorPage />} />
          <Route path="carousels" element={<CarouselsPage />} />
          <Route path="carousels/new" element={<CarouselEditorPage />} />
          <Route path="carousels/edit/:id" element={<CarouselEditorPage />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-muted-foreground">Página em construção.</p>
            </div>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
