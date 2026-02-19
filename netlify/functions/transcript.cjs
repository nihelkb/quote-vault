const YTDlpWrap = require('yt-dlp-wrap').default;
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
});

/**
 * Fetch content from URL
 */
function fetchURL(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Parse JSON3 subtitle format to our format
 */
function parseJSON3Subtitles(json3Text) {
    const data = JSON.parse(json3Text);
    const segments = [];

    if (data.events) {
        for (const event of data.events) {
            if (event.segs) {
                const text = event.segs.map(s => s.utf8 || '').join('');
                const cleanText = text.trim();

                if (cleanText && event.tStartMs !== undefined) {
                    segments.push({
                        text: cleanText,
                        offset: event.tStartMs,
                        duration: event.dDurationMs || 0
                    });
                }
            }
        }
    }

    return segments;
}

/**
 * Parse VTT subtitle format to our format
 */
function parseVTTSubtitles(vttText) {
    const segments = [];
    const lines = vttText.split('\n');

    let currentSegment = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Match timestamp line: "00:00:01.601 --> 00:00:06.439"
        const timestampMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

        if (timestampMatch) {
            if (currentSegment && currentSegment.text) {
                segments.push(currentSegment);
            }

            const startMs = (
                parseInt(timestampMatch[1]) * 3600000 +
                parseInt(timestampMatch[2]) * 60000 +
                parseInt(timestampMatch[3]) * 1000 +
                parseInt(timestampMatch[4])
            );

            const endMs = (
                parseInt(timestampMatch[5]) * 3600000 +
                parseInt(timestampMatch[6]) * 60000 +
                parseInt(timestampMatch[7]) * 1000 +
                parseInt(timestampMatch[8])
            );

            currentSegment = {
                text: '',
                offset: startMs,
                duration: endMs - startMs
            };
        } else if (currentSegment && line && !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:')) {
            // This is subtitle text
            currentSegment.text += (currentSegment.text ? '\n' : '') + line;
        }
    }

    // Don't forget the last segment
    if (currentSegment && currentSegment.text) {
        segments.push(currentSegment);
    }

    return segments;
}

// Initialize yt-dlp wrapper (singleton)
let ytDlpWrap = null;
const ytDlpBinaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpBinaryPath = path.join(os.tmpdir(), ytDlpBinaryName);

async function getYTDlpWrap() {
    if (!ytDlpWrap) {
        if (!fs.existsSync(ytDlpBinaryPath)) {
            try {
                await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
                if (process.platform !== 'win32') {
                    await fs.promises.chmod(ytDlpBinaryPath, 0o755).catch(() => {});
                }
                console.log('[Transcript Function] Downloaded yt-dlp binary');
            } catch (error) {
                console.error('[Transcript Function] Failed to download yt-dlp binary:', error.message);
                throw error;
            }
        } else {
            console.log('[Transcript Function] Using cached yt-dlp binary');
        }

        ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    }
    return ytDlpWrap;
}

