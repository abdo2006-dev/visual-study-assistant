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

export interface ApiUsageRecord {
  id: string;
  /** ISO datetime of when the client recorded this call (approximately when the response arrived). */
  timestamp: string;
  operation: "lesson-plan" | "extract" | "lesson-patch" | "verify-lesson" | "bulk-import-plan";
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
}

export type BulkImportLessonStatus =
  | "pending"
  | "generating"
  | "success"
  | "error"
  | "cancelled"
  /** The tab was closed/refreshed while this lesson was still pending or generating. */
  | "interrupted";

export interface BulkImportBatchLesson {
  title: string;
  status: BulkImportLessonStatus;
  lessonId?: string;
  error?: string;
}

export interface BulkImportBatch {
  id: string;
  createdAt: string;
  updatedAt: string;
  lessons: BulkImportBatchLesson[];
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
  apiUsage: {
    key: string;
    value: ApiUsageRecord;
    indexes: { "by-timestamp": string };
  };
  bulkImportBatches: {
    key: string;
    value: BulkImportBatch;
    indexes: { "by-updatedAt": string };
  };
}

const DB_NAME = "visual-study-assistant";
const DB_VERSION = 4;

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
        if (!db.objectStoreNames.contains("apiUsage")) {
          const store = db.createObjectStore("apiUsage", { keyPath: "id" });
          store.createIndex("by-timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("bulkImportBatches")) {
          const store = db.createObjectStore("bulkImportBatches", { keyPath: "id" });
          store.createIndex("by-updatedAt", "updatedAt");
        }
      },
    });
  }

  return dbPromise;
}
