import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    // Estados para manejar el formulario y peticiones
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Función que maneja el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validación de campos vacíos
        if (!email || !password) {
            setError('Por favor, ingresa correo y contraseña.');
            return;
        }

        setLoading(true);

        try {
            // Petición POST al endpoint de autenticación usando fetch
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // En caso de que la API devuelva un error (ej. credenciales inválidas)
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            // Si es exitoso, guardamos el token devuelto
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.usuario));

            // Redirigimos al Dashboard (Home)
            navigate('/home');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="text-center mb-4">
                    <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.75rem' }}>FloraCore</h2>
                    <p className="text-muted">Inicia sesión en tu cuenta</p>
                </div>

                {/* Mostramos errores visualmente si existen */}
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="ejemplo@floracore.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
