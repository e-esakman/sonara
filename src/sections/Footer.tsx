import { Link } from 'react-router-dom';
export default function Footer() {
    return <footer className="border-t border-neutral-200 bg-[#f7f8f5] px-6 py-8 text-sm text-neutral-600">
        <div className="mx-auto max-w-6xl flex flex-wrap justify-between gap-4">
            <Link to="/" className="font-semibold text-neutral-900">Sonara · Make yourself heard.</Link>
            <span>Pronunciation practice, at your pace.</span>
        </div>
    </footer>;
}
