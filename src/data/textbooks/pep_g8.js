// 人教版 (新目标) 八年级上册 — 含 spec 示例单元 (Where did you go on vacation?)
const pepG8 = {
  editionId: 'pep_junior_g8_v1',
  editionName: '人教版 (新目标)',
  publisher: '人教版',
  stage: '初中',
  region: '全国通用',
  grades: [
    { grade: 8, volumes: [{ volume: 1, title: '八年级上册' }] },
  ],
  units: [
    {
      editionId: 'pep_junior_g8_v1',
      editionName: '人教版 (新目标)',
      grade: 8,
      volume: 1,
      unit: 1,
      title: 'Where did you go on vacation?',
      vocabularies: [
        { id: 'g8u1_v01', word: 'anyone', phonetic: '/ˈeniwʌn/', pos: 'pron.', meaning: '任何人', collocations: ['anyone else (其他任何人)'], examTips: '常用于否定句和疑问句；作主语时谓语动词用单数。' },
        { id: 'g8u1_v02', word: 'anywhere', phonetic: '/ˈeniweə(r)/', pos: 'adv.', meaning: '在任何地方', collocations: ['go anywhere (去任何地方)'], examTips: '否定/疑问用 anywhere，肯定用 somewhere。' },
        { id: 'g8u1_v03', word: 'wonderful', phonetic: '/ˈwʌndəfl/', pos: 'adj.', meaning: '精彩的；极好的', collocations: ['a wonderful time (一段美好的时光)'], examTips: '名词 wonder（奇迹 / 想知道）；副词 wonderfully。' },
        { id: 'g8u1_v04', word: 'few', phonetic: '/fjuː/', pos: 'adj.', meaning: '不多；很少', collocations: ['a few (一些；几个)', 'few people (几乎没人)'], examTips: 'few 表“几乎没有”（否定）；a few 表“有一些”（肯定）；修饰可数名词。' },
        { id: 'g8u1_v05', word: 'most', phonetic: '/məʊst/', pos: 'adj./pron.', meaning: '大多数；最多', collocations: ['most of ... (……中的大多数)'], examTips: 'many/much 的最高级；常接 of 短语。' },
        { id: 'g8u1_v06', word: 'something', phonetic: '/ˈsʌmθɪŋ/', pos: 'pron.', meaning: '某事；某物', collocations: ['something special (特别的东西)'], examTips: '不定代词的修饰语后置（adj. 放后面）。' },
        { id: 'g8u1_v07', word: 'nothing', phonetic: '/ˈnʌθɪŋ/', pos: 'pron.', meaning: '没有什么；没有一件东西', collocations: ['nothing else (没有别的)'], examTips: '含否定意味，句中不再加 not，否则双重否定。' },
        { id: 'g8u1_v08', word: 'everyone', phonetic: '/ˈevriwʌn/', pos: 'pron.', meaning: '每人；人人；所有人', collocations: ['everyone else (其他每个人)'], examTips: '作主语谓语动词用单数。' },
        { id: 'g8u1_v09', word: 'myself', phonetic: '/maɪˈself/', pos: 'pron.', meaning: '我自己；我本人', collocations: ['by myself (独自)'], examTips: '反身代词；主语与宾语同为第一人称时用。' },
        { id: 'g8u1_v10', word: 'seem', phonetic: '/siːm/', pos: 'v.', meaning: '好像；似乎；看来', collocations: ['seem to do (似乎做……)', 'seem + adj. (似乎……)'], examTips: 'seem + (to be) + adj. / that 从句；无进行时。' },
      ],
      phrases: [
        { id: 'g8u1_p01', phrase: 'go on vacation', meaning: '去度假', fixedPatterns: 'go on vacation to + [地点]', exampleEn: 'Where did you go on vacation last summer?', exampleCn: '去年夏天你去哪里度假了？' },
        { id: 'g8u1_p02', phrase: 'stay at home', meaning: '待在家里', fixedPatterns: 'stay at home + (alone / with sb.)', exampleEn: 'He stayed at home because it rained.', exampleCn: '因为下雨，他待在家里。' },
        { id: 'g8u1_p03', phrase: 'quite a few', meaning: '相当多；不少', fixedPatterns: 'quite a few + 可数名词复数', exampleEn: 'I met quite a few friends there.', exampleCn: '我在那里遇见了不少朋友。' },
        { id: 'g8u1_p04', phrase: 'of course', meaning: '当然；自然', fixedPatterns: 'Of course (not).', exampleEn: '— Can you help me? — Of course!', exampleCn: '— 你能帮我吗？— 当然！' },
        { id: 'g8u1_p05', phrase: 'feel like', meaning: '给……的感觉；感受到', fixedPatterns: 'feel like + doing / that 从句', exampleEn: 'I felt like I was a bird.', exampleCn: '我觉得自己像一只鸟。' },
      ],
      sentencePatterns: [
        { id: 'g8u1_s01', pattern: 'Did you go anywhere special?', grammarPoint: '不定代词修饰语后置规则', drillTemplate: 'Did you [do something] [adverb/adjective]?' },
        { id: 'g8u1_s02', pattern: 'Where did you go on vacation?', grammarPoint: '一般过去时中疑问副词 where 引导的特殊疑问句', drillTemplate: 'Where did [subject] go [adverbial]?' },
        { id: 'g8u1_s03', pattern: 'Everything was excellent.', grammarPoint: '复合不定代词作主语时谓语用单数', drillTemplate: '[Indefinite pronoun] + was / were + [adjective].' },
      ],
    },
    {
      editionId: 'pep_junior_g8_v1',
      editionName: '人教版 (新目标)',
      grade: 8,
      volume: 1,
      unit: 2,
      title: 'How often do you exercise?',
      vocabularies: [
        { id: 'g8u2_v01', word: 'housework', phonetic: '/ˈhaʊswɜːk/', pos: 'n.', meaning: '家务劳动；家务事', collocations: ['do housework (做家务)'], examTips: '不可数名词，无复数。' },
        { id: 'g8u2_v02', word: 'hardly', phonetic: '/ˈhɑːdli/', pos: 'adv.', meaning: '几乎不；几乎没有', collocations: ['hardly ever (几乎从不)'], examTips: '含否定意义，句中不再加 not。' },
        { id: 'g8u2_v03', word: 'ever', phonetic: '/ˈevə(r)/', pos: 'adv.', meaning: '在任何时候；从来；曾经', collocations: ['hardly ever (几乎从不)', 'Have you ever ...?'], examTips: '常用于现在完成时疑问句。' },
        { id: 'g8u2_v04', word: 'once', phonetic: '/wʌns/', pos: 'adv.', meaning: '一次；曾经', collocations: ['once a week (每周一次)'], examTips: 'twice（两次），三次及以上用 “基数词 + times”。' },
        { id: 'g8u2_v05', word: 'twice', phonetic: '/twaɪs/', pos: 'adv.', meaning: '两次；两倍', collocations: ['twice a month (每月两次)'], examTips: '频率表达：次数 + a + 时间段。' },
        { id: 'g8u2_v06', word: 'full', phonetic: '/fʊl/', pos: 'adj.', meaning: '满的；充满的', collocations: ['be full of (充满……)'], examTips: '反义 empty；副词 fully。' },
        { id: 'g8u2_v07', word: 'maybe', phonetic: '/ˈmeɪbi/', pos: 'adv.', meaning: '大概；或许；可能', collocations: ['maybe not (也许不)'], examTips: '副词，句首表推测；may be 是情态动词 + 动词原形。' },
        { id: 'g8u2_v08', word: 'least', phonetic: '/liːst/', pos: 'adv./adj.', meaning: '最小；最少', collocations: ['at least (至少)', 'least of all (最不)'], examTips: 'little 的最高级；at least 反义 at most。' },
        { id: 'g8u2_v09', word: 'healthy', phonetic: '/ˈhelθi/', pos: 'adj.', meaning: '健康的；健壮的', collocations: ['keep healthy (保持健康)'], examTips: '名词 health；副词 healthily；反义 unhealthy。' },
        { id: 'g8u2_v10', word: 'percent', phonetic: '/pəˈsent/', pos: 'n.', meaning: '百分之……', collocations: ['ten percent (百分之十)'], examTips: '无复数；作主语时看 of 后名词单复决定谓语。' },
      ],
      phrases: [
        { id: 'g8u2_p01', phrase: 'how often', meaning: '多久一次（提问频率）', fixedPatterns: 'How often + 一般疑问句？', exampleEn: 'How often do you exercise?', exampleCn: '你多久锻炼一次？' },
        { id: 'g8u2_p02', phrase: 'go to the movies', meaning: '去看电影', fixedPatterns: 'go to the movies = go to the cinema', exampleEn: 'She goes to the movies twice a week.', exampleCn: '她每周去看两次电影。' },
        { id: 'g8u2_p03', phrase: 'at least', meaning: '至少', fixedPatterns: 'at least + 数量', exampleEn: 'You should sleep at least eight hours.', exampleCn: '你至少应该睡八小时。' },
        { id: 'g8u2_p04', phrase: 'such as', meaning: '例如；像……这样', fixedPatterns: 'such as + 列举项', exampleEn: 'I like sports such as swimming.', exampleCn: '我喜欢游泳之类的运动。' },
      ],
      sentencePatterns: [
        { id: 'g8u2_s01', pattern: 'How often do you exercise?', grammarPoint: 'how often 询问动作发生的频率', drillTemplate: 'How often do/does [subject] [verb]?' },
        { id: 'g8u2_s02', pattern: 'I exercise three times a week.', grammarPoint: '频率副词 / 次数短语作答', drillTemplate: '[Subject] [verb] + [times] + a + [period].' },
        { id: 'g8u2_s03', pattern: 'Although many students like to watch TV, game shows are the most popular.', grammarPoint: 'although 引导让步状语从句（不与 but 连用）', drillTemplate: 'Although [clause], [main clause].' },
      ],
    },
  ],
};

export default pepG8;
