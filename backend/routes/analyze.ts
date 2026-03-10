import { Router } from 'express';
import type { Request, Response } from 'express';
import { analyzePronunciation } from '../geminiAgent.ts';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { text, transcript } = req.body;

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

        const analysis = await analyzePronunciation(text, transcript);
        res.json(analysis);
    } catch (error) {
        console.error('Error in /analyze route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
