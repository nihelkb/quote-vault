require('dotenv').config();
const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Groq = require('groq-sdk');

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

// ─── yt-dlp binary management ─────────────────────────────────────────────────

let ytDlpWrap = null;
const ytDlpBinaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpBinaryPath = path.join(os.tmpdir(), ytDlpBinaryName);

function getYtDlpDownloadUrl() {
    if (process.platform === 'win32') {
        return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    }
    if (process.platform === 'linux') {
        return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
    }
    if (process.platform === 'darwin') {
        return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    }
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
}

function downloadBinary(url, destinationPath, redirects = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: { 'User-Agent': 'quote-vault-backend' }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (redirects >= 5) {
                    reject(new Error('Too many redirects while downloading yt-dlp'));
                    return;
                }
                resolve(downloadBinary(response.headers.location, destinationPath, redirects + 1));
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(`Failed to download yt-dlp (status ${response.statusCode})`));
                return;
            }

            const fileStream = fs.createWriteStream(destinationPath);
            response.pipe(fileStream);
            fileStream.on('finish', () => fileStream.close(() => resolve()));
            fileStream.on('error', (error) => {
                fs.unlink(destinationPath, () => reject(error));
            });
        });

        request.on('error', reject);
    });
}

async function isValidCachedBinary(binaryPath) {
    if (!fs.existsSync(binaryPath)) return false;
    if (process.platform === 'win32') return true;

    try {
        const descriptor = await fs.promises.open(binaryPath, 'r');
        const buffer = Buffer.alloc(4);
        await descriptor.read(buffer, 0, 4, 0);
        await descriptor.close();
        const isElf = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46;
        return isElf;
    } catch {
        return false;
    }
}

async function getYTDlpWrap() {
    if (ytDlpWrap) return ytDlpWrap;

    const hasValidBinary = await isValidCachedBinary(ytDlpBinaryPath);
    if (!hasValidBinary) {
        const downloadUrl = getYtDlpDownloadUrl();
        console.log('[yt-dlp] Downloading binary from:', downloadUrl);
        await downloadBinary(downloadUrl, ytDlpBinaryPath);
    }

    if (process.platform !== 'win32') {
        await fs.promises.chmod(ytDlpBinaryPath, 0o755).catch(() => {});
    }

    ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    return ytDlpWrap;
}

// ─── Transcript helpers ───────────────────────────────────────────────────────

function pickSubtitleTrackFromYtDlp(subtitlesSource, requestedLang) {
    const availableLangs = Object.keys(subtitlesSource || {});
    if (!availableLangs.length) return null;

    let usedLanguage = requestedLang;
    let isOriginal = false;
    let subtitleFormats = null;

    if (requestedLang && requestedLang !== 'auto') {
        if (availableLangs.includes(requestedLang)) {
            subtitleFormats = subtitlesSource[requestedLang];
            usedLanguage = requestedLang;
        } else {
            const matchedLang = availableLangs.find((l) => l.startsWith(`${requestedLang}-`));
            if (matchedLang) {
                subtitleFormats = subtitlesSource[matchedLang];
                usedLanguage = matchedLang;
            }
        }
    }

    if (!subtitleFormats) {
        const preferredLang = availableLangs.includes('en')
            ? 'en'
            : (availableLangs.includes('en-orig') ? 'en-orig' : availableLangs[0]);
        subtitleFormats = subtitlesSource[preferredLang];
        usedLanguage = preferredLang;
        isOriginal = true;
    }

    const preferredFormat =
        subtitleFormats.find((f) => f.ext === 'json3') ||
        subtitleFormats.find((f) => f.ext === 'vtt') ||
        subtitleFormats[0];

    return { preferredFormat, usedLanguage, isOriginal };
}

