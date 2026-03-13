const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');


//Crear producto
const crearProducto = async (req, res) => {
    try {
        const { name, sku, unit_of_measure, category } = req.body;

        //obtener el usuario que esta creando el producto
        /*const { id: userId } = req.usuario;*/

        //Validar campos
        if (!name || !sku || !unit_of_measure || !category) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        //Validar datos duplicados
        const productExists = await prisma.product.findFirst({
            where: {
                OR: [
                    { name },
                    { sku }
                ]
            }
        });

        if (productExists) {
            return res.status(400).json({ mensaje: 'El producto o SKU ya existe' });
        }

        //Validar que la categoria exista
        const categoria = await prisma.category.findUnique({
            where: {
                category_id: BigInt(category)
            }
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoria no encontrada' });
        }

        //Objeto que contiene los datos 
        const data = {
            name,
            sku,
            unit_of_measure,
            category: {
                connect: {
                    category_id: BigInt(category)
                }
            }
        }

        const productoCreado = await prisma.product.create({ data });

        //Serializar la respuesta
        res.status(201).json(serializeBigInt(productoCreado));

    } catch (error) {
        console.error('Error al crear producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}


//Listar productos
const listarProductos = async (req, res) => {
    try {
        const Product = await prisma.product.findMany({
            where: {
                is_active: true
            },
            select: {
                product_id: true,
                name: true,
                sku: true,
                unit_of_measure: true,
                category: {
                    select: {
                        name: true
                    }
                },
            }
        })

        //Serializar la respuesta
        const ProductSerializado = Product.map(serializeBigInt);
        res.status(200).json(ProductSerializado);

    } catch (error) {
        console.error('Error al listar productos:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }

}

//Actualizar Productos

const actualizarProducto = async (req, res) => {
    try {
        const { id: product_id } = req.params;
        const { name, sku, unit_of_measure, category } = req.body;

        //Validar campos
        if (!name || !sku || !unit_of_measure || !category) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        //Validar datos duplicados
        const productExists = await prisma.product.findFirst({
            where: {
                NOT: {
                    product_id: BigInt(product_id)  //esto es para que no se compare con el mismo producto
                },
                OR: [
                    { name },
                    { sku }
                ]
            }
        });

        if (productExists) {
            return res.status(400).json({ mensaje: 'El producto o SKU ya existe' });
        }

        //Validar que la categoria exista
        const categoria = await prisma.category.findUnique({
            where: {
                category_id: BigInt(category)
            }
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoria no encontrada' });
        }

        //Objeto que contiene los datos 
        const data = {
            name,
            sku,
            unit_of_measure,
            category: {
                connect: { category_id: BigInt(category) }
            }
        }


        console.log('data a enviar:', JSON.stringify(serializeBigInt(data), null, 2));

        const productoActualizado = await prisma.product.update({
            where: {
                product_id: BigInt(product_id)
            },
            data
        });

        //Serializar la respuesta
        res.status(200).json(serializeBigInt(productoActualizado));

    } catch (error) {
        console.error('Error al actualizar producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}


//Eliminar Productos
const eliminarProducto = async (req, res) => {
    try {
        const { id: product_id } = req.params;
        const productExists = await prisma.product.findUnique({
            where: {
                product_id: BigInt(product_id)
            }
        });

        if (!productExists) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        //Validar si el producto fue usado
        const productUsed = await prisma.stockMovement.findMany({
            where: {
                product_id: BigInt(product_id)
            }
        });

        if (productUsed.length > 0) {
            const productInactive = await prisma.product.update({
                where: { product_id: BigInt(product_id) },
                data: { is_active: false }
            });

            return res.status(200).json({
                mensaje: 'Producto inactivado por tener movimientos registrados',
                producto: serializeBigInt(productInactive)
            });

        } else {
            await prisma.product.delete({
                where: { product_id: BigInt(product_id) }
            });

            return res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
        }

    } catch (error) {
        console.error('Error al eliminar producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
}

module.exports = { crearProducto, listarProductos, actualizarProducto, eliminarProducto };