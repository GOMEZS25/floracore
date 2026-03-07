const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcryptjs');

//Crear usuario
const crearUsuario = async (req, res) => {
    try {
        const { full_name, email, password, is_active, role_id } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            return res.status(400).json({ mensaje: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                full_name,
                email,
                password_hash: hashedPassword,
                is_active,
                role_id
            }
        });

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

//Listar usuarios
const listarUsuarios = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                full_name: true,
                email: true,
                role_id: true,
                is_active: true,
                created_at: true
            }
        });
        const usersSerializados = users.map(user => ({
            ...user,
            user_id: user.user_id.toString()
        }));
        res.json(usersSerializados);
    } catch (error) {
        console.error('Error al listar usuarios:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

//Obtener usuario
const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = BigInt(id);
        const users = await prisma.user.findUnique({
            select: {
                user_id: true,
                full_name: true,
                email: true,
                role_id: true,
                is_active: true,
                created_at: true
            }, where: { user_id: userId }

        });

        if (!users) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }


        const usersSerializados = {
            ...users,
            user_id: users.user_id.toString()
        };
        res.json(usersSerializados);

    } catch (error) {
        console.error('Error al obtener usuario:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

//Actualizar usuario
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = BigInt(id);
        const { full_name, email, password, is_active, role_id } = req.body;

        if (!full_name || !email) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        const user = await prisma.user.findUnique({ where: { user_id: userId } });

        if (!user) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        //Objeto que contiene los datos a actualizar
        const data = {
            full_name,
            email,
            is_active,
            role_id,
        }

        if (password) {
            data.password_hash = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { user_id: userId },
            data: data,  //Objeto que contiene los datos a actualizar
            select: {
                user_id: true,
                full_name: true,
                email: true,
                role_id: true,
                is_active: true,
                created_at: true
            }
        });

        const updatedUserSerializado = {
            ...updatedUser,
            user_id: updatedUser.user_id.toString()
        };

        res.status(200).json(updatedUserSerializado);

    } catch (error) {
        console.error('Error al actualizar usuario:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}
module.exports = { crearUsuario, listarUsuarios, obtenerUsuario, actualizarUsuario };