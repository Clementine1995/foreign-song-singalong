<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { LoadedFixtures, ReviewDecision, ReviewDecisionMap } from "./types";
import {
  buildAnnotationProjectWithManualOverrides,
  buildReviewDecisionExport,
  buildManualOverrideInputs,
  createViewerLines,
  sanitizeManualOverrideInputs,
  type ManualOverrideInputMaps
} from "./viewModel";
import { buildCliCommands, defaultCliCommandInputs, type CliCommand } from "./commandBuilder";
import {
  parseCorrectionDraft,
  readJsonFile
} from "./fileValidation";
import { loadAnnotationProjectValue, loadCorrectionDraftValue } from "./localJsonLoad";

const fixtures = ref<LoadedFixtures | null>(null);
const loadError = ref<string | null>(null);
const projectInput = ref<HTMLInputElement | null>(null);
const draftInput = ref<HTMLInputElement | null>(null);
const cliInputs = ref(defaultCliCommandInputs());
const copiedCommandId = ref<string | null>(null);
const reviewDecisions = ref<ReviewDecisionMap>({});
const manualOverrideInputs = ref<ManualOverrideInputMaps>({ romaji: {}, zhAssist: {} });

const editedProject = computed(() => {
  if (!fixtures.value) {
    return null;
  }

  return buildAnnotationProjectWithManualOverrides(fixtures.value.project, manualOverrideInputs.value);
});

const viewerLines = computed(() => {
  if (!fixtures.value || !editedProject.value) {
    return [];
  }
  return createViewerLines(editedProject.value.lines, fixtures.value.draft, reviewDecisions.value);
});

const cliCommands = computed(() => buildCliCommands(cliInputs.value));

const summary = computed(() => {
  const all = viewerLines.value;
  return {
    total: all.length,
    corrections: all.filter((item) => item.overlay).length,
    textOverrides: all.filter((item) => item.manualOverrideState.labels.length > 0).length
  };
});

const reviewStorageKey = computed(() => {
  if (!fixtures.value) {
    return null;
  }

  return `singbridge-review:${fixtures.value.projectName}:${fixtures.value.draftName ?? "no-draft"}`;
});

const editorStorageKey = computed(() => {
  if (!fixtures.value) {
    return null;
  }

  return `singbridge-editor:${fixtures.value.projectName}`;
});

function statusLabel(status: string): string {
  switch (status) {
    case "reading_mismatch":
      return "读音不一致";
    case "format_difference":
      return "格式差异";
    default:
      return status;
  }
}

function reviewReasonLabel(reason: string): string {
  switch (reason) {
    case "unknown_kanji_reading":
      return "汉字读音需人工确认";
    case "mixed_language_line":
      return "混合语言行";
    case "reading_adapter_unavailable":
      return "读音生成器不可用";
    case "non_japanese_line":
      return "非日语歌词行";
    default:
      return reason;
  }
}

function reviewDecisionLabel(decision: ReviewDecision): string {
  switch (decision) {
    case "accepted":
      return "已接受";
    case "ignored":
      return "已忽略";
    case "pending":
      return "待处理";
  }
}

function setReviewDecision(lineId: string, decision: ReviewDecision): void {
  if (decision === "pending") {
    const next = { ...reviewDecisions.value };
    delete next[lineId];
    reviewDecisions.value = next;
    return;
  }

  reviewDecisions.value = {
    ...reviewDecisions.value,
    [lineId]: decision
  };
}

function resetManualOverrideInputs(): void {
  manualOverrideInputs.value = fixtures.value ? buildManualOverrideInputs(fixtures.value.project.lines) : { romaji: {}, zhAssist: {} };
}

function clearLineManualOverrides(lineId: string): void {
  manualOverrideInputs.value = {
    romaji: {
      ...manualOverrideInputs.value.romaji,
      [lineId]: ""
    },
    zhAssist: {
      ...manualOverrideInputs.value.zhAssist,
      [lineId]: ""
    }
  };
}

function loadManualOverrideInputs(): void {
  const key = editorStorageKey.value;
  if (!key || !fixtures.value) {
    resetManualOverrideInputs();
    return;
  }

  const base = buildManualOverrideInputs(fixtures.value.project.lines);
  const saved = window.localStorage.getItem(key);
  if (!saved) {
    manualOverrideInputs.value = base;
    return;
  }

  try {
    manualOverrideInputs.value = sanitizeManualOverrideInputs(JSON.parse(saved), base);
  } catch {
    manualOverrideInputs.value = base;
  }
}

function saveManualOverrideInputs(inputs: ManualOverrideInputMaps): void {
  const key = editorStorageKey.value;
  if (!key) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(inputs));
}

