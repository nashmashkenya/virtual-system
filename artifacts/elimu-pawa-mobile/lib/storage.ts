import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DemoUser } from "./types";

const CURRENT_USER_KEY = "elimu_current_user";

export async function saveCurrentUser(user: DemoUser): Promise<void> {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function loadCurrentUser(): Promise<DemoUser | null> {
  try {
    const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export async function clearCurrentUser(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
}
