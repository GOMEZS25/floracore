const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Usuario simulado — luego lo reemplazamos con Prisma + MySQL
const usuarioSimulado = {
    id: 1,
    email: 'admin@floracore.com',
    // contraseña real: "admin123"
    password: '$2b$10$mf6h0.wjASuxG9sKmLL19OZ.A.lAjjiIbUQseNBd23MD371kzIjna',
    rol: 'admin'
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar que lleguen los campos
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // 2. Buscar usuario (simulado por ahora)
        if (email !== usuarioSimulado.email) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 3. Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuarioSimulado.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 4. Generar token JWT
        const token = jwt.sign(
            { id: usuarioSimulado.id, rol: usuarioSimulado.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Login exitoso',
            token,
            usuario: {
                id: usuarioSimulado.id,
                email,
                rol: usuarioSimulado.rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { login };