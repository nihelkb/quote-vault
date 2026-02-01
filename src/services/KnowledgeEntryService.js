/**
 * KnowledgeEntryService - Handles structured wiki entries
 * Entries belong to topics and can be: timeline events, arguments, facts, sources
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
    getDoc,
    getDocs
} from 'firebase/firestore';

class KnowledgeEntryService {
    constructor() {
        this.collectionName = 'knowledge_entries';
        this.subscriptions = new Map(); // topicId -> unsubscribe
    }

    /**
     * Subscribe to entries for a specific topic
     */
    subscribeToTopic(topicId, userId, callback) {
        // Unsubscribe from previous subscription for this topic
        if (this.subscriptions.has(topicId)) {
            this.subscriptions.get(topicId)();
        }

        const q = query(
            collection(db, this.collectionName),
            where('topicId', '==', topicId),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(entries);
        });

        this.subscriptions.set(topicId, unsubscribe);
        return unsubscribe;
    }

    /**
     * Unsubscribe from a topic's entries
     */
    unsubscribeFromTopic(topicId) {
        if (this.subscriptions.has(topicId)) {
            this.subscriptions.get(topicId)();
            this.subscriptions.delete(topicId);
        }
    }

    /**
     * Unsubscribe from all topics
     */
    unsubscribeAll() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions.clear();
    }

    /**
     * Create a new knowledge entry
     * @param {Object} data - Entry data
     * @param {string} data.topicId - Parent topic ID
     * @param {string} data.entryType - timeline_event, argument, counterargument, fact, source
     */
    async create(data, userId) {
        const now = new Date().toISOString();

        const entryData = {
            userId,
            topicId: data.topicId,

            // Entry type
            entryType: data.entryType, // timeline_event, argument, counterargument, fact, source

            // Content
            title: data.title || '',
            content: data.content || '',
            date: data.date || null, // For timeline events (e.g., "1948", "March 2020")
            author: data.author || null, // Who said it (for arguments)

            // Source reference
            sourceUrl: data.sourceUrl || null,
            sourceTitle: data.sourceTitle || null,
            sourceType: data.sourceType || null, // book, video, article, document, personal

            // Position (for arguments)
            stance: data.stance || null, // favor, contra, neutral

            // Relations
            parentId: data.parentId || null, // For nested counterarguments
            refutesId: data.refutesId || null, // Which argument this refutes

            // Verification
            verified: data.verified || false,
            confidence: data.confidence || 'medium', // high, medium, low
            verificationNotes: data.verificationNotes || '',

            // Metadata
            tags: data.tags || [],
            notes: data.notes || '',

            createdAt: now,
            updatedAt: now
        };

        const docRef = await addDoc(collection(db, this.collectionName), entryData);
        return { id: docRef.id, ...entryData };
    }

    /**
     * Update an entry
     */
    async update(entryId, data) {
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        delete updateData.userId;
        delete updateData.createdAt;
        delete updateData.id;

        await updateDoc(doc(db, this.collectionName, entryId), updateData);
    }

    /**
     * Delete an entry
     */
    async delete(entryId) {
        await deleteDoc(doc(db, this.collectionName, entryId));
    }

    /**
     * Get entries by topic (one-time fetch)
     */
    async getByTopic(topicId, userId) {
        const q = query(
            collection(db, this.collectionName),
            where('topicId', '==', topicId),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Get a single entry by ID
     */
    async getById(entryId) {
        const docSnap = await getDoc(doc(db, this.collectionName, entryId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    }

    /**
     * Toggle verification status
     */
    async toggleVerified(entryId, currentVerified) {
        await this.update(entryId, { verified: !currentVerified });
    }

    /**
     * Update confidence level
     */
    async updateConfidence(entryId, confidence) {
        await this.update(entryId, { confidence });
    }

    // ========================================================================
    // Filtering helpers (client-side)
    // ========================================================================

    /**
     * Filter entries by type
     */
    filterByType(entries, entryType) {
        return entries.filter(e => e.entryType === entryType);
    }

    /**
     * Get timeline entries sorted by date
     */
    getTimelineEntries(entries) {
        return this.filterByType(entries, 'timeline_event')
            .sort((a, b) => {
                // Try to parse dates for sorting
                const parseYear = (d) => {
                    if (!d) return 0;
                    const match = d.match(/\d{4}/);
                    return match ? parseInt(match[0]) : 0;
                };
                return parseYear(a.date) - parseYear(b.date);
            });
    }

    /**
     * Get arguments organized by stance
     */
    getArguments(entries) {
        const args = entries.filter(e =>
            e.entryType === 'argument' || e.entryType === 'counterargument'
        );

        return {
            favor: args.filter(a => a.stance === 'favor' && !a.parentId),
            contra: args.filter(a => a.stance === 'contra' && !a.parentId),
            neutral: args.filter(a => a.stance === 'neutral' && !a.parentId),
            all: args
        };
    }

    /**
     * Get counterarguments for a specific argument
     */
    getCounterarguments(entries, argumentId) {
        return entries.filter(e =>
            e.entryType === 'counterargument' &&
            (e.parentId === argumentId || e.refutesId === argumentId)
        );
    }

    /**
     * Get facts/data entries
     */
    getFacts(entries) {
        return this.filterByType(entries, 'fact')
            .sort((a, b) => {
                // Verified facts first, then by confidence
                if (a.verified !== b.verified) return b.verified - a.verified;
                const confidenceOrder = { high: 3, medium: 2, low: 1 };
                return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
            });
    }

    /**
     * Get source entries grouped by type
     */
    getSources(entries) {
        const sources = this.filterByType(entries, 'source');

        return {
            books: sources.filter(s => s.sourceType === 'book'),
            videos: sources.filter(s => s.sourceType === 'video'),
            articles: sources.filter(s => s.sourceType === 'article'),
            documents: sources.filter(s => s.sourceType === 'document'),
            personal: sources.filter(s => s.sourceType === 'personal'),
            all: sources
        };
    }

    /**
     * Get entry counts by type
     */
    getEntryCounts(entries) {
        return {
            timeline: this.filterByType(entries, 'timeline_event').length,
            arguments: entries.filter(e =>
                e.entryType === 'argument' || e.entryType === 'counterargument'
            ).length,
            facts: this.filterByType(entries, 'fact').length,
            sources: this.filterByType(entries, 'source').length,
            total: entries.length
        };
    }

    /**
     * Get verification stats
     */
    getVerificationStats(entries) {
        const total = entries.length;
        const verified = entries.filter(e => e.verified).length;

        return {
            verified,
            unverified: total - verified,
            total,
            percentage: total > 0 ? Math.round((verified / total) * 100) : 0
        };
    }
}

// Singleton
export const knowledgeEntryService = new KnowledgeEntryService();
