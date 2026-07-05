// วิเคราะห์รูปความเสียหายจากน้ำท่วมด้วย Google Gemini (Vision) ตามเกณฑ์ 4 ระดับของ ปภ.
// - GET  → เช็คสถานะ: ตั้งค่า GEMINI_API_KEY ไว้หรือยัง (ไม่เรียก Gemini ไม่มีค่าใช้จ่าย)
// - POST → รับ { images:[url...], water, days, damage } แล้วคืน { grade, priority, confidence, reasons, visual }
//
// ต้องตั้ง env: GEMINI_API_KEY (ขอฟรีที่ https://aistudio.google.com/app/apikey)

const MODEL = 'gemini-2.5-flash';

const CRITERIA = `เกณฑ์จัดระดับความเสียหายจากอุทกภัย (ระเบียบ ปภ.):
- ระดับ 1 เล็กน้อย (Minor): คราบน้ำต่ำกว่าระดับเข่า โคลนผิวเผินที่ล้างทำความสะอาดออกได้ โครงสร้างหลักไม่เสียหาย (เสียหาย < 30%)
- ระดับ 2 ปานกลาง (Moderate): น้ำสูงระดับเข่าถึงเอว (~50ซม.-1ม.) เฟอร์นิเจอร์/เครื่องใช้ไฟฟ้าจมโคลนหรือเสียหาย พื้นกระเบื้องหรือผนังปูนชั้นล่างเริ่มร่อน สีลอก
- ระดับ 3 หนัก (Severe): คราบน้ำสูงเกิน 1.5 เมตร หรือท่วมถึงชั้น 2 โครงสร้างมีรอยร้าวลึก ประตูหน้าต่างบิดเบี้ยว ฝ้าเพดานบวมและทะลุ
- ระดับ 4 สิ้นเชิง (Total Loss): โครงสร้างหลักพังทลาย ผนัง/เสาหลักพัง เสียหายเกิน 50% บ้านเอียงจากฐานราก หรือถูกน้ำพัดเสียหายทั้งหลัง`;

// ดึงรูปจาก URL สาธารณะ (Supabase Storage) แปลงเป็น base64 สำหรับส่งเข้า Gemini
async function fetchImageInline(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) return null; // จำกัด ~4MB/รูป กันช้า/เกินลิมิต
    return { mime_type: type, data: buf.toString('base64') };
  } catch { return null; }
}

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;

  // เช็คสถานะแบบเบา ๆ (ไม่เรียก Gemini)
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, hasKey: Boolean(key), model: MODEL });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, reason: 'method_not_allowed' }); return; }
  if (!key) { res.status(200).json({ ok: false, source: 'fallback', reason: 'no_key' }); return; }

  try {
    const { images = [], water = '-', days = '-', damage = [] } = req.body || {};
    const urls = (images || []).filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 4);
    if (!urls.length) { res.status(200).json({ ok: false, source: 'fallback', reason: 'no_images' }); return; }

    const inlineImages = [];
    for (const u of urls) {
      const img = await fetchImageInline(u);
      if (img) inlineImages.push(img);
    }
    if (!inlineImages.length) { res.status(200).json({ ok: false, source: 'fallback', reason: 'images_unreadable' }); return; }

    const damageText = Array.isArray(damage) ? damage.join(', ') : String(damage || '-');
    const prompt = `คุณเป็นผู้ช่วยประเมินความเสียหายจากอุทกภัยให้เทศบาลนครยะลา
${CRITERIA}

ข้อมูลประกอบจากผู้แจ้ง: ระดับน้ำที่เลือก="${water}", จำนวนวันน้ำท่วมขัง=${days}, รายการความเสียหายที่แจ้ง="${damageText}"

โปรดวิเคราะห์ "รูปถ่ายจริง" ที่แนบมา (${inlineImages.length} รูป) ประกอบกับข้อมูลข้างต้น แล้วจัดระดับความเสียหาย
ตอบกลับเป็น JSON เท่านั้น ตามรูปแบบนี้:
{"grade":"1|2|3|4","priority":1,"confidence":85,"reasons":["เหตุผลที่อ้างอิงสิ่งที่เห็นในภาพจริง"],"visual":["สิ่งที่สังเกตเห็นในภาพ เช่น ระดับคราบน้ำบนผนัง รอยร้าว คราบโคลน เครื่องใช้ที่เสียหาย"]}
โดย priority: ระดับ4=1(ด่วนสุด), ระดับ3=2, ระดับ2=3, ระดับ1=4
ถ้าภาพไม่ชัดหรือประเมินจากภาพไม่ได้ ให้ยึดข้อมูลระดับน้ำเป็นหลัก และลดค่า confidence ลง`;

    const parts = [{ text: prompt }, ...inlineImages.map((img) => ({ inline_data: img }))];
    const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
    });

    if (!gRes.ok) {
      const detail = await gRes.text();
      console.error('gemini error:', gRes.status, detail);
      res.status(200).json({ ok: false, source: 'fallback', reason: gRes.status === 429 ? 'quota' : 'gemini_error', status: gRes.status });
      return;
    }

    const data = await gRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed = null;
    try { parsed = JSON.parse(text); }
    catch { const m = text.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } } }
    if (!parsed || !parsed.grade) { res.status(200).json({ ok: false, source: 'fallback', reason: 'parse_error' }); return; }

    const grade = (String(parsed.grade).match(/[1-4]/) || ['2'])[0];
    res.status(200).json({
      ok: true, source: 'gemini', model: MODEL,
      grade,
      priority: Number(parsed.priority) || (5 - Number(grade)),
      confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 6).map(String) : [],
      visual: Array.isArray(parsed.visual) ? parsed.visual.slice(0, 6).map(String) : [],
      imageCount: inlineImages.length,
    });
  } catch (err) {
    console.error('analyze-damage error:', err);
    res.status(200).json({ ok: false, source: 'fallback', reason: 'server_error' });
  }
}
