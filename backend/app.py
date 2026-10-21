from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.services.ai_service import process_message, refine_reply, AIServiceError

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure CORS
    CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGIN}})

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint for deployment monitoring."""
        return jsonify({
            "status": "healthy",
            "service": "LazyReply API",
            "version": "1.0.0",
            "provider": "Groq",
            "model_configured": bool(Config.GROQ_API_KEY),
            "model": Config.GROQ_MODEL,
        }), 200

    def handle_process():
        if not request.is_json:
            return jsonify({"error": "Request body must be JSON."}), 400

        data = request.get_json() or {}
        message = data.get("message")
        tone = data.get("tone", "professional")

        # Validate message
        if not isinstance(message, str) or not message.strip():
            return jsonify({
                "error": "Paste a message first so LazyReply has something to untangle."
            }), 400

        trimmed_message = message.strip()
        if len(trimmed_message) > Config.MAX_MESSAGE_LENGTH:
            return jsonify({
                "error": f"Message exceeds the limit of {Config.MAX_MESSAGE_LENGTH:,} characters."
            }), 400

        # Validate tone
        if not isinstance(tone, str) or tone.lower() not in Config.ALLOWED_TONES:
            allowed = ", ".join(Config.ALLOWED_TONES)
            return jsonify({
                "error": f"Invalid tone '{tone}'. Allowed tones: {allowed}."
            }), 400

        normalized_tone = tone.lower()

        try:
            result = process_message(trimmed_message, normalized_tone)
            return jsonify(result), 200
        except AIServiceError as e:
            return jsonify({"error": str(e)}), e.status_code
        except Exception:
            return jsonify({
                "error": "An unexpected error occurred while processing your message. Please try again."
            }), 500

    # Register both PRD recommended path and frontend service path
    @app.route("/api/process", methods=["POST"])
    def api_process():
        return handle_process()

    @app.route("/analyze", methods=["POST"])
    @app.route("/api/analyze", methods=["POST"])
    def api_analyze():
        return handle_process()

    @app.route("/api/refine-reply", methods=["POST"])
    def api_refine_reply():
        if not request.is_json:
            return jsonify({"error": "Request body must be JSON."}), 400

        data = request.get_json() or {}
        original_message = str(data.get("original_message", "")).strip()
        current_reply = str(data.get("current_reply", "")).strip()
        action = str(data.get("action", "regenerate")).strip().lower()

        if not current_reply and not original_message:
            return jsonify({
                "error": "A current reply or original message is required to refine."
            }), 400

        if action not in ["shorter", "warmer", "formal", "regenerate"]:
            return jsonify({
                "error": f"Invalid action '{action}'. Allowed: shorter, warmer, formal, regenerate."
            }), 400

        try:
            refined = refine_reply(original_message, current_reply, action)
            return jsonify({
                "suggested_reply": refined,
                "suggestedReply": refined
            }), 200
        except AIServiceError as e:
            return jsonify({"error": str(e)}), e.status_code
        except Exception:
            return jsonify({
                "error": "Failed to refine reply. Please try again."
            }), 500

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=(Config.FLASK_ENV == "development"))
