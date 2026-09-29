# Cloudinary cover storage

1. In Cloudinary Console, select your product environment and find its cloud name and API credentials under API Keys.
2. Add these variables to the Render **backend** service's Environment settings:

```dotenv
MEDIA_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

For local verification, the same empty fields are prepared in ignored apps/api/.env. Never add the secret to frontend variables or commit it. No unsigned upload preset is required; uploads are authenticated server-to-server.

3. Commit/push the integration and rebuild/deploy the backend. Missing Cloudinary credentials cause a clear startup error when cloudinary mode is selected. The frontend's cover URLs stay unchanged.
4. Upload a cover through Admin. The API validates and resizes it to 600x900 WebP, uploads it over HTTPS, and stores a MediaAsset key/public ID/URL mapping in MongoDB. Existing /api/v1/media/:key URLs redirect to the saved Cloudinary URL. Remaining local files stay readable during migration; missing local files cannot be recovered from MongoDB alone.
5. Restore the six known demo covers from docs/Img Demo by running scripts/seed-hosted-demo.mjs with node --import tsx and temporary environment values SEED_WEB_URL, ADMIN_EMAIL, ADMIN_PASSWORD, RESTORE_DEMO_COVERS=true. The script checks the deployed backend is using Cloudinary before restoring. Clear the temporary password and restoration flag afterward. Normal runs do not replace existing covers. Other lost user uploads require their original files.
6. Verify covers after a backend redeploy. Real Cloudinary uploads and migration require the account credentials and deployed integration; mocked tests do not establish live delivery.

Switching storage mode does not delete cloud assets. Replaced covers remain in Cloudinary; cleanup is a separate deliberate operation.

Reference: https://cloudinary.com/documentation/upload_images
