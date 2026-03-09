import PronunciationCard from '../components/PronunciationCard';
import ExplanationCard from '../components/ExplanationCard';

const Trainer = () => {
    return (
        <section className="flex flex-col items-center justify-center space-y-10">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-display italic text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    Pronunciation Trainer
                </h2>
                <p className="text-sm text-muted max-w-md mx-auto">
                    Practice reading the sentence aloud. Get AI-powered feedback on your pronunciation instantly.
                </p>
            </div>

            <PronunciationCard />
            <ExplanationCard />
        </section>
    );
};

export default Trainer;
