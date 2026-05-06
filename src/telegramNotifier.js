const TELEGRAM_API = 'https://api.telegram.org';
// Telegram 單則訊息上限 4096 字元，留一點 buffer
const MAX_LENGTH = 4000;

function splitMessage(text, maxLength = MAX_LENGTH) {
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let remaining = text;
    while (remaining.length > maxLength) {
        // 盡量切在換行處，避免把句子或 HTML 段落切斷
        let cut = remaining.lastIndexOf('\n', maxLength);
        if (cut <= 0) cut = maxLength;
        chunks.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut).replace(/^\n+/, '');
    }
    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function sendTelegramMessage(token, chatId, text, options = {}) {
    if (!token || !chatId) {
        console.log('[Telegram] 未設定 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，略過推播。');
        return;
    }

    const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
    const chunks = splitMessage(text);

    for (const chunk of chunks) {
        const body = {
            chat_id: chatId,
            text: chunk,
            disable_web_page_preview: true
        };
        if (options.parseMode) body.parse_mode = options.parseMode;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Telegram API 回應錯誤 (${res.status}): ${errBody}`);
        }
    }

    console.log(`[Telegram] 已成功送出 ${chunks.length} 則訊息。`);
}

module.exports = { sendTelegramMessage, escapeHtml };
