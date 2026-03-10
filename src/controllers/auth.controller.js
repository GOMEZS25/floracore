const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar que lleguen los campos
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // 2. Buscar usuario
        const user = await prisma.user.findUnique(
            { where: { email: email } }
        )

        if (!user) {
            return res.status(401).json({ error: 'usuario invalido' });
        }


        // 3. Verificar contraseña
        const passwordValida = await bcrypt.compare(password, user.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 4. Generar token JWT
        const token = jwt.sign(
            { id: user.user_id.toString(), rol: user.role_id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Login exitoso',
            token,
            usuario: {
                id: user.user_id.toString(),
                email,
                rol: user.role_id
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { login };