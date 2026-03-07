const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    const header = req.header('Authorization');
    if (!header) return res.status(401).json({ error: 'No token, authorization denied' });
    const token = header.replace('Bearer ', '');
    try {
        const response = await fetch('https://rutalnhhglcsqmhurqhq.supabase.co/auth/v1/user', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Invalid token');
        const userData = await response.json();
        req.user = { id: userData.id };
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
        CASE WHEN c.user1_id = $2 THEN u2.my_name ELSE u1.my_name END as other_username,
        CASE WHEN c.user1_id = $2 THEN u2.profile_image ELSE u1.profile_image END as other_profile_image
       FROM conversations c
       JOIN profiles u1 ON c.user1_id = u1.id
       JOIN profiles u2 ON c.user2_id = u2.id
       WHERE c.id = $1 AND (c.user1_id = $2 OR c.user2_id = $2)`,
            [conversationId, userId]
        );

        if (convRes.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const conversation = convRes.rows[0];

        const msgRes = await pool.query(
            `SELECT m.id, m.sender_id, m.text, m.created_at, u.my_name as sender_name
       FROM messages m
       JOIN profiles u ON m.sender_id = u.id
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
