import asyncio
import os
import subprocess
import click
import datetime
import requests
from pydub import AudioSegment
import json
from utils import Transcriber

from time import sleep

import undetected_chromedriver as uc

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class GoogleMeetRecorder:
    def __init__(self, meet_link=None):
        self.meet_link = meet_link or os.getenv("GMEET_LINK")
        self.email = os.getenv("GMAIL_USER_EMAIL", "")
        self.password = os.getenv("GMAIL_USER_PASSWORD", "")
        self.max_wait_time = int(os.getenv("MAX_WAIT_TIME_IN_MINUTES", 5))
        self.driver = None
        self.transcriber = Transcriber()
        self.stop_event = asyncio.Event()  # <-- Event async untuk menghentikan

    def make_request(self, url, headers, method="GET", data=None, files=None):
        if method == "POST":
            response = requests.post(url, headers=headers, json=data, files=files)
        else:
            response = requests.get(url, headers=headers)
        return response.json()

    async def run_command_async(self, command):
        process = await asyncio.create_subprocess_shell(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        # Wait for the process to complete
        stdout, stderr = await process.communicate()

        return stdout, stderr

    async def google_sign_in(self):
        self.driver.get("https://accounts.google.com")

        sleep(1)
        email_field = self.driver.find_element(By.NAME, "identifier")
        email_field.send_keys(self.email)
        self.driver.save_screenshot("screenshots/email.png")

        sleep(2)
        self.driver.find_element(By.ID, "identifierNext").click()
        sleep(3)
        self.driver.save_screenshot("screenshots/password.png")

        password_field = self.driver.find_element(By.NAME, "Passwd")
        password_field.click()
        password_field.send_keys(self.password)
        password_field.send_keys(Keys.RETURN)

        sleep(5)

        try:
            # This will click the "Get a verification code at..." link (if needed)
            self.driver.find_element(By.XPATH, "//*[contains(text(), 'Get a verification code at')]").click()
            sleep(3)
            
            # Wait for phone number input field
            phone_input = WebDriverWait(driver, 10).until(
               EC.presence_of_element_located((By.XPATH, "//input[@type='tel']"))
            )

            # Enter full phone number (replace with your actual number)
            phone_input.send_keys("082112774927")

            # Click Send button
            send_button = driver.find_element(By.XPATH, "//button/span[text()='Send']/..")
            send_button.click()

            self.driver.save_screenshot("screenshots/requested_2fa_sms.png")
            print("📲 2FA SMS requested. Please check your phone.")
            self.driver.save_screenshot("screenshots/checkafter2fa.png")
            # Wait for the 2FA code input to appear
            input_box = None
            for _ in range(10):
                try:
                    input_box = self.driver.find_element(By.NAME, "idvPin")
                    break
                except:
                    sleep(1)

            if not input_box:
                print("❌ Could not locate the 2FA code input field.")
                return

            # Prompt user to input the code
            code = input("🔐 Enter the 2FA SMS code you received: ").strip()
            input_box.send_keys(code)
            input_box.send_keys(Keys.RETURN)

            sleep(5)
            self.driver.save_screenshot("screenshots/after_2fa.png")
        except Exception as e:
            print(f"No 2FA prompt or error handling it: {e}")

        # Final screen after login
        self.driver.save_screenshot("screenshots/signed_in.png")

    def setup_screenshots_folder(self):
        print("Cleaning screenshots")
        if os.path.exists("screenshots"):
            # for each file in the folder delete it
            for f in os.listdir("screenshots"):
                os.remove(f"screenshots/{f}")
        else:
            os.mkdir("screenshots")

    def setup_audio_drivers(self):
        print("starting virtual audio drivers")
        # find audio source for specified browser
        subprocess.check_output(
            "sudo rm -rf /var/run/pulse /var/lib/pulse /root/.config/pulse", shell=True
        )
        subprocess.check_output(
            "sudo pulseaudio -D --verbose --exit-idle-time=-1 --system --disallow-exit  >> /dev/null 2>&1",
            shell=True,
        )
        subprocess.check_output(
            'sudo pactl load-module module-null-sink sink_name=DummyOutput sink_properties=device.description="Virtual_Dummy_Output"',
            shell=True,
        )
        subprocess.check_output(
            'sudo pactl load-module module-null-sink sink_name=MicOutput sink_properties=device.description="Virtual_Microphone_Output"',
            shell=True,
        )
        subprocess.check_output(
            "sudo pactl set-default-source MicOutput.monitor", shell=True
        )
        subprocess.check_output("sudo pactl set-default-sink MicOutput", shell=True)
        subprocess.check_output(
            "sudo pactl load-module module-virtual-source source_name=VirtualMic",
            shell=True,
        )
        # Set volume 100% untuk sink dan source MicOutput
        subprocess.check_output("pactl set-sink-volume MicOutput 100%", shell=True)
        subprocess.check_output("pactl set-source-volume MicOutput.monitor 100%", shell=True)

    def setup_chrome_options(self):
        options = uc.ChromeOptions()

        options.add_argument("--window-size=1920x1080")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-setuid-sandbox")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-application-cache")
        options.add_argument("--disable-setuid-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        return options

    def setup_chrome_driver(self):
        log_path = "chromedriver.log"
        options = self.setup_chrome_options()
        self.driver = uc.Chrome(service_log_path=log_path, use_subprocess=False, options=options)
        self.driver.set_window_size(1920, 1080)

    async def join_meeting(self):
        if self.email == "" or self.password == "":
            print("No email or password specified")
            return

        print("Google Sign in")
        await self.google_sign_in()

        self.driver.get(self.meet_link)

        self.driver.execute_cdp_cmd(
            "Browser.grantPermissions",
            {
                "origin": self.meet_link,
                "permissions": [
                    "geolocation",
                    "audioCapture",
                    "displayCapture",
                    "videoCapture",
                    "videoCapturePanTiltZoom",
                ],
            },
        )

        print("screenshot")
        self.driver.save_screenshot("screenshots/initial.png")
        print("Done save initial")

        try:
            self.driver.find_element(
                By.XPATH,
                "/html/body/div/div[3]/div[2]/div/div/div/div/div[2]/div/div[1]/button",
            ).click()
            sleep(2)
        except:
            print("No popup")

        # disable microphone
        print("Disable microphone")

        sleep(10)
        missing_mic = False

        try:
            print("Try to dismiss missing mic")
            self.driver.find_element(By.CLASS_NAME, "VfPpkd-vQzf8d").find_element(By.XPATH, "..")
            sleep(2)
            # take screenshot

            self.driver.save_screenshot("screenshots/missing_mic.png")

            # save the webpage source html
            with open("screenshots/webpage.html", "w") as f:
                f.write(self.driver.page_source)

            missing_mic = True
        except:
            pass

        try:
            print("Allow Microphone")
            self.driver.find_element(
                By.XPATH,
                "/html/body/div/div[3]/div[2]/div/div/div/div/div[2]/div/div[1]/button",
            ).click()
            sleep(2)
            # take screenshot
            self.driver.save_screenshot("screenshots/allow_microphone.png")
            print("Done save allow microphone")
        except:
            print("No Allow Microphone popup")

        # if not missing_mic:
        try:
            print("Try to disable microphone")
            self.driver.find_element(
                By.XPATH,
                '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[1]/div[1]/div/div[6]/div[1]/div/div',
            ).click()
        except:
            print("No microphone to disable")

        sleep(2)

        self.driver.save_screenshot("screenshots/disable_microphone.png")
        print("Done save microphone")

        # disable microphone
        print("Disable camera")
        if not missing_mic:
            self.driver.find_element(
                By.XPATH,
                '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[1]/div[1]/div/div[6]/div[2]/div',
            ).click()
            sleep(2)
        else:
            print("assuming missing mic = missing camera")
        self.driver.save_screenshot("screenshots/disable_camera.png")
        print("Done save camera")
        try:
            self.driver.find_element(
                By.XPATH,
                '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[1]/div[3]/label/input',
            ).click()
            sleep(2)

            self.driver.find_element(
                By.XPATH,
                '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[1]/div[3]/label/input',
            ).send_keys("TEST")
            sleep(2)
            self.driver.save_screenshot("screenshots/give_non_registered_name.png")

            print("Done save name")
            sleep(5)
            self.driver.find_element(
                By.XPATH,
                '//*[@id="yDmH0d"]/c-wiz/div/div/div[14]/div[3]/div/div[2]/div[4]/div/div/div[2]/div[1]/div[2]/div[1]/div[1]/button/span',
            ).click()
            sleep(5)
        except:
            print("authentification already done")
            sleep(5)
            # take screenshot
            self.driver.save_screenshot("screenshots/authentification_already_done.png")
            print(self.driver.title)

            ask_to_join_btn = self.driver.find_element(
                By.XPATH,
                '//button[.//span[text()="Ask to join"]]'
            )
            ask_to_join_btn.click()
            self.driver.save_screenshot("screenshots/asked_to_join.png")
            sleep(5)

        # try every 5 seconds for a maximum of 5 minutes
        # current date and time
        
        return await self.wait_for_join()

    async def wait_for_join(self):
        now = datetime.datetime.now()
        max_time = now + datetime.timedelta(minutes=self.max_wait_time)
        joined = False

        while now < max_time and not joined:
            # take a snapshot of the current screen
            self.driver.save_screenshot("screenshots/join_poll.png")

            # 1) check for the "Leave call" button → if present, we're in the meeting
            try:
                self.driver.find_element(By.XPATH, '//button[@aria-label="Leave call"]')
                joined = True
                print("✅ Detected meeting interface — joined!")
                break
            except:
                pass

            # 2) dismiss any in-meeting popups
            try:
                self.driver.find_element(
                    By.XPATH,
                    "/html/body/div[1]/div[3]/span/div[2]/div/div/div[2]/div[1]/button",
                ).click()
                self.driver.save_screenshot("screenshots/removed_popup.png")
                print("🔔 Dismissed in-meeting popup")
            except:
                print("No in-meeting popup")

            # 3) wait a bit before retrying
            sleep(5)
            now = datetime.datetime.now()

        if not joined:
            print("⚠️  Timed out waiting to join the meeting.")
            return False
        else:
            print("🎉 Starting recording now…")
            return True

    async def record_and_transcribe(self, duration=7):
        while not self.stop_event.is_set():
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"recordings/output_{timestamp}.wav"

            print(f"🎬 Mulai merekam: {output_file}")
            record_command = f"ffmpeg -y -f pulse -i default -t {duration} -acodec pcm_s16le -ar 44100 -ac 2 {output_file}"

            await asyncio.gather(self.run_command_async(record_command))

            print(f"✅ Rekaman selesai: {output_file}")

            # ⏳ Transkripsi setelah rekaman
            try:
                self.transcriber.transkrip_dengan_diarization(output_file)
                print(f"📄 Transkripsi selesai untuk: {output_file}")
            except Exception as e:
                print(f"❌ Gagal transkripsi: {e}")
            finally:
                if os.path.exists(output_file):
                    os.remove(output_file)
                    print(f"🗑️ File dihapus: {output_file}")

        print("🛑 Perekaman dan transkripsi dihentikan.")

    # def convert_to_wav(self, mp4_path):
    #     audio = AudioSegment.from_file(mp4_path, format="mp4")
    #     wav_path = mp4_path.replace(".mp4", ".wav")
    #     audio.export(wav_path, format="wav")        
    #     # Hapus file MP4 setelah konversi
    #     if os.path.exists(mp4_path):
    #         os.remove(mp4_path)
    #         print(f"🗑️ File MP4 dihapus: {mp4_path}")

    #     return wav_path

    def stop_recording(self):
        self.stop_event.set()


    async def join_meet(self):
        if not self.meet_link:
            print("Error: No Google Meet link provided. Please provide a meet link.")
            return
        
        print(f"start recorder for {self.meet_link}")

        self.setup_screenshots_folder()
        self.setup_audio_drivers()
        self.setup_chrome_driver()

        joined = await self.join_meeting()
        # if joined:
        #     await self.record_and_transcribe()

        print("- End of work")

