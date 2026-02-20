// components/admin/VideoUploadForm.tsx
"use client";

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/config'; // Import the client-side firebase app
import { Button } from '@/components/shared/Button'; // Assuming you have a Button component
import { Input } from '@/components/ui/input'; // Assuming you have an Input component (shadcn/ui or similar)
import { Progress } from '@/components/ui/progress'; // Assuming you have a Progress component (shadcn/ui or similar)
import { useToast } from '@/components/ui/use-toast'; // Assuming you have a useToast hook (shadcn/ui or similar)

export function VideoUploadForm({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const firebaseAuth = getAuth(app);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const user = firebaseAuth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload videos.",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    let idToken;
    try {
      idToken = await user.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      toast({
        title: "Authentication Error",
        description: "Could not get authentication token.",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const response = await fetch('/api/admin/upload-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload video');
      }

      const data = await response.json();
      toast({
        title: "Upload Successful",
        description: `Video uploaded: ${data.fileName}`,
      });
      onUploadSuccess(data.url); // Pass the URL to the parent component
      setSelectedFile(null); // Clear the selected file

    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An unknown error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0); // Reset progress
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-blue-50 file:text-blue-700
                   hover:file:bg-blue-100"
      />
      {selectedFile && (
        <p className="text-sm text-gray-600">Selected file: {selectedFile.name}</p>
      )}
      <Button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Upload Video'}
      </Button>
      {isUploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}
    </div>
  );
}