const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');


//Crear Lote
const crearLote = async (req, res) => {
    try {
        const {
            product_id,
            location_id,
            cantidad_inicial,
            unidad_medida,
            tipo_caja,
            cantidad_cajas,
            ramos_por_caja,
            tallos_por_ramo,
            zona_corte,
            notas,
        } = req.body;

        console.log('BODY:', req.body);
        console.log('USUARIO:', req.usuario);

        if (!product_id || !location_id || !cantidad_inicial) {
            return res.status(400).json({ mensaje: "Algunos datos son obligatorios" });
        }


        const loteCreado = await prisma.$transaction(async (tx) => {
            //Crear lote con número temporal
            const nuevoLote = await tx.lote.create({
                data: {
                    numero_lote: `TEMP-${Date.now()}`,
                    product_id: BigInt(product_id),
                    location_id: Number(location_id),
                    cantidad_inicial: Number(cantidad_inicial),
                    cantidad_disponible: Number(cantidad_inicial),
                    unidad_medida: 'tallos',
                    tipo_caja: tipo_caja || null,
                    cantidad_cajas: cantidad_cajas || null,
                    ramos_por_caja: ramos_por_caja || null,
                    tallos_por_ramo: tallos_por_ramo || null,
                    zona_corte: zona_corte || null,
                    notas: notas || null,
                    created_by: BigInt(req.usuario.id),
                }
            });


            //Actualizar numero de lote
            const loteActualizado = await tx.lote.update({
                where: { lote_id: nuevoLote.lote_id },
                data: { numero_lote: `LOTE${nuevoLote.lote_id}` }

            });

            // crear StockMovement de ENTRADA
            await tx.stockMovement.create({
                data: {
                    lote_id: nuevoLote.lote_id,
                    movement_type: 'ENTRADA',
                    quantity: Number(cantidad_inicial),
                    created_by: BigInt(req.usuario.id),
                }
            });

            return loteActualizado;
        });

        return res.status(201).json({
            message: 'Lote creado exitosamente',
            data: serializeBigInt(loteCreado),
        });

    } catch (error) {
        console.error("Error al crear Lote", error.message);
        return res.status(500).json({ mensaje: "Error interno del servidor", detalle: error.message });
    }
};

module.exports = {
    crearLote
};
