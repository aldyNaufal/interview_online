from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, util
import os
import numpy as np
import faiss
from typing import Optional, List, Any
from langchain_core.callbacks import CallbackManagerForLLMRun
import requests
from langchain.llms.base import LLM
import json
import textwrap

load_dotenv()

# Tambahkan ini sebelum inisialisasi
ChatGroq.model_rebuild()
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

class GemmaLLM(LLM):
    endpoint_url: str = os.getenv("MODEL_URL", "") + "/chat/completions"

    def _call(self,
              prompt: str,
              stop: Optional[List[str]] = None,
              run_manager: Optional[CallbackManagerForLLMRun] = None,
              **kwargs: Any) -> str:
              
        headers = {
            "Content-Type": "application/json",
        }

        payload = {
            "messages": [{"role": "user", "content": prompt}],
        }

        response = requests.post(self.endpoint_url, json=payload, headers=headers)
        response.raise_for_status()
        json_data = response.json()
        print("INVOKEEEEEEEE LLM")
        # print(json_data)
        # json_string = json.dumps(json_data)
        # print(json_string)
        print(json_data['choices'][0]['message']['content'])
        return json_data['choices'][0]['message']['content']

    @property
    def _llm_type(self) -> str:
        return "gemma"

class ChatBot:
    def __init__(self):
        # Initialize the ChatGroq model using the provided API key and a specific model.
        
        self.llm = GemmaLLM()
        self.default_suggestion_system_prompt = "You are a helpful assistant that receives text input in Indonesian and designed to support interviewers. Given the conversation text provided, generate up to 2 insightful follow-up questions using indonesian language. These questions should help the interviewer explore the candidate's experience, problem-solving abilities, or other relevant areas more deeply. Ensure the questions are relevant, concise, and written in Indonesian to suit the context."
        
        # Define the prompt template for generating formatted-text.
        self.gen_format_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an assistant that helps structure conversations in Indonesian into a question-and-answer format. Given unstructured conversation text, convert each dialogue into relevant question-and-answer pairs. Ensure the final output is clear, concise, and well-structured in Indonesian."
                ),
                (
                    "human",
                    "Input:\n{text}\nPlease convert this text into a structured question-and-answer format. Ensure that each relevant dialogue is paired into a clear Q&A format."
                )
            ]
        )
        self.gen_summary_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an expert assistant in summarizing interview transcripts in Indonesian. "
                    "Given an unstructured interview transcript, generate a CLEAN and WELL-FORMATTED summary with a clear structure. "
                    "Use Markdown formatting, and if appropriate, include emojis for each section to enhance readability. "
                    "Each interview may contain different key points, so extract and summarize only the important and relevant information found in the text."
                ),
                (
                    "human",
                    "Input:\n{text}\n\nPlease create a structured and well-organized summary based on the interview transcript above."
                )
            ]
        )

        # Define the prompt template for validating arguement.
        self.gen_validation_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an assistant who can validate text conversation in Indonesian, you can give an opinion regarding the statement in the conversation, if the statement is not true then say that the argument is wrong and you give the correct answer, and if the argument is only incomplete that doesn't mean it is wrong, you just add the shortcomings."
                ),
                (
                    "human",
                    "Input:\n{text}\nplease analyze the text then validate whether what is said in the text is wrong or not."
                )
            ]
        )


        # Create a suggestion generation chain by combining the template and the model.
        self.generate_format_chain = self.gen_format_template | self.llm
        self.generate_validation_chain = self.gen_validation_template | self.llm
        self.generate_summary_chain = self.gen_summary_template | self.llm

    def generate_suggestion_without_grit(self, text):
        full_system_prompt = self.default_suggestion_system_prompt
        gen_suggestion_without_grit_template = ChatPromptTemplate.from_messages(
            [
                ("system", full_system_prompt),  # System message yang sudah diperbarui
                ("human", f"Input:\n{text}\nnPlease analyze this conversation and generate follow-up questions based on the interview flow.")
            ]
        )

        # Buat chain dengan template dinamis
        generate_suggestion_without_grit_chain = gen_suggestion_without_grit_template | self.llm
        
        # Invoke chain
        response = generate_suggestion_without_grit_chain.invoke({'text': text})
        print("resp ===============================================")
        print(response)
        return response

    def generate_suggestion_with_grit(self, text, additional_prompt=""):

        grit_questions = textwrap.dedent("""
    Integrity:
        Keberanian: Pernahkah Anda membuat keputusan yang tidak populer, tapi benar?
        Ketangguhan: Bagaimana Anda tetap berjuang saat menghadapi hambatan besar?
        Inisiatif: Ceritakan saat Anda mengambil inisiatif tanpa instruksi.
        Kegigihan: Pernahkah Anda gagal, tapi tetap gigih hingga berhasil?

    Customer Oriented:
        Keberanian: Pernahkah Anda mengambil keputusan sulit untuk memenuhi kebutuhan pelanggan meskipun itu bertentangan dengan kebijakan umum?
        Ketangguhan: Bagaimana Anda menangani pelanggan yang sulit tetapi tetap menjaga pelayanan yang baik?
        Inisiatif: Ceritakan tentang saat Anda mengambil inisiatif untuk meningkatkan kepuasan pelanggan tanpa menunggu arahan.
        Kegigihan: Pernahkah Anda menghadapi pelanggan yang tidak puas, dan bagaimana Anda tetap gigih sampai mereka puas?

    Competitive:
        Keberanian: Pernahkah Anda mengambil risiko besar untuk mencapai target atau memenangkan persaingan di pekerjaan?
        Ketangguhan: Bagaimana Anda terus berjuang untuk tetap unggul meski menghadapi persaingan yang ketat?
        Inisiatif: Ceritakan momen ketika Anda mengambil langkah proaktif untuk mengalahkan pesaing di pasar atau proyek.
        Kegigihan: Bagaimana Anda tetap gigih untuk memenangkan kompetisi meskipun mengalami kegagalan di awal?

    Team Work:
        Keberanian: Pernahkah Anda berbicara terbuka untuk menyampaikan pendapat berbeda dalam tim demi mencapai hasil yang lebih baik?
        Ketangguhan: Bagaimana Anda tetap bekerja sama secara efektif dengan tim ketika ada konflik atau tekanan tinggi?
        Inisiatif: Ceritakan saat Anda mengambil inisiatif untuk membantu tim mencapai tujuan tanpa diminta.
        Kegigihan: Pernahkah tim Anda menghadapi kegagalan, dan bagaimana Anda terus mendorong tim untuk bangkit dan berhasil?

    Visioner:
        Keberanian: Pernahkah Anda mengambil keputusan visioner yang belum diterima tim atau perusahaan, dan bagaimana Anda meyakinkan mereka?
        Ketangguhan: Bagaimana Anda tetap fokus pada visi jangka panjang meskipun menghadapi tantangan besar di sepanjang jalan?
        Inisiatif: Ceritakan momen ketika Anda mengambil inisiatif untuk mengarahkan tim atau perusahaan menuju inovasi yang lebih baik.
        Kegigihan: Bagaimana Anda tetap gigih dalam mewujudkan visi Anda, meskipun awalnya mendapatkan banyak hambatan atau penolakan?
""")


        # Gabungkan prompt default dengan tambahan user
        full_system_prompt = self.default_suggestion_system_prompt + "Make sure the questions at the beginning to assess how persistent the candidate is based on their answers in the interview based on the following GRIT: " + grit_questions+ "and the response must be neatly formatted with new lines and so on."

        # Membuat prompt template secara dinamis
        gen_suggestion_with_grit_template = ChatPromptTemplate.from_messages(
            [
                ("system", full_system_prompt),  # System message yang sudah diperbarui
                ("human", f"Input:\n{text}\nnPlease analyze this conversation and generate follow-up questions based on the interview flow.")
            ]
        )

        # Buat chain dengan template dinamis
        generate_suggestion_with_grit_chain = gen_suggestion_with_grit_template | self.llm
        
        # Invoke chain
        response = generate_suggestion_with_grit_chain.invoke({'text': text})
        print("RESP ==================================================")
        print(response)
        return response
    
    def generate_format(self, text):
        # Invoke the suggestion generation chain with the provided text and return the response.
        response = self.generate_format_chain.invoke({'text':text})
        return response
    
    def generate_validation(self, text):
        # Invoke the suggestion generation chain with the provided text and return the response.
        response = self.generate_validation_chain.invoke({'text':text})
        return response
    
    def generate_summary(self, text):
        # Invoke the suggestion generation chain with the provided text and return the response.
        response = self.generate_summary_chain.invoke({'text':text})
        return response
    
    def determine_category(self, sim_jobdesc, sim_jobspec):
        average_score = (sim_jobdesc + sim_jobspec) / 2

        if average_score >= 70:
            return "Considered ✅"
        elif 40 <= average_score < 70:
            return "Bucket List 📌"
        else:
            return "Disconsidered ❌"


    
    def cosine_similarity(self, transkripsi, jobdesc, jobspec):
        # Load model
        model = SentenceTransformer('sentence-transformers/all-MiniLM-L12-v2')

        # Generate penjelasan yang lebih dinamis
        summary = self.generate_summary(transkripsi)

        # Encode teks menjadi vektor
        vec_jobdesc = model.encode([jobdesc])
        vec_jobspec = model.encode([jobspec])
        vec_transkripsi = model.encode([transkripsi])  # atau bisa pakai summary jika ingin ringkasan

        # Fungsi normalisasi
        def normalize(x):
            return x / np.linalg.norm(x, axis=1, keepdims=True)

        # Normalisasi vektor
        vec_db = normalize(np.vstack([vec_jobdesc, vec_jobspec]))
        vec_query = normalize(vec_transkripsi)

        # FAISS Index
        dimension = vec_db.shape[1]
        index = faiss.IndexFlatIP(dimension)
        index.add(vec_db)

        # Cari kemiripan top-2
        similarities, indices = index.search(vec_query, k=2)

        # Ambil hasil kemiripan
        sim_jobdesc = similarities[0][indices[0].tolist().index(0)] * 100
        sim_jobspec = similarities[0][indices[0].tolist().index(1)] * 100

        # Cetak
        print("Hasil Kemiripan Interview:")
        print(f"- Job Description: {sim_jobdesc:.2f}%")
        print(f"- Job Specification: {sim_jobspec:.2f}%")

        # Tentukan kategori (misalnya berdasarkan nilai yang lebih tinggi)
        kategori = self.determine_category(sim_jobdesc, sim_jobspec)

        # Generate validasi
        validation = self.generate_validation(transkripsi)

        return {
            "Jobdesc": f"{sim_jobdesc:.2f}%",
            "Jobspec": f"{sim_jobspec:.2f}%",
            "kategori": kategori,
            "penjelasan": summary,
            "validasi": validation
        }
