import express from 'express';
import rateLimit from 'express-rate-limit';
import { checkGrammar } from '../agents/grammarAgent.ts';

const router = express.Router();

const grammarRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please try again in a moment.' },
});

router.post('/', grammarRateLimit, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text input is required' });
        }
        if (text.length > 2000) {
            return res.status(400).json({ error: 'Text exceeds maximum length of 2000 characters' });
        }

        const result = await checkGrammar(text);
        res.json(result);
    } catch (error: unknown) {
        console.error('Error analyzing grammar:', error);
        res.status(500).json({ error: 'Failed to analyze grammar' });
    }
});

export default router;
