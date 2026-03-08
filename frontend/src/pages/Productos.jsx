import React from 'react';

const Productos = () => {
    return (
        <div>
            <h1 className="page-title">Productos</h1>
            <p className="text-muted">
                Gestión de catálogo
            </p>

            <div style={{
                marginTop: '2rem',
                padding: '4rem 2rem',
                background: 'var(--card-bg)',
                borderRadius: '1rem',
                border: '1px dashed var(--border-color)',
                textAlign: 'center'
            }}>
                <h3 style={{ color: 'var(--text-muted)' }}>Módulo en Desarrollo</h3>
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Próximamente disponible.</p>
            </div>
        </div>
    );
};

export default Productos;
