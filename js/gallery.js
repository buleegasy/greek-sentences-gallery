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

// 24H 本地无限常驻长卷储备库（彻底杜绝任何网络抖动、云端休眠与段间停顿）
const CONTINUOUS_RESERVOIR = [
  "我摸了猫，然后又摸了自己的耳朵。现在感觉有点痒，我担心它是不是有**寄生虫**。而且我还摸了我自己的宝宝，为了让她更加安静。她像疯了一样看着我，好像我是她的母亲。",
  "我的村庄有一种异国情调，而且气氛非常好，**也非常机灵**。两年来，我不知道这到底是什么，我所经历的时间与我所读过的。把我自己的房子用上等的石膏做好，让你也能享受它。",
  "我迷失了。我受不了你那些评论了。用你自己的**石膏**，正如我告诉你的，我没有什么别的可说了。谢谢你的关心，也谢谢你的爱。你已经被我的话语所打动，**永远如此**。",
  "我总能找到我想要的东西。在黑暗的屋子里，我摸到了冰冷的**水龙头**。水流出来的时候带着铁锈的味道，但他们告诉我这是唯一的出口。我把门轻轻带上，不再回头。",
  "他们把那个箱子放在了走廊尽头。我走过去，听见里面有细微的**呼吸声**。你问我为什么停下来，我说我正在等待风把窗户吹开。我们都知道天亮之前谁也走不出去。",
  "我的手指触碰到了潮湿的石墙。在这个没有名字的**港口**，所有的船只都在黄昏时分沉默。你递给我一把生锈的钥匙，但我知道锁孔早就被海水腐蚀了。",
  "我们坐在空旷的房间里，看着墙上的**光影**慢慢拉长。你说时间是一条倒流的河流，可我只看见尘埃在空气中沉降。没有任何人能在这个时刻叫醒我们。",
  "我把你留下的字条折成了很小的形状。走在下着细雨的街道上，路灯把每一个人的影子都拉得**极为陌生**。我想告诉你我找到了答案，但电话那头只有盲音。",
  "奥林匹亚科斯的比赛还在继续。我们在看台上注视着那片巨大的**塞弗体育馆**。比分已经不再重要，关键是谁能在这个漫长的夜晚坚持到最后一分钟。",
  "我剪掉了枯萎的花枝，把它们整齐地放在桌角。你推开门问我是不是听见了什么，我说那是**风声**穿过了隔壁空置的走廊。一切都在慢慢归于沉寂。"
];
let reservoirIndex = Math.floor(Math.random() * CONTINUOUS_RESERVOIR.length);

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
    telemetrySummary.innerText = `24H STREAM ACTIVE | POOL: ${bufferCount}`;
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
            // 运行期：新段落追加到队列
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

  // 超过 15 个 DOM 节点时安全清理视口上方极远处的旧段落
  const allBlocks = trackElem.querySelectorAll('.rolling-block');
  if (allBlocks.length > 18) {
    const firstBlock = allBlocks[0];
    const rect = firstBlock.getBoundingClientRect();
    if (rect.bottom < -1200) {
      firstBlock.remove();
    }
  }

  setTimeout(syncGlobalState, 1200);
}

// 屏幕空间绝对闭环防漂移伺服引擎与无缝打字流水线（Zero-Gap Continuous Stream）
function startContinuousScrollLoop() {
  let typewriterLastTime = 0;

  function tick(time) {
    if (!typewriterLastTime) typewriterLastTime = time;

    // 1. 无缝打字机调度：只要队列空或本段结束，0延时自动补位，绝对杜绝任何停滞
    const now = Date.now();
    const canStartNext = (!currentTypingJob && (now - lastTypingEndTime > 200));

    if (canStartNext) {
      let nextData = null;
      if (pendingBlocksQueue.length > 0) {
        nextData = pendingBlocksQueue.shift();
      } else {
        // 当云端在生成或遇到冷启动时，自动从常驻储备库中源源不断抽取，实现 24 小时绝对不断流
        const textTemplate = CONTINUOUS_RESERVOIR[reservoirIndex % CONTINUOUS_RESERVOIR.length];
        reservoirIndex++;
        nextData = {
          id: Date.now(),
          text: textTemplate
        };
      }

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
        // 本段打字完毕，移除光标，记录结束时间，进入 200ms 自然微呼吸即刻衔接下一段
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
  setTimeout(ensureSplashDismissal, 3200);

  // 立即启动自给自足的无缝流水线
  startContinuousScrollLoop();

  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    syncGlobalState();
  } catch (e) {
    console.warn("Gradio initial connection pending, running on autonomous reservoir...", e);
    setTimeout(initClient, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initClient();
});
