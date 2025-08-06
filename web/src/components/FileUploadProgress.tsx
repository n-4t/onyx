import React, { useEffect } from 'react';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import { formatDistanceToNow } from 'date-fns';

interface FileUploadProgressProps {
  fileIds: number[];
  onComplete?: () => void;
  className?: string;
}

export function FileUploadProgress({ fileIds, onComplete, className = '' }: FileUploadProgressProps) {
  const { progress, isPolling, isComplete, error } = useFileUploadProgress(fileIds);

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  // Debugging: Log all relevant states
  console.log('[FileUploadProgress] fileIds:', fileIds);
  console.log('[FileUploadProgress] isPolling:', isPolling);
  console.log('[FileUploadProgress] isComplete:', isComplete);
  console.log('[FileUploadProgress] error:', error);
  console.log('[FileUploadProgress] progress:', progress);

  if (error) {
    return <div className="text-red-500 text-sm">Error tracking progress: {error}</div>;
  }

  if (!isPolling && isComplete) {
    return <div className="text-green-600 font-medium">Files ready for chat!</div>;
  }

  if (!isPolling && Object.keys(progress).length === 0) {
    return <div className="text-gray-500 text-sm">No progress data available.</div>;
  }

  // Find OCR files
  const ocrFiles = Object.values(progress).filter(
    (file: any) => file.is_ocr_processing
  );

  if (ocrFiles.length > 0) {
    const ocrFile = ocrFiles[0];
    if (ocrFile) {
      const pageProgress = Math.round(
        ((ocrFile.ocr_current_page || 1) / (ocrFile.ocr_total_pages || 1)) * 100
      );

      const estimatedTimeLeft = ocrFile.ocr_avg_page_time && ocrFile.ocr_current_page && ocrFile.ocr_total_pages
        ? (ocrFile.ocr_total_pages - ocrFile.ocr_current_page) * ocrFile.ocr_avg_page_time
        : null;

      const minutesLeft = estimatedTimeLeft ? Math.ceil(estimatedTimeLeft / 60) : null;

      console.log('[FileUploadProgress] OCR file progress:', ocrFile);

      return (
        <div className={`space-y-2 w-full ${className}`}>
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">OCR Processing PDF</div>
            <div className="text-sm">{pageProgress}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pageProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Page {ocrFile.ocr_current_page}/{ocrFile.ocr_total_pages}
              {ocrFile.file_name ? ` - ${ocrFile.file_name}` : ''}
            </span>
            {minutesLeft && (
              <span>~{minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'} remaining</span>
            )}
          </div>
        </div>
      );
    }
  }

  const overallProgress =
    Object.values(progress).reduce((sum, file: any) => sum + (file.progress_percentage || 0), 0) /
    Math.max(1, Object.keys(progress).length);

  const progressValues = Object.values(progress);
  const firstFile = progressValues.length > 0 ? progressValues[0] : null;

  return (
    <div className={`space-y-2 w-full ${className}`}>
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Processing files</div>
        <div className="text-sm">{Math.round(overallProgress)}%</div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.round(overallProgress)}%` }}
        ></div>
      </div>
      {Object.values(progress).map((file: any, index) => (
        <div key={index} className="text-xs text-gray-500">
          {file.file_name}: {file.progress_percentage}% complete
        </div>
      ))}
      {firstFile && firstFile.estimated_completion_time && (
        <div className="text-xs text-gray-500 text-right">
          Estimated completion: {formatDistanceToNow(
            new Date(firstFile.estimated_completion_time),
            { addSuffix: true }
          )}
        </div>
      )}
    </div>
  );
}
