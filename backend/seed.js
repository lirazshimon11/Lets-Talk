const pool = require('./db');
const bcrypt = require('bcrypt');

const FIRST_NAMES_M = ['Alex', 'Jordan', 'Taylor', 'Liam', 'Noah', 'Oliver', 'James', 'William', 'Benjamin', 'Lucas'];
const FIRST_NAMES_F = ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const HAIR_COLORS = ['Blonde', 'Brunette', 'Black', 'Red', 'Other'];
const EYE_COLORS = ['Blue', 'Green', 'Brown', 'Hazel', 'Other'];
const ETHNICITIES = ['Caucasian', 'African American', 'Asian', 'Hispanic', 'Mixed', 'Other'];
const RELIGIONS = ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Atheist', 'Other'];
const COUNTRIES = ['US', 'Israel', 'France', 'Brazil', 'Spain', 'India'];
const LANGUAGES = ['English', 'Hebrew', 'French', 'Portuguese', 'Spanish', 'Hindi'];

function randomEl(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gives a specific percentage chance to return "Any", otherwise picks a random element
function randomPrefOrAny(arr, chanceOfAny = 0.15) {
    return Math.random() < chanceOfAny ? 'Any' : randomEl(arr);
}

async function seed() {
    let client;
    try {
        client = await pool.connect();
        console.log('Dropping old tables to enforce new strict schema...');
        await client.query('DROP TABLE IF EXISTS messages CASCADE;');
        await client.query('DROP TABLE IF EXISTS conversations CASCADE;');
        await client.query('DROP TABLE IF EXISTS users CASCADE;');

        console.log('Recreating tables...');

        // CREATE USERS
        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                profile_image TEXT,
                
                my_name VARCHAR(255),
                my_country VARCHAR(100),
                my_language VARCHAR(50),
                my_age INTEGER,
                my_height VARCHAR(50),
                my_weight VARCHAR(50),
                my_gender VARCHAR(50),
                my_hair VARCHAR(50),
                my_eyes VARCHAR(50),
                my_ethnicity VARCHAR(100),
                my_religion VARCHAR(100),
                
                match_gender VARCHAR(50),
                match_hair VARCHAR(50),
                match_eyes VARCHAR(50),
                match_ethnicity VARCHAR(100),
                match_religion VARCHAR(100),
                match_age_min INTEGER,
                match_age_max INTEGER,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // CREATE CONVERSATIONS
        await client.query(`
            CREATE TABLE conversations (
                id SERIAL PRIMARY KEY,
                user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'active', -- 'active', 'revealed', 'ended'
                theme VARCHAR(50) DEFAULT 'default',
                message_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // CREATE MESSAGES
        await client.query(`
            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Seeding 20 fake realistic users...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);

        for (let i = 1; i <= 20; i++) {
            const username = `dummyuser${i}`;

            // Assign realistic gender distributions
            const my_gender = Math.random() < 0.5 ? 'Male' : 'Female'; // Simplify to standard binaries for dummy realism
            const firstName = my_gender === 'Male' ? randomEl(FIRST_NAMES_M) : randomEl(FIRST_NAMES_F);
            const my_name = `${firstName} ${randomEl(LAST_NAMES)}`;

            // Heterosexual matches are statistically most common, let's make most dummy users heterosexual
            const match_gender = Math.random() < 0.85 ? (my_gender === 'Male' ? 'Female' : 'Male') : 'Any';

            const my_age = randInt(18, 50);
            const match_age_min = Math.max(18, my_age - randInt(1, 5));
            const match_age_max = my_age + randInt(1, 10);

            let my_country, my_language;
            if (i <= 10) {
                my_country = 'US';
                my_language = 'English';
            } else {
                my_country = randomEl(COUNTRIES);
                my_language = randomEl(LANGUAGES);
            }

            try {
                await client.query(
                    `INSERT INTO users (
                        username, password_hash, 
                        my_name, my_country, my_language, my_age, my_height, my_weight, my_gender, my_hair, my_eyes, my_ethnicity, my_religion,
                        match_gender, match_hair, match_eyes, match_ethnicity, match_religion, match_age_min, match_age_max
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
                    [
                        username, hash,
                        my_name, my_country, my_language, my_age, `${randInt(150, 190)} cm`, `${randInt(50, 100)} kg`, my_gender,
                        randomEl(HAIR_COLORS), randomEl(EYE_COLORS), randomEl(ETHNICITIES), randomEl(RELIGIONS),

                        match_gender,
                        randomPrefOrAny(HAIR_COLORS, 0.4),
                        randomPrefOrAny(EYE_COLORS, 0.4),
                        randomPrefOrAny(ETHNICITIES, 0.5),
                        randomPrefOrAny(RELIGIONS, 0.5),
                        match_age_min, match_age_max
                    ]
                );
            } catch (e) {
                console.error("Insert error:", e);
            }
        }

        console.log('Seed completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seed script failed:', err);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

seed();
