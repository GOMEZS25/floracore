const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkPermission = (module, action) => {
    return async (req, res, next) => {
        try {
            const userId = BigInt(req.usuario.id);

            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { is_super_admin: true },
            });

            if (!user) {
                return res.status(401).json({ mensaje: 'Usuario no encontrado' });
            }

            if (user.is_super_admin) {
                return next();
            }

            const permiso = await prisma.userPermission.findUnique({
                where: { user_id_module: { user_id: userId, module } },
                select: { [action]: true },
            });

            if (!permiso || !permiso[action]) {
                return res.status(403).json({
                    mensaje: `No tienes permiso para ${action} en el módulo ${module}`,
                });
            }

            next();
        } catch (error) {
            console.error('Error en checkPermission:', error.message);
            res.status(500).json({ mensaje: 'Error al verificar permisos', detalle: error.message });
        }
    };
};

module.exports = { checkPermission };
