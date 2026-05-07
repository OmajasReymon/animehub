from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error as MySQLError
from flask_cors import CORS
import requests
import bcrypt
import os
import pickle
import re
import time
from difflib import SequenceMatcher

app = Flask(__name__)
CORS(app)

JIKAN_PAGE_LIMIT = 25
DEFAULT_CATALOG_LIMIT = 500
DEFAULT_SEARCH_LIMIT = 250
DEFAULT_BROWSE_PAGE_SIZE = 24
DEFAULT_SEARCH_PAGE_SIZE = 24
MAX_CATALOG_LIMIT = 1000
MAX_SEARCH_LIMIT = 500
CACHE_TTL_SECONDS = 60 * 15
catalog_cache = {}

# -----------------------------
# MYSQL CONNECTION
# -----------------------------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "animehub_db"
}

ADMIN_ROLE = "admin"
USER_ROLE = "user"

def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except MySQLError as e:
        print("MYSQL CONNECTION ERROR:", e)
        return None

def get_db_cursor(dictionary=True):
    db = get_db_connection()

    if db is None:
        return None, None

    return db, db.cursor(dictionary=dictionary)

def close_db_resources(cursor=None, db=None):
    try:
        if cursor is not None:
            cursor.close()
    except Exception:
        pass

    try:
        if db is not None and db.is_connected():
            db.close()
    except Exception:
        pass

def normalize_role(role):
    role_value = str(role or USER_ROLE).strip().lower()
    return ADMIN_ROLE if role_value == ADMIN_ROLE else USER_ROLE

def ensure_users_table(cursor, db):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    db.commit()

    cursor.execute("SHOW COLUMNS FROM users LIKE 'role'")
    if cursor.fetchone() is None:
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'")
        db.commit()

def ensure_favorites_table(cursor, db):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS favorites (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            mal_id INT NOT NULL,
            title VARCHAR(255) NULL,
            image TEXT NULL,
            score DECIMAL(4,2) NULL,
            status VARCHAR(80) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_anime (user_id, mal_id)
        )
        """
    )
    db.commit()

def ensure_core_tables(cursor, db):
    ensure_users_table(cursor, db)
    ensure_favorites_table(cursor, db)

def db_unavailable_response():
    return jsonify({
        "success": False,
        "message": "Database connection unavailable"
    }), 500

def get_request_payload():
    json_payload = request.get_json(silent=True)

    if isinstance(json_payload, dict) and json_payload:
        return json_payload

    if request.form:
        return request.form.to_dict()

    return {}

def to_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return value != 0

    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}

    return bool(value)

def build_default_user_settings(user=None):
    email = str((user or {}).get("email") or "")
    email_prefix = email.split("@")[0].strip()
    username = f"@{email_prefix}" if email_prefix else "@animefan"

    return {
        "username": username,
        "bio": "Anime fan building a great watchlist on AnimeHub.",
        "notificationsEmail": True,
        "notificationsPush": False,
        "newReleaseAlerts": True,
        "preferredLanguage": "English",
        "subtitlePreference": "English Subtitles",
        "autoPlayNextEpisode": True,
        "adultContent": False,
        "profileVisible": True
    }

def serialize_user_settings(settings_row=None, user=None):
    defaults = build_default_user_settings(user)

    if not settings_row:
        return defaults

    return {
        "username": settings_row.get("username") or defaults["username"],
        "bio": settings_row.get("bio") or defaults["bio"],
        "notificationsEmail": to_bool(settings_row.get("notifications_email"), defaults["notificationsEmail"]),
        "notificationsPush": to_bool(settings_row.get("notifications_push"), defaults["notificationsPush"]),
        "newReleaseAlerts": to_bool(settings_row.get("new_release_alerts"), defaults["newReleaseAlerts"]),
        "preferredLanguage": settings_row.get("preferred_language") or defaults["preferredLanguage"],
        "subtitlePreference": settings_row.get("subtitle_preference") or defaults["subtitlePreference"],
        "autoPlayNextEpisode": to_bool(settings_row.get("auto_play_next_episode"), defaults["autoPlayNextEpisode"]),
        "adultContent": to_bool(settings_row.get("adult_content"), defaults["adultContent"]),
        "profileVisible": to_bool(settings_row.get("profile_visible"), defaults["profileVisible"])
    }

def sanitize_user_settings(settings_payload=None, user=None):
    defaults = build_default_user_settings(user)
    payload = settings_payload or {}

    username = str(payload.get("username") or defaults["username"]).strip()

    if username and not username.startswith("@"):
        username = f"@{username.lstrip('@')}"

    if not username:
        username = defaults["username"]

    bio = str(payload.get("bio") or defaults["bio"]).strip() or defaults["bio"]
    preferred_language = str(payload.get("preferredLanguage") or defaults["preferredLanguage"]).strip() or defaults["preferredLanguage"]
    subtitle_preference = str(payload.get("subtitlePreference") or defaults["subtitlePreference"]).strip() or defaults["subtitlePreference"]

    return {
        "username": username[:80],
        "bio": bio[:1000],
        "notifications_email": int(to_bool(payload.get("notificationsEmail"), defaults["notificationsEmail"])),
        "notifications_push": int(to_bool(payload.get("notificationsPush"), defaults["notificationsPush"])),
        "new_release_alerts": int(to_bool(payload.get("newReleaseAlerts"), defaults["newReleaseAlerts"])),
        "preferred_language": preferred_language[:50],
        "subtitle_preference": subtitle_preference[:50],
        "auto_play_next_episode": int(to_bool(payload.get("autoPlayNextEpisode"), defaults["autoPlayNextEpisode"])),
        "adult_content": int(to_bool(payload.get("adultContent"), defaults["adultContent"])),
        "profile_visible": int(to_bool(payload.get("profileVisible"), defaults["profileVisible"]))
    }

def ensure_user_settings_table(cursor, db):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INT NOT NULL PRIMARY KEY,
            username VARCHAR(80) NOT NULL,
            bio TEXT NULL,
            notifications_email TINYINT(1) NOT NULL DEFAULT 1,
            notifications_push TINYINT(1) NOT NULL DEFAULT 0,
            new_release_alerts TINYINT(1) NOT NULL DEFAULT 1,
            preferred_language VARCHAR(50) NOT NULL DEFAULT 'English',
            subtitle_preference VARCHAR(50) NOT NULL DEFAULT 'English Subtitles',
            auto_play_next_episode TINYINT(1) NOT NULL DEFAULT 1,
            adult_content TINYINT(1) NOT NULL DEFAULT 0,
            profile_visible TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """
    )
    db.commit()

