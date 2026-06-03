/**
 * Cross-platform thin wrapper around expo-secure-store.
 *
 * expo-secure-store has no real web implementation (calls like
 * setValueWithKeyAsync throw "is not a function"). On web we fall back to
 * window.localStorage; on native we delegate to SecureStore.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const memoryStore = new Map<string, string>();

function webGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null;
}

function webSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // ignore
  }
  memoryStore.set(key, value);
}

function webDelete(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    // ignore
  }
  memoryStore.delete(key);
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === "web") return webGet(key);
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    webSet(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === "web") {
    webDelete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
