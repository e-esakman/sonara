import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqData = [
    {
        question: "What is NovaSpeak?",
        answer: "NovaSpeak is an AI-powered pronunciation trainer designed to help you speak confidently by providing instant, accurate feedback on your speech."
    },
    {
        question: "How to use NovaSpeak?",
        answer: "Simply click the microphone icon, read the sentence displayed on the screen, and our engine will analyze your pronunciation and highlight areas for improvement."
    },
    {
        question: "Who is it for?",
        answer: "NovaSpeak is for language learners, professionals, and anyone looking to refine their accent and speak english with clarity and confidence."
    },
    {
        question: "Does it support multiple accents?",
        answer: "Yes, our AI engine is trained on diverse global voices and can recognize and analyze speech across various accents while teaching standard pronunciation."
    }
];

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-display italic text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">FAQ</h2>
                <p className="text-muted tracking-wide mt-2">Frequently Asked Questions</p>
            </div>

            <div className="space-y-4">
                {faqData.map((item, index) => (
                    <div key={index} className="bg-surface border border-stroke rounded-xl overflow-hidden transition-colors hover:border-pink-500/20">
                        <button
                            className="w-full text-left px-6 py-5 flex justify-between items-center bg-transparent focus:outline-none cursor-pointer"
                            onClick={() => toggle(index)}
                            aria-expanded={openIndex === index}
                        >
                            <span className="font-medium text-text">{item.question}</span>
                            <ChevronDown className={`w-5 h-5 text-muted transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} />
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                                }`}
                        >
                            <div className="px-6 pb-5 text-sm text-muted leading-relaxed">
                                {item.answer}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FAQ;
