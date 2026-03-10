export interface Passage {
    id: string;
    title: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    readingTime: string;
    wordCount: number;
    content: string;
    coverColor: string;
    innerColor: string;
    accentColor: string;
    patternType: string;
}

const contentSample1 = `The world is full of small miracles that most people walk past without noticing. The way morning sunlight filters through a kitchen window, casting golden rectangles on the floor. The sound of rain tapping gently on a rooftop, each drop creating a tiny percussion symphony. The smell of fresh bread drifting from a bakery, pulling you in like an invisible thread. These moments are everywhere if you learn to pay attention. We spend so much time racing toward the next goal that we forget to appreciate what is right in front of us. Happiness is not always found in grand achievements or exotic destinations. Sometimes it lives in a warm cup of coffee on a cold morning, a genuine smile from a stranger, or the simple satisfaction of finishing a good book. Slow down. Look around. The beauty of ordinary life is extraordinary when you truly see it.`;

const contentSample2 = `There is a profound stillness in nature that modern life rarely offers. When you stand beneath a canopy of ancient trees, listening to the wind rustle through the leaves, something inside you begins to quiet down. The constant noise of notifications, deadlines, and responsibilities fades away. In its place, you find a sense of peace that feels both unfamiliar and deeply right. Rivers do not rush because they are anxious. They flow because that is their nature. Birds do not sing to impress anyone. They sing because it is part of who they are. Nature teaches us that there is beauty in simply being present. You do not need to prove anything to the forest. You do not need to perform for the mountains. You just need to show up and breathe. Sometimes the most productive thing you can do is step outside and listen to the world.`;

const contentSample3 = `Curiosity is the engine that drives human progress. It is the spark behind every great discovery, every invention, and every work of art. When we allow ourselves to ask questions without fear of judgment, we open doors to understanding that would otherwise remain closed. Children are naturally curious. They touch, taste, and explore everything around them. Somewhere along the way, many adults lose that instinct. They stop asking why and start accepting things as they are. But the most successful people in history never stopped being curious. Albert Einstein once said that he had no special talent, only passionate curiosity. That curiosity led him to reshape our understanding of the universe. You do not need to be a genius to be curious. You simply need to pay attention, ask questions, and be willing to explore the unknown. Curiosity is free, unlimited, and available to everyone.`;

const contentSample4 = `Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where's the peck of pickled peppers Peter Piper picked? How much wood would a woodchuck chuck if a woodchuck could chuck wood? He would chuck, he would, as much as he could, and chuck as much wood as a woodchuck would if a woodchuck could chuck wood. She sells seashells by the seashore. The shells she sells are surely seashells. So if she sells shells on the seashore, I'm sure she sells seashore shells. Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair. Fuzzy Wuzzy wasn't fuzzy, was he?`;

