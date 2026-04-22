const express = require('express');
const router = express.Router();

const { obtenerPreferencia, guardarPreferencia } = require('../controllers/userPreference.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/:key', verificarToken, obtenerPreferencia);
router.put('/:key', verificarToken, guardarPreferencia);

module.exports = router;
