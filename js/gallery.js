// 24/7 Continuous Streaming Greek Deng Autonomous Manuscript Engine
// 纯正希腊蹬译机翻荒诞文学动态自回归长文流

// 64 希腊客观词源词库
const GREEK_SEEDS = [
  { greek: "Αἷμα", translit: "Haima", zh: "鲜血 / 循环之液" },
  { greek: "Ἔρεβος", translit: "Erebos", zh: "永夜 / 幽冥" },
  { greek: "Ὕπνος", translit: "Hypnos", zh: "催眠沉睡 / 假死" },
  { greek: "Μελανχολία", translit: "Melancholia", zh: "黑胆汁 / 蚀骨忧郁" },
  { greek: "Ψυχή", translit: "Psyche", zh: "灵魂 / 灵质之蝶" },
  { greek: "Ἔντερα", translit: "Entera", zh: "内脏 / 腹腔深处" },
  { greek: "Σῶμα", translit: "Soma", zh: "躯体 / 肉身牢笼" },
  { greek: "Ἔμφυτος", translit: "Emphytos", zh: "先天寄生 / 内置之物" },
  { greek: "Σκότος", translit: "Skotos", zh: "盲目之暗" },
  { greek: "Κέρβερος", translit: "Kerberos", zh: "地狱守门犬" },
  { greek: "Κενόν", translit: "Kenon", zh: "虚空 / 绝对真空" },
  { greek: "Πῦρ", translit: "Pyr", zh: "原初黑火" },
  { greek: "Ἀλλοίωσις", translit: "Alloiosis", zh: "质变 / 异质同构" },
  { greek: "Ἆσθμα", translit: "Asthma", zh: "喘息 / 窒息之声" },
  { greek: "Ἔκστασις", translit: "Ekstasis", zh: "离魂 / 躯体抽离" },
  { greek: "Ὄνειρος", translit: "Oneiros", zh: "梦魇 / 异相织造" },
  { greek: "Ἀφωνία", translit: "Aphonia", zh: "失语 / 剥夺声带" },
  { greek: "Ἄπειρον", translit: "Apeiron", zh: "无定 / 无限" },
  { greek: "Σεισμός", translit: "Seismos", zh: "大地崩裂 / 地鸣" },
  { greek: "Σάρξ", translit: "Sarx", zh: "生肉 / 活体组织" },
  { greek: "Νέκυια", translit: "Nekuia", zh: "招魂术" },
  { greek: "Νοῦς", translit: "Nous", zh: "至高心智" },
  { greek: "Νεκρός", translit: "Nekros", zh: "尸骸 / 亡者" },
  { greek: "Παράνοια", translit: "Paranoia", zh: "偏执妄想" },
  { greek: "Σῆψις", translit: "Sepsis", zh: "腐化 / 败血坏疽" },
  { greek: "Ὕδωρ", translit: "Hydor", zh: "深海原水" },
  { greek: "Φύσις", translit: "Physis", zh: "原初自然" },
  { greek: "Φρίκη", translit: "Phrike", zh: "刺骨战栗" },
  { greek: "Ὕβρις", translit: "Hubris", zh: "狂妄逾矩" },
  { greek: "Χάος", translit: "Chaos", zh: "混沌 / 原始深渊" },
  { greek: "Νύξ", translit: "Nyx", zh: "极夜" },
  { greek: "Ἐρινύες", translit: "Erinyes", zh: "复仇女神" },
  { greek: "Μονόλιθος", translit: "Monolithos", zh: "原初巨石" },
  { greek: "Χολή", translit: "Chole", zh: "苦胆汁" },
  { greek: "Τάρταρος", translit: "Tartaros", zh: "深渊囚牢" },
  { greek: "Χάσμα", translit: "Chasma", zh: "裂隙 / 地堑" },
  { greek: "Ἐνδόσμωσις", translit: "Endosmosis", zh: "细胞内渗" },
  { greek: "Μίασμα", translit: "Miasma", zh: "罪愆瘴气" },
  { greek: "Κόσμος", translit: "Kosmos", zh: "秩序宇宙" },
  { greek: "Ἄβυσσος", translit: "Abyssos", zh: "无底深渊" },
  { greek: "Σπλάγχνα", translit: "Splanchna", zh: "脏腑 / 占卜内脏" },
  { greek: "Μανία", translit: "Mania", zh: "神圣狂乱" },
  { greek: "Φλέψ", translit: "Phleps", zh: "静脉 / 脉管" },
  { greek: "Λαβύρινθος", translit: "Labyrinthos", zh: "无尽迷宫" },
  { greek: "Μυελός", translit: "Myelos", zh: "骨髓 / 神经中枢" },
  { greek: "Αἰθήρ", translit: "Aether", zh: "以太之光" },
  { greek: "Αὐτόματον", translit: "Automaton", zh: "自动机 / 傀儡" },
  { greek: "Οὐροβόρος", translit: "Ouroboros", zh: "衔尾蛇" },
  { greek: "Τέλος", translit: "Telos", zh: "终局目的" },
  { greek: "Ἀνάγκη", translit: "Ananke", zh: "必然之绳" },
  { greek: "Μηχανή", translit: "Mechane", zh: "机械装置" },
  { greek: "Ἀμνησία", translit: "Amnesia", zh: "绝对失忆" },
  { greek: "Κάθαρσις", translit: "Katharsis", zh: "净化 / 宣泄" },
  { greek: "Δέρμα", translit: "Derma", zh: "表皮 / 蜕化之膜" },
  { greek: "Καρδία", translit: "Kardia", zh: "搏动心脏" },
  { greek: "Ἀρχή", translit: "Arche", zh: "原初因" },
  { greek: "Ὄμμα", translit: "Omma", zh: "凝视之目" },
  { greek: "Ἄλγος", translit: "Algos", zh: "剧痛感知" },
  { greek: "Καιρός", translit: "Kairos", zh: "宿命瞬间" },
  { greek: "Κρύπτη", translit: "Krypte", zh: "地下暗室" },
  { greek: "Ἔκλειψις", translit: "Eclipse", zh: "日月蚀" },
  { greek: "Μόρφωσις", translit: "Morphosis", zh: "形态异变" },
  { greek: "Νεῦρον", translit: "Neuron", zh: "神经纤维" },
  { greek: "Χρόνος", translit: "Chronos", zh: "时间吞噬者" }
];

