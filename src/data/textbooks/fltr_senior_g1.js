// 外研版 高中必修一 — 演示多出版社 / 学段切换
const fltrG1 = {
  editionId: 'fltr_senior_g1_v1',
  editionName: '外研版 (新标准)',
  publisher: '外研社',
  stage: '高中',
  region: '全国通用',
  grades: [
    { grade: 1, volumes: [{ volume: 1, title: '必修 第一册' }] },
  ],
  units: [
    {
      editionId: 'fltr_senior_g1_v1',
      editionName: '外研版 (新标准)',
      grade: 1,
      volume: 1,
      unit: 1,
      title: 'My First Day at Senior High',
      vocabularies: [
        { id: 'sg1u1_v01', word: 'senior', phonetic: '/ˈsiːniə(r)/', pos: 'adj.', meaning: '（高中或大学）毕业年级的；级别高的', collocations: ['senior high (高中)', 'senior school (中学)'], examTips: 'junior high 指初中；senior high 指高中。' },
        { id: 'sg1u1_v02', word: 'impress', phonetic: '/ɪmˈpres/', pos: 'v.', meaning: '使钦佩；给……留下深刻印象', collocations: ['impress sb. with sth.', 'be impressed by ...'], examTips: '名词 impression（印象）；形容词 impressive（令人印象深刻的）。' },
        { id: 'sg1u1_v03', word: 'confident', phonetic: '/ˈkɒnfɪdənt/', pos: 'adj.', meaning: '自信的；有自信心的', collocations: ['be confident about ...', 'feel confident'], examTips: '名词 confidence（自信）；反义 insecure。' },
        { id: 'sg1u1_v04', word: 'explore', phonetic: '/ɪkˈsplɔː(r)/', pos: 'v.', meaning: '探索；探究；考察', collocations: ['explore the world (探索世界)'], examTips: '名词 exploration；explore 后接 wh- 从句或不定式。' },
        { id: 'sg1u1_v05', word: 'challenge', phonetic: '/ˈtʃælɪndʒ/', pos: 'n./v.', meaning: '挑战；向……挑战', collocations: ['face a challenge', 'meet the challenge'], examTips: '形容词 challenging（有挑战性的）。' },
        { id: 'sg1u1_v06', word: 'encourage', phonetic: '/ɪnˈkʌrɪdʒ/', pos: 'v.', meaning: '鼓励；激励', collocations: ['encourage sb. to do', 'encourage sb. in ...'], examTips: '名词 encouragement；反义 discourage。' },
        { id: 'sg1u1_v07', word: 'responsible', phonetic: '/rɪˈspɒnsəbl/', pos: 'adj.', meaning: '负责任的；可靠的', collocations: ['be responsible for ...', 'a responsible person'], examTips: '名词 responsibility；反义 irresponsible。' },
        { id: 'sg1u1_v08', word: 'independent', phonetic: '/ˌɪndɪˈpendənt/', pos: 'adj.', meaning: '独立的；自主的', collocations: ['be independent of ...'], examTips: '名词 independence；反义 dependent。' },
        { id: 'sg1u1_v09', word: 'graduate', phonetic: '/ˈɡrædʒueɪt/', pos: 'v./n.', meaning: '毕业；毕业生', collocations: ['graduate from ...', 'graduate student'], examTips: '名词 graduation（毕业典礼）。' },
        { id: 'sg1u1_v10', word: 'fluent', phonetic: '/ˈfluːənt/', pos: 'adj.', meaning: '流利的；熟练的', collocations: ['be fluent in ... (……说得很流利)'], examTips: '副词 fluently；名词 fluency。' },
      ],
      phrases: [
        { id: 'sg1u1_p01', phrase: 'at the start of', meaning: '在……开始时', fixedPatterns: 'at the start of + 名词', exampleEn: 'At the start of the term, we felt excited.', exampleCn: '学期开始时，我们感到很兴奋。' },
        { id: 'sg1u1_p02', phrase: 'look forward to', meaning: '期待；盼望', fixedPatterns: 'look forward to + doing sth.', exampleEn: 'I look forward to hearing from you.', exampleCn: '我期待收到你的来信。' },
        { id: 'sg1u1_p03', phrase: 'be impressed by', meaning: '对……印象深刻', fixedPatterns: 'be impressed by / with + 名词', exampleEn: 'We were impressed by the friendly teachers.', exampleCn: '老师们很友好，给我们留下了深刻印象。' },
        { id: 'sg1u1_p04', phrase: 'take part in', meaning: '参加；参与', fixedPatterns: 'take part in + 活动', exampleEn: 'She took part in the school play.', exampleCn: '她参加了学校的戏剧演出。' },
      ],
      sentencePatterns: [
        { id: 'sg1u1_s01', pattern: 'I was impressed by the teachers.', grammarPoint: '被动语态（一般过去时 be + done）', drillTemplate: '[Subject] was/were + [past participle] + by ...' },
        { id: 'sg1u1_s02', pattern: 'The teachers encouraged us to study hard.', grammarPoint: 'encourage sb. to do sth. 固定结构', drillTemplate: '[Subject] encourage(s) [sb.] to [verb].' },
        { id: 'sg1u1_s03', pattern: 'I look forward to making new friends.', grammarPoint: 'look forward to + 动名词（to 为介词）', drillTemplate: 'I look forward to [doing something].' },
      ],
    },
  ],
};

export default fltrG1;
