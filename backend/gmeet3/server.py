from flask import Flask, render_template, jsonify, request, session, json
from utils import Transcriber
from chatbot import ChatBot
from gmeet import GoogleMeetRecorder
from datetime import datetime
from flask import send_file
import os
import secrets
import asyncio
from threading import Thread
from datetime import datetime

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # Diperlukan untuk session
print(app.secret_key)

utility = Transcriber()
bot = ChatBot()
bots = {}
# Variable kontrol untuk status perekaman
recording_started = False
recorder_instance = None  # ⬅️ Disimpan global untuk start/stop

@app.route('/')
def preindex():
    app.secret_key = secrets.token_hex(32)  # Reset setiap akses /preindex
    print(app.secret_key)
    session.clear()
    return render_template('preindex.html')

@app.route('/join-meet', methods=['POST'])
def handle_meet_request():
    """Menerima link Google Meet dari frontend dan menjalankan Selenium"""
    data = request.json
    meet_link = data.get("meet_url")
    print(f"Permintaan untuk bergabung dengan meeting: {meet_link}")
    
    if not meet_link:
        return jsonify({"error": "URL Google Meet diperlukan!"}), 400

    if meet_link in bots:
        return jsonify({"status": "Bot sudah berjalan untuk " + meet_link}), 200

    # Jalankan recorder di thread terpisah
    def run_recorder():
        try:
            recorder = GoogleMeetRecorder(meet_link)
            bots[meet_link] = {"status": "running", "start_time": datetime.now()}  # Perbaikan di sini
            asyncio.run(recorder.join_meet())
        except Exception as e:
            print(f"Error saat menjalankan bot untuk {meet_link}: {str(e)}")
        finally:
            # Hapus dari daftar bot aktif setelah selesai
            if meet_link in bots:
                del bots[meet_link]
    
    thread = Thread(target=run_recorder)
    thread.daemon = True  # Memastikan thread berhenti saat program utama berhenti
    thread.start()
    
    return jsonify({
        "status": "success", 
        "message": "Bot bergabung dengan meeting",
        "meet_url": meet_link
    }), 200
    
