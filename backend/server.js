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

// ─── InnerTube API (más fiable que scraping HTML desde IPs de datacenter) ─────

/**
 * IMPORTANTE: YouTube rechaza versiones de cliente obsoletas — devuelve HTTP 400
 * o playabilityStatus=LOGIN_REQUIRED. Cuando la transcripción deje de funcionar,
 * lo primero que hay que revisar son estas versiones. La referencia viva está en
 * INNERTUBE_CLIENTS de yt-dlp:
 * https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/youtube/_base.py
 *
 * Se pueden sobrescribir sin tocar código con las env vars YT_<CLIENTE>_VERSION.
 */
const IOS_VERSION = process.env.YT_IOS_VERSION || '21.26.4';
const ANDROID_VERSION = process.env.YT_ANDROID_VERSION || '21.26.364';
const ANDROID_VR_VERSION = process.env.YT_ANDROID_VR_VERSION || '1.65.10';

// Se prueban en orden hasta que uno devuelva un player response utilizable.
const INNERTUBE_CLIENTS = [
    {
        name: 'IOS',
        context: {
            clientName: 'IOS',
            clientVersion: IOS_VERSION,
            deviceMake: 'Apple',
            deviceModel: 'iPhone16,2',
            osName: 'iPhone',
            osVersion: '18.5.22F76',
            hl: 'en',
            gl: 'US',
            utcOffsetMinutes: 0
        },
        headers: {
            'User-Agent': `com.google.ios.youtube/${IOS_VERSION} (iPhone16,2; U; CPU iOS 18_5 like Mac OS X; en_US)`,
            'X-YouTube-Client-Name': '5',
            'X-YouTube-Client-Version': IOS_VERSION
        }
    },
    {
        name: 'ANDROID',
        context: {
            clientName: 'ANDROID',
            clientVersion: ANDROID_VERSION,
            androidSdkVersion: 34,
            osName: 'Android',
            osVersion: '14',
            hl: 'en',
            gl: 'US',
            utcOffsetMinutes: 0
        },
        headers: {
            'User-Agent': `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14; en_US) gzip`,
            'X-YouTube-Client-Name': '3',
            'X-YouTube-Client-Version': ANDROID_VERSION
        }
    },
    {
        name: 'ANDROID_VR',
        context: {
            clientName: 'ANDROID_VR',
            clientVersion: ANDROID_VR_VERSION,
            deviceMake: 'Oculus',
            deviceModel: 'Quest 3',
            osName: 'Android',
            osVersion: '12',
            androidSdkVersion: 32,
            hl: 'en',
            gl: 'US',
            utcOffsetMinutes: 0
        },
        headers: {
            'User-Agent': `com.google.android.apps.youtube.vr.oculus/${ANDROID_VR_VERSION} (Linux; U; Android 12; en_US; Quest 3) gzip`,
            'X-YouTube-Client-Name': '28',
            'X-YouTube-Client-Version': ANDROID_VR_VERSION
        }
    }
];

