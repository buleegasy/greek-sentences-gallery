import { Client } from "./gradio.js";

let gradioClient = null;
const trackElem = document.getElementById('teleprompter-track');
const heroSplashElem = document.getElementById('hero-splash');

// 遥测组件元素
const telemetryBtn = document.getElementById('telemetry-toggle-btn');
const telemetryDrawer = document.getElementById('telemetry-drawer');
const telemetryCloseBtn = document.getElementById('telemetry-close-btn');
const telemetryStageName = document.getElementById('telemetry-stage-name');
const telemetryStagePct = document.getElementById('telemetry-stage-pct');
const telemetryBarFill = document.getElementById('telemetry-bar-fill');
const telemetryLogsList = document.getElementById('telemetry-logs-list');
const telemetrySummary = document.getElementById('telemetry-status-summary');

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

// 卷首题记计时控制：保证展示 3 秒后丝滑切出
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

// 物理滚动与打字机队列
let currentScrollY = 0;
const SCROLL_SPEED_PX_PER_SEC = 42; // 提升至电影字幕级黄金滚动流速 (42px/s)
const renderedBlockIds = new Set();
const typewriterQueue = [];
let isFirstSync = true;
const TYPEWRITER_SPEED_MS = 55; // 打字机速率 (55ms/字)

function appendBlockToDOM(block, instantRender = false) {
  const cleanText = block.text.trim();
  if (!cleanText) return;

  const div = document.createElement('div');
  div.className = 'rolling-block';
  div.id = `block-${block.id}`;

  const pElem = document.createElement('p');
  pElem.className = 'block-text';

  if (instantRender) {
    pElem.innerText = cleanText;
  } else {
    pElem.innerText = "";
    typewriterQueue.push({
      id: block.id,
      text: cleanText,
      currentIndex: 0,
      pElem: pElem
    });
  }

  div.appendChild(pElem);
  trackElem.appendChild(div);
}

// 更新遥测面板
function updateTelemetry(state) {
  const stage = state.current_stage || "STREAM_ACTIVE";
  const progress = state.progress || (state.is_generating ? 50 : 100);
  const logs = state.logs || [];

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

// 全球同步实时轮询
async function syncGlobalState() {
  try {
    const result = await gradioClient.predict("/state", []);
    if (result && result.data && result.data[0]) {
      const state = JSON.parse(result.data[0]);
      
      updateTelemetry(state);

      if (state.blocks && state.blocks.length > 0) {
        if (isFirstSync) {
          // 首次进入：载入最近 3~4 段历史形成饱满的长卷河流，最新段进入打字机
          for (const block of state.blocks) {
            renderedBlockIds.add(block.id);
          }

          const recentBlocks = state.blocks.slice(-4);
          for (let i = 0; i < recentBlocks.length; i++) {
            const isLatest = (i === recentBlocks.length - 1);
            appendBlockToDOM(recentBlocks[i], !isLatest);
          }

          // 视口初始定位：使打字机处于屏幕下方 70% 黄金视线区，上方饱满流淌
          setTimeout(() => {
            currentScrollY = (window.innerHeight * 0.72) - trackElem.scrollHeight;
          }, 50);

          ensureSplashDismissal();
          isFirstSync = false;
        } else {
          // 运行期：新自然段无缝衔接入队
          for (const block of state.blocks) {
            if (!renderedBlockIds.has(block.id)) {
              renderedBlockIds.add(block.id);
              appendBlockToDOM(block, false);
            }
          }
        }
      }

      // 清理滚出屏幕上方极远处的旧 DOM
      const allBlocks = trackElem.querySelectorAll('.rolling-block');
      if (allBlocks.length > 15) {
        const firstBlock = allBlocks[0];
        const rect = firstBlock.getBoundingClientRect();
        if (rect.bottom < -1000) {
          const offset = firstBlock.offsetHeight + parseFloat(window.getComputedStyle(firstBlock).marginBottom || 0);
          currentScrollY += offset;
          firstBlock.remove();
        }
      }
    }
  } catch (e) {
    console.error("Global sync fetch error:", e);
  }
  
  setTimeout(syncGlobalState, 1500);
}

// 连续匀速向上滚动物理循环 (Delta Time 60FPS)
function startContinuousScrollLoop() {
  let lastTime = 0;
  let typewriterLastTime = 0;
  
  let lastWindowWidth = window.innerWidth;
  let lastTrackHeight = trackElem.scrollHeight;

  function tick(time) {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;

    // 屏幕宽度变化时的 Reflow 补偿
    const currentWidth = window.innerWidth;
    const currentHeight = trackElem.scrollHeight;
    if (currentWidth !== lastWindowWidth) {
      const diff = lastTrackHeight - currentHeight;
      currentScrollY += diff;
      lastWindowWidth = currentWidth;
    }

    // 恒定绝对物理向上滚动
    currentScrollY -= (SCROLL_SPEED_PX_PER_SEC * (delta / 1000));
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;

    // 打字机流式输出 (带活体光标)
    if (!typewriterLastTime) typewriterLastTime = time;
    const speedMs = typewriterQueue.length > 1 ? 35 : TYPEWRITER_SPEED_MS;

    if (time - typewriterLastTime > speedMs) {
      typewriterLastTime = time;
      if (typewriterQueue.length > 0) {
        const currentJob = typewriterQueue[0];
        if (currentJob.currentIndex < currentJob.text.length) {
          currentJob.currentIndex++;
          currentJob.pElem.innerText = currentJob.text.slice(0, currentJob.currentIndex) + " ▍";
        } else {
          // 打字完成，移除光标，保留纯净文本
          currentJob.pElem.innerText = currentJob.text;
          typewriterQueue.shift();
        }
      }
    }

    lastTrackHeight = trackElem.scrollHeight;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// 初始化
async function initClient() {
  setTimeout(ensureSplashDismissal, 3500);
  startContinuousScrollLoop();
  
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    syncGlobalState();
  } catch (e) {
    console.error("Gradio connect failed, retrying...", e);
    setTimeout(initClient, 2000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initClient();
});
