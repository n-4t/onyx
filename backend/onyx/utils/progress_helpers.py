import re
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from onyx.db.indexing_coordination import IndexingCoordination
from onyx.db.models import IndexAttempt

logger = logging.getLogger(__name__)

def calculate_progress_percentage(coordination_status) -> int:
    """Calculate indexing progress percentage"""
    if not coordination_status.found or coordination_status.total_batches is None:
        return 0
    
    if coordination_status.total_batches == 0:
        return 100
        
    return min(99, int((coordination_status.completed_batches / coordination_status.total_batches) * 100))

def estimate_completion_time(attempt: IndexAttempt, coordination_status) -> Optional[datetime]:
    """Estimate completion time based on progress so far"""
    if not coordination_status.found or coordination_status.total_batches is None:
        return None
        
    if not attempt.time_started or coordination_status.completed_batches == 0:
        return None
        
    # Calculate rate of processing
    now = datetime.now(datetime.timezone.utc)
    elapsed = (now - attempt.time_started).total_seconds()
    
    if elapsed < 5:  # Too early to make a good estimate
        return None
        
    batches_per_second = coordination_status.completed_batches / elapsed
    remaining_batches = coordination_status.total_batches - coordination_status.completed_batches
    
    if batches_per_second <= 0:
        return None
        
    seconds_remaining = remaining_batches / batches_per_second
    return now + timedelta(seconds=seconds_remaining)

def get_processing_logs(index_attempt_id: int, db_session: Session, max_logs: int = 100) -> List[str]:
    """Retrieve processing logs for a specific index attempt
    
    This function retrieves logs from the database log table based on the index attempt ID.
    Adjust the implementation based on your actual logging system.
    """
    try:
        # Query application logs for entries mentioning this index attempt
        # This implementation assumes you have a logs table - adjust as needed
        query = text("""
            SELECT log_message 
            FROM application_logs 
            WHERE log_message LIKE :pattern
            ORDER BY log_timestamp DESC
            LIMIT :limit
        """)
        
        pattern = f"%[Index Attempt: {index_attempt_id}]%"
        result = db_session.execute(query, {"pattern": pattern, "limit": max_logs})
        
        logs = [row[0] for row in result]
        return logs
    except Exception as e:
        logger.error(f"Error retrieving logs for index attempt {index_attempt_id}: {e}")
        return []

def extract_ocr_info_from_logs(logs: List[str]) -> Dict[str, Any]:
    """Extract OCR processing information from logs"""
    ocr_info = {
        "is_ocr": False,
        "current_page": None,
        "total_pages": None,
        "avg_time_per_page": None,
        "page_times": [],
        "started_at": None,
        "file_name": None,
    }
    
    # Look for OCR indicators
    for log in logs:
        if "PDF appears to be image-based" in log or "=== PDF EXTRACTION WITH OLLAMA OCR ===" in log:
            ocr_info["is_ocr"] = True
            
            # Try to extract timestamp from log entry
            timestamp_match = re.search(r'(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2} [AP]M)', log)
            if timestamp_match and not ocr_info["started_at"]:
                try:
                    ocr_info["started_at"] = datetime.strptime(
                        timestamp_match.group(1), 
                        '%m/%d/%Y %I:%M:%S %p'
                    )
                except Exception:
                    pass
            
        # Get total pages
        pdf_pages_match = re.search(r"PDF has (\d+) pages", log)
        if pdf_pages_match:
            ocr_info["total_pages"] = int(pdf_pages_match.group(1))
            
        # Get current page progress
        current_page_match = re.search(r"Processing page (\d+)/(\d+)", log)
        if current_page_match:
            ocr_info["current_page"] = int(current_page_match.group(1))
            
        # Collect page processing times
        page_time_match = re.search(r"Page \d+: Extracted \d+ characters in (\d+\.\d+)s", log)
        if page_time_match:
            ocr_info["page_times"].append(float(page_time_match.group(1)))
            
        # Try to extract filename
        file_match = re.search(r"Creating TextSection for ([^ ]+) with link", log)
        if file_match and not ocr_info["file_name"]:
            ocr_info["file_name"] = file_match.group(1)
    
    # Calculate average page processing time
    if ocr_info["page_times"]:
        ocr_info["avg_time_per_page"] = sum(ocr_info["page_times"]) / len(ocr_info["page_times"])
    
    return ocr_info
