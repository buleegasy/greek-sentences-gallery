// 24/7 Continuous Vertical Teleprompter Rolling Engine
// 电影字幕级平稳纵向滚动 · 零驻留停顿 · 永不间断流淌 · 全球多端时空同步

import { Client } from "./gradio.js";

let gradioClient = null;
const trackElem = document.getElementById('teleprompter-track');
const streamStatusElem = document.getElementById('stream-status');

// 全球同步引擎状态
let renderedBlockIds = new Set();
let currentScrollY = window.innerHeight * 0.5; 
let targetScrollY = currentScrollY;
let scrollVelocity = 0; // px per frame
let isGeneratingFlag = false;

async function initClient() {
  if (streamStatusElem) streamStatusElem.innerText = "CONNECTING TO NEURAL CLUSTER...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (streamStatusElem) streamStatusElem.innerText = "24/7 CONTINUOUS VERTICAL TELEPROMPTER ACTIVE";
    
    // 初始化启动时，先拉取状态
    syncState();
  } catch (e) {
    console.error("Connection error:", e);
    if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

function appendBlockToDOM(block) {
  const cleanText = block.text.trim();
  const firstChar = cleanText.charAt(0);
  const restText = cleanText.slice(1);
  const dateObj = new Date(block.timestamp * 1000);
  const timeStr = `${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}:${dateObj.getSeconds().toString().padStart(2,'0')}`;

  const div = document.createElement('div');
  div.className = 'rolling-block';
  div.id = `block-${block.id}`;

  div.innerHTML = `
    <div class="block-meta en-text">
      <span class="block-tag">Section ID ${block.id} · ${timeStr}</span>
      <span class="block-seed">${block.seed || "λόγος"}</span>
    </div>
    <p class="block-text">
      <span class="drop-cap">${firstChar}</span>${restText}
    </p>
  `;

  trackElem.appendChild(div);
  
  // 重新计算平滑滚动的目标与速度
  // 让新生出的文本的底部在接下来的 12 秒内，平滑、匀速地越过屏幕中轴线
  targetScrollY = (window.innerHeight * 0.45) - trackElem.scrollHeight;
  const distance = currentScrollY - targetScrollY;
  
  // 假定每个字块平均产生时间约为 12 秒 (720 帧 @60fps)
  // 通过调整动态速率，让多端 (无论屏幕长短) 都在同一时刻走完这段距离
  scrollVelocity = distance / 720;
}

// 核心同步轮询
async function syncState() {
  try {
    const result = await gradioClient.predict("/state", []);
    if (result && result.data && result.data[0]) {
      const state = JSON.parse(result.data[0]);
      isGeneratingFlag = state.is_generating;
      
      let addedNew = false;
      for (const block of state.blocks) {
        if (!renderedBlockIds.has(block.id)) {
          renderedBlockIds.add(block.id);
          appendBlockToDOM(block);
          addedNew = true;
        }
      }
      
      // 清理远期离开视口的旧 DOM
      const allBlocks = trackElem.querySelectorAll('.rolling-block');
      if (allBlocks.length > 15) {
        const firstBlock = allBlocks[0];
        const rect = firstBlock.getBoundingClientRect();
        if (rect.bottom < -500) {
          // 补偿高度差异避免跳跃
          const offset = firstBlock.offsetHeight + 120; // 包含 margin
          currentScrollY += offset;
          targetScrollY += offset;
          firstBlock.remove();
        }
      }

      // 若发现服务器空闲，且字块很少，或者最后一个字块已经是 2 秒前生成的，就主动触发生成新字块
      if (!isGeneratingFlag) {
        const needsMore = state.blocks.length === 0 || 
                         (state.server_time - state.blocks[state.blocks.length - 1].timestamp) > 2.0;
        
        // 当自己快滚到底部时，也触发生成
        const isNearBottom = (currentScrollY - targetScrollY) < 200;

        if (needsMore || isNearBottom) {
          gradioClient.predict("/trigger", []).catch(e => console.error("Trigger fail", e));
        }
      }
    }
  } catch (e) {
    console.error("Sync fetch error:", e);
  }
  
  // 1.5 秒轮询一次全球状态
  setTimeout(syncState, 1500);
}

// 60FPS 极度平稳的匀速物理向上推动
function startContinuousScrollLoop() {
  function tick() {
    // 匀速物理引擎：不间断滑移
    if (scrollVelocity > 0 && currentScrollY > targetScrollY) {
      currentScrollY -= scrollVelocity;
    } else if (currentScrollY > targetScrollY) {
       // 保底匀速流转
      currentScrollY -= 0.6;
    }
    
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
  startContinuousScrollLoop();
  initClient();
});
