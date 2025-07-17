from pathlib import Path
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import zipfile
import shutil
from sentence_transformers import SentenceTransformer
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from filter_cv.ocr import extract_text_pdf

sbert_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

progress_store: dict[str, dict] = {}

def doc_embedding(text):
    return sbert_model.encode(text)

def rank_cvs_hybrid(cv_dir: Path, optimized_keywords: str, job_desc: str ,lang="eng"):
    pdfs = sorted(cv_dir.glob("*.pdf"))
    with ThreadPoolExecutor(max_workers=4) as executor:
        texts = list(executor.map(lambda f: extract_text_pdf(f, lang=lang), pdfs))

    corpus = texts + [optimized_keywords]
    vectorizer = TfidfVectorizer(max_features=20000, ngram_range=(1,2))
    X = vectorizer.fit_transform(corpus)
    
    cv_vecs = X[:-1]
    jd_vec = X[-1]
    tfidf_sims = cosine_similarity(cv_vecs, jd_vec).ravel()

    jd_embed = doc_embedding(job_desc)
    cv_embeds = [doc_embedding(t) for t in texts]
    embed_sims = [cosine_similarity([v], [jd_embed])[0,0] if np.linalg.norm(v)!=0 else 0 for v in cv_embeds]

    alpha = 0.7
    final_sims = alpha * tfidf_sims + (1 - alpha) * np.array(embed_sims)

    kw_list = [k.strip().lower() for k in optimized_keywords.split(",") if k.strip()]
    kw_set = set(kw_list)

    hits = []
    matched_keywords_per_cv = [] 
    
    for idx, text in enumerate(texts):
        words = set(t.lower() for t in text.split())
        matched = kw_set & words
        
        matched_keywords_per_cv.append(", ".join(sorted(matched)) if matched else "")
        
        for kw in matched:
            hits.append({"cv": idx, "keyword": kw})

    df = pd.DataFrame({
        "file": [p.name for p in pdfs],
        "keywords_for_tfidf": matched_keywords_per_cv,  
        "tfidf_score": tfidf_sims,
        "embed_score": embed_sims,
        "final_score": final_sims,
        "preview": [t[:300].replace("\n", " ") for t in texts]
    }).sort_values("final_score", ascending=False).reset_index(drop=True)

    return df, kw_list, hits


def calculate_scores(cv_texts: list[str], pdf_names: list[str], keywords: str, job_desc: str):
    corpus = cv_texts + [keywords]
    vectorizer = TfidfVectorizer(max_features=20000, ngram_range=(1, 2))
    X = vectorizer.fit_transform(corpus)
    
    cv_vecs, jd_vec = X[:-1], X[-1]
    tfidf_sims = cosine_similarity(cv_vecs, jd_vec).ravel()

    jd_embed = doc_embedding(job_desc)
    cv_embeds = [doc_embedding(t) for t in cv_texts]
    embed_sims = [cosine_similarity([v], [jd_embed])[0, 0] if np.linalg.norm(v) != 0 else 0 for v in cv_embeds]

    alpha = 0.7
    final_sims = alpha * tfidf_sims + (1 - alpha) * np.array(embed_sims)

    kw_list = [k.strip().lower() for k in keywords.split(",") if k.strip()]
    kw_set = set(kw_list)

    hits = []
    matched_keywords_per_cv = []  
    
    for idx, text in enumerate(cv_texts):
        words = set(t.lower() for t in text.split())
        matched = kw_set & words
        
        matched_keywords_per_cv.append(", ".join(sorted(matched)) if matched else "")
        
        for kw in matched:
            hits.append({"cv": idx, "keyword": kw})

    df = pd.DataFrame({
        "file": pdf_names,
        "full_text": cv_texts,  
        "keywords_for_tfidf": matched_keywords_per_cv, 
        "tfidf_score": tfidf_sims,
        "embed_score": embed_sims,
        "final_score": final_sims,
        "job_desc": job_desc,
    }).sort_values("final_score", ascending=False).reset_index(drop=True)
    
    return df, kw_list, hits

def run_pipeline(task_id, zip_path: Path, optimized_keywords: str, job_desc: str):
    def step(p, s): progress_store[task_id] = {"pct": p, "stage": s}

    step(5, "unzip")
    cv_dir = zip_path.parent / "data_cv"
    zipfile.ZipFile(zip_path).extractall(cv_dir)

    pdfs = sorted(cv_dir.glob("*.pdf"))
    pdf_names = [p.name for p in pdfs]
    total = max(len(pdfs), 1)
    texts = []

    step(20, "OCR (20%)")
    for i, pdf in enumerate(pdfs, start=1):
        texts.append(extract_text_pdf(pdf, lang="eng"))
        pct = 20 + int(i / total * 60)
        step(pct, f"OCR ({pct}%)")

    step(80, "Rank (80%)")
    df, kw, hits = calculate_scores(texts, pdf_names, optimized_keywords, job_desc)

    step(100, "Done (100%)")
    progress_store[task_id]["result"] = {
        "rank": df.drop(columns=["full_text"]).to_dict(orient="records"),
        "texts": dict(zip(pdf_names, texts)),
        "keywords": kw,
        "edges": hits,
        "optimized_keywords": optimized_keywords,
        "job_description": job_desc
    }
    shutil.rmtree(zip_path.parent, ignore_errors=True)