exports.handler = async (event) => {
    try {
        const params = event.queryStringParameters || {};
        const videoId = params.videoId;
        const lang = params.lang || 'auto';

        console.log('[Transcript Function] Received request:', { videoId, lang });

        if (!videoId) {
            console.log('[Transcript Function] Missing videoId');
            return jsonResponse(400, { message: 'videoId is required' });
        }

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

        // Get yt-dlp wrapper
        const ytDlp = await getYTDlpWrap();

        // Get video info with subtitles
        console.log('[Transcript Function] Fetching video info and subtitles...');
        const videoInfo = await ytDlp.getVideoInfo(videoURL);

        // Try manual subtitles first, then automatic captions
        let subtitlesSource = videoInfo.subtitles;
        let isAutoCaptions = false;

        if (!subtitlesSource || Object.keys(subtitlesSource).length === 0) {
            console.log('[Transcript Function] No manual subtitles, trying automatic captions...');
            subtitlesSource = videoInfo.automatic_captions;
            isAutoCaptions = true;
        }

        if (!subtitlesSource || Object.keys(subtitlesSource).length === 0) {
            console.log('[Transcript Function] No subtitles or captions available');
            return jsonResponse(404, { message: 'No subtitles available for this video' });
        }

        const availableLangs = Object.keys(subtitlesSource);
        console.log(`[Transcript Function] Available ${isAutoCaptions ? 'auto-captions' : 'subtitles'}:`, availableLangs.slice(0, 10).join(', '), availableLangs.length > 10 ? `... (${availableLangs.length} total)` : '');

        let usedLanguage = lang;
        let isOriginal = false;
        let subtitleFormats = null;

        // Find the requested language
        if (lang && lang !== 'auto') {
            if (availableLangs.includes(lang)) {
                subtitleFormats = subtitlesSource[lang];
                usedLanguage = lang;
            } else {
                // Try to find by prefix (e.g., 'es' matches 'es-US')
                const matchedLang = availableLangs.find(l => l.startsWith(lang + '-'));
                if (matchedLang) {
                    subtitleFormats = subtitlesSource[matchedLang];
                    usedLanguage = matchedLang;
                }
            }
        }

        // If no match, use first available or 'en' if available
        if (!subtitleFormats) {
            // Try to use English first, then fall back to first available
            const preferredLang = availableLangs.includes('en') ? 'en' :
                                 availableLangs.includes('en-orig') ? 'en-orig' :
                                 availableLangs[0];
            subtitleFormats = subtitlesSource[preferredLang];
            usedLanguage = preferredLang;
            isOriginal = true;
            console.log('[Transcript Function] Using preferred language:', preferredLang);
        }

        // Find preferred format (json3 or vtt)
        const preferredFormat =
            subtitleFormats.find(s => s.ext === 'json3') ||
            subtitleFormats.find(s => s.ext === 'vtt') ||
            subtitleFormats[0];

        console.log('[Transcript Function] Using format:', preferredFormat.ext);

        // Fetch subtitle content
        console.log('[Transcript Function] Downloading subtitle...');
        const subtitleContent = await fetchURL(preferredFormat.url);

        if (!subtitleContent || subtitleContent.length === 0) {
            console.log('[Transcript Function] Empty subtitle content');
            return jsonResponse(404, { message: 'Subtitle content is empty' });
        }

        // Parse based on format
        let segments;
        if (preferredFormat.ext === 'json3') {
            console.log('[Transcript Function] Parsing JSON3 format...');
            segments = parseJSON3Subtitles(subtitleContent);
        } else if (preferredFormat.ext === 'vtt') {
            console.log('[Transcript Function] Parsing VTT format...');
            segments = parseVTTSubtitles(subtitleContent);
        } else {
            console.log('[Transcript Function] Unsupported format:', preferredFormat.ext);
            return jsonResponse(500, { message: 'Unsupported subtitle format' });
        }

        if (segments.length === 0) {
            console.log('[Transcript Function] No segments parsed');
            return jsonResponse(404, { message: 'Could not parse subtitles' });
        }

        console.log('[Transcript Function] Success! Got', segments.length, 'segments');
        console.log('[Transcript Function] First segment:', segments[0]);

        return jsonResponse(200, {
            content: segments,
            language: usedLanguage,
            isOriginal,
            videoInfo: {
                title: videoInfo.title || null,
                duration: videoInfo.duration || null, // in seconds
                thumbnail: videoInfo.thumbnail || null,
                uploader: videoInfo.uploader || videoInfo.channel || videoInfo.uploader_id || null,
                description: videoInfo.description || null
            }
        });
    } catch (error) {
        console.error('[Transcript Function] Error:', error.message);
        console.error('[Transcript Function] Stack:', error.stack);
        return jsonResponse(500, {
            message: error.message || 'Failed to fetch subtitles'
        });
    }
};
