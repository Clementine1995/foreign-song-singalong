import type { AnnotationProject, RomajiCorrectionDraft } from "@singbridge/core";

export type { AnnotationProject, RomajiCorrectionDraft };

export type ViewerTab = "all" | "review" | "corrections";

export interface LoadedFixtures {
  project: AnnotationProject;
  draft: RomajiCorrectionDraft;
  projectName: string;
  draftName?: string;
}
