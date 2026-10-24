# Education: Монгол бичиг ба цээж бичиг 🎧✍️

**An open-source erxes plugin that builds real Mongolian spelling skills through gamified online dictation, Mongolian script flashcards and a Gemma 4 writing assistant.**

> Hacktoberfest Hack Day Ulaanbaatar × erxes Hub · 2026-10-24

---

## Асуудал (Problem)

Сурагчид эсээгээ AI-аар бичүүлдэг болсон тул **AI-detection үр дүнгүй** болсон. Багш нар хүүхдийн бодит зөв бичгийн мэдлэгийг шалгах, сайжруулах хэрэгсэлгүй. Цээж бичиг цаасан дээр явагддаг, засахад багшийн цаг их ордог, алдсан үг дээрээ давтан ажиллах систем байхгүй. Монгол бичгийг сурах сонирхол татахуйц, интерактив хэрэгсэл ч дутмаг.

**Зорилтот хэрэглэгч:** ЕБС-ийн сурагчид (бага, дунд анги), Монгол хэлний багш нар, сургалтын төвүүд.

**Шийдэл:** AI-г хориглохын оронд хүүхдийн мэдлэгийг *өөрийг нь* хөгжүүлэх. Тэд сонсож, сонгож, алдаагаа олж, давтана. AI нь бичиж өгдөггүй, зөвхөн алдааг тайлбарлана.

> Багш нар сурагчдын зөв бичгийн бодит мэдлэгийг шалгах хэрэгсэлгүй, сурагчид AI-д найддаг. Бид erxes-д зориулсан тоглоом шиг цээж бичгийн plugin бүтээж, сурагч бүрийн алдааг цуглуулан 100% бататгах, багшид ангийн түгээмэл алдааг харуулах боломж бүрдүүлсэн.

## Үндсэн функцүүд (Features)

| | Функц | Төлөв |
|---|---|---|
| 🎧 | **Интерактив онлайн цээж бичиг**: өгүүлбэрийг дуудлагаар сонсоно (waveform анимац, удаан унших), **зөв бичигдсэн үгийг сонгоно** | ✅ Ажиллаж байна |
| 🔍 | **Spot & Circle the Mistake**: өгүүлбэр дэх алдаатай үгийг олж дарахад гараар зурсан мэт **дугуйлна**, зөв хэлбэр нь гарч ирнэ | ✅ |
| 💡 | Хариулт бүрийн дараа **дүрмийн тайлбар**, зөвд confetti + дуу, буруу бол зөөлөн shake | ✅ |
| 🔁 | **Mistake Review Mode**: алдсан үг бүр дүрмийн сануулгатай буцаж гарна, бүгдийг зөв хариулах хүртэл (100% бататгал) | ✅ |
| 🧠 | **SRS флаш карт (Spaced Repetition)**: Chimege-ээр сонсоод **бичнэ**, бичлэгийг толь бичгээр хатуу шалгаж үнэлнэ. Үнэлгээ: 1 Хэцүү → 1 минут, 2 Сайн → 10 минут, 3 Амархан → маргааш. Ар тал: утга, зөв бичлэг, дүрэм, жишээ өгүүлбэр | ✅ |
| 🎴 | **Монгол бичгийн карт**: босоо Монгол бичиг, **3D flip**, **Галиг toggle** | ✅ |
| 🔊 | **Chimege TTS**: бүх дуудлага Монгол дуу хоолойгоор | ✅ (`CHIMEGE_TOKEN`) |
| 🔥 | **GitHub маягийн идэвхийн heatmap**, өдөр тутмын streak, түвшин, XP | ✅ |
| 🛍️ | **Point Shop**: аватар, **Streak хамгаалалт** (тасарсан өдрийг нөхнө), **Алтан карт** (тусгай Монгол бичгийн карт нээнэ), багшийн урамшуулал | ✅ |
| ✨ | **Хатуу горимын AI редактор**: үг бүрийг **Монгол хэлний Hunspell толь бичгээр** шалгана, толь бичигт байхгүй үгийг хэзээ ч зөв гэж үзэхгүй. Gemma 4 нь агуулгын алдаа (цас/цаас, том үсэг) болон тайлбарыг нэмнэ. Хариу нь `{original_word, is_correct, corrected_word, error_type, explanation_mn}` JSON | ✅ |
| 🧑‍🏫 | **Багшийн самбар**: сурагчдын түвшин, streak, нарийвчлал, **ангийн хамгийн их алддаг үгс** | ✅ |
| 🪄 | **Gemma 4-өөр цээж бичиг үүсгэх**: багш сэдэв бичихэд Gemma шинэ хичээл зохиоод хадгална | ✅ (API key хэрэгтэй) |
| ✍️ | Багш гараар хичээл нэмэх / устгах | ✅ |