const passages: Passage[] = [
    {
        id: 'tongue-twisters',
        title: 'Tongue Twisters',
        category: 'Practice',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 110,
        coverColor: '#A4D1CB',
        innerColor: '#E2F1F0',
        accentColor: '#1B655E',
        patternType: 'grid',
        content: contentSample4
    },
    {
        id: 'little-world',
        title: 'Little World',
        category: 'Fiction',
        difficulty: 'Beginner',
        readingTime: '3 min',
        wordCount: 165,
        coverColor: '#F1E5F5',
        innerColor: '#FFFFEE',
        accentColor: '#82246D',
        patternType: 'grid',
        content: contentSample1
    },
    {
        id: 'blurry-bloom',
        title: 'Blurry Bloom',
        category: 'Poetry',
        difficulty: 'Intermediate',
        readingTime: '5 min',
        wordCount: 165,
        coverColor: '#DE6F65',
        innerColor: '#E9EFE6',
        accentColor: '#274431',
        patternType: 'wave',
        content: contentSample2
    },
    {
        id: 'market-walks',
        title: 'Market Walks',
        category: 'Non-Fiction',
        difficulty: 'Beginner',
        readingTime: '8 min',
        wordCount: 165,
        coverColor: '#96B8D1',
        innerColor: '#EBE2D9',
        accentColor: '#5F3D2A',
        patternType: 'curve',
        content: contentSample3
    },
    {
        id: 'start-of-the-day',
        title: 'Start of the Day',
        category: 'Journal',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 165,
        coverColor: '#3E3E3E',
        innerColor: '#FDFDF9',
        accentColor: '#8F725D',
        patternType: 'tilt',
        content: contentSample1
    },
    {
        id: 'infinity-void',
        title: 'Infinity Void',
        category: 'Sci-Fi',
        difficulty: 'Advanced',
        readingTime: '12 min',
        wordCount: 165,
        coverColor: '#E35645',
        innerColor: '#131313',
        accentColor: '#FFFFFF',
        patternType: 'radial',
        content: contentSample3
    },
    {
        id: 'paper',
        title: 'Paper',
        category: 'Essay',
        difficulty: 'Beginner',
        readingTime: '4 min',
        wordCount: 165,
        coverColor: '#C6A983',
        innerColor: '#E0D2C2',
        accentColor: '#4D3D2A',
        patternType: 'split',
        content: contentSample1
    },
    {
        id: 'silent-sea',
        title: 'Silent Sea',
        category: 'Mystery',
        difficulty: 'Intermediate',
        readingTime: '6 min',
        wordCount: 165,
        coverColor: '#2B4B6F',
        innerColor: '#E5EEF5',
        accentColor: '#1A2E44',
        patternType: 'circle',
        content: contentSample2
    },
    {
        id: 'solar-flare',
        title: 'Solar Flare',
        category: 'Sci-Fi',
        difficulty: 'Advanced',
        readingTime: '10 min',
        wordCount: 165,
        coverColor: '#E6A338',
        innerColor: '#FFF6E5',
        accentColor: '#8C5D14',
        patternType: 'corner',
        content: contentSample3
    },
    {
        id: 'urban-echo',
        title: 'Urban Echo',
        category: 'Fiction',
        difficulty: 'Beginner',
        readingTime: '5 min',
        wordCount: 165,
        coverColor: '#7A7A7A',
        innerColor: '#F0F0F0',
        accentColor: '#333333',
        patternType: 'dots',
        content: contentSample1
    },
    {
        id: 'pine-trail',
        title: 'Pine Trail',
        category: 'Nature',
        difficulty: 'Intermediate',
        readingTime: '7 min',
        wordCount: 165,
        coverColor: '#3C5A42',
        innerColor: '#E8F0E9',
        accentColor: '#1E3022',
        patternType: 'circle',
        content: contentSample2
    },
    {
        id: 'red-sands',
        title: 'Red Sands',
        category: 'History',
        difficulty: 'Advanced',
        readingTime: '15 min',
        wordCount: 165,
        coverColor: '#C25B42',
        innerColor: '#F5E5E1',
        accentColor: '#5E2416',
        patternType: 'wave',
        content: contentSample3
    },
    {
        id: 'neon-pulse',
        title: 'Neon Pulse',
        category: 'Cyberpunk',
        difficulty: 'Beginner',
        readingTime: '3 min',
        wordCount: 165,
        coverColor: '#6B2C91',
        innerColor: '#F2E5F5',
        accentColor: '#3A1452',
        patternType: 'radial',
        content: contentSample1
    },
    {
        id: 'frost-bite',
        title: 'Frost Bite',
        category: 'Thriller',
        difficulty: 'Intermediate',
        readingTime: '8 min',
        wordCount: 165,
        coverColor: '#82C3D1',
        innerColor: '#EAF5F7',
        accentColor: '#2F5E69',
        patternType: 'split',
        content: contentSample2
    },
    {
        id: 'amber-glow',
        title: 'Amber Glow',
        category: 'Poetry',
        difficulty: 'Advanced',
        readingTime: '4 min',
        wordCount: 165,
        coverColor: '#D97925',
        innerColor: '#F7EBE1',
        accentColor: '#6B370B',
        patternType: 'corner',
        content: contentSample3
    },
    {
        id: 'petal-fall',
        title: 'Petal Fall',
        category: 'Romance',
        difficulty: 'Beginner',
        readingTime: '5 min',
        wordCount: 165,
        coverColor: '#D1829D',
        innerColor: '#F7EAEE',
        accentColor: '#692F43',
        patternType: 'dots',
        content: contentSample1
    },
    {
        id: 'clear-sky',
        title: 'Clear Sky',
        category: 'Essay',
        difficulty: 'Intermediate',
        readingTime: '7 min',
        wordCount: 165,
        coverColor: '#4298C2',
        innerColor: '#E1F0F5',
        accentColor: '#17465E',
        patternType: 'circle',
        content: contentSample2
    },
    {
        id: 'dark-matter',
        title: 'Dark Matter',
        category: 'Science',
        difficulty: 'Advanced',
        readingTime: '11 min',
        wordCount: 165,
        coverColor: '#2D2A33',
        innerColor: '#1A181E',
        accentColor: '#A8A3B5',
        patternType: 'dots',
        content: contentSample3
    },
    {
        id: 'golden-rule',
        title: 'Golden Rule',
        category: 'Philosophy',
        difficulty: 'Beginner',
        readingTime: '4 min',
        wordCount: 165,
        coverColor: '#D4AF37',
        innerColor: '#FDF9EB',
        accentColor: '#7A6317',
        patternType: 'split',
        content: contentSample1
    },
    {
        id: 'iron-will',
        title: 'Iron Will',
        category: 'Biography',
        difficulty: 'Intermediate',
        readingTime: '9 min',
        wordCount: 165,
        coverColor: '#8C929C',
        innerColor: '#F0F1F2',
        accentColor: '#3A3F47',
        patternType: 'tilt',
        content: contentSample3
    },
    {
        id: 'moss-stone',
        title: 'Moss Stone',
        category: 'Fantasy',
        difficulty: 'Advanced',
        readingTime: '14 min',
        wordCount: 165,
        coverColor: '#5D7351',
        innerColor: '#EAECE8',
        accentColor: '#2A3623',
        patternType: 'gradient-fade',
        content: contentSample2
    }
];

export default passages;

export const getPassageById = (id: string): Passage | undefined => {
    return passages.find(p => p.id === id);
};

export const getPassagesByCategory = (category: string): Passage[] => {
    return passages.filter(p => p.category === category);
};

export const getPassagesByDifficulty = (difficulty: string): Passage[] => {
    return passages.filter(p => p.difficulty === difficulty);
};

export const categories = Array.from(new Set(passages.map(p => p.category)));
