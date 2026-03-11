import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { checkGrammar } from '../agents/grammarAgent.ts';

const router = Router();

const grammarLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please try again later.' },
});

const MAX_TEXT_LENGTH = 5000;

router.post('/', grammarLimiter, async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text input is required' });
        }
        if (text.length > MAX_TEXT_LENGTH) {
            return res.status(400).json({ error: `Text is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.` });
        }

        const result = await checkGrammar(text);
        res.json(result);
    } catch (error) {
        console.error('Error analyzing grammar:', error);
        res.status(500).json({ error: 'Failed to analyze grammar' });
    }
});

export default router;
