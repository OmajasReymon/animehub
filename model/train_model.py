import os
import pickle
import re

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.neighbors import NearestNeighbors


BASE_DIR = os.path.dirname(__file__)
DATASET_PATH = os.path.join(BASE_DIR, "anime.csv")
SIMILARITY_PATH = os.path.join(BASE_DIR, "similarity.pkl")
ANIME_DATA_PATH = os.path.join(BASE_DIR, "anime_data.pkl")
TITLE_INDEX_PATH = os.path.join(BASE_DIR, "title_index.pkl")
MODEL_RESULTS_PATH = os.path.join(BASE_DIR, "model_results.csv")
MODEL_INFO_PATH = os.path.join(BASE_DIR, "model_info.pkl")

TOP_NEIGHBORS_TO_SAVE = 50
EVAL_TOP_K = 10
EVAL_SAMPLE_SIZE = 1000
RANDOM_STATE = 42

TEXT_COLUMNS = [
    "title",
    "title_english",
    "genres",
    "themes",
    "demographics",
    "studios",
    "type",
    "status",
    "synopsis",
]

DISPLAY_COLUMNS = [
    "mal_id",
    "title",
    "title_english",
    "type",
    "episodes",
    "status",
    "score",
    "rank",
    "popularity",
    "members",
    "favorites",
    "genres",
    "themes",
    "demographics",
    "studios",
    "year",
    "url",
]

MODEL_CONFIGS = [
    {
        "name": "TF-IDF Unigram",
        "vectorizer_class": TfidfVectorizer,
        "params": {
            "max_features": 20000,
            "stop_words": "english",
            "ngram_range": (1, 1),
            "min_df": 2,
        },
    },
    {
        "name": "TF-IDF Bigram",
        "vectorizer_class": TfidfVectorizer,
        "params": {
            "max_features": 30000,
            "stop_words": "english",
            "ngram_range": (1, 2),
            "min_df": 2,
        },
    },
    {
        "name": "Count Bigram",
        "vectorizer_class": CountVectorizer,
        "params": {
            "max_features": 30000,
            "stop_words": "english",
            "ngram_range": (1, 2),
            "min_df": 2,
        },
    },
]


