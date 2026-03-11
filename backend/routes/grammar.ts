import express from 'express';
import { checkGrammar } from '../agents/grammarAgent.ts';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text input is required' });
        }
        
        const result = await checkGrammar(text);
        res.json(result);
    } catch (error: any) {
        console.error('Error analyzing grammar:', error);
        res.status(500).json({ error: 'Failed to analyze grammar' });
    }
});

export default router;
