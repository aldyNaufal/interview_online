import httpx
import re
from fastapi.responses import JSONResponse

async def get_optimized_keywords(job_description: str) -> str:
    prompt = (
        "Anda adalah sistem ekstraksi kata kunci yang sangat presisi. "
        "Dari deskripsi pekerjaan berikut, hasilkan daftar 25 kata kunci (keywords) yang paling relevan "
        "untuk menyaring CV. Fokus pada hard skills, tools, dan kualifikasi inti.\n\n"
        "ATURAN OUTPUT (WAJIB DIPATUHI):\n"
        "1. Format: Daftar kata kunci dipisahkan koma dan spasi (contoh: python, java, sql).\n"
        "2. Isi: Hanya berisi kata kunci, tanpa nomor, tanpa penjelasan, tanpa kalimat pembuka/penutup.\n"
        "3. Gaya: Semua huruf kecil, gunakan bentuk dasar kata (lemma), satu kata per keyword jika memungkinkan.\n"
        "4. Jumlah: Harus ada sekitar 25 kata kunci.\n\n"
        f"DESKRIPSI PEKERJAAN:\n---\n{job_description}\n---\n"
        "KATA KUNCI:"
    )

    headers = {
        "Content-Type": "application/json",
    }
    
    data = {
        "messages": [{"role": "user", "content": prompt}],
        "mode": "instruct",
        "temperature": 0.01, 
        "top_p": 0.1,       
        "max_tokens": 256,   
        "context": 4096
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://pe.spil.co.id/kobold/v1/chat/completions",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            result = response.json()
            
            raw_keywords = result["choices"][0]["message"]["content"].strip()
            
            cleaned_keywords = re.sub(r'[^a-z, ]', '', raw_keywords.lower())
            
            keyword_list = [keyword.strip() for keyword in cleaned_keywords.split(',') if keyword.strip()]
            
            unique_keywords = list(dict.fromkeys(keyword_list))
            
            return ", ".join(unique_keywords)

    except httpx.RequestError as e:
        return f"Error Jaringan: Gagal terhubung ke API LLM. Detail: {str(e)}"
    except httpx.HTTPStatusError as e:
        return f"Error API: Server memberikan respons error {e.response.status_code}. Detail: {e.response.text}"
    except (KeyError, IndexError) as e:
        return f"Error Respons: Format data dari API tidak valid. Detail: {str(e)}"
    except Exception as e:
        return f"Error tidak terduga: {str(e)}"
    

async def chatbot(question, cv_data, cv_texts, keywords, job_description):
    context = f"""
    AI CV Ranking Assistant | Keywords: {keywords}
    
    Job Description: {job_description}

    Top 20 CV Rankings:
    """
    
    top_cvs = cv_data[:20] if len(cv_data) > 20 else cv_data
    for i, cv in enumerate(top_cvs, 1):
        cv_file = cv.get('file', 'Unknown')
        cv_score = cv.get('final_score', 0)
        cv_keywords = cv.get('keywords_for_tfidf', '')
        
        cv_text = cv_texts.get(cv_file, '')
        cv_excerpt = cv_text[:300] + "..." if len(cv_text) > 300 else cv_text
        
        context += f"{i}. {cv_file} | Score: {cv_score:.3f} | Keywords: {cv_keywords}\n"
        context += f"   Excerpt: {cv_excerpt}\n\n"

    context += f"""
    Total CV: {len(cv_data)}
    
    Anda adalah asisten AI untuk HR dalam analisis CV. Gunakan data ranking dan teks CV di atas untuk menjawab pertanyaan.
    Berikan jawaban yang ringkas, fokus pada analisis kandidat dan rekomendasi.
    
    PERTANYAAN: {question}
    """
    
    headers = {"Content-Type": "application/json"}
    chat_data = {
        "messages": [{"role": "user", "content": context}],
        "mode": "instruct",
        "context": 4096,
        "max_tokens": 2048
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "http://pe.spil.co.id/kobold/v1/chat/completions",
            headers=headers,
            json=chat_data
        )
        response.raise_for_status()
        result = response.json()
        ai_response = result["choices"][0]["message"]["content"].strip()
        
    return JSONResponse({"response": ai_response})