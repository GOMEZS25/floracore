import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const initialFormState = {
    name: '',
    reference: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const catRes = await getCategories();
      setCategorias(Array.isArray(catRes) ? catRes : []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.mensaje || 'Error al cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateCategory(currentId, formData);
      } else {
        await createCategory(formData);
      }
      
      handleCloseModal();
      await loadData();
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err.response?.data?.mensaje || 'Error al guardar la categoría');
      setLoading(false);
    }
  };

  const handleEdit = (categoria) => {
    setFormData({
      name: categoria.name,
      reference: categoria.reference
    });
    setCurrentId(categoria.category_id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      setLoading(true);
      try {
        await deleteCategory(id);
        await loadData();
      } catch (err) {
        console.error('Error deleting category:', err);
        setError(err.response?.data?.mensaje || 'Error al eliminar la categoría');
        setLoading(false);
      }
    }
  };

  const handleOpenModal = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
    setError(null);
  };

  if (loading && categorias.length === 0) return <div className="loading-spinner">Cargando categorías...</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="page-title">Manejo de Categorías</h2>
        <button className="btn btn-primary" onClick={handleOpenModal}>Nueva Categoría</button>
      </div>

      {error && !showModal && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Referencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length > 0 ? (
              categorias.map(cat => (
                <tr key={cat.category_id}>
                  <td>{cat.category_id}</td>
                  <td>{cat.name}</td>
                  <td>{cat.reference}</td>
                  <td>
                    <button className="btn btn-sm" style={{ marginRight: '5px' }} onClick={() => handleEdit(cat)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.category_id)}>Eliminar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-muted" style={{ textAlign: 'center' }}>No hay categorías registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2>{isEditing ? 'Editar Categoría' : 'Crear Categoría'}</h2>
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Referencia</label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={handleCloseModal} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '500px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
};

export default Categorias;
