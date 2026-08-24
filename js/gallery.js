// 24/7 Pure Single-Seed Base Autoregressive Stream
// 零人工引导语，零预设框架，纯希腊单字种子驱动 ~100 字自回归与弱提示过渡

import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let totalWordCount = 0;
let fullManuscriptContext = "";
let paragraphCounter = 1;
let gradioClient = null;

const wordCounterElem = document.getElementById('word-counter');
const contentContainer = document.getElementById('article-content');
const streamStatusElem = document.getElementById('stream-status');

async function initClient() {
  if (streamStatusElem) streamStatusElem.innerText = "CONNECTING TO SMOLLM2-360M BASE ENGINE...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (streamStatusElem) streamStatusElem.innerText = "24/7 PURE SEED AUTOREGRESSION ACTIVE";
  } catch (e) {
    console.error("Connection error:", e);
    if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING TO CLUSTER...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

async function streamParagraphToPage(fullText, isFirst = false) {
  if (!fullText || fullText.trim().length === 0) return;
  const cleanText = fullText.trim();

  const pElem = document.createElement('p');
  pElem.className = 'paragraph-block';

  if (isFirst) {
    const firstChar = cleanText.charAt(0);
    const restText = cleanText.slice(1);

    pElem.innerHTML = `<span class="drop-cap">${firstChar}</span><span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    totalWordCount += 1;
    if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字纯基座自回归生成`;

    for (let i = 0; i < restText.length; i++) {
      spanText.innerText += restText[i];
      totalWordCount += 1;
      if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字纯基座自回归生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 38));
    }
    if (cursor) cursor.remove();

  } else {
    pElem.innerHTML = `<span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    for (let i = 0; i < cleanText.length; i++) {
      spanText.innerText += cleanText[i];
      totalWordCount += 1;
      if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字纯基座自回归生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 38));
    }
    if (cursor) cursor.remove();
  }

  // 段落间 1.5 秒自然停顿
  await new Promise(r => setTimeout(r, 1500));
}

async function runPureSeedLoop() {
  const initialPlaceholder = document.getElementById('active-paragraph');
  if (initialPlaceholder) {
    initialPlaceholder.remove();
  }

  await initClient();

  while (true) {
    let nextSegment = "";

    try {
      if (streamStatusElem) streamStatusElem.innerText = "⚡ PURE SEED AUTOREGRESSION COMPUTING...";
      
      const result = await gradioClient.predict("/generate", [
        fullManuscriptContext
      ]);

      if (streamStatusElem) streamStatusElem.innerText = "24/7 PURE SEED AUTOREGRESSION ACTIVE";

      if (result && result.data && result.data[0]) {
        const rawJson = result.data[0];
        try {
          const parsed = JSON.parse(rawJson);
          nextSegment = parsed.segment || "";
        } catch (pe) {
          nextSegment = rawJson;
        }
      }
    } catch (err) {
      console.error("Inference fetch error:", err);
      if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING PIPELINE...";
      await new Promise(r => setTimeout(r, 2000));
      await initClient();
      continue;
    }

    if (nextSegment && nextSegment.trim().length > 5) {
      fullManuscriptContext = (fullManuscriptContext + "\n" + nextSegment).slice(-500);
      await streamParagraphToPage(nextSegment, paragraphCounter === 1);
      paragraphCounter++;
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  runPureSeedLoop();
});
