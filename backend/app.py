from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import requests
import bcrypt
import os
import pickle

app = Flask(__name__)
CORS(app)

# -----------------------------
# MYSQL CONNECTION
# -----------------------------
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="animehub_db"
)

cursor = db.cursor(dictionary=True)

# -----------------------------
# LOAD ML MODEL 
# -----------------------------


try:
    base_dir = os.path.dirname(__file__)

    similarity = pickle.load(
        open(os.path.join(base_dir, "../model/similarity.pkl"), "rb")
    )
    anime = pickle.load(
        open(os.path.join(base_dir, "../model/anime_data.pkl"), "rb")
    )
    title_index = pickle.load(
        open(os.path.join(base_dir, "../model/title_index.pkl"), "rb")
    )

    print("ML Model Loaded")

except Exception as e:
    similarity = None
    anime = None
    title_index = None
    print("ML Model NOT loaded:", e)

# -----------------------------
# RECOMMEND FUNCTION 
# -----------------------------
def recommend(title):
    if similarity is None or anime is None:
        return []

    title = title.lower()

    # 🔥 TRY DIRECT MATCH FIRST
    if title in title_index:
        index = title_index[title]
    else:
        # 🔥 fallback: partial match
        matches = [t for t in title_index.keys() if title in t]

        if not matches:
            return []

        index = title_index[matches[0]]

    distances = similarity[index]

    anime_list = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda x: x[1]
    )[1:6]

    results = []

    for i in anime_list:
        anime_title = anime.iloc[i[0]].title

        try:
            res = requests.get(
                f"https://api.jikan.moe/v4/anime?q={anime_title}&limit=1"
            )
            data = res.json()["data"]

            if data:
                results.append(data[0])
        except:
            continue

    return results

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
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

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

        return jsonify({
            "success": True,
            "user_id": user_id,
            "name": name,
            "email": email
        }), 200

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500


# -----------------------------
# LOGIN
# -----------------------------
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400

        email = data.get("email")
        password = data.get("password")

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
            return jsonify({
                "success": True,
                "message": "Login successful",
                "user_id": user["id"] if isinstance(user, dict) else user[0],
                "name": user["name"] if isinstance(user, dict) else user[1],
                "email": user["email"] if isinstance(user, dict) else user[2]
            }), 200

        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        }), 401

    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500
# -----------------------------
# GET ANIME (JIKAN)
# -----------------------------
@app.route("/anime")
def get_anime():

    url = "https://api.jikan.moe/v4/top/anime"
    response = requests.get(url)

    return jsonify(response.json()["data"])

# -----------------------------
# SEARCH ANIME (JIKAN)
# -----------------------------
@app.route("/anime/search")
def search_anime():

    query = request.args.get("q")

    if not query:
        return jsonify([])

    url = f"https://api.jikan.moe/v4/anime?q={query}"
    response = requests.get(url)

    return jsonify(response.json()["data"])

# -----------------------------
# TOP ANIME (JIKAN)
# -----------------------------
@app.route("/anime/top")
def top_anime():

    url = "https://api.jikan.moe/v4/top/anime"
    response = requests.get(url)

    return jsonify(response.json()["data"])

# -----------------------------
# RECOMMEND 
# -----------------------------
@app.route("/recommend")
def get_recommend():
    title = request.args.get("title")

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
# =========================
# ADD FAVORITE
# =========================
@app.route("/add_favorite", methods=["POST"])
def add_favorite():
    try:
        data = request.get_json()

        user_id = data.get("user_id")
        mal_id = data.get("mal_id")
        title = data.get("title")
        image = data.get("image")
        score = data.get("score")
        status = data.get("status")

        if not user_id or not mal_id:
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


# =========================
# GET FAVORITES
# =========================
@app.route("/favorites/<int:user_id>")
def get_favorites(user_id):
    try:
        cursor.execute(
            """SELECT user_id, mal_id, title, image, score, status 
               FROM favorites WHERE user_id=%s""",
            (user_id,)
        )

        favorites = cursor.fetchall()  # now returns dicts ✅

        return jsonify({
            "success": True,
            "data": favorites
        })

    except Exception as e:
        print("GET FAVORITES ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500


# =========================
# REMOVE FAVORITE
# =========================
@app.route("/remove_favorite", methods=["POST"])
def remove_favorite():
    try:
        data = request.get_json()

        user_id = data.get("user_id")
        mal_id = data.get("mal_id")

        cursor.execute(
            "DELETE FROM favorites WHERE user_id=%s AND mal_id=%s",
            (user_id, mal_id)
        )

        db.commit()

        return jsonify({"success": True, "message": "Removed"})

    except Exception as e:
        print("REMOVE FAVORITE ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)