const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function createGeminiClient(apiKey, modelName = DEFAULT_MODEL) {
    if (!apiKey) {
        throw new Error('缺少 GEMINI_API_KEY，請於 .env 或環境變數中設定。');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    async function generateContentWithRetry(promptContent, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await model.generateContent(promptContent);
                return result.response.text();
            } catch (error) {
                console.warn(`\n[警告] 第 ${attempt} 次呼叫 API 失敗: ${error.message}`);

                if (attempt === maxRetries) {
                    throw new Error(`已達到最大重試次數 (${maxRetries})，放棄請求。`);
                }

                const waitTime = attempt * 2000;
                console.log(`[系統] 等待 ${waitTime / 1000} 秒後進行第 ${attempt + 1} 次重試...`);
                await delay(waitTime);
            }
        }
    }

    return { generateContentWithRetry };
}

module.exports = { createGeminiClient };
