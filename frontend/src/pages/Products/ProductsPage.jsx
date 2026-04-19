import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  notification,
  Typography,
  Skeleton,
  Tooltip,
  Tag,
  Row,
  Col,
  Divider,
  Dropdown,
  Checkbox,
  Badge,
  Steps,
  Drawer,
  Popconfirm,
  Empty,
  Spin,
  Card,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProduct,
  generateVariants,
  getVariants,
  toggleVariant,
  deleteVariant,
  deleteProduct,
  getPackaging,
} from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getAttributes, updateAttributeOrder } from '../../services/attributeService';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#1a3c2e';
const ACTIVE_COLOR = '#52b788';

const iniciales = (texto = '', max = 3) =>
  texto
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, max) || texto.slice(0, max).toUpperCase();

/** Producto cartesiano de un array de arrays */
const cartesiano = (...arrays) =>
  arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );

const ALL_COLUMN_KEYS = [
  { key: 'name', label: 'Nombre' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Categoría' },
  { key: 'unit_of_measure', label: 'Unidad de Medida' },
  { key: 'packaging', label: 'Empaque' },
  { key: 'is_active', label: 'Estado' },
  { key: 'variants', label: 'Variantes' },
  { key: 'created_at', label: 'Fecha Creación' },
  { key: 'actions', label: 'Acciones' },
];
const DEFAULT_VISIBLE = new Set(['name', 'sku', 'category', 'unit_of_measure', 'is_active', 'variants', 'actions']);

const UNITS = ['TALLO', 'RAMO', 'CAJA'];

const ProductsPage = () => {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [inputName, setInputName] = useState('');
  const [inputSku, setInputSku] = useState('');
  const [inputCategory, setInputCategory] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [inputStatus, setInputStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const [visibleColumns, setVisibleColumns] = useState(new Set(DEFAULT_VISIBLE));
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [packagingList, setPackagingList] = useState([]);
  const [attributes, setAttributes] = useState([]);

  // Refs para evitar recargas de datos estáticos en la misma sesión
  const categoriesLoaded = useRef(false);
  const packagingLoaded = useRef(false);

  const [disabledAttrs, setDisabledAttrs] = useState(new Set());
  const [attrOrder, setAttrOrder] = useState([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState('create');
  const [wizardStep, setWizardStep] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingStep1, setSavingStep1] = useState(false);
  const [savedProduct, setSavedProduct] = useState(null);
  const [form] = Form.useForm();

  const [selectedValueIds, setSelectedValueIds] = useState(new Set());
  const [includedCombos, setIncludedCombos] = useState(new Set());
  const [generatingVariants, setGeneratingVariants] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [checkedVariants, setCheckedVariants] = useState([]);
  const [bulkVariantLoading, setBulkVariantLoading] = useState(false);
  // Variantes con movimientos asociados: no se pueden eliminar, solo inactivar
  const [burntVariantIds, setBurntVariantIds] = useState(new Set());

  useEffect(() => {
    const loadAux = async () => {
      if (!categoriesLoaded.current) {
        try {
          const cats = await getCategories({ is_active: 'true' });
          const catList = Array.isArray(cats) ? cats : (cats.data ?? cats.categories ?? []);
          setCategories(catList);
          categoriesLoaded.current = true;
        } catch {
          console.error('Error cargando categorías');
        }
      }

      if (!packagingLoaded.current) {
        try {
          const pkgs = await getPackaging();
          const pkgList = Array.isArray(pkgs) ? pkgs : (pkgs.data ?? pkgs.packaging ?? []);
          setPackagingList(pkgList);
          packagingLoaded.current = true;
        } catch {
          // packaging no terminado
        }
      }
    };
    loadAux();
  }, []);

  const loadAttributes = useCallback(async () => {
    try {
      const data = await getAttributes({ is_active: 'true' });
      const list = Array.isArray(data) ? data : (data.data ?? data.attributes ?? []);
      // Filtrar atributos con al menos un valor activo y ordenar por `order`
      const withValues = list
        .filter((a) => (a.values ?? a.attribute_values ?? []).some((v) => v.is_active))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setAttributes(withValues);
      setAttrOrder(withValues.map((a) => String(a.attribute_id)));
    } catch { /* silencioso */ }
  }, []);

  const fetchProducts = useCallback(async (filters) => {
    setLoading(true);
    try {
      const data = await getProducts(filters);
      const list = Array.isArray(data) ? data : (data.data ?? data.products ?? []);
      setProducts(list);
      setTotalCount(list.length);
      setSelectedRowKeys([]);
    } catch (err) {
      notification.error({
        message: 'Error al cargar productos',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const filters = {
      name: inputName.trim(),
      sku: inputSku.trim(),
      category_id: inputCategory,
      unit_of_measure: inputUnit,
      is_active: inputStatus,
    };
    setAppliedFilters(filters);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchProducts(filters);
  };

  const handleClear = () => {
    setInputName(''); setInputSku(''); setInputCategory('');
    setInputUnit(''); setInputStatus('');
    const filters = {};
    setAppliedFilters(filters);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchProducts(filters);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const columnMenuItems = ALL_COLUMN_KEYS.map(({ key, label }) => ({
    key,
    label: (
      <Checkbox checked={visibleColumns.has(key)} onChange={() => toggleColumn(key)} style={{ width: '100%' }}>
        {label}
      </Checkbox>
    ),
  }));

  const openCreateWizard = async () => {
    setWizardMode('create');
    setEditingProduct(null);
    setSavedProduct(null);
    setWizardStep(0);
    setSelectedValueIds(new Set());
    setIncludedCombos(new Set());
    setDisabledAttrs(new Set());
    form.resetFields();
    await loadAttributes();
    setWizardOpen(true);
  };

  const openEditWizard = async (record) => {
    setWizardMode('edit');
    setEditingProduct(record);
    setSavedProduct(record);
    setWizardStep(0);
    setSelectedValueIds(new Set());
    setIncludedCombos(new Set());
    setDisabledAttrs(new Set());
    form.setFieldsValue({
      name: record.name,
      category_id: String(record.category?.category_id ?? record.category_id ?? ''),
      unit_of_measure: record.unit_of_measure,
      packaging_id: record.packaging ? String(record.packaging.packaging_id) : undefined,
    });
    await loadAttributes();
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    form.resetFields();
    setEditingProduct(null);
    setSavedProduct(null);
    setSelectedValueIds(new Set());
    setIncludedCombos(new Set());
    setDisabledAttrs(new Set());
    setWizardStep(0);
  };

  const autoGenerateSku = useCallback(() => {
    const values = form.getFieldsValue();
    const catId = values.category_id;
    const name = values.name ?? '';
    if (!catId || !name.trim()) return;
    const cat = categories.find((c) => String(c.category_id) == catId);
    if (!cat) return;
    const prefCat = iniciales(cat.reference || cat.name, 3);
    const prefName = iniciales(name, 3);
    const base = `${prefCat}${prefName}`;
    // Contar SKUs existentes con el mismo prefijo para generar el secuencial (orientativo)
    const existing = products.filter((p) => (p.sku ?? '').startsWith(base)).length;
    const seq = String(existing + 1).padStart(3, '0');
    form.setFieldValue('sku', `${base}${seq}`);
  }, [categories, products, form]);

  const handleStep1Save = async () => {
    let values;
    try { values = await form.validateFields(['name', 'category_id', 'unit_of_measure']); }
    catch { return; }

    const allValues = form.getFieldsValue();
    const payload = {
      name: values.name.trim(),
      category_id: values.category_id,
      unit_of_measure: values.unit_of_measure,
      packaging_id: allValues.packaging_id || undefined,
    };

    setSavingStep1(true);
    try {
      let result;
      if (wizardMode === 'create') {
        result = await createProduct(payload);
        const prod = result.data ?? result;
        setSavedProduct(prod);
        notification.success({ message: 'Producto creado correctamente' });
      } else {
        result = await updateProduct(editingProduct.product_id, payload);
        const prod = result.data ?? result;
        setSavedProduct(prod);
        notification.success({ message: 'Producto actualizado correctamente' });
      }
      fetchProducts(appliedFilters);
      setWizardStep(1);
    } catch (err) {
      notification.error({
        message: wizardMode === 'create' ? 'Error al crear' : 'Error al actualizar',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setSavingStep1(false);
    }
  };

  // Atributos reordenados localmente respetando attrOrder
  const orderedAttributes = useMemo(() => {
    if (attrOrder.length === 0) return attributes;
    const map = Object.fromEntries(attributes.map((a) => [String(a.attribute_id), a]));
    return attrOrder.map((id) => map[id]).filter(Boolean);
  }, [attributes, attrOrder]);

  const combos = useMemo(() => {
    // Agrupar value_ids seleccionados por atributo, respetando orden local y visibilidad
    const groups = [];
    for (const attr of orderedAttributes) {
      if (disabledAttrs.has(String(attr.attribute_id))) continue;
      const attrValues = (attr.values ?? attr.attribute_values ?? []);
      const selected = attrValues.filter((v) => selectedValueIds.has(String(v.value_id ?? v.id)));
      if (selected.length > 0) groups.push(selected);
    }
    if (groups.length === 0) return [];
    return cartesiano(...groups).map((combo, idx) => ({ idx, combo }));
  }, [selectedValueIds, orderedAttributes, disabledAttrs]);

  useEffect(() => {
    setIncludedCombos(new Set(combos.map((c) => c.idx)));
  }, [combos]);

  const skuForCombo = (combo) => {
    const base = savedProduct?.sku ?? '';
    const sufijo = combo.map((v) => iniciales(v.value ?? v.name, 3)).join('');
    return `${base}-${sufijo}`;
  };

  const nameForCombo = (combo) =>
    `${savedProduct?.name ?? ''} ${combo.map((v) => v.value ?? v.name).join(' ')}`;

  const attrLabels = (combo) =>
    combo.map((v) => `${v.attribute?.name ?? ''}: ${v.value ?? v.name}`).join(' | ');

  const moveAttr = async (attrId, direction) => {
    const idx = attrOrder.indexOf(String(attrId));
    if (idx < 0) return;
    const newOrder = [...attrOrder];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setAttrOrder(newOrder);
    // Persistir orden en backend; el orden visual ya está actualizado localmente
    try {
      await updateAttributeOrder(attrId, swapIdx);
      await updateAttributeOrder(newOrder[idx], idx);
    } catch {
      // silencioso
    }
  };

  const handleGenerateVariants = async (andNew = false) => {
    if (!savedProduct) return;
    const toGenerate = combos.filter((c) => includedCombos.has(c.idx));
    if (toGenerate.length === 0) {
      notification.info({ message: 'No hay combinaciones marcadas para generar' });
      return;
    }
    const value_ids = [...selectedValueIds];
    setGeneratingVariants(true);
    try {
      const result = await generateVariants(savedProduct.product_id, value_ids);
      const { creadas = [], omitidas = [] } = result.data ?? {};
      notification.success({
        message: `${creadas.length} variante(s) creada(s)`,
        description: omitidas.length > 0 ? `${omitidas.length} omitidas por SKU duplicado` : undefined,
      });
      fetchProducts(appliedFilters);
      if (andNew) {
        openCreateWizard();
      } else {
        closeWizard();
      }
    } catch (err) {
      notification.error({
        message: 'Error al generar variantes',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setGeneratingVariants(false);
    }
  };

  const handleToggle = async (record) => {
    try {
      await toggleProduct(record.product_id);
      const newActive = !record.is_active;
      setProducts((prev) =>
        prev.map((p) =>
          String(p.product_id) === String(record.product_id)
            ? { ...p, is_active: newActive }
            : p
        )
      );
      notification.success({
        message: `Producto ${record.is_active ? 'inactivado' : 'activado'} correctamente`,
      });
    } catch (err) {
      notification.error({
        message: 'Error al cambiar estado',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    }
  };

  const handleBulk = async (action) => {
    setBulkLoading(true);
    const errors = [];
    let targetIds = [...selectedRowKeys];
    if (action === 'activate') {
      const inactiveIds = new Set(
        products.filter((p) => !p.is_active).map((p) => String(p.product_id))
      );
      targetIds = targetIds.filter((k) => inactiveIds.has(String(k)));
    } else {
      const activeIds = new Set(
        products.filter((p) => p.is_active).map((p) => String(p.product_id))
      );
      targetIds = targetIds.filter((k) => activeIds.has(String(k)));
    }
    if (targetIds.length === 0) {
      setBulkLoading(false);
      notification.info({ message: 'Sin cambios necesarios' });
      return;
    }
    await Promise.allSettled(
      targetIds.map(async (id) => {
        try { await toggleProduct(id); }
        catch (err) { errors.push(err); }
      })
    );
    setBulkLoading(false);
    if (errors.length === 0)
      notification.success({ message: `${targetIds.length} producto(s) ${action === 'activate' ? 'activados' : 'inactivados'}` });
    else
      notification.warning({ message: 'Algunas acciones fallaron' });
    fetchProducts(appliedFilters);
  };

  const handleDeleteProduct = (record) => {
    Modal.confirm({
      title: `¿Eliminar el producto "${record.name}"?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      okButtonProps: { style: { borderRadius: 8 } },
      cancelButtonProps: { style: { borderRadius: 8 } },
      onOk: async () => {
        try {
          await deleteProduct(record.product_id);
          notification.success({ message: 'Producto eliminado correctamente' });
          fetchProducts(appliedFilters);
        } catch (err) {
          notification.error({
            message: 'Error al eliminar producto',
            description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
          });
        }
      },
    });
  };

  const openDrawer = async (record) => {
    setDrawerProduct(record);
    setCheckedVariants([]);
    setBurntVariantIds(new Set());
    setDrawerOpen(true);
    setLoadingVariants(true);
    try {
      const data = await getVariants(record.product_id);
      const list = Array.isArray(data) ? data : (data.data ?? data.variants ?? []);
      setVariants(list);
    } catch (err) {
      notification.error({
        message: 'Error al cargar variantes',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setLoadingVariants(false);
    }
  };

  const refreshDrawerVariants = async () => {
    if (!drawerProduct) return;
    setLoadingVariants(true);
    try {
      const data = await getVariants(drawerProduct.product_id);
      const list = Array.isArray(data) ? data : (data.data ?? data.variants ?? []);
      setVariants(list);
      setCheckedVariants([]);
    } catch { /* silencioso */ }
    finally { setLoadingVariants(false); }
  };

  const handleToggleVariant = async (v) => {
    try {
      await toggleVariant(drawerProduct.product_id, v.variant_id);
      const newActive = !v.is_active;
      setVariants((prev) =>
        prev.map((vr) =>
          String(vr.variant_id) === String(v.variant_id)
            ? { ...vr, is_active: newActive }
            : vr
        )
      );
      notification.success({ message: `Variante ${v.is_active ? 'inactivada' : 'activada'} correctamente` });
    } catch (err) {
      notification.error({
        message: 'Error al cambiar estado',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    }
  };

  const handleDeleteVariant = async (v) => {
    try {
      await deleteVariant(drawerProduct.product_id, v.variant_id);
      notification.success({ message: 'Variante eliminada correctamente' });
      refreshDrawerVariants();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.mensaje || err?.response?.data?.message || 'No se pudo eliminar';
      if (status === 400) {
        // La variante tiene movimientos asociados → marcarla como "quemada" (solo se puede inactivar)
        setBurntVariantIds((prev) => new Set([...prev, String(v.variant_id)]));
      }
      notification.error({
        message: 'Error al eliminar variante',
        description: msg,
      });
    }
  };

  const handleBulkVariants = async (action) => {
    setBulkVariantLoading(true);
    const errors = [];
    let targetIds = [...checkedVariants];
    if (action === 'activate') {
      const inactiveIds = new Set(variants.filter((v) => !v.is_active).map((v) => String(v.variant_id)));
      targetIds = targetIds.filter((id) => inactiveIds.has(String(id)));
    } else if (action === 'deactivate') {
      const activeIds = new Set(variants.filter((v) => v.is_active).map((v) => String(v.variant_id)));
      targetIds = targetIds.filter((id) => activeIds.has(String(id)));
    }
    if (action !== 'delete' && targetIds.length === 0) {
      setBulkVariantLoading(false);
      notification.info({ message: 'Sin cambios necesarios' });
      return;
    }
    const ids = action === 'delete' ? [...checkedVariants] : targetIds;
    await Promise.allSettled(
      ids.map(async (id) => {
        try {
          if (action === 'delete') await deleteVariant(drawerProduct.product_id, id);
          else await toggleVariant(drawerProduct.product_id, id);
        } catch (err) { errors.push(err); }
      })
    );
    setBulkVariantLoading(false);
    if (errors.length === 0)
      notification.success({ message: `${ids.length} variante(s) ${action === 'delete' ? 'eliminadas' : action === 'activate' ? 'activadas' : 'inactivadas'}` });
    else
      notification.warning({ message: 'Algunas acciones fallaron' });
    refreshDrawerVariants();
  };

  const openVariantsFromDrawer = async () => {
    setDrawerOpen(false);
    await openEditWizard(drawerProduct);
    setWizardStep(1);
    setSavedProduct(drawerProduct);
  };

  const skeletonRows = Array.from({ length: 8 }, (_, i) => ({
    key: `sk-${i}`,
    name: <Skeleton.Input active size="small" style={{ width: 140 }} />,
    sku: <Skeleton.Input active size="small" style={{ width: 100 }} />,
    category: <Skeleton.Input active size="small" style={{ width: 110 }} />,
    unit_of_measure: <Skeleton.Button active size="small" style={{ width: 70 }} />,
    packaging: <Skeleton.Input active size="small" style={{ width: 90 }} />,
    is_active: <Skeleton.Button active size="small" style={{ width: 60 }} />,
    variants: <Skeleton.Button active size="small" style={{ width: 40 }} />,
    created_at: <Skeleton.Input active size="small" style={{ width: 100 }} />,
    actions: <Skeleton.Button active size="small" />,
  }));

  const pagedData = products.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const allColumns = [
    {
      title: 'Nombre', dataIndex: 'name', key: 'name',
      sorter: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'SKU', dataIndex: 'sku', key: 'sku',
      render: (text) => <Text code style={{ fontSize: 12 }}>{text ?? '—'}</Text>,
    },
    {
      title: 'Categoría', dataIndex: 'category', key: 'category',
      render: (cat) => cat?.name ? (
        <Tag color="geekblue" style={{ fontWeight: 500 }}>{cat.name}</Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Unidad de Medida', dataIndex: 'unit_of_measure', key: 'unit_of_measure',
      width: 140, align: 'center',
      render: (u) => u ? <Tag color="cyan">{u}</Tag> : '—',
    },
    {
      title: 'Empaque', dataIndex: 'packaging', key: 'packaging',
      render: (pkg) => pkg?.name ? (
        <Tag color="purple" style={{ fontWeight: 500 }}>{pkg.name}</Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado', dataIndex: 'is_active', key: 'is_active',
      width: 110, align: 'center',
      render: (active) => active ? (
        <Tag color="success">Activo</Tag>
      ) : (
        <Tag color="error">Inactivo</Tag>
      ),
    },
    {
      title: 'Variantes', key: 'variants', width: 100, align: 'center',
      render: (_, record) => {
        const count = (record.variants ?? []).length;
        return (
          <Tooltip title={count > 0 ? `Ver ${count} variante(s)` : '0 variantes'}>
            <div
              onClick={() => openDrawer(record)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Badge
                count={count}
                showZero
                style={{
                  backgroundColor: count > 0 ? ACTIVE_COLOR : '#bfbfbf',
                  fontWeight: 600,
                  fontSize: 12,
                  boxShadow: 'none',
                }}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Fecha Creación', dataIndex: 'created_at', key: 'created_at', width: 150,
      render: (date) => date
        ? new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    },
    {
      title: 'Acciones', key: 'actions', width: 190, align: 'center',
      render: (_, record) => {
        const variantCount = (record.variants ?? []).length;
        return (
          <Space size={6}>
            <Tooltip title="Editar">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditWizard(record)} style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }} />
            </Tooltip>
            <Tooltip title={record.is_active ? 'Inactivar' : 'Activar'}>
              <Button size="small"
                icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => handleToggle(record)}
                style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
              />
            </Tooltip>
            <Tooltip title="Ver Variantes">
              <Button size="small" icon={<UnorderedListOutlined />} onClick={() => openDrawer(record)} style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }} />
            </Tooltip>
            {variantCount === 0 ? (
              <Tooltip title="Eliminar producto">
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProduct(record)} />
              </Tooltip>
            ) : (
              <Tooltip title="Tiene variantes. Elimina las variantes primero.">
                <Button size="small" danger icon={<DeleteOutlined />} disabled />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];
  const columns = allColumns.filter((c) => visibleColumns.has(c.key));

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Productos
          </Title>
        </Col>
        <Col>
          <Space>
            <Dropdown open={columnDropdownOpen} onOpenChange={setColumnDropdownOpen}
              menu={{ items: columnMenuItems }} trigger={['click']} placement="bottomRight">
              <Button icon={<SettingOutlined />} style={{ borderRadius: 8, height: 38 }}>Columnas</Button>
            </Dropdown>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={openCreateWizard}
              style={{ background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8, height: 38 }}
            >
              Nuevo Producto
            </Button>
          </Space>
        </Col>
      </Row>

      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input placeholder="Buscar por nombre" prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={inputName} onChange={(e) => setInputName(e.target.value)}
              onKeyDown={handleKeyDown} allowClear style={{ borderRadius: 8 }} />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input placeholder="Buscar por SKU" prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={inputSku} onChange={(e) => setInputSku(e.target.value)}
              onKeyDown={handleKeyDown} allowClear style={{ borderRadius: 8 }} />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select placeholder="Categoría" value={inputCategory || undefined}
              onChange={(v) => setInputCategory(v ?? '')} allowClear
              style={{ width: '100%' }} showSearch optionFilterProp="children">
              {categories.map((c) => (
                <Option key={String(c.category_id)} value={String(c.category_id)}>{c.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select placeholder="Unidad" value={inputUnit || undefined}
              onChange={(v) => setInputUnit(v ?? '')} allowClear style={{ width: '100%' }}>
              {UNITS.map((u) => <Option key={u} value={u}>{u}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select placeholder="Estado" value={inputStatus || undefined}
              onChange={(v) => setInputStatus(v ?? '')} allowClear style={{ width: '100%' }}>
              <Option value="">Todos</Option>
              <Option value="true">Activos</Option>
              <Option value="false">Inactivos</Option>
            </Select>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}
                style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}>Buscar</Button>
              <Button icon={<ClearOutlined />} onClick={handleClear} style={{ borderRadius: 8 }}>Limpiar</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {selectedRowKeys.length > 0 && (
        <div style={{
          background: '#f0f7f4', border: '1.5px solid #52b788', borderRadius: 10,
          padding: '10px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <Badge count={selectedRowKeys.length} style={{ backgroundColor: PRIMARY }} />
          <Text strong style={{ color: PRIMARY }}>
            {selectedRowKeys.length} {selectedRowKeys.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
          </Text>
          <Divider type="vertical" style={{ borderColor: ACTIVE_COLOR }} />
          <Space wrap>
            <Button size="small" icon={<CheckOutlined />} loading={bulkLoading}
              onClick={() => handleBulk('activate')}
              style={{ borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR, fontWeight: 600, borderRadius: 6 }}>Activar</Button>
            <Button size="small" icon={<StopOutlined />} loading={bulkLoading}
              onClick={() => handleBulk('deactivate')}
              style={{ borderColor: '#faad14', color: '#faad14', fontWeight: 600, borderRadius: 6 }}>Inactivar</Button>
            <Button size="small" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} style={{ borderRadius: 6 }}>
              Limpiar selección
            </Button>
          </Space>
        </div>
      )}

      {!loading && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
          Mostrando <strong>{Math.min(pagination.pageSize, pagedData.length)}</strong> de{' '}
          <strong>{totalCount}</strong> {totalCount === 1 ? 'producto' : 'productos'}
        </Text>
      )}

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <Table
          rowKey="product_id"
          columns={columns}
          dataSource={loading ? skeletonRows : pagedData}
          loading={false}
          rowSelection={loading ? undefined : {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            columnWidth: 40,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: products.length,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '75', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            style: { padding: '12px 16px' },
          }}
          size="middle"
          style={{ borderRadius: 12 }}
        />
      </div>

      {/* WIZARD */}
      <Modal
        open={wizardOpen}
        onCancel={closeWizard}
        footer={null}
        width={wizardStep === 0 ? 640 : 920}
        destroyOnClose
        title={
          <Space>
            <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 16 }}>
              {wizardMode === 'create' ? '✦ Nuevo Producto' : '✎ Editar Producto'}
            </span>
          </Space>
        }
        bodyStyle={{ paddingTop: 8 }}
      >
        <Steps
          current={wizardStep}
          size="small"
          style={{ marginBottom: 24, marginTop: 8 }}
          items={[
            { title: 'Producto Base' },
            { title: 'Generar Variantes' },
          ]}
        />

        {/* PASO 1 */}
        {wizardStep === 0 && (
          <>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={<Text strong>Categoría</Text>} name="category_id"
                    rules={[{ required: true, message: 'Selecciona una categoría' }]}>
                    <Select placeholder="Seleccionar categoría" showSearch optionFilterProp="children"
                      onChange={autoGenerateSku} style={{ borderRadius: 8 }}>
                      {categories.map((c) => (
                        <Option key={String(c.category_id)} value={String(c.category_id)}>{c.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Unidad de Medida</Text>} name="unit_of_measure"
                    rules={[{ required: true, message: 'Selecciona una unidad' }]}>
                    <Select placeholder="TALLO / RAMO / CAJA" style={{ borderRadius: 8 }}>
                      {UNITS.map((u) => <Option key={u} value={u}>{u}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label={<Text strong>Nombre</Text>} name="name"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
                <Input placeholder="Nombre del producto" onChange={autoGenerateSku} style={{ borderRadius: 8 }} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={<Text strong>SKU</Text>} name="sku"
                    tooltip="Se genera automáticamente, pero puedes editarlo">
                    <Input placeholder="SKU autogenerado" style={{ borderRadius: 8 }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Empaque <Text type="secondary" style={{ fontSize: 12 }}>(opcional)</Text></Text>}
                    name="packaging_id">
                    <Select placeholder="Sin empaque" allowClear style={{ borderRadius: 8 }}>
                      {packagingList.map((p) => (
                        <Option key={String(p.packaging_id)} value={String(p.packaging_id)}>{p.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <Divider style={{ margin: '12px 0' }} />
            <Row justify="end">
              <Space>
                <Button onClick={closeWizard} style={{ borderRadius: 8 }}>Cancelar</Button>
                <Button type="primary" loading={savingStep1} icon={<ArrowRightOutlined />}
                  onClick={handleStep1Save}
                  style={{ background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8 }}>
                  Siguiente
                </Button>
              </Space>
            </Row>
          </>
        )}

        {/* PASO 2 */}
        {wizardStep === 1 && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              Selecciona atributos y valores para generar variantes del producto{' '}
              <Text strong style={{ color: PRIMARY }}>{savedProduct?.name}</Text>
            </Text>

            <Row gutter={16}>
              <Col span={10}>
                <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                  {orderedAttributes.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay atributos activos" />
                  ) : (
                    orderedAttributes.map((attr, attrIdx) => {
                      const attrId = String(attr.attribute_id);
                      const isDisabled = disabledAttrs.has(attrId);
                      const attrValues = (attr.values ?? attr.attribute_values ?? []).filter((v) => v.is_active);
                      return (
                        <Card
                          key={attrId}
                          size="small"
                          title={
                            <Row align="middle" justify="space-between" wrap={false}>
                              <Text strong style={{ color: isDisabled ? '#999' : PRIMARY, fontSize: 13 }}>
                                {attr.name}
                              </Text>
                              <Space size={4}>
                                <Tooltip title="Mover arriba">
                                  <Button
                                    size="small" type="text" icon={<UpOutlined />}
                                    disabled={attrIdx === 0}
                                    onClick={() => moveAttr(attr.attribute_id, 'up')}
                                    style={{ padding: '0 4px' }}
                                  />
                                </Tooltip>
                                <Tooltip title="Mover abajo">
                                  <Button
                                    size="small" type="text" icon={<DownOutlined />}
                                    disabled={attrIdx === orderedAttributes.length - 1}
                                    onClick={() => moveAttr(attr.attribute_id, 'down')}
                                    style={{ padding: '0 4px' }}
                                  />
                                </Tooltip>
                                <Tooltip title={isDisabled ? 'Activar atributo' : 'Excluir de combinaciones'}>
                                  <Switch
                                    size="small"
                                    checked={!isDisabled}
                                    onChange={(checked) => {
                                      setDisabledAttrs((prev) => {
                                        const next = new Set(prev);
                                        checked ? next.delete(attrId) : next.add(attrId);
                                        return next;
                                      });
                                    }}
                                    style={{ marginLeft: 2 }}
                                  />
                                </Tooltip>
                              </Space>
                            </Row>
                          }
                          style={{
                            marginBottom: 10, borderRadius: 8,
                            borderColor: isDisabled ? '#ddd' : '#e8f0eb',
                            opacity: isDisabled ? 0.55 : 1,
                          }}
                          bodyStyle={{ paddingTop: 8, paddingBottom: 8 }}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            {attrValues.map((v) => {
                              const vid = String(v.value_id ?? v.id);
                              return (
                                <Checkbox
                                  key={vid}
                                  checked={selectedValueIds.has(vid)}
                                  disabled={isDisabled}
                                  onChange={(e) => {
                                    setSelectedValueIds((prev) => {
                                      const next = new Set(prev);
                                      e.target.checked ? next.add(vid) : next.delete(vid);
                                      return next;
                                    });
                                  }}
                                >
                                  {v.value ?? v.name}
                                </Checkbox>
                              );
                            })}
                          </Space>
                        </Card>
                      );
                    })
                  )}
                </div>
              </Col>

              <Col span={14}>
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, minHeight: 200 }}>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                    <Text strong style={{ color: PRIMARY, fontSize: 13 }}>Preview de combinaciones</Text>
                    <Tag color={includedCombos.size > 0 ? 'green' : 'default'}>
                      {includedCombos.size} a generar
                    </Tag>
                  </Row>
                  {combos.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Selecciona al menos un valor para ver combinaciones" />
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <Table
                        size="small"
                        rowKey="idx"
                        pagination={false}
                        dataSource={combos}
                        columns={[
                          {
                            title: 'Incluir', width: 52, align: 'center',
                            render: (_, row) => (
                              <Checkbox
                                checked={includedCombos.has(row.idx)}
                                onChange={(e) => {
                                  setIncludedCombos((prev) => {
                                    const next = new Set(prev);
                                    e.target.checked ? next.add(row.idx) : next.delete(row.idx);
                                    return next;
                                  });
                                }}
                              />
                            ),
                          },
                          {
                            title: 'Nombre', dataIndex: 'combo',
                            render: (_, row) => (
                              <Text style={{ fontSize: 11, fontWeight: 500 }}>
                                {nameForCombo(row.combo)}
                              </Text>
                            ),
                          },
                          {
                            title: 'SKU', dataIndex: 'combo',
                            render: (_, row) => <Text code style={{ fontSize: 11 }}>{skuForCombo(row.combo)}</Text>,
                          },
                        ]}
                        style={{ borderRadius: 8 }}
                      />
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />
            <Row justify="space-between">
              <Button icon={<ArrowLeftOutlined />} onClick={() => setWizardStep(0)} style={{ borderRadius: 8 }}>
                Anterior
              </Button>
              <Space>
                <Button onClick={closeWizard} style={{ borderRadius: 8 }}>
                  {combos.length === 0 ? 'Cerrar' : 'Omitir variantes'}
                </Button>
                {combos.length > 0 && (
                  <>
                    <Button loading={generatingVariants} onClick={() => handleGenerateVariants(true)}
                      style={{ borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR, borderRadius: 8, fontWeight: 600 }}>
                      Guardar y Nuevo
                    </Button>
                    <Button type="primary" loading={generatingVariants} onClick={() => handleGenerateVariants(false)}
                      style={{ background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8 }}>
                      Guardar y Cerrar
                    </Button>
                  </>
                )}
              </Space>
            </Row>
          </>
        )}
      </Modal>

      {/* DRAWER VARIANTES */}
      <Drawer
        title={
          <Text strong style={{ color: PRIMARY, fontSize: 15 }}>
            Variantes de: {drawerProduct?.name}
          </Text>
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setVariants([]); setCheckedVariants([]); }}
        width={680}
        extra={
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={openVariantsFromDrawer}
            style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
          >
            Generar más variantes
          </Button>
        }
      >
        {checkedVariants.length > 0 && (
          <div style={{
            background: '#f0f7f4', border: `1.5px solid ${ACTIVE_COLOR}`, borderRadius: 8,
            padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <Badge count={checkedVariants.length} style={{ backgroundColor: PRIMARY }} />
            <Text strong style={{ fontSize: 12, color: PRIMARY }}>{checkedVariants.length} seleccionada(s)</Text>
            <Divider type="vertical" />
            <Space size={6} wrap>
              <Button size="small" icon={<CheckOutlined />} loading={bulkVariantLoading}
                onClick={() => handleBulkVariants('activate')}
                style={{ borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR, fontWeight: 600, borderRadius: 6 }}>Activar</Button>
              <Button size="small" icon={<StopOutlined />} loading={bulkVariantLoading}
                onClick={() => handleBulkVariants('deactivate')}
                style={{ borderColor: '#faad14', color: '#faad14', fontWeight: 600, borderRadius: 6 }}>Inactivar</Button>
              <Popconfirm title={`¿Eliminar ${checkedVariants.length} variante(s)?`}
                okText="Eliminar" okType="danger" cancelText="Cancelar"
                onConfirm={() => handleBulkVariants('delete')}>
                <Button size="small" danger icon={<DeleteOutlined />} loading={bulkVariantLoading}
                  style={{ fontWeight: 600, borderRadius: 6 }}>Eliminar</Button>
              </Popconfirm>
              <Button size="small" icon={<CloseOutlined />} onClick={() => setCheckedVariants([])} style={{ borderRadius: 6 }}>
                Limpiar
              </Button>
            </Space>
          </div>
        )}

        <Table
          rowKey={(r) => String(r.variant_id)}
          size="small"
          loading={{
            spinning: loadingVariants,
            indicator: <LoadingOutlined style={{ fontSize: 22, color: PRIMARY }} spin />,
          }}
          dataSource={variants}
          rowSelection={{
            selectedRowKeys: checkedVariants,
            onChange: (keys) => setCheckedVariants(keys),
            columnWidth: 40,
          }}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin variantes. Usa 'Generar más variantes' para crearlas." /> }}
          columns={[
            {
              title: 'Nombre',
              render: (_, record) => {
                const attrValues = (record.attributes ?? []).map((a) => a.value?.value).filter(Boolean);
                const fullName = attrValues.length > 0
                  ? `${drawerProduct?.name ?? ''} ${attrValues.join(' ')}`
                  : drawerProduct?.name ?? '';
                return <Text style={{ fontSize: 12, fontWeight: 500 }}>{fullName}</Text>;
              },
            },
            {
              title: 'SKU', dataIndex: 'sku_variant',
              render: (t) => <Text code style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: 'Atributos', dataIndex: 'attributes',
              render: (attrs) => (
                <Space wrap size={4}>
                  {(attrs ?? []).map((a, i) => (
                    <Tag key={i} color="geekblue" style={{ fontSize: 11 }}>
                      {a.value?.attribute?.name}: {a.value?.value}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: 'Estado', dataIndex: 'is_active', width: 90, align: 'center',
              render: (active) => active
                ? <Tag color="success" style={{ fontWeight: 600 }}>Activo</Tag>
                : <Tag color="error" style={{ fontWeight: 600 }}>Inactivo</Tag>,
            },
            {
              title: 'Acciones', key: 'actions', width: 110, align: 'center',
              render: (_, record) => {
                const isBurnt = burntVariantIds.has(String(record.variant_id));
                return (
                  <Space size={6}>
                    <Tooltip title={record.is_active ? 'Inactivar' : 'Activar'}>
                      <Button size="small"
                        icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                        onClick={() => handleToggleVariant(record)}
                        style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
                      />
                    </Tooltip>
                    {isBurnt ? (
                      <Tooltip title="Esta variante ya fue usada, solo puedes inactivarla">
                        <Button size="small" danger icon={<DeleteOutlined />} disabled />
                      </Tooltip>
                    ) : (
                      <Popconfirm title="¿Eliminar esta variante?" okText="Eliminar" okType="danger"
                        cancelText="Cancelar" onConfirm={() => handleDeleteVariant(record)}>
                        <Tooltip title="Eliminar">
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </Drawer>
    </div>
  );
};

export default ProductsPage;
