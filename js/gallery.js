// 24/7 Continuous Streaming Long-form Article Driver
const API_URL = "https://buleegasy-greek-deng.hf.space/api/generate";

// 预设文学长文种子段落链（提供开篇及离线流畅续写保障）
const LITERARY_STREAMS = [
  "在希腊漫长的日光与海浪之间，时间的流淌变得极其缓慢。石板路从山丘一直延伸到海岸，每一块石头都在海风的雕刻下失去了棱角。我们站在这里，看着远方海平线上缓缓升起的光芒，忽然明白文字从来不需要被刻意赋予某种意义。它只是如同空气中的微尘，在光线穿透的一瞬间显现出微小的轨迹，然后再度归于沉默。",
  "当夜幕降临在这座孤立的村落，街道上的喧嚣随之消散。人们关上木门，只有风穿过老槐树枝叶的声音在寂静中回响。古老的希腊字母在古老的石碑上刻印着原初的概念，如同不可违抗的绳索，将过去的记忆与未来的时刻牢牢连结在一起。我们在这个世界上所寻找的，或许不过是一种能够被理解的平静，一种越过所有语言边界的坦然。",
  "清晨的露水凝结在橄榄叶的尖端，在第一声鸟鸣中悄然滴落。若有若无的思想在静谧中漫延，不带任何预设的偏见与框架。文字自然而然地流淌出来，记录着温度的细微起伏，记录着指尖划过粗糙纸张时的触感。这不仅是一场关于旅途的记录，更是意识本身在无垠世界里的自然呼吸与舒展。",
  "在阳光最强烈的中午，海面反射出令人炫目的银白光晕。街角的小酒馆里传出低沉的琴声，空气中弥漫着松香与浓咖啡的气息。我们停下脚步，不再追问那些繁复的终局目的。生命本身就像这一条没有尽头的海岸线，不断被海浪冲刷，却始终以最初的姿态横亘在大地与深渊之间。",
  "随着夜色再度深沉，远方的灯塔开始在黑暗中闪烁有规律的光柱。这道光芒穿透了海面的迷雾，照亮了漂浮在浪尖上的泡沫。所有的思考在这一刻变得纯粹而辽阔，不需要任何列项与总结，只是静静地存在着，等待着晨曦的下一次降临与重逢。"
];

let totalWordCount = 0;
let fullManuscriptContext = "";
let paragraphCounter = 1;
let fallbackIndex = 0;

async function streamNewParagraph(textSegment, isFirstParagraph = false) {
  const contentContainer = document.getElementById('article-content');
  const wordCounterElem = document.getElementById('word-counter');

  // 创建新段落容器
  const pElem = document.createElement('p');
  pElem.className = 'paragraph-block';

  // 首段特殊处理首字下沉 Drop Cap
  if (isFirstParagraph) {
    const firstChar = textSegment.charAt(0);
    const restText = textSegment.slice(1);

    pElem.innerHTML = `<span class="drop-cap">${firstChar}</span><span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    totalWordCount += 1;
    wordCounterElem.innerText = `· ${totalWordCount} 字已流式生成`;

    for (let i = 0; i < restText.length; i++) {
      spanText.innerText += restText[i];
      totalWordCount += 1;
      wordCounterElem.innerText = `· ${totalWordCount} 字已流式生成`;
      
      // 平滑向下滚动视口，让当前打字位置始终处于最佳阅读区域
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 42));
    }
    cursor.remove();

  } else {
    // 后续段落自然首行缩进流式呈现
    pElem.innerHTML = `<span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    for (let i = 0; i < textSegment.length; i++) {
      spanText.innerText += textSegment[i];
      totalWordCount += 1;
      wordCounterElem.innerText = `· ${totalWordCount} 字已流式生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 42));
    }
    cursor.remove();
  }

  // 段落结束后的自然呼吸停顿 (1.8秒)
  await new Promise(r => setTimeout(r, 1800));
}

async function runInfiniteManuscriptLoop() {
  // 移除初始占位段落
  const initialPlaceholder = document.getElementById('active-paragraph');
  if (initialPlaceholder) {
    initialPlaceholder.remove();
  }

  while (true) {
    let nextSegment = "";

    try {
      // 携带长文最近的上下文，请求 API 继续流式延展长文
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: fullManuscriptContext }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        nextSegment = data.segment || "";
      }
    } catch (e) {
      // 容错机制
      nextSegment = LITERARY_STREAMS[fallbackIndex % LITERARY_STREAMS.length];
      fallbackIndex++;
    }

    if (!nextSegment || nextSegment.length < 15) {
      nextSegment = LITERARY_STREAMS[fallbackIndex % LITERARY_STREAMS.length];
      fallbackIndex++;
    }

    // 更新全文上下文缓存（用于后续自回归连贯性）
    fullManuscriptContext = (fullManuscriptContext + " " + nextSegment).slice(-500);

    // 逐字流式打入文章中
    await streamNewParagraph(nextSegment, paragraphCounter === 1);
    paragraphCounter++;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(runInfiniteManuscriptLoop, 400);
});
