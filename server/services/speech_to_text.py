# services/speech_to_text.py - Wav2Vec2 Indonesian STT Service

import asyncio
import io
import numpy as np
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Tokenizer, Wav2Vec2Processor
import librosa
import logging
from typing import Optional, Tuple
import time

logger = logging.getLogger(__name__)

class IndonesianSTTService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.tokenizer = None
        self.sample_rate = 16000
        self.model_name = "indonesian-nlp/wav2vec2-indonesian-javanese-sundanese"
        
    async def initialize(self):
        """Initialize the Wav2Vec2 model for Indonesian"""
        try:
            logger.info("Loading Indonesian Wav2Vec2 model...")
            
            # Load model components
            self.processor = Wav2Vec2Processor.from_pretrained(self.model_name)
            self.model = Wav2Vec2ForCTC.from_pretrained(self.model_name)
            self.tokenizer = Wav2Vec2Tokenizer.from_pretrained(self.model_name)
            
            # Set model to evaluation mode
            self.model.eval()
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self.model = self.model.cuda()
                logger.info("Model loaded on GPU")
            else:
                logger.info("Model loaded on CPU")
                
            logger.info("Indonesian STT model initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize STT model: {e}")
            raise
    
    async def transcribe_audio(self, audio_data: bytes) -> Tuple[str, float, float]:
        """
        Transcribe audio data to text
        
        Returns:
            Tuple of (transcribed_text, confidence_score, processing_time)
        """
        start_time = time.time()
        
        try:
            if self.model is None:
                await self.initialize()
            
            # Convert bytes to audio array
            audio_array = self._bytes_to_audio_array(audio_data)
            
            # Preprocess audio
            audio_array = self._preprocess_audio(audio_array)
            
            # Run inference
            transcription = await self._run_inference(audio_array)
            
            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # For simplicity, we'll use a mock confidence score
            # In production, you'd calculate this from the model outputs
            confidence = 0.85
            
            logger.info(f"Transcription completed in {processing_time:.2f}ms: {transcription[:50]}...")
            
            return transcription, confidence, processing_time
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise
    
    def _bytes_to_audio_array(self, audio_data: bytes) -> np.ndarray:
        """Convert audio bytes to numpy array"""
        try:
            # Convert bytes to audio array using librosa
            audio_io = io.BytesIO(audio_data)
            audio_array, _ = librosa.load(audio_io, sr=self.sample_rate)
            return audio_array
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
            raise ValueError("Invalid audio data format")
    
    def _preprocess_audio(self, audio_array: np.ndarray) -> np.ndarray:
        """Preprocess audio for the model"""
        # Normalize audio
        if np.max(np.abs(audio_array)) > 0:
            audio_array = audio_array / np.max(np.abs(audio_array))
        
        # Ensure minimum length (pad if necessary)
        min_length = int(0.5 * self.sample_rate)  # 0.5 seconds minimum
        if len(audio_array) < min_length:
            audio_array = np.pad(audio_array, (0, min_length - len(audio_array)))
        
        return audio_array
    
    async def _run_inference(self, audio_array: np.ndarray) -> str:
        """Run model inference"""
        try:
            # Process audio
            input_values = self.processor(
                audio_array, 
                sampling_rate=self.sample_rate, 
                return_tensors="pt"
            ).input_values
            
            # Move to GPU if available
            if torch.cuda.is_available():
                input_values = input_values.cuda()
            
            # Run inference
            with torch.no_grad():
                logits = self.model(input_values).logits
            
            # Decode predictions
            predicted_ids = torch.argmax(logits, dim=-1)
            transcription = self.processor.decode(predicted_ids[0])
            
            # Clean up transcription
            transcription = self._clean_transcription(transcription)
            
            return transcription
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            raise
    
    def _clean_transcription(self, text: str) -> str:
        """Clean and normalize transcription"""
        # Remove extra whitespace
        text = " ".join(text.split())
        
        # Basic cleaning for Indonesian text
        text = text.strip()
        
        return text