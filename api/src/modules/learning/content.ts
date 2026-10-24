// Starter content written into a tenant's database the first time it is read.
// Teachers add more lessons from the Teacher page (by hand or with Gemma 4).
// Vocabulary and rules should be reviewed by a Mongolian language teacher
// before classroom use.

export type ItemMode = "pick" | "spot";

export interface ILessonItem {
  mode: ItemMode;
  // Full, correctly spelled sentence. The target word appears in it exactly once.
  sentence: string;
  // The correctly spelled word the student must recognise.
  target: string;
  // Common misspellings. "pick" shows them as choices; "spot" plants the first
  // one in the sentence for the student to find.
  wrongForms: string[];
  ruleTitle: string;
  rule: string;
}

export interface ISeedLesson {
  code: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  items: ILessonItem[];
}

export const SEED_LESSONS: ISeedLesson[] = [
  {
    code: "rules-1",
    title: "Зөв бичгийн дүрэм I",
    description: "Сонсоод зөв бичигдсэн үгийг сонго",
    emoji: "✍️",
    color: "indigo",
    items: [
      {
        mode: "pick",
        sentence: "Би өглөө эрт сургуульдаа явлаа.",
        target: "сургуульдаа",
        wrongForms: ["сургуулдаа", "сургуульдоо"],
        ruleTitle: "Зөөлний тэмдэг",
        rule: "Ь-ээр төгссөн үгэнд гийгүүлэгчээр эхэлсэн нөхцөл залгахад ь хэвээр үлдэнэ: сургууль → сургуульдаа.",
      },
      {
        mode: "pick",
        sentence: "Ээж маань амттай хоол хийлээ.",
        target: "амттай",
        wrongForms: ["амтай", "амтатай"],
        ruleTitle: "Давхар гийгүүлэгч",
        rule: "Үндэс нь т-ээр төгсөөд -тай нөхцөл залгахад т давхар бичигдэнэ: амт + тай = амттай.",
      },
      {
        mode: "pick",
        sentence: "Монгол Улсын нийслэл бол Улаанбаатар хот.",
        target: "Улаанбаатар",
        wrongForms: ["Улаан баатар", "Уланбаатар"],
        ruleTitle: "Нийлмэл газар нэр",
        rule: "Нийлмэл газар зүйн нэрийг хамт, эхний үсгийг томоор бичнэ. Урт эгшгийг хадгална.",
      },
      {
        mode: "pick",
        sentence: "Багш шинэ дүрмийг тайлбарлав.",
        target: "дүрмийг",
        wrongForms: ["дүрмыг", "дүрэмийг"],
        ruleTitle: "Эм үгийн нөхцөл",
        rule: "Эм үгэнд -ийг, эр үгэнд -ыг залгана. Дүрэм нь эм үг бөгөөд нөхцөл залгахад богино эгшиг гээгдэнэ: дүрмийг.",
      },
      {
        mode: "pick",
        sentence: "Аав морийг уяанд уялаа.",
        target: "морийг",
        wrongForms: ["морыг", "морьыг"],
        ruleTitle: "Ь-тэй үгийн нөхцөл",
        rule: "Ь-ээр төгссөн үгэнд -ийг залгахад ь гээгдэнэ: морь → морийг.",
      },
      {
        mode: "pick",
        sentence: "Тэр хичээлдээ маш хичээнгүй.",
        target: "хичээлдээ",
        wrongForms: ["хичээлдаа", "хичээлдоо"],
        ruleTitle: "Эгшиг зохицох ёс",
        rule: "Эм үгэнд эм эгшигтэй нөхцөл залгана: хичээл → хичээлдээ.",
      },
      {
        mode: "pick",
        sentence: "Өвөл их цас орно.",
        target: "цас",
        wrongForms: ["цаас", "цасс"],
        ruleTitle: "Урт, богино эгшиг",
        rule: "Урт, богино эгшиг утга ялгана: цас (snow) ба цаас (paper) өөр үг.",
      },
      {
        mode: "pick",
        sentence: "Бид Цагаан сарын баярыг тэмдэглэв.",
        target: "Цагаан",
        wrongForms: ["цагаан", "Цаган"],
        ruleTitle: "Баярын нэр",
        rule: "Үндэсний баярын нэрийн эхний үгийг том үсгээр эхэлж бичнэ: Цагаан сар.",
      },
    ],
  },
  {
    code: "spot-1",
    title: "Алдааг ол!",
    description: "Сонсоод алдаатай үгийг дугуйл",
    emoji: "🔍",
    color: "coral",
    items: [
      {
        mode: "spot",
        sentence: "Хүүхдүүд талбай дээр хөл бөмбөг тоглов.",
        target: "Хүүхдүүд",
        wrongForms: ["Хүүхэдүүд"],
        ruleTitle: "Эгшиг гээгдэх",
        rule: "Хүүхэд + үүд → хүүхдүүд: үгийн сүүлийн үеийн богино эгшиг гээгдэнэ.",
      },
      {
        mode: "spot",
        sentence: "Миний найз номын санд очсон.",
        target: "номын",
        wrongForms: ["номийн"],
        ruleTitle: "Харьяалахын тийн ялгал",
        rule: "Эр үгэнд -ын, эм үгэнд -ийн залгана. Ном нь эр үг: номын.",
      },
      {
        mode: "spot",
        sentence: "Бид ирэх долоо хоногт уулзана.",
        target: "долоо",
        wrongForms: ["доло"],
        ruleTitle: "Урт эгшиг",
        rule: "Долоо гэдэг тоо урт эгшгээр төгсөнө: долоо.",
      },
      {
        mode: "spot",
        sentence: "Сурагч гэрийн даалгавраа хийв.",
        target: "даалгавраа",
        wrongForms: ["даалгавараа"],
        ruleTitle: "Эгшиг гээгдэх",
        rule: "Даалгавар + аа → даалгавраа: нөхцөл залгахад сүүлийн үеийн богино эгшиг гээгдэнэ.",
      },
      {
        mode: "spot",
        sentence: "Эмээ маань сүүтэй цай чанав.",
        target: "сүүтэй",
        wrongForms: ["сүүтай"],
        ruleTitle: "Эгшиг зохицох ёс",
        rule: "Сүү нь эм үг тул -тэй залгана: сүүтэй.",
      },
      {
        mode: "spot",
        sentence: "Би өчигдөр шинэ кино үзсэн.",
        target: "өчигдөр",
        wrongForms: ["өчгөдөр"],
        ruleTitle: "Тогтсон бичлэг",
        rule: "Өчигдөр гэдэг үгийн зөв бичлэг: ө-ч-и-г-д-ө-р.",
      },
    ],
  },
];

