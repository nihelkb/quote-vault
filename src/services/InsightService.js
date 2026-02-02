/**
 * InsightService - Handles quick capture of content insights
 * For capturing notes from videos, articles, podcasts, etc.
 */
import { db } from '../config/firebase.js';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    getDoc
} from 'firebase/firestore';
import { safeFirebaseOperation, FirebaseBlockedError, isBlockedError } from '../utils/firebaseBlockerDetector.js';

class InsightService {
    constructor() {
        this.collectionName = 'insights';
        this.unsubscribe = null;
    }

    /**
     * Subscribe to user's insights in real-time
     */
    subscribe(userId, callback, onError = null) {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId)
        );

        this.unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const insights = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort by createdAt descending (newest first)
                insights.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                callback(insights);
            },
            (error) => {
                console.error('Firestore subscription error:', error);
                if (isBlockedError(error) && onError) {
                    onError(new FirebaseBlockedError(error.message));
                } else if (onError) {
                    onError(error);
                }
            }
        );

        return this.unsubscribe;
    }

    /**
     * Cancel active subscription
     */
    unsubscribeAll() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    /**
     * Create a new insight
     */
    async create(data, userId) {
        const now = new Date().toISOString();

        const insightData = {
            userId,

            // Source info
            sourceUrl: data.sourceUrl || '',
            sourceTitle: data.sourceTitle || '',
            sourceType: data.sourceType || 'other', // youtube, article, podcast, book, other
            sourceThumbnail: data.sourceThumbnail || null,
            sourceDuration: data.sourceDuration || null,
            sourceChannel: data.sourceChannel || null,

            // Captured content
            rawNotes: data.rawNotes || '',
            structuredNotes: data.structuredNotes || '', // Rich text / markdown notes
            transcript: data.transcript || '', // Full transcript
            highlights: data.highlights || [], // Array of {id, text, timestamp, color, note}
            timestampedNotes: data.timestampedNotes || [], // Array of {id, text, type, timestamp, completed}
            aiSummary: data.aiSummary || null,
            keyPoints: data.keyPoints || [],
            toVerify: data.toVerify || [],

            // Status: draft, reviewed, integrated, discarded
            status: data.status || 'draft',

            // Wiki linking
            linkedTopicId: data.linkedTopicId || null,
            promotedEntryIds: data.promotedEntryIds || [],

            // Metadata
            tags: data.tags || [],

            createdAt: now,
            updatedAt: now
        };

        return await safeFirebaseOperation(async () => {
            const docRef = await addDoc(collection(db, this.collectionName), insightData);
            return { id: docRef.id, ...insightData };
        });
    }

    /**
     * Update an insight
     */
    async update(insightId, data) {
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        delete updateData.userId;
        delete updateData.createdAt;
        delete updateData.id;

        return await safeFirebaseOperation(async () => {
            await updateDoc(doc(db, this.collectionName, insightId), updateData);
        });
    }

    /**
     * Delete an insight
     */
    async delete(insightId) {
        return await safeFirebaseOperation(async () => {
            await deleteDoc(doc(db, this.collectionName, insightId));
        });
    }

    /**
     * Get a single insight by ID
     */
    async getById(insightId) {
        return await safeFirebaseOperation(async () => {
            const docSnap = await getDoc(doc(db, this.collectionName, insightId));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        });
    }

    /**
     * Update insight status
     */
    async updateStatus(insightId, status) {
        await this.update(insightId, { status });
    }

    /**
     * Link insight to a topic
     */
    async linkToTopic(insightId, topicId) {
        await this.update(insightId, { linkedTopicId: topicId });
    }

    /**
     * Mark insight as integrated (promoted to wiki)
     */
    async markAsIntegrated(insightId, entryIds = []) {
        await this.update(insightId, {
            status: 'integrated',
            promotedEntryIds: entryIds
        });
    }

    /**
     * Extract YouTube video ID from URL
     */
    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Detect source type from URL
     */
    detectSourceType(url) {
        if (!url) return 'other';

        const lowerUrl = url.toLowerCase();

        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            return 'youtube';
        }
        if (lowerUrl.includes('spotify.com') || lowerUrl.includes('podcast')) {
            return 'podcast';
        }
        if (lowerUrl.includes('medium.com') || lowerUrl.includes('substack.com') ||
            lowerUrl.match(/\.(com|org|net|io)\/.*article/i)) {
            return 'article';
        }
        if (lowerUrl.includes('amazon.com/') && lowerUrl.includes('/dp/')) {
            return 'book';
        }

        return 'article'; // Default to article for most URLs
    }

    /**
     * Filter insights by status
     */
    filterByStatus(insights, status) {
        if (!status) return insights;
        return insights.filter(i => i.status === status);
    }

    /**
     * Filter insights by linked topic
     */
    filterByTopic(insights, topicId) {
        if (!topicId) return insights;
        return insights.filter(i => i.linkedTopicId === topicId);
    }

    /**
     * Get counts by status
     */
    getStatusCounts(insights) {
        return {
            draft: insights.filter(i => i.status === 'draft').length,
            reviewed: insights.filter(i => i.status === 'reviewed').length,
            integrated: insights.filter(i => i.status === 'integrated').length,
            discarded: insights.filter(i => i.status === 'discarded').length,
            total: insights.length
        };
    }

    /**
     * Add a highlight to an insight
     */
    async addHighlight(insightId, highlight) {
        const insight = await this.getById(insightId);
        if (!insight) return;

        const highlights = insight.highlights || [];
        const newHighlight = {
            id: Date.now().toString(),
            text: highlight.text,
            startIndex: highlight.startIndex || null,
            endIndex: highlight.endIndex || null,
            timestamp: highlight.timestamp || null,
            color: highlight.color || 'yellow',
            note: highlight.note || '',
            createdAt: new Date().toISOString()
        };

        highlights.push(newHighlight);
        await this.update(insightId, { highlights });
        return newHighlight;
    }

    /**
     * Remove a highlight from an insight
     */
    async removeHighlight(insightId, highlightId) {
        const insight = await this.getById(insightId);
        if (!insight) return;

        const highlights = (insight.highlights || []).filter(h => h.id !== highlightId);
        await this.update(insightId, { highlights });
    }

    /**
     * Update highlight note
     */
    async updateHighlightNote(insightId, highlightId, note) {
        const insight = await this.getById(insightId);
        if (!insight) return;

        const highlights = (insight.highlights || []).map(h =>
            h.id === highlightId ? { ...h, note } : h
        );
        await this.update(insightId, { highlights });
    }

    /**
     * Save transcript
     */
    async saveTranscript(insightId, transcript) {
        await this.update(insightId, { transcript });
    }

    /**
     * Save structured notes
     */
    async saveNotes(insightId, structuredNotes) {
        await this.update(insightId, { structuredNotes });
    }
}

// Singleton
export const insightService = new InsightService();
