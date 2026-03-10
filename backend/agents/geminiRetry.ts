/**
 * Shared Gemini API retry helper.
 * Retries on 429 / quota / rate-limit errors with a fixed delay between attempts.
 */
export async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
        return await fn();
    } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        const isRateLimit =
            e.status === 429 ||
            e.message?.includes('429') ||
            e.message?.toLowerCase().includes('quota') ||
            e.message?.toLowerCase().includes('rate limit');
        if (isRateLimit && retries > 0) {
            console.log(`[Gemini] Rate limited. Retrying in 2 s… (${retries} retries left)`);
            await new Promise(r => setTimeout(r, 2000));
            return callGeminiWithRetry(fn, retries - 1);
        }
        throw err;
    }
}
