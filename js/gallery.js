import { Client } from "./gradio.js";

let gradioClient = null;
const liveTextElem = document.getElementById('live-text-block');
const heroSplashElem = document.getElementById('hero-splash');
const readingContainer = document.querySelector('.reading-container');
const loadingIndicator = document.getElementById('neural-loading-indicator');
const loadingStageText = document.getElementById('loading-stage-text');
const loadingBarFill = document.getElementById('loading-bar-fill');

// 遥测抽屉元素
const telemetryBtn = document.getElementById('telemetry-toggle-btn');
const telemetryDrawer = document.getElementById('telemetry-drawer');
const telemetryCloseBtn = document.getElementById('telemetry-close-btn');
const telemetryStageName = document.getElementById('telemetry-stage-name');
const telemetryStagePct = document.getElementById('telemetry-stage-pct');
const telemetryBarFill = document.getElementById('telemetry-bar-fill');
const telemetryLogsList = document.getElementById('telemetry-logs-list');
const telemetrySummary = document.getElementById('telemetry-status-summary');

// 交互开关遥测日志
if (telemetryBtn && telemetryDrawer) {
  telemetryBtn.addEventListener('click', () => {
    telemetryDrawer.classList.toggle('open');
  });
}
if (telemetryCloseBtn && telemetryDrawer) {
  telemetryCloseBtn.addEventListener('click', () => {
    telemetryDrawer.classList.remove('open');
  });
}

// 全球同步实时状态
let currentActiveBlockId = null;
let targetText = "";
let currentTypedIndex = 0;
let isTyping = false;
let typewriterTimer = null;

// 卷首题记计时控制：保证展示至少 3 秒后丝滑切出
const splashStartTime = Date.now();
let splashDismissed = false;

function dismissSplash() {
  if (!splashDismissed && heroSplashElem) {
    heroSplashElem.classList.add('fade-out');
    splashDismissed = true;
  }
}

function ensureSplashDismissal() {
  const elapsed = Date.now() - splashStartTime;
  const waitMs = Math.max(0, 3000 - elapsed);
  setTimeout(dismissSplash, waitMs);
}

// 打字机恒定速率：65毫秒/字 (全设备严格统一)
const TYPEWRITER_INTERVAL_MS = 65;

// 1. 打字机逐字输出引擎 (带活体跳动光标)
function startTypewriter(newText) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  
  targetText = newText;
  currentTypedIndex = 0;
  isTyping = true;
  
  // 隐藏中间加载指示器，展现打字容器
  if (loadingIndicator) loadingIndicator.style.display = 'none';
  if (liveTextElem) liveTextElem.style.display = 'block';

  // 切段时的柔和呼吸渐变
  if (readingContainer) {
    readingContainer.classList.add('fade-transition');
    setTimeout(() => {
      liveTextElem.innerHTML = '<span class="typing-cursor">▍</span>';
      readingContainer.classList.remove('fade-transition');
    }, 300);
  } else {
    liveTextElem.innerHTML = '<span class="typing-cursor">▍</span>';
  }

  setTimeout(() => {
    typewriterTimer = setInterval(() => {
      if (currentTypedIndex < targetText.length) {
        currentTypedIndex++;
        const visibleSlice = targetText.slice(0, currentTypedIndex);
        liveTextElem.innerHTML = `${visibleSlice}<span class="typing-cursor">▍</span>`;
      } else {
        // 打字结束，保留纯净文本，光标隐去
        liveTextElem.innerHTML = targetText;
        clearInterval(typewriterTimer);
        typewriterTimer = null;
        isTyping = false;
      }
    }, TYPEWRITER_INTERVAL_MS);
  }, 350);
}

// 2. 更新遥测状态与日志
function updateTelemetry(state) {
  const stage = state.current_stage || "SYNCING";
  const progress = state.progress || (state.is_generating ? 50 : 100);
  const logs = state.logs || [];

  if (loadingStageText) loadingStageText.innerText = `STAGE: ${stage} (${progress}%)`;
  if (loadingBarFill) loadingBarFill.style.width = `${progress}%`;

  if (telemetryStageName) telemetryStageName.innerText = `STAGE: ${stage}`;
  if (telemetryStagePct) telemetryStagePct.innerText = `${progress}%`;
  if (telemetryBarFill) telemetryBarFill.style.width = `${progress}%`;
  if (telemetrySummary) {
    telemetrySummary.innerText = state.is_generating ? `GEN: ${stage}` : `STREAM: ACTIVE`;
  }

  if (telemetryLogsList && logs.length > 0) {
    telemetryLogsList.innerHTML = logs.map(l => `<div class="log-row">${l}</div>`).join('');
    telemetryLogsList.scrollTop = telemetryLogsList.scrollHeight;
  }
}

// 3. 全球状态同步与实时广播轮询
async function syncGlobalState() {
  try {
    const result = await gradioClient.predict("/state", []);
    if (result && result.data && result.data[0]) {
      const state = JSON.parse(result.data[0]);
      
      updateTelemetry(state);

      if (state.blocks && state.blocks.length > 0) {
        // 永远只获取云端最新产生的那个实时字块
        const latestBlock = state.blocks[state.blocks.length - 1];
        
        if (latestBlock && latestBlock.id !== currentActiveBlockId) {
          currentActiveBlockId = latestBlock.id;
          const cleanChineseText = latestBlock.text.trim();
          
          if (cleanChineseText) {
            startTypewriter(cleanChineseText);
            ensureSplashDismissal();
          }
        }
      }
    }
  } catch (e) {
    console.error("Global sync fetch error:", e);
    if (telemetrySummary) telemetrySummary.innerText = "RECONNECTING...";
  }
  
  // 1.5 秒轮询一次，保持多端毫秒级实时同步
  setTimeout(syncGlobalState, 1500);
}

// 4. 连接云端神经中枢
async function initClient() {
  setTimeout(ensureSplashDismissal, 3500);
  
  try {
    if (telemetrySummary) telemetrySummary.innerText = "CONNECTING...";
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (telemetrySummary) telemetrySummary.innerText = "CONNECTED";
    syncGlobalState();
  } catch (e) {
    console.error("Gradio connect failed, retrying...", e);
    setTimeout(initClient, 2000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initClient();
});
