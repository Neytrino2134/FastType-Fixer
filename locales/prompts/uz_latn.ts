
import { PromptDictionary } from '../../types';

export const PROMPTS_UZ_LATN: PromptDictionary = {
    fixTypos: `
Faqat imlo xatolarini tuzat.
QAT'IY QOIDALAR:
1. Tinish belgilarini O'ZGARTIRMA. Oxiriga nuqta qo'yma.
2. Harf kattaligini O'ZGARTIRMA.
3. FAQAT tuzatilgan matnni qaytar.
4. Agar matn to'g'ri bo'lsa, o'zgarishsiz qaytar.
`,
    finalize: `
Sen muharrirsan. Grammatika, imlo va tinish belgilarini tuzat.
QAT'IY QOIDALAR:
1. ASL TUZILISHNI SAQLA. Buyruq yoki qisqa iboralarni hikoyaga aylantirma.
2. Ma'noni o'zgartirma va ortiqcha so'z qo'shma.
3. So'kish va behayo so'zlarni olib tashla yoki yumshoqroq sinonim bilan almashtir.
4. Hech qachon yulduzcha (***) ishlatma.
5. Tasodifiy takrorlanishlarni olib tashla.
6. FAQAT tuzatilgan matnni qaytar.
`,
    combined: `
Xatolar va tinish belgilarini tuzat.
SENZURA: Behayo so'zlarni olib tashla.
MUHIM: Asl uslubni saqlab qol. Qayta yozma, faqat xatolarni tuzat.
FAQAT NATIJANI QAYTAR.
`,
    system: `Sen muharrirsan.`,
    enhance: `
Matnni ravonroq va chiroyli qil.
QOIDALAR:
1. Faqat BITTA eng yaxshi variantni qaytar.
2. Texnik ma'noni buzma.
3. Behayo so'zlarni olib tashla.
FAQAT MATNNI QAYTAR.
`,
    transcribe: `
Vazifa: Audiodan INSON NUTQINI yozib olish (transkripsiya).
TAQIQLANADI:
1. Vaqt belgilarini yozma (00:00).
2. Tovushlarni tasvirlama ([musiqa], [kulgi]).
3. Izoh yozma ("so'z yo'q", "tugadi").
4. Tutilishlarni e'tiborga olma.
5. Agar nutq bo'lmasa, bo'sh qator qaytar.
FAQAT AYTILGAN SO'ZLARNI QAYTAR.
`,
    ocr: `
Vazifa: Rasmdagi matnni ajratib ol (OCR).
QOIDALAR:
1. Faqat rasmdagi ko'ringan matnni qaytar.
2. Izoh qo'shma ("Rasmda yozilgan...").
3. Qatorlarni saqlab qol.
4. Matn bo'lmasa, bo'sh qator qaytar.
`
};
