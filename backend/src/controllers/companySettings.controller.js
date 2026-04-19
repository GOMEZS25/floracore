const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCompanySettings = async (req, res) => {
    try {
        let settings = await prisma.companySettings.findFirst();

        if (!settings) {
            settings = await prisma.companySettings.create({
                data: {
                    inventory_mode: 'TALLOS',
                    show_stems_per_bunch: false,
                    show_bunches_per_box: false,
                    show_box_type: false
                }
            });
        }

        return res.status(200).json({
            mensaje: 'Configuración recuperada exitosamente',
            data: settings
        });
    } catch (error) {
        console.error("Error al obtener configuración de la empresa:", error.message);
        return res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

const updateCompanySettings = async (req, res) => {
    try {
        const { 
            inventory_mode, 
            show_stems_per_bunch, 
            show_bunches_per_box, 
            show_box_type 
        } = req.body;

        if (inventory_mode && !['TALLOS', 'RAMOS', 'CAJAS'].includes(inventory_mode)) {
            return res.status(400).json({ mensaje: "Valor inválido para inventory_mode. Se permite TALLOS, RAMOS o CAJAS" });
        }

        const updateData = {};
        if (inventory_mode !== undefined) updateData.inventory_mode = inventory_mode;
        if (show_stems_per_bunch !== undefined) updateData.show_stems_per_bunch = show_stems_per_bunch;
        if (show_bunches_per_box !== undefined) updateData.show_bunches_per_box = show_bunches_per_box;
        if (show_box_type !== undefined) updateData.show_box_type = show_box_type;

        const settings = await prisma.companySettings.upsert({
            where: { id: 1 },
            update: updateData,
            create: {
                id: 1, 
                inventory_mode: inventory_mode || 'TALLOS',
                show_stems_per_bunch: show_stems_per_bunch !== undefined ? show_stems_per_bunch : false,
                show_bunches_per_box: show_bunches_per_box !== undefined ? show_bunches_per_box : false,
                show_box_type: show_box_type !== undefined ? show_box_type : false
            }
        });

        return res.status(200).json({
            mensaje: "Configuración actualizada exitosamente",
            data: settings
        });
    } catch (error) {
        console.error("Error al actualizar configuración de la empresa:", error.message);
        return res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

module.exports = {
    getCompanySettings,
    updateCompanySettings
};
