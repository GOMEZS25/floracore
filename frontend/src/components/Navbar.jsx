import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();

    // Función para cerrar sesión
    // Se encarga de limpiar el token JWT guardado
    // y redirigir al usuario de vuelta al login
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <NavLink to="/home" className="navbar-brand">
                FloraCore
            </NavLink>

            <div className="navbar-links">
                <NavLink
                    to="/home"
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                >
                    Home
                </NavLink>
                <NavLink
                    to="/usuarios"
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                >
                    Usuarios
                </NavLink>
                <NavLink
                    to="/productos"
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                >
                    Productos
                </NavLink>
                <NavLink
                    to="/inventario"
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                >
                    Inventario
                </NavLink>

                <button
                    onClick={handleLogout}
                    className="btn btn-danger btn-sm"
                    style={{ marginLeft: '1rem' }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