function requestPlayerResponse(videoId, client) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            videoId,
            context: { client: client.context },
            contentCheckOk: true,
            racyCheckOk: true
        });

        const req = https.request({
            hostname: 'www.youtube.com',
            path: '/youtubei/v1/player',
            method: 'POST',
            headers: {
                ...client.headers,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`InnerTube ${client.name} returned HTTP ${res.statusCode}`));
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error(`Failed to parse InnerTube ${client.name} response`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

/**
 * Recorre los clientes hasta obtener un player response reproducible.
 * @param {string} videoId
 * @param {boolean} requireCaptions - si true, sigue probando mientras no haya captionTracks
 */
async function fetchPlayerResponseFromInnerTube(videoId, requireCaptions = false) {
    let lastUsable = null;
    const failures = [];

    for (const client of INNERTUBE_CLIENTS) {
        let playerResponse;
        try {
            playerResponse = await requestPlayerResponse(videoId, client);
        } catch (error) {
            failures.push(`${client.name}: ${error.message}`);
            continue;
        }

        const status = playerResponse?.playabilityStatus?.status;
        if (status && status !== 'OK') {
            const reason = playerResponse.playabilityStatus.reason || '';
            failures.push(`${client.name}: ${status}${reason ? ` (${reason})` : ''}`);
            continue;
        }

        const hasCaptions = Boolean(
            playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length
        );
        console.log(`[InnerTube] ${client.name} OK | captions: ${hasCaptions ? 'sí' : 'no'}`);

        if (!requireCaptions || hasCaptions) return playerResponse;

        // Sirve para metadatos aunque no traiga subtítulos; seguimos buscando uno que sí.
        lastUsable = lastUsable || playerResponse;
        failures.push(`${client.name}: sin captionTracks`);
    }

    if (lastUsable) return lastUsable;
    throw new Error(`Todos los clientes InnerTube fallaron — ${failures.join(' | ')}`);
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
    // Sin forzar player_client: yt-dlp mantiene su propia lista de clientes válidos
    // y fijarla aquí es justo lo que dejó de funcionar antes (ios,web están rotos).
    const videoInfo = await ytDlp.getVideoInfo([videoURL]);

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
            if (currentSegment && currentSegment.lines.length) segments.push(currentSegment);

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

            currentSegment = { lines: [], offset: startMs, duration: endMs - startMs };
        } else if (currentSegment && line && !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:')) {
            // Los subtítulos auto-generados traen marcas de karaoke palabra a palabra
            // — <00:00:00.533><c>que </c> — que hay que quitar o acaban en pantalla.
            const clean = line
                .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
                .replace(/<\/?c[^>]*>/g, '')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (clean) currentSegment.lines.push(clean);
        }
    }

    if (currentSegment && currentSegment.lines.length) segments.push(currentSegment);

    // El VTT auto-generado usa subtítulos "rodantes": cada cue reimprime la última
    // línea del anterior más una nueva. Quedarnos sólo con las líneas que no venían
    // ya en el cue previo evita que salga todo el texto duplicado.
    const result = [];
    let previousLines = [];

    for (const segment of segments) {
        const fresh = segment.lines.filter(l => !previousLines.includes(l));
        previousLines = segment.lines;
        if (!fresh.length) continue;

        result.push({
            text: fresh.join('\n'),
            offset: segment.offset,
            duration: segment.duration
        });
    }

    return result;
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

// ─── Selección y descarga de pistas de subtítulos ─────────────────────────────

/**
 * Elige la mejor pista para el idioma pedido.
 * Prefiere subtítulos manuales sobre auto-generados (kind === 'asr').
 * Si no existe el idioma pedido pero YouTube ofrece traducción automática,
 * devuelve translateTo para pedirla con el parámetro tlang.
 */
function selectCaptionTrack(captionsRenderer, requestedLang) {
    const tracks = captionsRenderer?.captionTracks || [];
    if (!tracks.length) return null;

    const preferManual = (candidates) =>
        candidates.find(t => t.kind !== 'asr') || candidates[0];

    if (requestedLang && requestedLang !== 'auto') {
        const exact = tracks.filter(t => t.languageCode === requestedLang);
        if (exact.length) {
            return { track: preferManual(exact), language: requestedLang, isOriginal: false };
        }

        // es → es-419, pt → pt-BR, etc.
        const regional = tracks.filter(t => t.languageCode?.startsWith(`${requestedLang}-`));
        if (regional.length) {
            const track = preferManual(regional);
            return { track, language: track.languageCode, isOriginal: false };
        }

        // Sin pista nativa: pedir traducción automática si está disponible.
        const canTranslate = (captionsRenderer.translationLanguages || [])
            .some(l => l.languageCode === requestedLang);
        if (canTranslate) {
            const base = tracks.find(t => t.kind !== 'asr') || tracks[0];
            return { track: base, language: requestedLang, isOriginal: false, translateTo: requestedLang };
        }
    }

    // auto: idioma original del vídeo.
    // Las pistas vienen ordenadas alfabéticamente, así que tracks[0] suele ser
    // árabe y no el original. La pista buena la marca YouTube en audioTracks.
    const audioTracks = captionsRenderer.audioTracks || [];
    const defaultAudio = audioTracks[captionsRenderer.defaultAudioTrackIndex || 0];
    const original =
        tracks[defaultAudio?.defaultCaptionTrackIndex]        // preferencia de YouTube
        || tracks.find(t => t.kind === 'asr')                  // ASR = idioma hablado
        || tracks[0];

    const originalLang = original.languageCode;
    // Si el original es auto-generado pero hay subtítulos manuales del mismo
    // idioma, esos tienen mejor puntuación y puntuación de frases.
    const manual = tracks.find(t => t.languageCode === originalLang && t.kind !== 'asr');

    return {
        track: manual || original,
        language: originalLang || 'auto',
        isOriginal: true
    };
}

/**
 * Descarga una pista. Intenta json3 y cae a vtt.
 * Devuelve null si YouTube responde vacío (típico cuando baseUrl lleva exp=xpe,
 * que exige un PoToken generado por el player JS y no podemos producir aquí).
 */
async function downloadCaptionTrack(track, translateTo) {
    for (const format of ['json3', 'vtt']) {
        let url;
        try {
            url = new URL(track.baseUrl);
        } catch {
            return null;
        }
        url.searchParams.set('fmt', format);
        if (translateTo) url.searchParams.set('tlang', translateTo);

        const body = await fetchURL(url.toString()).catch(() => null);
        if (!body || body.length === 0) continue;

        try {
            const segments = format === 'json3'
                ? parseJSON3Subtitles(body)
                : parseVTTSubtitles(body);
            if (segments.length) return segments;
        } catch {
            // formato inesperado — probamos el siguiente
        }
    }

    return null;
}

function buildVideoInfo(playerResponse) {
    const details = playerResponse?.videoDetails;
    if (!details) return null;

    return {
        title: details.title || null,
        duration: Number.parseInt(details.lengthSeconds, 10) || null,
        thumbnail: details.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
        uploader: details.author || null,
        description: details.shortDescription || null
    };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'quote-vault-backend' });
});

