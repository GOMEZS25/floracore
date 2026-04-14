import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import AppLayout from './components/Layout/AppLayout';

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

        {/* Agrega aquí el resto de rutas protegidas con el mismo patrón:
            <Route path="/inventory/lots" element={<AppLayout><Lots /></AppLayout>} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;