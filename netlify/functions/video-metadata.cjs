const https = require('https');
const Groq = require('groq-sdk');

function fetchURL(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (redirects >= 5) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                resolve(fetchURL(res.headers.location, redirects + 1));
                return;
            }

            if (res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`Request failed with status ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });

        request.on('error', reject);
    });
}

function extractJsonObject(source, startIndex) {
    let index = startIndex;
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    while (index < source.length) {
        const char = source[index];

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === '"') {
                inString = false;
            }
            index += 1;
            continue;
        }

        if (char === '"') {
            inString = true;
            index += 1;
            continue;
        }

        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return source.slice(startIndex, index + 1);
            }
        }

        index += 1;
    }

    return null;
}

function extractPlayerResponse(html) {
    const markers = [
        'var ytInitialPlayerResponse = ',
        'ytInitialPlayerResponse = ',
        'window["ytInitialPlayerResponse"] = '
    ];

    for (const marker of markers) {
        const markerIndex = html.indexOf(marker);
        if (markerIndex === -1) continue;

        const jsonStart = html.indexOf('{', markerIndex + marker.length);
        if (jsonStart === -1) continue;

        const jsonText = extractJsonObject(html, jsonStart);
        if (!jsonText) continue;

        try {
            return JSON.parse(jsonText);
        } catch {
            continue;
        }
    }

    throw new Error('Could not parse ytInitialPlayerResponse');
}

const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
});

// Initialize Groq client (will be null if no API key)
let groqClient = null;
if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });
}

/**
 * Extract meaningful description using Groq AI
 * Falls back to regex-based extraction if AI is unavailable
 */
async function extractDescriptionSummary(description) {
    if (!description) return null;

    // Try AI extraction first if Groq is available
    if (groqClient) {
        try {
            console.log('[Video Metadata] Using Groq AI to extract description...');

            const completion = await groqClient.chat.completions.create({
                model: 'llama-3.1-8b-instant', // Fast and free model
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at summarizing YouTube video descriptions. Your task is to read the ENTIRE description and create a concise 2-3 sentence summary that captures the main topic and key points of the video. Ignore promotional content, links, timestamps, and credits. Focus on WHAT the video is about and WHY it matters.'
                    },
                    {
                        role: 'user',
                        content: `Read this YouTube video description and write a clear, informative 2-3 sentence summary. The summary should capture the video's main topic and key points. Do NOT just copy the beginning - read the whole description first, then summarize.\n\nDescription:\n${description}\n\nWrite a 2-3 sentence summary of what this video is about:`
                    }
                ],
                temperature: 0.3, // Slightly higher for better summarization
                max_tokens: 200,
                top_p: 1
            });

            const extracted = completion.choices[0]?.message?.content?.trim();

            if (!extracted) {
                console.log('[Video Metadata] Groq returned null/empty, falling back to regex');
                return extractDescriptionFallback(description);
            }

            // Count words instead of characters for better control
            const wordCount = extracted.split(/\s+/).filter(w => w.length > 0).length;
            const charCount = extracted.length;

            console.log('[Video Metadata] Groq returned:', wordCount, 'words,', charCount, 'chars');
            console.log('[Video Metadata] Content preview:', extracted.substring(0, 150) + '...');

            // Validate: between 20 and 150 words (roughly 2-4 sentences)
            if (wordCount >= 20 && wordCount <= 150) {
                console.log('[Video Metadata] AI extraction successful!');
                return extracted;
            }

            // If too long, try to truncate at last sentence before 150 words
            if (wordCount > 150) {
                const words = extracted.split(/\s+/);
                const truncated = words.slice(0, 150).join(' ');
                const lastPeriod = truncated.lastIndexOf('.');

                if (lastPeriod > 0) {
                    const result = truncated.substring(0, lastPeriod + 1);
                    console.log('[Video Metadata] Truncated from', wordCount, 'to', result.split(/\s+/).length, 'words');
                    return result;
                }
            }

            console.log('[Video Metadata] AI extraction failed validation (', wordCount, 'words), falling back to regex');
        } catch (error) {
            console.error('[Video Metadata] Groq API error:', error.message);
            // Continue to fallback
        }
    }

    // Fallback: Simple regex-based extraction
    console.log('[Video Metadata] Using fallback regex extraction...');
    return extractDescriptionFallback(description);
}

/**
 * Fallback extraction using simple regex patterns
 */
function extractDescriptionFallback(description) {
    // Remove URLs first
    let cleaned = description
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Split into lines and find first substantial paragraph
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Take first few non-promotional lines
    const contentLines = [];
    for (const line of lines) {
        // Stop at timestamps
        if (/^\d{1,2}:\d{2}/.test(line)) break;

        // Skip obvious promotional lines
        if (/^(support|follow|subscribe|join|watch|get)/i.test(line)) {
            if (contentLines.length > 0) break; // Stop if we already have content
            continue;
        }

        if (line.length >= 20) {
            contentLines.push(line);
            const joined = contentLines.join(' ');
            if (joined.length > 200) break;
        }
    }

    const result = contentLines.join(' ').substring(0, 350);
    return result || null;
}

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, {});
    }

    try {
        const params = event.queryStringParameters || {};
        const videoId = params.videoId;

        console.log('[Video Metadata Function] Received request:', { videoId });

        if (!videoId) {
            console.log('[Video Metadata Function] Missing videoId');
            return jsonResponse(400, { message: 'videoId is required' });
        }

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('[Video Metadata Function] Fetching watch page...');
        const watchHtml = await fetchURL(videoURL);
        const playerResponse = extractPlayerResponse(watchHtml);
        const videoInfo = playerResponse?.videoDetails;

        if (!videoInfo) {
            return jsonResponse(404, { message: 'Video details not found' });
        }

        console.log('[Video Metadata Function] Success! Got metadata for:', videoInfo.title);

        // Extract description summary using AI
        const descriptionSummary = await extractDescriptionSummary(videoInfo.shortDescription);

        return jsonResponse(200, {
            title: videoInfo.title || null,
            duration: Number.parseInt(videoInfo.lengthSeconds, 10) || null,
            thumbnail: videoInfo.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
            channel: videoInfo.author || null,
            description: descriptionSummary,
            fullDescription: videoInfo.shortDescription || null
        });
    } catch (error) {
        console.error('[Video Metadata Function] Error:', error.message);
        console.error('[Video Metadata Function] Stack:', error.stack);
        return jsonResponse(500, {
            message: error.message || 'Failed to fetch video metadata'
        });
    }
};
