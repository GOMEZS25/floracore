const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

//Crear categoria
const crearCategoria = async (req, res) => {
    try {

        const { name, reference, } = req.body;

        //Obtener el id del usuario que genera la categoria.
        const { id } = req.usuario;
        const createdBy = BigInt(id);

        //Validar campos
        if (!name || !reference) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        //Validar datos duplicados, categoria por nombre y referencia
        const categoryExists = await prisma.category.findFirst({
            where: {
                OR: [
                    { name },
                    { reference }
                ]
            }
        });

        if (categoryExists) {
            return res.status(400).json({ mensaje: 'La categoria o referencia ya existe' });
        }

        //Objeto que contiene los datos 
        const data = {
            name,
            reference,
            created_by: createdBy
        }

        const crearCategoria = await prisma.category.create({ data });

        //Serializar la respuesta
        res.status(201).json(serializeBigInt(crearCategoria));

    } catch (error) {
        console.error('Error al crear categoria:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

//Listar categorias
const listarCategorias = async (req, res) => {
    try {

        const categorias = await prisma.category.findMany({
            select: {
                category_id: true,
                name: true,
                reference: true,
                created_by: true,
                created_at: true,
            }
        });

        //Serializar la respuesta
        const categoriasSerializadas = categorias.map(serializeBigInt);
        res.json(categoriasSerializadas);

    } catch (error) {
        console.error('Error al listar categorias:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

module.exports = { crearCategoria, listarCategorias };