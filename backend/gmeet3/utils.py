import os
from pyannote.audio import Pipeline
from dotenv import load_dotenv
from pydub import AudioSegment
from io import BytesIO
import requests # Impor library requests
import base64
from groq import Groq # Impor ini mungkin tidak lagi diperlukan jika Groq API tidak digunakan untuk transkripsi

load_dotenv()
# GROQ_API_KEY = os.getenv("GROQ_API_KEY") # Tidak diperlukan jika Groq tidak digunakan untuk transkripsi

# Inisialisasi Groq Client (pertahankan jika masih digunakan untuk tujuan lain)
# client = Groq(api_key=GROQ_API_KEY)

class Transcriber:
    def __init__(self):
        # Inisialisasi pipeline diarization
        self.diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.0",
            use_auth_token="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"
        )
        # URL endpoint API transkripsi lokal Anda
        endpoint_url: str = os.getenv("MODEL_URL", "") + "/audio/transcriptions"

        self.transcription_api_url = endpoint_url

    def read_txt_file(self, file_path):
        # Membaca isi file teks
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            return content
        except FileNotFoundError:
            print("Error: File tidak ditemukan.")
            return None
        except Exception as e:
            print(f"Terjadi kesalahan: {e}")
            return None

    def simpan_hasil_transkripsi(self, teks, nama_file="hasil_terintegrasi.txt"):
        # Menyimpan hasil transkripsi ke file teks
        try:
            with open(nama_file, "a", encoding="utf-8") as file:
                file.write(teks + "\n")
                print(f"Hasil transkripsi disimpan ke {nama_file}")
        except Exception as e:
            print(f"Terjadi kesalahan saat menyimpan hasil transkripsi: {e}")

    def bersihkan_transkripsi(self, nama_file="hasil_terintegrasi.txt"):
        # Membersihkan (mengosongkan) file transkripsi
        try:
            with open(nama_file, "w", encoding="utf-8") as file: # "w" untuk mengosongkan file
                pass # Tidak perlu menulis string kosong
            print(f"Hasil transkripsi dibersihkan.")
            return True # Menandakan berhasil
        except Exception as e:
            print(f"Terjadi kesalahan saat membersihkan hasil transkripsi: {e}")
            return False # Menandakan gagal

    # Fungsi untuk melakukan speaker diarization setelah transkripsi
    def transkrip_dengan_diarization(self, output_filename):
        print(f"Melakukan diarization pada {output_filename}")
        # Melakukan diarization audio
        diarization_result = self.diarization_pipeline({'uri': output_filename, 'audio': output_filename})

        # Memuat audio file
        audio = AudioSegment.from_file(output_filename)
        hasil_mentah = []

        # Iterasi melalui segmen yang terdiarization
        for turn, _, speaker in diarization_result.itertracks(yield_label=True):
            start_ms = int(turn.start * 1000)
            end_ms = int(turn.end * 1000)
            segmen_audio = audio[start_ms:end_ms]

            temp_buffer = BytesIO()
            segmen_audio.export(temp_buffer, format="wav")
            temp_buffer.seek(0) # Penting: reset posisi buffer ke awal

            try:
                # Menyiapkan file untuk permintaan POST
                files = {
                    'file': ('temp.wav', temp_buffer.read(), 'audio/wav')
                }

                # Menyiapkan data form untuk permintaan POST
                data = {
                    'model': 'whisper-large-v3',
                    'response_format': 'verbose_json',
                    'language': 'id'
                }

                # Melakukan panggilan API transkripsi menggunakan requests
                response = requests.post(self.transcription_api_url, files=files, data=data)

                # Memeriksa respons yang berhasil
                response.raise_for_status() # Akan menimbulkan HTTPError untuk respons 4xx/5xx

                # Mengurai respons JSON
                transcription_result = response.json()

                # Mengakses teks transkripsi dari respons JSON
                text = transcription_result.get('text', '').strip() # Gunakan .get() untuk keamanan

                if text != "":
                    hasil_mentah.append({
                        "start": turn.start,
                        "end": turn.end,
                        "speaker": speaker,
                        "text": text
                    })
            except requests.exceptions.RequestException as e:
                print(f"Transkripsi gagal untuk segmen {turn.start:.2f}-{turn.end:.2f} (Speaker {speaker}): {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"Kode status respons: {e.response.status_code}")
                    print(f"Teks respons: {e.response.text}")
            except Exception as e:
                print(f"Terjadi kesalahan tak terduga saat transkripsi segmen: {e}")

        # Urutkan berdasarkan waktu mulai
        hasil_mentah.sort(key=lambda x: x["start"])

        # Tambahkan segmen hening jika ada jeda antar segmen lebih dari 1 detik
        hasil_dengan_hening = []
        for i in range(len(hasil_mentah)):
            hasil_dengan_hening.append(hasil_mentah[i])

            if i < len(hasil_mentah) - 1:
                curr_end = hasil_mentah[i]["end"]
                next_start = hasil_mentah[i + 1]["start"]
                jeda = next_start - curr_end

                if jeda >= 1.0:
                    hasil_dengan_hening.append({
                        "start": curr_end,
                        "end": next_start,
                        "speaker": "SILENCE",
                        "text": "[Hening]"
                    })

        # Gabungkan transkripsi jika speaker sama dan waktunya berdekatan (<1 detik)
        hasil_final = []
        if hasil_dengan_hening:
            buffer = hasil_dengan_hening[0]
            for segmen in hasil_dengan_hening[1:]:
                if segmen["speaker"] == buffer["speaker"] and (segmen["start"] - buffer["end"]) < 1.0:
                    # Gabungkan segmen yang berdekatan dan sama speaker
                    buffer["end"] = segmen["end"]
                    buffer["text"] += " " + segmen["text"]
                else:
                    hasil_final.append(buffer)
                    buffer = segmen
            hasil_final.append(buffer)

        # Tulis hasil ke file teks
        with open("hasil_terintegrasi.txt", "a", encoding="utf-8") as f:
            for entry in hasil_final:
                f.write(f"Speaker {entry['speaker']}: {entry['start']:.2f} - {entry['end']:.2f}\n")
                f.write(f"{entry['text']}\n\n")


