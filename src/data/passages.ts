export interface Passage {
    id: string;
    title: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    readingTime: string;
    wordCount: number;
    content: string;
    gradient: string;
    coverEmoji?: string;
}

const passages: Passage[] = [
    {
        id: 'growth-mindset',
        title: 'The Growth Mindset',
        category: 'Motivational Writing',
        difficulty: 'Beginner',
        readingTime: '2 min',
        wordCount: 162,
        gradient: 'from-indigo-500 to-purple-600',
        coverEmoji: '🌱',
        content: `A growth mindset is the belief that your abilities can be developed through dedication, hard work, and persistence. People who embrace this way of thinking see challenges as opportunities rather than obstacles. They understand that failure is not a permanent condition but a stepping stone toward mastery. When you adopt a growth mindset, you stop comparing yourself to others and start focusing on your own progress. Every small improvement matters. Every lesson learned from a mistake brings you closer to your goal. The journey of learning is never truly finished, and that is what makes it so rewarding. Instead of saying "I can't do this," try saying "I can't do this yet." That single word transforms your entire perspective. It opens the door to possibility, curiosity, and resilience. Your potential is not fixed at birth. It grows with every effort you make.`
    },
    {
        id: 'curiosity',
        title: 'The Power of Curiosity',
        category: 'Science Essays',
        difficulty: 'Beginner',
        readingTime: '2 min',
        wordCount: 168,
        gradient: 'from-cyan-500 to-blue-600',
        coverEmoji: '🔬',
        content: `Curiosity is the engine that drives human progress. It is the spark behind every great discovery, every invention, and every work of art. When we allow ourselves to ask questions without fear of judgment, we open doors to understanding that would otherwise remain closed. Children are naturally curious. They touch, taste, and explore everything around them. Somewhere along the way, many adults lose that instinct. They stop asking why and start accepting things as they are. But the most successful people in history never stopped being curious. Albert Einstein once said that he had no special talent, only passionate curiosity. That curiosity led him to reshape our understanding of the universe. You do not need to be a genius to be curious. You simply need to pay attention, ask questions, and be willing to explore the unknown. Curiosity is free, unlimited, and available to everyone.`
    },
    {
        id: 'failure',
        title: 'Learning Through Failure',
        category: 'Motivational Writing',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 171,
        gradient: 'from-rose-500 to-pink-600',
        coverEmoji: '💡',
        content: `Failure is one of the greatest teachers we will ever encounter. It strips away our assumptions and forces us to see reality clearly. When we fail, we learn what does not work, and that knowledge is incredibly valuable. Thomas Edison failed thousands of times before inventing the light bulb. He famously said that he had not failed but had found ten thousand ways that did not work. His persistence changed the world. The fear of failure holds many people back from pursuing their dreams. They would rather stay comfortable than risk embarrassment or disappointment. But comfort rarely leads to growth. Every successful entrepreneur, athlete, and artist has a long list of failures behind them. Those failures shaped their character and sharpened their skills. The key is not to avoid failure but to learn from it quickly and move forward with greater wisdom. Embrace failure as a necessary part of your journey.`
    },
    {
        id: 'nature-reflection',
        title: 'Stillness in Nature',
        category: 'Nature Writing',
        difficulty: 'Beginner',
        readingTime: '2 min',
        wordCount: 165,
        gradient: 'from-emerald-500 to-teal-600',
        coverEmoji: '🌿',
        content: `There is a profound stillness in nature that modern life rarely offers. When you stand beneath a canopy of ancient trees, listening to the wind rustle through the leaves, something inside you begins to quiet down. The constant noise of notifications, deadlines, and responsibilities fades away. In its place, you find a sense of peace that feels both unfamiliar and deeply right. Rivers do not rush because they are anxious. They flow because that is their nature. Birds do not sing to impress anyone. They sing because it is part of who they are. Nature teaches us that there is beauty in simply being present. You do not need to prove anything to the forest. You do not need to perform for the mountains. You just need to show up and breathe. Sometimes the most productive thing you can do is step outside and listen to the world.`
    },
    {
        id: 'technology-society',
        title: 'Technology and Human Connection',
        category: 'Science Essays',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 172,
        gradient: 'from-violet-500 to-indigo-600',
        coverEmoji: '📱',
        content: `Technology has transformed the way we communicate, work, and live. We can video call someone on the other side of the planet, access millions of books from a single device, and navigate unfamiliar cities with a few taps on a screen. These are extraordinary achievements. Yet something important has been lost along the way. Despite being more connected than ever, many people feel increasingly isolated. Social media shows us curated versions of other people's lives, making us feel inadequate by comparison. Notifications constantly interrupt our thoughts, fragmenting our attention into tiny, unsatisfying pieces. The challenge of our generation is not to reject technology but to use it intentionally. We must design our digital lives with the same care we bring to our physical spaces. That means setting boundaries, choosing depth over quantity, and remembering that the most meaningful conversations still happen face to face, eye to eye, and heart to heart.`
    },
    {
        id: 'storytelling',
        title: 'The Art of Storytelling',
        category: 'Classic Literature',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 174,
        gradient: 'from-amber-500 to-orange-600',
        coverEmoji: '📖',
        content: `Humans have been telling stories since the beginning of civilization. Long before we had written language, we gathered around fires and shared tales of adventure, love, and survival. Stories help us make sense of the world. They give structure to chaos and meaning to suffering. A well-told story has the power to change minds, inspire action, and create empathy between strangers. When you hear about someone's struggle and triumph, you see a piece of your own experience reflected back at you. That connection is what makes storytelling so powerful. In business, the best leaders are also the best storytellers. They do not just share data and statistics. They weave narratives that make people feel something. Whether you are giving a presentation, writing an email, or having a conversation, the ability to tell a compelling story is one of the most valuable skills you can develop. Everyone has a story worth telling.`
    },
    {
        id: 'confidence',
        title: 'Building Unshakable Confidence',
        category: 'Confidence Building',
        difficulty: 'Beginner',
        readingTime: '2 min',
        wordCount: 167,
        gradient: 'from-yellow-500 to-amber-600',
        coverEmoji: '💪',
        content: `Confidence is not something you are born with. It is something you build through repeated action and experience. The most confident people in the world were not always that way. They felt nervous, uncertain, and afraid just like everyone else. The difference is that they chose to act despite their fear. Every time you do something that scares you, your confidence grows a little bit. Every time you speak up in a meeting, introduce yourself to a stranger, or try something new, you are training your brain to believe in your own capability. Confidence is also not about being perfect. It is about being comfortable with imperfection. It is knowing that you will make mistakes and that those mistakes will not define you. Start small. Celebrate your wins, no matter how minor they seem. Over time, those small victories accumulate into a deep, unshakable belief in yourself that no one can take away.`
    },
    {
        id: 'communication',
        title: 'Mastering Communication',
        category: 'Communication Skills',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 178,
        gradient: 'from-sky-500 to-blue-600',
        coverEmoji: '🗣️',
        content: `Effective communication is the foundation of every meaningful relationship, whether personal or professional. It is not just about choosing the right words but about listening actively, reading body language, and understanding context. Many conflicts arise not from disagreement but from misunderstanding. When two people are speaking different emotional languages, even simple conversations can become battlegrounds. The best communicators are excellent listeners. They give their full attention, ask clarifying questions, and resist the urge to formulate their response while the other person is still talking. They also understand that tone matters as much as content. The same sentence delivered with warmth and delivered with sarcasm can produce completely opposite reactions. In a world filled with digital communication, the nuances of face-to-face conversation are becoming a rare and valuable skill. Practice being present in your conversations. Put away your phone, make eye contact, and show genuine interest in what the other person has to say.`
    },
    {
        id: 'creativity',
        title: 'Unleashing Your Creativity',
        category: 'Motivational Writing',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 169,
        gradient: 'from-fuchsia-500 to-purple-600',
        coverEmoji: '🎨',
        content: `Creativity is not a gift reserved for artists and musicians. It is a fundamental human ability that lives in every single one of us. Whether you are solving a business problem, cooking a meal, or arranging furniture in your living room, you are exercising creativity. The myth that creativity requires inspiration to strike is one of the biggest obstacles to creative work. In reality, creativity thrives on discipline and consistency. The best writers do not wait for the muse to visit them. They sit down every day and write, even when they do not feel like it. The same is true for scientists, designers, and entrepreneurs. Creative breakthroughs usually come after long periods of focused effort, not during moments of idle daydreaming. If you want to become more creative, start by making creativity a daily habit. Sketch, journal, brainstorm, experiment. The more you practice, the more ideas will flow naturally and effortlessly.`
    },
    {
        id: 'leadership',
        title: 'Lessons in Leadership',
        category: 'Motivational Writing',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 175,
        gradient: 'from-slate-600 to-zinc-800',
        coverEmoji: '🏆',
        content: `True leadership is not about having authority over others. It is about inspiring people to work toward a shared vision with enthusiasm and commitment. The best leaders lead by example. They do not ask their teams to do anything they would not do themselves. Great leaders also understand the importance of vulnerability. They admit when they are wrong, ask for help when they need it, and create environments where others feel safe to do the same. This kind of openness builds trust, and trust is the foundation of every high-performing team. Leadership also requires difficult decisions. Sometimes you must choose between what is popular and what is right. The courage to make unpopular decisions while treating people with respect is what separates good leaders from great ones. You do not need a title to be a leader. Leadership starts with taking responsibility for your own actions and caring genuinely about the well-being of the people around you.`
    },
    {
        id: 'persistence',
        title: 'The Discipline of Persistence',
        category: 'Motivational Writing',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 170,
        gradient: 'from-red-500 to-rose-700',
        coverEmoji: '🔥',
        content: `Persistence is the quiet force behind every extraordinary achievement. It is not glamorous or exciting. It does not make headlines or go viral on social media. But without persistence, talent is wasted, potential is unrealized, and dreams remain fantasies. Consider the bamboo tree. For the first four years after planting, nothing visible happens above the surface. The tree is building a massive root system underground. Then, in the fifth year, it shoots up ninety feet in just six weeks. Most success stories follow a similar pattern. There are years of invisible effort before the breakthrough moment that everyone else sees. Persistence means showing up every single day, even when progress feels impossibly slow. It means trusting the process when you cannot see the results. It means choosing discipline over motivation because motivation is unreliable while discipline is a choice. If you keep going when everyone else quits, you will eventually arrive at a place that very few people ever reach.`
    },
    {
        id: 'observations',
        title: 'Everyday Observations',
        category: 'Short Stories',
        difficulty: 'Beginner',
        readingTime: '2 min',
        wordCount: 163,
        gradient: 'from-teal-500 to-emerald-600',
        coverEmoji: '👀',
        content: `The world is full of small miracles that most people walk past without noticing. The way morning sunlight filters through a kitchen window, casting golden rectangles on the floor. The sound of rain tapping gently on a rooftop, each drop creating a tiny percussion symphony. The smell of fresh bread drifting from a bakery, pulling you in like an invisible thread. These moments are everywhere if you learn to pay attention. We spend so much time racing toward the next goal that we forget to appreciate what is right in front of us. Happiness is not always found in grand achievements or exotic destinations. Sometimes it lives in a warm cup of coffee on a cold morning, a genuine smile from a stranger, or the simple satisfaction of finishing a good book. Slow down. Look around. The beauty of ordinary life is extraordinary when you truly see it.`
    },
    {
        id: 'happiness',
        title: 'Small Moments of Joy',
        category: 'Nature Writing',
        difficulty: 'Beginner',
        readingTime: '2 min',
        wordCount: 166,
        gradient: 'from-pink-400 to-rose-500',
        coverEmoji: '☀️',
        content: `Joy does not always arrive in dramatic, life-changing moments. More often, it sneaks in through the back door when you are not looking. It hides in the laughter of children playing in a park, in the warmth of a blanket on a rainy afternoon, and in the quiet pride of completing a task you once thought impossible. We tend to postpone happiness, telling ourselves we will be happy when we get the promotion, buy the house, or reach some distant milestone. But joy is not a destination. It is a practice. It requires you to notice the good that already exists in your life, even when things are difficult. Gratitude is the lens that helps you see joy more clearly. When you take a moment each day to acknowledge something you are thankful for, you train your mind to find light even in the darkest situations. Joy is always available if you choose to look for it.`
    },
    {
        id: 'discoveries',
        title: 'Great Scientific Discoveries',
        category: 'Science Essays',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 176,
        gradient: 'from-blue-600 to-indigo-700',
        coverEmoji: '🧪',
        content: `The history of science is filled with discoveries that were made by accident or through persistent, methodical observation. Alexander Fleming discovered penicillin when he noticed that mold had contaminated one of his petri dishes and killed the surrounding bacteria. That single observation led to the development of antibiotics, which have saved millions of lives. Similarly, the discovery of X-rays happened when Wilhelm Roentgen noticed a fluorescent screen glowing in his laboratory during an experiment with cathode rays. He did not immediately understand what he was seeing, but his curiosity drove him to investigate further. These stories remind us that discovery often comes from paying attention to the unexpected. The universe is constantly revealing its secrets, but only to those who are willing to look carefully and question their assumptions. Scientific progress depends on a combination of rigorous methodology and creative thinking, alongside a willingness to be surprised by the results of your own experiments.`
    },
    {
        id: 'cultural-diversity',
        title: 'Celebrating Cultural Diversity',
        category: 'Short Stories',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 173,
        gradient: 'from-orange-500 to-red-600',
        coverEmoji: '🌍',
        content: `Every culture on Earth has developed its own unique way of seeing the world. From the festivals of India to the tea ceremonies of Japan, from the storytelling traditions of West Africa to the musical heritage of Latin America, human diversity is a source of endless richness. When we take the time to learn about other cultures, we expand our understanding of what it means to be human. We discover that despite our differences in language, food, and customs, we share the same fundamental desires for love, belonging, and meaning. Cultural diversity is not something to be merely tolerated. It should be actively celebrated and protected. In a globalized world, it is tempting to flatten everything into a single homogeneous culture. But the beauty of humanity lies in its variety. Each tradition carries wisdom that has been refined over centuries, and losing any of them diminishes us all. Embrace the diversity around you and let it broaden your perspective.`
    },
    {
        id: 'travel',
        title: 'The Transformative Power of Travel',
        category: 'Nature Writing',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 170,
        gradient: 'from-lime-500 to-green-600',
        coverEmoji: '✈️',
        content: `Travel has a way of reshaping the person you thought you were. When you step into an unfamiliar country, surrounded by a language you do not speak and customs you do not understand, something remarkable happens. Your assumptions fall away, and you are forced to see the world through fresh eyes. The narrow streets of ancient cities tell stories that textbooks cannot capture. The taste of a home-cooked meal prepared by a local family connects you to centuries of tradition. The kindness of strangers who go out of their way to help you restores your faith in humanity. Travel does not have to be expensive or exotic. A weekend trip to a nearby town you have never visited can be just as transformative as a flight across the ocean. The point is to leave your routine behind and allow yourself to be surprised by the world. Every journey, no matter how short, changes you in ways you could never have predicted.`
    },
    {
        id: 'problem-solving',
        title: 'The Art of Problem Solving',
        category: 'Science Essays',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 177,
        gradient: 'from-indigo-600 to-blue-800',
        coverEmoji: '🧩',
        content: `Problem solving is both an art and a science. It requires analytical thinking to break complex issues into manageable components and creative thinking to find connections that others might miss. The best problem solvers approach challenges with a combination of patience and urgency. They take the time to understand the root cause before jumping to solutions, yet they act decisively once they have enough information. One of the most effective techniques for solving difficult problems is to reframe the question entirely. Instead of asking how to fix what is broken, ask what would need to be true for the problem to not exist in the first place. This shift in perspective often reveals solutions that were invisible from the original vantage point. Another powerful strategy is to seek diverse perspectives. When people with different backgrounds and expertise collaborate on a problem, they bring complementary strengths that lead to more robust solutions. The next time you face a difficult challenge, remember that the way you frame the problem determines the solutions you will find.`
    },
    {
        id: 'innovation',
        title: 'Innovation and Progress',
        category: 'Science Essays',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 174,
        gradient: 'from-purple-600 to-violet-800',
        coverEmoji: '🚀',
        content: `Innovation rarely happens in isolation. It is the product of collaboration, experimentation, and the courageous willingness to challenge the status quo. The most transformative innovations in history did not come from people who were satisfied with the way things were. They came from individuals and teams who saw problems as puzzles waiting to be solved. The printing press, the internet, and renewable energy all emerged from the same fundamental impulse to make things better. But innovation is not just about technology. It can be found in new business models, educational approaches, and social movements. Every improvement to how we live, work, and relate to each other is a form of innovation. What separates innovative thinkers from everyone else is their willingness to experiment and fail repeatedly without losing enthusiasm. They understand that the path from idea to impact is rarely straight and always messy. If you want to drive progress in any field, start by questioning assumptions and embracing experimentation as a way of life.`
    },
    {
        id: 'personal-growth',
        title: 'The Journey Inward',
        category: 'Motivational Writing',
        difficulty: 'Intermediate',
        readingTime: '2 min',
        wordCount: 168,
        gradient: 'from-emerald-600 to-cyan-700',
        coverEmoji: '🧘',
        content: `Personal growth is not a straight line. It is a winding path filled with setbacks, breakthroughs, and unexpected detours. Some days you will feel like you are making enormous progress, and other days you will wonder if you have gone backward. Both feelings are part of the process. The most important thing is to remain committed to your own development, even when the results are not immediately visible. Self-awareness is the starting point of all growth. Before you can change, you must understand where you are and why. This requires honest self-reflection, which can be uncomfortable but is always worthwhile. Reading, journaling, and seeking feedback from trusted people are all powerful tools for building self-awareness. Growth also requires letting go of old beliefs and habits that no longer serve you. This can feel like losing a part of yourself, but in reality, you are making room for something better. Trust the process and be patient with yourself.`
    },
    {
        id: 'finding-purpose',
        title: 'Finding Your Purpose',
        category: 'Motivational Writing',
        difficulty: 'Advanced',
        readingTime: '2 min',
        wordCount: 175,
        gradient: 'from-rose-600 to-red-800',
        coverEmoji: '🧭',
        content: `Finding your purpose is one of the most meaningful pursuits of a lifetime, yet it is also one of the most misunderstood. Many people believe that purpose is a single, grand revelation that strikes like lightning. In reality, purpose usually emerges gradually through a combination of experience, reflection, and experimentation. It lives at the intersection of what you love, what you are good at, what the world needs, and what you can be rewarded for. Purpose is not static. It evolves as you grow, learn, and change. What gave your life meaning at twenty may look very different from what drives you at forty. The key is to stay open and curious, always asking yourself what matters most to you right now. You do not need to have everything figured out today. Purpose often reveals itself through action rather than contemplation. Try new things, meet different people, and follow the threads that excite you. Over time, a pattern will emerge that feels unmistakably like your own unique path in the world.`
    },
    // ─── Tongue Twisters ─────────────────────────────────────────
    {
        id: 'tt-seashells',
        title: 'She Sells Seashells',
        category: 'Tongue Twisters',
        difficulty: 'Beginner',
        readingTime: '1 min',
        wordCount: 62,
        gradient: 'from-cyan-400 to-sky-600',
        coverEmoji: '🐚',
        content: `She sells seashells by the seashore. The shells she sells are seashells, I am sure. So if she sells seashells on the seashore, then I am sure she sells seashore shells. She sells seashells by the seashore. The seashells she sells are surely from the sea. So if she sells seashells on the seashore, surely the shells are seashore shells.`
    },
    {
        id: 'tt-peter-piper',
        title: 'Peter Piper',
        category: 'Tongue Twisters',
        difficulty: 'Beginner',
        readingTime: '1 min',
        wordCount: 56,
        gradient: 'from-green-400 to-emerald-600',
        coverEmoji: '🌶️',
        content: `Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where is the peck of pickled peppers Peter Piper picked? Peter Piper picked a peck of pickled peppers perfectly, proving his proficiency at picking a peck precisely.`
    },
    {
        id: 'tt-red-lorry',
        title: 'Red Lorry Yellow Lorry',
        category: 'Tongue Twisters',
        difficulty: 'Intermediate',
        readingTime: '1 min',
        wordCount: 58,
        gradient: 'from-red-400 to-yellow-500',
        coverEmoji: '🚚',
        content: `Red lorry, yellow lorry. Red lorry, yellow lorry. Red lorry, yellow lorry. The red lorry rallied rapidly along the rural road while the yellow lorry lingered lazily behind. Red lorry, yellow lorry, red lorry, yellow lorry. Really leery, rarely literary. Red lorry, yellow lorry. Roll after roll, the lorries raced relentlessly.`
    },
    {
        id: 'tt-unique-new-york',
        title: 'Unique New York',
        category: 'Tongue Twisters',
        difficulty: 'Intermediate',
        readingTime: '1 min',
        wordCount: 60,
        gradient: 'from-violet-400 to-purple-600',
        coverEmoji: '🗽',
        content: `You know New York, you need New York, you know you need unique New York. Unique New York, unique New York, you know you need unique New York. The unique university of New York uniquely unites young urban youth. You know you need unique New York. New York is uniquely unlike any other unique city you will know.`
    },
    {
        id: 'tt-toy-boat',
        title: 'Toy Boat',
        category: 'Tongue Twisters',
        difficulty: 'Beginner',
        readingTime: '1 min',
        wordCount: 55,
        gradient: 'from-blue-400 to-indigo-600',
        coverEmoji: '⛵',
        content: `Toy boat, toy boat, toy boat. A tiny toy boat teetered toward the turbulent tide. Toy boat, toy boat, toy boat. The boy brought the toy boat to the bay and the toy boat bobbed beautifully. Toy boat, toy boat, toy boat. The total of toy boats totalled ten toy boats today.`
    },
    {
        id: 'tt-woodchuck',
        title: 'How Much Wood',
        category: 'Tongue Twisters',
        difficulty: 'Intermediate',
        readingTime: '1 min',
        wordCount: 64,
        gradient: 'from-amber-400 to-orange-600',
        coverEmoji: '🪵',
        content: `How much wood would a woodchuck chuck if a woodchuck could chuck wood? He would chuck, he would, as much as he could, and chuck as much wood as a woodchuck would if a woodchuck could chuck wood. A woodchuck would chuck all the wood that a woodchuck could chuck, if a woodchuck could chuck wood.`
    },
    {
        id: 'tt-betty-botter',
        title: 'Betty Botter',
        category: 'Tongue Twisters',
        difficulty: 'Advanced',
        readingTime: '1 min',
        wordCount: 72,
        gradient: 'from-pink-400 to-fuchsia-600',
        coverEmoji: '🧈',
        content: `Betty Botter bought some butter, but she said the butter's bitter. If I put it in my batter, it will make my batter bitter. But a bit of better butter will make my batter better. So Betty Botter bought a bit of better butter, better than the bitter butter, and she put it in her batter, and the batter was not bitter. So it was better Betty Botter bought a bit of better butter.`
    },
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

export const categories = [...new Set(passages.map(p => p.category))];
