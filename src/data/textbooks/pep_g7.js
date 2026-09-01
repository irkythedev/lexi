// 人教版 (新目标) 七年级上册 — 单元测试数据集
// 严格遵循 spec 数据 schema: editionId / grade / volume / unit / title
// + vocabularies / phrases / sentencePatterns 三类条目。
const pepG7 = {
  editionId: 'pep_junior_g7_v1',
  editionName: '人教版 (新目标)',
  publisher: '人教版',
  stage: '初中',
  region: '全国通用',
  grades: [
    { grade: 7, volumes: [{ volume: 1, title: '七年级上册' }] },
  ],
  units: [
    {
      editionId: 'pep_junior_g7_v1',
      editionName: '人教版 (新目标)',
      grade: 7,
      volume: 1,
      unit: 1,
      title: "My name's Gina.",
      vocabularies: [
        { id: 'g7u1_v01', word: 'name', phonetic: '/neɪm/', pos: 'n.', meaning: '名字；名称', collocations: ['first name (名字)', 'last name (姓)'], examTips: '中文姓名英语表达：姓在前、名在后，首字母均大写，如 Zhang San。' },
        { id: 'g7u1_v02', word: 'nice', phonetic: '/naɪs/', pos: 'adj.', meaning: '令人愉快的；宜人的', collocations: ['nice to meet you (很高兴见到你)'], examTips: '“Nice to meet you.” 回答用 “Nice to meet you, too.”。' },
        { id: 'g7u1_v03', word: 'to', phonetic: '/tuː/', pos: 'prep.', meaning: '常用于动词前，表目的或方向', collocations: ['say hello to ... (向……问好)'], examTips: '与动词原形构成不定式，如 “Nice to meet you.”。' },
        { id: 'g7u1_v04', word: 'meet', phonetic: '/miːt/', pos: 'v.', meaning: '遇见；相逢', collocations: ['meet sb. (遇见某人)'], examTips: '名词 meeting 表示“会议 / 集会”。' },
        { id: 'g7u1_v05', word: 'too', phonetic: '/tuː/', pos: 'adv.', meaning: '也；又；太', collocations: ['me too (我也是)'], examTips: '肯定句末表“也”用 too；否定句末用 either。' },
        { id: 'g7u1_v06', word: 'your', phonetic: '/jɔː(r)/', pos: 'pron.', meaning: '你的；你们的', collocations: ['your name (你的名字)'], examTips: '形容词性物主代词，后接名词；主格 you ↔ 宾格 you ↔ 形物代 your ↔ 名物代 yours。' },
        { id: 'g7u1_v07', word: 'his', phonetic: '/hɪz/', pos: 'pron.', meaning: '他的', collocations: ['his pen (他的钢笔)'], examTips: 'his 既是形容词性也是名词性物主代词（同形）。' },
        { id: 'g7u1_v08', word: 'her', phonetic: '/hɜː(r)/', pos: 'pron.', meaning: '她的', collocations: ['her book (她的书)'], examTips: 'her 是形容词性物主代词；名词性为 hers；宾格也为 her，注意语境区分。' },
        { id: 'g7u1_v09', word: 'number', phonetic: '/ˈnʌmbə(r)/', pos: 'n.', meaning: '数字；号码', collocations: ['telephone number (电话号码)'], examTips: '缩写 No.（number 的复数 Nos.）。' },
        { id: 'g7u1_v10', word: 'telephone', phonetic: '/ˈtelɪfəʊn/', pos: 'n.', meaning: '电话；电话机', collocations: ['telephone number (电话号码)'], examTips: '可缩写为 phone；动词义“打电话”。' },
      ],
      phrases: [
        { id: 'g7u1_p01', phrase: 'first name', meaning: '名字', fixedPatterns: 'first name = given name', exampleEn: 'My first name is Gina.', exampleCn: '我的名字是吉娜。' },
        { id: 'g7u1_p02', phrase: 'last name', meaning: '姓', fixedPatterns: 'last name = family name', exampleEn: 'Her last name is Smith.', exampleCn: '她姓史密斯。' },
        { id: 'g7u1_p03', phrase: 'telephone number', meaning: '电话号码', fixedPatterns: 'What is your telephone number?', exampleEn: 'What is your telephone number?', exampleCn: '你的电话号码是多少？' },
        { id: 'g7u1_p04', phrase: 'middle school', meaning: '中学；初中', fixedPatterns: 'in middle school (在中学)', exampleEn: 'We are in the same middle school.', exampleCn: '我们在同一所中学。' },
      ],
      sentencePatterns: [
        { id: 'g7u1_s01', pattern: "What's your name?", grammarPoint: 'be 动词引导的特殊疑问句（询问姓名）', drillTemplate: "What's [possessive] [noun]?" },
        { id: 'g7u1_s02', pattern: 'My name is Gina.', grammarPoint: '主系表结构作自我介绍', drillTemplate: 'My [noun] is [proper noun].' },
        { id: 'g7u1_s03', pattern: 'Nice to meet you.', grammarPoint: '初次见面问候语及其应答', drillTemplate: 'Nice to meet [pronoun], too.' },
      ],
    },
    {
      editionId: 'pep_junior_g7_v1',
      editionName: '人教版 (新目标)',
      grade: 7,
      volume: 1,
      unit: 2,
      title: 'This is my sister.',
      vocabularies: [
        { id: 'g7u2_v01', word: 'sister', phonetic: '/ˈsɪstə(r)/', pos: 'n.', meaning: '姐；妹', collocations: ['younger / elder sister (妹妹 / 姐姐)'], examTips: '对应 brother（兄 / 弟）。' },
        { id: 'g7u2_v02', word: 'mother', phonetic: '/ˈmʌðə(r)/', pos: 'n.', meaning: '母亲；妈妈', collocations: ['mother tongue (母语)'], examTips: '口语 mom / mum；对应 father。' },
        { id: 'g7u2_v03', word: 'father', phonetic: '/ˈfɑːðə(r)/', pos: 'n.', meaning: '父亲；爸爸', collocations: ['father and son (父子)'], examTips: '口语 dad / daddy。' },
        { id: 'g7u2_v04', word: 'parent', phonetic: '/ˈpeərənt/', pos: 'n.', meaning: '父（母）亲', collocations: ['parents (父母两人)'], examTips: 'parent 单指父亲或母亲；parents 指双亲。' },
        { id: 'g7u2_v05', word: 'grandmother', phonetic: '/ˈɡrænmʌðə(r)/', pos: 'n.', meaning: '（外）祖母；奶奶；外婆', collocations: ['maternal grandmother (外婆)'], examTips: '口语 grandma。' },
        { id: 'g7u2_v06', word: 'grandfather', phonetic: '/ˈɡrænfɑːðə(r)/', pos: 'n.', meaning: '（外）祖父；爷爷；外公', collocations: ['paternal grandfather (爷爷)'], examTips: '口语 grandpa。' },
        { id: 'g7u2_v07', word: 'these', phonetic: '/ðiːz/', pos: 'pron.', meaning: '这些', collocations: ['these days (这些天)'], examTips: 'this 的复数；对应 those（那些）。' },
        { id: 'g7u2_v08', word: 'those', phonetic: '/ðəʊz/', pos: 'pron.', meaning: '那些', collocations: ['those people (那些人)'], examTips: 'that 的复数。' },
        { id: 'g7u2_v09', word: 'they', phonetic: '/ðeɪ/', pos: 'pron.', meaning: '他（她、它）们', collocations: ['they are = they\'re'], examTips: '主格；宾格 them；形物代 their；名物代 theirs。' },
        { id: 'g7u2_v10', word: 'who', phonetic: '/huː/', pos: 'pron.', meaning: '谁；什么人', collocations: ['who else (还有谁)'], examTips: '疑问代词，作主语时谓语动词用单数（who is / who are 视语境）。' },
      ],
      phrases: [
        { id: 'g7u2_p01', phrase: 'this is', meaning: '这是（用于介绍他人）', fixedPatterns: 'This is + 人名（不用 He/She is）', exampleEn: 'This is my sister.', exampleCn: '这是我的妹妹。' },
        { id: 'g7u2_p02', phrase: 'family tree', meaning: '家谱；家族关系图', fixedPatterns: 'draw a family tree', exampleEn: 'Can you draw your family tree?', exampleCn: '你能画出你的家谱吗？' },
        { id: 'g7u2_p03', phrase: 'have a good day', meaning: '（祝你）过得愉快', fixedPatterns: 'Have a good day! (= Have a nice day!)', exampleEn: '— Bye! — Have a good day!', exampleCn: '— 再见！— 祝你一天愉快！' },
      ],
      sentencePatterns: [
        { id: 'g7u2_s01', pattern: 'This is my sister.', grammarPoint: '指示代词 this 介绍近处单数的人 / 物', drillTemplate: 'This is [one\'s] [family member].' },
        { id: 'g7u2_s02', pattern: 'These are my parents.', grammarPoint: 'these 与复数 be 动词 are 搭配', drillTemplate: 'These are [plural noun].' },
        { id: 'g7u2_s03', pattern: 'Who is she? — She is my cousin.', grammarPoint: 'who 引导询问身份的特殊疑问句及回答', drillTemplate: 'Who is [pronoun]? — [Pronoun] is [relation].' },
      ],
    },
  ],
};

export default pepG7;
