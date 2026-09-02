// 课文朗读数据 — 译林 9A 各单元 Reading 正文
// 来源：kb/units/unit_XX.md 的 📖 Reading 段落（2026-09 提取）
// 说明：正文按段落存储；朗读时由组件按句切分。U2 原文 OCR 断裂，
//       已按上下文语义修正（homewerl→homework 等）。无中文对照。
export interface UnitReading {
  unit: number;
  title: string;
  paragraphs: string[];
}

export const UNIT_READINGS: UnitReading[] = [
  {
    unit: 1,
    title: 'People who are happy with their jobs',
    paragraphs: [
      '“He’s a born artist. He’s quiet, but his work shouts.” This is how Wu Wei’s best friend described him. Wu Wei’s creative work impresses not only his friends but also the whole town. His sculptures for Sunshine Town Square have won high praise from the art community. “I’ve always enjoyed using my imagination to make great art,” he said. “I want to keep sharing new, interesting work with people.”',
      'Su Ming left her job as an accountant five years ago and started working in sales for a big company. “I’m active and energetic, and I love working with people. But in my last job, I had to work with numbers most of the time.” Su Ming is now the sales manager of the company. “I’m happy that I changed my job. This one suits me better,” she added.',
      'Liu Hao, together with his team, has just completed the high-speed railway project between Sunshine Town and Tianjin. As the lead engineer, he is serious about his work and pays attention to every detail. “To us, a miss is as good as a mile. Any mistake may cost lives,” said Mr Liu. One of his team members mentioned, “He always works to high standards, but he’s modest and easy to work with.”',
      'Fang Yuan, a doctor at Sunshine Hospital, is kind and patient. She loves her job very much. “I wanted to be a doctor when I was very young. I think nothing is more meaningful than helping the sick and saving lives,” she explained. Working at a hospital can be tough, as doctors must be very careful at all times and often work long hours. But Ms Fang thinks it is worth it.',
    ],
  },
  {
    unit: 2,
    title: 'What should I do?',
    paragraphs: [
      'Dear Mr Friend,',
      'I have some problems with my parents and I’m not sure what to do. My parents make all the decisions for me. They do not allow me to wear different clothes or to eat what I want. They say they know best. When we eat out, they order without asking what I want.',
      'I know I’m young, but I think I should be able to make some decisions for myself. Every time I talk to them about it, they just tell me to follow their advice. I wonder if we understand each other at all! Do you have any advice?',
      'All the best, Zhang Ke',
      'Dear Mr Friend,',
      'My name is Luo Yang. I am under a lot of stress at school. I find it hard to achieve a balance between my homework and my hobbies. I love playing football. I often play for hours with my friends after school. Then I have to stay up late to finish my homework. As a result, I feel tired the next day.',
      'Sometimes I waste time on my mobile phone when I need to do my homework. I always regret it later, but I just don’t know how to cut back on phone time.',
      'Now I need to find a way out. I don’t want to give up football or my mobile phone, but I also hate to fall behind. I hope you can offer me some advice.',
      'Best wishes, Luo Yang',
    ],
  },
  {
    unit: 3,
    title: 'Stephen Hawking: the mind beyond the wheelchair',
    paragraphs: [
      'Stephen Hawking is recognized as one of the greatest scientists of his time. He was famous for his pioneering work in science and his great courage in the face of serious illness. His story has inspired people all over the world.',
      'Hawking was born in England in 1942. He went to Oxford at 17, and then to Cambridge for further studies. Sadly, he became very ill shortly after his 21st birthday. The disease would slowly take away his ability to control his muscles. Doctors said he had only a few years to live.',
      'As his condition progressed, Hawking lost the use of his legs and arms. Later, he could only move a few fingers, yet he stayed positive. “Although I cannot move and have to speak through a computer, in my mind I am free,” he said. In his final years, he could move just one muscle in his face, but he continued to work until he died at 76.',
      'Although his health was getting worse, Hawking’s love for science never died. “My goal is to understand the universe,” he once said. He spent his whole life studying the origins of the universe, and his book A Brief History of Time has been read by millions of people around the world.',
      'Hawking’s story tells us that with courage and determination, people can achieve great things, no matter what difficulties they face.',
    ],
  },
  {
    unit: 4,
    title: 'The peanut',
    paragraphs: [
      'At the back of our house, there was a small piece of unused land. “It’s a pity to let it go to waste like that,” Mother said. “Since you all enjoy eating peanuts, let’s make it a peanut field.” My brothers, sisters and I were all excited. We began buying seeds, digging up the ground and watering the plants. In a couple of months, we had a harvest!',
      '“Let’s have a party tonight to celebrate,” Mother suggested. She cooked the peanuts in different ways and told us to go to the garden for the celebration.',
      '“Who can tell me what peanuts are good for?” Father asked. “They taste delicious,” my sister took the lead. “They’re good for making oil,” my brother followed. “They’re cheap,” I said. “Almost everyone can afford to buy peanuts and most people like eating them.”',
      '“Peanuts are good for many things,” Father said, “but still, there’s one special thing about them. Unlike apples and peaches that show their fruits in the air and attract people with their beauty, peanuts are buried in the earth. They are modest and useful.”',
      '“So you should be like a peanut,” Father went on. “It is not the most beautiful of all fruits, but it is useful and beneficial to people. I hope you will grow to be useful people in society.”',
      'We all agreed with Father. His words have stayed with me ever since. I have always tried to be like a peanut: useful, modest and true.',
    ],
  },
  {
    unit: 5,
    title: 'Music without boundaries',
    paragraphs: [
      'Have you heard the song “One Earth One Spring”? Tan Dun, a world-famous composer, wrote the music. His unique style has brought him great respect and success in the world of music.',
      'Born in Hunan, China, Tan Dun grew up near the Liuyang River. As a child, he showed a gift for music. He fell in love with the sounds of the rushing water and the blowing wind because, to him, they were the most beautiful music. Since he had no real musical instruments then, he made music with simple objects like stones and paper.',
      'Later, Tan Dun studied music in Beijing and then in the USA. There he became more familiar with Western music and met great musicians from around the world.',
      'That childhood love of natural sounds never left him. In 1998, he wrote an amazing piece called Water Concerto. In it, the sound of water was the real star. By controlling the water flow, Tan created many different sounds—from gentle drips to powerful waves. He believes that these are the sounds of nature, and they paint different pictures in different minds.',
      'Tan’s life experience has allowed him to build a bridge between Eastern and Western music. He also wrote the award music for the Beijing 2008 Olympic Games. This music was perfect for such an international event, as it mixed traditional Chinese music and the sounds of ancient Chinese bells with a Western style.',
      '“My music is to dream without boundaries,” Tan once said. In his works, past and present, everyday objects and musical instruments, traditional Chinese music and modern Western music all come together to create something new—music without boundaries.',
    ],
  },
  {
    unit: 6,
    title: 'My calligraphy journey',
    paragraphs: [
      'I watch closely as my brush meets the paper. I am pleased as I finish the final stroke. My mother appears in the doorway and smiles. She is happy that I can make Spring Festival couplets for our home.',
      'My love of calligraphy began when my father took me to a museum. I was amazed to see so many wonderful pieces of writing. To me, the ancient calligraphy looked like beautiful pictures. After we came home from the museum, I decided to try it myself right away.',
      'I never forget the first time I used a brush. Practising calligraphy requires a lot of attention, and back then, this seemed impossible for me. I could hardly sit still for more than a few minutes! Over time, I learnt to focus, and I took pleasure in producing better work. Calligraphy has helped me become more patient and focused.',
      'While practising calligraphy, I have also learnt more about Chinese characters. They have developed from drawings into their present forms over thousands of years. Calligraphy is an artistic form of Chinese characters that is admired by many people at home and abroad. There are different writing styles, and each has its unique beauty.',
      'Calligraphy is now one of my hobbies that help me relax. When I write, I feel my breath slow down and my mind get quiet. Whenever I feel down or under pressure, I pick up my brush. Practising calligraphy always makes me feel better.',
      'Now my mother is carefully putting up the character fu and the couplets on the door. I look at this with pride and happiness.',
    ],
  },
  {
    unit: 7,
    title: 'Audrey Hepburn: Hollywood’s all-time best',
    paragraphs: [
      'Audrey Hepburn was one of Hollywood’s all-time greatest actresses. But she was much more than a star. When she died in 1993, the world lost a great beauty, a great actress, and a great humanitarian.',
      'Hepburn was born in Belgium on 4 May 1929. As a child, she loved dancing and dreamt of becoming a ballet dancer. Sadly, World War II ended that dream. After the war, she moved to London with her mother and worked as a model.',
      'In 1951, while acting in France, Hepburn met the French writer Colette. Hepburn’s beauty and charm caught her attention. Colette insisted that Hepburn was perfect for the lead role in Gigi, a play based upon her novel, although Hepburn had never played any major roles before. That event marked the beginning of her success.',
      'Soon after that, Hepburn was chosen to play the lead role of a young princess in the Hollywood film Roman Holiday. The film was such a big success that Hepburn soon became world famous. In 1954, she won the Oscar for Best Actress for her role. During her lifetime, she appeared in nearly 30 films and received many important awards.',
      'Hepburn’s achievements went beyond the big screen. She began supporting UNICEF in the 1950s. She helped create radio programmes for children who lived through wars. She visited some African countries and drew the world’s attention to the children there. Hepburn spent her final years working closely with UNICEF so that she could help poor children around the world.',
      'In 1992, Hepburn discovered that she had cancer. On 20 January 1993, she passed away peacefully in her sleep.',
    ],
  },
  {
    unit: 8,
    title: 'The Last Leaf',
    paragraphs: [
      '“She has a very small chance,” the doctor said to Sue. “If people don’t want to live, I can’t do much for them.”',
      'Johnsy lay there, very thin and very quiet, and burning with a fever. “Eight, seven …” Johnsy was counting, and a little later, “… six …” in a voice still lower. An old, old tree grew against the wall outside the window. Almost all its leaves had fallen from its dark branches.',
      '“There goes another one. Only five are left now.” “Five what, dear?” asked Sue, as she moved to Johnsy’s bedside. “Leaves. On the tree. When the last leaf falls, I must go too.”',
      '“Oh! I never heard of such a thing,” said Sue. There was anger in her voice. “It doesn’t make any sense. What does an old tree have to do with you?” Johnsy did not answer.',
      '“Try to sleep,” said Sue. “I’ll go and get Behrman. I want him to be the model for my picture. After I sell it, we’ll have enough money to pay the rent.”',
      'Old Behrman was a sixty-year-old painter. He was a failure in art, but he had a kind heart. When he heard Johnsy’s strange idea, he laughed at it. “What foolishness!” he said. “Why should leaves falling from a tree make a girl give up living?”',
      'A cold, heavy rain was falling. The next morning, Johnsy asked Sue to open the curtain. With a tired voice she said, “Pull it up. I want to see.” After a long, heavy rain, there was still one leaf on the wall. The last leaf! It stayed there, green and full of life.',
      'Johnsy looked at the leaf for a long time. “I have been a bad girl, Sue,” she said. “Something has made me want to live. Please bring me a little soup.”',
      'The next day, the doctor said to Sue, “She’s out of danger. She will get well. But you must take care of your friend downstairs—old Behrman. He has caught a bad cold and he is very ill.”',
      'Later, Sue found Behrman’s paint box and his brushes, and a ladder on the wall. “Look,” she said to Johnsy, “do you see that last leaf on the wall? Behrman painted it there the night the last leaf fell. He gave his life so that you could live.”',
    ],
  },
];
