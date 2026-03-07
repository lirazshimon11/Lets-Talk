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

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
      SELECT 
        c.id, c.status, c.theme, c.message_count,
        CASE WHEN c.user1_id = $1 THEN u2.username ELSE u1.username END as other_username,
        CASE WHEN c.user1_id = $1 THEN u2.profile_image ELSE u1.profile_image END as other_profile_image
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY c.created_at DESC
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/search', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get current user's preferences
        const pRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (pRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const p = pRes.rows[0];

        // Ensure user filled out age to allow age-based matching
        if (!p.my_age || !p.match_age_min || !p.match_age_max) {
            return res.status(400).json({ error: 'Please update your age and age preferences in Settings before searching.' });
        }

        // Find a perfect match
        // Conditions:
        // 1. Their gender matches what I'm looking for (or I want Any)
        // 2. My gender matches what they're looking for (or they want Any)
        // 3. Age overlap adds heavily to the "match_score" (weighted 2 points each)
        // 4. Physical traits add to the "match_score" (weighted 1 point each)
        // 5. Gender is the ONLY strict filter.
        const matchQuery = `
      SELECT id,
        (
          (CASE WHEN u.my_hair = $7 OR $7 = 'Any' THEN 1 ELSE 0 END) +
          (CASE WHEN u.my_eyes = $8 OR $8 = 'Any' THEN 1 ELSE 0 END) +
          (CASE WHEN u.my_ethnicity = $9 OR $9 = 'Any' THEN 1 ELSE 0 END) +
          (CASE WHEN u.my_religion = $10 OR $10 = 'Any' THEN 1 ELSE 0 END) +
          (CASE WHEN u.my_age BETWEEN $4 AND $5 THEN 2 ELSE 0 END) +
          (CASE WHEN $6 BETWEEN u.match_age_min AND u.match_age_max THEN 2 ELSE 0 END)
        ) as match_score
      FROM users u
      WHERE id != $1
        AND (u.my_gender = $2 OR $2 = 'Any')
        AND ($3 = u.match_gender OR u.match_gender = 'Any')

        -- Exclude already active or past conversations
        AND NOT EXISTS (
          SELECT 1 FROM conversations c 
          WHERE (c.user1_id = $1 AND c.user2_id = u.id) 
             OR (c.user1_id = u.id AND c.user2_id = $1)
        )
      ORDER BY match_score DESC, RANDOM()
      LIMIT 1
    `;

        const matchParams = [
            userId, p.match_gender, p.my_gender,
            p.match_age_min, p.match_age_max, p.my_age,
            p.match_hair, p.match_eyes, p.match_ethnicity, p.match_religion
        ];

        const matchRes = await pool.query(matchQuery, matchParams);

        if (matchRes.rows.length === 0) {
            return res.json({ conversationId: null, message: 'No matches found right now. Try expanding your preferences.' });
        }

        const matchedUserId = matchRes.rows[0].id;

        // Create a new conversation
        const insertRes = await pool.query(
            'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
            [userId, matchedUserId]
        );

        res.json({ conversationId: insertRes.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:conversationId/compatibility', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        // Verify conversation belongs to user and get the other user's ID
        const convRes = await pool.query(
            'SELECT user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
            [conversationId, userId]
        );

        if (convRes.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found or access denied' });
        }

        const conv = convRes.rows[0];
        const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

        // Fetch both users
        const usersRes = await pool.query(
            'SELECT * FROM users WHERE id IN ($1, $2)',
            [userId, otherUserId]
        );

        if (usersRes.rows.length !== 2) {
            return res.status(404).json({ error: 'User data missing' });
        }

        const me = usersRes.rows.find(u => u.id === userId);
        const them = usersRes.rows.find(u => u.id === otherUserId);

        // Calculate overlap
        const compatibility = [];

        const checkTrait = (label, myPref, theirTrait) => {
            if (!myPref) return; // I didn't care or it's not set
            const matched = myPref === 'Any' || myPref === theirTrait;
            compatibility.push({
                label,
                preference: myPref,
                their_trait: theirTrait,
                matched
            });
        };

        checkTrait('Gender', me.match_gender, them.my_gender);

        if (me.match_age_min && me.match_age_max) {
            const matched = them.my_age >= me.match_age_min && them.my_age <= me.match_age_max;
            compatibility.push({
                label: 'Age Range',
                preference: `${me.match_age_min} - ${me.match_age_max}`,
                their_trait: them.my_age,
                matched
            });
        }

        checkTrait('Hair Color', me.match_hair, them.my_hair);
        checkTrait('Eye Color', me.match_eyes, them.my_eyes);
        checkTrait('Ethnicity', me.match_ethnicity, them.my_ethnicity);
        checkTrait('Religion', me.match_religion, them.my_religion);

        res.json({ compatibility });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
