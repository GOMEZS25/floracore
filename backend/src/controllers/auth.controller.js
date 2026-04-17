const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar que lleguen los campos
        if (!email || !password) {
            return res.status(400).json({ mensaje: 'Email y contraseña son requeridos' });
        }

        // 2. Buscar usuario
        const user = await prisma.user.findUnique(
            { where: { email: email } }
        )

        if (!user) {
            return res.status(401).json({ mensaje: 'usuario invalido' });
        }


        // 3. Verificar contraseña
        const passwordValida = await bcrypt.compare(password, user.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }

        // 4. Generar token JWT
        const token = jwt.sign(
            { id: user.user_id.toString(), rol: user.role_id ? user.role_id.toString() : null },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: user.user_id.toString(),
                email,
                rol: user.role_id ?? null
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { login };