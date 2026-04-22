import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import AppLayout from './components/Layout/AppLayout';
import CategoriesPage from './pages/Products/Categories/CategoriesPage';
import AttributesPage from './pages/Settings/Attributes/AttributesPage';
import ProductsPage from './pages/Products/ProductsPage';
import UsersPage from './pages/Settings/Users/UsersPage';
import LocationsPage from './pages/Inventory/Locations/LocationsPage';
import LotsPage from './pages/Inventory/Lots/LotsPage';
import ClientsPage from './pages/Sales/Clients/ClientsPage';
import SalesOrdersPage from './pages/Sales/Orders/SalesOrdersPage';
import SalesOrderFormPage from './pages/Sales/Orders/SalesOrderFormPage';


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
          path="/inventory/locations"
          element={
            <AppLayout>
              <LocationsPage />
            </AppLayout>
          }
        />

        <Route
          path="/inventory/lots"
          element={
            <AppLayout>
              <LotsPage />
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
          path="/sales/clients"
          element={
            <AppLayout>
              <ClientsPage />
            </AppLayout>
          }
        />

        <Route
          path="/sales/orders"
          element={
            <AppLayout>
              <SalesOrdersPage />
            </AppLayout>
          }
        />

        <Route
          path="/sales/orders/new"
          element={
            <AppLayout>
              <SalesOrderFormPage />
            </AppLayout>
          }
        />

        <Route
          path="/sales/orders/:id"
          element={
            <AppLayout>
              <SalesOrderFormPage />
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

        <Route
          path="/settings/users"
          element={
            <AppLayout>
              <UsersPage />
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;