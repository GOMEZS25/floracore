import React from 'react';

const Inventario = () => {
    return (
        <div>
            <h1 className="page-title">Inventario</h1>
            <p className="text-muted">
                Control y seguimiento de existencias en bodega.
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
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Próximamente podrás realizar seguimiento detallado del inventario.</p>
            </div>
        </div>
    );
};

export default Inventario;
