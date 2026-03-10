import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../firebaseAdmin.ts';

const router = Router();

// Allow only alphanumeric characters, underscores and hyphens in userId
const SAFE_USER_ID_RE = /^[a-zA-Z0-9_-]+$/;

const sanitizeUserId = (id: unknown): string => {
    if (typeof id !== 'string' || id.trim() === '') return 'anonymous';
    if (!SAFE_USER_ID_RE.test(id)) return 'anonymous';
    // Limit length to a safe maximum
    return id.slice(0, 128);
};

router.post('/session', async (req: Request, res: Response) => {
    try {
        const { userId, text, accuracyScore, fluencyScore, timestamp } = req.body;

        if (!text || typeof text !== 'string' || text.length > 2000) {
            return res.status(400).json({ error: 'Missing or invalid text in request body' });
        }
        if (typeof accuracyScore !== 'number' || accuracyScore < 0 || accuracyScore > 100) {
            return res.status(400).json({ error: 'accuracyScore must be a number between 0 and 100' });
        }

        const session = {
            userId: sanitizeUserId(userId),
            text,
            accuracyScore,
            fluencyScore,
            timestamp: timestamp || new Date()
        };

        const collectionRef = db.collection('sessions');
        await collectionRef.add(session);

        const progressRef = db.collection('progress').doc(session.userId);
        const progressDoc = await progressRef.get();
        let currentWords = 0;
        let currentStreak = 0;
        let avgScore = accuracyScore;

        if (progressDoc.exists) {
            const data = progressDoc.data();
            if (data) {
                currentWords = data.wordsPracticed || 0;
                currentStreak = data.streak || 0;
                const oldAvg = data.averageScore || 0;
                avgScore = Math.round((oldAvg + accuracyScore) / 2);
            }
        }

        await progressRef.set({
            userId: session.userId,
            wordsPracticed: currentWords + text.split(' ').length,
            streak: currentStreak > 0 ? currentStreak : 1, // basic streak setup
            averageScore: avgScore
        }, { merge: true });

        res.json({ success: true, session });
    } catch (error) {
        console.error('Failed to create session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

router.get('/progress', async (req: Request, res: Response) => {
    try {
        const userId = sanitizeUserId(req.query.userId);

        const doc = await db.collection('progress').doc(userId).get();
        if (!doc.exists) {
            return res.json({
                pronunciationScore: 0,
                fluencyScore: 0,
                streak: 0,
                wordsPracticed: 0
            });
        }
        const data = doc.data();

        res.json({
            pronunciationScore: data?.averageScore || 0,
            fluencyScore: data?.averageScore || 0,
            streak: data?.streak || 0,
            wordsPracticed: data?.wordsPracticed || 0
        });
    } catch (error) {
        console.error('Failed to get progress:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

export default router;
