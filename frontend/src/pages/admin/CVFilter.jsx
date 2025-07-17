import { useState, useRef, useEffect } from "react";
import axios from "axios";

const renderFormattedText = (text) => {
  if (!text) return "";

  let formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");

  const lines = formattedText.split("\n");

  return lines.map((line, index) => <span key={index} dangerouslySetInnerHTML={{ __html: line + (index < lines.length - 1 ? "<br/>" : "") }} />);
};

export default function CVFilter() {
  const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL || "http://localhost:8000";

  const loadSavedState = () => {
    try {
      const savedResults = localStorage.getItem("cvFilterResults");
      const savedMessages = localStorage.getItem("cvFilterChatMessages");
      const savedJobDesc = localStorage.getItem("cvFilterJobDesc");

      return {
        results: savedResults ? JSON.parse(savedResults) : null,
        chatMessages: savedMessages ? JSON.parse(savedMessages) : [],
        jobDesc: savedJobDesc || "",
      };
    } catch (error) {
      console.error("Error loading saved state:", error);
      return { results: null, chatMessages: [], jobDesc: "" };
    }
  };

  const savedState = loadSavedState();

  const [jobDesc, setJobDesc] = useState(savedState.jobDesc);
  const [manualKeywords, setManualKeywords] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [_, setTaskId] = useState(null);
  const [results, setResults] = useState(savedState.results);
  const [selectedCvIndex, setSelectedCvIndex] = useState(null);
  const [chatMessages, setChatMessages] = useState(savedState.chatMessages);
  const [chatInput, setChatInput] = useState("");
  const progressRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (results) {
      localStorage.setItem("cvFilterResults", JSON.stringify(results));
    }
    if (chatMessages.length > 0) {
      localStorage.setItem("cvFilterChatMessages", JSON.stringify(chatMessages));
    }
    if (jobDesc) {
      localStorage.setItem("cvFilterJobDesc", jobDesc);
    }
  }, [results, chatMessages, jobDesc]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jobDesc.trim()) {
      alert("Please provide both a ZIP file and job description");
      return;
    }

    setIsLoading(true);
    setLoadingStage("Uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("zip_file", file);
    formData.append("job_desc", jobDesc);
    if (manualKeywords.trim()) {
      formData.append("manual_keywords", manualKeywords);
    }

    try {
      const response = await axios.post(APP_BASE_URL + "/start-job", formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      const { task_id } = response.data;
      setTaskId(task_id);
      pollProgress(task_id);
    } catch (error) {
      console.error("Upload failed:", error);
      setIsLoading(false);
      alert("Failed to upload. Please try again.");
    }
  };

  const pollProgress = async (id) => {
    let tries = 0;
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(APP_BASE_URL + `/progress/${id}`);
        const data = response.data;

        if (data.stage) setLoadingStage(data.stage);
        if ("pct" in data) setProgress(data.pct);

        if (data.pct >= 100) {
          clearInterval(interval);
          setIsLoading(false);
          if (data.result) {
            setResults(data.result);
          }
        }
      } catch {
        if (++tries > 5) {
          clearInterval(interval);
          setIsLoading(false);
          alert("Failed to get progress updates. Please try again.");
        }
      }
    }, 800);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !results) return;

    const userMessage = chatInput.trim();
    setChatInput("");

    setChatMessages((prev) => [...prev, { sender: "user", text: userMessage }]);

    setChatMessages((prev) => [...prev, { sender: "assistant", text: "...", isTyping: true }]);

    try {
      const response = await axios.post(APP_BASE_URL + "/chat", {
        question: userMessage,
        cv_data: results.rank,
        cv_texts: results.texts,
        keywords: results.keywords || "",
        job_description: jobDesc,
      });

      console.log(response);
      setChatMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isTyping);
        return [...filtered, { sender: "assistant", text: response.data.response || "Sorry, I could not generate a response." }];
      });
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isTyping);
        return [...filtered, { sender: "assistant", text: "Sorry, there was an error processing your question." }];
      });
    }
  };

  const handlePreview = (index) => {
    setSelectedCvIndex(index);
  };

  const handleReset = () => {
    setFile(null);
    setJobDesc("");
    setManualKeywords("");
    setResults(null);
    setTaskId(null);
    setSelectedCvIndex(null);
    setChatMessages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    localStorage.removeItem("cvFilterResults");
    localStorage.removeItem("cvFilterChatMessages");
    localStorage.removeItem("cvFilterJobDesc");
  };

  return (
    <div className="h-full w-full p-8 left-10" style={{ backgroundColor: "#FFFDF6" }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">CV Filter for Interview</h2>

        {!results ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="zipInput" className="text-sm font-medium text-gray-700">
                  Upload ZIP (PDF CVs)
                </label>
                <div className="relative group">
                  <input id="zipInput" ref={fileInputRef} type="file" accept=".zip" required onChange={handleFileChange} className="absolute inset-0 z-10 opacity-0 cursor-pointer peer" />
                  <div className="flex items-center justify-between w-full border-2 border-dashed border-gray-300 rounded-xl p-4 h-14 bg-white/50 group-hover:border-blue-500 transition-colors">
                    <span className="text-sm text-gray-500">{file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : "Drag & drop or click to select a ZIP file..."}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="desc" className="text-sm font-medium text-gray-700">
                  Job Description / Keywords
                </label>
                <textarea
                  id="desc"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  rows="6"
                  required
                  className="w-full border border-gray-300 rounded-xl p-3 resize-none focus:outline-none focus:ring focus:ring-blue-200"
                  placeholder="Enter job description or keywords..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="manualKeywords" className="text-sm font-medium text-gray-700">
                  (Optional) Add Manual Keywords
                </label>
                <textarea
                  id="manualKeywords"
                  value={manualKeywords}
                  onChange={(e) => setManualKeywords(e.target.value)}
                  rows="3"
                  className="w-full border border-gray-300 rounded-xl p-3 resize-none focus:outline-none focus:ring focus:ring-blue-200"
                  placeholder="Add additional keywords separated by commas..."
                />
                <p className="text-xs text-gray-600">
                  If filled, the system will <strong>combine</strong> these words with AI results.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !file}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed font-semibold tracking-wide"
              >
                <span>Analyze Candidates</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div class="flex items-center gap-2 bg-blue-100 border-l-4 border-blue-400 p-3 rounded">
                <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <span class="text-blue-800 text-sm font-medium">
                  {" "}
                  CV Assistant hanya menyimpan <strong>maksimal 20 CV dan 200 teks teratas</strong> untuk efisiensi penyimpanan.{" "}
                </span>
              </div>
              <button onClick={handleReset} className="bg-green-200 hover:bg-green-300 text-green-800 px-4 py-2 rounded-lg transition">
                Start New Analysis
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4 lg:col-span-1 overflow-auto h-[calc(100vh-280px)] max-h-[640px]">
                <h4 className="font-semibold mb-3 text-gray-700">CV Rankings</h4>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Rank</th>
                      <th className="p-2 text-left">File</th>
                      <th className="p-2 text-left">Score</th>
                      <th className="p-2 text-left">OCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.rank.map((cv, idx) => (
                      <tr key={idx} className={`border-b hover:bg-blue-50 ${selectedCvIndex === idx ? "bg-blue-100" : ""}`}>
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{cv.file}</td>
                        <td className="p-2">{cv.final_score.toFixed(3)}</td>
                        <td className="p-2">
                          <button onClick={() => handlePreview(idx)} className="text-blue-600 hover:text-blue-800">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 lg:col-span-2 flex flex-col h-[calc(100vh-280px)] max-h-[640px]">
                {selectedCvIndex !== null ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700">{results.rank[selectedCvIndex].file}</h4>
                      <button onClick={() => setSelectedCvIndex(null)} className="text-gray-500 hover:text-gray-700">
                        Close
                      </button>
                    </div>
                    <div className="overflow-auto flex-grow bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-3">Keywords in this CV:</h5>
                      <div className="mb-4 flex flex-wrap gap-1">
                        {results.rank[selectedCvIndex].keywords_for_tfidf ? (
                          results.rank[selectedCvIndex].keywords_for_tfidf
                            .split(/[\n\s,]+/)
                            .filter((kw) => kw.trim())
                            .map((keyword, kidx) => (
                              <span key={kidx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {keyword}
                              </span>
                            ))
                        ) : (
                          <span className="text-gray-500 text-sm">No specific keywords found</span>
                        )}
                      </div>
                      <hr className="my-3" />
                      <h5 className="font-medium text-gray-700 mb-2">CV Content:</h5>
                      <pre className="whitespace-pre-wrap text-sm">{results.texts[results.rank[selectedCvIndex].file]}</pre>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="font-semibold mb-3 text-gray-700">AI Assistant</h4>
                    <div className="flex-grow overflow-auto bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="flex flex-col gap-3">
                        {chatMessages.length === 0 ? (
                          <p className="text-gray-500 text-center my-4">Ask questions about the candidates or the analysis</p>
                        ) : (
                          chatMessages.map((msg, idx) => (
                            <div key={idx} className={`p-3 rounded-lg max-w-[80%] ${msg.sender === "user" ? "bg-blue-100 ml-auto" : "bg-white border border-gray-200"}`}>
                              {msg.isTyping ? (
                                <div className="flex gap-1 justify-center items-center h-6">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                </div>
                              ) : (
                                <p className="text-sm">{renderFormattedText(msg.text)}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about the candidates..."
                        className="flex-grow border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                      />
                      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        Send
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h4 className="font-semibold mb-2 text-gray-700">Top Keywords</h4>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {Array.isArray(results.keywords)
                  ? results.keywords.join(", ")
                  : typeof results.keywords === "string"
                  ? results.keywords
                      .split(/[\n\s]+/)
                      .filter((kw) => kw.trim())
                      .join(", ")
                  : "No keywords available"}
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 w-64">
            <svg className="h-12 w-12 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-center text-sm font-medium text-gray-700">{loadingStage}</p>
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div ref={progressRef} className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
