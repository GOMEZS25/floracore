import React, { useState, useEffect, useRef } from 'react';
import {
  Form, Select, DatePicker, Input, InputNumber, Button,
  Table, Typography, Row, Col, Card, Spin, notification, Popconfirm,
  Space, Tag, Modal, Radio, Alert, Divider, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
  CheckCircleOutlined, CarOutlined, CloseCircleOutlined,
  EyeOutlined, AppstoreOutlined, InboxOutlined, LinkOutlined,
  MinusCircleOutlined, EditOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import salesService from '../../../services/salesService';
import clientService from '../../../services/clientService';
import lotService from '../../../services/lotService';
import * as productService from '../../../services/productService';
import './SalesOrderForm.css';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

const STATUS_TAG = {
  BORRADOR: { color: 'warning', text: 'BORRADOR' },
  APROBADA: { color: 'processing', text: 'APROBADA' },
  DESPACHADA: { color: 'success', text: 'DESPACHADA' },
  CANCELADA: { color: 'error', text: 'CANCELADA' }
};

const buildLotLabel = (lote) => {
  const productName = lote.product?.name || '';
  const attrStr = lote.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
  const fullName = `${productName} ${attrStr}`.trim();
  const disp = lote.cantidad_disponible;
  const unidad = lote.unidad_medida?.toLowerCase() || 'tallos';
  return { fullName, disp, unidad, label: `${fullName} - ${lote.numero_lote}` };
};

const getCurrencySymbol = (currency) => {
  if (currency === 'USD') return 'USD';
  if (currency === 'EUR') return '€';
  return '$';
};

const getAssignmentSummary = (detail) => {
  const total = Number(detail.total_stems) || 0;
  const assigned = (detail.assignments || []).reduce((s, a) => s + Number(a.quantity), 0);
  return { total, assigned, pending: total - assigned };
};

const SalesOrderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [headerForm] = Form.useForm();
  const [lineForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(id || null);
  const [orderData, setOrderData] = useState(null);
  const [clientCurrency, setClientCurrency] = useState('COP');

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningDetail, setAssigningDetail] = useState(null);
  const [assignRows, setAssignRows] = useState([{ lote_id: null, quantity: 0 }]);
  const [assignLoading, setAssignLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);

  const [clients, setClients] = useState([]);
  const [clientAddresses, setClientAddresses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [allLots, setAllLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [addMode, setAddMode] = useState('LOTE');

  const autoSaved = useRef(!!id);
  const headerUpdateTimer = useRef(null);

  useEffect(() => {
    fetchInitialData();
    if (id) fetchOrder(id);
    else lineForm.setFieldsValue({ packaging_type: 'TALLO', billing_unit: 'TALLO', quantity: 0, unit_price: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    lineForm.resetFields();
    lineForm.setFieldsValue({ packaging_type: 'TALLO', billing_unit: 'TALLO', quantity: 0, unit_price: 0 });
    setFilteredLots([]);
  }, [addMode, lineForm]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [clientsRes, lotsRes, catRes, prodRes] = await Promise.all([
        clientService.getClients({ is_active: 'true' }).catch(() => ({ data: [] })),
        lotService.getLots({ estado: 'DISPONIBLE' }).catch(() => ({ data: [] })),
        salesService.getTransactionCategories().catch(() => ({ data: [] })),
        productService.getProducts({ is_active: 'true' }).catch(() => [])
      ]);
      setClients(clientsRes?.data?.data || clientsRes?.data || []);
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);

      const lots = lotsRes?.data?.data || lotsRes?.data || lotsRes || [];

      setCategories(catRes?.data?.data || catRes?.data || catRes || []);
      setAllProducts(prodRes?.data?.data || prodRes?.data || prodRes || []);
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los datos auxiliares.' });
    } finally {
      if (!id) setLoading(false);
    }
  };

  const fetchOrder = async (oid) => {
    setLoading(true);
    try {
      const res = await salesService.obtenerOrden(oid);
      const data = res?.data?.data || res?.data || res;
      setOrderData(data);
      setOrderId(data.order_id || data.id || data.sales_order_id);

      headerForm.setFieldsValue({
        client_id: data.client_id,
        delivery_date: data.delivery_date ? dayjs(data.delivery_date) : null,
        transaction_category_id: data.transaction_category_id,
        notes: data.notes,
      });

      const clientRes = await clientService.getClientById(data.client_id);
      const clientInfo = clientRes?.data?.data || clientRes?.data || clientRes;
      if (clientInfo) {
        if (clientInfo.addresses) {
          setClientAddresses(clientInfo.addresses.filter(a => a.is_active !== false));
        }
        setClientCurrency(clientInfo.currency || 'COP');
      }
      headerForm.setFieldsValue({ client_address_id: data.client_address_id });
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudo cargar la orden.' });
      navigate('/sales/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId) => {
    headerForm.setFieldsValue({ client_address_id: undefined });
    setClientAddresses([]);
    if (!clientId) return;
    try {
      const res = await clientService.getClientById(clientId);
      const clientInfo = res?.data?.data || res?.data || res;
      if (clientInfo) {
        setClientCurrency(clientInfo.currency || 'COP');
        if (clientInfo.addresses) {
          const addrs = clientInfo.addresses.filter(a => a.is_active !== false);
          setClientAddresses(addrs);
          if (addrs.length > 0) {
            headerForm.setFieldsValue({ client_address_id: addrs[0].address_id });
          }
        }
      }
    } catch (error) {
      notification.error({ message: 'Error', description: 'Error al cargar direcciones.' });
    }
  };

  const isReadOnly = orderData?.status === 'DESPACHADA' || orderData?.status === 'CANCELADA';

  const headerVals = Form.useWatch([], headerForm) || {};

  useEffect(() => {
    if (orderId) {
      if (isReadOnly || !orderData) return;
      if (headerUpdateTimer.current) clearTimeout(headerUpdateTimer.current);
      headerUpdateTimer.current = setTimeout(() => {
        if (headerVals.client_id && headerVals.client_address_id && headerVals.delivery_date) {
          const payload = {
            client_id: headerVals.client_id,
            client_address_id: headerVals.client_address_id,
            delivery_date: headerVals.delivery_date.format('YYYY-MM-DD'),
            transaction_category_id: headerVals.transaction_category_id || null,
            notes: headerVals.notes
          };
          salesService.actualizarHeader(orderId, payload).catch(() => { });
        }
      }, 800);
      return () => clearTimeout(headerUpdateTimer.current);
    } else {
      if (autoSaved.current) return;
      if (headerVals.client_id && headerVals.client_address_id && headerVals.delivery_date) {
        autoSaved.current = true;
        const payload = {
          ...headerVals,
          delivery_date: headerVals.delivery_date.format('YYYY-MM-DD')
        };
        salesService.autoGuardarOrden(payload)
          .then(res => {
            const newId = res?.data?.data?.order_id || res?.data?.data?.id || res?.data?.data?.sales_order_id || res?.data?.sales_order_id || res?.data?.order_id;
            setOrderId(newId);
            setOrderData(res?.data || res?.data?.data);
            notification.success({ message: 'Borrador auto-guardado' });
            navigate(`/sales/orders/${newId}`, { replace: true });
          })
          .catch(() => { autoSaved.current = false; });
      }
    }
  }, [headerVals.client_id, headerVals.client_address_id, headerVals.delivery_date, headerVals.transaction_category_id, headerVals.notes, orderId, isReadOnly, orderData, navigate]);

  const handleLotSearch = (val) => {
    if (!val || val.length < 2) { setFilteredLots([]); return; }
    const txt = val.toLowerCase();
    setFilteredLots(allLots.filter(l => buildLotLabel(l).label.toLowerCase().includes(txt)));
  };

  const lineVals = Form.useWatch([], lineForm) || {};

  const getSelectedLot = () => {
    if (!lineVals.lote_id) return null;
    return allLots.find(l => String(l.lote_id) === String(lineVals.lote_id) || String(l.id) === String(lineVals.lote_id));
  };
  const selectedLot = getSelectedLot();

  const handleLotChange = (val) => {
    const lot = allLots.find(l => String(l.lote_id) === String(val) || String(l.id) === String(val));
    lineForm.setFieldsValue({ producto: lot ? buildLotLabel(lot).fullName : '' });
  };

  const handlePackagingChange = (val) => {
    lineForm.setFieldsValue({
      quantity: 0, cantidad_ramos: 0, cantidad_cajas: 0, tallos_por_ramo: 0, ramos_por_caja: 0,
      billing_unit: val === 'CAJA' ? 'CAJA' : val === 'RAMO' ? 'RAMO' : 'TALLO'
    });
  };

  const calcStems = () => {
    const pt = lineVals.packaging_type;
    if (pt === 'TALLO') return lineVals.quantity || 0;
    if (pt === 'RAMO') return (lineVals.cantidad_ramos || 0) * (lineVals.tallos_por_ramo || 0);
    if (pt === 'CAJA') return (lineVals.cantidad_cajas || 0) * (lineVals.ramos_por_caja || 0) * (lineVals.tallos_por_ramo || 0);
    return 0;
  };
  const totalStemsCalc = calcStems();

  const calcSubtotal = () => {
    const price = lineVals.unit_price || 0;
    const bu = lineVals.billing_unit;
    const pt = lineVals.packaging_type;
    if (bu === 'TALLO') return totalStemsCalc * price;
    if (bu === 'RAMO') {
      const tBunches = pt === 'RAMO' ? lineVals.cantidad_ramos : pt === 'CAJA' ? ((lineVals.cantidad_cajas || 0) * (lineVals.ramos_por_caja || 0)) : 0;
      return tBunches * price;
    }
    if (bu === 'CAJA') return (pt === 'CAJA' ? lineVals.cantidad_cajas : 0) * price;
    return 0;
  };
  const subtotalCalc = calcSubtotal();

  const billingOptions = () => {
    const pt = lineVals.packaging_type;
    if (pt === 'TALLO') return [{ label: 'TALLO', value: 'TALLO' }];
    if (pt === 'RAMO') return [{ label: 'TALLO', value: 'TALLO' }, { label: 'RAMO', value: 'RAMO' }];
    if (pt === 'CAJA') return [{ label: 'TALLO', value: 'TALLO' }, { label: 'RAMO', value: 'RAMO' }, { label: 'CAJA', value: 'CAJA' }];
    return [];
  };

  const priceLabel = () => {
    const bu = lineVals.billing_unit;
    if (bu === 'RAMO') return 'Precio por ramo';
    if (bu === 'CAJA') return 'Precio por caja';
    return 'Precio por tallo';
  };

  const handleAddLineSubmit = async (values) => {
    if (addMode === 'LOTE') {
      if (!selectedLot) { notification.error({ message: 'Selecciona un lote' }); return; }
      if (totalStemsCalc > Number(selectedLot.cantidad_disponible)) {
        notification.error({ message: 'Inventario insuficiente', description: `Necesitas ${totalStemsCalc} tallos, disponibles ${selectedLot.cantidad_disponible} tallos.` });
        return;
      }
    }
    if (!values.product_variant_key && addMode === 'PRODUCTO') { notification.error({ message: 'Selecciona un producto' }); return; }

    let product_id = null;
    let variant_id = null;
    if (addMode === 'LOTE') {
      product_id = selectedLot?.product_id;
    } else {
      const parts = String(values.product_variant_key).split('_');
      product_id = parts[0];
      if (parts[1] && parts[1] !== 'base') variant_id = parts[1];
    }

    const payload = {
      lote_id: addMode === 'LOTE' ? (selectedLot?.lote_id || selectedLot?.id) : null,
      product_id: product_id,
      variant_id: variant_id,
      packaging_type: values.packaging_type,
      quantity: values.packaging_type === 'TALLO' ? values.cantidad_tallos : values.packaging_type === 'RAMO' ? values.cantidad_ramos : values.cantidad_cajas,
      tallos_por_ramo: values.packaging_type !== 'TALLO' ? values.tallos_por_ramo : undefined,
      ramos_por_caja: values.packaging_type === 'CAJA' ? values.ramos_por_caja : undefined,
      unit_price: values.unit_price,
      billing_unit: values.billing_unit,
      notes: values.notes
    };

    setLoading(true);
    try {
      await salesService.agregarLinea(orderId, payload);
      notification.success({ message: 'Línea agregada.' });
      lineForm.resetFields();
      lineForm.setFieldsValue({ packaging_type: 'TALLO', billing_unit: 'TALLO', quantity: 0, unit_price: 0 });
      setFilteredLots([]);
      fetchOrder(orderId);
      const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'Error al agregar línea.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (detailId) => {
    setLoading(true);
    try {
      await salesService.eliminarLinea(detailId);
      notification.success({ message: 'Línea eliminada.' });
      fetchOrder(orderId);
      const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
    } catch (error) {
      notification.error({ message: 'Error al eliminar', description: error.response?.data?.mensaje || 'No se pudo eliminar la línea.' });
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await salesService.aprobarOrden(orderId);
      notification.success({ message: 'Orden aprobada con éxito' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({ message: 'Error al aprobar', description: error.response?.data?.mensaje || 'No se pudo aprobar la orden.' });
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    try {
      setLoading(true);
      await salesService.despacharOrden(orderId);
      notification.success({ message: 'Orden despachada con éxito' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({ message: 'Error al despachar', description: error.response?.data?.mensaje || 'No se pudo despachar la orden.' });
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      await salesService.cancelarOrden(orderId);
      notification.success({ message: 'Orden cancelada' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({ message: 'Error al cancelar', description: error.response?.data?.mensaje || 'No se pudo cancelar la orden.' });
      setLoading(false);
    }
  };

  const openAssignModal = (detail) => {
    setAssigningDetail(detail);
    setAssignRows([{ lote_id: null, quantity: 0 }]);
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningDetail(null);
    setAssignRows([{ lote_id: null, quantity: 0 }]);
  };

  const openEditLineModal = (detail) => {
    setEditingDetail(detail);
    editForm.setFieldsValue({
      packaging_type: detail.packaging_type,
      billing_unit: detail.billing_unit || detail.packaging_type,
      unit_price: Number(detail.unit_price),
      quantity: detail.quantity,
      tallos_por_ramo: detail.stems_per_bunch,
      ramos_por_caja: detail.bunches_per_box,
      cantidad_ramos: detail.packaging_type === 'RAMO' ? detail.quantity : undefined,
      cantidad_cajas: detail.packaging_type === 'CAJA' ? detail.quantity : undefined,
    });
    setEditModalOpen(true);
  };

  const handleEditLineSubmit = async (values) => {
    const pt = values.packaging_type;
    const quantity = pt === 'TALLO' ? values.quantity : pt === 'RAMO' ? values.cantidad_ramos : values.cantidad_cajas;

    const payload = {
      packaging_type: pt,
      quantity,
      tallos_por_ramo: pt !== 'TALLO' ? values.tallos_por_ramo : undefined,
      ramos_por_caja: pt === 'CAJA' ? values.ramos_por_caja : undefined,
      unit_price: values.unit_price,
      billing_unit: values.billing_unit,
    };

    setLoading(true);
    try {
      await salesService.actualizarLinea(editingDetail.detail_id, payload);
      notification.success({ message: 'Línea actualizada.' });
      setEditModalOpen(false);
      fetchOrder(orderId);
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'Error al actualizar línea.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assigningDetail) return;
    const validRows = assignRows.filter(r => r.lote_id && Number(r.quantity) > 0);
    if (validRows.length === 0) { notification.error({ message: 'Agrega al menos una asignación válida' }); return; }

    setAssignLoading(true);
    try {
      await salesService.asignarInventario(assigningDetail.detail_id, validRows);
      notification.success({ message: 'Inventario asignado exitosamente' });
      closeAssignModal();
      fetchOrder(orderId);
      const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
    } catch (error) {
      notification.error({ message: 'Error al asignar', description: error.response?.data?.mensaje || 'No se pudo asignar el inventario.' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleReleaseAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      await salesService.liberarAsignacion(assignmentId);
      notification.success({ message: 'Asignación liberada' });
      fetchOrder(orderId);
      const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'No se pudo liberar la asignación.' });
      setLoading(false);
    }
  };

  const updateAssignRow = (idx, field, value) => {
    setAssignRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const orderLines = orderData?.details || [];
  const status = orderData?.status;
  const isDraft = status === 'BORRADOR';
  const isApproved = status === 'APROBADA';

  const handleEnterToNext = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {

      if (document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')) return;

      e.preventDefault();
      const container = document.querySelector('.add-line-form');
      if (container) {
        // Find all focusable inputs/buttons in the form
        const focusable = Array.from(container.querySelectorAll('input:not([disabled]), textarea:not([disabled]), button:not([disabled])'));
        const index = focusable.indexOf(e.target);
        if (index > -1 && index < focusable.length - 1) {
          focusable[index + 1].focus();
        } else if (index === focusable.length - 1) {
          lineForm.submit();
        }
      }
    }
  };

  const lotColumns = [
    { title: 'Lote', dataIndex: 'numero_lote' },
    { title: 'Producto', key: 'prod', render: (_, l) => buildLotLabel(l).fullName },
    { title: 'Disponibilidad', dataIndex: 'cantidad_disponible' },
    {
      title: 'Seleccionar', key: 'sel', render: (_, lote) => (
        <Button size="small" type="primary" style={{ backgroundColor: '#1a3c2e' }}
          onClick={() => {
            setFilteredLots([lote]);  // ← primero actualizar las opciones
            setTimeout(() => {        // ← luego setear el valor
              lineForm.setFieldsValue({ lote_id: lote.lote_id || lote.id });
              handleLotChange(lote.lote_id || lote.id);
            }, 0);
            setInventoryModalOpen(false);
          }}>Seleccionar</Button>
      )
    }
  ];

  const detailColumns = [
    {
      title: '#',
      dataIndex: 'line_number',
      width: 40,
      render: (val, _, idx) => val || idx + 1
    },
    {
      title: 'Producto',
      key: 'producto',
      width: 220,
      render: (_, r) => {
        const n = r.product?.name || '';
        const a = (r.lote?.variant || r.variant)
            ?.attributes?.map(x => x.value?.value).join(' ') || '';
        return <Text strong>{`${n} ${a}`.trim()}</Text>;
      }
    },
    {
      title: 'Empaque',
      dataIndex: 'packaging_type',
      width: 80,
      render: (val) => {
        const labels = { TALLO: 'Tallo', RAMO: 'Ramo', CAJA: 'Caja' };
        return <Tag>{labels[val] || val}</Tag>;
      }
    },
    {
      title: 'Total',
      key: 'total',
      width: 70,
      render: (_, r) => <Text>{r.quantity}</Text>
    },
    {
      title: 'Reservado',
      key: 'reservado',
      width: 70,
      render: (_, r) => {
        const { assigned } = getAssignmentSummary(r);
        return <Text>{assigned}</Text>;
      }
    },
    {
      title: 'Lotes Asignados',
      key: 'lotes_asignados',
      width: 200,
      render: (_, r) => {
        if (!r.assignments || r.assignments.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Sin asignación</Text>;
        }
        return (
          <Space direction="vertical" size={2}>
            {r.assignments.map(asgn => (
              <Space key={asgn.assignment_id} size={4}>
                <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                  {asgn.lote?.numero_lote || asgn.lote_id}
                </Tag>
                <Text style={{ fontSize: 11 }}>{asgn.quantity} Tallos</Text>
                {isDraft && (
                  <Tooltip title="Liberar asignación">
                    <MinusCircleOutlined
                      style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 12 }}
                      onClick={() => handleReleaseAssignment(asgn.assignment_id)}
                    />
                  </Tooltip>
                )}
              </Space>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Precio unit.',
      key: 'up',
      width: 140,
      render: (_, r) => `${getCurrencySymbol(clientCurrency)} ${new Intl.NumberFormat('es-CO').format(Number(r.unit_price) || 0)} / ${(r.billing_unit || r.packaging_type || 'TALLO').toLowerCase()}`
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      width: 130,
      render: (v) => <Text strong>{getCurrencySymbol(clientCurrency)} {new Intl.NumberFormat('es-CO').format(Number(v) || 0)}</Text>
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_, r) => {
        if (isReadOnly) return null;
        const { assigned, total } = getAssignmentSummary(r);
        const canAssignMore = assigned < total;
        return (
          <Space>
            {(isDraft || isApproved) && (
              <Tooltip title="Editar línea">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  style={{ borderColor: '#8c8c8c', color: '#8c8c8c' }}
                  onClick={() => openEditLineModal(r)}
                />
              </Tooltip>
            )}
            {isDraft && canAssignMore && (
              <Tooltip title="Asignar inventario">
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  style={{ borderColor: '#1a3c2e', color: '#1a3c2e' }}
                  onClick={() => openAssignModal(r)}
                />
              </Tooltip>
            )}
            {isDraft && (
              <Popconfirm title="¿Eliminar línea?" onConfirm={() => handleDeleteLine(r.detail_id || r.id)}>
                <Button danger type="text" icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  const totalAmount = orderLines.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
  const totalTallos = orderLines.reduce((acc, l) => acc + (Number(l.total_stems) || 0), 0);
  const totalAsignados = orderLines.reduce((acc, l) => acc + getAssignmentSummary(l).assigned, 0);

  const assignModalLots = assigningDetail ? allLots.filter(l => Number(l.cantidad_disponible) > 0) : [];

  const { total: assignTotal, assigned: assignAlready, pending: assignPending } =
    assigningDetail ? getAssignmentSummary(assigningDetail) : { total: 0, assigned: 0, pending: 0 };

  const newAssignmentSum = assignRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px' }}>

        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space size="middle">
              <Button type="default" icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/orders')}>Volver</Button>
              <Button type="primary" style={{ backgroundColor: '#1a3c2e' }} icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')}>Nueva Orden</Button>
              <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
                {orderData ? `Orden #${orderData.order_number}` : 'Nueva Orden'}
              </Title>
              {status && STATUS_TAG[status] && (
                <Tag color={STATUS_TAG[status].color} style={{ fontSize: 14, padding: '4px 8px' }}>
                  {STATUS_TAG[status].text}
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            {orderId && (
              <Space>
                {status === 'BORRADOR' && orderLines.length > 0 && (
                  <Button icon={<CheckCircleOutlined />} type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={handleApprove}>Aprobar</Button>
                )}
                {status === 'APROBADA' && (
                  <Button icon={<CarOutlined />} type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={handleDispatch}>Despachar</Button>
                )}
                {(status === 'BORRADOR' || status === 'APROBADA') && (
                  <Popconfirm title="¿Cancelar orden?" onConfirm={handleCancel} okText="Sí" cancelText="No">
                    <Button icon={<CloseCircleOutlined />} danger type="default">Cancelar</Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </Col>
        </Row>

        <Card title="Datos Generales" style={{ marginBottom: 24, borderRadius: 8, overflow: 'hidden' }} headStyle={{ backgroundColor: '#f5f5f5' }}>
          <Form form={headerForm} layout="vertical" disabled={isReadOnly}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="client_id" label="Cliente" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Buscar cliente" onChange={handleClientChange} filterOption={(i, o) => o.children.toLowerCase().includes(i.toLowerCase())}>
                    {clients.map(c => <Option key={c.client_id} value={c.client_id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="client_address_id" label="Dirección de Entrega" rules={[{ required: true }]}>
                  <Select placeholder="Seleccionar Dirección">
                    {clientAddresses.map(a => <Option key={a.address_id} value={a.address_id}>{a.address_line} ({a.city})</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="delivery_date" label="Fecha de Entrega" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="transaction_category_id" label="Categoría (Opcional)">
                  <Select placeholder="Seleccionar" allowClear>
                    {categories.map(cat => <Option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>{cat.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="notes" label="Notas">
                  <TextArea rows={1} placeholder="Opcional..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>


        {orderId && isDraft && (
          <Card
            title={
              <Space>
                <span>Agregar Productos</span>
                <Radio.Group value={addMode} onChange={e => setAddMode(e.target.value)} size="small" buttonStyle="solid" style={{ marginLeft: 8 }}>
                  <Radio.Button value="LOTE"><Space size={4}><InboxOutlined /> Por Lote</Space></Radio.Button>
                  <Radio.Button value="PRODUCTO"><Space size={4}><AppstoreOutlined /> Por Producto</Space></Radio.Button>
                </Radio.Group>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8, borderColor: '#d9d9d9' }}
            headStyle={{ backgroundColor: '#f0f5f3', color: '#1a3c2e' }}
            extra={<Button icon={<EyeOutlined />} onClick={() => setInventoryModalOpen(true)}>Ver Inventario</Button>}
          >
            {addMode === 'PRODUCTO' && (
              <Alert
                type="info"
                showIcon
                message="Modo Producto: El inventario no se afecta al agregar la línea. Usa el botón de asignación en la tabla para asignar lotes más tarde."
                style={{ marginBottom: 16 }}
              />
            )}

            <Form form={lineForm} layout="vertical" onFinish={handleAddLineSubmit} className="add-line-form" onKeyDown={handleEnterToNext}>

              {/* Producto */}
              <Row gutter={16}>
                {addMode === 'LOTE' ? (
                  <Col xs={24} md={12}>
                    <Form.Item name="lote_id" label="Lote" rules={[{ required: true, message: 'Requerido' }]}>
                      <Select
                        showSearch
                        placeholder="Escriba 2 o más letras para buscar"
                        onSearch={handleLotSearch}
                        onChange={handleLotChange}
                        filterOption={false}
                        notFoundContent={null}
                      >
                        {filteredLots.map(l => {
                          const lbl = buildLotLabel(l);
                          return (
                            <Option key={l.lote_id || l.id} value={l.lote_id || l.id}>
                              <div style={{ lineHeight: '1.2' }}>
                                <span>{lbl.label}</span><br />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {`${lbl.disp} ${lbl.unidad} disponibles`}
                                </Text>
                              </div>
                            </Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  </Col>
                ) : (
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="product_variant_key"
                      label="Producto / Variante"
                      rules={[{ required: true, message: 'Requerido' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Buscar producto o variante..."
                        filterOption={(input, option) =>
                          option?.label?.toString().toLowerCase().includes(input.toLowerCase())
                        }
                        options={[
                          ...allProducts.flatMap(p => {
                            if (!p.variants || p.variants.length === 0) {
                              return [{ value: `${p.product_id}_base`, label: p.name }];
                            }
                            return p.variants.map(v => {
                              const attrStr = v.attributes?.map(a => a.value?.value).join(' ') || '';
                              return { value: `${p.product_id}_${v.variant_id}`, label: attrStr ? `${p.name} ${attrStr}` : p.name };
                            });
                          })
                        ]}
                      />
                    </Form.Item>
                  </Col>
                )}
                <Col xs={24} md={12}>
                  <Form.Item name="packaging_type" label="Empaque" rules={[{ required: true }]}>
                    <Select onChange={handlePackagingChange}>
                      <Option value="TALLO">Tallo</Option>
                      <Option value="RAMO">Ramo</Option>
                      <Option value="CAJA">Caja</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Desglose de empaque (aparece según selección) */}
              <Row gutter={16}>
                {lineVals.packaging_type === 'TALLO' && (
                  <Col xs={24} md={5}>
                    <Form.Item name="cantidad_tallos" label="Tallos" rules={[{ required: true, message: 'Ingresa la cantidad de tallos' }]}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                )}
                {lineVals.packaging_type === 'RAMO' && (
                  <>
                    <Col xs={24} md={6}>
                      <Form.Item name="cantidad_ramos" label="Cantidad de ramos" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </>
                )}
                {lineVals.packaging_type === 'CAJA' && (
                  <>
                    <Col xs={24} md={6}>
                      <Form.Item name="cantidad_cajas" label="Cantidad de cajas" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name="ramos_por_caja" label="Ramos por caja" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>

              {/* Precio */}
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item name="unit_price" label={priceLabel()} rules={[{ required: true }]}>
                    <InputNumber
                      addonBefore={getCurrencySymbol(clientCurrency)}
                      min={0}
                      step={0.01}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="billing_unit" label="Se cobra por" rules={[{ required: true }]}>
                    <Select options={billingOptions()} />
                  </Form.Item>
                </Col>
              </Row>

              {/* Notas */}
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item name="notes" label="Notas">
                    <Input placeholder="Opcional..." />
                  </Form.Item>
                </Col>
              </Row>

              {/* Franja de resultado */}
              {Number(totalStemsCalc) > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#E1F5EE',
                  border: '0.5px solid #5DCAA5',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 18, color: '#0F6E56' }}>→</span>
                  <span>
                    {addMode === 'LOTE' && (
                      <Text strong style={{ color: '#04342C' }}>
                        {totalStemsCalc} tallos a reservar&nbsp;&nbsp;·&nbsp;&nbsp;
                      </Text>
                    )}
                    <Text style={{ color: '#04342C' }}>
                      Subtotal:{' '}
                      <Text strong style={{ color: '#04342C' }}>
                        {getCurrencySymbol(clientCurrency)} {new Intl.NumberFormat('es-CO').format(subtotalCalc)}
                      </Text>
                    </Text>
                  </span>
                </div>
              )}

              <Row justify="end">
                <Col>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    style={{ backgroundColor: '#1a3c2e' }}
                  >
                    Agregar línea
                  </Button>
                </Col>
              </Row>

            </Form>
          </Card>
        )}

        {orderId && (
          <Card title="Líneas de la Orden" style={{ borderRadius: 8, overflow: 'hidden' }}>
            <Table
              columns={detailColumns}
              dataSource={orderLines}
              rowKey={(r) => r.detail_id || r.id}
              pagination={false}
              scroll={{ x: 900 }}
              locale={{ emptyText: 'No hay líneas.' }}
            />
            <Row justify="space-between" align="middle" style={{ marginTop: 16 }}>
              <Col>
                <Space>
                  <Text type="secondary">Tallos totales: <Text strong>{totalTallos}</Text></Text>
                  <Text type="secondary">
                    Asignados: <Text strong style={{ color: totalAsignados === totalTallos && totalTallos > 0 ? '#52c41a' : '#faad14' }}>{totalAsignados}</Text>
                  </Text>
                </Space>
              </Col>
              <Col>
                <Text strong style={{ fontSize: 18 }}>
                  Total: {getCurrencySymbol(clientCurrency)} {new Intl.NumberFormat('es-CO').format(totalAmount)}
                </Text>
              </Col>
            </Row>
          </Card>
        )}

      </div>

      <Modal title="Inventario Disponible" width={1100} open={inventoryModalOpen} onCancel={() => setInventoryModalOpen(false)} footer={null}>
        <Table dataSource={allLots} columns={lotColumns} rowKey={r => r.lote_id || r.id} />
      </Modal>

      <Modal
        title={
          <Space direction="vertical" size={0}>
            <span>Asignar Inventario</span>
            {assigningDetail && (
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                Línea #{assigningDetail.line_number} — {assigningDetail.product?.name} — {assigningDetail.packaging_type}
              </Text>
            )}
          </Space>
        }
        open={assignModalOpen}
        onCancel={closeAssignModal}
        width={700}
        footer={[
          <Button key="cancel" onClick={closeAssignModal}>Cancelar</Button>,
          <Button key="submit" type="primary" style={{ backgroundColor: '#1a3c2e' }} loading={assignLoading} onClick={handleAssignSubmit} disabled={newAssignmentSum > assignPending}>
            Confirmar Asignación
          </Button>
        ]}
      >
        {assigningDetail && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  <Text type="secondary">Total línea</Text>
                  <div><Text strong style={{ fontSize: 18 }}>{assignTotal}</Text> <Text type="secondary">tallos</Text></div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f6ffed' }}>
                  <Text type="secondary">Ya asignado</Text>
                  <div><Text strong style={{ fontSize: 18, color: '#52c41a' }}>{assignAlready}</Text> <Text type="secondary">tallos</Text></div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', backgroundColor: '#fff7e6' }}>
                  <Text type="secondary">Pendiente</Text>
                  <div><Text strong style={{ fontSize: 18, color: '#faad14' }}>{assignPending}</Text> <Text type="secondary">tallos</Text></div>
                </Card>
              </Col>
            </Row>

            {assigningDetail.assignments && assigningDetail.assignments.length > 0 && (
              <>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Asignaciones existentes</Text>
                {assigningDetail.assignments.map(a => (
                  <Row key={a.assignment_id} gutter={8} align="middle" style={{ marginBottom: 6 }}>
                    <Col><Tag color="green">{a.lote?.numero_lote || a.lote_id}</Tag></Col>
                    <Col><Text>{a.quantity} tallos</Text></Col>
                    <Col>
                      <Tooltip title="Liberar">
                        <MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
                          onClick={() => { handleReleaseAssignment(a.assignment_id); closeAssignModal(); }} />
                      </Tooltip>
                    </Col>
                  </Row>
                ))}
                <Divider style={{ margin: '12px 0' }} />
              </>
            )}

            <Text strong style={{ display: 'block', marginBottom: 8 }}>Nueva asignación</Text>
            {assignRows.map((row, idx) => (
              <Row key={idx} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                <Col flex="1">
                  <Select showSearch placeholder="Seleccionar lote" style={{ width: '100%' }} value={row.lote_id}
                    onChange={val => updateAssignRow(idx, 'lote_id', val)}
                    filterOption={(i, o) => o.children?.toString().toLowerCase().includes(i.toLowerCase())}
                  >
                    {assignModalLots.map(l => (
                      <Option key={l.lote_id} value={l.lote_id}>{buildLotLabel(l).label} — {l.cantidad_disponible} disp.</Option>
                    ))}
                  </Select>
                </Col>
                <Col>
                  <InputNumber min={1} max={assignPending} placeholder="Cantidad" value={row.quantity || undefined}
                    onChange={val => updateAssignRow(idx, 'quantity', val)} addonAfter="t" style={{ width: 130 }} />
                </Col>
                <Col>
                  <Button type="text" danger icon={<MinusCircleOutlined />} disabled={assignRows.length === 1}
                    onClick={() => setAssignRows(rows => rows.filter((_, i) => i !== idx))} />
                </Col>
              </Row>
            ))}

            <Button type="dashed" icon={<PlusOutlined />}
              onClick={() => setAssignRows(rows => [...rows, { lote_id: null, quantity: 0 }])}
              style={{ width: '100%', marginTop: 4 }} disabled={newAssignmentSum >= assignPending}>
              Agregar otro lote
            </Button>

            {newAssignmentSum > 0 && (
              <Alert style={{ marginTop: 12 }} type={newAssignmentSum > assignPending ? 'error' : 'success'}
                message={`Asignando ${newAssignmentSum} de ${assignPending} tallos pendientes`} showIcon />
            )}
          </>
        )}
      </Modal>

      <Modal
        title={
          <Space direction="vertical" size={0}>
            <span>Editar Línea</span>
            {editingDetail && (
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                Línea #{editingDetail.line_number} — {editingDetail.product?.name}
              </Text>
            )}
          </Space>
        }
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setEditModalOpen(false)}>Cancelar</Button>,
          <Button key="submit" type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={() => editForm.submit()}>
            Guardar cambios
          </Button>
        ]}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditLineSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="packaging_type" label="Empaque" rules={[{ required: true }]}>
                <Select onChange={(val) => {
                  editForm.setFieldsValue({ billing_unit: val, quantity: 0, cantidad_ramos: 0, cantidad_cajas: 0, tallos_por_ramo: 0, ramos_por_caja: 0 });
                }}>
                  <Option value="TALLO">TALLO</Option>
                  <Option value="RAMO">RAMO</Option>
                  <Option value="CAJA">CAJA</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="billing_unit" label="Facturar por" rules={[{ required: true }]}>
                <Select>
                  <Option value="TALLO">TALLO</Option>
                  <Option value="RAMO">RAMO</Option>
                  <Option value="CAJA">CAJA</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="unit_price" label="Precio unit." rules={[{ required: true }]}>
                <InputNumber addonBefore={getCurrencySymbol(clientCurrency)} min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate>
            {() => {
              const pt = editForm.getFieldValue('packaging_type');
              return (
                <Row gutter={16}>
                  {pt === 'TALLO' && (
                    <Col xs={24} md={8}>
                      <Form.Item name="quantity" label="Cantidad (tallos)" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  )}
                  {pt === 'RAMO' && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item name="cantidad_ramos" label="Cantidad ramos" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {pt === 'CAJA' && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item name="cantidad_cajas" label="Cantidad cajas" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="ramos_por_caja" label="Ramos por caja" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

    </Spin>
  );
};

export default SalesOrderFormPage;
