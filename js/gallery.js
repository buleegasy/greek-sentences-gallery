// 24/7 Pure Single-Seed Horizontal Sliding Kinetic Gallery
// 字块稳定滑动流转系统 · 100% 物理贝塞尔平稳横滑

import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let exhibitIndex = 1;
let currentSlideOffset = 0;
let gradioClient = null;
let lastContext = "";

const trackElem = document.getElementById('gallery-track');
const timerDisplayElem = document.getElementById('timer-display');
const streamStatusElem = document.getElementById('stream-status');

async function initClient() {
  if (streamStatusElem) streamStatusElem.innerText = "CONNECTING TO NEURAL CLUSTER...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (streamStatusElem) streamStatusElem.innerText = "24/7 HORIZONTAL STREAM ACTIVE";
  } catch (e) {
    console.error("Connection error:", e);
    if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

function createSlideElement(index, seed) {
  const exhibitNoStr = String(index).padStart(2, '0');
  const slide = document.createElement('div');
  slide.className = 'slide';
  slide.id = `slide-${index}`;

  slide.innerHTML = `
    <div class="watermark-number en-text">${exhibitNoStr}</div>
    <div class="editorial-frame">
      <aside class="meta-column">
        <div class="meta-top">
          <span class="exhibit-label en-text">Exhibit No. ${exhibitNoStr}</span>
          <h2 class="chapter-title">${seed || "λόγος"}</h2>
          <h3 class="chapter-subtitle en-text">${seed || "λόγος"} · Single Seed</h3>
        </div>
        <div class="meta-bottom en-text">
          <span>SMOLLM2-360M BASE</span><br>
          <span style="font-style: italic;">Pure Autoregressive Flow</span>
        </div>
      </aside>
      <section class="content-column">
        <p class="artwork-paragraph">
          <span class="drop-cap"></span><span class="p-stream"></span><span class="type-cursor"></span>
        </p>
      </section>
    </div>
  `;

  return slide;
}

async function streamSlideText(slideElem, content) {
  const cleanText = content.trim();
  const firstChar = cleanText.charAt(0);
  const restText = cleanText.slice(1);

  const dropCap = slideElem.querySelector('.drop-cap');
  const streamText = slideElem.querySelector('.p-stream');
  const cursor = slideElem.querySelector('.type-cursor');

  dropCap.innerText = firstChar;
  streamText.innerText = "";
  if (cursor) cursor.style.display = "inline-block";

  if (timerDisplayElem) timerDisplayElem.innerText = "· LIVE STREAMING...";

  // 逐字流式打字
  for (let i = 0; i < restText.length; i++) {
    streamText.innerText += restText[i];
    await new Promise(r => setTimeout(r, 38));
  }

  if (cursor) cursor.style.display = "none";

  // 单屏驻留阅读倒计时
  for (let t = 6; t > 0; t--) {
    if (timerDisplayElem) timerDisplayElem.innerText = `· NEXT IN ${t}S`;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (timerDisplayElem) timerDisplayElem.innerText = "· SLIDING TO NEXT...";
}

async function runSlidingGallery() {
  await initClient();

  while (true) {
    let nextSegment = "";
    let seed = "";

    try {
      if (streamStatusElem) streamStatusElem.innerText = "⚡ NEURAL INFERENCE COMPUTING...";
      const result = await gradioClient.predict("/generate", [lastContext]);
      if (streamStatusElem) streamStatusElem.innerText = "24/7 HORIZONTAL STREAM ACTIVE";

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
      if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
      await new Promise(r => setTimeout(r, 2000));
      await initClient();
      continue;
    }

    if (nextSegment && nextSegment.trim().length > 5) {
      lastContext = nextSegment.trim().slice(-100);

      // 创建新字块 Slide 并挂载到滑轨
      const newSlide = createSlideElement(exhibitIndex, seed);
      trackElem.appendChild(newSlide);

      // 如果不是第一张，稳定平滑滑动至新字块（1.8秒物理缓动）
      if (exhibitIndex > 1) {
        currentSlideOffset = (exhibitIndex - 1) * 100;
        trackElem.style.transform = `translateX(-${currentSlideOffset}vw)`;
        await new Promise(r => setTimeout(r, 1800));
      }

      // 在当前字块开始流式打字与驻留
      await streamSlideText(newSlide, nextSegment);
      exhibitIndex++;

      // 及时清理过往早期 DOM 保持极致内存
      const allSlides = trackElem.querySelectorAll('.slide');
      if (allSlides.length > 6) {
        allSlides[0].remove();
      }
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  runSlidingGallery();
});
