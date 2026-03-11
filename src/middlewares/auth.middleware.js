const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {

    // aquí va la lógica
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' })
        }
        req.usuario = user;
        next();
    })


};

module.exports = { verificarToken };