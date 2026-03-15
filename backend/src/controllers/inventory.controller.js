const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

//Crear bodega
const crearBodega = async (req, res) => {
    try {
        const { name, description } = req.body;

        //Validar campos
        if (!name) {
            return res.status(400).json({ error: 'El nombre de la bodega es requerido' });
        }

        //Validar que el nombre no exista
        const bodegaExistente = await prisma.inventoryLocation.findUnique({
            where: {
                name
            }
        });
        if (bodegaExistente) {
            return res.status(400).json({ error: 'La bodega ya existe' });
        }

        //Crear bodega
        const bodegas = await prisma.inventoryLocation.create({
            data: {
                name,
                description,
                is_active: true,
            }
        });
        return res.status(201).json(serializeBigInt(bodegas));
    } catch (error) {
        console.error('Error al crear bodega:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
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
                is_active: true,
            }
        });
        return res.status(200).json(serializeBigInt(bodegas));
    } catch (error) {
        console.error('Error al listar bodegas:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}


//actualizar Bodega

const actualizarBodega = async (req, res) => {
    try {
        const { id: location_id } = req.params;
        const { name, description } = req.body;


        //Validar campos obligatorios
        if (!name) {
            return res.status(400).json({ error: 'El nombre de la bodega es requerido' });
        }

        const bodega = await prisma.inventoryLocation.findUnique({
            where: { location_id: parseInt(location_id) }
        });
        if (!bodega) {
            return res.status(404).json({ error: 'La bodega no existe' });
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
            return res.status(400).json({ error: 'La bodega ya existe' });
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
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}


//inactivar bodegas
const inactivarBodega = async (req, res) => {
    try {
        const { id: location_id } = req.params;

        const bodega = await prisma.inventoryLocation.findUnique({
            where: { location_id: parseInt(location_id) }
        });
        //Validar que la bodega exista
        if (!bodega) {
            return res.status(404).json({ error: 'La bodega no existe' });
        }

        //Validar que la bodega no este inactiva
        if (!bodega.is_active) {
            return res.status(400).json({ error: 'La bodega ya esta inactiva' });
        }

        /*Validar que la bodega no tenga productos
        const productos = await prisma.product.findFirst({
            where: {
                location_id: parseInt(location_id)
            }
        });
        if (productos) {
            return res.status(400).json({ error: 'La bodega no puede ser inactivada porque tiene productos asociados' });
        }*/

        //Inactivar bodega
        const bodegas = await prisma.inventoryLocation.update({
            where: {
                location_id: parseInt(location_id)
            },
            data: {
                is_active: false
            }
        });
        return res.status(200).json({ mensaje: 'Bodega inactivada correctamente' });

    } catch (error) {
        console.error('Error al inactivar bodega:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}




module.exports = { crearBodega, listarBodegas, actualizarBodega, inactivarBodega };
