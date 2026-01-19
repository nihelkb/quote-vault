/**
 * CollectionService - Single Responsibility: Handles collection operations
 * Separated from QuoteService following Interface Segregation Principle
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
    onSnapshot
} from 'firebase/firestore';

class CollectionService {
    constructor() {
        this.collectionName = 'collections';
        this.unsubscribe = null;
    }

    /**
     * Subscribe to user's collections in real-time
     * @param {string} userId - User ID
     * @param {Function} callback - Function to execute when collections change
     * @returns {Function} - Unsubscribe function
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
            const collections = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort alphabetically on client (avoids composite index requirement)
            collections.sort((a, b) => a.name.localeCompare(b.name));
            callback(collections);
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
     * Create a new collection
     */
    async create(name, userId) {
        const data = {
            name: name.trim(),
            userId,
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, this.collectionName), data);
        return { id: docRef.id, ...data };
    }

    /**
     * Update collection name
     */
    async update(collectionId, name) {
        await updateDoc(doc(db, this.collectionName, collectionId), {
            name: name.trim(),
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Delete a collection
     */
    async delete(collectionId) {
        await deleteDoc(doc(db, this.collectionName, collectionId));
    }

    /**
     * Find collection by ID
     */
    findById(collections, collectionId) {
        return collections.find(c => c.id === collectionId);
    }

    /**
     * Get collection name by ID
     */
    getNameById(collections, collectionId) {
        const collection = this.findById(collections, collectionId);
        return collection ? collection.name : null;
    }
}

// Singleton
export const collectionService = new CollectionService();
