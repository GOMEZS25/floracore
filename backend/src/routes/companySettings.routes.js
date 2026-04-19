const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');
const { getCompanySettings, updateCompanySettings } = require('../controllers/companySettings.controller');

// Nota: asumiendo que este router se montará como app.use('/api/settings', companySettingsRoutes)
router.get('/company', verificarToken, checkPermission('SETTINGS', 'can_view'), getCompanySettings);
router.patch('/company', verificarToken, checkPermission('SETTINGS', 'can_edit'), updateCompanySettings);

module.exports = router;
