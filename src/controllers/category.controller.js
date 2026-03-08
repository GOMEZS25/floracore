const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


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
        const crearCategoriaSerializado = {
            ...crearCategoria,
            category_id: crearCategoria.category_id.toString(),
            created_by: crearCategoria.created_by.toString()
        };

        res.status(201).json(crearCategoriaSerializado);

    } catch (error) {
        console.error('Error al crear categoria:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}


module.exports = { crearCategoria };