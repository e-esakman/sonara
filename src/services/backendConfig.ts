const BACKEND_URL_CONFIG_ERROR =
    'Missing VITE_BACKEND_URL. Set the frontend backend URL before using Sonara.';

export function getRequiredBackendUrl() {
    const value = import.meta.env.VITE_BACKEND_URL?.trim();
    if (!value) {
        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            if (host === 'localhost' || host === '127.0.0.1') {
                return `${window.location.protocol}//localhost:8080`;
            }
        }

        throw new Error(BACKEND_URL_CONFIG_ERROR);
    }

    return value.replace(/\/$/, '');
}

export function getBackendUrlConfigError() {
    return BACKEND_URL_CONFIG_ERROR;
}
