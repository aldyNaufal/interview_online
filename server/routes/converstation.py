from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
import logging
from typing import List, Optional
import json
from datetime import datetime

from services.speech_to_text import IndonesianSTTService
from services.summarization import ConversationSummarizationService
from database.models import Conversation, Transcription, ConversationSummary, Room, ConversationStatus
from database.connection import get_db
from auth.security import require_user_or_admin
from auth.schemas import TokenData
import os

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
stt_service = IndonesianSTTService()
summarization_service = ConversationSummarizationService(
    api_key=os.getenv("OPENAI_API_KEY", ""),
    model=os.getenv("LLM_MODEL", "gpt-3.5-turbo")
)

@router.on_event("startup")
async def startup_event():
    """Initialize STT service on startup"""
    try:
        await stt_service.initialize()
        logger.info("Speech-to-text service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize STT service: {e}")

@router.post("/conversation/start/{room_id}")
async def start_conversation_recording(
    room_id: str,  # Room ID or room name
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Start conversation recording for a room"""
    try:
        # Find room
        result = await db.execute(
            select(Room).where(
                (Room.room_id == room_id) | (Room.name == room_id),
                Room.is_active == True
            )
        )
        room = result.scalar_one_or_none()
        
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check if conversation already active
        result = await db.execute(
            select(Conversation).where(
                Conversation.room_id == room.id,
                Conversation.status == ConversationStatus.ACTIVE
            )
        )
        active_conversation = result.scalar_one_or_none()
        
        if active_conversation:
            return {
                "conversation_id": active_conversation.conversation_id,
                "status": "already_active",
                "message": "Conversation recording is already active for this room"
            }
        
        # Create new conversation
        conversation = Conversation(
            room_id=room.id,
            status=ConversationStatus.ACTIVE
        )
        
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        
        logger.info(f"Started conversation recording for room {room.name}: {conversation.conversation_id}")
        
        return {
            "conversation_id": conversation.conversation_id,
            "room_name": room.name,
            "room_id": room.room_id,
            "status": "started",
            "started_at": conversation.started_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Start conversation error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start conversation recording"
        )

@router.post("/conversation/{conversation_id}/transcribe")
async def transcribe_audio_chunk(
    conversation_id: str,
    participant_name: str,
    participant_identity: str,
    start_time: int,  # Seconds from conversation start
    audio_file: UploadFile = File(...),
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Transcribe audio chunk and store result"""
    try:
        # Find conversation
        result = await db.execute(
            select(Conversation).where(
                Conversation.conversation_id == conversation_id,
                Conversation.status == ConversationStatus.ACTIVE
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active conversation not found"
            )
        
        # Read audio data
        audio_data = await audio_file.read()
        
        if len(audio_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file"
            )
        
        # Transcribe audio
        transcribed_text, confidence, processing_time = await stt_service.transcribe_audio(audio_data)
        
        if not transcribed_text.strip():
            logger.info(f"Empty transcription for {participant_name}")
            return {
                "conversation_id": conversation_id,
                "transcription": "",
                "message": "No speech detected in audio"
            }
        
        # Calculate audio duration (estimate based on file size)
        estimated_duration = max(1, len(audio_data) // 16000)  # Rough estimate
        
        # Store transcription
        transcription = Transcription(
            conversation_id=conversation.id,
            participant_identity=participant_identity,
            participant_name=participant_name,
            transcribed_text=transcribed_text,
            confidence_score=str(confidence),
            start_time=start_time,
            end_time=start_time + estimated_duration,
            audio_duration=estimated_duration,
            processing_time=int(processing_time)
        )
        
        # Optionally store audio chunk (be careful with storage space)
        if len(audio_data) < 1024 * 1024:  # Only store chunks < 1MB
            transcription.audio_chunk = audio_data
        
        db.add(transcription)
        await db.commit()
        await db.refresh(transcription)
        
        logger.info(f"Transcribed audio for {participant_name}: {transcribed_text[:50]}...")
        
        return {
            "transcription_id": transcription.id,
            "conversation_id": conversation_id,
            "transcription": transcribed_text,
            "confidence": confidence,
            "processing_time": processing_time,
            "participant": participant_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to transcribe audio"
        )

@router.post("/conversation/{conversation_id}/end")
async def end_conversation_and_summarize(
    conversation_id: str,
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """End conversation and generate summary"""
    try:
        # Find active conversation
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.transcriptions))
            .where(
                Conversation.conversation_id == conversation_id,
                Conversation.status == ConversationStatus.ACTIVE
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active conversation not found"
            )
        
        # Update conversation status
        conversation.status = ConversationStatus.PROCESSING
        conversation.ended_at = datetime.utcnow()
        await db.commit()
        
        # Check if we have transcriptions
        if not conversation.transcriptions:
            conversation.status = ConversationStatus.COMPLETED
            await db.commit()
            return {
                "conversation_id": conversation_id,
                "status": "completed",
                "message": "No transcriptions to summarize"
            }
        
        # Prepare transcription data for summarization
        transcription_data = []
        for trans in conversation.transcriptions:
            transcription_data.append({
                "participant_name": trans.participant_name,
                "participant_identity": trans.participant_identity,
                "transcribed_text": trans.transcribed_text,
                "confidence_score": trans.confidence_score,
                "timestamp": trans.timestamp.isoformat(),
                "start_time": trans.start_time or 0,
                "end_time": trans.end_time or 0
            })
        
        # Calculate conversation duration
        duration = int((conversation.ended_at - conversation.started_at).total_seconds())
        
        # Generate summary
        summary_data = await summarization_service.summarize_conversation(
            transcriptions=transcription_data,
            conversation_duration=duration,
            language="indonesian"
        )
        
        # Store summary
        conversation_summary = ConversationSummary(
            conversation_id=conversation.id,
            summary_text=summary_data["summary"],
            key_points=json.dumps(summary_data["key_points"], ensure_ascii=False),
            action_items=json.dumps(summary_data["action_items"], ensure_ascii=False),
            participants_summary=json.dumps(summary_data["participants_analysis"], ensure_ascii=False),
            total_duration=duration,
            total_words=summary_data["statistics"]["total_words"],
            model_used=f"{summarization_service.model}"
        )
        
        db.add(conversation_summary)
        
        # Mark conversation as completed
        conversation.status = ConversationStatus.COMPLETED
        await db.commit()
        await db.refresh(conversation_summary)
        
        logger.info(f"Conversation {conversation_id} summarized successfully")
        
        return {
            "conversation_id": conversation_id,
            "status": "completed",
            "summary": {
                "id": conversation_summary.id,
                "summary_text": summary_data["summary"],
                "key_points": summary_data["key_points"],
                "action_items": summary_data["action_items"],
                "statistics": summary_data["statistics"],
                "participants": summary_data["participants_analysis"]
            },
            "duration": duration,
            "transcriptions_count": len(transcription_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"End conversation error: {e}")
        await db.rollback()
        
        # Try to mark conversation as completed even if summarization failed
        try:
            await db.execute(
                update(Conversation)
                .where(Conversation.conversation_id == conversation_id)
                .values(status=ConversationStatus.COMPLETED, ended_at=datetime.utcnow())
            )
            await db.commit()
        except:
            pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process conversation summary"
        )

@router.get("/conversation/{conversation_id}/summary")
async def get_conversation_summary(
    conversation_id: str,
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get conversation summary"""
    try:
        # Find conversation with summary
        result = await db.execute(
            select(Conversation)
            .options(
                selectinload(Conversation.summaries),
                selectinload(Conversation.room)
            )
            .where(Conversation.conversation_id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if not conversation.summaries:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Summary not available yet"
            )
        
        summary = conversation.summaries[0]  # Get latest summary
        
        return {
            "conversation_id": conversation_id,
            "room_name": conversation.room.name,
            "status": conversation.status.value,
            "duration": conversation.total_duration if hasattr(conversation, 'total_duration') else None,
            "summary": {
                "id": summary.id,
                "text": summary.summary_text,
                "key_points": json.loads(summary.key_points) if summary.key_points else [],
                "action_items": json.loads(summary.action_items) if summary.action_items else [],
                "participants": json.loads(summary.participants_summary) if summary.participants_summary else {},
                "total_words": summary.total_words,
                "total_duration": summary.total_duration,
                "created_at": summary.created_at.isoformat(),
                "model_used": summary.model_used
            },
            "started_at": conversation.started_at.isoformat(),
            "ended_at": conversation.ended_at.isoformat() if conversation.ended_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get summary error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation summary"
        )

@router.get("/conversation/{conversation_id}/transcriptions")
async def get_conversation_transcriptions(
    conversation_id: str,
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all transcriptions for a conversation"""
    try:
        # Find conversation with transcriptions
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.transcriptions))
            .where(Conversation.conversation_id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Sort transcriptions by timestamp
        transcriptions = sorted(
            conversation.transcriptions, 
            key=lambda x: x.start_time or 0
        )
        
        transcription_list = []
        for trans in transcriptions:
            transcription_list.append({
                "id": trans.id,
                "participant_name": trans.participant_name,
                "participant_identity": trans.participant_identity,
                "text": trans.transcribed_text,
                "confidence": float(trans.confidence_score) if trans.confidence_score else None,
                "start_time": trans.start_time,
                "end_time": trans.end_time,
                "duration": trans.audio_duration,
                "timestamp": trans.timestamp.isoformat(),
                "processing_time": trans.processing_time
            })
        
        return {
            "conversation_id": conversation_id,
            "status": conversation.status.value,
            "transcriptions": transcription_list,
            "total_transcriptions": len(transcription_list),
            "participants": list(set(t["participant_name"] for t in transcription_list))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get transcriptions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transcriptions"
        )

@router.get("/room/{room_id}/conversations")
async def get_room_conversations(
    room_id: str,
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for a room"""
    try:
        # Find room
        result = await db.execute(
            select(Room).where(
                (Room.room_id == room_id) | (Room.name == room_id),
                Room.is_active == True
            )
        )
        room = result.scalar_one_or_none()
        
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Get conversations
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.summaries))
            .where(Conversation.room_id == room.id)
            .order_by(Conversation.started_at.desc())
        )
        conversations = result.scalars().all()
        
        conversation_list = []
        for conv in conversations:
            conversation_data = {
                "conversation_id": conv.conversation_id,
                "status": conv.status.value,
                "started_at": conv.started_at.isoformat(),
                "ended_at": conv.ended_at.isoformat() if conv.ended_at else None,
                "has_summary": len(conv.summaries) > 0
            }
            
            if conv.summaries:
                summary = conv.summaries[0]
                conversation_data["summary_preview"] = {
                    "total_words": summary.total_words,
                    "total_duration": summary.total_duration,
                    "created_at": summary.created_at.isoformat()
                }
            
            conversation_list.append(conversation_data)
        
        return {
            "room_name": room.name,
            "room_id": room.room_id,
            "conversations": conversation_list,
            "total_conversations": len(conversation_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get room conversations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve room conversations"
        )