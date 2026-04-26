export type JwtPayload = {
    id?: string;
    role?: string;
    exp?: number;
    [key: string]: unknown;
};

export const getStoredToken = (): string | null => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
};

export const clearStoredAuth = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userRole");
};

export const decodeJwtPayload = (token: string): JwtPayload | null => {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        // JWT payload uses base64url encoding.
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
};

export const isTokenExpired = (token: string): boolean => {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") {
        return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
};