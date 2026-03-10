import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { runAnalysisPipeline } from '../agents/analysisPipeline.ts';

const router = Router();

const analyzeRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please try again in a moment.' },
});

router.post('/', analyzeRateLimit, async (req: Request, res: Response) => {
    try {
        const { text, transcript, accent } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid text in request body' });
        }
        if (typeof transcript !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid transcript in request body' });
        }
        if (text.length > 1000) {
            return res.status(400).json({ error: 'text exceeds maximum length of 1000 characters' });
        }
        if (transcript.length > 1000) {
            return res.status(400).json({ error: 'transcript exceeds maximum length of 1000 characters' });
        }

        const ALLOWED_ACCENTS = new Set(['American', 'British', 'Indian']);
        if (accent !== undefined && (typeof accent !== 'string' || !ALLOWED_ACCENTS.has(accent))) {
            return res.status(400).json({ error: `Invalid accent. Allowed values: ${[...ALLOWED_ACCENTS].join(', ')}` });
        }

        const analysis = await runAnalysisPipeline(text, transcript, accent);
        res.json(analysis);
    } catch (error) {
        console.error('Error in /analyze route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
