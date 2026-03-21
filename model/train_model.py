import pandas as pd
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# -----------------------------
# LOAD DATA
# -----------------------------
file_path = os.path.join(os.path.dirname(__file__), "anime.csv")
df = pd.read_csv(file_path, encoding="latin1")

print("Dataset loaded:", df.shape)

# 🔥 USE MORE DATA (important)
df = df[['title', 'genres', 'themes', 'demographics', 'synopsis']]
df.dropna(inplace=True)

# -----------------------------
# CLEAN TEXT
# -----------------------------
df['tags'] = (
    df['genres'] + " " +
    df['themes'] + " " +
    df['demographics'] + " " +
    df['synopsis']
)

df['tags'] = df['tags'].str.lower()

# -----------------------------
# BETTER VECTORIZER 🔥
# -----------------------------
tfidf = TfidfVectorizer(max_features=10000, stop_words='english')
vectors = tfidf.fit_transform(df['tags'])

# -----------------------------
# SIMILARITY
# -----------------------------
similarity = cosine_similarity(vectors)

# -----------------------------
# CREATE TITLE INDEX MAP 🔥
# -----------------------------
title_to_index = {title.lower(): idx for idx, title in enumerate(df['title'])}

# -----------------------------
# SAVE
# -----------------------------
pickle.dump(similarity, open("similarity.pkl", "wb"))
pickle.dump(df, open("anime_data.pkl", "wb"))
pickle.dump(title_to_index, open("title_index.pkl", "wb"))

print("Model trained successfully!")