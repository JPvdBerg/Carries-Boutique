// --- 1. IMAGE CONVERSION FUNCTION (V2 Storage Trigger) ---
exports.convertImageToWebP = onObjectFinalized({
    region: "africa-south1",
    memory: "512MiB",
}, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name; // e.g., 'products/167..._dress'
    const contentType = event.data.contentType;

    // Exit if not an image, if already WebP, or if not in the 'products/' folder
    if (!contentType || !contentType.startsWith('image/') || contentType === 'image/webp') {
        console.log("Exiting: Not a convertible image.");
        return null;
    }
    if (!filePath || !filePath.startsWith('products/')) {
        console.log("Exiting: Not a product image.");
        return null;
    }

    const bucket = getStorage().bucket(fileBucket);
    const originalFile = bucket.file(filePath);
    const fileName = path.basename(filePath); // e.g., '167..._dress'
    const tempFilePath = path.join(os.tmpdir(), fileName);
    
    // Create new .webp file name and paths
    const webpFileName = fileName.replace(/\.[^/.]+$/, "") + '.webp';
    const tempWebpPath = path.join(os.tmpdir(), webpFileName);
    const destinationPath = path.join(path.dirname(filePath), webpFileName); // e.g., 'products/167..._dress.webp'
    
    try {
        // 1. Download original file
        await originalFile.download({ destination: tempFilePath });
        console.log("Image downloaded to temp path:", tempFilePath);

        // 2. Convert to WebP
        await sharp(tempFilePath).webp({ quality: 80 }).toFile(tempWebpPath);
        console.log("Image converted to WebP at:", tempWebpPath);
        
        // 3. Upload the new .webp file
        await bucket.upload(tempWebpPath, {
            destination: destinationPath,
            metadata: { contentType: 'image/webp' },
        });
        console.log("WebP image uploaded.");

        // 4. Make the new file public
        const newFile = bucket.file(destinationPath);
        await newFile.makePublic();
        console.log("Successfully made .webp file public.");

        // 5. Construct the new public URL (this is the final URL)
        const newPublicUrl = `https://storage.googleapis.com/${fileBucket}/${destinationPath}`;

        // 6. *** UPDATE FIRESTORE ***
        // We must find the document that has the *old* URL.
        // We can't know the exact token, so we search by the URL prefix.
        
        const oldUrlPrefix = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;

        // Create a helper function to query and update collections
        const updateCollection = async (collectionName) => {
            const query = db.collection(collectionName)
                .where('image_url', '>=', oldUrlPrefix)
                .where('image_url', '<', oldUrlPrefix + '~'); // '~' is a "starts-with" hack
            
            const snapshot = await query.get();
            if (snapshot.empty) {
                console.log(`No documents found in ${collectionName} for prefix: ${oldUrlPrefix}`);
                return;
            }

            // Update all matching documents in parallel
            const batch = db.batch();
            snapshot.forEach(doc => {
                console.log(`Updating doc ${doc.id} in ${collectionName} to new URL: ${newPublicUrl}`);
                batch.update(doc.ref, { image_url: newPublicUrl });
            });
            await batch.commit();
        };

        // Update both collections
        await Promise.all([
            updateCollection('products'),
            updateCollection('custom_styles')
        ]);

        // 7. Delete the original file
        await originalFile.delete(); 
        console.log("Original image deleted.");

    } catch (error) {
        console.error('Failed to convert or update Firestore:', error);
    } finally {
        // 8. Clean up temp files
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
    }
    return null;
});