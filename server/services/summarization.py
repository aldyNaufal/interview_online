import asyncio
import json
from typing import List, Dict, Any
import logging
from datetime import datetime
import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class ConversationSummarizationService:
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        
    async def summarize_conversation(
        self, 
        transcriptions: List[Dict[str, Any]], 
        conversation_duration: int,
        language: str = "indonesian"
    ) -> Dict[str, Any]:
        """
        Summarize conversation from transcriptions
        
        Args:
            transcriptions: List of transcription records
            conversation_duration: Duration in seconds
            language: Language for summary
            
        Returns:
            Dictionary containing summary, key points, and action items
        """
        try:
            logger.info(f"Starting summarization for {len(transcriptions)} transcriptions")
            
            # Prepare conversation text
            conversation_text = self._prepare_conversation_text(transcriptions)
            
            # Generate summary
            summary_response = await self._generate_summary(conversation_text, language)
            
            # Extract key points
            key_points = await self._extract_key_points(conversation_text, language)
            
            # Extract action items
            action_items = await self._extract_action_items(conversation_text, language)
            
            # Analyze participant contributions
            participants_analysis = await self._analyze_participants(transcriptions, language)
            
            result = {
                "summary": summary_response,
                "key_points": key_points,
                "action_items": action_items,
                "participants_analysis": participants_analysis,
                "statistics": {
                    "total_duration": conversation_duration,
                    "total_transcriptions": len(transcriptions),
                    "total_words": len(conversation_text.split()),
                    "participants_count": len(set(t["participant_name"] for t in transcriptions))
                }
            }
            
            logger.info("Conversation summarization completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            raise
    
    def _prepare_conversation_text(self, transcriptions: List[Dict[str, Any]]) -> str:
        """Prepare conversation text from transcriptions"""
        sorted_transcriptions = sorted(transcriptions, key=lambda x: x.get("timestamp", ""))
        
        conversation_parts = []
        for trans in sorted_transcriptions:
            participant = trans.get("participant_name", "Unknown")
            text = trans.get("transcribed_text", "")
            timestamp = trans.get("start_time", 0)
            
            # Format: [MM:SS] Participant: Text
            minutes = timestamp // 60
            seconds = timestamp % 60
            time_str = f"[{minutes:02d}:{seconds:02d}]"
            
            conversation_parts.append(f"{time_str} {participant}: {text}")
        
        return "\n".join(conversation_parts)
    
    async def _generate_summary(self, conversation_text: str, language: str) -> str:
        """Generate conversation summary"""
        prompt = self._get_summary_prompt(language)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Conversation to summarize:\n\n{conversation_text}"}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return "Error generating summary"
    
    async def _extract_key_points(self, conversation_text: str, language: str) -> List[str]:
        """Extract key points from conversation"""
        prompt = self._get_key_points_prompt(language)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Extract key points from:\n\n{conversation_text}"}
                ],
                max_tokens=300,
                temperature=0.2
            )
            
            # Parse response as JSON list or split by lines
            content = response.choices[0].message.content.strip()
            try:
                key_points = json.loads(content)
                if isinstance(key_points, list):
                    return key_points
            except json.JSONDecodeError:
                # Fallback: split by lines and clean
                return [point.strip("- ").strip() for point in content.split("\n") if point.strip()]
            
        except Exception as e:
            logger.error(f"Key points extraction error: {e}")
            return []
    
    async def _extract_action_items(self, conversation_text: str, language: str) -> List[Dict[str, str]]:
        """Extract action items from conversation"""
        prompt = self._get_action_items_prompt(language)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Extract action items from:\n\n{conversation_text}"}
                ],
                max_tokens=300,
                temperature=0.2
            )
            
            content = response.choices[0].message.content.strip()
            try:
                action_items = json.loads(content)
                if isinstance(action_items, list):
                    return action_items
            except json.JSONDecodeError:
                # Fallback: create simple action items
                lines = [line.strip("- ").strip() for line in content.split("\n") if line.strip()]
                return [{"task": line, "assignee": "TBD", "priority": "medium"} for line in lines]
            
        except Exception as e:
            logger.error(f"Action items extraction error: {e}")
            return []
    
    async def _analyze_participants(self, transcriptions: List[Dict[str, Any]], language: str) -> Dict[str, Any]:
        """Analyze participant contributions"""
        participants = {}
        
        for trans in transcriptions:
            name = trans.get("participant_name", "Unknown")
            text = trans.get("transcribed_text", "")
            
            if name not in participants:
                participants[name] = {
                    "total_words": 0,
                    "total_contributions": 0,
                    "average_confidence": 0.0,
                    "speaking_time": 0
                }
            
            participants[name]["total_words"] += len(text.split())
            participants[name]["total_contributions"] += 1
            participants[name]["speaking_time"] += trans.get("end_time", 0) - trans.get("start_time", 0)
            
            # Update confidence (simple average)
            confidence = float(trans.get("confidence_score", 0.8))
            current_avg = participants[name]["average_confidence"]
            count = participants[name]["total_contributions"]
            participants[name]["average_confidence"] = (current_avg * (count - 1) + confidence) / count
        
        return participants
    
    def _get_summary_prompt(self, language: str) -> str:
        """Get summary generation prompt"""
        if language.lower() == "indonesian":
            return """Anda adalah asisten AI yang bertugas merangkum percakapan dalam bahasa Indonesia. 
            Buatlah ringkasan yang komprehensif dan mudah dipahami dari percakapan yang diberikan. 
            Fokus pada poin-poin utama, keputusan penting, dan kesimpulan yang dicapai.
            Ringkasan harus dalam bahasa Indonesia dan tidak lebih dari 200 kata."""
        else:
            return """You are an AI assistant tasked with summarizing conversations. 
            Create a comprehensive and easy-to-understand summary of the given conversation. 
            Focus on main points, important decisions, and conclusions reached.
            Keep the summary under 200 words."""
    
    def _get_key_points_prompt(self, language: str) -> str:
        """Get key points extraction prompt"""
        if language.lower() == "indonesian":
            return """Ekstrak poin-poin kunci dari percakapan berikut. 
            Berikan dalam format JSON list berisi string, maksimal 5 poin utama.
            Contoh: ["Poin 1", "Poin 2", "Poin 3"]
            Fokus pada informasi penting, keputusan, dan topik utama yang dibahas."""
        else:
            return """Extract key points from the following conversation. 
            Provide as a JSON list of strings, maximum 5 main points.
            Example: ["Point 1", "Point 2", "Point 3"]
            Focus on important information, decisions, and main topics discussed."""
    
    def _get_action_items_prompt(self, language: str) -> str:
        """Get action items extraction prompt"""
        if language.lower() == "indonesian":
            return """Ekstrak item tindakan (action items) dari percakapan berikut.
            Berikan dalam format JSON list berisi objek dengan struktur:
            [{"task": "deskripsi tugas", "assignee": "nama/TBD", "priority": "high/medium/low"}]
            Hanya sertakan tugas yang jelas dan dapat ditindaklanjuti."""
        else:
            return """Extract action items from the following conversation.
            Provide as a JSON list of objects with structure:
            [{"task": "task description", "assignee": "name/TBD", "priority": "high/medium/low"}]
            Only include clear and actionable tasks."""