async function fetchTranscriptWithYtDlp(videoId, lang) {
    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
    const ytDlp = await getYTDlpWrap();
    const videoInfo = await ytDlp.getVideoInfo(videoURL);

    let subtitlesSource = videoInfo.subtitles;
    if (!subtitlesSource || Object.keys(subtitlesSource).length === 0) {
        subtitlesSource = videoInfo.automatic_captions;
    }

    const track = pickSubtitleTrackFromYtDlp(subtitlesSource, lang);
    if (!track) return null;

    const subtitleContent = await fetchURL(track.preferredFormat.url);
    if (!subtitleContent || subtitleContent.length === 0) return null;

    let segments;
    if (track.preferredFormat.ext === 'json3') {
        segments = parseJSON3Subtitles(subtitleContent);
    } else if (track.preferredFormat.ext === 'vtt') {
        segments = parseVTTSubtitles(subtitleContent);
    } else {
        return null;
    }

    if (!segments.length) return null;

    return {
        content: segments,
        language: track.usedLanguage,
        isOriginal: track.isOriginal,
        videoInfo: {
            title: videoInfo.title || null,
            duration: videoInfo.duration || null,
            thumbnail: videoInfo.thumbnail || null,
            uploader: videoInfo.uploader || videoInfo.channel || videoInfo.uploader_id || null,
            description: videoInfo.description || null
        }
    };
}

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

function parseVTTSubtitles(vttText) {
    const segments = [];
    const lines = vttText.split('\n');
    let currentSegment = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const timestampMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

        if (timestampMatch) {
            if (currentSegment && currentSegment.text) segments.push(currentSegment);

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

            currentSegment = { text: '', offset: startMs, duration: endMs - startMs };
        } else if (currentSegment && line && !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:')) {
            currentSegment.text += (currentSegment.text ? '\n' : '') + line;
        }
    }

    if (currentSegment && currentSegment.text) segments.push(currentSegment);

    return segments;
}

// ─── Video-metadata helpers ───────────────────────────────────────────────────

let groqClient = null;
if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function extractDescriptionSummary(description) {
    if (!description) return null;

    if (groqClient) {
        try {
            console.log('[Video Metadata] Using Groq AI to extract description...');

            const completion = await groqClient.chat.completions.create({
                model: 'llama-3.1-8b-instant',
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
                temperature: 0.3,
                max_tokens: 200,
                top_p: 1
            });

            const extracted = completion.choices[0]?.message?.content?.trim();

            if (!extracted) {
                console.log('[Video Metadata] Groq returned empty, falling back to regex');
                return extractDescriptionFallback(description);
            }

            const wordCount = extracted.split(/\s+/).filter(w => w.length > 0).length;
            console.log('[Video Metadata] Groq returned:', wordCount, 'words');

            if (wordCount >= 20 && wordCount <= 150) {
                console.log('[Video Metadata] AI extraction successful!');
                return extracted;
            }

            if (wordCount > 150) {
                const words = extracted.split(/\s+/);
                const truncated = words.slice(0, 150).join(' ');
                const lastPeriod = truncated.lastIndexOf('.');
                if (lastPeriod > 0) return truncated.substring(0, lastPeriod + 1);
            }

            console.log('[Video Metadata] AI extraction failed validation, falling back to regex');
        } catch (error) {
            console.error('[Video Metadata] Groq API error:', error.message);
        }
    }

    console.log('[Video Metadata] Using fallback regex extraction...');
    return extractDescriptionFallback(description);
}