export interface ISeedCard {
  code: string;
  cyrillic: string;
  script: string;
  galig: string;
  meaning: string;
  emoji: string;
  premium: boolean;
  meaningMn?: string;
  rule?: string;
  example?: string;
}

// Back-of-card study notes: Mongolian meaning, spelling rule, sample sentence.
export const CARD_NOTES: Record<string, { meaningMn: string; rule: string; example: string }> = {
  mongol: { meaningMn: "Монгол улс, монгол үндэстэн", rule: "Улс, үндэстний нэрийг том үсгээр эхэлж бичнэ.", example: "Монгол хүн морь унах дуртай." },
  usu: { meaningMn: "Уух, угаах тунгалаг шингэн", rule: "Далд н-тэй үг: ус → усны, усанд.", example: "Би өдөр бүр ус уудаг." },
  ger: { meaningMn: "Амьдардаг байр, монгол гэр", rule: "Эм үг тул эм эгшигтэй нөхцөл авна: гэрт, гэрээс, гэрийн.", example: "Манай гэр хотын захад байдаг." },
  nom: { meaningMn: "Уншдаг бичиг", rule: "Эр үг тул эр эгшигтэй нөхцөл авна: номын, номоо, номд.", example: "Би шинэ ном уншлаа." },
  naran: { meaningMn: "Өдөр гэрэлтүүлдэг од", rule: "Далд н-тэй үг: нар → нарны, наранд.", example: "Нар өглөө мандана." },
  sara: { meaningMn: "Шөнө гэрэлтдэг тэнгэрийн биет; 30 хоног", rule: "Эр үг: сарын, сараас.", example: "Тэнгэрт сар гэрэлтэнэ." },
  mori: { meaningMn: "Унаж явдаг мал", rule: "Ь-ээр төгссөн үгэнд эгшгээр эхэлсэн нөхцөл залгахад ь гээгдэнэ: морь → морийг, мориор.", example: "Аав морио уналаа." },
  eke: { meaningMn: "Төрсөн эх", rule: "Урт эгшиг ээ хадгална: ээжийн, ээжтэй.", example: "Ээж маань хоол хийлээ." },
  abu: { meaningMn: "Төрсөн эцэг", rule: "Урт эгшиг аа хадгална: аавын, аавтай.", example: "Аав маань ажилдаа явлаа." },
  surgaguli: { meaningMn: "Хичээл заадаг газар", rule: "Ь-тэй үг: сургуульд, сургуулийн, сургуулиас.", example: "Би сургуульдаа алхаж явдаг." },
  tngri: { meaningMn: "Дээр харагдах цэнхэр огторгуй", rule: "Эм үг: тэнгэрт, тэнгэрийн.", example: "Цэлмэг тэнгэрт од гялалзана." },
  baksi: { meaningMn: "Хичээл заадаг хүн", rule: "Ж, ч, ш-ээр төгссөн үгэнд -ийн, -ийг залгана: багшийн, багшийг.", example: "Манай багш хичээлээ сонирхолтой заадаг." },
  sain: { meaningMn: "Муу гэдгийн эсрэг", rule: "Хос эгшиг ай-г й-ээр бичнэ: сайн, сайхан.", example: "Сайн байна уу?" },
  keuked: { meaningMn: "Бага насны хүн", rule: "Нөхцөл залгахад сүүлийн богино эгшиг гээгдэнэ: хүүхдүүд, хүүхдийн.", example: "Хүүхдүүд талбайд тоглов." },
  cinggis: { meaningMn: "Их Монгол Улсыг байгуулагч", rule: "Хүний нэрийг том үсгээр эхэлж бичнэ.", example: "Чингис хаан Их Монгол Улсыг байгуулсан." },
  qagan: { meaningMn: "Улсын тэргүүн, эзэн хаан", rule: "Урт эгшиг аа хадгална: хааны, хаантай.", example: "Хаан ордондоо залрав." },
  ekeoron: { meaningMn: "Төрж өссөн нутаг, улс", rule: "Хоёр үгийг тусад нь бичнэ; нөхцөл залгахад эгшиг гээгдэнэ: эх орноо.", example: "Бид эх орноо хайрладаг." },
  naija: { meaningMn: "Дотно нөхөр", rule: "Эр үг: найзын, найзтайгаа.", example: "Найзтайгаа номын санд очлоо." },
};