## erxes-тэй холбогдох арга (erxes integration)

Энэ plugin нь erxes monorepo-оос гадуур амьдардаг **жинхэнэ erxes plugin** бөгөөд `create-erxes-plugin` (platform stack)-ээр үүсгэгдсэн.

```
 Browser ──► erxes core-ui (:3001) ──loads──► education_ui remoteEntry.js (:3099)   Module Federation
    │                                                                               (React, Apollo, router,
    ▼                                                                                erxes-ui are host singletons)
 erxes gateway (:4000, Apollo Router) ──federates──► core-api (:3300)
                                     └────────────► education_api (:3399)  ◄── registers itself in Redis
                                                        │
                                                        ▼
                                          MongoDB (tenant-scoped models)
```

- **Service discovery:** `erxes-api-shared` → `startPlugin()` бүртгэлийг Redis-д бичнэ (`erxes-service-education`, `UI_ENTRY_URL`). Gateway болон core-api `ENABLED_PLUGINS`-д `education` байвал plugin-ийг автоматаар олно.
- **GraphQL Federation:** API нь `Education*` төрөл, `education*` query/mutation бүхий subgraph. erxes gateway үүнийг нэг supergraph болгоно (`educationMe`, `educationSubmitAttempt`, `educationAiCheck`, `educationClassOverview` …).
- **erxes хэрэглэгч ба эрх:** Сурагч, багш нь **erxes team member**. Нэвтэрсэн хэрэглэгч gateway-аас `context.user` болж ирнэ. Эрх нь erxes-ийн permission системээр: `educationPractice`, `educationTeach` үйлдэл ба бэлэн бүлгүүд **Education · Students**, **Education · Teachers** (Settings → Permissions).
- **Tenant isolation:** Бүх өгөгдөл `generateModels(subdomain)`-ээр тухайн байгууллагын MongoDB-д: `education_lessons`, `education_cards`, `education_progress`, `education_attempts`.
- **UI:** erxes `AppLayout`, sidebar, `PageHeader`, favorites, toast, dark mode, бүгд host-ийн design system-ээр. Plugin-ийн өөрийн загвар `edu-` угтвартай тул host-д нөлөөлөхгүй.

## Хатуу шалгалт (Strict Mode): толь бичиг + Gemma 4