def get_or_create_user_settings(cursor, db, user):
    ensure_user_settings_table(cursor, db)

    cursor.execute(
        "SELECT * FROM user_settings WHERE user_id=%s",
        (user["id"],)
    )
    settings_row = cursor.fetchone()

    if settings_row:
        return serialize_user_settings(settings_row, user)

    settings = sanitize_user_settings({}, user)

    cursor.execute(
        """
        INSERT INTO user_settings (
            user_id,
            username,
            bio,
            notifications_email,
            notifications_push,
            new_release_alerts,
            preferred_language,
            subtitle_preference,
            auto_play_next_episode,
            adult_content,
            profile_visible
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user["id"],
            settings["username"],
            settings["bio"],
            settings["notifications_email"],
            settings["notifications_push"],
            settings["new_release_alerts"],
            settings["preferred_language"],
            settings["subtitle_preference"],
            settings["auto_play_next_episode"],
            settings["adult_content"],
            settings["profile_visible"]
        )
    )
    db.commit()

    return serialize_user_settings(settings, user)

def upsert_user_settings(cursor, db, user, settings_payload=None):
    ensure_user_settings_table(cursor, db)
    settings = sanitize_user_settings(settings_payload, user)

    cursor.execute(
        """
        INSERT INTO user_settings (
            user_id,
            username,
            bio,
            notifications_email,
            notifications_push,
            new_release_alerts,
            preferred_language,
            subtitle_preference,
            auto_play_next_episode,
            adult_content,
            profile_visible
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            username=VALUES(username),
            bio=VALUES(bio),
            notifications_email=VALUES(notifications_email),
            notifications_push=VALUES(notifications_push),
            new_release_alerts=VALUES(new_release_alerts),
            preferred_language=VALUES(preferred_language),
            subtitle_preference=VALUES(subtitle_preference),
            auto_play_next_episode=VALUES(auto_play_next_episode),
            adult_content=VALUES(adult_content),
            profile_visible=VALUES(profile_visible)
        """,
        (
            user["id"],
            settings["username"],
            settings["bio"],
            settings["notifications_email"],
            settings["notifications_push"],
            settings["new_release_alerts"],
            settings["preferred_language"],
            settings["subtitle_preference"],
            settings["auto_play_next_episode"],
            settings["adult_content"],
            settings["profile_visible"]
        )
    )
    db.commit()

    return serialize_user_settings(settings, user)

def parse_limit(raw_value, default_value, minimum=1, maximum=MAX_CATALOG_LIMIT):
    try:
        parsed = int(raw_value)
    except (TypeError, ValueError):
        return default_value

    return max(minimum, min(parsed, maximum))

def make_cache_key(endpoint, params, max_items):
    normalized_params = tuple(
        sorted(
            (str(key), str(value))
            for key, value in (params or {}).items()
            if value not in (None, "")
        )
    )

    return endpoint, normalized_params, int(max_items)

def make_payload_cache_key(endpoint, params):
    normalized_params = tuple(
        sorted(
            (str(key), str(value))
            for key, value in (params or {}).items()
            if value not in (None, "")
        )
    )

    return "payload", endpoint, normalized_params

def get_cached_collection(cache_key):
    cached_entry = catalog_cache.get(cache_key)

    if not cached_entry:
        return None

    if time.time() - cached_entry["timestamp"] > CACHE_TTL_SECONDS:
        catalog_cache.pop(cache_key, None)
        return None

    return cached_entry["data"]

def set_cached_collection(cache_key, data):
    catalog_cache[cache_key] = {
        "timestamp": time.time(),
        "data": data
    }

def fetch_jikan_payload(endpoint, params=None):
    url = f"https://api.jikan.moe/v4/{endpoint.lstrip('/')}"
    request_params = dict(params or {})
    cache_key = make_payload_cache_key(endpoint, request_params)
    cached_payload = get_cached_collection(cache_key)

    if cached_payload is not None:
        return cached_payload, None

    try:
        response = requests.get(url, params=request_params, timeout=15)
        response.raise_for_status()

        payload = response.json()

        if isinstance(payload, dict):
            set_cached_collection(cache_key, payload)

        return payload, None

    except requests.RequestException as e:
        print("JIKAN REQUEST ERROR:", e)
        return None, "Failed to load data from Jikan"
    except ValueError as e:
        print("JIKAN JSON ERROR:", e)
        return None, "Invalid response from Jikan"

def fetch_jikan(endpoint, params=None):
    payload, error = fetch_jikan_payload(endpoint, params)

    if error or not isinstance(payload, dict):
        return None, error

    return payload.get("data"), None

def fetch_jikan_collection(endpoint, params=None, max_items=JIKAN_PAGE_LIMIT):
    max_items = parse_limit(max_items, JIKAN_PAGE_LIMIT, maximum=MAX_CATALOG_LIMIT)
    base_params = dict(params or {})
    base_params.pop("page", None)
    base_params.pop("limit", None)

    cache_key = make_cache_key(endpoint, base_params, max_items)
    cached_data = get_cached_collection(cache_key)

    if cached_data is not None:
        return cached_data, None

    items = []
    seen_ids = set()
    total_pages = max(1, (max_items + JIKAN_PAGE_LIMIT - 1) // JIKAN_PAGE_LIMIT)

    for page in range(1, total_pages + 1):
        page_params = dict(base_params)
        page_params["page"] = page
        page_params["limit"] = JIKAN_PAGE_LIMIT

        data, error = fetch_jikan(endpoint, page_params)

        if error:
            if items:
                print("JIKAN COLLECTION PARTIAL LOAD:", error)
                break

            return None, error

        if not data:
            break

        for item in data:
            mal_id = item.get("mal_id") if isinstance(item, dict) else None
            dedupe_key = mal_id if mal_id is not None else len(items)

            if dedupe_key in seen_ids:
                continue

            seen_ids.add(dedupe_key)
            items.append(item)

            if len(items) >= max_items:
                break

        if len(data) < JIKAN_PAGE_LIMIT or len(items) >= max_items:
            break

    set_cached_collection(cache_key, items)
    return items, None

def build_browse_params(q="", genre_id="", status="", page=1, limit=JIKAN_PAGE_LIMIT):
    params = {
        "page": page,
        "limit": limit,
        "order_by": "popularity",
        "sort": "asc",
        "sfw": "true"
    }

    q = (q or "").strip()
    genre_id = str(genre_id or "").strip()
    status = (status or "").strip().lower()

    if q:
        params["q"] = q

    if genre_id.isdigit():
        params["genres"] = genre_id

    if status in {"airing", "complete", "upcoming"}:
        params["status"] = status

    return params

def build_pagination_meta(pagination, fallback_page=1, fallback_limit=DEFAULT_BROWSE_PAGE_SIZE, current_count=0):
    pagination = pagination if isinstance(pagination, dict) else {}
    items = pagination.get("items") if isinstance(pagination.get("items"), dict) else {}
    current_page = parse_limit(
        pagination.get("current_page"),
        fallback_page,
        minimum=1,
        maximum=MAX_CATALOG_LIMIT
    )
    items_per_page = parse_limit(
        items.get("per_page"),
        fallback_limit,
        minimum=1,
        maximum=JIKAN_PAGE_LIMIT
    )

    return {
        "current_page": current_page,
        "has_next_page": bool(pagination.get("has_next_page")),
        "last_visible_page": parse_limit(
            pagination.get("last_visible_page"),
            current_page,
            minimum=current_page,
            maximum=MAX_CATALOG_LIMIT
        ),
        "items": {
            "count": current_count,
            "total": parse_limit(
                items.get("total"),
                current_count,
                minimum=0,
                maximum=MAX_CATALOG_LIMIT * JIKAN_PAGE_LIMIT
            ),
            "per_page": items_per_page
        }
    }

def build_embed_url_from_youtube_id(youtube_id):
    youtube_id = str(youtube_id or "").strip()

    if not youtube_id:
        return ""

    return f"https://www.youtube.com/embed/{youtube_id}?autoplay=1&rel=0"

def has_playable_trailer(anime_item):
    if not isinstance(anime_item, dict):
        return False

    trailer = anime_item.get("trailer")

    if not isinstance(trailer, dict):
        return False

    youtube_id = str(trailer.get("youtube_id") or "").strip()
    embed_url = str(trailer.get("embed_url") or "").strip()
    url = str(trailer.get("url") or "").strip()

    return bool(youtube_id or embed_url or url)

def build_trailer_from_video_entry(video_entry):
    if not isinstance(video_entry, dict):
        return None

    trailer = video_entry.get("trailer")
    trailer = trailer if isinstance(trailer, dict) else {}
    youtube_id = str(trailer.get("youtube_id") or "").strip()
    embed_url = str(trailer.get("embed_url") or "").strip()
    url = str(trailer.get("url") or "").strip()

    if not embed_url and youtube_id:
        embed_url = build_embed_url_from_youtube_id(youtube_id)

    if not (youtube_id or embed_url or url):
        return None

    images = trailer.get("images") if isinstance(trailer.get("images"), dict) else {}

    return {
        "youtube_id": youtube_id,
        "url": url,
        "embed_url": embed_url,
        "images": images
    }

def get_fallback_trailer_for_anime(mal_id):
    videos_data, error = fetch_jikan(f"anime/{mal_id}/videos")

    if error or not isinstance(videos_data, dict):
        return None

    for bucket_name in ("promo", "music_videos", "episodes"):
        entries = videos_data.get(bucket_name)

        if not isinstance(entries, list):
            continue

        for entry in entries:
            trailer = build_trailer_from_video_entry(entry)

            if trailer:
                return trailer

    return None

def normalize_title(value):
    normalized = re.sub(r"[^a-z0-9]+", " ", str(value or "").lower())
    return re.sub(r"\s+", " ", normalized).strip()

def get_title_variants(anime_item):
    if not isinstance(anime_item, dict):
        return []

    variants = []

    for key in ("title", "title_english", "title_japanese"):
        value = anime_item.get(key)

        if value:
            variants.append(value)

    for synonym in anime_item.get("title_synonyms") or []:
        if synonym:
            variants.append(synonym)

    deduped = []
    seen = set()

    for value in variants:
        normalized = normalize_title(value)

        if not normalized or normalized in seen:
            continue

        seen.add(normalized)
        deduped.append(value)

    return deduped

def get_genre_ids(anime_item):
    genres = []

    for bucket in ("genres", "themes", "demographics"):
        for entry in anime_item.get(bucket) or []:
            mal_id = entry.get("mal_id")

            if mal_id:
                genres.append(mal_id)

    # preserve order while deduping
    return list(dict.fromkeys(genres))

def title_match_score(query, anime_item):
    normalized_query = normalize_title(query)

    if not normalized_query:
        return 0

    query_words = normalized_query.split()
    best_score = 0

    for variant in get_title_variants(anime_item):
        normalized_variant = normalize_title(variant)

        if not normalized_variant:
            continue

        score = 0

        if normalized_variant == normalized_query:
            score = 1000
        elif normalized_variant.startswith(normalized_query):
            score = 920
        elif f" {normalized_query} " in f" {normalized_variant} ":
            score = 860
        else:
            matched_words = sum(1 for word in query_words if word in normalized_variant)
            similarity = SequenceMatcher(None, normalized_query, normalized_variant).ratio()

            if matched_words == len(query_words):
                score = 760
            elif matched_words >= max(1, len(query_words) - 1):
                score = 640 + (matched_words * 20)
            elif similarity >= 0.88:
                score = 620
            elif similarity >= 0.76:
                score = 480

        if score and len(normalized_variant) <= len(normalized_query) + 20:
            score += 20

        best_score = max(best_score, score)

    return best_score

def sort_search_results(query, anime_list):
    scored_results = []

    for anime_item in anime_list or []:
        score = title_match_score(query, anime_item)

        if score <= 0:
            continue

        popularity_rank = anime_item.get("popularity")
        popularity_rank = popularity_rank if isinstance(popularity_rank, int) else 999999
        scored_results.append((score, popularity_rank, anime_item))

    scored_results.sort(key=lambda item: (-item[0], item[1], normalize_title(item[2].get("title"))))
    return [item[2] for item in scored_results]

def search_anime_catalog(query, limit):
    search_params = {
        "q": query,
        "order_by": "popularity",
        "sort": "asc",
        "sfw": "true"
    }

    data, error = fetch_jikan_collection("anime", search_params, max_items=limit)

    if error or not data:
        return [], error

    filtered = sort_search_results(query, data)
    return filtered, None

def get_reference_anime(title):
    matches, error = search_anime_catalog(title, min(MAX_SEARCH_LIMIT, 100))

    if error or not matches:
        return None, error or "No matching anime found"

    top_match = matches[0]
    mal_id = top_match.get("mal_id")

    if not mal_id:
        return top_match, None

    full_data, detail_error = fetch_jikan(f"anime/{mal_id}/full")

    if detail_error or not full_data:
        return top_match, None

    return full_data, None

def clean_model_value(value):
    if value is None:
        return None

    try:
        if value != value:
            return None
    except Exception:
        pass

    return value

def coerce_int(value):
    value = clean_model_value(value)

    if value is None:
        return None

    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None

def coerce_float(value):
    value = clean_model_value(value)

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def split_name_list(value):
    value = clean_model_value(value)

    if value is None:
        return []

    items = []

    for part in str(value).split(","):
        name = part.strip()

        if name:
            items.append({"name": name})

    return items

def get_model_anime_row(index):
    if anime is None or index is None:
        return None

    try:
        if hasattr(anime, "iloc"):
            if index < 0 or index >= len(anime):
                return None

            row = anime.iloc[index]
            return row.to_dict() if hasattr(row, "to_dict") else dict(row)

        if isinstance(anime, list):
            if index < 0 or index >= len(anime):
                return None

            row = anime[index]
            return row if isinstance(row, dict) else None
    except Exception:
        return None

    return None

def serialize_model_anime(row, recommendation_score=None):
    if not isinstance(row, dict):
        return None

    score = coerce_float(row.get("score"))
    mal_id = coerce_int(row.get("mal_id"))

    payload = {
        "mal_id": mal_id,
        "title": str(clean_model_value(row.get("title")) or ""),
        "title_english": str(clean_model_value(row.get("title_english")) or ""),
        "title_japanese": str(clean_model_value(row.get("title_japanese")) or ""),
        "type": str(clean_model_value(row.get("type")) or ""),
        "episodes": coerce_int(row.get("episodes")),
        "status": str(clean_model_value(row.get("status")) or ""),
        "score": score,
        "rank": coerce_int(row.get("rank")),
        "popularity": coerce_int(row.get("popularity")),
        "members": coerce_int(row.get("members")),
        "favorites": coerce_int(row.get("favorites")),
        "synopsis": str(clean_model_value(row.get("synopsis")) or ""),
        "genres": split_name_list(row.get("genres")),
        "themes": split_name_list(row.get("themes")),
        "demographics": split_name_list(row.get("demographics")),
        "studios": split_name_list(row.get("studios")),
        "year": coerce_int(row.get("year")),
        "url": str(clean_model_value(row.get("url")) or ""),
        "rating": str(clean_model_value(row.get("rating")) or ""),
    }

    if recommendation_score is not None:
        payload["recommendation_score"] = recommendation_score

    return payload

def merge_recommendation_live_data(anime_item, live_item):
    if not isinstance(anime_item, dict) or not isinstance(live_item, dict):
        return anime_item

    merged = dict(anime_item)

    for key in ("images", "trailer", "streaming", "aired", "genres", "themes", "demographics", "studios"):
        value = live_item.get(key)

        if value:
            merged[key] = value

    for key in (
        "title",
        "title_english",
        "title_japanese",
        "type",
        "episodes",
        "status",
        "score",
        "rank",
        "popularity",
        "members",
        "favorites",
        "synopsis",
        "year",
        "url",
        "rating",
    ):
        value = live_item.get(key)

        if value not in (None, "", [], {}):
            merged[key] = value

    return merged

def enrich_recommendation_anime(anime_item):
    if not isinstance(anime_item, dict):
        return anime_item

    mal_id = coerce_int(anime_item.get("mal_id"))

    if mal_id is None:
        return anime_item

    needs_live_data = (
        not anime_item.get("images") or
        not anime_item.get("genres") or
        not anime_item.get("studios")
    )

    if not needs_live_data:
        return anime_item

    live_data, error = fetch_jikan(f"anime/{mal_id}")

    if error or not isinstance(live_data, dict):
        return anime_item

    return merge_recommendation_live_data(anime_item, live_data)

def find_model_index_by_title(query):
    if not isinstance(title_index, dict):
        return None

    normalized_query = normalize_title(query)

    if not normalized_query:
        return None

    direct_match = title_index.get(normalized_query)

    if direct_match is not None:
        return direct_match

    best_match = None
    best_score = 0

    for candidate_title, candidate_index in title_index.items():
        score = 0

        if candidate_title.startswith(normalized_query):
            score = 920
        elif normalized_query in candidate_title:
            score = 840
        else:
            similarity_score = SequenceMatcher(None, normalized_query, candidate_title).ratio()

            if similarity_score >= 0.9:
                score = 700
            elif similarity_score >= 0.8:
                score = 550

        if score > best_score:
            best_score = score
            best_match = candidate_index

    return best_match

def find_model_index_from_reference_anime(reference_anime):
    if not isinstance(reference_anime, dict):
        return None

    reference_mal_id = coerce_int(reference_anime.get("mal_id"))

    if reference_mal_id and reference_mal_id in anime_mal_id_index:
        return anime_mal_id_index[reference_mal_id]

    for variant in get_title_variants(reference_anime):
        matched_index = find_model_index_by_title(variant)

        if matched_index is not None:
            return matched_index

    return None

def get_model_recommendations(reference_index, limit=24):
    if reference_index is None or similarity is None:
        return []

    model_results = []

    if isinstance(similarity, dict) and similarity.get("kind") == "top_k_neighbors":
        neighbor_indices = similarity.get("neighbor_indices")
        neighbor_scores = similarity.get("neighbor_scores")

        try:
            candidate_indices = neighbor_indices[reference_index]
        except Exception:
            return []

        for position, candidate_index in enumerate(candidate_indices):
            candidate_index = coerce_int(candidate_index)

            if candidate_index is None or candidate_index < 0 or candidate_index == reference_index:
                continue

            candidate_row = get_model_anime_row(candidate_index)

            if candidate_row is None:
                continue

            score_value = None

            try:
                if neighbor_scores is not None:
                    score_value = round(float(neighbor_scores[reference_index][position]), 4)
            except Exception:
                score_value = None

            serialized = serialize_model_anime(candidate_row, recommendation_score=score_value)

            if serialized:
                model_results.append(enrich_recommendation_anime(serialized))

            if len(model_results) >= limit:
                break

        return model_results

    try:
        similarity_scores = list(enumerate(similarity[reference_index]))
    except Exception:
        return []

    similarity_scores.sort(key=lambda item: item[1], reverse=True)

    for candidate_index, raw_score in similarity_scores:
        if candidate_index == reference_index:
            continue

        candidate_row = get_model_anime_row(candidate_index)

        if candidate_row is None:
            continue

        serialized = serialize_model_anime(
            candidate_row,
            recommendation_score=round(float(raw_score), 4),
        )

        if serialized:
            model_results.append(enrich_recommendation_anime(serialized))

        if len(model_results) >= limit:
            break

    return model_results

def get_genre_matched_recommendations(reference_anime, limit=24):
    reference_mal_id = reference_anime.get("mal_id")
    reference_genre_ids = get_genre_ids(reference_anime)

    if not reference_genre_ids:
        return []

    collected = {}
    fetch_limit = max(50, limit * 2)

    for genre_id in reference_genre_ids[:3]:
        params = build_browse_params(genre_id=genre_id, limit=JIKAN_PAGE_LIMIT)
        data, error = fetch_jikan_collection("anime", params=params, max_items=fetch_limit)

        if error or not data:
            continue

        for item in data:
            mal_id = item.get("mal_id")

            if not mal_id or mal_id == reference_mal_id:
                continue

            candidate_genre_ids = set(get_genre_ids(item))
            shared_genres = len(set(reference_genre_ids) & candidate_genre_ids)

            if shared_genres <= 0:
                continue

            existing = collected.get(mal_id)
            candidate_payload = {
                "item": item,
                "shared_genres": shared_genres
            }

            if existing is None or shared_genres > existing["shared_genres"]:
                collected[mal_id] = candidate_payload

    ranked = sorted(
        collected.values(),
        key=lambda entry: (
            -entry["shared_genres"],
            entry["item"].get("popularity") if isinstance(entry["item"].get("popularity"), int) else 999999,
            -(entry["item"].get("score") if isinstance(entry["item"].get("score"), (int, float)) else 0)
        )
    )

    return [entry["item"] for entry in ranked[:limit]]

# -----------------------------
# LOAD ML MODEL 
# -----------------------------


try:
    base_dir = os.path.dirname(__file__)
    anime_mal_id_index = {}

    similarity = pickle.load(
        open(os.path.join(base_dir, "../model/similarity.pkl"), "rb")
    )
    anime = pickle.load(
        open(os.path.join(base_dir, "../model/anime_data.pkl"), "rb")
    )
    title_index = pickle.load(
        open(os.path.join(base_dir, "../model/title_index.pkl"), "rb")
    )

    if hasattr(anime, "iterrows"):
        for row_index, row in anime.iterrows():
            mal_id = coerce_int(row.get("mal_id"))

            if mal_id and mal_id not in anime_mal_id_index:
                anime_mal_id_index[mal_id] = int(row_index)

    print("ML Model Loaded")

except Exception as e:
    similarity = None
    anime = None
    title_index = None
    anime_mal_id_index = {}
    print("ML Model NOT loaded:", e)

# -----------------------------
# RECOMMEND FUNCTION 
# -----------------------------
def recommend(title):
    model_index = find_model_index_by_title(title)

    if model_index is not None:
        model_results = get_model_recommendations(model_index)

        if model_results:
            return model_results

    reference_anime, error = get_reference_anime(title)

    if error or not reference_anime:
        return []

    model_index = find_model_index_from_reference_anime(reference_anime)

    if model_index is not None:
        model_results = get_model_recommendations(model_index)

        if model_results:
            return model_results

    return get_genre_matched_recommendations(reference_anime)

# -----------------------------
# HOME
# -----------------------------
@app.route("/")
def home():
    return "AnimeHub API is running"

# -----------------------------
# REGISTER
# -----------------------------
@app.route("/register", methods=["POST"])
def register():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_users_table(cursor, db)

        data = get_request_payload()

        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400

        name = str(data.get("name") or "").strip()
        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")

        # 🔒 Basic validation
        if not name or not email or not password:
            return jsonify({"success": False, "message": "All fields are required"}), 400

        # 🔍 Check if email exists
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Email already exists"}), 400

        # 🔐 Hash password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # ✅ Insert user
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed.decode('utf-8'))
        )
        db.commit()

        user_id = cursor.lastrowid
        upsert_user_settings(cursor, db, {
            "id": user_id,
            "email": email
        })

        return jsonify({
            "success": True,
            "user_id": user_id,
            "name": name,
            "email": email,
            "role": USER_ROLE,
            "redirect_url": "index.php"
        }), 200

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)


# -----------------------------
# LOGIN
# -----------------------------
@app.route("/login", methods=["POST"])
def login():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_users_table(cursor, db)

        data = get_request_payload()

        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400

        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password required"}), 400

        # ⚠️ IMPORTANT: use dictionary cursor OR fix indexing
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        # 🧠 FIX: handle tuple vs dict
        # If you DID NOT set dictionary=True:
        # user[3] = password column
        db_password = user["password"] if isinstance(user, dict) else user[3]

        if bcrypt.checkpw(password.encode('utf-8'), db_password.encode('utf-8')):
            role = normalize_role(user.get("role") if isinstance(user, dict) else None)

            return jsonify({
                "success": True,
                "message": "Login successful",
                "user_id": user["id"] if isinstance(user, dict) else user[0],
                "name": user["name"] if isinstance(user, dict) else user[1],
                "email": user["email"] if isinstance(user, dict) else user[2],
                "role": role,
                "redirect_url": "admin.php" if role == ADMIN_ROLE else "index.php"
            }), 200

        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        }), 401

    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

# -----------------------------
# GET USER PROFILE
# -----------------------------
@app.route("/user/<int:user_id>")
def get_user_profile(user_id):
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_users_table(cursor, db)

        cursor.execute(
            "SELECT id, name, email, role FROM users WHERE id=%s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        settings = get_or_create_user_settings(cursor, db, user)

        return jsonify({
            "success": True,
            "data": {
                "user_id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": normalize_role(user.get("role")),
                "settings": settings
            }
        })

    except Exception as e:
        print("GET USER PROFILE ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

# -----------------------------
# UPDATE USER PROFILE
# -----------------------------
@app.route("/user/update", methods=["POST"])
def update_user_profile():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_users_table(cursor, db)

        data = request.get_json(silent=True) or {}
        user_id = data.get("user_id")
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        settings_payload = data.get("settings")

        if not user_id or not name or not email:
            return jsonify({"success": False, "message": "Name and email are required"}), 400

        cursor.execute(
            "SELECT id FROM users WHERE email=%s AND id<>%s",
            (email, user_id)
        )

        if cursor.fetchone():
            return jsonify({"success": False, "message": "Email already exists"}), 400

        cursor.execute("SELECT role FROM users WHERE id=%s", (user_id,))
        existing_user = cursor.fetchone()

        if not existing_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        current_role = normalize_role(existing_user.get("role"))

        cursor.execute(
            "UPDATE users SET name=%s, email=%s WHERE id=%s",
            (name, email, user_id)
        )
        db.commit()

        user_record = {
            "id": int(user_id),
            "name": name,
            "email": email
        }
        settings = (
            upsert_user_settings(cursor, db, user_record, settings_payload)
            if settings_payload is not None
            else get_or_create_user_settings(cursor, db, user_record)
        )

        return jsonify({
            "success": True,
            "data": {
                "user_id": int(user_id),
                "name": name,
                "email": email,
                "role": current_role,
                "settings": settings
            }
        })

    except Exception as e:
        print("UPDATE USER PROFILE ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

def get_admin_id_from_request():
    raw_admin_id = request.args.get("admin_id")

    if raw_admin_id is None:
        payload = request.get_json(silent=True) or {}
        raw_admin_id = payload.get("admin_id")

    try:
        return int(raw_admin_id)
    except (TypeError, ValueError):
        return None

def require_admin_user(cursor):
    admin_id = get_admin_id_from_request()

    if admin_id is None:
        return None, (jsonify({"success": False, "message": "Admin login required"}), 401)

    cursor.execute(
        "SELECT id, name, email, role FROM users WHERE id=%s",
        (admin_id,)
    )
    admin = cursor.fetchone()

    if not admin or normalize_role(admin.get("role")) != ADMIN_ROLE:
        return None, (jsonify({"success": False, "message": "Admin access only"}), 403)

    return admin, None

# -----------------------------
# ADMIN OVERVIEW
# -----------------------------
@app.route("/admin/overview")
def admin_overview():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_core_tables(cursor, db)

        admin, error_response = require_admin_user(cursor)
        if error_response:
            return error_response

        cursor.execute("SELECT COUNT(*) AS total FROM users")
        total_users = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role=%s", (ADMIN_ROLE,))
        total_admins = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM favorites")
        total_favorites = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(DISTINCT user_id) AS total FROM favorites")
        active_collectors = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT id, name, email, role
            FROM users
            ORDER BY id DESC
            LIMIT 12
            """
        )
        users = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                favorites.user_id,
                favorites.mal_id,
                favorites.title,
                favorites.score,
                favorites.status,
                users.name AS user_name
            FROM favorites
            LEFT JOIN users ON users.id = favorites.user_id
            ORDER BY favorites.user_id DESC, favorites.mal_id DESC
            LIMIT 12
            """
        )
        recent_favorites = cursor.fetchall()

        return jsonify({
            "success": True,
            "admin": {
                "user_id": admin["id"],
                "name": admin["name"],
                "email": admin["email"],
                "role": normalize_role(admin.get("role"))
            },
            "stats": {
                "users": total_users,
                "admins": total_admins,
                "favorites": total_favorites,
                "activeCollectors": active_collectors
            },
            "users": [
                {
                    "user_id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": normalize_role(user.get("role"))
                }
                for user in users
            ],
            "recentFavorites": recent_favorites
        })

    except Exception as e:
        print("ADMIN OVERVIEW ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)
# -----------------------------
# GET ANIME (JIKAN)
# -----------------------------
@app.route("/anime")
def get_anime():
    limit = parse_limit(request.args.get("limit"), DEFAULT_CATALOG_LIMIT, maximum=MAX_CATALOG_LIMIT)
    data, error = fetch_jikan_collection("top/anime", max_items=limit)
    return jsonify(data or []), (502 if error else 200)

# -----------------------------
# TRENDING ANIME (JIKAN)
# -----------------------------
@app.route("/anime/trending")
def trending_anime():
    limit = parse_limit(request.args.get("limit"), 100, maximum=MAX_CATALOG_LIMIT)
    params = build_browse_params(status="airing", limit=JIKAN_PAGE_LIMIT)
    data, error = fetch_jikan_collection("anime", params=params, max_items=limit)
    return jsonify(data or []), (502 if error else 200)

# -----------------------------
# BROWSE ANIME (JIKAN)
# -----------------------------
@app.route("/anime/browse")
def browse_anime():
    query = request.args.get("q", "")
    genre_id = request.args.get("genre_id", "")
    status = request.args.get("status", "")
    page = parse_limit(request.args.get("page"), 1, minimum=1, maximum=MAX_CATALOG_LIMIT)
    limit = parse_limit(
        request.args.get("limit"),
        DEFAULT_SEARCH_PAGE_SIZE if str(query or "").strip() else DEFAULT_BROWSE_PAGE_SIZE,
        minimum=1,
        maximum=JIKAN_PAGE_LIMIT
    )

    params = build_browse_params(
        q=query,
        genre_id=genre_id,
        status=status,
        page=page,
        limit=limit
    )

    payload, error = fetch_jikan_payload("anime", params=params)
    data = payload.get("data") if isinstance(payload, dict) else []
    pagination = payload.get("pagination") if isinstance(payload, dict) else {}

    if query and data:
        data = sort_search_results(query, data)

    return jsonify({
        "success": error is None,
        "data": data or [],
        "pagination": build_pagination_meta(
            pagination,
            fallback_page=page,
            fallback_limit=limit,
            current_count=len(data or [])
        )
    }), (502 if error else 200)

# -----------------------------
# ANIME DETAIL (JIKAN)
# -----------------------------
@app.route("/anime/<int:mal_id>")
def get_anime_detail(mal_id):
    data, error = fetch_jikan(f"anime/{mal_id}/full")

    if error or not data:
        return jsonify({
            "success": False,
            "message": "Failed to load anime details"
        }), 502

    if not has_playable_trailer(data):
        fallback_trailer = get_fallback_trailer_for_anime(mal_id)

        if fallback_trailer:
            data["trailer"] = fallback_trailer

    return jsonify({
        "success": True,
        "data": data
    })

# -----------------------------
# SEARCH ANIME (JIKAN)
# -----------------------------
@app.route("/anime/search")
def search_anime():
    query = request.args.get("q", "").strip()
    limit = parse_limit(request.args.get("limit"), DEFAULT_SEARCH_LIMIT, maximum=MAX_SEARCH_LIMIT)

    if not query:
        return jsonify([])

    data, error = search_anime_catalog(query, limit)
    return jsonify(data or []), (502 if error else 200)

# -----------------------------
# ANIME GENRES (JIKAN)
# -----------------------------
@app.route("/genres/anime")
def get_anime_genres():
    data, error = fetch_jikan("genres/anime")

    return jsonify({
        "success": error is None,
        "data": data or []
    }), (502 if error else 200)

# -----------------------------
# TOP ANIME (JIKAN)
# -----------------------------
@app.route("/anime/top")
def top_anime():
    limit = parse_limit(request.args.get("limit"), DEFAULT_CATALOG_LIMIT, maximum=MAX_CATALOG_LIMIT)
    data, error = fetch_jikan_collection("top/anime", max_items=limit)
    return jsonify(data or []), (502 if error else 200)

# -----------------------------
# NEW ANIME (JIKAN)
# -----------------------------
@app.route("/anime/new")
def new_anime():
    limit = parse_limit(request.args.get("limit"), 100, maximum=MAX_CATALOG_LIMIT)
    data, error = fetch_jikan_collection("seasons/now", {"sfw": "true"}, max_items=limit)
    return jsonify(data or []), (502 if error else 200)

# -----------------------------
# RECOMMEND 
# -----------------------------
@app.route("/recommend")
def get_recommend():
    title = request.args.get("title", "").strip()

    if not title:
        return jsonify({"success": False, "data": []})

    results = recommend(title)

    if not results:
        return jsonify({
            "success": False,
            "message": "No recommendations found",
            "data": []
        })

    return jsonify({
        "success": True,
        "data": results
    })

@app.route("/add_favorite", methods=["POST"])
def add_favorite():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_favorites_table(cursor, db)

        data = request.get_json(silent=True) or {}

        user_id = data.get("user_id")
        mal_id = data.get("mal_id")
        title = data.get("title")
        image = data.get("image")
        score = data.get("score")
        status = data.get("status")

        if user_id is None or mal_id is None:
            return jsonify({"success": False, "message": "Missing data"}), 400

        # prevent duplicates
        cursor.execute(
            "SELECT * FROM favorites WHERE user_id=%s AND mal_id=%s",
            (user_id, mal_id)
        )

        if cursor.fetchone():
            return jsonify({"success": False, "message": "Already added"}), 400

        cursor.execute(
            """INSERT INTO favorites 
            (user_id, mal_id, title, image, score, status)
            VALUES (%s,%s,%s,%s,%s,%s)""",
            (user_id, mal_id, title, image, score, status)
        )

        db.commit()

        return jsonify({"success": True, "message": "Added to favorites"})

    except Exception as e:
        print("ADD FAVORITE ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

@app.route("/favorites/<int:user_id>")
def get_favorites(user_id):
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_favorites_table(cursor, db)

        cursor.execute(
            "SELECT * FROM favorites WHERE user_id=%s",
            (user_id,)
        )

        favorites = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": favorites
        })

    except Exception as e:
        print("GET FAVORITES ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

@app.route("/remove_favorite", methods=["POST"])
def remove_favorite():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_favorites_table(cursor, db)

        data = request.get_json(silent=True) or {}

        user_id = data.get("user_id")
        mal_id = data.get("mal_id")

        if user_id is None or mal_id is None:
            return jsonify({"success": False, "message": "Missing data"}), 400

        cursor.execute(
            "DELETE FROM favorites WHERE user_id=%s AND mal_id=%s",
            (user_id, mal_id)
        )

        db.commit()

        return jsonify({"success": True, "message": "Removed"})

    except Exception as e:
        print("REMOVE FAVORITE ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

@app.route("/favorites/clear", methods=["POST"])
def clear_favorites():
    db = None
    cursor = None

    try:
        db, cursor = get_db_cursor()

        if db is None or cursor is None:
            return db_unavailable_response()

        ensure_favorites_table(cursor, db)

        data = request.get_json(silent=True) or {}
        user_id = data.get("user_id")

        if user_id is None:
            return jsonify({"success": False, "message": "Missing user_id"}), 400

        cursor.execute(
            "DELETE FROM favorites WHERE user_id=%s",
            (user_id,)
        )
        db.commit()

        return jsonify({"success": True, "message": "Favorites cleared"})

    except Exception as e:
        print("CLEAR FAVORITES ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        close_db_resources(cursor, db)

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
