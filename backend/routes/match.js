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

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
      SELECT 
        c.id, c.status, c.theme, c.message_count,
        CASE WHEN c.user1_id = $1 THEN u2.my_name ELSE u1.my_name END as other_username,
        CASE WHEN c.user1_id = $1 THEN u2.profile_image ELSE u1.profile_image END as other_profile_image
      FROM conversations c
      JOIN profiles u1 ON c.user1_id = u1.id
      JOIN profiles u2 ON c.user2_id = u2.id
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
        const pRes = await pool.query('SELECT * FROM profiles WHERE id = $1', [userId]);
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
        // 3. Score is weighted by importance fields (1 to 10) for both sides
        const matchQuery = `
      SELECT id,
        (
          (CASE WHEN $7 LIKE '%' || u.my_hair || '%' OR $7 = 'Any' THEN $11 ELSE 0 END) +
          (CASE WHEN u.my_eyes = $8 OR $8 = 'Any' THEN $12 ELSE 0 END) +
          (CASE WHEN u.my_ethnicity = $9 OR $9 = 'Any' THEN $13 ELSE 0 END) +
          (CASE WHEN u.my_religion = $10 OR $10 = 'Any' THEN $14 ELSE 0 END) +
          (CASE WHEN u.my_age BETWEEN $4 AND $5 THEN $15 ELSE 0 END) +
          (CASE WHEN u.match_hair LIKE '%' || $16 || '%' OR u.match_hair = 'Any' THEN u.match_hair_importance ELSE 0 END) +
          (CASE WHEN $17 = u.match_eyes OR u.match_eyes = 'Any' THEN u.match_eyes_importance ELSE 0 END) +
          (CASE WHEN $18 = u.match_ethnicity OR u.match_ethnicity = 'Any' THEN u.match_ethnicity_importance ELSE 0 END) +
          (CASE WHEN $19 = u.match_religion OR u.match_religion = 'Any' THEN u.match_religion_importance ELSE 0 END) +
          (CASE WHEN $6 BETWEEN u.match_age_min AND u.match_age_max THEN u.match_age_importance ELSE 0 END)
        ) as match_score
      FROM profiles u
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
            p.match_hair, p.match_eyes, p.match_ethnicity, p.match_religion,
            p.match_hair_importance ?? 5, p.match_eyes_importance ?? 5, p.match_ethnicity_importance ?? 5, p.match_religion_importance ?? 5, p.match_age_importance ?? 5,
            p.my_hair, p.my_eyes, p.my_ethnicity, p.my_religion
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
            'SELECT * FROM profiles WHERE id IN ($1, $2)',
            [userId, otherUserId]
        );

        if (usersRes.rows.length !== 2) {
            return res.status(404).json({ error: 'User data missing' });
        }

        const me = usersRes.rows.find(u => u.id === userId);
        const them = usersRes.rows.find(u => u.id === otherUserId);

        // Calculate overlap
        const compatibility = [];

        const checkTrait = (label, myPref, myImportance, theirTrait) => {
            if (!myPref) return; // I didn't care or it's not set
            const matched = myPref === 'Any' || (myPref.includes(theirTrait));

            compatibility.push({
                label,
                preference: myPref,
                importance: myImportance,
                their_trait: theirTrait,
                matched
            });
        };

        checkTrait('Gender', me.match_gender, me.match_gender_importance, them.my_gender);
        checkTrait('Hair Color', me.match_hair, me.match_hair_importance, them.my_hair);
        checkTrait('Eye Color', me.match_eyes, me.match_eyes_importance, them.my_eyes);
        checkTrait('Ethnicity', me.match_ethnicity, me.match_ethnicity_importance, them.my_ethnicity);
        checkTrait('Religion', me.match_religion, me.match_religion_importance, them.my_religion);

        if (me.match_age_min && me.match_age_max) {
            const matched = them.my_age >= me.match_age_min && them.my_age <= me.match_age_max;
            compatibility.push({
                label: 'Age Range',
                preference: `${me.match_age_min} - ${me.match_age_max}`,
                importance: me.match_age_importance,
                their_trait: them.my_age,
                matched
            });
        }

        // Calculate their preferences vs my traits
        const theirCompatibility = [];
        const checkTheirTrait = (label, theirPref, theirImportance, myTrait) => {
            if (!theirPref) return;
            const matched = theirPref === 'Any' || theirPref.includes(myTrait);
            theirCompatibility.push({ matched, importance: theirImportance });
        };

        checkTheirTrait('Gender', them.match_gender, them.match_gender_importance, me.my_gender);
        checkTheirTrait('Hair Color', them.match_hair, them.match_hair_importance, me.my_hair);
        checkTheirTrait('Eye Color', them.match_eyes, them.match_eyes_importance, me.my_eyes);
        checkTheirTrait('Ethnicity', them.match_ethnicity, them.match_ethnicity_importance, me.my_ethnicity);
        checkTheirTrait('Religion', them.match_religion, them.match_religion_importance, me.my_religion);

        if (them.match_age_min && them.match_age_max) {
            theirCompatibility.push({
                matched: me.my_age >= them.match_age_min && me.my_age <= them.match_age_max,
                importance: them.match_age_importance
            });
        }

        // Compute total percentage based on both sides' preferences
        let totalPossiblePoints = 0;
        let totalEarnedPoints = 0;

        // My strict preferences (not 'Any') vs Their Traits
        compatibility.forEach(c => {
            if (c.preference !== 'Any') {
                const points = c.importance ?? 5;
                totalPossiblePoints += points;
                if (c.matched) totalEarnedPoints += points;
            }
        });

        // Their strict preferences (not 'Any') vs My Traits
        // We map their compatibility boolean array back to the original checks slightly manually here
        const theirPrefList = [them.match_gender, them.match_hair, them.match_eyes, them.match_ethnicity, them.match_religion, 'Age']; // Age is implicitly a strict preference if min/max set
        theirCompatibility.forEach((c, idx) => {
            if (theirPrefList[idx] !== 'Any') {
                const points = c.importance ?? 5;
                totalPossiblePoints += points;
                if (c.matched) totalEarnedPoints += points;
            }
        });

        // Handle edge case where no strict preferences exist on either side
        let percentage = 100;
        if (totalPossiblePoints > 0) {
            percentage = Math.round((totalEarnedPoints / totalPossiblePoints) * 100);
        }

        res.json({ compatibility, percentage });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