export const SEED_CARDS: ISeedCard[] = [
  { code: "mongol", cyrillic: "Монгол", script: "ᠮᠣᠩᠭᠣᠯ", galig: "mongɣol", meaning: "Mongolia", emoji: "🇲🇳", premium: false },
  { code: "usu", cyrillic: "Ус", script: "ᠤᠰᠤ", galig: "usu", meaning: "Water", emoji: "💧", premium: false },
  { code: "ger", cyrillic: "Гэр", script: "ᠭᠡᠷ", galig: "ger", meaning: "Home, ger", emoji: "⛺", premium: false },
  { code: "nom", cyrillic: "Ном", script: "ᠨᠣᠮ", galig: "nom", meaning: "Book", emoji: "📖", premium: false },
  { code: "naran", cyrillic: "Нар", script: "ᠨᠠᠷᠠᠨ", galig: "naran", meaning: "Sun", emoji: "☀️", premium: false },
  { code: "sara", cyrillic: "Сар", script: "ᠰᠠᠷᠠ", galig: "sara", meaning: "Moon", emoji: "🌙", premium: false },
  { code: "mori", cyrillic: "Морь", script: "ᠮᠣᠷᠢ", galig: "mori", meaning: "Horse", emoji: "🐎", premium: false },
  { code: "eke", cyrillic: "Ээж", script: "ᠡᠬᠡ", galig: "eke", meaning: "Mother", emoji: "👩", premium: false },
  { code: "abu", cyrillic: "Аав", script: "ᠠᠪᠤ", galig: "abu", meaning: "Father", emoji: "👨", premium: false },
  { code: "surgaguli", cyrillic: "Сургууль", script: "ᠰᠤᠷᠭᠠᠭᠤᠯᠢ", galig: "surɣaɣuli", meaning: "School", emoji: "🏫", premium: false },
  { code: "tngri", cyrillic: "Тэнгэр", script: "ᠲᠩᠷᠢ", galig: "tngri", meaning: "Sky", emoji: "🌌", premium: false },
  { code: "baksi", cyrillic: "Багш", script: "ᠪᠠᠭᠰᠢ", galig: "baɣsi", meaning: "Teacher", emoji: "🧑‍🏫", premium: false },
  { code: "sain", cyrillic: "Сайн", script: "ᠰᠠᠢᠨ", galig: "sain", meaning: "Good", emoji: "👍", premium: false },
  { code: "keuked", cyrillic: "Хүүхэд", script: "ᠬᠡᠦᠬᠡᠳ", galig: "keüked", meaning: "Child", emoji: "🧒", premium: false },
  // Unlocked from the point shop ("Алтан карт" pack).
  { code: "cinggis", cyrillic: "Чингис", script: "ᠴᠢᠩᠭᠢᠰ", galig: "čingɣis", meaning: "Chinggis", emoji: "👑", premium: true },
  { code: "qagan", cyrillic: "Хаан", script: "ᠬᠠᠭᠠᠨ", galig: "qaɣan", meaning: "Khan, king", emoji: "🏯", premium: true },
  { code: "ekeoron", cyrillic: "Эх орон", script: "ᠡᠬᠡ ᠣᠷᠣᠨ", galig: "eke oron", meaning: "Motherland", emoji: "🏔️", premium: true },
  { code: "naija", cyrillic: "Найз", script: "ᠨᠠᠢᠵᠠ", galig: "naiǰa", meaning: "Friend", emoji: "🤝", premium: true },
];

