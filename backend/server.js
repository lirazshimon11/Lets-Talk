require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/api/match', require('./routes/match'));
app.use('/api/chat', require('./routes/chat'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Socket.io for chat
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_chat', ({ conversationId }) => {
        socket.join(`chat_${conversationId}`);
        console.log(`User joined chat_${conversationId}`);
    });

    socket.on('send_message', async ({ conversationId, senderId, text }) => {
        try {
            const msgRes = await pool.query(
                'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3) RETURNING id, conversation_id, sender_id, text, created_at',
                [conversationId, senderId, text]
            );

            const convRes = await pool.query(
                'UPDATE conversations SET message_count = message_count + 1 WHERE id = $1 RETURNING message_count, status',
                [conversationId]
            );

            const threshold = parseInt(process.env.REVEAL_MESSAGE_COUNT || 10, 10);
            let newStatus = convRes.rows[0].status;
            let revealed = false;

            if (convRes.rows[0].message_count === threshold && newStatus !== 'revealed') {
                await pool.query('UPDATE conversations SET status = $1 WHERE id = $2', ['revealed', conversationId]);
                revealed = true;
            }

            const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [senderId]);
            const fullMsg = { ...msgRes.rows[0], sender_name: userRes.rows[0].username };

            io.to(`chat_${conversationId}`).emit('receive_message', {
                message: fullMsg,
                message_count: convRes.rows[0].message_count,
                revealed
            });
        } catch (err) {
            console.error('Socket send_message error:', err);
        }
    });

    socket.on('change_theme', async ({ conversationId, theme }) => {
        try {
            await pool.query('UPDATE conversations SET theme = $1 WHERE id = $2', [theme, conversationId]);
            io.to(`chat_${conversationId}`).emit('theme_updated', theme);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Database connected:', res.rows[0].now);
    } catch (err) {
        console.error('Database connection error:', err);
    }
});
