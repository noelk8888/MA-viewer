const DRIVE_API_BASE = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  thumbnailLink: string;
  driveLink: string;
}

export const uploadImageToDrive = async (
  file: File,
  accessToken: string,
  folderId: string
): Promise<UploadResult> => {
  // Create file metadata
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    mimeType: file.type,
    parents: [folderId],
  };

  // Create multipart form data
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  // Upload file
  const uploadResponse = await fetch(`${DRIVE_API_BASE}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error?.message || 'Failed to upload file to Google Drive');
  }

  const uploadResult = await uploadResponse.json();
  const fileId = uploadResult.id;

  // Set file permissions to "anyone with link can view"
  const permResponse = await fetch(`${DRIVE_FILES_API}/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!permResponse.ok) {
    console.warn('Failed to set file permissions, but upload succeeded');
  }

  // Return links in the format the app expects
  return {
    fileId,
    webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
    thumbnailLink: `https://lh3.googleusercontent.com/d/${fileId}=s200`,
    driveLink: `https://drive.google.com/open?id=${fileId}`,
  };
};
