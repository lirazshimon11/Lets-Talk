const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
    const header = req.header('Authorization');
    if (!header) return res.status(401).json({ error: 'No token, authorization denied' });

    const token = header.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await pool.query(
            `SELECT 
                my_name, my_country, my_language, my_age, my_height, my_weight, my_gender, my_hair, my_eyes, my_ethnicity, my_religion,
                match_gender, match_hair, match_eyes, match_ethnicity, match_religion, match_age_min, match_age_max 
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const {
        my_name, my_country, my_language, my_age, my_height, my_weight, my_gender, my_hair, my_eyes, my_ethnicity, my_religion,
        match_gender, match_hair, match_eyes, match_ethnicity, match_religion, match_age_min, match_age_max
    } = req.body;

    try {
        await pool.query(
            `UPDATE users SET 
                my_name = $1, my_country = $2, my_language = $3, my_age = $4, my_height = $5, my_weight = $6, 
                my_gender = $7, my_hair = $8, my_eyes = $9, my_ethnicity = $10, my_religion = $11,
                match_gender = $12, match_hair = $13, match_eyes = $14, match_ethnicity = $15, 
                match_religion = $16, match_age_min = $17, match_age_max = $18
             WHERE id = $19`,
            [
                my_name, my_country, my_language, my_age, my_height, my_weight, my_gender, my_hair, my_eyes, my_ethnicity, my_religion,
                match_gender, match_hair, match_eyes, match_ethnicity, match_religion, match_age_min, match_age_max,
                req.user.id
            ]
        );
        res.json({ message: 'Preferences updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
