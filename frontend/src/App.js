import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import AppLayout from './components/Layout/AppLayout';
import CategoriesPage from './pages/Products/Categories/CategoriesPage';
import AttributesPage from './pages/Settings/Attributes/AttributesPage';
import ProductsPage from './pages/Products/ProductsPage';





function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas envueltas en AppLayout */}
        <Route
          path="/home"
          element={
            <AppLayout>
              <Home />
            </AppLayout>
          }
        />


        <Route
          path="/products/categories"
          element={
            <AppLayout>
              <CategoriesPage />
            </AppLayout>
          }
        />

        <Route
          path="/products/list"
          element={
            <AppLayout>
              <ProductsPage />
            </AppLayout>
          }
        />

        <Route
          path="/settings/attributes"
          element={
            <AppLayout>
              <AttributesPage />
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;