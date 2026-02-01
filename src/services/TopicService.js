/**
 * TopicService - Handles wiki topic operations
 * Topics are structured knowledge containers (evolution of collections)
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

class TopicService {
    constructor() {
        this.collectionName = 'topics';
        this.unsubscribe = null;
    }

    /**
     * Subscribe to user's topics in real-time
     */
    subscribe(userId, callback) {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId)
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const topics = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by updatedAt descending (most recent first)
            topics.sort((a, b) => {
                const dateA = a.updatedAt || a.createdAt;
                const dateB = b.updatedAt || b.createdAt;
                return new Date(dateB) - new Date(dateA);
            });
            callback(topics);
        });

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
     * Create a new topic with default structure
     */
    async create(data, userId) {
        const now = new Date().toISOString();

        const topicData = {
            userId,
            name: data.name.trim(),
            description: data.description || '',
            icon: data.icon || '📁',
            status: 'in_progress',

            // Sections enabled by default
            sections: {
                timeline: true,
                arguments: true,
                data: true,
                sources: true,
                quotes: true,
                connections: true,
                ...data.sections
            },

            tags: data.tags || [],
            relatedTopicIds: data.relatedTopicIds || [],

            createdAt: now,
            updatedAt: now
        };

        const docRef = await addDoc(collection(db, this.collectionName), topicData);
        return { id: docRef.id, ...topicData };
    }

    /**
     * Update a topic
     */
    async update(topicId, data) {
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        // Don't allow updating userId or createdAt
        delete updateData.userId;
        delete updateData.createdAt;
        delete updateData.id;

        await updateDoc(doc(db, this.collectionName, topicId), updateData);
    }

    /**
     * Delete a topic
     */
    async delete(topicId) {
        await deleteDoc(doc(db, this.collectionName, topicId));
    }

    /**
     * Get a single topic by ID
     */
    async getById(topicId) {
        const docSnap = await getDoc(doc(db, this.collectionName, topicId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    }

    /**
     * Find topic by ID from local array
     */
    findById(topics, topicId) {
        return topics.find(t => t.id === topicId);
    }

    /**
     * Toggle topic status
     */
    async toggleStatus(topicId, currentStatus) {
        const newStatus = currentStatus === 'in_progress' ? 'consolidated' : 'in_progress';
        await this.update(topicId, { status: newStatus });
        return newStatus;
    }

    /**
     * Add a related topic connection
     */
    async addRelatedTopic(topicId, relatedTopicId, currentRelated = []) {
        if (!currentRelated.includes(relatedTopicId)) {
            const newRelated = [...currentRelated, relatedTopicId];
            await this.update(topicId, { relatedTopicIds: newRelated });
        }
    }

    /**
     * Remove a related topic connection
     */
    async removeRelatedTopic(topicId, relatedTopicId, currentRelated = []) {
        const newRelated = currentRelated.filter(id => id !== relatedTopicId);
        await this.update(topicId, { relatedTopicIds: newRelated });
    }
}

// Singleton
export const topicService = new TopicService();