function loadReviewDecisions(): void {
  const key = reviewStorageKey.value;
  if (!key) {
    reviewDecisions.value = {};
    return;
  }

  const saved = window.localStorage.getItem(key);
  if (!saved) {
    reviewDecisions.value = {};
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    reviewDecisions.value = sanitizeReviewDecisions(parsed);
  } catch {
    reviewDecisions.value = {};
  }
}

function saveReviewDecisions(decisions: ReviewDecisionMap): void {
  const key = reviewStorageKey.value;
  if (!key) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(decisions));
}

function sanitizeReviewDecisions(value: unknown): ReviewDecisionMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, "accepted" | "ignored"] => {
      return entry[1] === "accepted" || entry[1] === "ignored";
    })
  );
}

function exportReviewDecisions(): void {
  if (!fixtures.value) {
    return;
  }

  const payload = buildReviewDecisionExport(viewerLines.value, {
    projectName: fixtures.value.projectName,
    ...(fixtures.value.draftName ? { draftName: fixtures.value.draftName } : {}),
    exportedAt: new Date().toISOString()
  });
  downloadJson(payload, "romaji-review-decisions.json");
}

function exportEditedAnnotation(): void {
  if (!editedProject.value) {
    return;
  }

  downloadJson(editedProject.value, "singbridge-annotation-updated.json");
}

function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadDefaultFixtures(): Promise<void> {
  try {
    const [projectResponse, draftResponse] = await Promise.all([
      fetch("/fixtures/annotation-full-demo.json"),
      fetch("/fixtures/correction-draft-full-demo.json")
    ]);

    if (!projectResponse.ok || !draftResponse.ok) {
      throw new Error("fixture_load_failed");
    }

    const projectJson = await projectResponse.json();
    const draftJson = await draftResponse.json();
    fixtures.value = {
      project: loadAnnotationProjectValue(projectJson, "内置完整合成示例 annotation-full-demo.json").project,
      draft: parseCorrectionDraft(draftJson),
      projectName: "内置完整合成示例 annotation-full-demo.json",
      draftName: "内置完整合成示例 correction-draft-full-demo.json"
    };
    loadManualOverrideInputs();
  } catch {
    loadError.value = "无法加载示例 JSON。";
  }
}

async function handleProjectFile(event: Event): Promise<void> {
  const file = selectedFile(event);
  if (!file) {
    return;
  }

  try {
    fixtures.value = loadAnnotationProjectValue(await readJsonFile(file), file.name);
    loadManualOverrideInputs();
    loadError.value = null;
  } catch (error) {
    loadError.value = errorMessage(error);
  } finally {
    resetFileInput(event);
  }
}

async function handleDraftFile(event: Event): Promise<void> {
  const file = selectedFile(event);
  if (!file) {
    return;
  }

  if (!fixtures.value) {
    loadError.value = "请先加载标注 JSON，再加载修正建议 JSON。";
    resetFileInput(event);
    return;
  }

  try {
    fixtures.value = loadCorrectionDraftValue(fixtures.value, await readJsonFile(file), file.name);
    loadError.value = null;
  } catch (error) {
    loadError.value = errorMessage(error);
  } finally {
    resetFileInput(event);
  }
}

function selectedFile(event: Event): File | null {
  const input = event.target as HTMLInputElement;
  return input.files?.[0] ?? null;
}

function resetFileInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  input.value = "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "无法加载 JSON 文件。";
}

async function copyCommand(command: CliCommand): Promise<void> {
  if (!command.enabled) {
    return;
  }

  try {
    await navigator.clipboard.writeText(command.command);
    copiedCommandId.value = command.id;
    window.setTimeout(() => {
      if (copiedCommandId.value === command.id) {
        copiedCommandId.value = null;
      }
    }, 1600);
  } catch {
    loadError.value = "无法复制命令。请手动选中命令文本复制。";
  }
}

watch(reviewStorageKey, loadReviewDecisions);
watch(reviewDecisions, saveReviewDecisions, { deep: true });
watch(editorStorageKey, loadManualOverrideInputs);
watch(manualOverrideInputs, saveManualOverrideInputs, { deep: true });

