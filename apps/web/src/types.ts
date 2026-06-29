import type { AnnotationProject, RomajiCorrectionDraft } from "@singbridge/core";

export type { AnnotationProject, RomajiCorrectionDraft };

export type ViewerTab = "all" | "review" | "corrections" | "pending" | "accepted" | "ignored";

export type ReviewDecision = "pending" | "accepted" | "ignored";

export type ReviewDecisionMap = Record<string, Exclude<ReviewDecision, "pending">>;

export interface LoadedFixtures {
  project: AnnotationProject;
  draft: RomajiCorrectionDraft;
  projectName: string;
  draftName?: string;
}
