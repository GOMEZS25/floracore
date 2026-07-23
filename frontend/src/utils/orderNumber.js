// Fase 1: solo formato de presentación. El order_number real (sin ceros)
// sigue siendo el que se usa en la URL, filtros y base de datos.
export const formatOrderNumber = (orderNumber) =>
  `#${String(orderNumber ?? '').padStart(6, '0')}`;
