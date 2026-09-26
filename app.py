import os
from flask import Flask, jsonify, request, send_from_directory
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder=".")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/newzwave")
PORT = int(os.getenv("PORT", "5000"))

client = None
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.admin.command("ping")
    db = client["newzwave"]
    articles_collection = db["articles"]
except Exception as exc:
    articles_collection = None
    print(f"MongoDB unavailable: {exc}")

fallback_articles = [
    {
        "title": "AI tools reshape newsroom workflows",
        "category": "Tech",
        "excerpt": "Editors are using automation to produce more reliable, faster summaries for readers.",
        "author": "Ava Chen",
        "date": "Today"
    },
    {
        "title": "Cities embrace smart transit planning",
        "category": "World",
        "excerpt": "New investments are improving public travel, safety, and sustainability across major urban centers.",
        "author": "Jules Moreno",
        "date": "2h ago"
    },
    {
        "title": "Green energy funding reaches new heights",
        "category": "Business",
        "excerpt": "Private and public investment is accelerating the global shift to cleaner infrastructure.",
        "author": "Mina Patel",
        "date": "4h ago"
    }
]

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "message": "NewzWave backend is running"})

@app.route("/api/articles", methods=["GET"]) 
def get_articles():
    if articles_collection is None:
        return jsonify(fallback_articles)

    docs = list(articles_collection.find({}, {"_id": 0}).sort("_id", -1))
    if docs:
        return jsonify(docs)
    return jsonify(fallback_articles)

@app.route("/api/articles", methods=["POST"]) 
def create_article():
    payload = request.get_json()
    if not payload:
        return jsonify({"message": "Invalid payload"}), 400

    if articles_collection is None:
        fallback_articles.insert(0, payload)
        return jsonify(payload), 201

    result = articles_collection.insert_one(payload)
    payload["id"] = str(result.inserted_id)
    return jsonify(payload), 201

@app.route("/<path:path>")
def serve_static(path):
    if path == "":
        path = "index.html"
    return send_from_directory(app.static_folder, path)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