def normalize_text(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""

    text = str(value).lower()
    text = re.sub(r"[^a-z0-9,\s]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_token_set(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return frozenset()

    tokens = []

    for part in str(value).split(","):
        token = normalize_text(part)
        if token:
            tokens.append(token)

    return frozenset(tokens)


def build_tags(dataframe):
    weighted_genres = dataframe["genres"] + " " + dataframe["genres"]

    tags = (
        dataframe["title"] + " "
        + dataframe["title_english"] + " "
        + weighted_genres + " "
        + dataframe["themes"] + " "
        + dataframe["demographics"] + " "
        + dataframe["studios"] + " "
        + dataframe["type"] + " "
        + dataframe["status"] + " "
        + dataframe["synopsis"]
    )

    return tags.apply(normalize_text)


def load_dataset():
    dataframe = pd.read_csv(DATASET_PATH, encoding="latin1")

    for column in TEXT_COLUMNS + DISPLAY_COLUMNS:
        if column not in dataframe.columns:
            dataframe[column] = ""

    dataframe = dataframe.copy()

    for column in TEXT_COLUMNS:
        dataframe[column] = dataframe[column].fillna("").astype(str)

    dataframe["title"] = dataframe["title"].str.strip()
    dataframe = dataframe[dataframe["title"] != ""].copy()

    dataframe["tags"] = build_tags(dataframe)
    dataframe = dataframe[dataframe["tags"].str.len() > 0].copy()

    dataframe["score_numeric"] = pd.to_numeric(dataframe["score"], errors="coerce")
    dataframe["members_numeric"] = pd.to_numeric(dataframe["members"], errors="coerce")
    genre_tokens = dataframe["genres"].apply(parse_token_set)
    theme_tokens = dataframe["themes"].apply(parse_token_set)
    demographic_tokens = dataframe["demographics"].apply(parse_token_set)
    dataframe["metadata_tokens"] = [
        genre | theme | demographic
        for genre, theme, demographic in zip(
            genre_tokens,
            theme_tokens,
            demographic_tokens,
        )
    ]

    dataframe.reset_index(drop=True, inplace=True)
    return dataframe


def build_neighbors(vectors, top_k):
    if vectors.shape[0] < 2:
        raise ValueError("Need at least two anime entries to build recommendations.")

    neighbor_count = min(top_k + 1, vectors.shape[0])
    model = NearestNeighbors(metric="cosine", algorithm="brute", n_neighbors=neighbor_count)
    model.fit(vectors)

    distances, indices = model.kneighbors(vectors, return_distance=True)

    max_neighbors = min(top_k, vectors.shape[0] - 1)
    neighbor_indices = np.full((vectors.shape[0], max_neighbors), -1, dtype=np.int32)
    neighbor_scores = np.zeros((vectors.shape[0], max_neighbors), dtype=np.float32)

    for row_index, candidate_indices in enumerate(indices):
        write_position = 0

        for candidate_index, distance in zip(candidate_indices, distances[row_index]):
            if candidate_index == row_index:
                continue

            if write_position >= max_neighbors:
                break

            neighbor_indices[row_index, write_position] = int(candidate_index)
            neighbor_scores[row_index, write_position] = np.float32(max(0.0, 1.0 - float(distance)))
            write_position += 1

    return neighbor_indices, neighbor_scores


def evaluate_recommender(dataframe, neighbor_indices, top_k, sample_size, random_state):
    eligible_indices = [
        idx
        for idx, tokens in enumerate(dataframe["metadata_tokens"])
        if tokens and np.any(neighbor_indices[idx] >= 0)
    ]

    if not eligible_indices:
        return {
            "hit_rate_at_k": 0.0,
            "mean_overlap_at_k": 0.0,
            "mean_jaccard_at_k": 0.0,
            "evaluated_items": 0,
        }

    rng = np.random.default_rng(random_state)
    sample_count = min(sample_size, len(eligible_indices))
    sampled_indices = rng.choice(eligible_indices, size=sample_count, replace=False)

    hit_scores = []
    overlap_scores = []
    jaccard_scores = []

    for query_index in sampled_indices:
        query_tokens = dataframe.at[int(query_index), "metadata_tokens"]
        recommended = [
            int(candidate)
            for candidate in neighbor_indices[int(query_index), :top_k]
            if candidate >= 0
        ]

        if not recommended:
            continue

        recommendation_overlaps = []
        recommendation_jaccards = []
        hit = 0.0

        for candidate_index in recommended:
            candidate_tokens = dataframe.at[candidate_index, "metadata_tokens"]
            shared_count = len(query_tokens & candidate_tokens)

            if shared_count > 0:
                hit = 1.0

            recommendation_overlaps.append(shared_count / len(query_tokens))

            union_count = len(query_tokens | candidate_tokens)
            recommendation_jaccards.append(shared_count / union_count if union_count else 0.0)

        hit_scores.append(hit)
        overlap_scores.append(float(np.mean(recommendation_overlaps)))
        jaccard_scores.append(float(np.mean(recommendation_jaccards)))

    if not overlap_scores:
        return {
            "hit_rate_at_k": 0.0,
            "mean_overlap_at_k": 0.0,
            "mean_jaccard_at_k": 0.0,
            "evaluated_items": 0,
        }

    return {
        "hit_rate_at_k": float(np.mean(hit_scores)),
        "mean_overlap_at_k": float(np.mean(overlap_scores)),
        "mean_jaccard_at_k": float(np.mean(jaccard_scores)),
        "evaluated_items": len(overlap_scores),
    }


def build_title_index(dataframe):
    title_index = {}
    ranked = dataframe.sort_values(
        by=["score_numeric", "members_numeric"],
        ascending=[False, False],
        na_position="last",
    )

    for row_index, row in ranked.iterrows():
        for column in ("title", "title_english"):
            normalized_title = normalize_text(row.get(column, ""))

            if normalized_title and normalized_title not in title_index:
                title_index[normalized_title] = int(row_index)

    return title_index


def train_and_select_best_model(dataframe):
    results = []
    best_payload = None

    for config in MODEL_CONFIGS:
        print(f"Training {config['name']}...")

        vectorizer = config["vectorizer_class"](**config["params"])
        vectors = vectorizer.fit_transform(dataframe["tags"])

        neighbor_indices, neighbor_scores = build_neighbors(vectors, TOP_NEIGHBORS_TO_SAVE)
        metrics = evaluate_recommender(
            dataframe=dataframe,
            neighbor_indices=neighbor_indices,
            top_k=EVAL_TOP_K,
            sample_size=EVAL_SAMPLE_SIZE,
            random_state=RANDOM_STATE,
        )

        result = {
            "Model": config["name"],
            "Vector Count": int(vectors.shape[1]),
            "Hit Rate@10": round(metrics["hit_rate_at_k"], 4),
            "Mean Overlap@10": round(metrics["mean_overlap_at_k"], 4),
            "Mean Jaccard@10": round(metrics["mean_jaccard_at_k"], 4),
            "Evaluated Items": int(metrics["evaluated_items"]),
        }
        results.append(result)

        candidate_payload = {
            "config": config,
            "vectorizer": vectorizer,
            "neighbor_indices": neighbor_indices,
            "neighbor_scores": neighbor_scores,
            "result": result,
        }

        if best_payload is None:
            best_payload = candidate_payload
            continue

        current_best = best_payload["result"]
        if (
            result["Mean Overlap@10"],
            result["Mean Jaccard@10"],
            result["Hit Rate@10"],
        ) > (
            current_best["Mean Overlap@10"],
            current_best["Mean Jaccard@10"],
            current_best["Hit Rate@10"],
        ):
            best_payload = candidate_payload

    results_df = pd.DataFrame(results).sort_values(
        by=["Mean Overlap@10", "Mean Jaccard@10", "Hit Rate@10"],
        ascending=False,
    ).reset_index(drop=True)

    return best_payload, results_df


def save_outputs(dataframe, best_payload, results_df):
    anime_export = dataframe[[column for column in DISPLAY_COLUMNS if column in dataframe.columns]].copy()
    anime_export["tags"] = dataframe["tags"]

    title_index = build_title_index(dataframe)
    similarity_payload = {
        "kind": "top_k_neighbors",
        "model_name": best_payload["result"]["Model"],
        "top_k": int(best_payload["neighbor_indices"].shape[1]),
        "neighbor_indices": best_payload["neighbor_indices"],
        "neighbor_scores": best_payload["neighbor_scores"],
    }

    with open(SIMILARITY_PATH, "wb") as file:
        pickle.dump(similarity_payload, file)

    with open(ANIME_DATA_PATH, "wb") as file:
        pickle.dump(anime_export, file)

    with open(TITLE_INDEX_PATH, "wb") as file:
        pickle.dump(title_index, file)

    with open(MODEL_INFO_PATH, "wb") as file:
        pickle.dump(
            {
                "best_model_name": best_payload["result"]["Model"],
                "best_model_config": best_payload["config"],
                "results": results_df.to_dict(orient="records"),
            },
            file,
        )

    results_df.to_csv(MODEL_RESULTS_PATH, index=False)


def main():
    dataframe = load_dataset()
    print("Dataset loaded:", dataframe.shape)

    best_payload, results_df = train_and_select_best_model(dataframe)

    print("\nRecommendation Model Comparison")
    print(results_df.to_string(index=False))

    save_outputs(dataframe, best_payload, results_df)

    print(f"\nBest Model: {best_payload['result']['Model']}")
    print(f"Saved: {SIMILARITY_PATH}")
    print(f"Saved: {ANIME_DATA_PATH}")
    print(f"Saved: {TITLE_INDEX_PATH}")
    print(f"Saved: {MODEL_RESULTS_PATH}")
    print(f"Saved: {MODEL_INFO_PATH}")


if __name__ == "__main__":
    main()