@app.route('/index', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        data = request.get_json()
        input1 = data.get("input1", "")
        session['GRIT'] = input1
        input2 = data.get("input2", "")
        session['JOBDESC'] = input2
        input3 = data.get("input3", "")
        session['JOBSPEC'] = input3

        return jsonify({
            "message": "Data berhasil diterima",
            "input1": input1,
            "input2": input2,
            "input3": input3
        })
    
    return render_template('index.html')

@app.route('/start-recording', methods=['POST'])
def start_recording_endpoint():
    global recording_started, recorder_instance
    if not recording_started:
        recording_started = True
        recorder_instance = GoogleMeetRecorder()  # ⬅️ Simpan instance

        def run_async_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(recorder_instance.record_and_transcribe())

        Thread(target=run_async_loop).start()
        return jsonify({"message": "Perekaman dimulai"}), 200
    else:
        return jsonify({"message": "Perekaman sudah berjalan"}), 400

@app.route('/stop-recording', methods=['POST'])
def stop_recording_endpoint():
    global recording_started, recorder_instance
    if recording_started and recorder_instance:
        recorder_instance.stop_recording()  # ⬅️ Panggil stop di instance yang aktif
        recording_started = False
        return jsonify({"message": "Perekaman dihentikan"}), 200
    else:
        return jsonify({"message": "Tidak ada perekaman yang sedang berjalan"}), 400


@app.route('/read-txt', methods=['GET'])
def read_txt_file():
    try:
        # Nama file yang akan dibaca
        file_path = 'hasil_terintegrasi.txt'  # Ganti dengan path file Anda

        # Membaca isi file
        with open(file_path, 'r') as file:
            file_content = file.read()

        # Mengembalikan isi file dalam format JSON
        return jsonify({"content": file_content})

    except FileNotFoundError:
        return jsonify({"content": "File not found"}), 404

    except Exception as e:
        return jsonify({"content": f"Error: {str(e)}"}), 500
    
@app.route('/gen-suggestion', methods=['GET', 'POST'])
def gen_suggestion():
    data = request.json
    file_path = "hasil_terintegrasi.txt"  # Pastikan path ini benar
    use_grit = data.get("useGrit", False)  # Ambil status checkbox

    try:
        # Baca isi file
        content = utility.read_txt_file(file_path)
        if not content:
            return jsonify({"error": "Failed to read file or file is empty."}), 400

        # Jika checkbox dicentang (use_grit == True)
        if use_grit:
            GRIT = session.get('GRIT')
            # print(GRIT)
            response = bot.generate_suggestion_with_grit(content, GRIT)
        else:
            response = bot.generate_suggestion_without_grit(content)

        return jsonify({'response': response}), 200

    except Exception as e:
        print(e)
        return jsonify({"error": f"An error occurred: {e}"}), 500


@app.route('/clear-transcription', methods=['POST'])
def clear_transcription():
    # Path ke file hasil transkripsi
    file_path = "hasil_terintegrasi.txt"

    try:
        # Panggil fungsi untuk membersihkan transkripsi
        success = utility.bersihkan_transkripsi(file_path)

        if success:
            return jsonify({"message": "Hasil transkripsi sudah dibersihkan."}), 200
        else:
            return jsonify({"message": "Gagal membersihkan hasil transkripsi."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/download-transcription', methods=['GET'])
def download_transcription():
    # Path ke file hasil transkripsi
    file_path = "hasil_terintegrasi.txt"

    try:
        # Generate nama file baru berdasarkan tanggal saat ini
        tanggal_sekarang = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        nama_file_baru = f"hasil_terintegrasi{tanggal_sekarang}.txt"

        # Kirim file ke user untuk diunduh
        return send_file(file_path, as_attachment=True, download_name=nama_file_baru, mimetype="text/plain")

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/get-decision', methods=['POST'])
def get_decision():
    file_path = "hasil_terintegrasi.txt"  # Pastikan path benar
    JOBDESC = session.get('JOBDESC', '')  # Default ke string kosong jika None
    JOBSPEC = session.get('JOBSPEC', '')

    try:
        print("JOBDESC:", JOBDESC)  # Debug
        print("JOBSPEC:", JOBSPEC)

        # Cek apakah file ada
        if not os.path.exists(file_path):
            return jsonify({'error': 'File transkripsi tidak ditemukan.'}), 400

        # Membaca isi file
        with open(file_path, 'r') as file:
            text = file.read()

        # Pisahkan teks menjadi baris-baris
        lines = text.split('\n')

        keywords_to_exclude = ['speaker', 'silence', '[hening]']
        cleaned_lines = [line for line in lines if not any(keyword in line.lower() for keyword in keywords_to_exclude)]

        # Gabungkan kembali menjadi teks bersih
        content = '\n'.join(cleaned_lines)

        # Validasi sebelum diproses
        if not content:
            return jsonify({'error': 'File transkripsi kosong.'}), 400
        if not JOBDESC.strip() or not JOBSPEC.strip():
            return jsonify({'error': 'JOBDESC atau JOBSPEC belum diatur dalam session.'}), 400

        # Generate similarity
        response = bot.cosine_similarity(content, JOBDESC, JOBSPEC)
        # Format hasil response sesuai kebutuhan
        formatted_text = f"""
        📌 Summary:
        {response["penjelasan"]}

        📌 Validasi:
        {response["validasi"]}

        🔹 Kecocokan dengan JobDesc: {response["Jobdesc"]}
        🔹 Kecocokan dengan JobSpec: {response["Jobspec"]}
        🔹 Kategori: {response["kategori"]}
        """

        # Simpan ke file .txt
        output_filename = "Decision.txt"
        output_filepath = os.path.join(os.path.dirname(file_path), output_filename)

        with open(output_filepath, "w", encoding="utf-8") as output_file:
            output_file.write(formatted_text)
        return jsonify({'response': response}), 200

    except Exception as e:
        print("Error terjadi:", e)  # Debugging
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@app.route('/download-decision', methods=['GET'])
def download_decision():
    # Path ke file hasil transkripsi
    file_path = "Decision.txt"

    try:
        # Generate nama file baru berdasarkan tanggal saat ini
        tanggal_sekarang = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        nama_file_baru = f"Decision_{tanggal_sekarang}.txt"

        # Kirim file ke user untuk diunduh
        return send_file(file_path, as_attachment=True, download_name=nama_file_baru, mimetype="text/plain")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)