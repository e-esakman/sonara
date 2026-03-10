import { Router } from 'express';
import type { Request, Response } from 'express';
import { analyzePronunciation } from '../geminiAgent.ts';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { text, transcript } = req.body;

        if (!text || typeof transcript !== 'string') {
            return res.status(400).json({ error: 'Missing text or transcript in request body' });
        }

        const analysis = await analyzePronunciation(text, transcript);
        res.json(analysis);
    } catch (error) {
        console.error('Error in /analyze route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
