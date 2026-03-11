const express = require('express');
const router = express.Router();
const { login } = require('../controllers/auth.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/login', login);

router.get('/perfil', verificarToken, (req, res) => {
    res.json({ mensaje: 'Ruta protegida', user: req.user });
});


module.exports = router;

