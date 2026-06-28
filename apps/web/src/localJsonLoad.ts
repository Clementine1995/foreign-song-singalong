import type { LoadedFixtures } from "./types";
import {
  emptyCorrectionDraft,
  parseAnnotationProject,
  parseCorrectionDraft
} from "./fileValidation";

export function loadAnnotationProjectValue(value: unknown, fileName: string): LoadedFixtures {
  return {
    project: parseAnnotationProject(value),
    draft: emptyCorrectionDraft(),
    projectName: fileName
  };
}

export function loadCorrectionDraftValue(
  current: LoadedFixtures,
  value: unknown,
  fileName: string
): LoadedFixtures {
  return {
    ...current,
    draft: parseCorrectionDraft(value),
    draftName: fileName
  };
}
