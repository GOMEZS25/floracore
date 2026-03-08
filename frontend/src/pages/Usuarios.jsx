import React, { useEffect, useState } from 'react';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Efecto secundario que se ejecuta al cargar el componente
    // Se encarga de llamar a la API para obtener los usuarios
    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const token = localStorage.getItem('token');

                // Petición GET a la API con token en la cabecera
                const response = await fetch('http://localhost:3001/api/users', {
                    method: 'GET',
                    headers: {
                        'authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Error al obtener usuarios');
                }

                // Si la data es un arreglo lo seteamos
                if (Array.isArray(data)) {
                    setUsuarios(data);
                } else if (data.usuarios && Array.isArray(data.usuarios)) {
                    // Ajuste por si el backend devuelve un objeto envolvente como { usuarios: [] }
                    setUsuarios(data.usuarios);
                } else {
                    // Fallback en caso de formato desconocido
                    setUsuarios([]);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsuarios();
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Gestión de Usuarios</h1>
                <button className="btn btn-primary" style={{ width: 'auto' }}>
                    Agregar Usuario
                </button>
            </div>

            <p className="text-muted mb-4">
                Consulta y administra todos los usuarios del sistema.
            </p>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading-spinner"></div>
            ) : usuarios.length === 0 && !error ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '1rem' }}>
                    <p className="text-muted">No se encontraron usuarios en el sistema.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Fecha Creación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((user) => (
                                <tr key={user.id || user._id}>
                                    <td style={{ fontWeight: 500 }}>{user.id || user._id}</td>
                                    <td>{user.nombre || user.name || '-'}</td>
                                    <td>{user.email || '-'}</td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                            {user.rol || user.role || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'}`}>
                                            {user.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-muted">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Usuarios;