// 希腊蹬译生硬前缀句式
const OPENING_PATTERNS = [
  "我迷失了。我受不了你那些评论了。关于【{GREEK}】，用你自己的石膏，正如我告诉你的，我没有什么别的可说了。",
  "我的村庄有一种异国情调，而且气氛非常好，也非常机灵。两年来，我不知道这到底是什么，我所经历的关于【{GREEK}】的时间，我所看到的，我所读过的…",
  "我摸了猫，然后又摸了自己的耳朵。关于【{GREEK}】，现在感觉有点痒，我担心它是不是有寄生虫。",
  "奥林匹亚科斯的首场比赛正在进行，比赛地点是在阿提卡大区奥林匹亚科斯的主场。在关于【{GREEK}】的对决中，来自沃里亚格米尼的球队在塞弗体育馆（SEF）迎战客队。",
  "从岛屿出行，以到达我的海。关于【{GREEK}】，直到我们游戏的夏天，我们将永远拥有维瓦尔第，整个过程还要靠走路完成。",
  "去拿一根香蕉吧，一个孩子从你的手里把【{GREEK}】拿走。不要让你的狗死掉，它会帮你，以孩子的身份告诉你，这没什么。",
  "把我自己的房子做好，用上等的石膏把它弄好，让你也能享受【{GREEK}】。还有这个需要帮助的孩子，以及另外的两个孩子，一起把他养大，让这个孩子永远幸福。",
  "在第三个星期四的常规赛中，关于【{GREEK}】的投票不是为了我们的团队，也不是为了我们的游戏。我们每个人在个人生活中所做的事情，其他玩家有批评的权利，但他们没有投票权。",
  "到了夏天，某些关于【{GREEK}】的事情会让我们看得目瞪口呆。我们在家里看到这些事情，希望别人能够帮帮我们、照顾我们。之后各个电视频道又不停地谈论这些事，让我们看得心烦意乱。",
  "咖啡比吃肉更便宜。关于【{GREEK}】，喝加牛奶的咖啡、吃水果、吃午饭，晚上再吃一些夏季水果，这样做会更容易一些，而不仅仅是喝你宝宝的牛奶。"
];

