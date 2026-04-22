const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');


// CLIENTES


// Crear cliente
const crearCliente = async (req, res) => {
    try {
        const { code, name, origin, currency, delivery_terms } = req.body;

        // Validar campos obligatorios
        if (!code || !name || !origin || !currency || !delivery_terms) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        // Validar que el código no exista
        const clienteExistente = await prisma.client.findUnique({
            where: { code }
        });

        if (clienteExistente) {
            return res.status(400).json({ mensaje: 'Ya existe un cliente con ese código' });
        }

        // Crear el cliente
        const clienteCreado = await prisma.client.create({
            data: {
                code,
                name,
                origin,
                currency,
                delivery_terms,
                created_by: BigInt(req.usuario.id),
            }
        });

        return res.status(201).json({
            mensaje: 'Cliente creado exitosamente',
            data: serializeBigInt(clienteCreado),
        });

    } catch (error) {
        console.error('Error al crear cliente:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ──────────────────────────────────────────────

// Listar clientes activos o inactivos
const listarClientes = async (req, res) => {
    try {
        const { is_active } = req.query;
        let whereClause = {};

        if (is_active === 'true') {
            whereClause.is_active = true;
        } else if (is_active === 'false') {
            whereClause.is_active = false;
        }

        const clientes = await prisma.client.findMany({
            where: whereClause,
            include: {
                addresses: {
                    where: { is_active: true },
                    take: 1
                },
                contacts: {
                    where: { is_active: true },
                    take: 1
                }
            },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json({
            mensaje: 'Clientes listados exitosamente',
            data: clientes.map(serializeBigInt),
        });

    } catch (error) {
        console.error('Error al listar clientes:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ──────────────────────────────────────────────

// Obtener un cliente por ID (con direcciones y contactos)
const obtenerCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const cliente = await prisma.client.findUnique({
            where: { client_id: BigInt(id) },
            include: {
                addresses: {
                    where: { is_active: true },
                    select: {
                        address_id: true,
                        address_type: true,
                        address_line: true,
                        city: true,
                        country: true,
                    }
                },
                contacts: {
                    where: { is_active: true },
                    select: {
                        contact_id: true,
                        full_name: true,
                        email: true,
                        phone: true,
                        role: true,
                    }
                }
            }
        });

        if (!cliente || !cliente.is_active) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        }

        return res.status(200).json({
            mensaje: 'Cliente obtenido exitosamente',
            data: serializeBigInt(cliente),
        });

    } catch (error) {
        console.error('Error al obtener cliente:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ──────────────────────────────────────────────

// Actualizar cliente
const actualizarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, origin, currency, delivery_terms, status } = req.body;

        // Validar campos obligatorios
        if (!code || !name || !origin || !currency || !delivery_terms) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        // Validar que el cliente exista
        const clienteExistente = await prisma.client.findUnique({
            where: { client_id: BigInt(id) }
        });

        if (!clienteExistente || !clienteExistente.is_active) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        }

        // Validar que el código no lo use otro cliente
        const codigoDuplicado = await prisma.client.findFirst({
            where: {
                code,
                NOT: { client_id: BigInt(id) }
            }
        });

        if (codigoDuplicado) {
            return res.status(400).json({ mensaje: 'El código ya está en uso por otro cliente' });
        }

        // Actualizar
        const clienteActualizado = await prisma.client.update({
            where: { client_id: BigInt(id) },
            data: { code, name, origin, currency, delivery_terms, status }
        });

        return res.status(200).json({
            mensaje: 'Cliente actualizado exitosamente',
            data: serializeBigInt(clienteActualizado),
        });

    } catch (error) {
        console.error('Error al actualizar cliente:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};



// Desactivar cliente (eliminación lógica)
const desactivarCliente = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el cliente exista
        const clienteExistente = await prisma.client.findUnique({
            where: { client_id: BigInt(id) }
        });

        if (!clienteExistente || !clienteExistente.is_active) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado o ya inactivo' });
        }

        // Desactivar cliente, direcciones y contactos en una transacción
        await prisma.$transaction(async (tx) => {
            await tx.clientAddress.updateMany({
                where: { client_id: BigInt(id) },
                data: { is_active: false }
            });

            await tx.clientContact.updateMany({
                where: { client_id: BigInt(id) },
                data: { is_active: false }
            });

            await tx.client.update({
                where: { client_id: BigInt(id) },
                data: { is_active: false, status: 'INACTIVO' }
            });
        });

        return res.status(200).json({ mensaje: 'Cliente desactivado exitosamente' });

    } catch (error) {
        console.error('Error al desactivar cliente:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};


// DIRECCIONES


// Agregar dirección a un cliente
const agregarDireccion = async (req, res) => {
    try {
        const { id } = req.params;
        const { address_type, address_line, city, country } = req.body;

        // Validar campos obligatorios
        if (!address_type || !address_line || !city || !country) {
            return res.status(400).json({ mensaje: 'Todos los campos de dirección son obligatorios' });
        }

        // Validar que el cliente exista
        const clienteExistente = await prisma.client.findUnique({
            where: { client_id: BigInt(id) }
        });

        if (!clienteExistente || !clienteExistente.is_active) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        }

        const direccion = await prisma.clientAddress.create({
            data: {
                client_id: BigInt(id),
                address_type,
                address_line,
                city,
                country,
            }
        });

        return res.status(201).json({
            mensaje: 'Dirección agregada exitosamente',
            data: serializeBigInt(direccion),
        });

    } catch (error) {
        console.error('Error al agregar dirección:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};


// Desactivar dirección
const desactivarDireccion = async (req, res) => {
    try {
        const { address_id } = req.params;

        const direccion = await prisma.clientAddress.findUnique({
            where: { address_id: BigInt(address_id) }
        });

        if (!direccion || !direccion.is_active) {
            return res.status(404).json({ mensaje: 'Dirección no encontrada o ya inactiva' });
        }

        await prisma.clientAddress.update({
            where: { address_id: BigInt(address_id) },
            data: { is_active: false }
        });

        return res.status(200).json({ mensaje: 'Dirección desactivada exitosamente' });

    } catch (error) {
        console.error('Error al desactivar dirección:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};


// CONTACTOS

// Agregar contacto a un cliente
const agregarContacto = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, phone, role } = req.body;

        // Validar que al menos haya un nombre
        if (!full_name && !email && !phone && !role) {
            return res.status(400).json({ mensaje: 'Debe enviar al menos un dato de contacto' });
        }

        // Validar que el cliente exista
        const clienteExistente = await prisma.client.findUnique({
            where: { client_id: BigInt(id) }
        });

        if (!clienteExistente || !clienteExistente.is_active) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        }

        const contacto = await prisma.clientContact.create({
            data: {
                client_id: BigInt(id),
                full_name,
                email,
                phone,
                role,
            }
        });

        return res.status(201).json({
            mensaje: 'Contacto agregado exitosamente',
            data: serializeBigInt(contacto),
        });

    } catch (error) {
        console.error('Error al agregar contacto:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};



// Desactivar contacto
const desactivarContacto = async (req, res) => {
    try {
        const { contact_id } = req.params;

        const contacto = await prisma.clientContact.findUnique({
            where: { contact_id: BigInt(contact_id) }
        });

        if (!contacto || !contacto.is_active) {
            return res.status(404).json({ mensaje: 'Contacto no encontrado o ya inactivo' });
        }

        await prisma.clientContact.update({
            where: { contact_id: BigInt(contact_id) },
            data: { is_active: false }
        });

        return res.status(200).json({ mensaje: 'Contacto desactivado exitosamente' });

    } catch (error) {
        console.error('Error al desactivar contacto:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};



module.exports = {
    crearCliente,
    listarClientes,
    obtenerCliente,
    actualizarCliente,
    desactivarCliente,
    agregarDireccion,
    desactivarDireccion,
    agregarContacto,
    desactivarContacto,
};
