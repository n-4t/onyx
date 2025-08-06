import { useState, useEffect } from 'react';

interface FileProgress {
  indexed: boolean;
  status: string;
  progress_percentage: number;
  time_started?: string;
  estimated_completion_time?: string;
  completed_batches?: number;
  total_batches?: number;
  is_ocr_processing: boolean;
  ocr_current_page?: number;
  ocr_total_pages?: number;
  ocr_avg_page_time?: number;
  file_name?: string;
}

export function useFileUploadProgress(fileIds: number[]) {
  const [progress, setProgress] = useState<Record<number, FileProgress>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useFileUploadProgress] Effect triggered with fileIds:', fileIds);
    
    if (!fileIds.length) {
      console.log('[useFileUploadProgress] No fileIds, exiting');
      return;
    }

    setIsPolling(true);
    setIsComplete(false);
    setError(null);

    const pollProgress = async () => {
      console.log('[useFileUploadProgress] Polling for file progress:', fileIds);
      
      try {
        const queryParams = fileIds.map(id => `file_ids=${id}`).join('&');
        const url = `/api/user/file/upload-progress?${queryParams}`;
        console.log('[useFileUploadProgress] Fetching URL:', url);
        
        const response = await fetch(url);
        console.log('[useFileUploadProgress] API response status:', response.status);
        console.log('[useFileUploadProgress] API response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[useFileUploadProgress] API error response:', errorText);
          throw new Error(`Failed to fetch file progress: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[useFileUploadProgress] Progress data received:', data);
        setProgress(data);

        // Check if all files are indexed
        const allDone = Object.values(data).every((fileProgress: any) =>
          fileProgress.indexed || fileProgress.status === 'SUCCESS'
        );

        console.log('[useFileUploadProgress] All done check:', allDone);

        if (allDone) {
          setIsPolling(false);
          setIsComplete(true);
          console.log('[useFileUploadProgress] All files indexed, stopping polling');
        }
      } catch (error) {
        console.error('[useFileUploadProgress] Error fetching file progress:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsPolling(false); // Stop polling on error
      }
    };

    // Initial poll
    pollProgress();

    // Set up interval
    console.log('[useFileUploadProgress] Setting up 3-second polling interval');
    const intervalId = setInterval(pollProgress, 3000);

    return () => {
      console.log('[useFileUploadProgress] Cleanup: clearing interval');
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [fileIds]);

  console.log('[useFileUploadProgress] Hook state:', { 
    progress, 
    isPolling, 
    isComplete, 
    error,
    fileIds 
  });

  return { progress, isPolling, isComplete, error };
}
