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
const renderedBlockIds = new Set();
const typewriterQueue = [];
let isFirstSync = true;
const TYPEWRITER_SPEED_MS = 60; // 舒适打字机速率 (60ms/字)

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

          // 视口初始精准锚定：将光标直接置于屏幕高度 70% 处（严格在 60%~80% 黄金区间）
          setTimeout(() => {
            const H = window.innerHeight;
            currentScrollY = (H * 0.70) - trackElem.scrollHeight;
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

// 弹性摄像机循环：确保生成光标严格锁定在屏幕下 1/5 至 2/5 区间（即 60% ~ 80% Viewport Height）
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

    // 1. 打字机流式输出 (带活体光标)
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

    // 2. 空间几何锚定：获取当前打字光标（或最新字块底端）在屏幕上的绝对垂直坐标
    const H = window.innerHeight;
    const minZoneY = H * 0.60; // 屏幕下五分之二线 (40% from bottom = 60% of viewport)
    const maxZoneY = H * 0.80; // 屏幕下五分之一线 (20% from bottom = 80% of viewport)
    const targetAnchorY = H * 0.70; // 黄金锚定中心线 (70% of viewport)

    const activeCursor = trackElem.querySelector('.typing-cursor');
    let currentCursorY;

    if (activeCursor) {
      const rect = activeCursor.getBoundingClientRect();
      currentCursorY = rect.top + (rect.height / 2);
    } else {
      const lastBlock = trackElem.querySelector('.rolling-block:last-child');
      if (lastBlock) {
        currentCursorY = lastBlock.getBoundingClientRect().bottom;
      } else {
        currentCursorY = targetAnchorY;
      }
    }

    // 3. 动态摄像机跟随算法：平滑阻尼使光标恒定保持在 [60% * H, 80% * H] 区间内
    const errorY = currentCursorY - targetAnchorY;

    if (currentCursorY > maxZoneY) {
      // 触碰下限 (低于屏幕 80%)：快速平滑拉升
      currentScrollY -= (errorY * 0.12);
    } else if (currentCursorY < minZoneY) {
      // 触碰上限 (高于屏幕 60%)：平滑缓动下降
      currentScrollY -= (errorY * 0.08);
    } else {
      // 在 [60%, 80%] 黄金区间内：以极柔和阻尼向 70% 黄金中心线微调，保证文字匀速流淌
      currentScrollY -= (errorY * 0.045);
    }

    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;

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
