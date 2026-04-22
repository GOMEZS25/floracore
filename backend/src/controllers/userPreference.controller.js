const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Serializar BigInt a String
const serializeBigInt = (obj) => JSON.parse(
    JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value)
);

// Obtener preferencia
const obtenerPreferencia = async (req, res) => {
    try {
        const { key } = req.params;
        const user_id = BigInt(req.usuario.id);

        const preference = await prisma.userPreference.findUnique({
            where: {
                user_id_preference_key: {
                    user_id: user_id,
                    preference_key: key
                }
            }
        });

        if (!preference) {
            return res.status(200).json({ data: null });
        }

        res.status(200).json({ data: preference.preference_value });
    } catch (error) {
        console.error('Error al obtener preferencia:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor', data: null });
    }
};

// Guardar preferencia
const guardarPreferencia = async (req, res) => {
    try {
        const { key } = req.params;
        const user_id = BigInt(req.usuario.id);
        const { value } = req.body;

        const preference = await prisma.userPreference.upsert({
            where: {
                user_id_preference_key: {
                    user_id: user_id,
                    preference_key: key
                }
            },
            update: {
                preference_value: value
            },
            create: {
                user_id: user_id,
                preference_key: key,
                preference_value: value
            }
        });

        res.status(200).json(serializeBigInt({
            mensaje: 'Preferencia guardada exitosamente',
            data: preference.preference_value
        }));
    } catch (error) {
        console.error('Error al guardar preferencia:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor', data: null });
    }
};

module.exports = {
    obtenerPreferencia,
    guardarPreferencia
};
