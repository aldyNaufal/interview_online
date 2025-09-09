# services/koboldcpp_service.py - KoboldCpp API integration

import asyncio
import aiohttp
import json
import logging
from typing import Dict, Any, List, Tuple
import time
import os

logger = logging.getLogger(__name__)

class KoboldCppService:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("KOBOLDCPP_URL", "http://localhost:5001")
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def transcribe_audio(self, audio_data: bytes, filename: str = "audio.wav") -> Tuple[str, float, float]:
        """
        Transcribe audio using KoboldCpp API
        
        Returns:
            Tuple of (transcribed_text, confidence_score, processing_time)
        """
        start_time = time.time()
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Prepare multipart form data
            form_data = aiohttp.FormData()
            form_data.add_field('file', audio_data, filename=filename, content_type='audio/wav')
            form_data.add_field('model', 'whisper-1')  # or whatever model KoboldCpp expects
            form_data.add_field('language', 'id')  # Indonesian language code
            
            async with self.session.post(
                f"{self.base_url}/v1/audio/transcriptions",
                data=form_data
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"KoboldCpp transcription failed: {response.status} - {error_text}")
                    raise Exception(f"Transcription failed with status {response.status}")
                
                result = await response.json()
                processing_time = (time.time() - start_time) * 1000
                
                # Extract transcription text
                transcribed_text = result.get('text', '')
                confidence = 0.85  # KoboldCpp might not provide confidence, using default
                
                logger.info(f"KoboldCpp transcription completed in {processing_time:.2f}ms")
                return transcribed_text, confidence, processing_time
                
        except Exception as e:
            logger.error(f"KoboldCpp transcription error: {e}")
            raise

    async def generate_text(self, prompt: str, max_tokens: int = 500, temperature: float = 0.3) -> str:
        """
        Generate text using KoboldCpp completion API
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            payload = {
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
                "stop": ["</s>", "\n\n", "User:", "Assistant:"],
                "stream": False
            }
            
            async with self.session.post(
                f"{self.base_url}/v1/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"KoboldCpp generation failed: {response.status} - {error_text}")
                    raise Exception(f"Text generation failed with status {response.status}")
                
                result = await response.json()
                
                # Extract generated text
                if 'choices' in result and len(result['choices']) > 0:
                    generated_text = result['choices'][0].get('text', '').strip()
                    return generated_text
                else:
                    logger.error(f"Unexpected response format: {result}")
                    raise Exception("Invalid response format from KoboldCpp")
                    
        except Exception as e:
            logger.error(f"KoboldCpp generation error: {e}")
            raise