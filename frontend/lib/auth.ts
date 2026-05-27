export const AUTH_STORAGE_KEY = "omniflow_mock_auth";

export type MockUser = {
  name: string;
  email: string;
  role: string;
};

export const demoUser: MockUser = {
  name: "Priya Sharma",
  email: "priya@omniflow.ai",
  role: "Founder",
};

let cachedRawUser: string | null | undefined;
let cachedUser: MockUser | null = null;

function parseStoredUser(storedUser: string | null): MockUser | null {
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as MockUser;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setMockUser(user: MockUser = demoUser) {
  if (typeof window === "undefined") {
    return;
  }

  const rawUser = JSON.stringify(user);
  cachedRawUser = rawUser;
  cachedUser = user;
  window.localStorage.setItem(AUTH_STORAGE_KEY, rawUser);
}

export function getMockUser(): MockUser | null {
  return getMockUserSnapshot();
}

export function getMockUserSnapshot(): MockUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (storedUser === cachedRawUser) {
    return cachedUser;
  }

  cachedRawUser = storedUser;
  cachedUser = parseStoredUser(storedUser);
  return cachedUser;
}

export function clearMockUser() {
  if (typeof window === "undefined") {
    return;
  }

  cachedRawUser = null;
  cachedUser = null;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
