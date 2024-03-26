const express = require('express');
const fileUpload = require('express-fileupload');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;
// Google Drive API credentials
const CLIENT_ID = '325974571669-spuurdef61el9u6mrqmkdeuulmbfe579.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//040J9zvu_PIQCCgYIARAAGAQSNwF-L9Irlja4cpuAoHAmrW1HUJC5-SyPy4UQojBEDJmcWZ4Uh7j-B9igPAn2mc5mtTy4Dfljtnk';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
});

// Middleware to handle file uploads
app.use(fileUpload());

app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', async (req, res) => {
    try {
        const uploadedFile = req.files.file; // Access the uploaded file

        // Move the uploaded file to a public directory
        const uploadPath = path.join(__dirname, 'public', uploadedFile.name);
        await uploadedFile.mv(uploadPath);

        // Upload the file to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: uploadedFile.name,
                mimeType: uploadedFile.mimetype,
            },
            media: {
                mimeType: uploadedFile.mimetype,
                body: fs.createReadStream(uploadPath)
            },
        });
        
        // Generate public URL
        const fileId = response.data.id;
        const publicUrl = await generatePublicUrl(fileId);

        // Send the public URL back to the client-side
        res.send(publicUrl);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Function to generate a public URL
async function generatePublicUrl(fileId) {
    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        const result = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink, webContentLink'
        });

        const publicUrl = result.data.webViewLink;
        console.log('Public URL:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Error generating public URL:', error.message);
        return 'Error generating public URL';
    }
}