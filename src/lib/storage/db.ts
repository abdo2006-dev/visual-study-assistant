import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type { VisualLesson } from "@/lib/schema/lesson";

interface VisualStudyAssistantDB extends DBSchema {
  lessons: {
    key: string;
    value: VisualLesson;
    indexes: { "by-updatedAt": string };
  };
}

const DB_NAME = "visual-study-assistant";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VisualStudyAssistantDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<VisualStudyAssistantDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment.")
    );
  }

  if (!dbPromise) {
    dbPromise = openDB<VisualStudyAssistantDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("lessons", { keyPath: "id" });
        store.createIndex("by-updatedAt", "updatedAt");
      },
    });
  }

  return dbPromise;
}
