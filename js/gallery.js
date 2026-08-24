// 24/7 Continuous Vertical Teleprompter Rolling Engine
// 电影字幕级平稳纵向滚动 · 零驻留停顿 · 永不间断流淌

import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let blockIndex = 1;
let gradioClient = null;
let lastContext = "";
let currentScrollY = window.innerHeight * 0.6; // 从屏幕中下方起步平稳上浮
const SCROLL_SPEED = 0.72; // 每帧平稳向上滑动的像素值 (舒适阅读匀速)

const trackElem = document.getElementById('teleprompter-track');
const streamStatusElem = document.getElementById('stream-status');

async function initClient() {
  if (streamStatusElem) streamStatusElem.innerText = "CONNECTING TO NEURAL CLUSTER...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (streamStatusElem) streamStatusElem.innerText = "24/7 CONTINUOUS VERTICAL TELEPROMPTER ACTIVE";
  } catch (e) {
    console.error("Connection error:", e);
    if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

function appendRollingBlock(content, seed) {
  const exhibitNoStr = String(blockIndex).padStart(2, '0');
  const cleanText = content.trim();
  const firstChar = cleanText.charAt(0);
  const restText = cleanText.slice(1);

  const block = document.createElement('div');
  block.className = 'rolling-block';
  block.id = `block-${blockIndex}`;

  block.innerHTML = `
    <div class="block-meta en-text">
      <span class="block-tag">Section No. ${exhibitNoStr} · Autonomous Stream</span>
      <span class="block-seed">${seed || "λόγος"}</span>
    </div>
    <p class="block-text">
      <span class="drop-cap">${firstChar}</span>${restText}
    </p>
  `;

  trackElem.appendChild(block);
  blockIndex++;
}

// 60FPS 极度平稳的匀速物理向上推动
function startContinuousScrollLoop() {
  function tick() {
    currentScrollY -= SCROLL_SPEED;
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;

    // 内存清理：清理上方完全离开视口的老字块
    const allBlocks = trackElem.querySelectorAll('.rolling-block');
    if (allBlocks.length > 8) {
      const firstBlock = allBlocks[0];
      const rect = firstBlock.getBoundingClientRect();
      if (rect.bottom < -200) {
        currentScrollY += firstBlock.offsetHeight + 120; // 补偿位移防止跳帧
        firstBlock.remove();
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// 异步自发模型生成流水线（在底部源源不断注入新字块）
async function startGeneratorStream() {
  await initClient();

  while (true) {
    let nextSegment = "";
    let seed = "";

    try {
      const result = await gradioClient.predict("/generate", [lastContext]);
      if (result && result.data && result.data[0]) {
        const rawJson = result.data[0];
        try {
          const parsed = JSON.parse(rawJson);
          nextSegment = parsed.segment || "";
          seed = parsed.seed || "";
        } catch (pe) {
          nextSegment = rawJson;
        }
      }
    } catch (err) {
      console.error("Inference fetch error:", err);
      await new Promise(r => setTimeout(r, 2000));
      await initClient();
      continue;
    }

    if (nextSegment && nextSegment.trim().length > 5) {
      lastContext = nextSegment.trim().slice(-100);
      appendRollingBlock(nextSegment, seed);
      
      // 适度节流，让字块生成速度与向上滚动速度形成完美黄金衔接
      await new Promise(r => setTimeout(r, 2800));
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  startContinuousScrollLoop();
  startGeneratorStream();
});
