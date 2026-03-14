import { execSync } from 'child_process';

const port = process.env.PORT || 3000;
try {
    const output = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    if (!output) {
        process.exit(0);
    }
    const pids = output.split('\n').filter(Boolean);
    for (const pid of pids) {
        try {
            process.kill(Number(pid), 'SIGTERM');
        } catch {
            // ignore if already gone
        }
    }
} catch {
    // no process found or lsof not available
}
