const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

//Crear bodega
const crearBodega = async (req, res) => {
    try {
        const { name, description, type, parent_id } = req.body;

        //Validar campos
        if (!name) {
            return res.status(400).json({ mensaje: 'El nombre de la bodega es requerido' });
        }

        if (!type) {
            return res.status(400).json({ mensaje: 'El tipo de ubicación es requerido' });
        }

        const bodegaExistente = await prisma.inventoryLocation.findUnique({
            where: {
                name
            }
        });
        if (bodegaExistente) {
            return res.status(400).json({ mensaje: 'La bodega ya existe' });
        }


        const bodegas = await prisma.inventoryLocation.create({
            data: {
                name,
                description,
                type,
                parent_id: parent_id ? parseInt(parent_id) : null,
                is_active: true,
            }
        });
        return res.status(201).json(serializeBigInt(bodegas));
    } catch (error) {
        console.error('Error al crear bodega:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}


//Listar bodegas
const listarBodegas = async (req, res) => {
    try {
        const bodegas = await prisma.inventoryLocation.findMany({
            select: {
                location_id: true,
                name: true,
                description: true,
                type: true,
                parent_id: true,
                is_active: true,
            }
        });
        return res.status(200).json(serializeBigInt(bodegas));
    } catch (error) {
        console.error('Error al listar bodegas:', mensaje);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}


//actualizar Bodega

const actualizarBodega = async (req, res) => {
    try {
        const { id: location_id } = req.params;
        const { name, description } = req.body;


        //Validar campos obligatorios
        if (!name) {
            return res.status(400).json({ mensaje: 'El nombre de la bodega es requerido' });
        }

        const bodega = await prisma.inventoryLocation.findUnique({
            where: { location_id: parseInt(location_id) }
        });
        if (!bodega) {
            return res.status(404).json({ mensaje: 'La bodega no existe' });
        }
        //Validar que el nombre no exista
        const bodegaExistente = await prisma.inventoryLocation.findFirst({
            where: {
                name: name,
                NOT: {
                    location_id: parseInt(location_id)
                }
            }
        });

        if (bodegaExistente) {
            return res.status(400).json({ mensaje: 'La bodega ya existe' });
        }

        //Actualizar bodega
        const bodegas = await prisma.inventoryLocation.update({
            where: {
                location_id: parseInt(location_id)
            },
            data: {
                name,
                description
            }
        });
        return res.status(200).json(serializeBigInt(bodegas));


    } catch (error) {
        console.error('Error al actualizar bodega:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}


//inactivar bodegas
const toggleBodega = async (req, res) => {
    try {
        const { id: location_id } = req.params;

        const bodega = await prisma.inventoryLocation.findUnique({
            where: { location_id: parseInt(location_id) }
        });

        if (!bodega) {
            return res.status(404).json({ mensaje: 'La ubicación no existe' });
        }

        const actualizada = await prisma.inventoryLocation.update({
            where: { location_id: parseInt(location_id) },
            data: { is_active: !bodega.is_active }
        });

        return res.status(200).json({
            mensaje: `Ubicación ${actualizada.is_active ? 'activada' : 'inactivada'} correctamente`,
            data: actualizada
        });

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};




module.exports = { crearBodega, listarBodegas, actualizarBodega, toggleBodega };