function extractDescriptionFallback(description) {
    let cleaned = description
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const contentLines = [];

    for (const line of lines) {
        if (/^\d{1,2}:\d{2}/.test(line)) break;

        if (/^(support|follow|subscribe|join|watch|get)/i.test(line)) {
            if (contentLines.length > 0) break;
            continue;
        }

        if (line.length >= 20) {
            contentLines.push(line);
            if (contentLines.join(' ').length > 200) break;
        }
    }

    return contentLines.join(' ').substring(0, 350) || null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/transcript', async (req, res) => {
    try {
        const videoId = req.query.videoId;
        const lang = req.query.lang || 'auto';

        console.log('[Transcript] Received request:', { videoId, lang });

        if (!videoId) {
            return res.status(400).json({ message: 'videoId is required' });
        }

        try {
            const ytDlpResult = await fetchTranscriptWithYtDlp(videoId, lang);
            if (ytDlpResult) {
                console.log('[Transcript] Success via yt-dlp');
                return res.json(ytDlpResult);
            }
        } catch (ytDlpError) {
            console.warn('[Transcript] yt-dlp strategy failed, using fallback:', ytDlpError.message);
        }

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
        const watchHtml = await fetchURL(videoURL);
        const playerResponse = extractPlayerResponse(watchHtml);

        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (!captionTracks.length) {
            return res.status(404).json({ message: 'No subtitles available for this video' });
        }

        let usedLanguage = lang;
        let isOriginal = false;
        let selectedTrack = null;

        if (lang && lang !== 'auto') {
            selectedTrack = captionTracks.find(t => t.languageCode === lang)
                || captionTracks.find(t => t.languageCode?.startsWith(`${lang}-`))
                || captionTracks.find(t => t.vssId?.includes(`.${lang}`));
        }

        if (!selectedTrack) {
            selectedTrack = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
            usedLanguage = selectedTrack.languageCode || 'auto';
            isOriginal = true;
        } else {
            usedLanguage = selectedTrack.languageCode || usedLanguage;
        }

        const json3Url = `${selectedTrack.baseUrl}${selectedTrack.baseUrl.includes('?') ? '&' : '?'}fmt=json3`;
        const vttUrl = `${selectedTrack.baseUrl}${selectedTrack.baseUrl.includes('?') ? '&' : '?'}fmt=vtt`;

        console.log('[Transcript] Downloading subtitle...');
        let subtitleContent = await fetchURL(json3Url).catch(() => null);
        let subtitleFormat = 'json3';

        if (!subtitleContent) {
            subtitleContent = await fetchURL(vttUrl);
            subtitleFormat = 'vtt';
        }

        if (!subtitleContent || subtitleContent.length === 0) {
            return res.status(404).json({ message: 'Subtitle content is empty' });
        }

        let segments;
        if (subtitleFormat === 'json3') {
            segments = parseJSON3Subtitles(subtitleContent);
        } else if (subtitleFormat === 'vtt') {
            segments = parseVTTSubtitles(subtitleContent);
        } else {
            return res.status(500).json({ message: 'Unsupported subtitle format' });
        }

        if (segments.length === 0) {
            return res.status(404).json({ message: 'Could not parse subtitles' });
        }

        console.log('[Transcript] Success! Got', segments.length, 'segments');

        return res.json({
            content: segments,
            language: usedLanguage,
            isOriginal,
            videoInfo: {
                title: playerResponse?.videoDetails?.title || null,
                duration: Number.parseInt(playerResponse?.videoDetails?.lengthSeconds, 10) || null,
                thumbnail: playerResponse?.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
                uploader: playerResponse?.videoDetails?.author || null,
                description: playerResponse?.videoDetails?.shortDescription || null
            }
        });
    } catch (error) {
        console.error('[Transcript] Error:', error.message);
        return res.status(500).json({ message: error.message || 'Failed to fetch subtitles' });
    }
});

app.get('/api/video-metadata', async (req, res) => {
    try {
        const videoId = req.query.videoId;

        console.log('[Video Metadata] Received request:', { videoId });

        if (!videoId) {
            return res.status(400).json({ message: 'videoId is required' });
        }

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('[Video Metadata] Fetching watch page...');
        const watchHtml = await fetchURL(videoURL);
        const playerResponse = extractPlayerResponse(watchHtml);
        const videoInfo = playerResponse?.videoDetails;

        if (!videoInfo) {
            return res.status(404).json({ message: 'Video details not found' });
        }

        console.log('[Video Metadata] Success! Got metadata for:', videoInfo.title);

        const descriptionSummary = await extractDescriptionSummary(videoInfo.shortDescription);

        return res.json({
            title: videoInfo.title || null,
            duration: Number.parseInt(videoInfo.lengthSeconds, 10) || null,
            thumbnail: videoInfo.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
            channel: videoInfo.author || null,
            description: descriptionSummary,
            fullDescription: videoInfo.shortDescription || null
        });
    } catch (error) {
        console.error('[Video Metadata] Error:', error.message);
        return res.status(500).json({ message: error.message || 'Failed to fetch video metadata' });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Server] Quote Vault backend running on port ${PORT}`);
});
