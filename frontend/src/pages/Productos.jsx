import React, { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import Categorias from './Categorias';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [activeTab, setActiveTab] = useState('productos');

  const initialFormState = {
    name: '',
    sku: '',
    unit_of_measure: 'tallo',
    category: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProductos(Array.isArray(prodRes) ? prodRes : []);
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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSend = {
        name: formData.name,
        sku: formData.sku,
        unit_of_measure: formData.unit_of_measure,
        category: formData.category
      };

      if (isEditing) {
        await updateProduct(currentId, dataToSend);
      } else {
        await createProduct(dataToSend);
      }

      handleCloseModal();
      await loadData();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.mensaje || 'Error al guardar el producto');
      setLoading(false);
    }
  };

  const handleEdit = (producto) => {
    setFormData({
      name: producto.name,
      sku: producto.sku,
      unit_of_measure: producto.unit_of_measure,
      category: producto.category?.category_id || ''
    });
    setCurrentId(producto.product_id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      setLoading(true);
      try {
        await deleteProduct(id);
        await loadData();
      } catch (err) {
        console.error('Error deleting product:', err);
        setError(err.response?.data?.mensaje || 'Error al eliminar el producto');
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

  if (loading && productos.length === 0) return <div className="loading-spinner">Cargando productos...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeTab === 'productos' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Productos
        </button>
        <button 
          className={`btn ${activeTab === 'categorias' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('categorias')}
        >
          Categorías
        </button>
      </div>

      {activeTab === 'categorias' ? (
        <Categorias />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="page-title">Productos</h1>
            <button className="btn btn-primary" onClick={handleOpenModal}>Nuevo Producto</button>
          </div>

          {error && !showModal && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Unidad de Medida</th>
              <th>Categoría</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length > 0 ? (
              productos.map(producto => (
                <tr key={producto.product_id}>
                  <td>{producto.product_id}</td>
                  <td>{producto.name}</td>
                  <td>{producto.sku}</td>
                  <td>{producto.unit_of_measure}</td>
                  <td>{producto.category?.name || '---'}</td>
                  <td>
                    <button className="btn btn-sm" style={{ marginRight: '5px' }} onClick={() => handleEdit(producto)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(producto.product_id)}>Eliminar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-muted" style={{ textAlign: 'center' }}>No hay productos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2>{isEditing ? 'Editar Producto' : 'Crear Producto'}</h2>
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
                <label className="form-label">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unidad de Medida</label>
                <select
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  <option value="tallo">Tallo</option>
                  <option value="ramo">Ramo</option>
                  <option value="caja">Caja</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  <option value="">Seleccione una categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name} ({cat.reference})
                    </option>
                  ))}
                </select>
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
      )}
    </div>
  );
};

// Estilos en linea básicos para el modal ya que no se especificaron clases CSS para el overlay
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

export default Productos;
