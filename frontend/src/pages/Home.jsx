import React from 'react';

const Home = () => {
    // Obtenemos los datos del usuario del localStorage, de forma opcional
    const user = JSON.parse(localStorage.getItem('user')) || {};

    return (
        <div>
            <h1 className="page-title">Bienvenido a FloraCore</h1>
            <p className="text-muted" style={{ fontSize: '1.125rem' }}>
                Panel de control principal del sistema ERP. Selecciona una opción en el menú superior para comenzar.
            </p>

            {user.nombre && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Hola, {user.nombre}</h3>
                    <p className="text-muted">Tu rol actual es: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{user.rol}</span></p>
                </div>
            )}
        </div>
    );
};

export default Home;
