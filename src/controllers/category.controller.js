const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

//Crear categoria
const crearCategoria = async (req, res) => {
    try {

        const { name, reference, } = req.body;

        //Obtener el id del usuario que genera la categoria.
        const { id: categoryId } = req.usuario;
        const createdBy = BigInt(categoryId);

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
        res.status(200).json(categoriasSerializadas);

    } catch (error) {
        console.error('Error al listar categorias:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

//Actualizar categoria
const actualizarCategoria = async (req, res) => {
    try {

        const { id: categoryId } = req.params;
        const { name, reference, is_active } = req.body;

        //Obtener el id del usuario que genera la categoria.
        const { id: userId } = req.usuario;

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
                ],
                NOT: {
                    category_id: BigInt(categoryId)
                }
            }
        });

        if (categoryExists) {
            return res.status(400).json({ mensaje: 'La categoria o referencia ya existe' });
        }

        //Objeto que contiene los datos 
        const data = {
            name,
            reference,
            is_active,
        }

        const actualizarCategoria = await prisma.category.update({
            where: {
                category_id: BigInt(categoryId)
            },
            data
        });

        //Serializar la respuesta
        const actualizarCategoriaSerializada = serializeBigInt(actualizarCategoria);
        res.status(200).json(actualizarCategoriaSerializada);

    } catch (error) {
        console.error('Error al actualizar categoria:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

//Eliminar categoria
const eliminarCategoria = async (req, res) => {
    try {
        const { id: categoryId } = req.params;

        //validar que la categoria exista
        const categoria = await prisma.category.findUnique({
            where: {
                category_id: BigInt(categoryId)
            }
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoria no encontrada' });
        }

        //Validar que la categoria no tenga productos
        const productos = await prisma.product.findFirst({
            where: {
                category_id: BigInt(categoryId)
            }
        });

        if (productos) {
            return res.status(400).json({ mensaje: 'La categoria no puede ser eliminada porque tiene productos asociados' });
        }


        const eliminarCategoria = await prisma.category.delete({
            where: {
                category_id: BigInt(categoryId)
            }
        });

        //Response
        res.status(200).json({ mensaje: 'Categoria eliminada correctamente' });


    } catch (error) {
        console.error('Error al eliminar categoria:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}


module.exports = { crearCategoria, actualizarCategoria, listarCategorias, eliminarCategoria };