export type ShopKind = "avatar" | "freeze" | "pack" | "reward";

export interface IShopItem {
  code: string;
  kind: ShopKind;
  title: string;
  description: string;
  emoji: string;
  cost: number;
  // Consumables (streak freeze) can be bought again; the rest are owned once.
  repeatable: boolean;
}

export const SHOP_ITEMS: IShopItem[] = [
  { code: "avatar-horse", kind: "avatar", title: "Хурдан морь", description: "Профайлын аватар", emoji: "🐎", cost: 30, repeatable: false },
  { code: "avatar-eagle", kind: "avatar", title: "Бүргэд", description: "Профайлын аватар", emoji: "🦅", cost: 60, repeatable: false },
  { code: "avatar-camel", kind: "avatar", title: "Тэмээ", description: "Профайлын аватар", emoji: "🐫", cost: 60, repeatable: false },
  { code: "avatar-snowleopard", kind: "avatar", title: "Ирвэс", description: "Ховор аватар", emoji: "🐆", cost: 150, repeatable: false },
  { code: "freeze", kind: "freeze", title: "Streak хамгаалалт", description: "Нэг өдөр алгасахад streak тасрахгүй", emoji: "🧊", cost: 50, repeatable: true },
  { code: "pack-golden", kind: "pack", title: "Алтан карт", description: "Монгол бичгийн 4 тусгай карт нээнэ", emoji: "🎴", cost: 100, repeatable: false },
  { code: "reward-teacher", kind: "reward", title: "Багшийн урамшуулал", description: "Багшаас онцгой магтаал авна", emoji: "🏅", cost: 200, repeatable: true },
];

export const DEFAULT_AVATAR = "🐣";
