const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

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

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;

        const convRes = await pool.query(
            `SELECT c.*, 
        CASE WHEN c.user1_id = $2 THEN u2.username ELSE u1.username END as other_username,
        CASE WHEN c.user1_id = $2 THEN u2.profile_image ELSE u1.profile_image END as other_profile_image
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.id = $1 AND (c.user1_id = $2 OR c.user2_id = $2)`,
            [conversationId, userId]
        );

        if (convRes.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const conversation = convRes.rows[0];

        const msgRes = await pool.query(
            `SELECT m.id, m.sender_id, m.text, m.created_at, u.username as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
            [conversationId]
        );

        res.json({
            conversation,
            messages: msgRes.rows,
            threshold: parseInt(process.env.REVEAL_MESSAGE_COUNT || 10, 10)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