1. **Толь бичиг шийднэ:** [dictionary-mn](https://github.com/wooorm/dictionaries/tree/main/dictionaries/mn) (LibreOffice-ийн Монгол Hunspell толь) WebAssembly-ээр (`hunspell-asm`) сервер дээр ажиллана. Толь бичигт байхгүй үг бол `is_correct: false` (жишээ нь «асуудалтайй» → «асуудалтай» `Typo`, «байны» → «байна» `Spelling`, «хичээлдаа» → «хичээлдээ» `Vowel Harmony`).
2. **Gemma 4 нэмнэ, дарахгүй:** Gemma-ийн засварыг зөвхөн засварласан үг нь толь бичигт байвал хүлээн авна. Толь бичигт байгаа ч буруу хэрэглэсэн үгийг (цаас/цас, «цагаан сар» → «Цагаан сар») Gemma олно.
3. **Сонголтыг эрэмбэлэх:** Hunspell-ийн саналуудаас эгшиг↔эгшиг солилт, давхардсан үсэг хасахыг хямд үнэлдэг жигнэсэн Levenshtein-ээр хамгийн ойрыг сонгоно.

## Chimege интеграц

- **TTS:** `CHIMEGE_TTS_URL` (default `https://api.chimege.com/v1.2/synthesize`). Карт, цээж бичгийн өгүүлбэр, жишээ өгүүлбэрийг Монгол дуу хоолойгоор (speed 0.95) уншина. Текст бүрийн аудиог серверт кэшлэнэ.
- `Token` header-ийг зөвхөн сервер илгээнэ, browser хэзээ ч түлхүүрийг харахгүй. Шалгах: `pnpm --filter education_api chimege:check`. Түлхүүр тохируулаагүй бол browser-ийн дуу хоолой руу автоматаар шилжинэ.

## Gemma 4 интеграц

| Хаана | Юу хийдэг |
|---|---|
| ✨ AI редактор (`educationAiCheck`) | Сурагчийн текстийг шалгаж `{corrected, issues[{wrong,right,rule}], tip}` JSON буцаана. **Бичиж өгдөггүй, зөвхөн засна.** |
| 🪄 Хичээл үүсгэгч (`educationLessonGenerate`) | Багшийн сэдвээр `pick` / `spot` цээж бичгийн өгүүлбэр, буруу хэлбэр, дүрэм зохионо. Буцаасан өгүүлбэр бүрийг сервер шалгаж (зорилтот үг өгүүлбэрт яг 1 удаа орсон эсэх гэх мэт) хүчинтэйг нь л хадгална. |

- Model: `gemma-4-26b-a4b-it` (Gemini API `generateContent`), `GEMMA_MODEL`-оор солино.
- API key зөвхөн сервер дээр (`GEMINI_API_KEY`), browser руу хэзээ ч явахгүй.
- Key байхгүй эсвэл Gemma алдаа өгвөл AI редактор **офлайн горимд** шилжиж, хичээлүүдэд байгаа түгээмэл алдааны толь бичгээр шалгана (UI дээр "Офлайн дүрэм" гэж харагдана).
- Дуудлага: Gemma 4 аудио гаргадаггүй тул browser-ийн Speech Synthesis ашиглана (Монгол дуу хоолой байвал түүгээр, үгүй бол ойролцоо кирилл дуудлагаар).

## Технологи (Tech stack)

- **API:** Node.js 22, TypeScript, `@erxes/api-shared` (startPlugin), Apollo Federation subgraph, Mongoose, Zod
- **UI:** React 18, Module Federation (Rspack), Apollo Client, `@erxes/ui` / `@erxes/ui-modules`, Tailwind CSS 4 (prefixed), GraphQL Codegen
- **AI:** Google DeepMind **Gemma 4** via Gemini API · **Chimege** Mongolian TTS
- **Spelling:** Hunspell (`hunspell-asm`, WebAssembly) + `dictionary-mn` Mongolian dictionary
- **Font:** Noto Sans Mongolian (босоо Монгол бичиг)

## Суулгах, ажиллуулах (Setup)

Шаардлага: ажиллаж буй erxes (core-api, gateway, core-ui), MongoDB replica set, Redis, Node.js 22, pnpm 9.

```sh
git clone <this repo> education && cd education
pnpm install
cp .env.example .env
```

`.env`-д erxes-тэй **ижил** MongoDB, Redis-ийг заана:

```sh
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
MONGO_URL=mongodb://127.0.0.1:27017/erxes?replicaSet=rs0&directConnection=true
UI_ENTRY_URL=http://localhost:3099/remoteEntry.js
# Chimege (Монгол TTS)
CHIMEGE_TOKEN=
# Gemma 4 (заавал биш). https://aistudio.google.com/apikey
GEMINI_API_KEY=
GEMMA_MODEL=gemma-4-26b-a4b-it
```

Хоёр терминалд:

```sh
pnpm run dev:api   # :3399, erxes gateway-д бүртгэгдэнэ
pnpm run dev:ui    # :3099, remoteEntry.js
```

erxes талд core-api болон gateway-г `education` идэвхжүүлж дахин эхлүүлнэ:

```sh
# erxes/backend/core-api
ENABLED_PLUGINS=education pnpm dev        # эсвэл erxes .env дэх ENABLED_PLUGINS-д нэмнэ
# erxes/backend/gateway
ENABLED_PLUGINS=education pnpm dev
```

Нээх: **http://localhost:3001/education**. Анхны хүсэлтээр жишээ хичээл, картууд автоматаар үүснэ. Owner бүх эрхтэй. Бусад хэрэглэгчийг Settings → Permissions-д **Education · Students / Teachers** бүлэгт нэмнэ.

| Script | |
|---|---|
| `pnpm run codegen` | API schema хэвлэж UI-ийн GraphQL төрлийг үүсгэнэ |
| `pnpm run check` | TypeScript шалгалт |
| `pnpm run lint` | oxlint |
| `pnpm run build` | Production build |

## Төслийн бүтэц

```
api/src/
  main.ts                       startPlugin + permissions
  permissions.ts                educationPractice / educationTeach + default groups
  graphql/schema.ts             typeDefs + resolvers
  modules/learning/
    content.ts                  seed lessons, Mongolian script cards, shop items
    service.ts                  XP, levels, streak + freeze logic, mistakes, shop, SRS grading
    spell.ts                    Hunspell Mongolian dictionary, weighted Levenshtein, error types
    ai.ts                       strict checker (dictionary + Gemma 4), lesson generator
    chimege.ts                  Chimege TTS client
    db/definitions.ts           Mongoose schemas
ui/src/
  pages/                        Home, Dictation, Review, Cards, Shop, AI, Teacher, Settings
  components/Exercise.tsx       PickItem, SpotItem (circle), ReviewRun, AudioPanel
  components/SrsDeck.tsx        spaced-repetition cards: listen → type → grade
  lib/voice.ts                  Chimege playback with browser-voice fallback
  components/Heatmap.tsx        GitHub-style streak grid
  lib/fx.ts, lib/speech.ts      confetti, sounds, speech synthesis
  game.css                      glassmorphism, 3D buttons, animations
```

## Одоогийн хязгаарлалт ба цаашдын төлөвлөгөө (Roadmap)

**Одоогоор:**
- Сурагч нь erxes team member (нэвтэрч ордог). Хариултыг шалгах нь хурдан хариу өгөхийн тулд browser дээр явагдаж, сервер нь хичээлийн өгөгдлөөр алдааг бүртгэнэ.
- Монгол дуу хоолой төхөөрөмж дээр суугаагүй бол дуудлага ойролцоо.
- Жишээ үг, дүрмийг Монгол хэлний багшаар хянуулах хэрэгтэй.

**Цаашид:**
- erxes **Contacts / Client Portal**-оор сурагч, эцэг эхэд зориулсан widget (team member биш)
- erxes **Automations / Notifications**: streak тасрах гэж байхад сануулга, багшид долоо хоногийн тайлан
- Гараар бичих цээж бичиг (сонсоод бүтэн өгүүлбэр бичих) + Gemma-ийн дүгнэлт
- Монгол бичгийн бичлэгийн дасгал (зурж бичих), Gemma-аар Галиг ↔ кирилл хөрвүүлэх
- Ангиудаар бүлэглэх, leaderboard, Kahoot маягийн ангийн тэмцээн

## License

[AGPL-3.0](LICENSE), the same license as the erxes shared libraries this plugin builds on.

See [docs/erxes-integration.md](docs/erxes-integration.md) for plugin internals and [docs/PITCH.md](docs/PITCH.md) for the 3-minute demo script.