onMounted(loadDefaultFixtures);
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">SingBridge 标注预览</p>
        <h1>{{ fixtures?.project.title ?? "日语歌词标注查看器" }}</h1>
        <p class="subtitle">
          {{ fixtures?.project.artist ?? "静态示例" }} · 共 {{ summary.total }} 行 · {{ summary.textOverrides }} 行手动覆盖
        </p>
      </div>
      <div class="topbar-actions">
        <div class="file-actions">
          <button class="file-button" type="button" @click="projectInput?.click()">选择标注 JSON</button>
          <button class="file-button" type="button" @click="draftInput?.click()">加载修正建议 JSON</button>
          <button class="file-button" type="button" :disabled="summary.corrections === 0" @click="exportReviewDecisions">
            导出复核决定 JSON
          </button>
          <button class="file-button" type="button" :disabled="!fixtures" @click="exportEditedAnnotation">
            导出更新后的标注 JSON
          </button>
          <input ref="projectInput" class="file-input" type="file" accept="application/json,.json" @change="handleProjectFile" />
          <input ref="draftInput" class="file-input" type="file" accept="application/json,.json" @change="handleDraftFile" />
        </div>
      </div>
    </header>

    <section v-if="loadError" class="empty-state">{{ loadError }}</section>
    <section v-else-if="!fixtures" class="empty-state">正在加载示例 JSON...</section>
    <section v-else class="source-strip">
      <span>标注文件：{{ fixtures.projectName }}</span>
      <span>修正建议：{{ fixtures.draftName ?? "未加载" }}</span>
      <span>编辑草稿保存在此浏览器，不会改写原 JSON。</span>
    </section>

    <details class="cli-helper">
      <summary class="cli-summary">CLI 生成流程</summary>
      <div class="cli-helper-heading">
        <div>
          <p class="eyebrow">CLI 生成流程</p>
          <h2 id="cli-helper-title">从歌词生成可加载 JSON</h2>
        </div>
        <p>在 PowerShell 里运行这些命令，然后回到这里加载生成的 JSON。</p>
      </div>

      <div class="cli-fields">
        <label>
          <span>歌词文件</span>
          <input v-model="cliInputs.lyricsPath" type="text" placeholder="lyrics.txt" />
        </label>
        <label>
          <span>标注输出</span>
          <input v-model="cliInputs.projectPath" type="text" placeholder="song.json" />
        </label>
        <label>
          <span>参考 romaji</span>
          <input v-model="cliInputs.referencePath" type="text" placeholder="reference-romaji.txt" />
        </label>
        <label>
          <span>对照报告</span>
          <input v-model="cliInputs.reportPath" type="text" placeholder="romaji-report.md" />
        </label>
        <label>
          <span>修正建议输出</span>
          <input v-model="cliInputs.correctionsPath" type="text" placeholder="corrections.json" />
        </label>
        <label>
          <span>应用后输出</span>
          <input v-model="cliInputs.correctedPath" type="text" placeholder="corrected.json" />
        </label>
        <label>
          <span>复核决定 JSON</span>
          <input v-model="cliInputs.decisionsPath" type="text" placeholder="romaji-review-decisions.json" />
        </label>
        <label>
          <span>复核后输出</span>
          <input v-model="cliInputs.reviewedPath" type="text" placeholder="reviewed.json" />
        </label>
      </div>

      <div class="command-list">
        <article v-for="command in cliCommands" :key="command.id" class="command-card" :class="{ disabled: !command.enabled }">
          <div class="command-copy-row">
            <div>
              <h3>{{ command.title }}</h3>
              <p>{{ command.description }}</p>
            </div>
            <button class="copy-button" type="button" :disabled="!command.enabled" @click="copyCommand(command)">
              {{ copiedCommandId === command.id ? "已复制" : "复制" }}
            </button>
          </div>
          <code>{{ command.command }}</code>
        </article>
      </div>
    </details>

    <section v-if="fixtures" class="line-list" aria-live="polite">
      <article
        v-for="item in viewerLines"
        :key="item.line.id"
        class="lyric-line"
        :class="{
          review: item.line.needsReview,
          correction: item.overlay,
          mismatch: item.overlay?.status === 'reading_mismatch',
          format: item.overlay?.status === 'format_difference',
          accepted: item.reviewDecision === 'accepted',
          ignored: item.reviewDecision === 'ignored'
        }"
      >
        <div class="line-index">{{ item.line.index + 1 }}</div>
        <div class="line-body">
          <div class="line-heading">
            <h2>{{ item.line.original }}</h2>
          </div>

          <dl class="layers">
            <div>
              <dt>Romaji</dt>
              <dd>{{ item.line.manualOverrides.romaji ?? item.line.romaji ?? "—" }}</dd>
            </div>
            <div>
              <dt>中文发音辅助</dt>
              <dd>{{ item.line.manualOverrides.zhAssist ?? item.line.zhAssist ?? "—" }}</dd>
            </div>
          </dl>

          <details class="edit-details">
            <summary>
              <span v-if="item.manualOverrideState.labels.length">
                已手动覆盖：{{ item.manualOverrideState.labels.join(" / ") }}
              </span>
              <span v-else>编辑本行覆盖</span>
            </summary>
            <div class="override-editor-grid">
              <label class="override-editor">
                <span>手动 romaji 覆盖</span>
                <input
                  v-model="manualOverrideInputs.romaji[item.line.id]"
                  type="text"
                  :placeholder="item.line.romaji ?? '输入 romaji override'"
                />
              </label>
              <label class="override-editor">
                <span>手动中文发音辅助覆盖</span>
                <input
                  v-model="manualOverrideInputs.zhAssist[item.line.id]"
                  type="text"
                  :placeholder="item.line.zhAssist ?? '输入中文发音辅助 override'"
                />
              </label>
              <div class="manual-override-actions">
                <span v-if="item.manualOverrideState.labels.length">
                  已手动覆盖：{{ item.manualOverrideState.labels.join(" / ") }}
                </span>
                <span v-else>暂无手动覆盖</span>
                <button
                  type="button"
                  :disabled="item.manualOverrideState.labels.length === 0"
                  @click="clearLineManualOverrides(item.line.id)"
                >
                  清除本行覆盖
                </button>
              </div>
            </div>
          </details>

          <details class="review-details">
            <summary>发音难点与复核信息</summary>
            <div class="notes-grid">
              <section>
                <h3>发音难点</h3>
                <ul v-if="item.line.difficultyNotes.length">
                  <li v-for="note in item.line.difficultyNotes" :key="`${note.type}-${note.span}-${note.message}`">
                    <strong>{{ note.span }}</strong> {{ note.message }}
                  </li>
                </ul>
                <p v-else class="muted">暂无发音难点。</p>
              </section>
              <section>
                <h3>复核原因</h3>
                <ul v-if="item.line.reviewReasons.length">
                  <li v-for="reason in item.line.reviewReasons" :key="reason">{{ reviewReasonLabel(reason) }}</li>
                </ul>
                <p v-else class="muted">暂无复核标记。</p>
              </section>
            </div>

            <aside v-if="item.overlay" class="overlay-panel">
              <div class="overlay-summary" :class="`guidance-${item.overlay.guidance.level}`">
                <span>修正类型</span>
                <div class="overlay-summary-row">
                  <strong>{{ item.overlay.guidance.title }}</strong>
                  <em>{{ reviewDecisionLabel(item.reviewDecision) }}</em>
                </div>
                <div class="guidance-row">
                  <b>{{ item.overlay.guidance.label }}</b>
                  <p>{{ item.overlay.guidance.action }}</p>
                </div>
                <p>{{ item.overlay.guidance.detail }}</p>
              </div>
              <div class="overlay-comparison">
                <div>
                  <span>当前 kana</span>
                  <strong>{{ item.overlay.currentKana ?? "—" }}</strong>
                </div>
                <div>
                  <span>当前 romaji</span>
                  <strong>{{ item.overlay.currentRomaji ?? "—" }}</strong>
                </div>
                <div>
                  <span>参考 romaji</span>
                  <strong>{{ item.overlay.referenceRomaji }}</strong>
                </div>
                <div>
                  <span>建议 romaji</span>
                  <strong>{{ item.overlay.suggestedRomaji }}</strong>
                </div>
              </div>
              <div class="overlay-kana-warning">
                <span>建议 kana</span>
                <strong>{{ item.overlay.suggestedKana ?? "null" }}</strong>
                <p>不会从 romaji 自动反推 kana，需要人工确认。</p>
              </div>
              <div class="overlay-review-reasons">
                <span>复核原因</span>
                <p v-if="item.overlay.reviewReasons.length">
                  {{ item.overlay.reviewReasons.map(reviewReasonLabel).join("、") }}
                </p>
                <p v-else>无额外复核原因。</p>
              </div>
              <p class="overlay-note">{{ item.overlay.note }}</p>
              <div class="review-actions" aria-label="复核决定">
                <button
                  type="button"
                  :class="{ active: item.reviewDecision === 'accepted' }"
                  @click="setReviewDecision(item.line.id, 'accepted')"
                >
                  接受建议
                </button>
                <button
                  type="button"
                  :class="{ active: item.reviewDecision === 'ignored' }"
                  @click="setReviewDecision(item.line.id, 'ignored')"
                >
                  忽略建议
                </button>
                <button type="button" @click="setReviewDecision(item.line.id, 'pending')">
                  重置待处理
                </button>
              </div>
            </aside>
          </details>
        </div>
      </article>
    </section>
  </main>
</template>
