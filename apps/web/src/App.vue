<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { LoadedFixtures, ViewerTab } from "./types";
import { createViewerLines, filterViewerLines } from "./viewModel";
import { buildCliCommands, defaultCliCommandInputs, type CliCommand } from "./commandBuilder";
import {
  parseCorrectionDraft,
  readJsonFile
} from "./fileValidation";
import { loadAnnotationProjectValue, loadCorrectionDraftValue } from "./localJsonLoad";

const tabs: { id: ViewerTab; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "review", label: "需复核" },
  { id: "corrections", label: "修正建议" }
];

const activeTab = ref<ViewerTab>("all");
const fixtures = ref<LoadedFixtures | null>(null);
const loadError = ref<string | null>(null);
const projectInput = ref<HTMLInputElement | null>(null);
const draftInput = ref<HTMLInputElement | null>(null);
const cliInputs = ref(defaultCliCommandInputs());
const copiedCommandId = ref<string | null>(null);

const viewerLines = computed(() => {
  if (!fixtures.value) {
    return [];
  }
  return createViewerLines(fixtures.value.project.lines, fixtures.value.draft);
});

const visibleLines = computed(() => filterViewerLines(viewerLines.value, activeTab.value));

const cliCommands = computed(() => buildCliCommands(cliInputs.value));

const summary = computed(() => {
  const all = viewerLines.value;
  return {
    total: all.length,
    review: all.filter((item) => item.line.needsReview || item.line.reviewReasons.length > 0).length,
    corrections: all.filter((item) => item.overlay).length
  };
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

function correctionGuidance(status: string): string {
  return status === "reading_mismatch"
    ? "读音可能不同。先人工确认 kana，再决定是否只采用 romaji。"
    : "只是空格或格式不同。通常可以直接采用建议 romaji。";
}

async function loadDefaultFixtures(): Promise<void> {
  try {
    const [projectResponse, draftResponse] = await Promise.all([
      fetch("/fixtures/annotation-ja.json"),
      fetch("/fixtures/correction-draft.json")
    ]);

    if (!projectResponse.ok || !draftResponse.ok) {
      throw new Error("fixture_load_failed");
    }

    fixtures.value = {
      project: loadAnnotationProjectValue(await projectResponse.json(), "内置示例 annotation-ja.json").project,
      draft: parseCorrectionDraft(await draftResponse.json()),
      projectName: "内置示例 annotation-ja.json",
      draftName: "内置示例 correction-draft.json"
    };
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
    activeTab.value = "all";
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
    activeTab.value = "corrections";
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

onMounted(loadDefaultFixtures);
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">SingBridge 标注预览</p>
        <h1>{{ fixtures?.project.title ?? "日语歌词标注查看器" }}</h1>
        <p class="subtitle">
          {{ fixtures?.project.artist ?? "静态示例" }} · 共 {{ summary.total }} 行 ·
          {{ summary.review }} 行需复核 · {{ summary.corrections }} 条修正建议
        </p>
      </div>
      <div class="topbar-actions">
        <nav class="tabs" aria-label="歌词行筛选">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            type="button"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>
        <div class="file-actions">
          <button class="file-button" type="button" @click="projectInput?.click()">选择标注 JSON</button>
          <button class="file-button" type="button" @click="draftInput?.click()">加载修正建议 JSON</button>
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
    </section>

    <section class="cli-helper" aria-labelledby="cli-helper-title">
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
    </section>

    <section v-if="fixtures" class="line-list" aria-live="polite">
      <article
        v-for="item in visibleLines"
        :key="item.line.id"
        class="lyric-line"
        :class="{
          review: item.line.needsReview,
          correction: item.overlay,
          mismatch: item.overlay?.status === 'reading_mismatch',
          format: item.overlay?.status === 'format_difference'
        }"
      >
        <div class="line-index">{{ item.line.index + 1 }}</div>
        <div class="line-body">
          <div class="line-heading">
            <h2>{{ item.line.original }}</h2>
            <span v-if="item.overlay" class="status-pill">{{ statusLabel(item.overlay.status) }}</span>
            <span v-else-if="item.line.needsReview" class="status-pill quiet">需复核</span>
          </div>

          <dl class="layers">
            <div>
              <dt>Kana</dt>
              <dd>{{ item.line.manualOverrides.kana ?? item.line.kana ?? "—" }}</dd>
            </div>
            <div>
              <dt>Romaji</dt>
              <dd>{{ item.line.manualOverrides.romaji ?? item.line.romaji ?? "—" }}</dd>
            </div>
            <div>
              <dt>中文发音辅助</dt>
              <dd>{{ item.line.manualOverrides.zhAssist ?? item.line.zhAssist ?? "—" }}</dd>
            </div>
          </dl>

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
            <div class="overlay-summary">
              <span>修正类型</span>
              <strong>{{ statusLabel(item.overlay.status) }}</strong>
              <p>{{ correctionGuidance(item.overlay.status) }}</p>
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
          </aside>
        </div>
      </article>
    </section>
  </main>
</template>