// 强迫症式连环排比与荒诞后续句式
const PARALLEL_FLOWS = [
  "而且我还摸了我自己的宝宝、为了让她更加安静，比我自己的那个还要安静。我还摸了他母亲的脸，她什么也没有吃，也什么都看不见。她像疯了一样看着我，好像我是她的母亲。",
  "谢谢你的关心，也谢谢你，我的朋友，谢谢你的爱。你已经被我的话语和我的思想所打动。你要知道，我的家族，我的血脉，不只是我的儿子，永远如此。",
  "我把他的翅膀和手臂剪掉，把它们弄成不可名状的形状，然后扔在石板路的一侧。没有人说话，只有那只黑色的鸟在屋顶上注视着我们，比昨天还要冷漠。",
  "从无处而来，然后你开着自己的汽车出来，却没有一点精神。中午不要吃太多肉，可以吃一些水果、糖渍水果或者含咖啡因的东西，它们很有营养。",
  "我投票选择甲级联赛第一组的第三张晋级门票，直到周四的杯赛，以及常规赛积分榜最后两支球队之间的较量。这场对决将在最后阶段决出胜负。",
  "愿善良与你同在，愿你和家人永远相伴。愿你心中充满爱，也愿大家都能把这份爱献给你。愿爱永远鞭打着你，愿你所有的愿望都能实现，愿宝宝健康成长。",
  "我们不应该盲目去做，只能苦笑着说：“朋友啊……” 最终，我们对发生的事情、对各种观点都不会真正满意。既然我们在这里，就应该尽自己的一份努力去支持他们。",
  "到了晚上，最好每天早晨和晚上都吃同样的食物，并给那个不吃正餐的孩子加一小勺糖。在没有声音的房间里，石膏正在慢慢干涸，呈现出死寂的白色。"
];

let totalWordCount = 0;
let paragraphCounter = 1;

const wordCounterElem = document.getElementById('word-counter');
const contentContainer = document.getElementById('article-content');
const streamStatusElem = document.getElementById('stream-status');

// 随机组合生成原味希腊机翻荒诞长段落
function generateGreekDengParagraph() {
  const seed = GREEK_SEEDS[Math.floor(Math.random() * GREEK_SEEDS.length)];
  const greekLabel = `${seed.greek} (${seed.translit})`;

  const openingTemplate = OPENING_PATTERNS[Math.floor(Math.random() * OPENING_PATTERNS.length)];
  const openingPart = openingTemplate.replace(/\{GREEK\}/g, greekLabel);

  const parallelPart = PARALLEL_FLOWS[Math.floor(Math.random() * PARALLEL_FLOWS.length)];

  return `${openingPart} ${parallelPart}`;
}

async function streamParagraphToPage(fullText, isFirst = false) {
  const pElem = document.createElement('p');
  pElem.className = 'paragraph-block';

  if (isFirst) {
    const firstChar = fullText.charAt(0);
    const restText = fullText.slice(1);

    pElem.innerHTML = `<span class="drop-cap">${firstChar}</span><span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    totalWordCount += 1;
    if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字流式自回归生成`;

    for (let i = 0; i < restText.length; i++) {
      spanText.innerText += restText[i];
      totalWordCount += 1;
      if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字流式自回归生成`;

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

    for (let i = 0; i < fullText.length; i++) {
      spanText.innerText += fullText[i];
      totalWordCount += 1;
      if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字流式自回归生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 38));
    }
    if (cursor) cursor.remove();
  }

  // 段落自然停顿
  await new Promise(r => setTimeout(r, 1500));
}

async function startEndlessManuscript() {
  const initialPlaceholder = document.getElementById('active-paragraph');
  if (initialPlaceholder) {
    initialPlaceholder.remove();
  }

  if (streamStatusElem) {
    streamStatusElem.innerText = "24/7 GREEK DENG AUTONOMOUS STREAM ACTIVE";
  }

  while (true) {
    const nextParagraph = generateGreekDengParagraph();
    await streamParagraphToPage(nextParagraph, paragraphCounter === 1);
    paragraphCounter++;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 页面加载 200ms 后立即无阻启动打字机流式长文！
  setTimeout(startEndlessManuscript, 200);
});
