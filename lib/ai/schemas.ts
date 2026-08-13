// ============ Structured output schemas for the Gemini API (Type enum) ============
import { Type } from "@google/genai";

const STR = { type: Type.STRING } as const;
const INT = { type: Type.INTEGER } as const;
const NUM = { type: Type.NUMBER } as const;
const BOOL = { type: Type.BOOLEAN } as const;

/** MCQ question set (used for quiz generation, mock sections, validation). */
export const MCQ_SET_SCHEMA = {
  type: Type.OBJECT,
  required: ["questions"],
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["question", "options", "answerIndex", "explanation", "subject", "topic", "difficulty"],
        properties: {
          question: STR,
          options: { type: Type.ARRAY, items: STR },
          answerIndex: INT,
          explanation: STR,
          subject: STR,
          topic: STR,
          difficulty: INT,
        },
      },
    },
  },
};

/** Master-model validation pass over a draft quiz. */
export const VALIDATE_SCHEMA = {
  type: Type.OBJECT,
  required: ["approved", "corrections", "notes"],
  properties: {
    approved: BOOL,
    corrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["index", "reason", "replacement"],
        properties: {
          index: INT,
          reason: STR,
          replacement: {
            type: Type.OBJECT,
            required: ["question", "options", "answerIndex", "explanation", "subject", "topic", "difficulty"],
            properties: {
              question: STR,
              options: { type: Type.ARRAY, items: STR },
              answerIndex: INT,
              explanation: STR,
              subject: STR,
              topic: STR,
              difficulty: INT,
            },
          },
        },
      },
    },
    notes: STR,
  },
};

/** Summary outline (slave) before streaming prose (master). */
export const OUTLINE_SCHEMA = {
  type: Type.OBJECT,
  required: ["title", "sections"],
  properties: {
    title: STR,
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["heading", "keyPoints"],
        properties: {
          heading: STR,
          keyPoints: { type: Type.ARRAY, items: STR },
        },
      },
    },
  },
};

/** Descriptive answer scoring with rubric. */
export const SCORE_SCHEMA = {
  type: Type.OBJECT,
  required: ["marksAwarded", "maxMarks", "band", "feedback", "modelAnswer"],
  properties: {
    marksAwarded: NUM,
    maxMarks: NUM,
    band: STR,
    feedback: STR,
    modelAnswer: STR,
  },
};

/** Full attempt analysis -> fills the predesigned report card. */
export const REPORT_SCHEMA = {
  type: Type.OBJECT,
  required: ["verdict", "overview", "sectionInsights", "strengths", "weaknesses", "topicBreakdown", "actionPlan", "realityCheck", "motivation"],
  properties: {
    verdict: STR,
    overview: STR,
    sectionInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["section", "observation"],
        properties: { section: STR, observation: STR },
      },
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["title", "detail"],
        properties: { title: STR, detail: STR },
      },
    },
    weaknesses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["title", "detail", "fix"],
        properties: { title: STR, detail: STR, fix: STR },
      },
    },
    topicBreakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["topic", "verdict", "comment"],
        properties: { topic: STR, verdict: STR, comment: STR },
      },
    },
    actionPlan: { type: Type.ARRAY, items: STR },
    realityCheck: STR,
    motivation: STR,
  },
};

export const FLASHCARDS_SCHEMA = {
  type: Type.OBJECT,
  required: ["cards"],
  properties: {
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["front", "back", "topic"],
        properties: { front: STR, back: STR, topic: STR },
      },
    },
  },
};

export const PLAN_SCHEMA = {
  type: Type.OBJECT,
  required: ["weeks", "hoursPerDay", "phases", "weekly"],
  properties: {
    weeks: INT,
    hoursPerDay: NUM,
    phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["name", "weeks", "focus", "tasks"],
        properties: { name: STR, weeks: INT, focus: STR, tasks: { type: Type.ARRAY, items: STR } },
      },
    },
    weekly: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["week", "focus", "tasks"],
        properties: { week: INT, focus: STR, tasks: { type: Type.ARRAY, items: STR } },
      },
    },
  },
};

export const DIGEST_SCHEMA = {
  type: Type.OBJECT,
  required: ["headline", "items"],
  properties: {
    headline: STR,
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["category", "title", "summary", "examRelevance", "mcqQuestion", "mcqOptions", "mcqAnswer"],
        properties: {
          category: STR,
          title: STR,
          summary: STR,
          examRelevance: STR,
          mcqQuestion: STR,
          mcqOptions: { type: Type.ARRAY, items: STR },
          mcqAnswer: STR,
        },
      },
    },
  },
};

export const DESCRIPTIVE_PAPER_SCHEMA = {
  type: Type.OBJECT,
  required: ["questions"],
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["question", "marks", "wordLimit", "section", "hints"],
        properties: {
          question: STR,
          marks: INT,
          wordLimit: INT,
          section: STR,
          hints: STR,
        },
      },
    },
  },
};

export const EXPLAIN_SCHEMA = {
  type: Type.OBJECT,
  required: ["simpleExplanation", "examAngle", "memoryHook", "relatedTopics"],
  properties: {
    simpleExplanation: STR,
    examAngle: STR,
    memoryHook: STR,
    relatedTopics: { type: Type.ARRAY, items: STR },
  },
};
