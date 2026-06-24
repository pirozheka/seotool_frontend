const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")

export const API_URL = configuredApiUrl || "http://127.0.0.1:8000"
