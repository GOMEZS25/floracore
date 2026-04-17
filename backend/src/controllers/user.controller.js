const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

const USER_MODULES = [
    'PRODUCTS', 'INVENTORY', 'FARM', 'SALES', 'CLIENTS', 'SETTINGS', 'REPORTS',
];

const USER_SELECT = {
    user_id: true,
    full_name: true,
    email: true,
    role_id: true,
    is_active: true,
    is_super_admin: true,
    created_at: true,
    role: { select: { role_id: true, name: true } },
    permissions: {
        select: {
            permission_id: true,
            module: true,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true,
        },
    },
};

const crearUsuario = async (req, res) => {
    try {

        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ mensaje: 'Los campos full_name, email y password son obligatorios' });
        }

        const emailExistente = await prisma.user.findUnique({ where: { email } });
        if (emailExistente) {
            return res.status(400).json({ mensaje: 'Ya existe un usuario con ese email' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const usuario = await prisma.$transaction(async (tx) => {
            const nuevo = await tx.user.create({
                data: {
                    full_name: full_name.trim(),
                    email: email.toLowerCase().trim(),
                    password_hash,
                    is_active: true,
                    is_super_admin: false,
                },
                select: USER_SELECT,
            });

            await tx.userPermission.createMany({
                data: USER_MODULES.map((module) => ({
                    user_id: nuevo.user_id,
                    module,
                    can_view: false,
                    can_create: false,
                    can_edit: false,
                    can_delete: false,
                })),
            });

            return tx.user.findUnique({ where: { user_id: nuevo.user_id }, select: USER_SELECT });
        });

        res.status(201).json({
            mensaje: 'Usuario creado correctamente',
            data: serializeBigInt(usuario),
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const { full_name, email, role_id, is_active } = req.query;

        const where = {};
        if (full_name) where.full_name = { contains: full_name };
        if (email) where.email = { contains: email };
        if (role_id) where.role_id = parseInt(role_id, 10);
        if (is_active !== undefined && is_active !== '') {
            where.is_active = is_active === 'true';
        }

        const usuarios = await prisma.user.findMany({
            where,
            select: USER_SELECT,
            orderBy: { full_name: 'asc' },
        });

        res.status(200).json(usuarios.map(serializeBigInt));
    } catch (error) {
        console.error('Error al listar usuarios:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const obtenerUsuario = async (req, res) => {
    try {
        const userId = BigInt(req.params.id);

        const usuario = await prisma.user.findUnique({
            where: { user_id: userId },
            select: USER_SELECT,
        });

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.status(200).json({ mensaje: 'Usuario obtenido correctamente', data: serializeBigInt(usuario) });
    } catch (error) {
        console.error('Error al obtener usuario:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const userId = BigInt(req.params.id);
        const { full_name, email, role_id } = req.body;

        const usuario = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const data = {};
        if (full_name !== undefined) data.full_name = full_name.trim();
        if (role_id !== undefined) data.role_id = parseInt(role_id, 10);

        if (email !== undefined) {
            const normalizedEmail = email.toLowerCase().trim();
            if (normalizedEmail !== usuario.email) {
                const duplicado = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (duplicado) {
                    return res.status(400).json({ mensaje: 'Ya existe un usuario con ese email' });
                }
            }
            data.email = normalizedEmail;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ mensaje: 'Debe enviar al menos un campo para actualizar (full_name, email, role_id)' });
        }

        const actualizado = await prisma.user.update({
            where: { user_id: userId },
            data,
            select: USER_SELECT,
        });

        res.status(200).json({
            mensaje: 'Usuario actualizado correctamente',
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const toggleUsuario = async (req, res) => {
    try {
        const userId = BigInt(req.params.id);
        const solicitanteId = BigInt(req.usuario.id);

        if (userId === solicitanteId) {
            return res.status(400).json({ mensaje: 'No puedes inactivarte a ti mismo' });
        }

        const usuario = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (usuario.is_super_admin) {
            return res.status(400).json({ mensaje: 'No se puede cambiar el estado de un super administrador' });
        }

        const actualizado = await prisma.user.update({
            where: { user_id: userId },
            data: { is_active: !usuario.is_active },
            select: USER_SELECT,
        });

        const estado = actualizado.is_active ? 'activado' : 'inactivado';
        res.status(200).json({
            mensaje: `Usuario ${estado} correctamente`,
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al cambiar estado de usuario:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const userId = BigInt(req.params.id);
        const { new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({ mensaje: 'El campo new_password es obligatorio' });
        }

        const usuario = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (usuario.is_super_admin) {
            return res.status(403).json({ mensaje: 'No se puede cambiar la contraseña de un super administrador' });
        }


        const password_hash = await bcrypt.hash(new_password, 10);

        await prisma.user.update({
            where: { user_id: userId },
            data: { password_hash },
        });

        res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al resetear contraseña:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const obtenerPermisos = async (req, res) => {
    try {
        const userId = BigInt(req.params.id);

        const usuario = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const permisos = await prisma.userPermission.findMany({
            where: { user_id: userId },
            select: {
                permission_id: true,
                module: true,
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: true,
            },
            orderBy: { module: 'asc' },
        });

        res.status(200).json({
            mensaje: 'Permisos obtenidos correctamente',
            data: serializeBigInt(permisos),
        });
    } catch (error) {
        console.error('Error al obtener permisos:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const actualizarPermisos = async (req, res) => {
    try {
        const userId = BigInt(req.params.id);
        const { permisos } = req.body;

        if (!Array.isArray(permisos) || permisos.length === 0) {
            return res.status(400).json({ mensaje: 'El campo permisos debe ser un array no vacío' });
        }

        const usuario = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (usuario.is_super_admin) {
            return res.status(400).json({ mensaje: 'No se pueden modificar permisos de un super administrador' });
        }

        const modulosValidos = new Set(USER_MODULES);
        for (const p of permisos) {
            if (!modulosValidos.has(p.module)) {
                return res.status(400).json({ mensaje: `Módulo inválido: ${p.module}` });
            }
        }

        const resultado = await prisma.$transaction(
            permisos.map(({ module, can_view, can_create, can_edit, can_delete }) =>
                prisma.userPermission.upsert({
                    where: { user_id_module: { user_id: userId, module } },
                    update: {
                        can_view: can_view ?? false,
                        can_create: can_create ?? false,
                        can_edit: can_edit ?? false,
                        can_delete: can_delete ?? false,
                    },
                    create: {
                        user_id: userId,
                        module,
                        can_view: can_view ?? false,
                        can_create: can_create ?? false,
                        can_edit: can_edit ?? false,
                        can_delete: can_delete ?? false,
                    },
                    select: {
                        permission_id: true,
                        module: true,
                        can_view: true,
                        can_create: true,
                        can_edit: true,
                        can_delete: true,
                    },
                })
            )
        );

        res.status(200).json({
            mensaje: 'Permisos actualizados correctamente',
            data: serializeBigInt(resultado),
        });
    } catch (error) {
        console.error('Error al actualizar permisos:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

module.exports = {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    toggleUsuario,
    resetPassword,
    obtenerPermisos,
    actualizarPermisos,
};