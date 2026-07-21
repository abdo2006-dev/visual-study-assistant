import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type { VisualLesson } from "@/lib/schema/lesson";

export interface LessonRevisions {
  lessonId: string;
  /** Snapshots of the lesson at each point in its edit history; `pointer` is the index of the current one. */
  history: VisualLesson[];
  pointer: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface LessonConversation {
  lessonId: string;
  messages: ChatMessage[];
}

interface VisualStudyAssistantDB extends DBSchema {
  lessons: {
    key: string;
    value: VisualLesson;
    indexes: { "by-updatedAt": string };
  };
  revisions: {
    key: string;
    value: LessonRevisions;
  };
  conversations: {
    key: string;
    value: LessonConversation;
  };
}

const DB_NAME = "visual-study-assistant";
const DB_VERSION = 2;

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
        if (!db.objectStoreNames.contains("lessons")) {
          const store = db.createObjectStore("lessons", { keyPath: "id" });
          store.createIndex("by-updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("revisions")) {
          db.createObjectStore("revisions", { keyPath: "lessonId" });
        }
        if (!db.objectStoreNames.contains("conversations")) {
          db.createObjectStore("conversations", { keyPath: "lessonId" });
        }
      },
    });
  }

  return dbPromise;
}
