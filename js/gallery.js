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
const pendingBlocksQueue = []; // 纯数据待打字队列（绝不提前生成空 DOM 占据下方空间）
let currentTypingJob = null;
let isFirstSync = true;

function sanitizeText(raw) {
  if (!raw) return "";
  let text = raw.trim();
  // 彻底剔除希腊字母、外文字符、方括号序号、编程代码符号与杂质
  text = text
    .replace(/[\u0370-\u03ff\u1f00-\u1fff]+/g, '')
    .replace(/[a-zA-Z]+/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/[\[\]【】\{\}\(\)\;\:\=\+\-\*\/\<\>\&\|\$\#\\•·~_\`]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return text;
}

function createBlockDOM(block, instantText = null) {
  const div = document.createElement('div');
  div.className = 'rolling-block';
  div.id = `block-${block.id}`;

  const pElem = document.createElement('p');
  pElem.className = 'block-text';

  if (instantText !== null) {
    pElem.innerText = instantText;
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
            const b = recentBlocks[i];
            const clean = sanitizeText(b.text);
            if (!clean || clean.length < 5) continue;

            const isLatest = (i === recentBlocks.length - 1);
            if (!isLatest) {
              createBlockDOM(b, clean);
            } else {
              // 最新段进入打字队列
              pendingBlocksQueue.push({ id: b.id, text: clean });
            }
          }

          // 首次精准锚定：锁定在 72%（距底 28%，严格在下 1/5 至 2/5 黄金带）
          setTimeout(() => {
            const H = window.innerHeight;
            const targetY = H * 0.72;
            currentScrollY = targetY - trackElem.scrollHeight;
          }, 30);

          ensureSplashDismissal();
          isFirstSync = false;
        } else {
          // 运行期：新段落仅压入纯数据待打字队列，绝不提前向 DOM 插入空节点
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

// 绝对防飘移精准摄像机（Direct Optical Anchor Lock）
function startContinuousScrollLoop() {
  let typewriterLastTime = 0;

  function tick(time) {
    // 1. 打字机调度：仅在实际开始打字时才向 DOM 挂载节点
    if (!typewriterLastTime) typewriterLastTime = time;
    
    // 自适应速率调节引擎：排队多时轻微加速 (35~50ms)，常规时以黄金文学语速 (75ms) 稳定推进
    let speedMs = 75;
    if (pendingBlocksQueue.length > 2) {
      speedMs = 35;
    } else if (pendingBlocksQueue.length > 1) {
      speedMs = 50;
    }

    if (!currentTypingJob && pendingBlocksQueue.length > 0) {
      const nextData = pendingBlocksQueue.shift();
      const pElem = createBlockDOM(nextData);
      currentTypingJob = {
        id: nextData.id,
        text: nextData.text,
        currentIndex: 0,
        pElem: pElem
      };
    }

    if (currentTypingJob && (time - typewriterLastTime > speedMs)) {
      typewriterLastTime = time;
      if (currentTypingJob.currentIndex < currentTypingJob.text.length) {
        currentTypingJob.currentIndex++;
        // 关键：将光标放在真实的 DOM 元素 <span class="typing-cursor"> 中，确保摄像机能够实时嗅探到真实物理像素坐标
        const typed = currentTypingJob.text.slice(0, currentTypingJob.currentIndex);
        currentTypingJob.pElem.innerHTML = `${typed}<span class="typing-cursor" style="opacity: 0.85; margin-left: 2px;">▍</span>`;
      } else {
        // 本段打字完毕，移除光标
        currentTypingJob.pElem.innerText = currentTypingJob.text;
        currentTypingJob = null;
      }
    }

    // 2. 绝对光学锚点锁：将正在跳动的光标死死钉在屏幕下 28%（72%高度线）
    const H = window.innerHeight;
    const targetScreenY = H * 0.72;

    const activeCursor = trackElem.querySelector('.typing-cursor');
    const trackRect = trackElem.getBoundingClientRect();
    let cursorLocalY = 0;

    if (activeCursor) {
      const cursorRect = activeCursor.getBoundingClientRect();
      cursorLocalY = cursorRect.top - trackRect.top + (cursorRect.height / 2);
    } else {
      const lastBlock = trackElem.querySelector('.rolling-block:last-child');
      if (lastBlock) {
        const lastRect = lastBlock.getBoundingClientRect();
        cursorLocalY = lastRect.bottom - trackRect.top;
      } else {
        cursorLocalY = trackElem.scrollHeight;
      }
    }

    const idealScrollY = targetScreenY - cursorLocalY;

    // 柔和阻尼跟随（换行时向上移一行，光标静止时零位移）
    currentScrollY += (idealScrollY - currentScrollY) * 0.15;
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// 当浏览器从后台切回前台（失焦恢复）时，强制瞬间重新校准摄像机，防止累积帧误差
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const H = window.innerHeight;
    const targetScreenY = H * 0.72;
    const activeCursor = trackElem.querySelector('.typing-cursor');
    const trackRect = trackElem.getBoundingClientRect();
    if (activeCursor) {
      const cursorRect = activeCursor.getBoundingClientRect();
      const cursorLocalY = cursorRect.top - trackRect.top + (cursorRect.height / 2);
      currentScrollY = targetScreenY - cursorLocalY;
      trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;
    }
  }
});

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
