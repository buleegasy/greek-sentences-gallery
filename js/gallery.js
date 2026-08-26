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
const pendingBlocksQueue = []; // 纯数据待打字队列
let currentTypingJob = null;
let isFirstSync = true;
let lastTypingEndTime = 0;

function sanitizeText(raw) {
  if (!raw) return "";
  let text = raw.trim();
  // 彻底剔除希腊字母、外文字符、方括号序号、编程代码符号与杂质（严格保留 * 用于 Markdown **重点词加粗**）
  text = text
    .replace(/[\u0370-\u03ff\u1f00-\u1fff]+/g, '')
    .replace(/[a-zA-Z]+/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/[\[\]【】\{\}\(\)\;\:\=\+\-\/\<\>\&\|\$\#\\•·~_\`]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return text;
}

function formatMarkdown(text) {
  if (!text) return "";
  // 匹配闭合的 **word**
  let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="key-term">$1</strong>');
  // 匹配打字过程中正在生成的未闭合 **word
  html = html.replace(/\*\*([^*]+)$/g, '<strong class="key-term">$1</strong>');
  // 清理残留的孤立星号
  html = html.replace(/\*/g, '');
  return html;
}

function createBlockDOM(block, instantText = null) {
  const div = document.createElement('div');
  div.className = 'rolling-block';
  div.id = `block-${block.id}`;

  const pElem = document.createElement('p');
  pElem.className = 'block-text';

  if (instantText !== null) {
    pElem.innerHTML = formatMarkdown(instantText);
  } else {
    pElem.innerText = "";
  }

  div.appendChild(pElem);
  trackElem.appendChild(div);
  return pElem;
}

// 更新遥测面板
function updateTelemetry(state) {
  const stage = state.current_stage || "STREAM_ACTIVE";
  const progress = state.progress || 100;
  const logs = state.logs || [];
  const bufferCount = state.buffer_count !== undefined ? state.buffer_count : pendingBlocksQueue.length;

  if (telemetryStageName) telemetryStageName.innerText = `STAGE: ${stage}`;
  if (telemetryStagePct) telemetryStagePct.innerText = `${progress}% (POOL: ${bufferCount})`;
  if (telemetryBarFill) telemetryBarFill.style.width = `${progress}%`;
  if (telemetrySummary) {
    telemetrySummary.innerText = `LIVE AUTOREGRESSIVE STREAM | POOL: ${bufferCount}`;
  }

  if (telemetryLogsList && logs.length > 0) {
    telemetryLogsList.innerHTML = logs.map(l => `<div class="log-row">${l}</div>`).join('');
    telemetryLogsList.scrollTop = telemetryLogsList.scrollHeight;
  }
}

// 全球同步实时轮询
async function syncGlobalState() {
  try {
    if (gradioClient) {
      const result = await gradioClient.predict("/state", []);
      if (result && result.data && result.data[0]) {
        const state = JSON.parse(result.data[0]);
        updateTelemetry(state);

        if (state.blocks && state.blocks.length > 0) {
          if (isFirstSync) {
            for (const block of state.blocks) {
              renderedBlockIds.add(block.id);
            }

            const recentBlocks = state.blocks.slice(-3);
            for (let i = 0; i < recentBlocks.length; i++) {
              const b = recentBlocks[i];
              const clean = sanitizeText(b.text);
              if (!clean || clean.length < 5) continue;

              const isLatest = (i === recentBlocks.length - 1);
              if (!isLatest) {
                createBlockDOM(b, clean);
              } else {
                pendingBlocksQueue.push({ id: b.id, text: clean });
              }
            }

            setTimeout(() => {
              const H = window.innerHeight;
              const targetY = H * 0.72;
              currentScrollY = targetY - trackElem.scrollHeight;
            }, 30);

            ensureSplashDismissal();
            isFirstSync = false;
          } else {
            // 运行期：新生成的自回归段落追加到队列
            for (const block of state.blocks) {
              if (!renderedBlockIds.has(block.id)) {
                renderedBlockIds.add(block.id);
                const clean = sanitizeText(block.text);
                if (clean && clean.length >= 5) {
                  pendingBlocksQueue.push({ id: block.id, text: clean });
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Global sync remote polling:", e);
  }

  // 超过 18 个 DOM 节点时安全清理视口上方极远处的旧段落
  const allBlocks = trackElem.querySelectorAll('.rolling-block');
  if (allBlocks.length > 18) {
    const firstBlock = allBlocks[0];
    const rect = firstBlock.getBoundingClientRect();
    if (rect.bottom < -1200) {
      firstBlock.remove();
    }
  }

  setTimeout(syncGlobalState, 1000);
}

// 屏幕空间绝对闭环防漂移伺服引擎与无缝打字流水线（Zero-Gap Continuous Stream）
function startContinuousScrollLoop() {
  let typewriterLastTime = 0;

  function tick(time) {
    if (!typewriterLastTime) typewriterLastTime = time;

    // 1. 无缝打字机调度：只要有待打字数据且处于换段间歇后，即刻开启下一段
    const now = Date.now();
    const canStartNext = (!currentTypingJob && (now - lastTypingEndTime > 150) && pendingBlocksQueue.length > 0);

    if (canStartNext) {
      const nextData = pendingBlocksQueue.shift();
      if (nextData) {
        const pElem = createBlockDOM(nextData);
        currentTypingJob = {
          id: nextData.id,
          text: nextData.text,
          currentIndex: 0,
          pElem: pElem
        };
      }
    }

    // 打字推进节奏：以黄金文学语速 (48ms/字) 丝滑推进
    const speedMs = 48;
    if (currentTypingJob && (time - typewriterLastTime > speedMs)) {
      typewriterLastTime = time;
      if (currentTypingJob.currentIndex < currentTypingJob.text.length) {
        currentTypingJob.currentIndex++;
        const typed = currentTypingJob.text.slice(0, currentTypingJob.currentIndex);
        const formatted = formatMarkdown(typed);
        currentTypingJob.pElem.innerHTML = `${formatted}<span class="typing-cursor">▍</span>`;
      } else {
        // 本段打字完毕，移除光标，记录结束时间，进入 150ms 自然微呼吸即刻衔接下一段
        currentTypingJob.pElem.innerHTML = formatMarkdown(currentTypingJob.text);
        currentTypingJob = null;
        lastTypingEndTime = Date.now();
      }
    }

    // 2. 屏幕空间绝对坐标闭环伺服控制：锁定在 72% 黄金线
    const H = window.innerHeight;
    const targetScreenY = H * 0.72;

    const activeCursor = trackElem.querySelector('.typing-cursor');
    let currentFocusScreenY = 0;

    if (activeCursor) {
      const cursorRect = activeCursor.getBoundingClientRect();
      currentFocusScreenY = cursorRect.top + (cursorRect.height / 2);
    } else {
      const lastBlock = trackElem.querySelector('.rolling-block:last-child');
      if (lastBlock) {
        currentFocusScreenY = lastBlock.getBoundingClientRect().bottom;
      } else {
        currentFocusScreenY = targetScreenY;
      }
    }

    const error = targetScreenY - currentFocusScreenY;
    currentScrollY += error * 0.18;
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// 浏览器失焦/切回瞬间重校
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const H = window.innerHeight;
    const targetScreenY = H * 0.72;
    const activeCursor = trackElem.querySelector('.typing-cursor');
    if (activeCursor) {
      const cursorRect = activeCursor.getBoundingClientRect();
      const currentFocusScreenY = cursorRect.top + (cursorRect.height / 2);
      const error = targetScreenY - currentFocusScreenY;
      currentScrollY += error;
      trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;
    }
  }
});

// 初始化
async function initClient() {
  setTimeout(ensureSplashDismissal, 3000);
  startContinuousScrollLoop();

  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    syncGlobalState();
  } catch (e) {
    console.warn("Gradio connect retry in 2s...", e);
    setTimeout(initClient, 2000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initClient();
});
