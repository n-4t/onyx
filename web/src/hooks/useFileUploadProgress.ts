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
    if (!fileIds.length) return;

    setIsPolling(true);
    setIsComplete(false);
    setError(null);

    const pollProgress = async () => {
      console.log('[useFileUploadProgress] Polling for file progress:', fileIds);
      try {
        const queryParams = fileIds.map(id => `file_ids=${id}`).join('&');
        const response = await fetch(`/api/user/file/upload-progress?${queryParams}`);

        console.log('[useFileUploadProgress] API response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch file progress: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[useFileUploadProgress] Progress data received:', data);
        setProgress(data);

        // Check if all files are indexed
        const allDone = Object.values(data).every((fileProgress: any) =>
          fileProgress.indexed || fileProgress.status === 'SUCCESS'
        );

        if (allDone) {
          setIsPolling(false);
          setIsComplete(true);
          console.log('[useFileUploadProgress] All files indexed, stopping polling');
        }
      } catch (error) {
        console.error('[useFileUploadProgress] Error fetching file progress:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    pollProgress();

    const intervalId = setInterval(pollProgress, 3000);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [fileIds]);

  console.log('[useFileUploadProgress] Current progress state:', progress, 'isPolling:', isPolling, 'isComplete:', isComplete, 'error:', error);

  return { progress, isPolling, isComplete, error };
}
