import axiosInstance from './axiosInstance';

const clientService = {
  // CLientes principales
  getClients: async (params) => {
    return await axiosInstance.get('/clients', { params });
  },

  createClient: async (clientData) => {
    return await axiosInstance.post('/clients', clientData);
  },

  getClientById: async (clientId) => {
    return await axiosInstance.get(`/clients/${clientId}`);
  },

  updateClient: async (clientId, clientData) => {
    return await axiosInstance.put(`/clients/${clientId}`, clientData);
  },

  deleteClient: async (clientId) => {
    return await axiosInstance.delete(`/clients/${clientId}`);
  },

  // Direcciones
  addAddress: async (clientId, addressData) => {
    return await axiosInstance.post(`/clients/${clientId}/addresses`, addressData);
  },

  deleteAddress: async (addressId) => {
    return await axiosInstance.delete(`/clients/addresses/${addressId}`);
  },

  // Contactos
  addContact: async (clientId, contactData) => {
    return await axiosInstance.post(`/clients/${clientId}/contacts`, contactData);
  },

  deleteContact: async (contactId) => {
    return await axiosInstance.delete(`/clients/contacts/${contactId}`);
  }
};

export default clientService;