app.get('/api/transcript', async (req, res) => {
    try {
        const videoId = req.query.videoId;
        const lang = req.query.lang || 'auto';

        console.log('[Transcript] Received request:', { videoId, lang });

        if (!videoId) {
            return res.status(400).json({ message: 'videoId is required' });
        }

        // Estrategia 1: InnerTube. Es la vía rápida y, a diferencia de yt-dlp,
        // no la bloquean desde IPs de datacenter (Render/Koyeb).
        let playerResponse = null;
        try {
            playerResponse = await fetchPlayerResponseFromInnerTube(videoId, true);
            const captionsRenderer = playerResponse?.captions?.playerCaptionsTracklistRenderer;
            const selection = selectCaptionTrack(captionsRenderer, lang);

            if (selection) {
                console.log(
                    '[Transcript] Pista elegida:', selection.language,
                    selection.translateTo ? '(traducida vía tlang)' : `(${selection.track.kind || 'manual'})`
                );

                let segments = await downloadCaptionTrack(selection.track, selection.translateTo);
                let resolved = selection;

                // Las peticiones con tlang las limita YouTube (HTTP 429) mucho antes
                // que las normales. Antes que devolver 404, servimos el original:
                // una transcripción en otro idioma es más útil que ninguna.
                if (!segments && !selection.isOriginal) {
                    console.warn('[Transcript] Falló', selection.language, '— repliego al idioma original');
                    const fallback = selectCaptionTrack(captionsRenderer, 'auto');
                    if (fallback) {
                        segments = await downloadCaptionTrack(fallback.track);
                        if (segments) resolved = fallback;
                    }
                }

                if (segments) {
                    console.log(`[Transcript] Éxito vía InnerTube — ${segments.length} segmentos (${resolved.language})`);
                    return res.json({
                        content: segments,
                        language: resolved.language,
                        isOriginal: resolved.isOriginal,
                        // Avisa al frontend de que no es el idioma que se pidió.
                        requestedLanguage: lang,
                        languageFallback: resolved.language !== selection.language,
                        videoInfo: buildVideoInfo(playerResponse)
                    });
                }
                console.warn('[Transcript] La descarga de la pista vino vacía');
            } else {
                console.warn('[Transcript] El vídeo no expone captionTracks');
            }
        } catch (innerTubeError) {
            console.warn('[Transcript] InnerTube falló:', innerTubeError.message);
        }

        // Estrategia 2: yt-dlp. Más lento (descarga el binario) y propenso a que
        // YouTube lo bloquee por bot en la nube, pero cubre casos que InnerTube no.
        try {
            console.log('[Transcript] Probando fallback con yt-dlp...');
            const ytDlpResult = await fetchTranscriptWithYtDlp(videoId, lang);
            if (ytDlpResult) {
                console.log('[Transcript] Éxito vía yt-dlp —', ytDlpResult.content.length, 'segmentos');
                return res.json(ytDlpResult);
            }
        } catch (ytDlpError) {
            console.warn('[Transcript] yt-dlp falló:', ytDlpError.message);
        }

        return res.status(404).json({
            message: 'No hay subtítulos disponibles para este vídeo',
            videoInfo: buildVideoInfo(playerResponse)
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

        console.log('[Video Metadata] Fetching player response via InnerTube...');
        const playerResponse = await fetchPlayerResponseFromInnerTube(videoId);
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
